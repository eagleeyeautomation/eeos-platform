import { createHash, createSign, generateKeyPairSync, randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request } from "express";
import { withDatabase } from "../db/postgres";

type OAuthClient = {
  clientId: string;
  clientSecretHash: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
};

type AuthorizationRequest = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

const issuerFallback = "https://eeos-platform-production.up.railway.app";
const ephemeralKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const oauthClientRegistrationTimeoutMs = 8_000;

export function sendOpenIdConfiguration(req: Request, res: { json: (body: unknown) => void }) {
  const issuer = getIssuer(req);

  res.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    jwks_uri: `${issuer}/oauth/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["openid", "profile", "email", "ghl.marketplace"],
  });
}

export function registerOAuthProviderRoutes(app: Express) {
  app.get("/.well-known/openid-configuration", sendOpenIdConfiguration);

  app.get("/.well-known/jwks.json", (_req, res) => {
    res.json({ keys: [getPublicJwk()] });
  });

  app.get("/oauth/jwks.json", (_req, res) => {
    res.json({ keys: [getPublicJwk()] });
  });

  app.post("/oauth/clients", async (req, res) => {
    const requestId = randomBytes(8).toString("hex");

    try {
      logOAuthClientRegistration("started", { requestId });

      const registrationSecret = process.env.EEOS_OAUTH_CLIENT_REGISTRATION_SECRET;

      if (!registrationSecret) {
        logOAuthClientRegistration("missing_registration_secret", { requestId });
        res.status(503).json({ error: "temporarily_unavailable", error_description: "OAuth client registration is not configured." });
        return;
      }

      if (!secureCompare(req.header("x-eeos-registration-secret") || "", registrationSecret)) {
        logOAuthClientRegistration("unauthorized", { requestId });
        res.status(401).json({ error: "unauthorized_client" });
        return;
      }

      logOAuthClientRegistration("authorized", { requestId });

      const name = readString(req.body?.name) || "GoHighLevel Marketplace";
      const redirectUris = readStringArray(req.body?.redirect_uris);
      const scopes = readStringArray(req.body?.scopes);

      if (redirectUris.length === 0) {
        logOAuthClientRegistration("invalid_metadata", { requestId, reason: "missing_redirect_uris" });
        res.status(400).json({ error: "invalid_client_metadata", error_description: "redirect_uris is required" });
        return;
      }

      const generated = generateOAuthClientSecret();
      const clientId = `eeos_${randomBytes(16).toString("hex")}`;
      const normalizedScopes = scopes.length > 0 ? scopes : ["openid", "profile", "email", "ghl.marketplace"];

      logOAuthClientRegistration("storage_check_started", { requestId });
      await withTimeout(ensureOAuthProviderStorage(), oauthClientRegistrationTimeoutMs, "OAuth provider storage check timed out.");
      logOAuthClientRegistration("storage_check_completed", { requestId });

      logOAuthClientRegistration("client_create_started", { requestId, clientId, redirectUriCount: redirectUris.length, scopeCount: normalizedScopes.length });
      await withTimeout(
        createOAuthClient({
          clientId,
          clientSecretHash: hashSecret(generated.clientSecret),
          name,
          redirectUris,
          scopes: normalizedScopes,
        }),
        oauthClientRegistrationTimeoutMs,
        "OAuth client creation timed out.",
      );
      logOAuthClientRegistration("client_create_completed", { requestId, clientId });

      res.status(201).json({
        clientId,
        clientSecret: generated.clientSecret,
        redirectUri: redirectUris[0],
      });
    } catch (error) {
      logOAuthClientRegistration("failed", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown OAuth client registration error.",
      });
      res.status(503).json({
        error: "temporarily_unavailable",
        error_description: "OAuth client registration failed.",
      });
    }
  });

  app.get("/oauth/authorize", async (req, res) => {
    const request = req.query as AuthorizationRequest;

    if (request.response_type !== "code") {
      res.status(400).json({ error: "unsupported_response_type" });
      return;
    }

    if (!request.client_id || !request.redirect_uri) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    if (!request.code_challenge || request.code_challenge_method !== "S256") {
      res.status(400).json({ error: "invalid_request", error_description: "PKCE S256 is required" });
      return;
    }

    const client = await readOAuthClient(request.client_id);

    if (!client || !client.redirectUris.includes(request.redirect_uri)) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    const code = `eeos_code_${randomBytes(24).toString("base64url")}`;
    await storeAuthorizationCode({
      codeHash: hashSecret(code),
      clientId: client.clientId,
      redirectUri: request.redirect_uri,
      codeChallenge: request.code_challenge,
      scope: request.scope || "openid profile email ghl.marketplace",
    });

    const redirectUrl = new URL(request.redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (request.state) redirectUrl.searchParams.set("state", request.state);

    res.redirect(302, redirectUrl.toString());
  });

  app.post("/oauth/token", async (req, res) => {
    const clientCredentials = parseClientCredentials(req);
    const code = readString(req.body?.code);
    const redirectUri = readString(req.body?.redirect_uri);
    const verifier = readString(req.body?.code_verifier);

    if (req.body?.grant_type !== "authorization_code" || !code || !redirectUri || !verifier) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    const client = await readOAuthClient(clientCredentials.clientId);

    if (!client || !secureCompare(client.clientSecretHash, hashSecret(clientCredentials.clientSecret))) {
      res.status(401).json({ error: "invalid_client" });
      return;
    }

    const authorizationCode = await consumeAuthorizationCode(hashSecret(code), client.clientId);

    if (!authorizationCode || authorizationCode.redirectUri !== redirectUri || !verifyPkce(verifier, authorizationCode.codeChallenge)) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }

    const subject = `eeos-org-${client.clientId}`;
    const accessToken = signJwt({ sub: subject, aud: client.clientId, scope: authorizationCode.scope, typ: "access_token" }, req);
    const idToken = signJwt({ sub: subject, aud: client.clientId, scope: authorizationCode.scope, typ: "id_token" }, req);

    res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: authorizationCode.scope,
    });
  });

  app.get("/oauth/userinfo", (req, res) => {
    const authorization = req.header("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    res.json({
      sub: "eeos-marketplace-user",
      name: "EEOS Marketplace User",
      email: "marketplace@eeos.com",
      email_verified: true,
    });
  });
}

export function generateOAuthClientSecret() {
  return { clientSecret: `eeos_secret_${randomBytes(32).toString("base64url")}` };
}

export function verifyPkce(verifier: string, challenge: string) {
  const digest = createHash("sha256").update(verifier).digest("base64url");

  return secureCompare(digest, challenge);
}

export function signJwt(payload: Record<string, unknown>, req?: Request) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: getKeyId() };
  const body = {
    iss: req ? getIssuer(req) : issuerFallback,
    iat: now,
    exp: now + 3600,
    ...payload,
  };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(body)}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(getPrivateKey()).toString("base64url");

  return `${signingInput}.${signature}`;
}

function getPublicJwk() {
  const jwk = getPublicKey().export({ format: "jwk" }) as JsonWebKey;

  return {
    ...jwk,
    kid: getKeyId(),
    use: "sig",
    alg: "RS256",
  };
}

function getPrivateKey() {
  const configured = process.env.EEOS_OAUTH_PRIVATE_KEY_PEM;

  if (configured) {
    return configured.replace(/\\n/g, "\n");
  }

  return ephemeralKeyPair.privateKey;
}

function getPublicKey() {
  return ephemeralKeyPair.publicKey;
}

function getKeyId() {
  return process.env.EEOS_OAUTH_KEY_ID || "eeos-oauth-rs256-1";
}

function getIssuer(req: Request) {
  const configured = process.env.OAUTH_SERVER_URL || process.env.EEOS_OAUTH_ISSUER || process.env.EEOS_APP_BASE_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = req.header("x-forwarded-host") || req.header("host") || "localhost:3000";
  const protocol = req.header("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`.replace(/\/$/, "");
}

async function createOAuthClient(client: OAuthClient) {
  await withDatabase(async (db) => {
    await db.query(
      `
        insert into eeos_oauth_clients (
          client_id,
          client_secret_hash,
          name,
          redirect_uris,
          scopes,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4::jsonb, $5::jsonb, now(), now())
        on conflict (client_id) do update set
          client_secret_hash = excluded.client_secret_hash,
          name = excluded.name,
          redirect_uris = excluded.redirect_uris,
          scopes = excluded.scopes,
          updated_at = now()
      `,
      [client.clientId, client.clientSecretHash, client.name, JSON.stringify(client.redirectUris), JSON.stringify(client.scopes)],
    );
  });
}

async function ensureOAuthProviderStorage() {
  await withDatabase(async (db) => {
    await db.query("select 1 as ok");
    await db.query(`
      create table if not exists eeos_oauth_clients (
        id bigserial primary key,
        client_id text not null unique,
        client_secret_hash text not null,
        name text not null,
        redirect_uris jsonb not null default '[]'::jsonb,
        scopes jsonb not null default '[]'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        disabled_at timestamptz
      )
    `);
    await db.query(`
      create index if not exists eeos_oauth_clients_active_idx
        on eeos_oauth_clients (client_id)
        where disabled_at is null
    `);
    await db.query(`
      create table if not exists eeos_oauth_authorization_codes (
        id bigserial primary key,
        code_hash text not null unique,
        client_id text not null references eeos_oauth_clients (client_id) on delete cascade,
        redirect_uri text not null,
        code_challenge text not null,
        scope text not null,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null,
        consumed_at timestamptz
      )
    `);
    await db.query(`
      create index if not exists eeos_oauth_authorization_codes_client_idx
        on eeos_oauth_authorization_codes (client_id, expires_at)
        where consumed_at is null
    `);
  });
}

async function readOAuthClient(clientId: string) {
  return withDatabase(async (db) => {
    const result = await db.query<{
      client_id: string;
      client_secret_hash: string;
      name: string;
      redirect_uris: string[];
      scopes: string[];
    }>(
      `
        select client_id, client_secret_hash, name, redirect_uris, scopes
        from eeos_oauth_clients
        where client_id = $1 and disabled_at is null
      `,
      [clientId],
    );
    const row = result.rows[0];

    return row
      ? {
          clientId: row.client_id,
          clientSecretHash: row.client_secret_hash,
          name: row.name,
          redirectUris: row.redirect_uris,
          scopes: row.scopes,
        }
      : null;
  });
}

async function storeAuthorizationCode(input: {
  codeHash: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
}) {
  await withDatabase(async (db) => {
    await db.query(
      `
        insert into eeos_oauth_authorization_codes (
          code_hash,
          client_id,
          redirect_uri,
          code_challenge,
          scope,
          expires_at,
          created_at
        )
        values ($1, $2, $3, $4, $5, now() + interval '10 minutes', now())
      `,
      [input.codeHash, input.clientId, input.redirectUri, input.codeChallenge, input.scope],
    );
  });
}

async function consumeAuthorizationCode(codeHash: string, clientId: string) {
  return withDatabase(async (db) => {
    const result = await db.query<{ redirect_uri: string; code_challenge: string; scope: string }>(
      `
        update eeos_oauth_authorization_codes
        set consumed_at = now()
        where code_hash = $1
          and client_id = $2
          and consumed_at is null
          and expires_at > now()
        returning redirect_uri, code_challenge, scope
      `,
      [codeHash, clientId],
    );
    const row = result.rows[0];

    return row ? { redirectUri: row.redirect_uri, codeChallenge: row.code_challenge, scope: row.scope } : null;
  });
}

function parseClientCredentials(req: Request) {
  const authorization = req.header("authorization");

  if (authorization?.startsWith("Basic ")) {
    const [clientId = "", clientSecret = ""] = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8").split(":");

    return { clientId, clientSecret };
  }

  return {
    clientId: readString(req.body?.client_id) || "",
    clientSecret: readString(req.body?.client_secret) || "",
  };
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function logOAuthClientRegistration(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", component: "oauth_provider", event: `oauth_client_registration.${event}`, ...fields }));
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export const oauthProviderInternals = {
  generateOAuthClientSecret,
  signJwt,
  verifyPkce,
};

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

type RefreshTokenRecord = {
  subject: string;
  scope: string;
};

const issuerFallback = "https://eeos-platform-production.up.railway.app";
const ephemeralKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const oauthClientRegistrationTimeoutMs = 5_000;

export function sendOpenIdConfiguration(req: Request, res: { json: (body: unknown) => void }) {
  const issuer = getIssuer(req);

  res.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    jwks_uri: `${issuer}/oauth/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
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
      const requestedClientId = readString(req.body?.client_id)?.trim();
      const clientId = requestedClientId || `eeos_${randomBytes(16).toString("hex")}`;
      const normalizedScopes = scopes.length > 0 ? scopes : ["openid", "profile", "email", "ghl.marketplace"];

      logOAuthClientRegistration("storage_check_started", { requestId });
      await ensureOAuthProviderStorage(requestId);
      logOAuthClientRegistration("storage_check_completed", { requestId });

      logOAuthClientRegistration("client_create_started", { requestId, clientId, redirectUriCount: redirectUris.length, scopeCount: normalizedScopes.length });
      await createOAuthClient({
        clientId,
        clientSecretHash: hashSecret(generated.clientSecret),
        name,
        redirectUris,
        scopes: normalizedScopes,
      }, requestId);
      logOAuthClientRegistration("client_create_completed", { requestId, clientId });

      res.status(201).json({
        clientId,
        clientSecret: generated.clientSecret,
        redirectUri: redirectUris[0],
      });
    } catch (error) {
      logOAuthClientRegistration("failed", {
        requestId,
        error: sanitizeLogError(error),
      });

      if (!res.headersSent) {
        res.status(503).json({
          error: "temporarily_unavailable",
          error_description: "OAuth client registration failed.",
        });
      }
    }
  });

  app.get("/oauth/authorize", (req, res) => {
    void handleAuthorizationRequest(req, res, false);
  });

  app.post("/oauth/authorize", (req, res) => {
    void handleAuthorizationRequest(req, res, true);
  });

  app.post("/oauth/token", async (req, res) => {
    try {
      const clientCredentials = parseClientCredentials(req);
      const grantType = readString(req.body?.grant_type);
      const client = await readOAuthClient(clientCredentials.clientId);

      if (!client || !secureCompare(client.clientSecretHash, hashSecret(clientCredentials.clientSecret))) {
        res.status(401).json({ error: "invalid_client" });
        return;
      }

      if (grantType === "authorization_code") {
        const code = readString(req.body?.code);
        const redirectUri = readString(req.body?.redirect_uri);
        const verifier = readString(req.body?.code_verifier);

        if (!code || !redirectUri || !verifier) {
          res.status(400).json({ error: "invalid_request" });
          return;
        }

        const authorizationCode = await consumeAuthorizationCode(hashSecret(code), client.clientId);

        if (!authorizationCode || authorizationCode.redirectUri !== redirectUri || !verifyPkce(verifier, authorizationCode.codeChallenge)) {
          res.status(400).json({ error: "invalid_grant" });
          return;
        }

        const subject = `eeos-org-${client.clientId}`;
        const refreshToken = generateOAuthRefreshToken();
        await storeRefreshToken({
          tokenHash: hashSecret(refreshToken),
          clientId: client.clientId,
          subject,
          scope: authorizationCode.scope,
        });

        const accessToken = signJwt({ sub: subject, aud: client.clientId, scope: authorizationCode.scope, typ: "access_token" }, req);
        const idToken = signJwt({ sub: subject, aud: client.clientId, scope: authorizationCode.scope, typ: "id_token" }, req);

        res.json({
          access_token: accessToken,
          id_token: idToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: 3600,
          scope: authorizationCode.scope,
        });
        return;
      }

      if (grantType === "refresh_token") {
        const refreshToken = readString(req.body?.refresh_token);

        if (!refreshToken) {
          res.status(400).json({ error: "invalid_request" });
          return;
        }

        const nextRefreshToken = generateOAuthRefreshToken();
        const rotated = await rotateRefreshToken({
          currentTokenHash: hashSecret(refreshToken),
          nextTokenHash: hashSecret(nextRefreshToken),
          clientId: client.clientId,
        });

        if (!rotated) {
          res.status(400).json({ error: "invalid_grant" });
          return;
        }

        const accessToken = signJwt({ sub: rotated.subject, aud: client.clientId, scope: rotated.scope, typ: "access_token" }, req);

        res.json({
          access_token: accessToken,
          refresh_token: nextRefreshToken,
          token_type: "Bearer",
          expires_in: 3600,
          scope: rotated.scope,
        });
        return;
      }

      res.status(400).json({ error: "unsupported_grant_type" });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          component: "oauth_provider",
          event: "oauth_token.failed",
          error: sanitizeLogError(error),
        }),
      );
      res.status(503).json({ error: "temporarily_unavailable" });
    }
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

async function handleAuthorizationRequest(req: Request, res: any, consentGranted: boolean) {
  const request = normalizeAuthorizationRequest({ ...(req.query as AuthorizationRequest), ...(req.body || {}) });
  const requestId = randomBytes(8).toString("hex");

  try {
    logOAuthAuthorize("started", {
      requestId,
      method: req.method,
      consentGranted,
      clientId: request.client_id || null,
      redirectUri: request.redirect_uri || null,
      responseType: request.response_type || null,
      hasCodeChallenge: Boolean(request.code_challenge),
      codeChallengeMethod: request.code_challenge_method || null,
    });

    if (request.response_type !== "code") {
      logOAuthAuthorize("rejected", { requestId, clientId: request.client_id || null, reason: "unsupported_response_type" });
      res.status(400).json({ error: "unsupported_response_type" });
      return;
    }

    if (!request.client_id || !request.redirect_uri) {
      logOAuthAuthorize("rejected", { requestId, clientId: request.client_id || null, reason: "missing_client_or_redirect_uri" });
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    if (!request.code_challenge || request.code_challenge_method !== "S256") {
      logOAuthAuthorize("rejected", { requestId, clientId: request.client_id, reason: "missing_pkce_s256" });
      res.status(400).json({ error: "invalid_request", error_description: "PKCE S256 is required" });
      return;
    }

    const client = await resolveAuthorizationClient(request, requestId);

    if (!client) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    if (!client.redirectUris.includes(request.redirect_uri)) {
      logOAuthAuthorize("rejected", {
        requestId,
        clientId: request.client_id,
        reason: "redirect_uri_mismatch",
        incomingRedirectUri: request.redirect_uri,
        registeredRedirectUris: client.redirectUris,
      });
      res.status(400).json({ error: "invalid_request", error_description: "redirect_uri is not registered for this client." });
      return;
    }

    await continueAuthorization(req, res, request, client, requestId, consentGranted);
    } catch (error) {
      logOAuthAuthorize("failed", {
        requestId,
        clientId: request.client_id || null,
        error: sanitizeLogError(error),
      });
      res.status(503).json({ error: "temporarily_unavailable" });
    }
  }

async function resolveAuthorizationClient(request: AuthorizationRequest, requestId: string) {
  const clientId = request.client_id || "";
  const redirectUri = request.redirect_uri || "";
  const client = await readOAuthClient(clientId);

  logOAuthAuthorize("client_lookup_completed", {
    requestId,
    clientId,
    found: Boolean(client),
    redirectUriCount: client?.redirectUris.length || 0,
    active: Boolean(client),
  });

  if (client) {
    return client;
  }

  const storedCandidates = await findOAuthClientsByRedirectUri(redirectUri);
  const marketplaceCandidates = storedCandidates.length === 0 ? await findActiveMarketplaceOAuthClients() : [];
  const reconciliationCandidates = storedCandidates.length > 0 ? storedCandidates : marketplaceCandidates;
  const redirectClientId = extractLeadConnectorClientId(redirectUri);

  logOAuthAuthorize("client_id_comparison", {
    requestId,
    incomingClientId: clientId,
    redirectClientId,
    storedClientIds: reconciliationCandidates.map((candidate) => candidate.clientId),
    redirectUriMatchCount: storedCandidates.length,
    marketplaceCandidateCount: marketplaceCandidates.length,
  });

  if (
    reconciliationCandidates.length === 1 &&
    (!redirectClientId || redirectClientId === clientId) &&
    isLeadConnectorRedirectUri(redirectUri)
  ) {
    const reconciledClient = await reconcileOAuthClientId({
      storedClientId: reconciliationCandidates[0].clientId,
      incomingClientId: clientId,
      redirectUri,
    });

    logOAuthAuthorize("client_id_reconciled", {
      requestId,
      incomingClientId: clientId,
      storedClientId: reconciliationCandidates[0].clientId,
      reason:
        storedCandidates.length === 1
          ? "registered_client_id_differed_from_marketplace_authorize_client_id"
          : "single_marketplace_client_reconciled_to_authorize_client_id",
    });

    return reconciledClient;
  }

  logOAuthAuthorize("rejected", {
    requestId,
    clientId,
    reason: reconciliationCandidates.length > 1 ? "ambiguous_client_candidates" : "client_not_found",
    storedClientIds: reconciliationCandidates.map((candidate) => candidate.clientId),
  });

  return null;
}

export function generateOAuthClientSecret() {
  return { clientSecret: `eeos_secret_${randomBytes(32).toString("base64url")}` };
}

export function generateOAuthRefreshToken() {
  return `eeos_refresh_${randomBytes(48).toString("base64url")}`;
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

function normalizeAuthorizationRequest(request: AuthorizationRequest): AuthorizationRequest {
  return {
    client_id: readString(request.client_id)?.trim(),
    redirect_uri: readString(request.redirect_uri)?.trim(),
    response_type: readString(request.response_type)?.trim(),
    scope: readString(request.scope)?.trim(),
    state: readString(request.state),
    code_challenge: readString(request.code_challenge)?.trim(),
    code_challenge_method: readString(request.code_challenge_method)?.trim(),
  };
}

function renderAuthorizationPage(originalUrl: string, clientName: string) {
  const approveUrl = new URL(originalUrl, issuerFallback);
  const hiddenInputs = Array.from(approveUrl.searchParams.entries())
    .map(([name, value]) => `      <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authorize EEOS</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #0f172a; color: #f8fafc; display: grid; min-height: 100vh; place-items: center; }
      main { width: min(480px, calc(100vw - 32px)); background: #111827; border: 1px solid #334155; border-radius: 8px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
      h1 { font-size: 22px; margin: 0 0 12px; }
      p { color: #cbd5e1; line-height: 1.5; }
      a { display: inline-flex; margin-top: 16px; background: #fbbf24; color: #111827; text-decoration: none; font-weight: 700; padding: 10px 14px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Authorize EEOS</h1>
      <p>${escapeHtml(clientName)} is requesting access to connect with EEOS.</p>
      <form method="post" action="/oauth/authorize">
${hiddenInputs}
        <input type="hidden" name="approve" value="1" />
        <button type="submit">Authorize</button>
      </form>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

async function continueAuthorization(
  req: Request,
  res: {
    status: (code: number) => {
      type: (contentType: string) => {
        send: (body: string) => void;
      };
    };
    redirect: (status: number, url: string) => void;
  },
  request: AuthorizationRequest,
  client: OAuthClient,
  requestId: string,
  consentGranted: boolean,
) {
  if (!consentGranted) {
    logOAuthAuthorize("page_rendered", { requestId, clientId: client.clientId });
    res.status(200).type("html").send(renderAuthorizationPage(req.originalUrl, client.name));
    return;
  }

  logOAuthAuthorize("consent_received", { requestId, clientId: client.clientId, redirectUri: request.redirect_uri || null });

  const code = `eeos_code_${randomBytes(24).toString("base64url")}`;
  logOAuthAuthorize("authorization_code_created", { requestId, clientId: client.clientId });

  await withTimeout(storeAuthorizationCode({
    codeHash: hashSecret(code),
    clientId: client.clientId,
    redirectUri: request.redirect_uri || "",
    codeChallenge: request.code_challenge || "",
    scope: request.scope || "openid profile email ghl.marketplace",
  }, requestId), oauthClientRegistrationTimeoutMs, "OAuth authorization code persistence timed out.");
  logOAuthAuthorize("authorization_code_persisted", { requestId, clientId: client.clientId });

  const redirectUrl = new URL(request.redirect_uri || "");
  redirectUrl.searchParams.set("code", code);
  if (request.state) redirectUrl.searchParams.set("state", request.state);

  logOAuthAuthorize("redirect_prepared", { requestId, clientId: client.clientId, redirectUri: request.redirect_uri || null, hasState: Boolean(request.state) });
  logOAuthAuthorize("redirect_sent", { requestId, clientId: client.clientId });
  res.redirect(302, redirectUrl.toString());
}

async function createOAuthClient(client: OAuthClient, requestId?: string) {
  await withTimeout(
    withDatabase(async (db) => {
      await runOAuthStorageStep("insert_oauth_client", requestId, () =>
        db.query(
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
        ),
      );
    }),
    oauthClientRegistrationTimeoutMs,
    "OAuth client creation timed out.",
  );
}

async function ensureOAuthProviderStorage(requestId?: string) {
  await withTimeout(
    withDatabase(async (db) => {
      await runOAuthStorageStep("select_1", requestId, () => db.query("select 1 as ok"));
      await runOAuthStorageStep("create_table_eeos_oauth_clients", requestId, () =>
        db.query(`
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
        `),
      );
      await runOAuthStorageStep("create_index_eeos_oauth_clients_active", requestId, () =>
        db.query(`
          create index if not exists eeos_oauth_clients_active_idx
            on eeos_oauth_clients (client_id)
            where disabled_at is null
        `),
      );
      await runOAuthStorageStep("create_table_eeos_oauth_authorization_codes", requestId, () =>
        db.query(`
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
        `),
      );
      await runOAuthStorageStep("repair_table_eeos_oauth_authorization_codes", requestId, () =>
        db.query(`
          alter table eeos_oauth_authorization_codes
            add column if not exists code_hash text,
            add column if not exists client_id text,
            add column if not exists redirect_uri text,
            add column if not exists code_challenge text,
            add column if not exists scope text,
            add column if not exists created_at timestamptz not null default now(),
            add column if not exists expires_at timestamptz,
            add column if not exists consumed_at timestamptz
        `),
      );
      await runOAuthStorageStep("create_index_eeos_oauth_authorization_codes_client", requestId, () =>
        db.query(`
          create index if not exists eeos_oauth_authorization_codes_client_idx
            on eeos_oauth_authorization_codes (client_id, expires_at)
            where consumed_at is null
        `),
      );
      await runOAuthStorageStep("create_table_eeos_oauth_refresh_tokens", requestId, () =>
        db.query(`
          create table if not exists eeos_oauth_refresh_tokens (
            id bigserial primary key,
            token_hash text not null unique,
            client_id text not null references eeos_oauth_clients (client_id) on delete cascade,
            subject text not null,
            scope text not null,
            created_at timestamptz not null default now(),
            expires_at timestamptz not null,
            revoked_at timestamptz,
            replaced_by_hash text
          )
        `),
      );
      await runOAuthStorageStep("repair_table_eeos_oauth_refresh_tokens", requestId, () =>
        db.query(`
          alter table eeos_oauth_refresh_tokens
            add column if not exists token_hash text,
            add column if not exists client_id text,
            add column if not exists subject text,
            add column if not exists scope text,
            add column if not exists created_at timestamptz not null default now(),
            add column if not exists expires_at timestamptz,
            add column if not exists revoked_at timestamptz,
            add column if not exists replaced_by_hash text
        `),
      );
      await runOAuthStorageStep("create_index_eeos_oauth_refresh_tokens_active", requestId, () =>
        db.query(`
          create index if not exists eeos_oauth_refresh_tokens_active_idx
            on eeos_oauth_refresh_tokens (client_id, expires_at)
            where revoked_at is null
        `),
      );
    }),
    oauthClientRegistrationTimeoutMs,
    "OAuth provider storage check timed out.",
  );
}

async function runOAuthStorageStep<T>(step: string, requestId: string | undefined, operation: () => Promise<T>) {
  const startedAt = Date.now();
  logOAuthClientRegistration("sql_step_started", { requestId, step });

  try {
    const result = await operation();
    logOAuthClientRegistration("sql_step_completed", { requestId, step, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logOAuthClientRegistration("sql_step_failed", { requestId, step, durationMs: Date.now() - startedAt, error: sanitizeLogError(error) });
    throw error;
  }
}

async function runOAuthAuthorizeStorageStep<T>(step: string, requestId: string | undefined, operation: () => Promise<T>) {
  const startedAt = Date.now();
  logOAuthAuthorize("sql_step_started", { requestId, step });

  try {
    const result = await operation();
    logOAuthAuthorize("sql_step_completed", { requestId, step, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logOAuthAuthorize("sql_step_failed", { requestId, step, durationMs: Date.now() - startedAt, error: sanitizeLogError(error) });
    throw error;
  }
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

async function findOAuthClientsByRedirectUri(redirectUri: string) {
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
        where disabled_at is null
          and redirect_uris @> $1::jsonb
        order by updated_at desc
        limit 5
      `,
      [JSON.stringify([redirectUri])],
    );

    return result.rows.map((row) => ({
      clientId: row.client_id,
      clientSecretHash: row.client_secret_hash,
      name: row.name,
      redirectUris: row.redirect_uris,
      scopes: row.scopes,
    }));
  });
}

async function findActiveMarketplaceOAuthClients() {
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
        where disabled_at is null
          and name = $1
        order by updated_at desc
        limit 5
      `,
      ["GoHighLevel Marketplace"],
    );

    return result.rows.map((row) => ({
      clientId: row.client_id,
      clientSecretHash: row.client_secret_hash,
      name: row.name,
      redirectUris: row.redirect_uris,
      scopes: row.scopes,
    }));
  });
}

async function reconcileOAuthClientId(input: { storedClientId: string; incomingClientId: string; redirectUri: string }) {
  return withDatabase(async (db) => {
    const result = await db.query<{
      client_id: string;
      client_secret_hash: string;
      name: string;
      redirect_uris: string[];
      scopes: string[];
    }>(
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
        select
          $1,
          client_secret_hash,
          name,
          case
            when redirect_uris @> $3::jsonb then redirect_uris
            else redirect_uris || $3::jsonb
          end,
          scopes,
          now(),
          now()
        from eeos_oauth_clients
        where client_id = $2
          and disabled_at is null
        on conflict (client_id) do update set
          client_secret_hash = excluded.client_secret_hash,
          name = excluded.name,
          redirect_uris = excluded.redirect_uris,
          scopes = excluded.scopes,
            updated_at = now()
        returning client_id, client_secret_hash, name, redirect_uris, scopes
      `,
      [input.incomingClientId, input.storedClientId, JSON.stringify([input.redirectUri])],
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("OAuth client ID reconciliation failed.");
    }

    return {
      clientId: row.client_id,
      clientSecretHash: row.client_secret_hash,
      name: row.name,
      redirectUris: row.redirect_uris,
      scopes: row.scopes,
    };
  });
}

function isLeadConnectorRedirectUri(redirectUri: string) {
  try {
    return new URL(redirectUri).hostname === "services.leadconnectorhq.com";
  } catch {
    return false;
  }
}

function extractLeadConnectorClientId(redirectUri: string) {
  try {
    const url = new URL(redirectUri);

    if (url.hostname !== "services.leadconnectorhq.com") {
      return null;
    }

    const match = url.pathname.match(/^\/oauth\/clients\/([^/]+)\/authentication\/callback$/);

    return match?.[1] || null;
  } catch {
    return null;
  }
}

async function storeAuthorizationCode(input: {
  codeHash: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
}, requestId?: string) {
  await withDatabase(async (db) => {
    await runOAuthAuthorizeStorageStep("create_authorization_codes_v2", requestId, () =>
      db.query(`
        create table if not exists eeos_oauth_authorization_codes_v2 (
          id bigserial primary key,
          code_hash text not null unique,
          client_id text not null,
          redirect_uri text not null,
          code_challenge text not null,
          scope text not null,
          created_at timestamptz not null default now(),
          expires_at timestamptz not null,
          consumed_at timestamptz
        )
      `),
    );
    await runOAuthAuthorizeStorageStep("create_authorization_codes_v2_index", requestId, () =>
      db.query(`
        create index if not exists eeos_oauth_authorization_codes_v2_client_idx
          on eeos_oauth_authorization_codes_v2 (client_id, expires_at)
          where consumed_at is null
      `),
    );
    await runOAuthAuthorizeStorageStep("insert_authorization_code_v2", requestId, () =>
      db.query(
        `
          insert into eeos_oauth_authorization_codes_v2 (
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
      ),
    );
  });
}

async function storeRefreshToken(input: {
  tokenHash: string;
  clientId: string;
  subject: string;
  scope: string;
}) {
  await withDatabase(async (db) => {
    await db.query(
      `
        insert into eeos_oauth_refresh_tokens (
          token_hash,
          client_id,
          subject,
          scope,
          expires_at,
          created_at
        )
        values ($1, $2, $3, $4, now() + interval '90 days', now())
      `,
      [input.tokenHash, input.clientId, input.subject, input.scope],
    );
  });
}

async function rotateRefreshToken(input: {
  currentTokenHash: string;
  nextTokenHash: string;
  clientId: string;
}) {
  return withDatabase(async (db) => {
    await db.query("BEGIN");

    try {
      const current = await db.query<RefreshTokenRecord>(
        `
          update eeos_oauth_refresh_tokens
          set revoked_at = now(),
              replaced_by_hash = $1
          where token_hash = $2
            and client_id = $3
            and revoked_at is null
            and expires_at > now()
          returning subject, scope
        `,
        [input.nextTokenHash, input.currentTokenHash, input.clientId],
      );
      const row = current.rows[0];

      if (!row) {
        await db.query("ROLLBACK");
        return null;
      }

      await db.query(
        `
          insert into eeos_oauth_refresh_tokens (
            token_hash,
            client_id,
            subject,
            scope,
            expires_at,
            created_at
          )
          values ($1, $2, $3, $4, now() + interval '90 days', now())
        `,
        [input.nextTokenHash, input.clientId, row.subject, row.scope],
      );

      await db.query("COMMIT");
      return { subject: row.subject, scope: row.scope };
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  });
}

async function consumeAuthorizationCode(codeHash: string, clientId: string) {
  return withDatabase(async (db) => {
    const v2 = await db.query<{ redirect_uri: string; code_challenge: string; scope: string }>(
      `
        update eeos_oauth_authorization_codes_v2
        set consumed_at = now()
        where code_hash = $1
          and client_id = $2
          and consumed_at is null
          and expires_at > now()
        returning redirect_uri, code_challenge, scope
      `,
      [codeHash, clientId],
    ).catch(() => ({ rows: [] as Array<{ redirect_uri: string; code_challenge: string; scope: string }> }));
    const v2Row = v2.rows[0];

    if (v2Row) {
      return { redirectUri: v2Row.redirect_uri, codeChallenge: v2Row.code_challenge, scope: v2Row.scope };
    }

    const legacy = await db.query<{ redirect_uri: string; code_challenge: string; scope: string }>(
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
    ).catch(() => ({ rows: [] as Array<{ redirect_uri: string; code_challenge: string; scope: string }> }));
    const row = legacy.rows[0];

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

function logOAuthAuthorize(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", component: "oauth_provider", event: `oauth_authorize.${event}`, ...fields }));
}

function sanitizeLogError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown error.";
  }

  return error.message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@");
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
  generateOAuthRefreshToken,
  signJwt,
  verifyPkce,
};

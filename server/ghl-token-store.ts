import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import {
  readGhlConnectionRecord,
  upsertGhlTokenRecord,
  upsertGhlTokenRecordWithAudit,
  type RuntimeAuditEvent,
  type GhlConnectionRecord,
} from "./db/runtimePersistence";

const PROVIDER = "gohighlevel";
const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const REFRESH_WINDOW_MS = 60_000;
const refreshes = new Map<string, Promise<GhlTokenPayload>>();

export type GhlTokenPayload = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
  scopes: string[];
  locationId: string;
  companyId?: string;
  userType?: string;
};

export type SafeGhlConnection = {
  connected: boolean;
  provider: typeof PROVIDER;
  organizationId: string;
  maskedLocationId: string;
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  refreshAvailable: boolean;
  connectedAt: string | null;
  lastVerifiedAt: string | null;
};

function vaultKey() {
  const material = process.env.EEOS_TOKEN_VAULT_KEY;
  if (!material) throw new Error("EEOS_TOKEN_VAULT_KEY is required for GoHighLevel token storage.");
  return createHash("sha256").update(material).digest();
}

export function encryptGhlTokenPayload(payload: GhlTokenPayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  });
}

export function decryptGhlTokenPayload(encrypted: string): GhlTokenPayload {
  const envelope = JSON.parse(encrypted) as {
    version: number;
    algorithm: string;
    iv: string;
    tag: string;
    ciphertext: string;
  };
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported GoHighLevel token envelope.");
  }
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(envelope.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const payload = JSON.parse(plaintext) as GhlTokenPayload;
  if (!payload.accessToken || !payload.refreshToken || !payload.locationId || !payload.expiresAt) {
    throw new Error("GoHighLevel token payload is incomplete.");
  }
  return payload;
}

export function maskGhlLocationId(locationId: string) {
  if (locationId.length <= 8) return "***";
  return `${locationId.slice(0, 4)}…${locationId.slice(-4)}`;
}

export async function storeGhlConnectionToken(input: {
  organizationId: string;
  operationalDivisionId: string;
  locationId: string;
  payload: GhlTokenPayload;
}) {
  if (input.payload.locationId !== input.locationId) {
    throw new Error("GoHighLevel token location binding mismatch.");
  }
  await upsertGhlTokenRecord({
    membershipId: input.organizationId,
    operationalDivisionId: input.operationalDivisionId,
    locationId: input.locationId,
    encryptedPayload: encryptGhlTokenPayload(input.payload),
    expiresAt: input.payload.expiresAt,
    scopes: input.payload.scopes,
  });
}

export async function storeGhlConnectionTokenWithAudit(
  input: Parameters<typeof storeGhlConnectionToken>[0],
  event: RuntimeAuditEvent,
) {
  if (input.payload.locationId !== input.locationId) {
    throw new Error("GoHighLevel token location binding mismatch.");
  }
  await upsertGhlTokenRecordWithAudit({
    membershipId: input.organizationId,
    operationalDivisionId: input.operationalDivisionId,
    locationId: input.locationId,
    encryptedPayload: encryptGhlTokenPayload(input.payload),
    expiresAt: input.payload.expiresAt,
    scopes: input.payload.scopes,
  }, event);
}

export async function updateGhlConnectionScopesWithAudit(
  organizationId: string,
  locationId: string,
  requiredScopes: string[],
  event: RuntimeAuditEvent,
) {
  const record = await loadGhlConnection(organizationId, locationId);
  if (!record) throw new Error("GoHighLevel connection was not found.");
  const payload = decryptGhlTokenPayload(record.encryptedTokenPayload);
  if (payload.locationId !== locationId) {
    throw new Error("GoHighLevel token location binding mismatch.");
  }
  const scopes = Array.from(new Set([...payload.scopes, ...requiredScopes]));
  await storeGhlConnectionTokenWithAudit({
    organizationId,
    operationalDivisionId: record.operationalDivisionId,
    locationId,
    payload: { ...payload, scopes },
  }, event);
}

export async function loadGhlConnection(
  organizationId: string,
  locationId: string,
  provider = PROVIDER,
) {
  if (provider !== PROVIDER) throw new Error("Unsupported GoHighLevel provider.");
  const record = await readGhlConnectionRecord(organizationId, provider, locationId);
  if (!record) return null;
  if (
    record.organizationId !== organizationId
    || record.locationId !== locationId
    || record.provider !== provider
  ) {
    throw new Error("GoHighLevel connection binding mismatch.");
  }
  return record;
}

export async function safeGhlConnectionStatus(
  organizationId: string,
  locationId: string,
): Promise<SafeGhlConnection> {
  const record = await loadGhlConnection(organizationId, locationId);
  if (!record) {
    return {
      connected: false,
      provider: PROVIDER,
      organizationId,
      maskedLocationId: maskGhlLocationId(locationId),
      tokenExpiresAt: null,
      tokenExpired: false,
      refreshAvailable: false,
      connectedAt: null,
      lastVerifiedAt: null,
    };
  }
  const payload = decryptGhlTokenPayload(record.encryptedTokenPayload);
  if (payload.locationId !== locationId) throw new Error("GoHighLevel token location binding mismatch.");
  return {
    connected: true,
    provider: PROVIDER,
    organizationId,
    maskedLocationId: maskGhlLocationId(locationId),
    tokenExpiresAt: record.tokenExpiresAt,
    tokenExpired: !record.tokenExpiresAt || new Date(record.tokenExpiresAt).getTime() <= Date.now(),
    refreshAvailable: Boolean(payload.refreshToken),
    connectedAt: record.connectedAt,
    lastVerifiedAt: record.updatedAt,
  };
}

async function refreshConnection(record: GhlConnectionRecord, payload: GhlTokenPayload) {
  const body = new URLSearchParams({
    client_id: process.env.GHL_CLIENT_ID || process.env.GHL_OAUTH_CLIENT_ID || "",
    client_secret: process.env.GHL_CLIENT_SECRET || process.env.GHL_OAUTH_CLIENT_SECRET || "",
    grant_type: "refresh_token",
    refresh_token: payload.refreshToken,
    user_type: "Location",
  });
  const response = await fetch(GHL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`GoHighLevel token refresh failed with HTTP ${response.status}.`);
  const data = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    locationId?: string;
    location_id?: string;
  };
  const refreshedLocationId = data.locationId || data.location_id || payload.locationId;
  if (refreshedLocationId !== record.locationId) {
    throw new Error("Refreshed GoHighLevel token location binding mismatch.");
  }
  if (!data.access_token || !data.refresh_token || !data.expires_in) {
    throw new Error("GoHighLevel token refresh response is incomplete.");
  }
  const next: GhlTokenPayload = {
    ...payload,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || payload.tokenType || "Bearer",
    expiresAt: new Date(Date.now() + Math.max(0, data.expires_in - 300) * 1000).toISOString(),
    scopes: data.scope?.split(/[,\s]+/).filter(Boolean) || payload.scopes,
    locationId: refreshedLocationId,
  };
  await storeGhlConnectionToken({
    organizationId: record.organizationId,
    operationalDivisionId: record.operationalDivisionId,
    locationId: record.locationId,
    payload: next,
  });
  return next;
}

export async function getValidGhlToken(organizationId: string, locationId: string) {
  const record = await loadGhlConnection(organizationId, locationId);
  if (!record) throw new Error("GoHighLevel connection was not found.");
  const payload = decryptGhlTokenPayload(record.encryptedTokenPayload);
  if (payload.locationId !== locationId) throw new Error("GoHighLevel token location binding mismatch.");
  if (new Date(payload.expiresAt).getTime() > Date.now() + REFRESH_WINDOW_MS) return payload;

  const key = `${organizationId}:${locationId}`;
  const existing = refreshes.get(key);
  if (existing) return existing;
  const pending = refreshConnection(record, payload).finally(() => refreshes.delete(key));
  refreshes.set(key, pending);
  return pending;
}

export async function verifyGhlLocationIdentity(organizationId: string, locationId: string) {
  const token = await getValidGhlToken(organizationId, locationId);
  const response = await fetch(`${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Version: "2021-07-28",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`GoHighLevel location verification failed with HTTP ${response.status}.`);
  const data = await response.json() as {
    location?: { id?: string; name?: string; companyId?: string };
    id?: string;
    name?: string;
    companyId?: string;
  };
  const location = data.location || data;
  if (!location.id || location.id !== locationId) {
    throw new Error("GoHighLevel returned a cross-location response.");
  }
  return {
    provider: PROVIDER,
    organizationId,
    maskedLocationId: maskGhlLocationId(locationId),
    locationName: location.name || "Unknown",
    accountContext: "location",
    verifiedAt: new Date().toISOString(),
  };
}

export async function verifyGhlLocationWithAccessToken(locationId: string, accessToken: string) {
  const response = await fetch(`${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: "2021-07-28",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`GoHighLevel location verification failed with HTTP ${response.status}.`);
  const data = await response.json() as {
    location?: { id?: string; name?: string; companyId?: string };
    id?: string;
    name?: string;
    companyId?: string;
  };
  const location = data.location || data;
  if (!location.id || location.id !== locationId) {
    throw new Error("GoHighLevel returned a cross-location response.");
  }
  return { id: location.id, name: location.name || "", companyId: location.companyId || "" };
}

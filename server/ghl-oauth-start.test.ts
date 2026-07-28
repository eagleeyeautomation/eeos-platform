import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerGhlOAuthRoutes } from "./ghl-oauth";
import { sdk } from "./_core/sdk";
import { getGhlToken, getMembershipById, getMembershipUser, getOrganizationById, getUserSubaccounts } from "./db";
import { consumeOAuthState, persistAuditEvent, persistOAuthState } from "./db/runtimePersistence";

vi.mock("./_core/env", () => ({
  ENV: {
    ghlClientId: "test-client-id",
    ghlClientSecret: "test-client-secret",
    ghlRedirectUri: "https://app.geteeos.com/api/integrations/eea/oauth/callback",
  },
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn(), readSessionToken: vi.fn() } }));
vi.mock("./db", () => ({
  getGhlToken: vi.fn(),
  getMembershipById: vi.fn(),
  getMembershipUser: vi.fn(),
  getOrganizationById: vi.fn(),
  getUserSubaccounts: vi.fn(),
  upsertGhlToken: vi.fn(),
}));
vi.mock("./db/runtimePersistence", () => ({
  consumeOAuthState: vi.fn(),
  persistAuditEvent: vi.fn(),
  persistOAuthState: vi.fn(),
  upsertGhlTokenRecord: vi.fn(),
}));

const authenticateRequestMock = vi.mocked(sdk.authenticateRequest);
const readSessionTokenMock = vi.mocked(sdk.readSessionToken);
const getGhlTokenMock = vi.mocked(getGhlToken);
const getUserSubaccountsMock = vi.mocked(getUserSubaccounts);
const getMembershipByIdMock = vi.mocked(getMembershipById);
const getMembershipUserMock = vi.mocked(getMembershipUser);
const getOrganizationByIdMock = vi.mocked(getOrganizationById);
const consumeOAuthStateMock = vi.mocked(consumeOAuthState);
const persistAuditEventMock = vi.mocked(persistAuditEvent);
const persistOAuthStateMock = vi.mocked(persistOAuthState);

type RegisteredHandler = (req: Record<string, any>, res: FakeResponse) => void | Promise<void>;

class FakeResponse {
  statusCode = 200;
  body: any;
  headers = new Map<string, string>();

  status(code: number) { this.statusCode = code; return this; }
  json(body: unknown) { this.body = body; return this; }
  set(name: string, value: string) { this.headers.set(name.toLowerCase(), value); return this; }
  send(body: unknown) { this.body = body; return this; }
  cookie(name: string, value: string) { this.headers.set("set-cookie", `${name}=${value}`); return this; }
  redirect(statusCode: number, url: string) { this.statusCode = statusCode; this.headers.set("location", url); return this; }
  once() { return this; }
  getHeader(name: string) { return this.headers.get(name.toLowerCase()); }
}

function handlers() {
  const registered = new Map<string, RegisteredHandler>();
  const app = {
    get(path: string, handler: RegisteredHandler) { registered.set(`GET ${path}`, handler); },
    post(path: string, handler: RegisteredHandler) { registered.set(`POST ${path}`, handler); },
  };
  registerGhlOAuthRoutes(app as never);
  return registered;
}

async function invoke(method: "GET" | "POST", path: string, options: {
  query?: Record<string, string>;
  cookie?: string;
  csrfHeader?: string;
  preflight?: boolean;
} = {}) {
  const handler = handlers().get(`${method} ${path}`);
  if (!handler) throw new Error(`Missing ${method} ${path} handler.`);
  const headers: Record<string, string> = {};
  if (options.cookie) headers.cookie = options.cookie;
  if (options.csrfHeader) headers["x-eeos-csrf-token"] = options.csrfHeader;
  if (options.preflight) headers["x-eeos-oauth-preflight"] = "verify";
  const req = {
    method,
    path,
    query: options.query ?? {},
    headers,
    protocol: "https",
    header(name: string) { return headers[name.toLowerCase()]; },
  };
  const res = new FakeResponse();
  await handler(req, res);
  return { status: res.statusCode, body: res.body, headers: res.headers };
}

const testSessionToken = "opaque-test-session-token-with-enough-entropy";
const testJwtSecret = "test-jwt-secret-for-csrf-derivation";
const csrfToken = createHmac("sha256", testJwtSecret)
  .update("eeos:gohighlevel:oauth:csrf:")
  .update(testSessionToken)
  .digest("base64url");
const csrf = {
  cookie: `app_session_id=${testSessionToken}`,
  csrfHeader: csrfToken,
};

function authenticatedUser(role: "user" | "admin" = "user") {
  authenticateRequestMock.mockResolvedValue({
    id: 42,
    openId: "user_open_id",
    name: "Test User",
    email: "user@example.com",
    loginMethod: "email",
    role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as never);
}

function organization(role: "owner" | "executive" | "analyst" | "viewer" | "unknown" = "owner") {
  getUserSubaccountsMock.mockResolvedValue([{
    membershipId: 7,
    orgName: "PRN Staffers",
    ghlLocationId: "loc_sc",
    name: "South Carolina",
  } as never]);
  getMembershipByIdMock.mockResolvedValue({ id: 7, organizationId: 100, status: "active" } as never);
  getMembershipUserMock.mockResolvedValue({ role, isActive: true } as never);
  getOrganizationByIdMock.mockResolvedValue({ id: 100, name: "PRN Staffers", isActive: true } as never);
}

function encodedState(tenantId = "100", locationId = "loc_sc") {
  return Buffer.from(JSON.stringify({ tenantId, locationId, nonce: "safe", ts: Date.now() })).toString("base64url");
}

describe("GoHighLevel production OAuth security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GHL_CLIENT_ID = "test-client-id";
    process.env.GHL_REDIRECT_URI = "https://app.geteeos.com/api/integrations/eea/oauth/callback";
    process.env.JWT_SECRET = testJwtSecret;
    readSessionTokenMock.mockReturnValue(testSessionToken);
    getGhlTokenMock.mockResolvedValue(undefined);
    authenticatedUser();
    organization();
  });

  afterEach(() => {
    delete process.env.GHL_CLIENT_ID;
    delete process.env.GHL_REDIRECT_URI;
    delete process.env.JWT_SECRET;
    vi.unstubAllGlobals();
  });

  it("preserves the standard browser response used for the external redirect", async () => {
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "100" },
      ...csrf,
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      authorizationUrl: expect.stringContaining("marketplace.gohighlevel.com/oauth/chooselocation"),
    });
    expect(persistOAuthStateMock).toHaveBeenCalledOnce();
    expect(consumeOAuthStateMock).not.toHaveBeenCalled();
    expect(persistAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "oauth.start.allowed" }));
  });

  it("rotates the browser-readable CSRF cookie when authenticated session context loads", async () => {
    const result = await invoke("GET", "/api/integrations/gohighlevel/session-context", {
      query: { locationId: "loc_sc" },
      cookie: `app_session_id=${testSessionToken}`,
    });
    expect(result.status).toBe(200);
    expect(result.headers.get("set-cookie")).toMatch(/^eeos_csrf=.+/);
    expect(result.body).toMatchObject({
      csrfCookieReady: true,
      csrfToken: expect.stringMatching(/^[A-Za-z0-9_-]{32,}$/),
    });
    expect(result.headers.get("set-cookie")).toContain(result.body.csrfToken);
  });

  it("accepts the session-bound CSRF value when a legacy same-name cookie is also present", async () => {
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "100" },
      cookie: `app_session_id=${testSessionToken}; eeos_csrf=legacy-cookie-value-that-does-not-match`,
      csrfHeader: csrfToken,
    });
    expect(result.status).toBe(200);
    expect(persistOAuthStateMock).toHaveBeenCalledOnce();
  });

  it("prevents a duplicate active connection before creating OAuth state", async () => {
    getGhlTokenMock.mockResolvedValue({
      tenantId: "100",
      locationId: "loc_sc",
      isActive: true,
    } as never);
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "100" },
      ...csrf,
    });
    expect(result.status).toBe(409);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
  });

  it("returns a sanitized owner JSON preflight and immediately invalidates its persisted state", async () => {
    consumeOAuthStateMock.mockResolvedValue({
      organizationId: "100",
      payload: { provider: "gohighlevel", tenantId: "100", locationId: "loc_sc" },
    });
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "100" },
      preflight: true,
      ...csrf,
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      provider: "gohighlevel",
      authorizationUrl: expect.stringContaining("marketplace.gohighlevel.com/oauth/chooselocation"),
      state: {
        created: true,
        status: "invalidated",
        expiresAt: expect.any(String),
      },
    });
    const persistedState = persistOAuthStateMock.mock.calls[0][0];
    const persistedPayload = persistOAuthStateMock.mock.calls[0][1];
    expect(persistedPayload).toMatchObject({
      provider: "gohighlevel",
      tenantId: "100",
      locationId: "loc_sc",
      membershipId: "7",
      userId: "42",
    });
    expect(consumeOAuthStateMock).toHaveBeenCalledWith(persistedState);
    expect(JSON.stringify(result.body)).not.toMatch(
      /clientSecret|sessionToken|cookie|privateKey|vault|database|refreshToken|accessToken|test-client-secret/i,
    );
  });

  it("fails closed when a preflight state cannot be invalidated", async () => {
    consumeOAuthStateMock.mockResolvedValue(null);
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "100" },
      preflight: true,
      ...csrf,
    });
    expect(result.status).toBe(500);
    expect(result.body).not.toHaveProperty("authorizationUrl");
  });

  it("allows a dual-role platform admin with an active selected owner membership", async () => {
    authenticatedUser("admin");
    consumeOAuthStateMock.mockResolvedValue({
      organizationId: "100",
      payload: { provider: "gohighlevel", tenantId: "100", locationId: "loc_sc" },
    });
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "100" },
      preflight: true,
      ...csrf,
    });
    expect(result.status).toBe(200);
    expect(persistOAuthStateMock).toHaveBeenCalledOnce();
  });

  it("requires an approved audited support context for platform administrators without an owner membership", async () => {
    authenticatedUser("admin");
    getUserSubaccountsMock.mockResolvedValue([]);
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc" }, preflight: true, ...csrf,
    });
    expect(result.status).toBe(403);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
  });

  it("denies a dual-role platform admin whose owner membership belongs to another organization", async () => {
    authenticatedUser("admin");
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "999" },
      preflight: true,
      ...csrf,
    });
    expect(result.status).toBe(403);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
  });

  it("denies an inactive owner membership", async () => {
    getMembershipByIdMock.mockResolvedValue({ id: 7, organizationId: 100, status: "suspended" } as never);
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "100" },
      preflight: true,
      ...csrf,
    });
    expect(result.status).toBe(403);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
  });

  it("denies a location outside the owner's active membership scope", async () => {
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_other", organizationId: "100" },
      preflight: true,
      ...csrf,
    });
    expect(result.status).toBe(403);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
  });

  it.each([
    ["Alabama", "loc_al"],
    ["Florida", "loc_fl"],
    ["Delaware", "loc_de"],
    ["an unrelated location", "loc_other"],
  ])("denies %s before creating OAuth state", async (_label, locationId) => {
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId, organizationId: "100" },
      preflight: true,
      ...csrf,
    });
    expect(result.status).toBe(403);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
  });

  it.each([
    ["READ_ONLY", "viewer"],
    ["STAFF", "analyst"],
    ["LOCATION_MANAGER", "executive"],
    ["unknown", "unknown"],
  ])("rejects %s OAuth starts", async (_label, role) => {
    organization(role as never);
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc" }, preflight: true, ...csrf,
    });
    expect(result.status).toBe(403);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
    expect(persistAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "oauth.start.denied" }));
  });

  it("rejects a missing membership role", async () => {
    getMembershipUserMock.mockResolvedValue(undefined);
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc" }, preflight: true, ...csrf,
    });
    expect(result.status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    authenticateRequestMock.mockRejectedValue(new Error("No session"));
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc" }, preflight: true, ...csrf,
    });
    expect(result.status).toBe(401);
  });

  it("rejects missing or invalid CSRF before authentication", async () => {
    const result = await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc" }, preflight: true,
    });
    expect(result.status).toBe(403);
    expect(authenticateRequestMock).not.toHaveBeenCalled();
  });

  it("rejects wrong organizations and unauthorized locations", async () => {
    expect((await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_sc", organizationId: "999" }, preflight: true, ...csrf,
    })).status).toBe(403);
    expect((await invoke("POST", "/api/integrations/gohighlevel/oauth/start", {
      query: { locationId: "loc_other" }, preflight: true, ...csrf,
    })).status).toBe(403);
  });

  it("disables the anonymous legacy OAuth start route", async () => {
    authenticateRequestMock.mockRejectedValue(new Error("No session"));
    const result = await invoke("GET", "/api/ghl/auth", { query: { tenantId: "attacker" } });
    expect(result.status).toBe(410);
    expect(result.headers.has("location")).toBe(false);
    expect(persistOAuthStateMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["malformed", "not-valid-state"],
  ])("rejects %s callback state before token exchange", async (_label, state) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await invoke("GET", "/api/integrations/eea/oauth/callback", {
      query: { code: "authorization-code", ...(state ? { state } : {}) },
    });
    expect(result.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["unknown", "expired", "replayed"])("rejects %s persisted state before token exchange", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    consumeOAuthStateMock.mockResolvedValue(null);
    const result = await invoke("GET", "/api/integrations/eea/oauth/callback", {
      query: { code: "authorization-code", state: encodedState() },
    });
    expect(result.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched persisted organization or location before token exchange", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    consumeOAuthStateMock.mockResolvedValue({
      organizationId: "999",
      payload: { provider: "gohighlevel", tenantId: "999", locationId: "loc_other" },
    });
    const result = await invoke("GET", "/api/ghl/callback", {
      query: { code: "authorization-code", state: encodedState() },
    });
    expect(result.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires authentication for status", async () => {
    authenticateRequestMock.mockRejectedValue(new Error("No session"));
    expect((await invoke("GET", "/api/ghl/status")).status).toBe(401);
  });

  it("rejects cross-organization status access", async () => {
    expect((await invoke("GET", "/api/ghl/status", {
      query: { tenantId: "999", locationId: "loc_sc" },
    })).status).toBe(403);
  });

  it("returns only safe connection status fields", async () => {
    getGhlTokenMock.mockResolvedValue({
      tenantId: "100",
      accessToken: "must-not-leak",
      refreshToken: "must-not-leak",
      locationId: "loc_sc",
      scope: "contacts.readonly opportunities.readonly",
      isActive: true,
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      connectedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);
    const result = await invoke("GET", "/api/ghl/status", { query: { locationId: "loc_sc" } });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      connected: true,
      provider: "gohighlevel",
      locationId: "loc_sc",
      revoked: false,
      scopes: ["contacts.readonly", "opportunities.readonly"],
    });
    expect(JSON.stringify(result.body)).not.toMatch(/accessToken|refreshToken|secret|must-not-leak/i);
  });
});

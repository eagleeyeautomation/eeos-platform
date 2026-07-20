import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerGhlOAuthRoutes } from "./ghl-oauth";
import { sdk } from "./_core/sdk";
import { getMembershipById, getUserSubaccounts } from "./db";

vi.mock("./_core/env", () => ({
  ENV: {
    ghlClientId: "test-client-id",
    ghlClientSecret: "test-client-secret",
    ghlRedirectUri: "https://app.geteeos.com/api/integrations/eea/oauth/callback",
  },
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

vi.mock("./db", () => ({
  getGhlToken: vi.fn(),
  getMembershipById: vi.fn(),
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
const getUserSubaccountsMock = vi.mocked(getUserSubaccounts);
const getMembershipByIdMock = vi.mocked(getMembershipById);

type RegisteredHandler = (req: Record<string, unknown>, res: FakeResponse) => void | Promise<void>;

class FakeResponse {
  statusCode = 200;
  body: unknown;
  headers = new Map<string, string>();

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(body: unknown) {
    this.body = body;
    return this;
  }

  set(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  send(body: unknown) {
    this.body = body;
    return this;
  }

  cookie(name: string, value: string) {
    this.headers.set("set-cookie", `${name}=${value}`);
    return this;
  }

  redirect(statusCode: number, url: string) {
    this.statusCode = statusCode;
    this.headers.set("location", url);
    return this;
  }

  once() {
    return this;
  }
}

function collectOAuthStartHandlers() {
  const handlers = new Map<string, RegisteredHandler>();
  const app = {
    get(path: string, handler: RegisteredHandler) {
      handlers.set(`GET ${path}`, handler);
    },
    post(path: string, handler: RegisteredHandler) {
      handlers.set(`POST ${path}`, handler);
    },
  };

  registerGhlOAuthRoutes(app as never);
  return handlers;
}

async function invokeOAuthStart(method: "GET" | "POST", options: {
  locationId?: string;
  cookie?: string;
  csrfHeader?: string;
} = {}) {
  const handlers = collectOAuthStartHandlers();
  const handler = handlers.get(`${method} /api/integrations/gohighlevel/oauth/start`);

  if (!handler) {
    throw new Error(`Missing ${method} OAuth start handler.`);
  }

  const headers: Record<string, string> = {};
  if (options.cookie) headers.cookie = options.cookie;
  if (options.csrfHeader) headers["x-eeos-csrf-token"] = options.csrfHeader;

  const req = {
    query: options.locationId ? { locationId: options.locationId } : {},
    headers,
    protocol: "https",
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  };
  const res = new FakeResponse();

  await handler(req, res);

  return { status: res.statusCode, body: res.body };
}

describe("GoHighLevel secure OAuth start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GHL_CLIENT_ID = "test-client-id";
    process.env.GHL_REDIRECT_URI = "https://app.geteeos.com/api/integrations/eea/oauth/callback";
  });

  afterEach(() => {
    delete process.env.GHL_CLIENT_ID;
    delete process.env.GHL_REDIRECT_URI;
  });

  it("registers exactly one active POST OAuth start handler", () => {
    const routes: Array<{ method: string; path: string }> = [];
    const app = {
      get(path: string) {
        routes.push({ method: "GET", path });
      },
      post(path: string) {
        routes.push({ method: "POST", path });
      },
    };

    registerGhlOAuthRoutes(app as never);

    expect(routes.filter((route) => route.method === "POST" && route.path === "/api/integrations/gohighlevel/oauth/start")).toHaveLength(1);
  });

  it("rejects GET OAuth start requests", async () => {
    const { status, body } = await invokeOAuthStart("GET");

    expect(status).toBe(405);
    expect(body).toMatchObject({ error: "method_not_allowed" });
  });

  it("rejects unauthenticated POST requests after CSRF validation passes", async () => {
    authenticateRequestMock.mockRejectedValue(new Error("No session"));

    const { status, body } = await invokeOAuthStart("POST", {
      locationId: "loc_sc",
      cookie: "eeos_csrf=csrf-token-with-enough-length-123456",
      csrfHeader: "csrf-token-with-enough-length-123456",
    });

    expect(status).toBe(401);
    expect(body).toMatchObject({ error: "unauthorized" });
  });

  it("rejects missing or invalid CSRF before authentication", async () => {
    const { status, body } = await invokeOAuthStart("POST", { locationId: "loc_sc" });

    expect(status).toBe(403);
    expect(body).toMatchObject({ error: "forbidden" });
    expect(authenticateRequestMock).not.toHaveBeenCalled();
  });

  it("rejects locations that are not available to the authenticated user", async () => {
    authenticateRequestMock.mockResolvedValue({
      id: 42,
      openId: "user_open_id",
      name: "Test User",
      email: "user@example.com",
      loginMethod: "email",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    getUserSubaccountsMock.mockResolvedValue([
      {
        membershipId: 7,
        orgName: "PRN Staffers",
        ghlLocationId: "different-location",
        name: "Different Location",
      } as never,
    ]);
    getMembershipByIdMock.mockResolvedValue({
      organizationId: 100,
    } as never);

    const { status, body } = await invokeOAuthStart("POST", {
      locationId: "loc_sc",
      cookie: "eeos_csrf=csrf-token-with-enough-length-123456",
      csrfHeader: "csrf-token-with-enough-length-123456",
    });

    expect(status).toBe(403);
    expect(body).toMatchObject({ error: "forbidden" });
  });
});

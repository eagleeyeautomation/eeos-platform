import express from "express";
import type { Server } from "http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAdminBootstrapRoute, type AdminBootstrapDependencies } from "./adminBootstrap";

const baseEnv = {
  EEOS_ADMIN_BOOTSTRAP_ENABLED: "true",
  EEOS_ADMIN_BOOTSTRAP_SECRET: "test-secret-that-is-long-and-random",
  EEOS_ADMIN_BOOTSTRAP_EMAIL: "admin@prnstaffers.com",
};

const productionEnv = { ...baseEnv, APP_ENV: "production" };
const productionOrigin = "https://eeos-platform-production.up.railway.app";

const audit = vi.fn(async () => undefined);
const dependencies = (): AdminBootstrapDependencies => ({
  getUserByEmail: vi.fn(async () => ({ id: 7, openId: "admin-open-id", name: "PRN Admin", email: baseEnv.EEOS_ADMIN_BOOTSTRAP_EMAIL, role: "admin" })),
  getOrganizationBySlug: vi.fn(async () => ({ id: 9, name: "PRN Staffers Inc.", isActive: true })),
  getMembershipByOrg: vi.fn(async () => ({ id: 11, status: "active" })),
  getMembershipUser: vi.fn(async () => ({ role: "owner", isActive: true })),
  getSubaccountsByMembership: vi.fn(async () => [{ ghlLocationId: "loc-sc", name: "South Carolina", isActive: true }]),
  createSessionToken: vi.fn(async () => "signed-session-token"),
  audit,
});

const servers: Server[] = [];
afterEach(async () => {
  audit.mockClear();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function invoke(
  deps: AdminBootstrapDependencies,
  env: NodeJS.ProcessEnv = baseEnv,
  body: Record<string, unknown> = { secret: baseEnv.EEOS_ADMIN_BOOTSTRAP_SECRET },
  origin: string | undefined = undefined,
) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  registerAdminBootstrapRoute(app, deps, env);
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  return fetch(`http://127.0.0.1:${address.port}/api/auth/bootstrap-admin-session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin === undefined ? { origin: `http://127.0.0.1:${address.port}` } : origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

describe("administrator session bootstrap", () => {
  it("is unavailable when disabled", async () => {
    const response = await invoke(dependencies(), { ...baseEnv, EEOS_ADMIN_BOOTSTRAP_ENABLED: "false" });
    expect(response.status).toBe(404);
  });

  it.each([undefined, "wrong-secret"])("rejects a missing or incorrect secret", async (secret) => {
    const response = await invoke(dependencies(), baseEnv, secret ? { secret } : {});
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it.each([productionOrigin, `${productionOrigin}/`])("accepts the canonical production origin with harmless slash normalization", async (origin) => {
    const response = await invoke(dependencies(), productionEnv, undefined, origin);
    expect(response.status).toBe(200);
  });

  it.each([
    { origin: "https://attacker.example", reason: "origin_mismatch" },
    { origin: "", reason: "origin_mismatch" },
  ])("rejects an invalid or missing origin with a safe audit reason", async ({ origin, reason }) => {
    const response = await invoke(dependencies(), productionEnv, undefined, origin);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(audit).toHaveBeenCalledWith("failure", reason, undefined, undefined);
  });

  it.each([
    { body: {}, reason: "secret_missing" },
    { body: { secret: "wrong-secret" }, reason: "secret_mismatch" },
  ])("returns a generic 401 while recording the distinct secret failure reason", async ({ body, reason }) => {
    const response = await invoke(dependencies(), productionEnv, body, productionOrigin);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(audit).toHaveBeenCalledWith("failure", reason, undefined, undefined);
  });

  it("rejects an administrator that does not already exist", async () => {
    const deps = dependencies();
    deps.getUserByEmail = vi.fn(async () => undefined);
    expect((await invoke(deps)).status).toBe(403);
  });

  it.each([
    { membership: undefined, link: { role: "owner", isActive: true } },
    { membership: { id: 11, status: "active" }, link: { role: "owner", isActive: false } },
    { membership: { id: 11, status: "active" }, link: { role: "viewer", isActive: true } },
  ])("rejects an inactive or unauthorized administrator membership", async ({ membership, link }) => {
    const deps = dependencies();
    deps.getMembershipByOrg = vi.fn(async () => membership);
    deps.getMembershipUser = vi.fn(async () => link);
    expect((await invoke(deps)).status).toBe(403);
  });

  it("rejects missing South Carolina authorization", async () => {
    const deps = dependencies();
    deps.getSubaccountsByMembership = vi.fn(async () => [{ ghlLocationId: "loc-de", name: "Delaware", isActive: true }]);
    expect((await invoke(deps)).status).toBe(403);
  });

  it("creates the existing secure session cookie once", async () => {
    const deps = dependencies();
    const app = express();
    app.set("trust proxy", 1);
    app.use(express.json());
    registerAdminBootstrapRoute(app, deps, baseEnv);
    const server = app.listen(0, "127.0.0.1");
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start");
    const url = `http://127.0.0.1:${address.port}/api/auth/bootstrap-admin-session`;
    const request = () => fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://example.test",
        "x-forwarded-host": "example.test",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ secret: baseEnv.EEOS_ADMIN_BOOTSTRAP_SECRET }),
    });

    const response = await request();
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") || "";
    expect(cookie).toContain("app_session_id=signed-session-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=None");
    expect((await request()).status).toBe(404);
  });

  it("never includes the secret in responses or audit payloads", async () => {
    const response = await invoke(dependencies(), baseEnv, { secret: "wrong-secret" });
    expect(await response.text()).not.toContain("wrong-secret");
    expect(JSON.stringify(audit.mock.calls)).not.toContain("wrong-secret");
  });
});

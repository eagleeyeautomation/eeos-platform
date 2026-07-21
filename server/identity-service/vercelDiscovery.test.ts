import { createServer } from "http";
import { promises as fs } from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import dedicatedHandler from "../../deploy/identity-service-vercel/api/index";

let server: ReturnType<typeof createServer>;
let baseUrl: string;

beforeAll(async () => {
  process.env.IDENTITY_SERVICE_ENV = "test";
  server = createServer(dedicatedHandler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Discovery test server did not start.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  delete process.env.IDENTITY_SERVICE_ENV;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function invoke(pathname: string, init?: RequestInit) {
  return fetch(`${baseUrl}/api?path=${encodeURIComponent(pathname.replace(/^\//, ""))}`, init);
}

describe("dedicated Identity Service Vercel discovery root", () => {
  it("exports a callable delegate without creating another app or listener", async () => {
    expect(dedicatedHandler).toBeTypeOf("function");
    const source = await fs.readFile(path.resolve("deploy/identity-service-vercel/api/index.ts"), "utf8");
    expect(source).toContain("server/identity-service/vercel.js");
    expect(source).not.toContain("listen(");
    expect(source).not.toContain("createIdentityServiceApp");
  });

  it("preserves liveness and dependency-backed readiness", async () => {
    expect((await invoke("/health/live")).status).toBe(200);
    expect((await invoke("/health/ready")).status).toBe(503);
  });

  it("registers both frozen internal routes without enabling authorization", async () => {
    const envelope = { schemaVersion: "v1", requestId: "request_1234567890",
      timestamp: "2026-07-21T12:00:00.000Z", nonce: "nonce_1234567890123456" };
    const session = await invoke("/internal/v1/session/validate", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify(envelope) });
    expect(session.status).toBe(401);
    const authorization = await invoke("/internal/v1/authorization/check", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ ...envelope,
        identityAssertion: "x".repeat(32), resourceType: "ghl_location", resourceId: "location-test", action: "ghl:connect" }) });
    expect(authorization.status).toBe(401);
  });

  it.each(["/connect-ghl", "/api/integrations/gohighlevel/oauth/start", "/api/ghl/status"])(
    "does not expose Core Platform route %s", async (pathname) => {
      const response = await invoke(pathname);
      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
    },
  );

  it("uses modern API discovery without SPA output or legacy builds", async () => {
    const config = JSON.parse(await fs.readFile(path.resolve("deploy/identity-service-vercel/vercel.json"), "utf8"));
    expect(config.framework).toBeNull();
    expect(config.builds).toBeUndefined();
    expect(config.outputDirectory).toBe("dist");
    expect(config.rewrites).toEqual([{ source: "/:path*", destination: "/api?path=:path*" }]);
  });
});

import fs from "node:fs";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { restoreExpressApiPath } from "./_core/vercel-path";

type VercelRoute = {
  src?: string;
  dest?: string;
  handle?: string;
};

type VercelConfig = {
  outputDirectory?: string;
  installCommand?: string;
  buildCommand?: string;
  routes?: VercelRoute[];
};

function loadVercelConfig() {
  const configPath = path.resolve(process.cwd(), "vercel.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as VercelConfig;
}

function resolveDeploymentRoute(pathname: string, routes: VercelRoute[]) {
  const apiRewrite = routes.find((route) => route.dest === "/api?path=$1");
  const apiRewriteRegex = apiRewrite?.src ? new RegExp(`^${apiRewrite.src}$`) : null;

  if (apiRewriteRegex?.test(pathname)) {
    return "/api?path=:path*";
  }

  const fallback = routes.find((route) => route.dest === "/index.html");
  const fallbackRegex = fallback?.src ? new RegExp(`^${fallback.src}$`) : null;

  if (fallbackRegex?.test(pathname)) {
    return fallback?.dest;
  }

  return "filesystem";
}

describe("Vercel deployment routing", () => {
  it("serves the built Vite client from dist/public", () => {
    const config = loadVercelConfig();

    expect(config.installCommand).toBe("pnpm install --frozen-lockfile");
    expect(config.buildCommand).toBe("pnpm run build");
    expect(config.outputDirectory).toBe("dist/public");
  });

  it("resolves SPA routes to the client app fallback", () => {
    const config = loadVercelConfig();

    expect(resolveDeploymentRoute("/integrations/gohighlevel", config.routes || [])).toBe("/index.html");
  });

  it("rewrites API routes to the stable Vercel function instead of the SPA", () => {
    const config = loadVercelConfig();

    expect(resolveDeploymentRoute("/api/integrations/gohighlevel/oauth/start", config.routes || [])).toBe("/api?path=:path*");
  });

  it("restores the original Express API pathname before invoking the shared app", () => {
    const req = {
      headers: { host: "app.geteeos.com" },
      url: "/api?path=integrations/gohighlevel/oauth/start&locationId=loc_sc",
    } as IncomingMessage;

    restoreExpressApiPath(req);

    expect(req.url).toBe("/api/integrations/gohighlevel/oauth/start?locationId=loc_sc");
  });
});

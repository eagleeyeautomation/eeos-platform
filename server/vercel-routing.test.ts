import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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

  it("does not allow API routes to fall through to the SPA fallback", () => {
    const config = loadVercelConfig();

    expect(resolveDeploymentRoute("/api/integrations/gohighlevel/oauth/start", config.routes || [])).toBe("filesystem");
  });
});

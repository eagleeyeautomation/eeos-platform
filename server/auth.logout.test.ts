import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { sdk } from "./_core/sdk";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "eeos",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
    isActive: true,
  };

  const sessionToken = "logout-session-token";
  process.env.JWT_SECRET = "logout-test-signing-secret-at-least-32-characters";
  const csrfToken = createHmac("sha256", process.env.JWT_SECRET)
    .update("eeos:gohighlevel:oauth:csrf:")
    .update(sessionToken)
    .digest("base64url");
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { cookie: `${COOKIE_NAME}=${sessionToken}` },
      header: (name: string) => name.toLowerCase() === "x-eeos-csrf-token" ? csrfToken : undefined,
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  afterEach(() => vi.restoreAllMocks());

  it("clears the session cookie and reports success", async () => {
    vi.spyOn(sdk, "revokeCurrentSession").mockResolvedValue(undefined);
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });
});

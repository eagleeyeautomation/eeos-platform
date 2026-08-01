import { createHmac } from "crypto";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import type { TrpcContext } from "./context";
import { protectedProcedure, router } from "./trpc";

const testRouter = router({
  protectedRead: protectedProcedure.query(() => ({ ok: true })),
  protectedWrite: protectedProcedure.mutation(() => ({ ok: true })),
});

const user: User = {
  id: 1,
  openId: "phase-one-user",
  name: "Phase One User",
  email: "phase-one@example.com",
  loginMethod: "eeos",
  role: "user",
  passwordHash: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(options: { authenticated?: boolean; validCsrf?: boolean } = {}): TrpcContext {
  const sessionToken = "phase-one-session-token";
  process.env.JWT_SECRET = "phase-one-test-signing-secret-at-least-32-characters";
  const csrfToken = createHmac("sha256", process.env.JWT_SECRET)
    .update("eeos:gohighlevel:oauth:csrf:")
    .update(sessionToken)
    .digest("base64url");
  return {
    user: options.authenticated === false ? null : user,
    req: {
      headers: { cookie: `${COOKIE_NAME}=${sessionToken}` },
      header: (name: string) => name.toLowerCase() === "x-eeos-csrf-token"
        ? options.validCsrf ? csrfToken : undefined
        : undefined,
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("protected tRPC security boundary", () => {
  it("returns UNAUTHORIZED before procedure execution when the session is absent", async () => {
    await expect(testRouter.createCaller(context({ authenticated: false })).protectedRead())
      .rejects.toMatchObject<Partial<TRPCError>>({ code: "UNAUTHORIZED" });
  });

  it("allows authenticated reads without requiring CSRF", async () => {
    await expect(testRouter.createCaller(context()).protectedRead()).resolves.toEqual({ ok: true });
  });

  it("rejects authenticated mutations without the session-bound CSRF value", async () => {
    await expect(testRouter.createCaller(context()).protectedWrite())
      .rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("allows authenticated mutations with the session-bound CSRF value", async () => {
    await expect(testRouter.createCaller(context({ validCsrf: true })).protectedWrite())
      .resolves.toEqual({ ok: true });
  });
});

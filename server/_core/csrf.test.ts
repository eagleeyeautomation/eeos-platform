import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { hasValidSessionCsrf, issueSessionCsrfToken } from "./csrf";
import { sdk } from "./sdk";

describe("session-bound CSRF", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.JWT_SECRET;
  });

  it("accepts the issued token only for the session from which it was derived", () => {
    process.env.JWT_SECRET = "isolated-csrf-test-secret";
    let sessionToken = "session-a";
    vi.spyOn(sdk, "readSessionToken").mockImplementation(() => sessionToken);
    let issuedToken = "";
    const response = {
      cookie(_name: string, value: string) {
        issuedToken = value;
      },
    } as unknown as Response;
    const request = {
      secure: true,
      header(name: string) {
        if (name.toLowerCase() === "x-eeos-csrf-token") return issuedToken;
        return undefined;
      },
    } as unknown as Request;

    expect(issueSessionCsrfToken(request, response)).toBeTruthy();
    expect(hasValidSessionCsrf(request)).toBe(true);

    sessionToken = "session-b";
    expect(hasValidSessionCsrf(request)).toBe(false);
  });

  it("can issue the session-bound value alongside a newly created session", () => {
    process.env.JWT_SECRET = "test-session-signing-secret-at-least-32-characters";
    const cookie = vi.fn();
    const req = {
      secure: true,
      header: () => "https",
      headers: {},
    } as never;
    const res = { cookie } as never;

    const token = issueSessionCsrfToken(req, res, "newly-created-session-token");
    expect(token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(cookie).toHaveBeenCalledWith("eeos_csrf", token, expect.objectContaining({
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    }));
  });
});

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
});

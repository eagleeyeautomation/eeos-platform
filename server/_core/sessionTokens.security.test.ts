import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { AUTH_TOKEN_BYTES, createOpaqueToken, hashOpaqueToken, readClientIp } from "./sessionTokens";

describe("session token security", () => {
  it("creates opaque high-entropy tokens and stores only deterministic hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).not.toBe(second);
    expect(Buffer.from(first, "base64url")).toHaveLength(AUTH_TOKEN_BYTES);
    expect(hashOpaqueToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOpaqueToken(first)).not.toContain(first);
  });

  it("uses the proxy-policy-resolved client address instead of a caller-controlled forwarding header", () => {
    const request = {
      ip: "203.0.113.10",
      socket: { remoteAddress: "10.0.0.5" },
      header: (name: string) => name.toLowerCase() === "x-forwarded-for" ? "198.51.100.25" : undefined,
    } as Request;
    expect(readClientIp(request)).toBe("203.0.113.10");
  });
});

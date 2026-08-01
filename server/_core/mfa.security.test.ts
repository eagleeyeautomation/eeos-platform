import { describe, expect, it } from "vitest";
import { decryptMfaSecret, encryptMfaSecret, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, mfaRequiredForRole, totpCode, verifyTotp } from "./mfa";

const env = { EEOS_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") } as NodeJS.ProcessEnv;

describe("MFA security foundation", () => {
  it("encrypts secrets with versioned authenticated encryption and no plaintext fallback", () => {
    const encrypted = encryptMfaSecret("TOP-SECRET", env);
    expect(encrypted).toMatch(/^v1\./); expect(encrypted).not.toContain("TOP-SECRET");
    expect(decryptMfaSecret(encrypted, env)).toBe("TOP-SECRET");
    const parts = encrypted.split("."); const tampered = Buffer.from(parts[3], "base64url"); tampered[0] ^= 1; parts[3] = tampered.toString("base64url");
    expect(() => decryptMfaSecret(parts.join("."), env)).toThrow();
    expect(() => encryptMfaSecret("secret", {} as NodeJS.ProcessEnv)).toThrow(/required/);
  });

  it("accepts a current TOTP once and rejects replay and expired windows", () => {
    const secret = generateTotpSecret(); const now = 1_800_000; const counter = Math.floor(now / 30_000); const code = totpCode(secret, counter);
    expect(verifyTotp(secret, code, now)).toBe(counter);
    expect(verifyTotp(secret, code, now, counter)).toBeUndefined();
    expect(verifyTotp(secret, code, now + 120_000)).toBeUndefined();
    expect(verifyTotp(secret, "000000", now)).toBeUndefined();
  });

  it("creates random recovery codes and hashes them without retaining plaintext", () => {
    const codes = generateRecoveryCodes(); expect(codes).toHaveLength(10); expect(new Set(codes).size).toBe(10);
    const hashes = codes.map(hashRecoveryCode); expect(hashes[0]).toMatch(/^[a-f0-9]{64}$/); expect(hashes).not.toContain(codes[0]);
    expect(hashRecoveryCode(codes[0])).toBe(hashes[0]); expect(hashRecoveryCode("wrong")).not.toBe(hashes[0]);
  });

  it("supports a safe disabled rollout and server-authoritative role lists", () => {
    expect(mfaRequiredForRole("PLATFORM_ADMIN", { EEOS_MFA_REQUIRED_ROLES: "disabled" } as NodeJS.ProcessEnv)).toBe(false);
    expect(mfaRequiredForRole("PLATFORM_ADMIN", { EEOS_MFA_REQUIRED_ROLES: "PLATFORM_ADMIN" } as NodeJS.ProcessEnv)).toBe(true);
    expect(mfaRequiredForRole("ORGANIZATION_OWNER", { EEOS_MFA_REQUIRED_ROLES: "PLATFORM_ADMIN" } as NodeJS.ProcessEnv)).toBe(false);
  });
});

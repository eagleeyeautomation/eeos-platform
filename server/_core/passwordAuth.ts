import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
const CURRENT_VERSION = "1";
const DEFAULT_N = 16_384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
  });

  return [
    "scrypt",
    CURRENT_VERSION,
    String(DEFAULT_N),
    String(DEFAULT_R),
    String(DEFAULT_P),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join(":");
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const parts = storedHash.split(":");
  if (parts.length !== 7 || parts[0] !== "scrypt" || parts[1] !== CURRENT_VERSION) {
    return false;
  }

  const [, , nValue, rValue, pValue, saltValue, keyValue] = parts;
  const n = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(keyValue, "base64url");
  const actual = scryptSync(password, salt, expected.length, { N: n, r, p });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

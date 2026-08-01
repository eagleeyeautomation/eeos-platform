import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const VERSION = "v1";

function encryptionKey(env: NodeJS.ProcessEnv = process.env) {
  const encoded = env.EEOS_MFA_ENCRYPTION_KEY;
  if (!encoded) throw new Error("EEOS_MFA_ENCRYPTION_KEY is required");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("EEOS_MFA_ENCRYPTION_KEY must be a base64-encoded 256-bit key");
  return key;
}

export function encryptMfaSecret(secret: string, env?: NodeJS.ProcessEnv) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(env), nonce);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [VERSION, nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptMfaSecret(value: string, env?: NodeJS.ProcessEnv) {
  const [version, nonce, tag, ciphertext] = value.split(".");
  if (version !== VERSION || !nonce || !tag || !ciphertext) throw new Error("Unsupported MFA ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(env), Buffer.from(nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(bytes = 20) {
  const source = randomBytes(bytes);
  let bits = "";
  for (let index = 0; index < source.length; index += 1) bits += source[index].toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) result += BASE32[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  return result;
}

function decodeBase32(value: string) {
  let bits = "";
  for (const character of value.replace(/=+$/g, "").toUpperCase()) {
    const index = BASE32.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function totpCode(secret: string, counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return number.toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now(), lastCounter?: number | null) {
  if (!/^\d{6}$/.test(code)) return undefined;
  const current = Math.floor(now / 30_000);
  for (const counter of [current - 1, current, current + 1]) {
    if (lastCounter != null && counter <= lastCounter) continue;
    const expected = Buffer.from(totpCode(secret, counter));
    const supplied = Buffer.from(code);
    if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) return counter;
  }
  return undefined;
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => `${randomBytes(4).toString("hex")}-${randomBytes(4).toString("hex")}`);
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(`eeos:mfa:recovery:v1:${code.trim().toLowerCase()}`).digest("hex");
}

export function mfaRequiredForRole(role: string | null, env: NodeJS.ProcessEnv = process.env) {
  const policy = (env.EEOS_MFA_REQUIRED_ROLES ?? "disabled").trim();
  if (!policy || policy === "disabled") return false;
  return policy.split(",").map((item) => item.trim().toUpperCase()).includes(role ?? "");
}

import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 512;

export function validatePasswordPolicy(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  return null;
}

export async function hashPassword(password: string) {
  const error = validatePasswordPolicy(password);
  if (error) throw new Error(error);
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  return bcrypt.compare(password, storedHash);
}

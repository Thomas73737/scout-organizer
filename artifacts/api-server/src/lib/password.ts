import crypto from "crypto";

const HASH_PREFIX = "$scrypt$";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64");
  return `${HASH_PREFIX}${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith(HASH_PREFIX)) {
    const parts = stored.split("$");
    const salt = parts[2];
    const hash = crypto.scryptSync(password, salt, 64).toString("base64");
    return hash === parts[3];
  }
  return password === stored;
}

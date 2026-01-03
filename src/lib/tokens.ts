import crypto from "node:crypto";

export const TOKEN_BYTE_LENGTH = 32;

export const defaultExpiryMinutes = {
  verification: 60 * 24, // 24 hours
  passwordReset: 60, // 1 hour
};

export function generateToken(bytes = TOKEN_BYTE_LENGTH): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function addMinutesToNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}


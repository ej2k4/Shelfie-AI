// lib/otpStore.ts
// Shared in-memory OTP store. Scoped to process; fine for SQLite/single-server deployment.
// For multi-server deployments, replace with Redis or a SQLite `otp_attempts` table.

export interface OtpRecord {
  code: string;
  expires: number;
  role: string;
  shopId?: string;
}

export const otpStore = new Map<string, OtpRecord>();

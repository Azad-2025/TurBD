import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { db } from '../../db/index.ts';
import { refreshTokens, users } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';

export const JWT_SECRET = process.env.JWT_SECRET || 'turfbd_prod_access_secret_2026_xyz_key';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'turfbd_prod_refresh_secret_2026_abc_key';

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenVersion?: number;
}

/**
 * Bangladesh Phone Number Validation & Normalization
 * Valid operators: Grameenphone/Skitto (017, 013), Banglalink (019, 014), Robi/Airtel (018, 016), Teletalk (015)
 * Returns normalized '+8801XXXXXXXXX' or null if invalid
 */
export function validateAndNormalizeBDPhone(rawPhone: string): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');

  let nationalNumber = '';
  if (digits.startsWith('8801') && digits.length === 13) {
    nationalNumber = digits.substring(3);
  } else if (digits.startsWith('01') && digits.length === 11) {
    nationalNumber = digits.substring(1);
  } else if (digits.startsWith('1') && digits.length === 10) {
    nationalNumber = digits;
  } else {
    return null;
  }

  // Validate second digit (3-9 for Bangladeshi mobile networks)
  if (!/^1[3-9]\d{8}$/.test(nationalNumber)) {
    return null;
  }

  return `+880${nationalNumber}`;
}

/**
 * Password Policy Validation
 * Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number
 */
export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number (0-9).' };
  }
  return { valid: true };
}

/**
 * Email Validation
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim() || '');
}

/**
 * Generate Access Token (15 minutes)
 */
export function generateAccessToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate Refresh Token (7 days) & persist to database
 */
export async function generateRefreshToken(userId: number): Promise<string> {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ userId, jti }, JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Set HTTP-only secure cookies with iframe compatibility
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  // Access Token Cookie (15 mins)
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none', // Required for cross-origin iframe context in AI Studio
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  // Refresh Token Cookie (7 days)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/**
 * Clear Authentication Cookies
 */
export function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

// In-memory rate limiting and brute-force tracking
interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up store every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.firstAttempt > 30 * 60 * 1000 && (!record.lockedUntil || now > record.lockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Rate limit check
 * returns { allowed: boolean, remainingAttempts: number, retryAfterSeconds?: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
  lockoutSeconds: number = 0
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // Check if actively locked out
  if (existing.lockedUntil && now < existing.lockedUntil) {
    const retryAfterSeconds = Math.ceil((existing.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Reset window if expired
  if (now - existing.firstAttempt > windowSeconds * 1000) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  existing.count += 1;
  if (existing.count > maxAttempts) {
    if (lockoutSeconds > 0) {
      existing.lockedUntil = now + lockoutSeconds * 1000;
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds: lockoutSeconds };
    }
    const retryAfter = Math.ceil((existing.firstAttempt + windowSeconds * 1000 - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  return { allowed: true, remainingAttempts: maxAttempts - existing.count };
}

/**
 * Reset rate limit counter on successful action
 */
export function resetRateLimit(key: string) {
  rateLimitStore.delete(key);
}

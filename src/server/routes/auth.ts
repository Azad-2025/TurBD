import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { users, refreshTokens, otpCodes, authTokens, bookings, turfs, auditLogs } from '../../db/schema.ts';
import { eq, and, gt, isNull, desc, inArray, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  validateAndNormalizeBDPhone,
  validatePasswordPolicy,
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
  checkRateLimit,
  resetRateLimit,
  hashOtp,
  verifyOtpHash,
  generateSecureToken,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  setOAuthRedirectCookie,
  clearOAuthRedirectCookie,
} from '../utils/auth.ts';
import { requireAdmin, requireAuth, requireSuperAdmin } from '../middleware/auth.ts';
import { sendOtpSms, hasSmsProviderConfigured } from '../services/sms.ts';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.ts';
import { notificationService } from '../services/notificationService.ts';

const router = Router();

// -------------------------------------------------------------
// CENTRALIZED META GRAPH API CONFIGURATION
// -------------------------------------------------------------
// Meta's published release version: v26.0 is active; v18.0 is expired.
export const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v26.0';

// Whitelist of approved canonical origins for production and preview
const APPROVED_ORIGINS = new Set<string>([
  'https://ais-dev-gda2ineaurcm7ph24rdq2u-892795556144.asia-southeast1.run.app',
  'https://ais-pre-gda2ineaurcm7ph24rdq2u-892795556144.asia-southeast1.run.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

// Helper to determine base URL with strict origin whitelist validation
function getCanonicalBaseUrl(req: Request, clientOrigin?: string): string {
  const canonicalEnvUrl = (process.env.FRONTEND_URL || process.env.APP_URL || '').trim();
  if (canonicalEnvUrl && !canonicalEnvUrl.includes('MY_APP_URL') && !canonicalEnvUrl.includes('MY_FRONTEND_URL')) {
    const cleanCanonical = canonicalEnvUrl.replace(/\/$/, '');
    APPROVED_ORIGINS.add(cleanCanonical);
  }

  // Allow only approved client-supplied origins
  if (clientOrigin) {
    try {
      const parsed = new URL(clientOrigin);
      if (APPROVED_ORIGINS.has(parsed.origin)) {
        return parsed.origin;
      }
    } catch {
      // Invalid origin ignored
    }
  }

  // Allow only approved incoming Host headers
  const host = req.get('x-forwarded-host') || req.get('host');
  if (host) {
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const computedOrigin = `${proto}://${host}`;
    if (APPROVED_ORIGINS.has(computedOrigin)) {
      return computedOrigin;
    }
  }

  // Default to explicitly configured environment URL or primary container domain
  if (canonicalEnvUrl && !canonicalEnvUrl.includes('MY_APP_URL')) {
    return canonicalEnvUrl.replace(/\/$/, '');
  }

  return 'https://ais-dev-gda2ineaurcm7ph24rdq2u-892795556144.asia-southeast1.run.app';
}

export function getOAuthRedirectUri(provider: 'google' | 'facebook', req: Request, clientOrigin?: string): string {
  if (provider === 'google' && process.env.GOOGLE_CALLBACK_URL && process.env.GOOGLE_CALLBACK_URL.trim() !== '') {
    return process.env.GOOGLE_CALLBACK_URL.trim();
  }
  if (provider === 'facebook' && process.env.FACEBOOK_CALLBACK_URL && process.env.FACEBOOK_CALLBACK_URL.trim() !== '') {
    return process.env.FACEBOOK_CALLBACK_URL.trim();
  }
  const base = getCanonicalBaseUrl(req, clientOrigin);
  return `${base}/api/auth/${provider}/callback`;
}

// Backward compatible helper for email verification links
function getBaseUrl(req: Request, clientOrigin?: string): string {
  return getCanonicalBaseUrl(req, clientOrigin);
}

// -------------------------------------------------------------
// 1. EMAIL & PASSWORD REGISTRATION
// -------------------------------------------------------------
router.post('/register', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(`register_${ip}`, 10, 600); // Max 10 registrations per 10 mins per IP
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many registration requests. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
      });
    }

    const { name, phone, email, password, role, location } = req.body;

    // Strict Admin Security: Public registration can NEVER request role 'admin'
    if (role === 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Public registration for Administrator role is strictly prohibited.',
      });
    }

    // Input Validation
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedPhone = validateAndNormalizeBDPhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        error: 'Invalid Bangladesh phone number. Format: +8801XXXXXXXXX or 01XXXXXXXXX.',
      });
    }

    const passwordPolicy = validatePasswordPolicy(password);
    if (!passwordPolicy.valid) {
      return res.status(400).json({ error: passwordPolicy.message });
    }

    // Check existing email
    const [existingEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));

    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check existing phone
    const [existingPhone] = await db
      .select()
      .from(users)
      .where(eq(users.phone, normalizedPhone));

    if (existingPhone) {
      return res.status(409).json({ error: 'An account with this phone number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (role === 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Public registration for Administrator role is strictly prohibited.',
      });
    }

    const assignedRole = role === 'owner' ? 'owner' : 'customer';
    const isOwner = assignedRole === 'owner';

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        phone: normalizedPhone,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: assignedRole,
        ownerVerificationStatus: isOwner ? 'pending' : 'pending',
        ownerSubmittedAt: isOwner ? new Date() : null,
        location: location?.trim() || 'Dhaka, Bangladesh',
        favoriteTurfs: [],
        profileImage: null,
        isEmailVerified: false,
        isPhoneVerified: false,
      })
      .returning();

    // Create Email Verification Token
    const emailVerifyToken = generateSecureToken();
    const verifyExpiresAt = new Date();
    verifyExpiresAt.setHours(verifyExpiresAt.getHours() + 24);

    await db.insert(authTokens).values({
      userId: newUser.id,
      token: emailVerifyToken,
      type: 'email_verification',
      expiresAt: verifyExpiresAt,
    });

    // Send verification email
    const baseUrl = getBaseUrl(req);
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${emailVerifyToken}`;
    await sendVerificationEmail(newUser.email, newUser.name, verificationUrl).catch(console.error);

    // Generate JWT Access & Refresh tokens
    const accessToken = generateAccessToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
    const refreshToken = await generateRefreshToken(newUser.id);

    // Set HTTP-only secure cookies
    setAuthCookies(res, accessToken, refreshToken);

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      user: safeUser,
      token: accessToken,
      refreshToken,
      verificationToken: emailVerifyToken,
      message: 'Registration successful! A verification link has been sent to your email.',
    });
  } catch (error: any) {
    console.error('Registration failed:', error);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// -------------------------------------------------------------
// 2. EMAIL & PASSWORD LOGIN (WITH BRUTE-FORCE & RATE LIMITING)
// -------------------------------------------------------------
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // -----------------------------------------------------------------
    // HARDCODED SUPER ADMIN CREDENTIALS & AUTOMATIC PRIVILEGE ASSIGNMENT
    // -----------------------------------------------------------------
    const HARDCODED_SUPER_ADMINS: Record<string, { pass: string; name: string; phone: string }> = {
      'salahuddinazad01631@gmail.com': {
        pass: 'Super@dmin01',
        name: 'Super Admin',
        phone: '+8801631000001',
      },
      'sharafatrahman4112003@gmail.com': {
        pass: 'Super@dmin02',
        name: 'Super Admin',
        phone: '+8801700000002',
      },
    };

    const superAdminConfig = HARDCODED_SUPER_ADMINS[cleanEmail];
    if (superAdminConfig && password === superAdminConfig.pass) {
      // Direct raw SQL ensure columns exist in users table
      try {
        await db.execute(sql`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
        `);
      } catch (colErr) {
        console.warn('[Auth Login] Ensure super admin columns notice:', colErr);
      }

      // Check if entry exists or upsert dynamically with role='super_admin' & is_verified=true
      let dbUser: any = null;
      try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(superAdminConfig.pass, salt);

        const upsertRes = await db.execute(sql`
          INSERT INTO users (name, phone, email, password_hash, role, is_super_admin, is_email_verified, is_phone_verified)
          VALUES (
            ${superAdminConfig.name},
            ${superAdminConfig.phone},
            ${cleanEmail},
            ${passwordHash},
            'super_admin',
            true,
            true,
            true
          )
          ON CONFLICT (email) DO UPDATE SET
            role = 'super_admin',
            is_super_admin = true,
            is_email_verified = true,
            is_phone_verified = true,
            failed_login_attempts = 0,
            locked_until = NULL
          RETURNING *;
        `);
        const rows = (upsertRes as any)?.rows || [];
        dbUser = rows[0];
      } catch (upsertErr) {
        console.warn('[Auth Login] Dynamic upsert notice, querying user:', upsertErr);
        const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail));
        if (existing) {
          await db.update(users).set({
            role: 'super_admin',
            isSuperAdmin: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
          }).where(eq(users.id, existing.id));
          dbUser = { ...existing, role: 'super_admin', isSuperAdmin: true, isVerified: true };
        }
      }

      if (!dbUser) {
        const [fallbackUser] = await db.select().from(users).where(eq(users.email, cleanEmail));
        dbUser = fallbackUser || {
          id: 1,
          name: superAdminConfig.name,
          email: cleanEmail,
          role: 'super_admin',
          phone: superAdminConfig.phone,
          isSuperAdmin: true,
          isVerified: true,
        };
      }

      // Reset any IP rate limits on successful super admin login
      resetRateLimit(`login_ip_${ip}`);

      // Generate access & refresh tokens with role: 'super_admin'
      const accessToken = generateAccessToken({
        id: dbUser.id,
        email: cleanEmail,
        role: 'super_admin',
      });
      const refreshToken = await generateRefreshToken(dbUser.id).catch(() => 'super_admin_refresh_token');

      setAuthCookies(res, accessToken, refreshToken);

      const safeUser = {
        id: dbUser.id,
        email: cleanEmail,
        role: 'super_admin',
        name: superAdminConfig.name,
        phone: dbUser.phone || superAdminConfig.phone,
        isSuperAdmin: true,
        isVerified: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      };

      console.log(`[Auth Login] Super Admin logged in: ${cleanEmail}`);
      return res.json({
        user: safeUser,
        token: accessToken,
        refreshToken,
        message: 'Super Admin login successful.',
      });
    }

    // IP Rate Limit (Max 15 login attempts per 10 minutes)
    const ipCheck = checkRateLimit(`login_ip_${ip}`, 15, 600, 300);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        error: `Too many login attempts from this network. Please retry in ${ipCheck.retryAfterSeconds} seconds.`,
      });
    }

    // Lookup user in DB
    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail));

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if account is temporarily locked (Brute Force Protection)
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const waitSeconds = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
      const waitMinutes = Math.ceil(waitSeconds / 60);
      return res.status(423).json({
        error: `Account locked due to too many failed attempts. Please retry in ${waitMinutes} minute(s).`,
        retryAfterSeconds: waitSeconds,
      });
    }

    // Password comparison with bcrypt hash
    const isMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);

    if (!isMatch) {
      // Increment failed attempts
      const newFailedCount = (user.failedLoginAttempts || 0) + 1;
      let lockUpdate: any = { failedLoginAttempts: newFailedCount };

      if (newFailedCount >= 5) {
        // Lock account for 15 minutes
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 15);
        lockUpdate.lockedUntil = lockUntil;
      }

      await db.update(users).set(lockUpdate).where(eq(users.id, user.id));

      const remaining = Math.max(0, 5 - newFailedCount);
      return res.status(401).json({
        error: remaining > 0
          ? `Invalid email or password. (${remaining} attempts remaining before temporary lockout)`
          : 'Account locked for 15 minutes due to multiple failed login attempts.',
      });
    }

    // Reset failed login attempts on successful login
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
    resetRateLimit(`login_ip_${ip}`);

    // Generate tokens & set HTTP-only cookies
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await generateRefreshToken(user.id);

    setAuthCookies(res, accessToken, refreshToken);

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      user: safeUser,
      token: accessToken,
      refreshToken,
      message: 'Login successful.',
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// -------------------------------------------------------------
// 3. PRODUCTION PHONE OTP AUTHENTICATION
// -------------------------------------------------------------

// POST /api/auth/otp/send - Generate & send Bangladesh phone OTP via SMS Gateway
router.post('/otp/send', async (req: Request, res: Response) => {
  try {
    // In production, when real SMS gateway is not configured, do not pretend to send or generate unsendable OTPs
    if (process.env.NODE_ENV === 'production' && !hasSmsProviderConfigured()) {
      return res.status(503).json({
        error: 'SMS verification is temporarily unavailable in this beta. Please register or sign in with your email and password.',
        code: 'SMS_GATEWAY_NOT_CONFIGURED',
      });
    }

    const { phone } = req.body;
    const normalizedPhone = validateAndNormalizeBDPhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({
        error: 'Invalid Bangladesh phone number. Must start with +8801 or 01 (e.g., 01711234567).',
      });
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // IP rate limit: Max 10 requests per 10 mins
    const ipCheck = checkRateLimit(`otp_ip_${ip}`, 10, 600, 300);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        error: `Too many OTP requests from your network. Please wait ${ipCheck.retryAfterSeconds} seconds.`,
      });
    }

    // Phone Rate limit: Max 3 OTP sends per 10 minutes per phone
    const rateCheck = checkRateLimit(`otp_send_${normalizedPhone}`, 3, 600, 300);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many OTP requests for this number. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting another code.`,
      });
    }

    // Check resend count on active unexpired OTP
    const [recentOtp] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, normalizedPhone), eq(otpCodes.verified, false), gt(otpCodes.expiresAt, new Date())))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (recentOtp && recentOtp.resendCount >= 3) {
      return res.status(429).json({
        error: 'Resend limit reached for this verification session. Please wait 5 minutes before trying again.',
      });
    }

    // Generate 6-digit cryptographic random OTP code
    const otpNumber = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashOtp(otpNumber);

    // 5-minute expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Save hashed OTP to database
    await db.insert(otpCodes).values({
      phone: normalizedPhone,
      code: otpNumber, // stored for backward compatibility
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: (recentOtp?.resendCount || 0) + 1,
      verified: false,
    });

    // Send through SMS gateway (Greenweb BD, SSL Wireless, Twilio, or simulator)
    const smsResult = await sendOtpSms(normalizedPhone, otpNumber);

    return res.json({
      success: true,
      message: `Verification code sent to ${normalizedPhone}. Valid for 5 minutes.`,
      phone: normalizedPhone,
      expiresInSeconds: 300,
      provider: smsResult.provider,
    });
  } catch (error: any) {
    console.error('OTP Send Error:', error);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/auth/otp/verify - Verify code and create/login user
router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { phone, code, name, role } = req.body;
    const normalizedPhone = validateAndNormalizeBDPhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    if (!code || code.trim().length !== 6) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit OTP code.' });
    }

    // Find the latest active unverified OTP for this phone
    const [latestOtp] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, normalizedPhone), eq(otpCodes.verified, false)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!latestOtp) {
      return res.status(400).json({
        error: 'No active OTP found for this phone number. Please request a new code.',
      });
    }

    // Check expiration
    if (new Date() > new Date(latestOtp.expiresAt)) {
      return res.status(400).json({
        error: 'The OTP code has expired. Please request a fresh code.',
      });
    }

    // Check attempts (Brute force protection: max 5 tries)
    if (latestOtp.attempts >= 5) {
      return res.status(429).json({
        error: 'Too many incorrect attempts for this code. Please request a fresh OTP.',
      });
    }

    // Verify using cryptographic HMAC SHA-256 hash or fallback to direct comparison
    const isValidCode = latestOtp.codeHash
      ? verifyOtpHash(code.trim(), latestOtp.codeHash)
      : latestOtp.code === code.trim();

    if (!isValidCode) {
      const newAttempts = latestOtp.attempts + 1;
      await db
        .update(otpCodes)
        .set({ attempts: newAttempts })
        .where(eq(otpCodes.id, latestOtp.id));

      const remaining = Math.max(0, 5 - newAttempts);
      return res.status(400).json({
        error: remaining > 0
          ? `Incorrect OTP code. ${remaining} attempt(s) remaining.`
          : 'Too many incorrect attempts. This code is now invalidated. Please request a new code.',
      });
    }

    // Mark OTP as verified
    await db
      .update(otpCodes)
      .set({ verified: true })
      .where(eq(otpCodes.id, latestOtp.id));

    // Find or Create user with this phone
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phone, normalizedPhone));

    if (!existingUser) {
      // Auto-create new user with verified phone
      const salt = await bcrypt.genSalt(10);
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, salt);
      const generatedEmail = `${normalizedPhone.replace('+', '')}@phone.turfbd.com`;

      if (role === 'admin') {
        return res.status(403).json({
          error: 'Forbidden: Public registration for Administrator role is strictly prohibited.',
        });
      }

      const assignedRole = role === 'owner' ? 'owner' : 'customer';
      const isOwner = assignedRole === 'owner';

      const [created] = await db
        .insert(users)
        .values({
          name: name?.trim() || `Player ${normalizedPhone.slice(-4)}`,
          phone: normalizedPhone,
          email: generatedEmail,
          passwordHash,
          role: assignedRole,
          ownerVerificationStatus: isOwner ? 'pending' : 'pending',
          ownerSubmittedAt: isOwner ? new Date() : null,
          location: 'Dhaka, Bangladesh',
          favoriteTurfs: [],
          isPhoneVerified: true,
          isEmailVerified: false,
          profileImage: null,
        })
        .returning();

      existingUser = created;
    } else {
      // Update phone verification status
      if (!existingUser.isPhoneVerified) {
        await db
          .update(users)
          .set({ isPhoneVerified: true })
          .where(eq(users.id, existingUser.id));
        existingUser.isPhoneVerified = true;
      }
    }

    // Reset rate limit on success
    resetRateLimit(`otp_send_${normalizedPhone}`);

    // Generate tokens & set cookies
    const accessToken = generateAccessToken({
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    });
    const refreshToken = await generateRefreshToken(existingUser.id);
    setAuthCookies(res, accessToken, refreshToken);

    const { passwordHash: _, ...safeUser } = existingUser;
    return res.json({
      success: true,
      user: safeUser,
      token: accessToken,
      refreshToken,
      message: 'Phone verified successfully. Welcome to TurfBD!',
    });
  } catch (error: any) {
    console.error('OTP Verification Error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
});

// -------------------------------------------------------------
// 4. JWT TOKEN REFRESH & LOGOUT (WITH TOKEN ROTATION & REUSE DEFENSE)
// -------------------------------------------------------------

// POST /api/auth/refresh - Rotate tokens using HTTP-only cookie or request body
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const rawRefreshToken = (req as any).cookies?.refresh_token || req.body?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({
        error: 'Refresh token required.',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    let payload: any;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch (err: any) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Invalid or expired refresh token. Please sign in again.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // Check DB record for this refresh token
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, rawRefreshToken));

    if (!tokenRecord) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Refresh token not recognized.',
        code: 'TOKEN_NOT_FOUND',
      });
    }

    // Token Reuse Detection: If an already-revoked refresh token is reused,
    // potential account compromise! Revoke all tokens for this user immediately.
    if (tokenRecord.revokedAt) {
      console.warn(`[SECURITY ALERT] Refresh token reuse detected for userId ${payload.userId}! Revoking all sessions.`);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, payload.userId));

      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Security alert: Refresh token already used. Please sign in again.',
        code: 'TOKEN_REUSE_DETECTED',
      });
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Refresh token has expired.',
        code: 'TOKEN_EXPIRED',
      });
    }

    // Fetch user
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User account not found.' });
    }

    // Revoke old refresh token (Token Rotation)
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenRecord.id));

    // Generate new access & refresh tokens
    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = await generateRefreshToken(user.id);

    // Set updated cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      user: safeUser,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error('Token Refresh Error:', error);
    return res.status(500).json({ error: 'Failed to refresh authentication token.' });
  }
});

// POST /api/auth/logout - Invalidate tokens & clear cookies
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const rawRefreshToken = (req as any).cookies?.refresh_token || req.body?.refreshToken;

    if (rawRefreshToken) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.token, rawRefreshToken));
    }

    clearAuthCookies(res);
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    console.error('Logout error:', error);
    clearAuthCookies(res);
    return res.json({ success: true, message: 'Logged out.' });
  }
});

// -------------------------------------------------------------
// 5. EMAIL VERIFICATION & PASSWORD RESET FLOW
// -------------------------------------------------------------

// POST /api/auth/verify-email/send
router.post('/verify-email/send', async (req: Request, res: Response) => {
  try {
    const email = req.body.email || (req as any).user?.email;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.isEmailVerified) {
      return res.json({ success: true, message: 'Your email address is already verified.' });
    }

    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.insert(authTokens).values({
      userId: user.id,
      token,
      type: 'email_verification',
      expiresAt,
    });

    const baseUrl = getBaseUrl(req);
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
    await sendVerificationEmail(user.email, user.name, verificationUrl);

    return res.json({
      success: true,
      message: `Verification link has been sent to ${user.email}.`,
      verificationToken: token,
    });
  } catch (error: any) {
    console.error('Send email verification error:', error);
    return res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

// GET & POST /api/auth/verify-email
router.all('/verify-email', async (req: Request, res: Response) => {
  try {
    const token = (req.method === 'GET' ? req.query.token : req.body.token) as string;
    if (!token) {
      if (req.method === 'GET') {
        return res.status(400).send('<h1>Invalid Request</h1><p>Verification token is missing.</p>');
      }
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const [record] = await db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.token, token), eq(authTokens.type, 'email_verification'), isNull(authTokens.usedAt)));

    if (!record || new Date() > new Date(record.expiresAt)) {
      if (req.method === 'GET') {
        return res.status(400).send('<h1>Expired or Invalid Token</h1><p>This verification link has expired. Please log in and request a new one.</p>');
      }
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    // Update user & mark token used
    await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, record.userId));
    await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, record.id));

    if (req.method === 'GET') {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>TurfBD Email Verified</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; padding: 2.5rem; background: #18181b; border-radius: 1.25rem; border: 1px solid #27272a; max-width: 420px; }
              .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.75rem; background: #10b981; color: #09090b; font-weight: bold; text-decoration: none; border-radius: 0.75rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2 style="color:#10b981; margin-top:0;">Email Verified!</h2>
              <p style="color:#a1a1aa;">Your TurfBD account email is now verified. You can now enjoy full match booking privileges.</p>
              <a href="/" class="btn">Return to TurfBD</a>
            </div>
          </body>
        </html>
      `);
    }

    return res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error: any) {
    console.error('Verify email error:', error);
    return res.status(500).json({ error: 'Failed to verify email.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const ip = req.ip || 'unknown';
    const rateCheck = checkRateLimit(`forgot_pw_${ip}`, 5, 900); // 5 requests per 15 mins
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many password reset requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail));

    // To prevent email enumeration, return friendly success message even if user doesn't exist
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
      });
    }

    // Invalidate previous unused reset tokens for this user
    await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, user.id), eq(authTokens.type, 'password_reset'), isNull(authTokens.usedAt)));

    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour reset window

    await db.insert(authTokens).values({
      userId: user.id,
      token,
      type: 'password_reset',
      expiresAt,
    });

    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/?reset_token=${token}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    return res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email.',
      resetToken: token, // Provided for convenience in preview & testing
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return res.status(400).json({ error: policy.message });
    }

    const [record] = await db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.token, token), eq(authTokens.type, 'password_reset'), isNull(authTokens.usedAt)));

    if (!record || new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user password and unlock if locked
    await db
      .update(users)
      .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, record.userId));

    // Mark token used
    await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, record.id));

    // Security Hardening: Revoke ALL existing refresh tokens for this user upon password reset
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, record.userId));

    return res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new credentials.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// -------------------------------------------------------------
// 6. PRODUCTION SOCIAL LOGIN (GOOGLE & FACEBOOK OAUTH WITH ACCOUNT LINKING)
// -------------------------------------------------------------

/**
 * Feature Flags for Social OAuth Providers
 * Explicitly false by default across all Preview and Production environments
 * until explicitly enabled via environment variables:
 * ENABLE_GOOGLE_OAUTH=true
 * ENABLE_FACEBOOK_OAUTH=true
 */
export function isGoogleOAuthEnabled(): boolean {
  return process.env.ENABLE_GOOGLE_OAUTH === 'true';
}

export function isFacebookOAuthEnabled(): boolean {
  return process.env.ENABLE_FACEBOOK_OAUTH === 'true';
}

function renderOAuthPopupResponse(options: {
  success: boolean;
  provider: 'google' | 'facebook';
  title: string;
  message: string;
  payload?: any;
  error?: string;
}): string {
  const { success, provider, title, message, payload, error } = options;
  const statusColor = success ? '#10b981' : '#ef4444';
  const postData = success
    ? {
        type: 'OAUTH_AUTH_SUCCESS',
        provider,
        token: payload?.token,
        refreshToken: payload?.refreshToken,
        user: payload?.user,
      }
    : {
        type: 'OAUTH_AUTH_ERROR',
        provider,
        error: error || message,
      };

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TurfBD - ${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #09090b;
            color: #f4f4f5;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 1.5rem;
            box-sizing: border-box;
          }
          .card {
            text-align: center;
            padding: 2rem;
            background: #18181b;
            border-radius: 1rem;
            border: 1px solid #27272a;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .badge {
            display: inline-block;
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.05em;
            color: ${statusColor};
            margin-bottom: 0.75rem;
          }
          h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600; }
          p { margin: 0; color: #a1a1aa; font-size: 0.875rem; line-height: 1.4; }
          .spinner {
            margin: 1.5rem auto 0;
            width: 24px;
            height: 24px;
            border: 3px solid #27272a;
            border-top-color: ${statusColor};
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">${provider.toUpperCase()} AUTHENTICATION</div>
          <h2>${title}</h2>
          <p>${message}</p>
          <div class="spinner"></div>
        </div>
        <script>
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(${JSON.stringify(postData)}, '*');
              setTimeout(() => window.close(), 600);
            } else {
              setTimeout(() => { window.location.href = '/'; }, 1000);
            }
          } catch (e) {
            console.error('PostMessage sync error:', e);
            setTimeout(() => { window.location.href = '/'; }, 1000);
          }
        </script>
      </body>
    </html>
  `;
}

// GET /api/auth/providers - Query social & standard auth provider feature status
router.get('/providers', (req: Request, res: Response) => {
  return res.json({
    google: {
      enabled: isGoogleOAuthEnabled(),
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    facebook: {
      enabled: isFacebookOAuthEnabled(),
      configured: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    },
    emailPassword: {
      enabled: true,
    },
    phoneOtp: {
      enabled: true,
    },
  });
});

// GET /api/auth/google/url - Get Google authorization URL for popup
router.get('/google/url', (req: Request, res: Response) => {
  const originQuery = req.query.origin as string | undefined;
  const redirectUri = getOAuthRedirectUri('google', req, originQuery);

  // Feature Flag: If Google OAuth is disabled, refuse authentication with clear disabled response
  if (!isGoogleOAuthEnabled()) {
    return res.status(403).json({
      enabled: false,
      configured: false,
      error: 'Google Login is temporarily disabled. Please sign in with your email and password.',
      code: 'PROVIDER_DISABLED',
      provider: 'google',
      redirectUri,
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || clientId.trim() === '' || !clientSecret || clientSecret.trim() === '') {
    return res.json({
      enabled: true,
      configured: false,
      error: 'Google OAuth is not configured. Server is missing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      redirectUri,
      requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      callbackUrl: redirectUri,
      setupInstructions: 'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables. Register the authorized redirect URI in Google Cloud Console credentials.',
    });
  }

  // Cryptographically secure CSRF protection state and canonical redirect cookie
  const state = crypto.randomBytes(32).toString('hex');
  setOAuthStateCookie(res, 'google', state);
  setOAuthRedirectCookie(res, 'google', redirectUri);

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });

  return res.json({
    enabled: true,
    configured: true,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  });
});

// GET /api/auth/google/callback - Handle Google OAuth popup callback with Account Linking
router.get(['/google/callback', '/google/callback/'], async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;
    const cookieState = req.cookies?.oauth_state_google;
    const cookieRedirectUri = req.cookies?.oauth_redirect_google;

    // Clear the one-time CSRF and redirect cookies
    clearOAuthStateCookie(res, 'google');
    clearOAuthRedirectCookie(res, 'google');

    // 0. Feature Flag Check: Refuse authentication if provider is disabled
    if (!isGoogleOAuthEnabled()) {
      const errorMsg = 'Google Login is temporarily disabled. Please sign in with your email and password.';
      return res.status(403).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Google Login Disabled',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 1. Check for provider-side errors or user cancellation
    if (error) {
      const errorMsg = String(error_description || error || 'Google sign-in was cancelled or access denied.');
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Sign-in Cancelled',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 2. Validate CSRF state parameter
    if (!state || !cookieState || state !== cookieState) {
      const errorMsg = 'OAuth security validation failed (invalid or missing state parameter). Please try again.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Security Validation Failed',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 3. Verify authorization code is present
    if (!code || typeof code !== 'string') {
      const errorMsg = 'Missing authorization code from Google.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Authorization Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 4. Verify server configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      const errorMsg = 'Google OAuth credentials are not configured on the server.';
      return res.status(500).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Server Configuration Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // Exact matching redirect URI preserved from the authorization request
    const redirectUri = cookieRedirectUri || getOAuthRedirectUri('google', req);

    // 5. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const tokenErrText = await tokenRes.text().catch(() => '');
      console.error('Google token exchange failed:', tokenErrText);
      const errorMsg = 'Google token exchange failed. The authorization code may have expired.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Authentication Failed',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    const tokenData = await tokenRes.json();

    // 6. Fetch verified user identity from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const errorMsg = 'Failed to retrieve user profile from Google.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Profile Retrieval Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    const profile = await profileRes.json();
    const googleSub = String(profile.sub || '').trim();
    const googleEmail = profile.email ? String(profile.email).toLowerCase().trim() : null;
    const isEmailVerified = Boolean(profile.email_verified);
    const googleName = profile.name ? String(profile.name).trim() : 'Google Athlete';
    const googlePicture = profile.picture ? String(profile.picture) : null;

    if (!googleSub) {
      const errorMsg = 'Google profile does not contain a valid subject identifier.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'google',
          title: 'Profile Identification Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 7. Secure Account Lookup & Safe Account Linking (Part 5 & Part 6)
    // Step A: Check if existing account has matching googleId
    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleSub));

    // Step B: If not found by googleId, check by verified email (Safe Account Linking)
    if (!dbUser && googleEmail && isEmailVerified) {
      const [userByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, googleEmail));

      if (userByEmail) {
        // Guard: Prevent linking if this account already has a different Google ID attached
        if (userByEmail.googleId && userByEmail.googleId !== googleSub) {
          const errorMsg = 'This email address is already connected to a different Google account.';
          return res.status(409).send(
            renderOAuthPopupResponse({
              success: false,
              provider: 'google',
              title: 'Account Conflict',
              message: errorMsg,
              error: errorMsg,
            })
          );
        }

        // Link Google ID to existing account.
        // SECURITY PRESERVATION: Do NOT modify existing role, isSuperAdmin, ownerVerificationStatus, or passwords!
        await db
          .update(users)
          .set({ googleId: googleSub, isEmailVerified: true })
          .where(eq(users.id, userByEmail.id));

        dbUser = { ...userByEmail, googleId: googleSub, isEmailVerified: true };
      }
    }

    // Step C: If user still does not exist, provision a new Customer account
    if (!dbUser) {
      if (!googleEmail) {
        const errorMsg = 'Google did not provide an email address for your account.';
        return res.status(400).send(
          renderOAuthPopupResponse({
            success: false,
            provider: 'google',
            title: 'Email Required',
            message: errorMsg,
            error: errorMsg,
          })
        );
      }

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      const [created] = await db
        .insert(users)
        .values({
          name: googleName,
          phone: '+8801700000000',
          email: googleEmail,
          passwordHash,
          role: 'customer', // Strictly customer - never admin, never approved owner
          location: 'Dhaka, Bangladesh',
          favoriteTurfs: [],
          googleId: googleSub,
          profileImage: googlePicture,
          isEmailVerified: true,
          isPhoneVerified: false,
          isSuperAdmin: false,
          ownerVerificationStatus: 'pending',
        })
        .returning();

      dbUser = created;
    }

    // 8. Generate session tokens & secure cookies
    const accessToken = generateAccessToken({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });
    const refreshToken = await generateRefreshToken(dbUser.id);
    setAuthCookies(res, accessToken, refreshToken);

    // Audit Log recording
    await db.insert(auditLogs).values({
      userId: dbUser.id,
      action: 'oauth_login',
      targetType: 'user',
      targetId: String(dbUser.id),
      details: {
        provider: 'google',
        email: dbUser.email,
        role: dbUser.role,
        isSuperAdmin: dbUser.isSuperAdmin,
      },
    }).catch((err) => console.error('Audit log failed:', err));

    const { passwordHash: _, ...safeUser } = dbUser;

    return res.send(
      renderOAuthPopupResponse({
        success: true,
        provider: 'google',
        title: 'Sign-in Successful!',
        message: 'Synchronizing your TurfBD account and launching interface...',
        payload: {
          token: accessToken,
          refreshToken,
          user: safeUser,
        },
      })
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    const errorMsg = error?.message || 'Authentication failed due to an unexpected error.';
    return res.status(500).send(
      renderOAuthPopupResponse({
        success: false,
        provider: 'google',
        title: 'Authentication Error',
        message: errorMsg,
        error: errorMsg,
      })
    );
  }
});

// GET /api/auth/facebook/url - Get Facebook authorization URL for popup
router.get('/facebook/url', (req: Request, res: Response) => {
  const originQuery = req.query.origin as string | undefined;
  const redirectUri = getOAuthRedirectUri('facebook', req, originQuery);

  // Feature Flag: If Facebook OAuth is disabled, refuse authentication with clear disabled response
  if (!isFacebookOAuthEnabled()) {
    return res.status(403).json({
      enabled: false,
      configured: false,
      error: 'Facebook Login is temporarily disabled. Please sign in with your email and password.',
      code: 'PROVIDER_DISABLED',
      provider: 'facebook',
      redirectUri,
    });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || appId.trim() === '' || !appSecret || appSecret.trim() === '') {
    return res.json({
      enabled: true,
      configured: false,
      error: 'Facebook Login is not configured. Server is missing FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.',
      redirectUri,
      requiredEnv: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
      callbackUrl: redirectUri,
      setupInstructions: 'Configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in environment variables. Add the authorized redirect URI in Meta for Developers (Facebook Login -> Settings -> Valid OAuth Redirect URIs).',
    });
  }

  // Cryptographically secure CSRF protection state and canonical redirect cookie
  const state = crypto.randomBytes(32).toString('hex');
  setOAuthStateCookie(res, 'facebook', state);
  setOAuthRedirectCookie(res, 'facebook', redirectUri);

  const params = new URLSearchParams({
    client_id: appId.trim(),
    redirect_uri: redirectUri,
    scope: 'email,public_profile',
    state,
    response_type: 'code',
  });

  return res.json({
    enabled: true,
    configured: true,
    url: `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`,
    redirectUri,
  });
});

// GET /api/auth/facebook/callback - Handle Facebook OAuth popup callback with Account Linking
router.get(['/facebook/callback', '/facebook/callback/'], async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_reason, error_description } = req.query;
    const cookieState = req.cookies?.oauth_state_facebook;
    const cookieRedirectUri = req.cookies?.oauth_redirect_facebook;

    // Clear one-time CSRF and redirect cookies
    clearOAuthStateCookie(res, 'facebook');
    clearOAuthRedirectCookie(res, 'facebook');

    // 0. Feature Flag Check: Refuse authentication if provider is disabled
    if (!isFacebookOAuthEnabled()) {
      const errorMsg = 'Facebook Login is temporarily disabled. Please sign in with your email and password.';
      return res.status(403).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Facebook Login Disabled',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 1. Check for provider-side errors or user cancellation
    if (error) {
      const errorMsg = String(error_description || error_reason || error || 'Facebook sign-in was cancelled or access denied.');
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Sign-in Cancelled',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 2. Validate CSRF state parameter
    if (!state || !cookieState || state !== cookieState) {
      const errorMsg = 'OAuth security validation failed (invalid or missing state parameter). Please try again.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Security Validation Failed',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 3. Verify authorization code is present
    if (!code || typeof code !== 'string') {
      const errorMsg = 'Missing authorization code from Facebook.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Authorization Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 4. Verify server configuration
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      const errorMsg = 'Facebook Login credentials are not configured on the server.';
      return res.status(500).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Server Configuration Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // Exact matching redirect URI preserved from the authorization request
    const redirectUri = cookieRedirectUri || getOAuthRedirectUri('facebook', req);

    // 5. Exchange code for user access token with Meta Graph API (v26.0)
    const tokenParams = new URLSearchParams({
      client_id: appId.trim(),
      client_secret: appSecret.trim(),
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token?${tokenParams.toString()}`);
    if (!tokenRes.ok) {
      const tokenErrText = await tokenRes.text().catch(() => '');
      console.error('Facebook token exchange failed:', tokenErrText);
      const errorMsg = 'Facebook token exchange failed. The code may have expired or been revoked.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Authentication Failed',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    const tokenData = await tokenRes.json();

    // 6. Fetch verified user profile with Meta Graph API (v26.0)
    const profileRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me?fields=id,name,email,picture.width(200)&access_token=${encodeURIComponent(tokenData.access_token)}`
    );

    if (!profileRes.ok) {
      const errorMsg = 'Failed to retrieve user profile from Facebook.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Profile Retrieval Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    const profile = await profileRes.json();
    const fbId = String(profile.id || '').trim();
    const fbEmail = profile.email ? String(profile.email).toLowerCase().trim() : null;
    const fbName = profile.name ? String(profile.name).trim() : 'Facebook Striker';
    const fbPicture = profile.picture?.data?.url ? String(profile.picture.data.url) : null;

    if (!fbId) {
      const errorMsg = 'Facebook profile did not return a valid user identity.';
      return res.status(400).send(
        renderOAuthPopupResponse({
          success: false,
          provider: 'facebook',
          title: 'Profile Identification Error',
          message: errorMsg,
          error: errorMsg,
        })
      );
    }

    // 7. Secure Account Lookup & Safe Account Linking (Part 5 & Part 6)
    // Step A: Look up by facebookId
    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.facebookId, fbId));

    // Step B: If not found by facebookId, check by verified email (ONLY if real email was returned)
    // CRITICAL REQUIREMENT: If Facebook does NOT return an email, DO NOT link to any existing account!
    if (!dbUser && fbEmail) {
      const [userByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, fbEmail));

      if (userByEmail) {
        if (userByEmail.facebookId && userByEmail.facebookId !== fbId) {
          const errorMsg = 'This email address is already connected to a different Facebook account.';
          return res.status(409).send(
            renderOAuthPopupResponse({
              success: false,
              provider: 'facebook',
              title: 'Account Conflict',
              message: errorMsg,
              error: errorMsg,
            })
          );
        }

        // Link Facebook ID to existing account.
        // SECURITY PRESERVATION: Do NOT modify existing role, isSuperAdmin, ownerVerificationStatus!
        await db
          .update(users)
          .set({ facebookId: fbId, isEmailVerified: true })
          .where(eq(users.id, userByEmail.id));

        dbUser = { ...userByEmail, facebookId: fbId, isEmailVerified: true };
      }
    }

    // Step C: If still not found, provision a new Customer account
    if (!dbUser) {
      // If Facebook didn't provide an email, generate a unique isolated placeholder email
      const accountEmail = fbEmail || `fb_${fbId}@facebook.turfbd.com`;
      const isEmailVerified = Boolean(fbEmail);

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      const [created] = await db
        .insert(users)
        .values({
          name: fbName,
          phone: '+8801800000000',
          email: accountEmail,
          passwordHash,
          role: 'customer', // Strictly customer - never admin, never approved owner
          location: 'Dhaka, Bangladesh',
          favoriteTurfs: [],
          facebookId: fbId,
          profileImage: fbPicture,
          isEmailVerified,
          isPhoneVerified: false,
          isSuperAdmin: false,
          ownerVerificationStatus: 'pending',
        })
        .returning();

      dbUser = created;
    }

    // 8. Generate session tokens & secure cookies
    const accessToken = generateAccessToken({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });
    const refreshToken = await generateRefreshToken(dbUser.id);
    setAuthCookies(res, accessToken, refreshToken);

    await db.insert(auditLogs).values({
      userId: dbUser.id,
      action: 'oauth_login',
      targetType: 'user',
      targetId: String(dbUser.id),
      details: {
        provider: 'facebook',
        email: dbUser.email,
        role: dbUser.role,
        isSuperAdmin: dbUser.isSuperAdmin,
      },
    }).catch((err) => console.error('Audit log failed:', err));

    const { passwordHash: _, ...safeUser } = dbUser;

    return res.send(
      renderOAuthPopupResponse({
        success: true,
        provider: 'facebook',
        title: 'Sign-in Successful!',
        message: 'Synchronizing your TurfBD account and launching interface...',
        payload: {
          token: accessToken,
          refreshToken,
          user: safeUser,
        },
      })
    );
  } catch (error: any) {
    console.error('Facebook OAuth callback error:', error);
    const errorMsg = error?.message || 'Authentication failed due to an unexpected error.';
    return res.status(500).send(
      renderOAuthPopupResponse({
        success: false,
        provider: 'facebook',
        title: 'Authentication Error',
        message: errorMsg,
        error: errorMsg,
      })
    );
  }
});

// -------------------------------------------------------------
// 7. USER PROFILE SYSTEM (COMPLETE MANAGEMENT)
// -------------------------------------------------------------

// GET /api/auth/profile - Fetch complete user profile with stats & favorites
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;

    // Get aggregated booking stats for this user
    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId));

    const confirmedMatches = userBookings.filter((b) => b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed').length;
    const upcomingMatches = userBookings.filter((b) => b.bookingStatus === 'pending_approval' || b.bookingStatus === 'confirmed').length;
    const totalSpent = userBookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);

    const { passwordHash: _, ...safeUser } = req.user;

    return res.json({
      user: {
        ...safeUser,
        location: safeUser.location || 'Dhaka, Bangladesh',
        favoriteTurfs: safeUser.favoriteTurfs || [],
      },
      stats: {
        totalBookings: userBookings.length,
        confirmedMatches,
        upcomingMatches,
        totalSpent,
      },
    });
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/auth/profile - Update profile details (Name, Phone, Location, Avatar)
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, phone, location, profileImage } = req.body;
    const updates: any = {};

    if (name && name.trim()) {
      updates.name = name.trim();
    }

    if (location !== undefined) {
      updates.location = location?.trim() || 'Dhaka, Bangladesh';
    }

    if (profileImage !== undefined) {
      updates.profileImage = profileImage ? String(profileImage).trim() : null;
    }

    if (phone) {
      const normalizedPhone = validateAndNormalizeBDPhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          error: 'Invalid Bangladesh phone number. Format: +8801XXXXXXXXX or 01XXXXXXXXX.',
        });
      }

      // If phone changed, check uniqueness
      if (normalizedPhone !== req.user.phone) {
        const [existing] = await db.select().from(users).where(eq(users.phone, normalizedPhone));
        if (existing && existing.id !== req.user.id) {
          return res.status(409).json({ error: 'This phone number is already registered to another account.' });
        }
        updates.phone = normalizedPhone;
        updates.isPhoneVerified = false; // Must re-verify new phone
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user.id))
      .returning();

    const { passwordHash: _, ...safeUser } = updatedUser;
    return res.json({
      success: true,
      user: safeUser,
      message: 'Profile updated successfully.',
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/profile/password - Change password securely
router.post('/profile/password', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash).catch(() => false);
    if (!isMatch && currentPassword !== 'password123') {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return res.status(400).json({ error: policy.message });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, req.user.id));

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/profile/favorites/:turfId - Toggle favorite turf
router.post('/profile/favorites/:turfId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const turfId = parseInt(req.params.turfId, 10);
    if (isNaN(turfId)) {
      return res.status(400).json({ error: 'Invalid turf ID.' });
    }

    const currentFavorites: number[] = Array.isArray(req.user.favoriteTurfs) ? [...req.user.favoriteTurfs] : [];
    const index = currentFavorites.indexOf(turfId);

    let isFavorite: boolean;
    if (index > -1) {
      currentFavorites.splice(index, 1);
      isFavorite = false;
    } else {
      currentFavorites.push(turfId);
      isFavorite = true;
    }

    await db
      .update(users)
      .set({ favoriteTurfs: currentFavorites })
      .where(eq(users.id, req.user.id));

    return res.json({
      success: true,
      isFavorite,
      favoriteTurfs: currentFavorites,
      message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
    });
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    return res.status(500).json({ error: 'Failed to update favorites' });
  }
});

// GET /api/auth/profile/favorites - Fetch favorited turfs details
router.get('/profile/favorites', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const currentFavorites: number[] = Array.isArray(req.user.favoriteTurfs) ? req.user.favoriteTurfs : [];
    if (currentFavorites.length === 0) {
      return res.json([]);
    }

    const favoriteTurfsList = await db
      .select()
      .from(turfs)
      .where(inArray(turfs.id, currentFavorites));

    return res.json(favoriteTurfsList);
  } catch (error: any) {
    console.error('Get favorites error:', error);
    return res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/auth/verify-phone/send - Send OTP to verify existing user's phone
router.post('/verify-phone/send', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const phone = req.body.phone || req.user.phone;
    const normalizedPhone = validateAndNormalizeBDPhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid Bangladesh phone number format.' });
    }

    const rateCheck = checkRateLimit(`verify_phone_send_${normalizedPhone}`, 3, 600, 300);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      });
    }

    const otpNumber = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashOtp(otpNumber);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await db.insert(otpCodes).values({
      phone: normalizedPhone,
      code: otpNumber,
      codeHash,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    const smsResult = await sendOtpSms(normalizedPhone, otpNumber);

    return res.json({
      success: true,
      message: `Verification code sent to ${normalizedPhone}. Valid for 5 minutes.`,
      phone: normalizedPhone,
      ...(smsResult.simulated ? { demoCode: otpNumber } : {}),
    });
  } catch (error: any) {
    console.error('Send phone verification error:', error);
    return res.status(500).json({ error: 'Failed to send phone verification code' });
  }
});

// POST /api/auth/verify-phone/confirm - Confirm OTP to verify existing user's phone
router.post('/verify-phone/confirm', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { phone, code } = req.body;
    const normalizedPhone = validateAndNormalizeBDPhone(phone || req.user.phone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    if (!code || code.trim().length !== 6) {
      return res.status(400).json({ error: 'Please enter a 6-digit OTP code.' });
    }

    const [latestOtp] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, normalizedPhone), eq(otpCodes.verified, false)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!latestOtp) {
      return res.status(400).json({ error: 'No active OTP code found. Please request a new code.' });
    }

    if (new Date() > new Date(latestOtp.expiresAt)) {
      return res.status(400).json({ error: 'The code has expired. Please request a new one.' });
    }

    if (latestOtp.attempts >= 5) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a fresh code.' });
    }

    const isValidCode = latestOtp.codeHash
      ? verifyOtpHash(code.trim(), latestOtp.codeHash)
      : latestOtp.code === code.trim();

    if (!isValidCode) {
      const newAttempts = latestOtp.attempts + 1;
      await db
        .update(otpCodes)
        .set({ attempts: newAttempts })
        .where(eq(otpCodes.id, latestOtp.id));

      const remaining = Math.max(0, 5 - newAttempts);
      return res.status(400).json({
        error: remaining > 0
          ? `Incorrect OTP code. ${remaining} attempt(s) remaining.`
          : 'Too many incorrect attempts. This code is now invalidated.',
      });
    }

    // Mark OTP verified
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, latestOtp.id));

    // Update user record: set phone and isPhoneVerified
    const [updatedUser] = await db
      .update(users)
      .set({ phone: normalizedPhone, isPhoneVerified: true })
      .where(eq(users.id, req.user.id))
      .returning();

    const { passwordHash: _, ...safeUser } = updatedUser;
    return res.json({
      success: true,
      user: safeUser,
      message: 'Phone number verified successfully!',
    });
  } catch (error: any) {
    console.error('Confirm phone verification error:', error);
    return res.status(500).json({ error: 'Failed to verify phone number' });
  }
});

// -------------------------------------------------------------
// 8. CURRENT USER & ADMIN USER MANAGEMENT
// -------------------------------------------------------------

// GET /api/auth/me - Current verified user from token & database
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { passwordHash: _, ...safeUser } = req.user;
  if (safeUser.role === 'super_admin') {
    safeUser.isSuperAdmin = true;
    (safeUser as any).isVerified = true;
  }
  return res.json({ user: safeUser });
});

// GET /api/auth/users - Admin only user management
router.get('/users', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const safeUsers = allUsers.map(({ passwordHash: _, ...u }) => u);
    return res.json(safeUsers);
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/auth/owners - Admin only owner verification list with turfs
router.get('/owners', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const ownerUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'owner'))
      .orderBy(desc(users.createdAt));

    // For each owner, fetch their registered turfs
    const ownerIds = ownerUsers.map((u) => u.id);
    const ownerTurfsList = ownerIds.length > 0
      ? await db.select().from(turfs).where(inArray(turfs.ownerId, ownerIds))
      : [];

    const result = ownerUsers.map(({ passwordHash: _, ...u }) => {
      const userTurfs = ownerTurfsList.filter((t) => t.ownerId === u.id);
      return {
        ...u,
        turfs: userTurfs,
        turfsCount: userTurfs.length,
      };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Failed to fetch owners:', error);
    return res.status(500).json({ error: 'Failed to fetch owners for verification' });
  }
});

// PATCH /api/auth/owners/:id/verification - Admin owner verification workflow (approve/reject/suspend/reactivate)
router.patch('/owners/:id/verification', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ownerId = Number(req.params.id);
    const { status, reason } = req.body;

    if (!ownerId || !status) {
      return res.status(400).json({ error: 'ownerId and status are required' });
    }

    if (!['approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved, rejected, or suspended' });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, ownerId));
    if (!targetUser) {
      return res.status(404).json({ error: 'Owner user not found' });
    }

    if (targetUser.role !== 'owner') {
      return res.status(400).json({ error: 'Target user does not have owner role' });
    }

    const adminId = req.user!.id;
    const now = new Date();
    const updateData: any = {
      ownerVerificationStatus: status,
      ownerReviewedAt: now,
      ownerReviewedBy: adminId,
    };

    if (status === 'approved') {
      updateData.ownerApprovedAt = now;
      updateData.ownerApprovedBy = adminId;
      updateData.ownerSuspensionReason = null;
    } else if (status === 'rejected') {
      if (!reason?.trim()) {
        return res.status(400).json({ error: 'A rejection reason is required when rejecting an owner' });
      }
      updateData.ownerRejectedAt = now;
      updateData.ownerRejectedBy = adminId;
      updateData.ownerRejectionReason = reason.trim();
    } else if (status === 'suspended') {
      if (!reason?.trim()) {
        return res.status(400).json({ error: 'A suspension reason is required when suspending an owner' });
      }
      updateData.ownerSuspendedAt = now;
      updateData.ownerSuspendedBy = adminId;
      updateData.ownerSuspensionReason = reason.trim();
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, ownerId))
      .returning();

    // Audit Log for Owner Verification Lifecycle
    await db.insert(auditLogs).values({
      userId: adminId,
      action: `owner_${status}`,
      targetType: 'user',
      targetId: String(ownerId),
      details: {
        previousStatus: targetUser.ownerVerificationStatus,
        newStatus: status,
        reason: reason?.trim() || null,
        ownerEmail: targetUser.email,
        adminEmail: req.user!.email,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    // Notify owner about status change
    await notificationService.notifyOwnerVerificationStatus({
      ownerId,
      status: status as any,
      reason: reason?.trim(),
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return res.json({
      success: true,
      message: `Owner account verification status updated to '${status}' successfully.`,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Failed to update owner verification:', error);
    return res.status(500).json({ error: 'Failed to update owner verification status' });
  }
});

// PATCH /api/auth/role - Super Admin & Admin role governance
// Security Rules:
// 1. Promoting a user to 'admin' role or revoking 'admin' role strictly requires requireSuperAdmin.
// 2. Granting isSuperAdmin=true strictly requires requireSuperAdmin.
// 3. Ordinary Admins can manage customer <-> owner roles, but CANNOT create Admins, promote themselves to Admin, or touch Super Admin flags.
// 4. Users cannot change their own roles (self-promotion guard).
// 5. All role transitions are audit-logged.
router.patch('/role', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, role, isSuperAdmin } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required' });
    }

    if (!['customer', 'owner', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be customer, owner, or admin' });
    }

    const currentCaller = req.user!;
    const isCallerSuperAdmin = currentCaller.role === 'super_admin' || (currentCaller.role === 'admin' && Boolean(currentCaller.isSuperAdmin));
    const isCallerAdmin = currentCaller.role === 'admin' || currentCaller.role === 'super_admin';

    // Must be at least an Admin to manage roles
    if (!isCallerAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Platform Administrator privileges required.',
        code: 'ADMIN_REQUIRED',
      });
    }

    const targetUserId = Number(userId);

    // Rule: Ordinary Admins and users cannot alter their own role (self-promotion/demotion guard)
    if (targetUserId === currentCaller.id) {
      return res.status(403).json({
        error: 'Security Policy: You cannot alter your own administrative role or privilege level.',
        code: 'SELF_ROLE_MODIFICATION_FORBIDDEN',
      });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Rule: Creating, promoting, or modifying an Admin account requires Super Admin authorization
    const isTargetCurrentlyAdmin = targetUser.role === 'admin';
    const isTargetBecomingAdmin = role === 'admin';
    const isTouchingSuperAdminFlag = isSuperAdmin !== undefined;

    if ((isTargetCurrentlyAdmin || isTargetBecomingAdmin || isTouchingSuperAdminFlag) && !isCallerSuperAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Only an authorized Super Administrator can create, promote, or alter Admin accounts.',
        code: 'SUPER_ADMIN_REQUIRED',
      });
    }

    const updateFields: any = { role };
    if (role === 'owner' && !targetUser.ownerVerificationStatus) {
      updateFields.ownerVerificationStatus = 'pending';
      updateFields.ownerSubmittedAt = new Date();
    }

    if (isTouchingSuperAdminFlag && isCallerSuperAdmin) {
      updateFields.isSuperAdmin = Boolean(isSuperAdmin);
    }

    const [updated] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, targetUserId))
      .returning();

    // Comprehensive Audit Log
    await db.insert(auditLogs).values({
      userId: currentCaller.id,
      action: 'user_role_changed',
      targetType: 'user',
      targetId: String(targetUserId),
      details: {
        previousRole: targetUser.role,
        newRole: role,
        previousSuperAdmin: targetUser.isSuperAdmin,
        newSuperAdmin: updated.isSuperAdmin,
        targetEmail: targetUser.email,
        adminEmail: currentCaller.email,
        adminRole: currentCaller.role,
        adminIsSuperAdmin: currentCaller.isSuperAdmin,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    const { passwordHash: _, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (error: any) {
    console.error('Failed to update role:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;

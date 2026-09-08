import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { verifyAccessToken, generateAccessToken, TokenPayload } from '../utils/auth.ts';

// Backward compatibility alias
export function generateToken(user: { id: number; email: string; role?: string }): string {
  return generateAccessToken({ id: user.id, email: user.email, role: user.role || 'customer' });
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
    }
  }
}

/**
 * requireAuth middleware:
 * Validates JWT Bearer token or HTTP-only access_token cookie,
 * verifies user from database, checks account lock, and detects token expiration.
 * "Never trust frontend role. Verify role from database."
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check HTTP-only access_token cookie
    if (!token && (req as any).cookies?.access_token) {
      token = (req as any).cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. No token provided.',
        code: 'UNAUTHENTICATED',
      });
    }

    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Authentication token has expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        error: 'Invalid authentication token.',
        code: 'INVALID_TOKEN',
      });
    }

    // Always fetch user record directly from database
    const [dbUser] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!dbUser) {
      return res.status(401).json({
        error: 'User account not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check account lockout due to brute-force protection
    if (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
      const waitMinutes = Math.ceil(
        (new Date(dbUser.lockedUntil).getTime() - Date.now()) / (60 * 1000)
      );
      return res.status(423).json({
        error: `Account is temporarily locked due to security policy. Please retry in ${waitMinutes} minute(s).`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    req.user = dbUser;
    return next();
  } catch (error: any) {
    console.error('requireAuth middleware error:', error);
    return res.status(500).json({ error: 'Authentication middleware error' });
  }
}

/**
 * requireOwner middleware:
 * Ensures the authenticated user has verified 'owner' or 'admin' role in the database.
 */
export async function requireOwner(req: Request, res: Response, next: NextFunction) {
  const checkRole = () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Turf Owner privileges required.' });
    }
    return next();
  };

  if (!req.user) {
    return requireAuth(req, res, (err) => {
      if (err) return next(err);
      return checkRole();
    });
  }

  return checkRole();
}

/**
 * requireAdmin middleware:
 * Ensures the authenticated user has verified 'admin' role in the database.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const checkRole = () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Platform Admin privileges required.' });
    }
    return next();
  };

  if (!req.user) {
    return requireAuth(req, res, (err) => {
      if (err) return next(err);
      return checkRole();
    });
  }

  return checkRole();
}

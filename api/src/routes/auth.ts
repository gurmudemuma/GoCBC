// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication Routes

import { Router, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { DatabaseService } from '../services/databaseService';
import { getJwtSecret, getJwtExpiry } from '../config/env.validation';
import {
  ROLE_PERMISSIONS,
  isTokenRevoked,
  revokeToken,
} from '../middleware/auth';

const router = Router();
const db = DatabaseService.getInstance();

// No fallback secret: getJwtSecret() throws (and startup validation
// fails first) if JWT_SECRET is missing or is a published value.
// JWT_EXPIRY is honoured — previously it was defined and never used,
// while every token was hard-coded to 24h.

/**
 * Login-specific rate limiting: 10 attempts per 15 minutes per
 * IP + username. The global limiter (1000 req / 15 min per IP) does
 * not stop credential stuffing against one account.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Keyed by client address + username, so one account cannot be
  // hammered from many addresses and one address cannot hammer many
  // accounts. Uses remoteAddress, not req.ip: express-rate-limit
  // rejects key generators that read req.ip directly (IPv6 handling),
  // and the ipKeyGenerator helper is not exported by the installed
  // express-rate-limit 7.5.1.
  keyGenerator: (req) =>
    `${req.socket?.remoteAddress || 'unknown'}:${(req.body?.username || '').toString().toLowerCase()}`,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
  },
});

const APPLICANT_PERMISSIONS = ['application:view', 'application:resubmit'];

/** Permissions for a token: role permissions plus any per-user
 *  permissions stored in users.permissions (previously the column
 *  was written but never read, so it could not grant or restrict
 *  anything). Stored permissions are merged, never a replacement
 *  for the role baseline. */
function buildPermissions(role: string, storedPermissions: unknown): string[] {
  const roleConfig =
    ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ||
    ROLE_PERMISSIONS.EXPORTER;
  const permissions = new Set<string>(roleConfig.permissions);
  try {
    const stored =
      typeof storedPermissions === 'string'
        ? JSON.parse(storedPermissions || '[]')
        : storedPermissions;
    if (Array.isArray(stored)) {
      for (const p of stored) {
        if (typeof p === 'string') permissions.add(p);
      }
    }
  } catch {
    // A malformed stored value must not break login; role permissions stand.
  }
  return [...permissions];
}

function signToken(payload: Record<string, unknown>): string {
  const options: SignOptions = { expiresIn: getJwtExpiry() as any };
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    getJwtSecret(),
    options
  ) as string;
}

async function assertTokenUsable(decoded: any): Promise<string | null> {
  if (decoded.jti && (await isTokenRevoked(decoded.jti))) {
    return 'This token has been revoked. Please log in again.';
  }
  if (decoded.role !== 'APPLICANT') {
    const account = await db.get('SELECT id, status FROM users WHERE id = $1', [
      decoded.userId || decoded.sub,
    ]);
    if (!account) return 'The account for this token no longer exists';
    if (account.status === 'suspended' || !['active', 'inactive', 'rejected'].includes(account.status)) {
      return `Your account is ${account.status}. Please contact support.`;
    }
  }
  return null;
}

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required',
        },
      });
    }

    // Find user in database
    const user = await db.get(
      `SELECT id, username, email, password_hash, role, organization, status,
              exporter_id, ecta_license, phone, full_name, permissions
       FROM users WHERE username = $1`,
      [username]
    );

    if (!user) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    // Check if user account is active, inactive (for applicants), or rejected (rejected users can login to view rejection reason)
    if (user.status !== 'active' && user.status !== 'rejected' && user.status !== 'inactive') {
      logger.warn(`Login attempt for ${user.status} account: ${username}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: `Your account is ${user.status}. Please contact support.`,
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    // Permissions come from the single role map in middleware/auth.ts
    // (previously this file kept a second, duplicated copy) plus any
    // per-user permissions stored in users.permissions.
    // Applicants-in-waiting (status 'inactive' — their temp account is
    // created that way — and 'rejected') may log in to see their
    // application, but they must NOT receive full exporter permissions:
    // previously a rejected/inactive account got a full role JWT.
    const permissions =
      user.status === 'active'
        ? buildPermissions(user.role, user.permissions)
        : [...APPLICANT_PERMISSIONS];

    // Generate JWT token (expiry honoured from JWT_EXPIRY, default 8h)
    const token = signToken({
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      org: user.organization,
      organization: user.organization,
      exporterId: user.exporter_id || undefined,
      ectaLicense: user.ecta_license || undefined,
      permissions,
    });

    // Record last login (best effort — must not break login)
    try {
      await db.run('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    } catch (e) {
      logger.warn('Failed to update last_login:', e);
    }

    // Log audit trail
    try {
      await db.run(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [user.id, 'LOGIN', 'user', user.id.toString(), JSON.stringify({ username: user.username }), req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
      );
    } catch (auditError) {
      logger.warn('Failed to log audit trail:', auditError);
    }

    // Remove sensitive data from response
    const { password: _, ...userWithoutPassword } = user;

    // Map database field names to camelCase for frontend
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name || user.username, // Use full_name if available
      role: user.role,
      organization: user.organization,
      exporterId: user.exporter_id || null,
      ectaLicense: user.ecta_license || null,
      phone: user.phone || null,
      status: user.status,
      permissions,
      lastLogin: new Date().toISOString(),
    };

    logger.info(`User logged in successfully: ${username}`);

    res.json({
      success: true,
      data: {
        token,
        user: userResponse,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
      },
    });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided',
        },
      });
    }

    // Verify token
    const decoded: any = jwt.verify(token, getJwtSecret());

    const unusable = await assertTokenUsable(decoded);
    if (unusable) {
      return res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: unusable },
      });
    }

    // Find user in database
    const userId = decoded.sub || decoded.userId;
    const user = await db.get(
      `SELECT id, username, email, full_name, role, organization,
       exporter_id, ecta_license, phone, permissions, status, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Parse permissions - handle both JSON string (SQLite) and native array (PostgreSQL)
    if (typeof user.permissions === 'string') {
      user.permissions = JSON.parse(user.permissions || '[]');
    } else if (!Array.isArray(user.permissions)) {
      user.permissions = [];
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error('Auth verification error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Logout used to be client-side only, so a logged-out token kept
    // working until expiry. Revoke it server-side by its jti.
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded: any = jwt.verify(token, getJwtSecret());
        if (decoded.jti) {
          const expiresAt = new Date((decoded.exp || 0) * 1000);
          await revokeToken(decoded.jti, decoded.userId || decoded.sub, expiresAt);
        }
      } catch (e) {
        // An expired/invalid token is already unusable; a missing
        // revoked_tokens table (migration not run) is logged, not fatal.
        logger.warn('Logout revocation skipped:', (e as Error).message);
      }
    }
    logger.info('User logged out');
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during logout',
      },
    });
  }
});

/**
 * @route   GET /api/v1/auth/validate
 * @desc    Validate JWT token (lightweight check for session restoration)
 * @access  Private
 */
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided',
        },
      });
    }

    // Verify token
    const decoded: any = jwt.verify(token, getJwtSecret());

    const unusable = await assertTokenUsable(decoded);
    if (unusable) {
      return res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: unusable },
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        userId: decoded.userId || decoded.sub,
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided',
        },
      });
    }

    // Verify token
    const decoded: any = jwt.verify(token, getJwtSecret());

    // Refresh used to re-issue from any unexpired token with no DB
    // check, so a suspended user's token could be extended forever.
    const unusable = await assertTokenUsable(decoded);
    if (unusable) {
      return res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: unusable },
      });
    }

    // Rotate: revoke the old token so it cannot be reused, then issue
    // a fresh one with a new jti.
    if (decoded.jti) {
      try {
        await revokeToken(
          decoded.jti,
          decoded.userId || decoded.sub,
          new Date((decoded.exp || 0) * 1000)
        );
      } catch (e) {
        logger.warn('Refresh rotation skipped:', (e as Error).message);
      }
    }

    // Re-derive permissions from the database, not from the old token.
    let permissions: string[] = decoded.permissions || [];
    if (decoded.role !== 'APPLICANT') {
      const account = await db.get(
        'SELECT role, permissions, status FROM users WHERE id = $1',
        [decoded.userId || decoded.sub]
      );
      permissions =
        account?.status === 'active'
          ? buildPermissions(account.role, account.permissions)
          : [...APPLICANT_PERMISSIONS];
    }

    // Generate new token
    const newToken = signToken({
      sub: decoded.userId || decoded.sub,
      userId: decoded.userId || decoded.sub,
      username: decoded.username,
      role: decoded.role,
      org: decoded.organization || decoded.org,
      organization: decoded.organization || decoded.org,
      permissions,
    });

    res.json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
});

/**
 * @route   POST /api/v1/auth/applicant/login
 * @desc    Authenticate applicant using temporary credentials
 * @access  Public
 */
router.post('/applicant/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required',
        },
      });
    }

    // Verify applicant credentials
    const applicantCredentialsService = require('../services/applicantCredentialsService').default;
    const verification = await applicantCredentialsService.verifyCredentials(username, password);

    if (!verification.valid) {
      logger.warn(`Failed applicant login attempt for username: ${username}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    // Get application details
    const application = await db.get(
      `SELECT id, company_name, email, status, submitted_at, rejection_reason
       FROM exporter_applications WHERE id = $1`,
      [verification.applicationId]
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: 'Application not found',
        },
      });
    }

    // Update last login
    await db.run(
      'UPDATE exporter_applications SET last_login = NOW() WHERE id = $1',
      [verification.applicationId]
    );

    // Generate JWT token with APPLICANT role (expiry honoured from JWT_EXPIRY)
    const token = signToken({
      sub: verification.applicationId,
      applicationId: verification.applicationId,
      username,
      role: 'APPLICANT',
      status: application.status,
      permissions: [...APPLICANT_PERMISSIONS],
    });

    logger.info(`✅ Applicant login successful: ${username} (Application: ${verification.applicationId})`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          applicationId: verification.applicationId,
          username,
          companyName: application.company_name,
          email: application.email,
          role: 'APPLICANT',
          status: application.status,
          submittedAt: application.submitted_at,
          rejectionReason: application.rejection_reason || null,
        },
      },
    });
  } catch (error: any) {
    logger.error('Applicant login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: error.message || 'Login failed',
      },
    });
  }
});

/**
 * @route   GET /api/v1/auth/applicant/status
 * @desc    Get current application status for logged-in applicant
 * @access  Applicant (requires valid applicant token)
 */
router.get('/applicant/status', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    if (decoded.role !== 'APPLICANT') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not an applicant token' },
      });
    }

    const application = await db.get(
      `SELECT id, company_name, email, status, submitted_at, 
              rejection_reason, approved_at, license_number, exporter_id
       FROM exporter_applications WHERE id = $1`,
      [decoded.applicationId]
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    res.json({
      success: true,
      data: {
        applicationId: application.id,
        companyName: application.company_name,
        email: application.email,
        status: application.status,
        submittedAt: application.submitted_at,
        rejectionReason: application.rejection_reason || null,
        approvedAt: application.approved_at || null,
        licenseNumber: application.license_number || null,
        exporterId: application.exporter_id || null,
      },
    });
  } catch (error: any) {
    logger.error('Get applicant status error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

export default router;

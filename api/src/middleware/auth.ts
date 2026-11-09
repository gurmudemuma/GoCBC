// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication & Authorization Middleware - Role-Based Access Control (RBAC)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { getJwtSecret } from '../config/env.validation';
import { DatabaseService } from '../services/databaseService';
import FabricService from '../services/fabricService';

// Set to true the first time we notice the revocation table is missing
// (migration 053 not applied yet). We warn once and continue so a
// rollout that has not run migrations yet does not lock everyone out;
// the table is created by runMigrations() at startup, so in a normal
// deployment this never triggers.
let revokedTableMissingWarned = false;

export async function isTokenRevoked(jti: string): Promise<boolean> {
  const db = DatabaseService.getInstance();
  const row = await db.get(
    'SELECT jti FROM revoked_tokens WHERE jti = $1',
    [jti]
  );
  return !!row;
}

export async function revokeToken(
  jti: string,
  userId: string | number,
  expiresAt: Date
): Promise<void> {
  const db = DatabaseService.getInstance();
  await db.run(
    `INSERT INTO revoked_tokens (jti, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (jti) DO NOTHING`,
    [jti, String(userId), expiresAt]
  );
}

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    org: string;
    organization?: string; // Add for compatibility
    role: string;
    permissions: string[];
    userId?: string;
    username?: string;
    exporterId?: string;
    // Applicant tokens (issued by /auth/applicant/login) carry the
    // numeric id of the exporter application they belong to. This must
    // be carried through to req.user: the resubmit guard in
    // routes/exporters.ts matches it against the application being
    // resubmitted, and without it the applicant branch could never
    // pass (every applicant resubmit 403'd).
    applicationId?: string | number;
  };
}

// Role definitions with clear permissions
export const ROLE_PERMISSIONS = {
  ADMIN: {
    name: 'Super Administrator',
    permissions: [
      'admin:system',
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'users:manage-all',
      'blockchain:enroll',
      'blockchain:revoke',
      'blockchain:renew',
      'analytics:view-all',
      'settings:manage',
      'audit:view-all',
      'organizations:manage-all',
    ],
    canAccessAllOrganizations: true,
    description: 'Full system access across all organizations',
  },
  ECTA: {
    name: 'ECTA Admin',
    permissions: [
      'users:create-org',
      'users:read-org',
      'users:update-org',
      'users:delete-org',
      'blockchain:enroll-org',
      'quality:manage',
      'permits:manage',
      'phytosanitary:manage',
      'licenses:manage',
      'analytics:view-org',
      'exporters:approve',
      'exporters:verify',
    ],
    canAccessAllOrganizations: false,
    allowedOrganizations: ['ECTA', 'ECTAMSP'],
    description: 'Manage ECTA users and quality control operations',
  },
  ECX: {
    name: 'ECX Admin',
    permissions: [
      'users:create-org',
      'users:read-org',
      'users:update-org',
      'users:delete-org',
      'blockchain:enroll-org',
      'contracts:manage',
      'grading:manage',
      'warehouse:manage',
      'release:manage',
      'analytics:view-org',
    ],
    canAccessAllOrganizations: false,
    allowedOrganizations: ['ECX', 'ECXMSP'],
    description: 'Manage ECX users and trading operations',
  },
  NBE: {
    name: 'NBE Admin',
    permissions: [
      'users:create-org',
      'users:read-org',
      'users:update-org',
      'users:delete-org',
      'blockchain:enroll-org',
      'forex:manage',
      'forex:allocate',
      'forex:approve',
      'compliance:verify',
      'analytics:view-org',
      'payments:monitor',
    ],
    canAccessAllOrganizations: false,
    allowedOrganizations: ['NBE', 'NBEMSP'],
    description: 'Manage NBE users and foreign exchange operations',
  },
  BANKS: {
    name: 'Banks Admin',
    permissions: [
      'users:create-org',
      'users:read-org',
      'users:update-org',
      'users:delete-org',
      'blockchain:enroll-org',
      'lc:issue',
      'lc:manage',
      'payments:process',
      'advance:manage',
      'collections:manage',
      'analytics:view-org',
    ],
    canAccessAllOrganizations: false,
    allowedOrganizations: ['BANKS', 'BanksMSP'],
    description: 'Manage Bank users and letter of credit operations',
  },
  CUSTOMS: {
    name: 'Customs Admin',
    permissions: [
      'users:create-org',
      'users:read-org',
      'users:update-org',
      'users:delete-org',
      'blockchain:enroll-org',
      'customs:declare',
      'customs:inspect',
      'customs:clear',
      'customs:assess-duty',
      'analytics:view-org',
    ],
    canAccessAllOrganizations: false,
    allowedOrganizations: ['CUSTOMS', 'CustomsMSP'],
    description: 'Manage Customs users and clearance operations',
  },
  SHIPPING: {
    name: 'Shipping Admin',
    permissions: [
      'users:create-org',
      'users:read-org',
      'users:update-org',
      'users:delete-org',
      'blockchain:enroll-org',
      'shipments:create',
      'shipments:update',
      'shipments:track',
      'logistics:manage',
      'analytics:view-org',
    ],
    canAccessAllOrganizations: false,
    allowedOrganizations: ['SHIPPING', 'ShippingMSP'],
    description: 'Manage Shipping users and logistics operations',
  },
  EXPORTER: {
    name: 'Coffee Exporter',
    permissions: [
      'contracts:create',
      'contracts:view-own',
      'shipments:create-own',
      'shipments:view-own',
      'documents:upload-own',
      'documents:view-own',
      'permits:apply',
      'lc:view-own',
      'payments:view-own',
      'analytics:view-own',
    ],
    canAccessAllOrganizations: false,
    allowedOrganizations: ['EXPORTER'],
    description: 'Create and manage own export contracts and shipments',
  },
};

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Missing or invalid authorization header',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7);

    // There is deliberately no test-mode bypass here any more: a fixed
    // token that granted full ADMIN in development was a second way to
    // forge admin access, and it also existed in the documents
    // download route. Test with a real token issued by /auth/login.
    const jwtSecret = getJwtSecret();

    const decoded = jwt.verify(token, jwtSecret) as any;
    const rawOrg = decoded.organization || decoded.org || '';
    const role = decoded.role || 'EXPORTER';

    // Token revocation: a token whose jti is in revoked_tokens (written
    // by /auth/logout and by /auth/refresh rotation) is dead even
    // though its expiry has not passed.
    if (decoded.jti) {
      try {
        if (await isTokenRevoked(decoded.jti)) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'TOKEN_REVOKED',
              message: 'This token has been revoked. Please log in again.',
            },
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error: any) {
        if (error?.message?.includes('revoked_tokens') && error.message.includes('does not exist')) {
          if (!revokedTableMissingWarned) {
            revokedTableMissingWarned = true;
            logger.warn(
              'revoked_tokens table is missing (run migrations). Token revocation checks are skipped until it exists.'
            );
          }
        } else {
          throw error;
        }
      }
    }

    // Re-check the account in the database on every request. A token
    // used to keep working until its 24h expiry even after the account
    // was suspended; now a suspended account is rejected immediately.
    // 'inactive'/'rejected' accounts are applicants-in-waiting (their
    // temp user is created with status 'inactive' and they log in to
    // see their application), so they are admitted here with the
    // restricted permissions their token was issued with — see
    // routes/auth.ts. Anything else is not a usable account state.
    if (role !== 'APPLICANT') {
      const db = DatabaseService.getInstance();
      const userId = decoded.userId || decoded.sub;
      const account = await db.get(
        'SELECT id, status FROM users WHERE id = $1',
        [userId]
      );
      if (!account) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'The account for this token no longer exists',
          },
          timestamp: new Date().toISOString(),
        });
      }
      if (account.status === 'suspended' || !['active', 'inactive', 'rejected'].includes(account.status)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: `Your account is ${account.status}. Please contact support.`,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
    const fabricService = FabricService.getInstance();
    const mspId = fabricService.getMspFromRole(role);
    logger.info(`🔍 [AUTH] User: ${decoded.username}, Role: ${role}, MSP: ${mspId}`);
    fabricService.setRequestMspId(mspId);
    const userId = decoded.userId || decoded.sub;
    fabricService.setRequestIdentity(userId);

    // Get role-based permissions
    const roleConfig = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.EXPORTER;
    const permissions = decoded.permissions || roleConfig.permissions;

    // Use organization as-is from JWT - no normalization needed
    // The JWT already contains the correct organization value from the database
    req.user = {
      sub: decoded.sub,
      org: rawOrg,
      organization: rawOrg,
      role: role,
      permissions: permissions,
      userId: String(userId),
      username: decoded.username,
      exporterId: decoded.exporterId || decoded.username || decoded.sub,
      applicationId: decoded.applicationId,
    };

    logger.info(`✅ User authenticated: ${req.user.username} (${req.user.role}) - ${req.user.org}`, {
      userId: req.user.sub,
      role: req.user.role,
      organization: req.user.org,
      permissions: req.user.permissions.length,
    });

    next();
  } catch (error) {
    logger.error('❌ Authentication error:', error);
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Require specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const hasPermission = req.user.permissions.includes(permission) || 
                         req.user.permissions.includes('admin:system');

    if (!hasPermission) {
      logger.warn(`⚠️ Permission denied: ${req.user.username} tried to access ${permission}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: `Insufficient permissions. Required: ${permission}`,
          requiredPermission: permission,
          userRole: req.user.role,
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`✅ Permission granted: ${req.user.username} -> ${permission}`);
    next();
  };
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const hasRole = roles.includes(req.user.role) || req.user.role === 'ADMIN';

    if (!hasRole) {
      logger.warn(`⚠️ Role check failed: ${req.user.username} (${req.user.role}) tried to access ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: `Insufficient privileges. Required role: ${roles.join(' or ')}`,
          requiredRoles: roles,
          userRole: req.user.role,
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`✅ Role check passed: ${req.user.username} (${req.user.role})`);
    next();
  };
};

/**
 * Require organization access
 * Ensures user can only access data from their own organization (unless ADMIN)
 */
export const requireOrganizationAccess = (orgParamName: string = 'organization') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // ADMIN can access all organizations
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const requestedOrg = req.params[orgParamName] || req.query[orgParamName] || req.body[orgParamName];
    const userOrg = req.user.org;

    // Normalize organization names for comparison
    const normalizeForComparison = (org: string): string => {
      return org.toUpperCase().replace(/MSP$/i, '');
    };

    const normalizedRequestedOrg = normalizeForComparison(requestedOrg || '');
    const normalizedUserOrg = normalizeForComparison(userOrg);

    if (requestedOrg && normalizedRequestedOrg !== normalizedUserOrg) {
      logger.warn(`⚠️ Organization access denied: ${req.user.username} (${userOrg}) tried to access ${requestedOrg}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Cannot access data from other organizations',
          userOrganization: userOrg,
          requestedOrganization: requestedOrg,
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

/**
 * Require admin role (either ADMIN or organization admin)
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'User not authenticated',
      },
      timestamp: new Date().toISOString(),
    });
  }

  const adminRoles = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'];
  
  if (!adminRoles.includes(req.user.role)) {
    logger.warn(`⚠️ Admin access denied: ${req.user.username} (${req.user.role})`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Admin privileges required',
        userRole: req.user.role,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Require super admin role (ADMIN only)
 */
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'User not authenticated',
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== 'ADMIN') {
    logger.warn(`⚠️ Super admin access denied: ${req.user.username} (${req.user.role})`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Super administrator privileges required',
        userRole: req.user.role,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

export default authMiddleware;

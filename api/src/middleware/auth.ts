// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication & Authorization Middleware - Role-Based Access Control (RBAC)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

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

export const authMiddleware = (
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
    const jwtSecret = process.env.JWT_SECRET || 'cecbs-secret-key';

    const decoded = jwt.verify(token, jwtSecret) as any;
    const rawOrg = decoded.organization || decoded.org || '';
    const role = decoded.role || 'EXPORTER';

    const normalizeOrg = (org: string): string => {
      const normalized = org.toUpperCase().replace(/[^A-Z0-9]/g, '');
      switch (normalized) {
        case 'NBE':
        case 'NBEMSP':
        case 'NATIONALBANKOFETHIOPIA':
          return 'NBEMSP';
        case 'ECTA':
        case 'ECTAMSP':
        case 'ETHIOPIANCOFFEEANDTEAAUTHORITY':
          return 'ECTAMSP';
        case 'ECX':
        case 'ECXMSP':
          return 'ECXMSP';
        case 'BANKS':
        case 'BANKSMSP':
        case 'COMMERCIALBANKOFETHIOPIA':
          return 'BanksMSP';
        case 'CUSTOMS':
        case 'CUSTOMSMSP':
          return 'CustomsMSP';
        case 'SHIPPING':
        case 'SHIPPINGMSP':
          return 'ShippingMSP';
        default:
          return org;
      }
    };

    // Get role-based permissions
    const roleConfig = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.EXPORTER;
    const permissions = decoded.permissions || roleConfig.permissions;

    req.user = {
      sub: decoded.sub,
      org: normalizeOrg(rawOrg),
      organization: normalizeOrg(rawOrg), // Add this for compatibility
      role: role,
      permissions: permissions,
      userId: decoded.userId || decoded.sub,
      username: decoded.username,
      exporterId: decoded.exporterId || decoded.username || decoded.sub,
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
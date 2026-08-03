// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Role-Based Access Control (RBAC) Enforcement Middleware

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { logger } from '../utils/logger';

/**
 * Enforce organization-scoped data access
 * Ensures users can only access data from their own organization (unless ADMIN)
 */
export const enforceOrganizationScope = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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

  // ADMIN can access all organizations - bypass scope
  if (req.user.role === 'ADMIN') {
    logger.info(`🔓 ADMIN bypass: ${req.user.username} accessing all organizations`);
    next();
    return;
  }

  // For non-admin users, inject organization filter into request
  // This will be used by the route handler to filter data
  (req as any).organizationScope = req.user.org;
  logger.info(`🔒 Organization scope enforced: ${req.user.username} (${req.user.org})`);
  
  next();
};

/**
 * Validate user can only modify users from their own organization
 */
export const enforceOrganizationModification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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

  // ADMIN can modify users from any organization
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  // For non-admin users, check if they're trying to modify a user from their org
  const targetUserId = req.params.id || req.body.userId;
  
  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'User ID required',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // We'll validate organization ownership in the route handler
  // Store the validation requirement
  (req as any).requireOrganizationOwnership = true;
  
  next();
};

/**
 * Role hierarchy - determines which roles can manage other roles
 */
const ROLE_HIERARCHY: Record<string, string[]> = {
  ADMIN: ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING', 'EXPORTER'],
  ECTA: ['EXPORTER'], // ECTA can manage exporters under their authority
  ECX: ['EXPORTER'],
  NBE: [],
  BANKS: [],
  CUSTOMS: [],
  SHIPPING: [],
  EXPORTER: [],
};

/**
 * Check if user can create/manage users of a specific role
 */
export const canManageRole = (userRole: string, targetRole: string): boolean => {
  const manageableRoles = ROLE_HIERARCHY[userRole] || [];
  return manageableRoles.includes(targetRole) || userRole === 'ADMIN';
};

/**
 * Enforce role management permissions
 */
export const enforceRoleManagement = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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

  const targetRole = req.body.role;
  
  if (!targetRole) {
    // No role specified, continue (will be validated elsewhere)
    next();
    return;
  }

  if (!canManageRole(req.user.role, targetRole)) {
    logger.warn(`⚠️ Role management denied: ${req.user.username} (${req.user.role}) cannot manage ${targetRole}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: `You do not have permission to manage users with role: ${targetRole}`,
        userRole: req.user.role,
        targetRole,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Permission checker helper
 */
export const hasPermission = (
  user: NonNullable<AuthenticatedRequest['user']>,
  permission: string
): boolean => {
  return (
    user.permissions.includes(permission) ||
    user.permissions.includes('admin:system')
  );
};

/**
 * Check multiple permissions (requires ALL)
 */
export const hasAllPermissions = (
  user: NonNullable<AuthenticatedRequest['user']>,
  permissions: string[]
): boolean => {
  if (user.permissions.includes('admin:system')) {
    return true;
  }
  return permissions.every(permission => user.permissions.includes(permission));
};

/**
 * Check multiple permissions (requires ANY)
 */
export const hasAnyPermission = (
  user: NonNullable<AuthenticatedRequest['user']>,
  permissions: string[]
): boolean => {
  if (user.permissions.includes('admin:system')) {
    return true;
  }
  return permissions.some(permission => user.permissions.includes(permission));
};

/**
 * Middleware to log all access attempts for security audit
 */
export const auditAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user) {
    logger.info(`🔐 Access: ${req.user.username} (${req.user.role}) -> ${req.method} ${req.path}`, {
      userId: req.user.userId,
      organization: req.user.org,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
  next();
};

export default {
  enforceOrganizationScope,
  enforceOrganizationModification,
  enforceRoleManagement,
  canManageRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  auditAccess,
};

// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication Middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    org: string;
    role: string;
    permissions: string[];
  };
}

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

    req.user = {
      sub: decoded.sub,
      org: normalizeOrg(rawOrg),
      role: decoded.role,
      permissions: decoded.permissions || [],
    };
    
    // Add additional fields that may be needed by routes
    (req as any).user.exporterId = decoded.exporterId || decoded.username || decoded.sub;
    (req as any).user.username = decoded.username;
    (req as any).user.userId = decoded.userId || decoded.sub;

    logger.info('User authenticated:', {
      userId: req.user.sub,
      exporterId: (req as any).user.exporterId,
      organization: req.user.org,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
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

    if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('admin:system')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: `Insufficient permissions. Required: ${permission}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

export default authMiddleware;
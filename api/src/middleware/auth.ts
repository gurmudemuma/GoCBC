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
    
    req.user = {
      sub: decoded.sub,
      org: decoded.org,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    logger.info('User authenticated:', {
      userId: req.user.sub,
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
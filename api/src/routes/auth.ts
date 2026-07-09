// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication Routes

import { Router, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const db = DatabaseService.getInstance();

const JWT_SECRET = process.env.JWT_SECRET || 'cecbs-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', async (req: Request, res: Response) => {
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
      `SELECT id, username, email, password_hash, full_name, role, organization,
       exporter_id, ecta_license, phone, permissions, status
       FROM users WHERE username = ?`,
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

    // Check if user account is active
    if (user.status !== 'active') {
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

    // Parse permissions
    const permissions = JSON.parse(user.permissions || '[]');

    // Generate JWT token
    const signOptions: jwt.SignOptions = { expiresIn: '24h' };
    const token = jwt.sign(
      {
        sub: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
        org: user.organization,
        organization: user.organization,
        exporterId: user.exporter_id || undefined,
        ectaLicense: user.ecta_license || undefined,
        permissions,
      },
      JWT_SECRET,
      signOptions
    ) as string;

    // Update last login
    await db.run(
      'UPDATE users SET last_login = datetime("now") WHERE id = ?',
      [user.id]
    );

    // Log audit
    await db.logAudit(
      user.id,
      'LOGIN',
      'user',
      user.id.toString(),
      { username: user.username },
      req.ip,
      req.headers['user-agent']
    );

    // Remove sensitive data from response
    const { password_hash, ...userWithoutPassword } = user;

    // Map database field names to camelCase for frontend
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      organization: user.organization,
      exporterId: user.exporter_id,
      ectaLicense: user.ecta_license,
      phone: user.phone,
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
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Find user in database
    const userId = decoded.sub || decoded.userId;
    const user = await db.get(
      `SELECT id, username, email, full_name, role, organization,
       exporter_id, ecta_license, phone, permissions, status, last_login
       FROM users WHERE id = ?`,
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

    // Parse permissions
    user.permissions = JSON.parse(user.permissions || '[]');

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
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Generate new token
    const refreshOptions: jwt.SignOptions = { expiresIn: '24h' };
    const newToken = jwt.sign(
      {
        sub: decoded.userId || decoded.sub,
        userId: decoded.userId || decoded.sub,
        username: decoded.username,
        role: decoded.role,
        org: decoded.organization || decoded.org,
        organization: decoded.organization || decoded.org,
        permissions: decoded.permissions || [],
      },
      JWT_SECRET,
      refreshOptions
    ) as string;

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

export default router;

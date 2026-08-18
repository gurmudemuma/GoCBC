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

    // Role-based permissions mapping
    const rolePermissionsMap: Record<string, string[]> = {
      ADMIN: [
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
      ECTA: [
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
      ECX: [
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
      NBE: [
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
      BANKS: [
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
      CUSTOMS: [
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
      SHIPPING: [
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
      EXPORTER: [
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
    };

    // Get permissions based on role
    const permissions = rolePermissionsMap[user.role] || rolePermissionsMap.EXPORTER;

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
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

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
    const decoded: any = jwt.verify(token, JWT_SECRET);

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

/**
 * @route   POST /api/v1/auth/applicant/login
 * @desc    Authenticate applicant using temporary credentials
 * @access  Public
 */
router.post('/applicant/login', async (req: Request, res: Response) => {
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

    // Generate JWT token with APPLICANT role
    const token = jwt.sign(
      {
        sub: verification.applicationId,
        applicationId: verification.applicationId,
        username,
        role: 'APPLICANT',
        status: application.status,
        permissions: ['application:view', 'application:resubmit'],
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    ) as string;

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
    const decoded = jwt.verify(token, JWT_SECRET) as any;

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

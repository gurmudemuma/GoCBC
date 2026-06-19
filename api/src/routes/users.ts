// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// User Management Routes

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const db = DatabaseService.getInstance();

// ============================================================================
// USER MANAGEMENT ROUTES (Admin Only)
// ============================================================================

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING, EXPORTER, ADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, inactive]
 *         description: Filter by user status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal server error
 */
router.get('/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const userRole = (req as any).user?.role;
      if (userRole !== 'ADMIN' && userRole !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can view all users',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { role, status, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT id, username, email, full_name, role, organization, status, created_at, last_login FROM users WHERE 1=1';
      const params: any[] = [];

      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit as string), parseInt(offset as string));

      const users = await db.all(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams: any[] = [];

      if (role) {
        countQuery += ' AND role = ?';
        countParams.push(role);
      }

      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }

      const countResult = await db.get(countQuery, countParams);

      res.json({
        success: true,
        data: users,
        pagination: {
          total: countResult.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < countResult.total,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error retrieving users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve users',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *               - role
 *               - organization
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING, EXPORTER, ADMIN]
 *               organization:
 *                 type: string
 *               exporterId:
 *                 type: string
 *                 description: Required for EXPORTER role
 *               ectaLicense:
 *                 type: string
 *                 description: Required for EXPORTER role
 *               phone:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Forbidden - Admin only
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/',
  authMiddleware,
  [
    body('username').notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('role').isIn(['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING', 'EXPORTER', 'ADMIN'])
      .withMessage('Invalid role'),
    body('organization').notEmpty().withMessage('Organization is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const userRole = (req as any).user?.role;
      if (userRole !== 'ADMIN' && userRole !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can create users',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const {
        username,
        email,
        password,
        fullName,
        role,
        organization,
        exporterId,
        ectaLicense,
        phone,
        permissions,
      } = req.body;

      // Validate exporter-specific fields
      if (role === 'EXPORTER' && (!exporterId || !ectaLicense)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Exporter users require exporterId and ectaLicense',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if username or email already exists
      const existingUser = await db.get(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'Username or email already exists',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const result = await db.run(
        `INSERT INTO users (
          username, email, password_hash, full_name, role, organization,
          exporter_id, ecta_license, phone, permissions, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
        [
          username,
          email,
          hashedPassword,
          fullName,
          role,
          organization,
          exporterId || null,
          ectaLicense || null,
          phone || null,
          JSON.stringify(permissions || []),
        ]
      );

      logger.info(`User created: ${username} (${role})`);

      res.status(201).json({
        success: true,
        data: {
          id: result.lastID,
          username,
          email,
          fullName,
          role,
          organization,
          status: 'active',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId',
  authMiddleware,
  [param('userId').notEmpty().withMessage('User ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;

      // Check permissions: Admin, ECTA, or own profile
      if (
        requestingUser.role !== 'ADMIN' &&
        requestingUser.role !== 'ECTA' &&
        requestingUser.userId !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own profile',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const user = await db.get(
        `SELECT id, username, email, full_name, role, organization, 
         exporter_id, ecta_license, phone, permissions, status, created_at, last_login
         FROM users WHERE id = ?`,
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Parse permissions JSON
      user.permissions = JSON.parse(user.permissions || '[]');

      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error retrieving user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId',
  authMiddleware,
  [param('userId').notEmpty().withMessage('User ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;
      const { email, fullName, phone, permissions } = req.body;

      // Check permissions: Admin, ECTA, or own profile
      const isAdmin = requestingUser.role === 'ADMIN' || requestingUser.role === 'ECTA';
      const isOwnProfile = requestingUser.userId === userId;

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own profile',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];

      if (email) {
        updates.push('email = ?');
        params.push(email);
      }

      if (fullName) {
        updates.push('full_name = ?');
        params.push(fullName);
      }

      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone);
      }

      // Only admins can update permissions
      if (permissions && isAdmin) {
        updates.push('permissions = ?');
        params.push(JSON.stringify(permissions));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields to update',
          },
          timestamp: new Date().toISOString(),
        });
      }

      updates.push('updated_at = datetime("now")');
      params.push(userId);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      await db.run(query, params);

      logger.info(`User updated: ${userId}`);

      // Fetch updated user
      const updatedUser = await db.get(
        `SELECT id, username, email, full_name, role, organization, 
         exporter_id, ecta_license, phone, permissions, status
         FROM users WHERE id = ?`,
        [userId]
      );

      updatedUser.permissions = JSON.parse(updatedUser.permissions || '[]');

      res.json({
        success: true,
        data: updatedUser,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}/password:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/password',
  authMiddleware,
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;
      const { currentPassword, newPassword } = req.body;

      // Users can only change their own password
      if (requestingUser.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only change your own password',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get current password hash
      const user = await db.get(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.run(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
        [hashedPassword, userId]
      );

      logger.info(`Password changed for user: ${userId}`);

      res.json({
        success: true,
        data: { message: 'Password changed successfully' },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to change password',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}/status:
 *   put:
 *     summary: Update user status (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/status',
  authMiddleware,
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('status').isIn(['active', 'suspended', 'inactive']).withMessage('Invalid status'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;
      const { status, reason } = req.body;

      // Only admins can change user status
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can change user status',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Update status
      await db.run(
        'UPDATE users SET status = ?, updated_at = datetime("now") WHERE id = ?',
        [status, userId]
      );

      logger.info(`User status updated: ${userId} -> ${status} (Reason: ${reason || 'N/A'})`);

      res.json({
        success: true,
        data: {
          userId,
          status,
          reason,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user status',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}/reset-password:
 *   post:
 *     summary: Reset user password to default (Admin only - Development/Testing)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/:userId/reset-password',
  authMiddleware,
  [param('userId').notEmpty().withMessage('User ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;

      // Only admins can reset passwords
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can reset user passwords',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get user details
      const user = await db.get(
        'SELECT id, username, email, full_name FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        // User doesn't exist - check if there's an approved exporter application
        logger.warn(`User ID ${userId} not found. Checking for approved exporter application...`);
        
        // Try to find approved exporter by matching the user ID pattern
        const exporterApp = await db.get(
          `SELECT * FROM exporter_applications 
           WHERE status = 'approved' 
           AND id = ?
           LIMIT 1`,
          [userId]
        );

        if (exporterApp && exporterApp.exporter_id) {
          // Found an approved exporter without a user account - create one!
          logger.info(`Creating missing user account for approved exporter: ${exporterApp.exporter_id}`);
          
          const defaultPassword = 'password123';
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          
          const defaultPermissions = JSON.stringify([
            'contract.create', 'contract.view', 
            'shipment.view', 'shipment.create',
            'payment.view', 'document.upload', 
            'document.view', 'report.generate'
          ]);

          await db.run(
            `INSERT INTO users (
              username, email, password_hash, full_name, role, organization,
              phone, permissions, status, exporter_id, ecta_license, created_at
            ) VALUES (?, ?, ?, ?, 'EXPORTER', ?, ?, ?, 'active', ?, ?, datetime('now'))`,
            [
              exporterApp.exporter_id,
              exporterApp.email,
              hashedPassword,
              exporterApp.contact_person,
              exporterApp.company_name,
              exporterApp.phone,
              defaultPermissions,
              exporterApp.exporter_id,
              exporterApp.ecta_license_number
            ]
          );

          logger.info(`✅ User account created and password reset for: ${exporterApp.exporter_id}`);

          return res.json({
            success: true,
            data: {
              message: 'User account created and password reset successfully',
              userId: exporterApp.exporter_id,
              username: exporterApp.exporter_id,
              email: exporterApp.email,
              newPassword: defaultPassword,
              note: 'User account was missing and has been created. Password set to default.',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // No approved exporter found either
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found and no approved exporter application exists',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // User exists - reset password to "password123"
      const defaultPassword = 'password123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Update password
      await db.run(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
        [hashedPassword, userId]
      );

      logger.info(`Password reset to default for user: ${user.username} (${userId}) by admin: ${requestingUser.username}`);

      res.json({
        success: true,
        data: {
          message: 'Password reset successfully',
          userId: user.id,
          username: user.username,
          email: user.email,
          newPassword: defaultPassword,
          note: 'Please inform the user to change their password after logging in',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reset password',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/bulk-reset-passwords:
 *   post:
 *     summary: Reset all user passwords to default (Admin only - Development/Testing)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               confirmReset:
 *                 type: boolean
 *                 description: Must be true to confirm bulk reset
 *     responses:
 *       200:
 *         description: Passwords reset successfully
 *       400:
 *         description: Confirmation required
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-reset-passwords',
  authMiddleware,
  [body('confirmReset').isBoolean().withMessage('Confirmation required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const requestingUser = (req as any).user;
      const { confirmReset } = req.body;

      // Only admins can perform bulk reset
      if (requestingUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only system administrators can perform bulk password reset',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Require explicit confirmation
      if (!confirmReset) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CONFIRMATION_REQUIRED',
            message: 'Set confirmReset to true to proceed with bulk password reset',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Reset password to "password123" for all users
      const defaultPassword = 'password123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Get all users
      const users = await db.all(
        'SELECT id, username, email FROM users WHERE status = "active"'
      );

      // Update all passwords
      await db.run(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE status = "active"',
        [hashedPassword]
      );

      logger.warn(`⚠️ BULK PASSWORD RESET performed by admin: ${requestingUser.username} - ${users.length} users affected`);

      res.json({
        success: true,
        data: {
          message: 'All user passwords reset successfully',
          usersAffected: users.length,
          newPassword: defaultPassword,
          users: users.map(u => ({ id: u.id, username: u.username, email: u.email })),
          warning: 'All users should be notified to change their passwords after logging in',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error performing bulk password reset:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reset passwords',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:userId',
  authMiddleware,
  [param('userId').notEmpty().withMessage('User ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;

      // Only admins can delete users
      if (requestingUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only system administrators can delete users',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Prevent self-deletion
      if (requestingUser.userId === userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'You cannot delete your own account',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Soft delete: set status to inactive
      await db.run(
        'UPDATE users SET status = "inactive", updated_at = datetime("now") WHERE id = ?',
        [userId]
      );

      logger.info(`User deleted (soft): ${userId}`);

      res.json({
        success: true,
        data: { message: 'User deleted successfully' },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

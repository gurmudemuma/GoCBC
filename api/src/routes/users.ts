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
// AUDIT LOGGING HELPER
// ============================================================================

/**
 * Log user management activity to audit trail
 */
async function logUserActivity(
  userId: string,
  username: string,
  action: string,
  targetUserId: string | null,
  targetUsername: string | null,
  details: any,
  performedBy: string,
  performedByRole: string,
  req: Request
) {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await db.run(
      `INSERT INTO user_activity_log (
        user_id, username, action, target_user_id, target_username,
        details, ip_address, user_agent, performed_by, performed_by_role, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [
        userId,
        username,
        action,
        targetUserId,
        targetUsername,
        JSON.stringify(details),
        ipAddress,
        userAgent,
        performedBy,
        performedByRole,
      ]
    );

    logger.info(`[AUDIT] ${action}: ${targetUsername || username} by ${performedBy} (${performedByRole})`);
  } catch (error) {
    logger.error('Failed to log user activity:', error);
    // Don't throw - audit logging failure shouldn't break the operation
  }
}

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
      const requestingUser = (req as any).user;
      const userRole = requestingUser?.role;
      const userOrganization = requestingUser?.organization;

      // Check if user has permission to view users
      // ADMIN can see all, other roles can only see their organization
      const isAdmin = userRole === 'ADMIN';
      const canManageUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(userRole);

      if (!canManageUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view users',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { role, status, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT id, username, email, full_name, role, organization, exporter_id, status, created_at, last_login FROM users WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Organization-scoped access: non-ADMIN users can only see their organization
      if (!isAdmin) {
        query += ` AND organization = $${paramIndex++}`;
        params.push(userOrganization);
      }

      if (role) {
        query += ` AND role = $${paramIndex++}`;
        params.push(role);
      }

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const users = await db.all(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (!isAdmin) {
        countQuery += ` AND organization = $${countParamIndex++}`;
        countParams.push(userOrganization);
      }

      if (role) {
        countQuery += ` AND role = $${countParamIndex++}`;
        countParams.push(role);
      }

      if (status) {
        countQuery += ` AND status = $${countParamIndex++}`;
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
        scope: isAdmin ? 'all' : 'organization',
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
    body('role').notEmpty().withMessage('Role is required')
      .isString().withMessage('Role must be a string'),
    body('organization').notEmpty().withMessage('Organization is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const requestingUser = (req as any).user;
      const userRole = requestingUser?.role;
      const userOrganization = requestingUser?.organization;
      const isAdmin = userRole === 'ADMIN';

      // Check permissions
      const canManageUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(userRole);

      if (!canManageUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to create users',
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

      // Organization-scoped creation: non-ADMIN users can only create users in their organization
      if (!isAdmin && organization !== userOrganization) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `You can only create users in your organization (${userOrganization})`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Role validation: non-ADMIN users cannot create ADMIN users
      if (!isAdmin && role === 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only super admins can create ADMIN users',
          },
          timestamp: new Date().toISOString(),
        });
      }

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
        'SELECT id FROM users WHERE username = $1 OR email = $2',
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', CURRENT_TIMESTAMP) RETURNING id`,
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

      const newUserId = result.rows[0]?.id || 'unknown';

      logger.info(`User created: ${username} (${role}) by ${requestingUser.username} (${userRole})`);

      // Log to audit trail
      await logUserActivity(
        requestingUser.userId,
        requestingUser.username,
        'CREATE_USER',
        newUserId.toString(),
        username,
        { role, organization, email },
        requestingUser.username,
        userRole,
        req
      );

      res.status(201).json({
        success: true,
        data: {
          id: newUserId,
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
      const isAdmin = requestingUser.role === 'ADMIN';
      const isSameOrg = async (targetUserId: string) => {
        const targetUser = await db.get('SELECT organization FROM users WHERE id = $1', [targetUserId]);
        return targetUser && targetUser.organization === requestingUser.organization;
      };

      // Check permissions: Admin, same organization admin, or own profile
      const isOwnProfile = requestingUser.userId === userId;
      const canViewOrgUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(requestingUser.role);

      if (!isAdmin && !isOwnProfile && !canViewOrgUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own profile',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // If not admin and not own profile, must be same organization
      if (!isAdmin && !isOwnProfile) {
        const sameOrg = await isSameOrg(userId);
        if (!sameOrg) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You can only view users in your organization',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const user = await db.get(
        `SELECT id, username, email, full_name, role, organization, 
         exporter_id, ecta_license, phone, permissions, status, created_at, last_login
         FROM users WHERE id = $1`,
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

      const isAdmin = requestingUser.role === 'ADMIN';
      const isOwnProfile = requestingUser.userId === userId;
      const canManageUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(requestingUser.role);

      // Get target user to check organization and role
      const targetUser = await db.get('SELECT organization, role, username FROM users WHERE id = $1', [userId]);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const isSameOrg = targetUser.organization === requestingUser.organization;
      const targetIsPortalAdmin = ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(targetUser.role);

      // CRITICAL: Only super admin (ADMIN role) can modify portal admins
      if (targetIsPortalAdmin && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only super administrators can modify portal administrators',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check permissions
      if (!isOwnProfile && !canManageUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own profile',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Non-admin organization managers can only update users in their organization
      if (!isAdmin && !isOwnProfile && !isSameOrg) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update users in your organization',
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

      // Only admins and org managers can update permissions
      if (permissions && (isAdmin || (canManageUsers && isSameOrg))) {
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

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $1`;
      await db.run(query, params);

      logger.info(`User updated: ${userId} by ${requestingUser.username}`);

      // Fetch updated user
      const updatedUser = await db.get(
        `SELECT id, username, email, full_name, role, organization, 
         exporter_id, ecta_license, phone, permissions, status
         FROM users WHERE id = $1`,
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
        'SELECT password_hash FROM users WHERE id = $1',
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
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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

      const isAdmin = requestingUser.role === 'ADMIN';
      const canManageUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(requestingUser.role);

      if (!canManageUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to change user status',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get target user to check organization and role
      const targetUser = await db.get('SELECT username, organization, role FROM users WHERE id = $1', [userId]);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const isSameOrg = targetUser.organization === requestingUser.organization;
      const targetIsPortalAdmin = ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(targetUser.role);

      // CRITICAL: Only super admin (ADMIN role) can suspend/activate portal admins
      if (targetIsPortalAdmin && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only super administrators can change status of portal administrators',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Non-admin users can only change status of users in their organization
      if (!isAdmin && !isSameOrg) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only change status of users in your organization',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Update status
      await db.run(
        'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, userId]
      );

      logger.info(`User status updated: ${userId} -> ${status} by ${requestingUser.username} (Reason: ${reason || 'N/A'})`);

      // Log to audit trail
      await logUserActivity(
        requestingUser.userId,
        requestingUser.username,
        status === 'active' ? 'ACTIVATE_USER' : status === 'suspended' ? 'SUSPEND_USER' : 'DEACTIVATE_USER',
        userId,
        targetUser.username,
        { status, reason },
        requestingUser.username,
        requestingUser.role,
        req
      );

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
 * /api/v1/users/reset-password-by-identifier:
 *   post:
 *     summary: Reset user password by email or exporter ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               exporterId:
 *                 type: string
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
router.post('/reset-password-by-identifier',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { email, exporterId } = req.body;
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

      if (!email && !exporterId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_IDENTIFIER',
            message: 'Either email or exporterId is required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Find user by email or exporter_id
      let user;
      if (exporterId) {
        user = await db.get(
          'SELECT id, username, email, full_name, exporter_id FROM users WHERE exporter_id = $1 OR username = $1',
          [exporterId]
        );
      } else if (email) {
        user = await db.get(
          'SELECT id, username, email, full_name, exporter_id FROM users WHERE email = $1',
          [email]
        );
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: `No user account found for ${exporterId ? 'exporter ID: ' + exporterId : 'email: ' + email}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Reset password to default
      const defaultPassword = 'password123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await db.run(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, user.id]
      );

      // Log the password reset
      await logUserActivity(
        requestingUser.userId || requestingUser.id,
        requestingUser.username,
        'RESET_PASSWORD',
        user.id,
        user.username,
        {
          resetBy: requestingUser.username,
          resetMethod: exporterId ? 'exporterId' : 'email',
          identifier: exporterId || email,
        },
        requestingUser.username,
        requestingUser.role,
        req
      );

      logger.info(`✅ Password reset for user: ${user.username} (${user.email}) by ${requestingUser.username}`);

      res.json({
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          email: user.email,
          message: 'Password has been reset to "password123"',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error resetting password by identifier:', error);
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
        'SELECT id, username, email, full_name FROM users WHERE id = $1',
        [userId]
      );

      if (!user) {
        // User doesn't exist - check if there's an approved exporter application
        logger.warn(`User ID ${userId} not found. Checking for approved exporter application...`);
        
        // Try to find approved exporter by matching the user ID pattern
        const exporterApp = await db.get(
          `SELECT * FROM exporter_applications 
           WHERE status = 'approved' 
           AND id = $1
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
            ) VALUES ($1, $2, $3, $4, 'EXPORTER', $5, $6, $7, 'active', $8, $9, CURRENT_TIMESTAMP)`,
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
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, userId]
      );

      logger.info(`Password reset to default for user: ${user.username} (${userId}) by admin: ${requestingUser.username}`);

      // Log to audit trail
      await logUserActivity(
        requestingUser.userId,
        requestingUser.username,
        'RESET_PASSWORD',
        userId,
        user.username,
        { method: 'admin_reset', resetTo: 'default' },
        requestingUser.username,
        requestingUser.role,
        req
      );

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
        'SELECT id, username, email FROM users WHERE status = $1',
        ['active']
      );

      // Update all passwords
      await db.run(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE status = $2',
        [hashedPassword, 'active']
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

      const isAdmin = requestingUser.role === 'ADMIN';
      const canManageUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(requestingUser.role);

      // Check if user has permission to delete
      if (!canManageUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete users',
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

      // Get target user to check organization and role
      const targetUser = await db.get('SELECT username, organization, role FROM users WHERE id = $1', [userId]);
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const isSameOrg = targetUser.organization === requestingUser.organization;
      const targetIsPortalAdmin = ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(targetUser.role);

      // CRITICAL: Only super admin (ADMIN role) can delete portal admins
      if (targetIsPortalAdmin && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only super administrators can delete portal administrators',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Non-admin users can only delete users in their organization
      if (!isAdmin && !isSameOrg) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete users in your organization',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Soft delete: set status to inactive
      await db.run(
        'UPDATE users SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      logger.info(`User deleted (soft): ${userId} by ${requestingUser.username} (${requestingUser.role})`);

      // Log to audit trail
      await logUserActivity(
        requestingUser.userId,
        requestingUser.username,
        'DELETE_USER',
        userId,
        targetUser.username,
        { method: 'soft_delete', organization: targetUser.organization },
        requestingUser.username,
        requestingUser.role,
        req
      );

      res.json({
        success: true,
        data: { 
          message: 'User deleted successfully',
          userId: userId,
          username: targetUser.username,
        },
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

/**
 * @swagger
 * /api/v1/users/{userId}/permissions:
 *   put:
 *     summary: Update user permissions (Admin only)
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
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission strings
 *               action:
 *                 type: string
 *                 enum: [set, grant, revoke]
 *                 default: set
 *                 description: Action to perform (set=replace all, grant=add, revoke=remove)
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/permissions',
  authMiddleware,
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('permissions').isArray().withMessage('Permissions must be an array'),
    body('action').optional().isIn(['set', 'grant', 'revoke']).withMessage('Invalid action'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;
      const { permissions, action = 'set' } = req.body;

      // Only admins can update permissions
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can update user permissions',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get current user
      const user = await db.get(
        'SELECT id, username, permissions FROM users WHERE id = $1',
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

      // Parse current permissions
      let currentPermissions: string[] = JSON.parse(user.permissions || '[]');
      let newPermissions: string[];

      // Handle action
      switch (action) {
        case 'grant':
          // Add new permissions (avoid duplicates)
          newPermissions = Array.from(new Set([...currentPermissions, ...permissions]));
          break;
        case 'revoke':
          // Remove specified permissions
          newPermissions = currentPermissions.filter(p => !permissions.includes(p));
          break;
        case 'set':
        default:
          // Replace all permissions
          newPermissions = permissions;
          break;
      }

      // Update permissions
      await db.run(
        'UPDATE users SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(newPermissions), userId]
      );

      // Log to audit trail
      logger.info(`Permissions updated for user ${user.username}: ${action} - ${permissions.join(', ')}`);
      logger.info(`Updated by: ${requestingUser.username} (${requestingUser.role})`);

      await logUserActivity(
        requestingUser.userId,
        requestingUser.username,
        action === 'grant' ? 'GRANT_PERMISSION' : action === 'revoke' ? 'REVOKE_PERMISSION' : 'UPDATE_PERMISSIONS',
        userId,
        user.username,
        { action, permissions, newPermissions },
        requestingUser.username,
        requestingUser.role,
        req
      );

      res.json({
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          action,
          permissions: newPermissions,
          added: action === 'grant' ? permissions : undefined,
          removed: action === 'revoke' ? permissions : undefined,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error updating permissions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update permissions',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/activity-log:
 *   get:
 *     summary: Get user management activity log (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by specific user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, SUSPEND, ACTIVATE, GRANT_PERMISSION, REVOKE_PERMISSION, RESET_PASSWORD]
 *         description: Filter by action type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Activity log retrieved successfully
 */
router.get('/activity-log',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const requestingUser = (req as any).user;

      // Only admins can view activity log
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can view activity log',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { userId, action, limit = 50, offset = 0 } = req.query;

      // Query from audit table (assuming we have one)
      let query = `
        SELECT * FROM user_activity_log 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (action) {
        query += ' AND action = ?';
        params.push(action);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit as string), parseInt(offset as string));

      const logs = await db.all(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM user_activity_log WHERE 1=1';
      const countParams: any[] = [];

      if (userId) {
        countQuery += ' AND user_id = ?';
        countParams.push(userId);
      }

      if (action) {
        countQuery += ' AND action = ?';
        countParams.push(action);
      }

      const countResult = await db.get(countQuery, countParams);

      res.json({
        success: true,
        data: logs,
        pagination: {
          total: countResult.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error retrieving activity log:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve activity log',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/users/debug/exporter/:exporterId
 * Debug endpoint to check exporter data retrieval
 */
router.get('/debug/exporter/:exporterId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { exporterId } = req.params;

      const user = await db.get(
        `SELECT 
         u.id, u.username, u.full_name, u.phone as user_phone, u.exporter_id,
         ea.contact_person, ea.phone as contact_phone, ea.company_name, ea.email as contact_email
         FROM users u
         LEFT JOIN exporter_applications ea ON u.exporter_id = ea.exporter_id
         WHERE u.exporter_id = $1`,
        [exporterId]
      );

      res.json({
        success: true,
        debug: {
          query: 'SELECT u.id, u.username, u.full_name, u.phone as user_phone, u.exporter_id, ea.contact_person, ea.phone as contact_phone, ea.company_name FROM users u LEFT JOIN exporter_applications ea ON u.exporter_id = ea.license_number WHERE u.exporter_id = $1',
          params: [exporterId],
          result: user,
          fieldCheck: {
            has_contact_person: !!user?.contact_person,
            has_contact_phone: !!user?.contact_phone,
            has_user_phone: !!user?.user_phone,
            contact_person_value: user?.contact_person || 'NULL',
            contact_phone_value: user?.contact_phone || 'NULL',
            user_phone_value: user?.user_phone || 'NULL',
          }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

export default router;


/**
 * GET /api/v1/users/by-exporter/:exporterId
 * Get user by exporter ID with company info
 */
router.get('/by-exporter/:exporterId',
  authMiddleware,
  [param('exporterId').notEmpty().withMessage('Exporter ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { exporterId } = req.params;

      // Join with exporter_applications to get company name and contact info
      const user = await db.get(
        `SELECT 
         u.id, 
         u.username, 
         u.email, 
         u.full_name, 
         u.role, 
         u.organization, 
         u.exporter_id, 
         u.ecta_license, 
         u.phone as user_phone, 
         u.permissions, 
         u.status, 
         u.created_at, 
         u.last_login,
         ea.company_name, 
         ea.contact_person, 
         ea.phone as contact_phone, 
         ea.email as contact_email,
         ea.bank_name, 
         ea.bank_branch
         FROM users u
         LEFT JOIN exporter_applications ea ON u.exporter_id = ea.exporter_id
         WHERE u.exporter_id = $1`,
        [exporterId]
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
      
      // Add logging to see what we got
      logger.info('[USERS] Retrieved user by exporter ID:', {
        exporterId,
        contact_person: user.contact_person,
        contact_phone: user.contact_phone,
        user_phone: user.user_phone,
        company_name: user.company_name,
      });

      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error retrieving user by exporter ID:', error);
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

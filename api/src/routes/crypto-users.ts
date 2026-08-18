// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Cryptographic User Management Routes

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import CryptoUserService from '../services/cryptoUserService';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const cryptoService = CryptoUserService.getInstance();
const db = DatabaseService.getInstance();

// ============================================================================
// BLOCKCHAIN IDENTITY MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/crypto-users/enroll:
 *   post:
 *     summary: Enroll user with blockchain cryptographic identity
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - username
 *               - role
 *               - organization
 *             properties:
 *               userId:
 *                 type: integer
 *               username:
 *                 type: string
 *               role:
 *                 type: string
 *               organization:
 *                 type: string
 *     responses:
 *       201:
 *         description: User enrolled successfully
 */
router.post('/enroll',
  authMiddleware,
  [
    body('userId').isInt().withMessage('User ID must be an integer'),
    body('username').notEmpty().withMessage('Username is required'),
    body('role').notEmpty().withMessage('Role is required'),
    body('organization').notEmpty().withMessage('Organization is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const requestingUser = (req as any).user;

      // Only admins can enroll users
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can enroll users with blockchain identities',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { userId, username, role, organization } = req.body;

      // Enroll user
      const identity = await cryptoService.enrollUser(
        userId,
        username,
        role,
        organization
      );

      logger.info(`User ${username} enrolled with blockchain identity by ${requestingUser.username}`);

      res.status(201).json({
        success: true,
        data: {
          userId: identity.userId,
          username: identity.username,
          mspId: identity.mspId,
          enrollmentId: identity.enrollmentId,
          certificateHash: identity.certificateHash,
          expiresAt: identity.expiresAt,
          status: identity.status,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error enrolling user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ENROLLMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to enroll user',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/crypto-users/{userId}/identity:
 *   get:
 *     summary: Get blockchain identity for user
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:userId/identity',
  authMiddleware,
  [param('userId').isInt().withMessage('User ID must be an integer')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;

      // Check permissions
      const isAdmin = requestingUser.role === 'ADMIN' || requestingUser.role === 'ECTA';
      const isOwnProfile = requestingUser.userId === parseInt(userId);

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own blockchain identity',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const identity = await cryptoService.getBlockchainIdentity(parseInt(userId));

      if (!identity) {
        // Return success with null data instead of 404 if identity not found
        return res.json({
          success: true,
          data: null,
          message: 'No blockchain identity found for this user',
          timestamp: new Date().toISOString(),
        });
      }

      // Don't expose private keys or full certificates in API response
      res.json({
        success: true,
        data: {
          userId: identity.userId,
          username: identity.username,
          mspId: identity.mspId,
          enrollmentId: identity.enrollmentId,
          certificateHash: identity.certificateHash,
          createdAt: identity.createdAt,
          expiresAt: identity.expiresAt,
          status: identity.status,
          revokedAt: identity.revokedAt,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error retrieving blockchain identity:', error);
      // Return success with null instead of 500 error
      res.json({
        success: true,
        data: null,
        message: 'Blockchain network unavailable or identity not found',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/crypto-users/identities:
 *   get:
 *     summary: Get all blockchain identities (Admin only)
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/identities',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const requestingUser = (req as any).user;

      // Only admins can view all identities
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can view all blockchain identities',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const identities = await cryptoService.getAllIdentities();

      // Filter sensitive data
      const sanitizedIdentities = identities.map(id => ({
        userId: id.userId,
        username: id.username,
        mspId: id.mspId,
        enrollmentId: id.enrollmentId,
        certificateHash: id.certificateHash,
        createdAt: id.createdAt,
        expiresAt: id.expiresAt,
        status: id.status,
        revokedAt: id.revokedAt,
      }));

      res.json({
        success: true,
        data: sanitizedIdentities,
        total: sanitizedIdentities.length,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.warn('Blockchain network unavailable - returning empty identities list');
      // Return empty list instead of error when blockchain is unavailable
      res.json({
        success: true,
        data: [],
        total: 0,
        timestamp: new Date().toISOString(),
        warning: 'Blockchain network unavailable - identity data not accessible',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/crypto-users/{userId}/revoke:
 *   post:
 *     summary: Revoke user's blockchain identity (Admin only)
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:userId/revoke',
  authMiddleware,
  [
    param('userId').isInt().withMessage('User ID must be an integer'),
    body('reason').notEmpty().withMessage('Revocation reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const requestingUser = (req as any).user;

      const isAdmin = requestingUser.role === 'ADMIN';
      const canManageUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(requestingUser.role);

      // Check if user has permission to revoke
      if (!canManageUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to revoke blockchain identities',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get target user to check organization
      const targetUser = await db.get('SELECT username, organization FROM users WHERE id = $1', [parseInt(userId)]);
      
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

      // Non-admin users can only revoke identities in their organization
      if (!isAdmin && !isSameOrg) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only revoke blockchain identities in your organization',
          },
          timestamp: new Date().toISOString(),
        });
      }

      await cryptoService.revokeIdentity(parseInt(userId), reason);

      logger.warn(`Blockchain identity revoked for user ${userId} by ${requestingUser.username}: ${reason}`);

      res.json({
        success: true,
        data: {
          message: 'Blockchain identity revoked successfully',
          userId: parseInt(userId),
          reason,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error revoking blockchain identity:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REVOCATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to revoke identity',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/crypto-users/{userId}/renew-certificate:
 *   post:
 *     summary: Renew user's blockchain certificate
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:userId/renew-certificate',
  authMiddleware,
  [
    param('userId').isInt().withMessage('User ID must be an integer'),
    body('validityDays').optional().isInt({ min: 1, max: 730 }).withMessage('Validity must be between 1 and 730 days'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { validityDays = 365 } = req.body;
      const requestingUser = (req as any).user;

      const isAdmin = requestingUser.role === 'ADMIN';
      const canManageUsers = ['ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(requestingUser.role);

      // Check if user has permission to renew certificates
      if (!canManageUsers) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to renew certificates',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get target user to check organization
      const targetUser = await db.get('SELECT username, organization FROM users WHERE id = $1', [parseInt(userId)]);
      
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

      // Non-admin users can only renew certificates in their organization
      if (!isAdmin && !isSameOrg) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only renew certificates in your organization',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const identity = await cryptoService.renewCertificate(
        parseInt(userId),
        validityDays
      );

      logger.info(`Certificate renewed for user ${identity.username} by ${requestingUser.username}`);

      res.json({
        success: true,
        data: {
          userId: identity.userId,
          username: identity.username,
          certificateHash: identity.certificateHash,
          expiresAt: identity.expiresAt,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error renewing certificate:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RENEWAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to renew certificate',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/crypto-users/expiring-certificates:
 *   get:
 *     summary: Get certificates expiring soon (Admin only)
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/expiring-certificates',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const requestingUser = (req as any).user;

      // Only admins can view expiring certificates
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can view expiring certificates',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const expiringCerts = await cryptoService.checkExpiringCertificates();

      const sanitized = expiringCerts.map(cert => ({
        userId: cert.userId,
        username: cert.username,
        mspId: cert.mspId,
        expiresAt: cert.expiresAt,
        daysRemaining: Math.floor((cert.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      }));

      res.json({
        success: true,
        data: sanitized,
        total: sanitized.length,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.warn('Blockchain network unavailable - returning empty certificates list');
      // Return empty list instead of error when blockchain is unavailable
      res.json({
        success: true,
        data: [],
        total: 0,
        timestamp: new Date().toISOString(),
        warning: 'Blockchain network unavailable - certificate data not accessible',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/crypto-users/sign:
 *   post:
 *     summary: Sign data with user's private key
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sign',
  authMiddleware,
  [body('data').notEmpty().withMessage('Data to sign is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { data } = req.body;
      const requestingUser = (req as any).user;

      const signature = await cryptoService.signData(requestingUser.username, data);

      res.json({
        success: true,
        data: {
          signature,
          algorithm: 'SHA256withRSA',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error signing data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SIGNING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to sign data',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/crypto-users/verify:
 *   post:
 *     summary: Verify cryptographic signature
 *     tags: [Crypto Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/verify',
  authMiddleware,
  [
    body('userId').isInt().withMessage('User ID must be an integer'),
    body('data').notEmpty().withMessage('Data is required'),
    body('signature').notEmpty().withMessage('Signature is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId, data, signature } = req.body;

      const isValid = await cryptoService.verifySignature(userId, data, signature);

      res.json({
        success: true,
        data: {
          valid: isValid,
          userId,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error verifying signature:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to verify signature',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

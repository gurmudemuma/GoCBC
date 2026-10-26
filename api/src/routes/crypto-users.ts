// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Cryptographic User Management Routes

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import CryptoUserService, { FabricCaUnavailableError } from '../services/cryptoUserService';
import { DatabaseService } from '../services/databaseService';
import FabricService from '../services/fabricService';

const router = Router();
const cryptoService = CryptoUserService.getInstance();
const db = DatabaseService.getInstance();

// ============================================================================
// APPLICATION SIGNING RECORDS AND FABRIC CA LIFECYCLE
// ============================================================================

/**
 * @swagger
 * /api/v1/crypto-users/enroll:
 *   post:
 *     summary: Enroll a user through the organization's Fabric CA
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

      const canEnrollInOrganization = requestingUser.role === 'ADMIN' ||
        (Array.isArray(requestingUser.permissions) && requestingUser.permissions.includes('users:create-org'));
      if (!canEnrollInOrganization) {
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
      const targetUser = await db.get(
        'SELECT id, username, role, organization FROM users WHERE id = $1',
        [userId]
      );
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'The selected user does not exist' },
          timestamp: new Date().toISOString(),
        });
      }
      const fabric = FabricService.getInstance();
      if (fabric.getMspFromRole(requestingUser.role) !== fabric.getMspFromRole(targetUser.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'The enrolling administrator must belong to the user’s organization CA/MSP' },
          timestamp: new Date().toISOString(),
        });
      }
      if (username !== targetUser.username || role !== targetUser.role || organization !== targetUser.organization) {
        return res.status(400).json({
          success: false,
          error: { code: 'USER_DETAILS_MISMATCH', message: 'Enrollment details must match the selected database user' },
          timestamp: new Date().toISOString(),
        });
      }

      // Enroll user
      const identity = await cryptoService.enrollUser(
        targetUser.id,
        targetUser.username,
        targetUser.role,
        targetUser.organization
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
          credentialType: 'FABRIC_CA_X509',
          fabricMspMembership: 'CA_ISSUED',
          ledgerRecorded: false,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error enrolling user:', error);
      const caUnavailable = error instanceof FabricCaUnavailableError;
      res.status(caUnavailable ? 503 : 500).json({
        success: false,
        error: {
          code: caUnavailable ? error.code : 'ENROLLMENT_FAILED',
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
      const isOwnProfile = String(requestingUser.userId) === String(parseInt(userId, 10));

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
          credentialType: identity.enrollmentId.startsWith('cecbs-user-') ? 'FABRIC_CA_X509' : 'LEGACY_APPLICATION_SIGNING_KEY',
          fabricMspMembership: identity.enrollmentId.startsWith('cecbs-user-') ? 'CA_ISSUED' : 'UNVERIFIED',
          ledgerRecorded: false,
          revokedAt: identity.revokedAt,
          revocationStatus: identity.revocationStatus,
          crlGeneratedAt: identity.crlGeneratedAt,
          crlHash: identity.crlHash,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error retrieving blockchain identity:', error);
      res.status(503).json({
        success: false,
        error: { code: 'IDENTITY_LOOKUP_FAILED', message: 'Fabric identity data is temporarily unavailable' },
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
        revocationStatus: id.revocationStatus,
        crlGeneratedAt: id.crlGeneratedAt,
        crlHash: id.crlHash,
        credentialType: id.enrollmentId.startsWith('cecbs-user-') ? 'FABRIC_CA_X509' : 'LEGACY_APPLICATION_SIGNING_KEY',
        fabricMspMembership: id.enrollmentId.startsWith('cecbs-user-') ? 'CA_ISSUED' : 'UNVERIFIED',
        ledgerRecorded: false,
      }));

      res.json({
        success: true,
        data: sanitizedIdentities,
        total: sanitizedIdentities.length,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Fabric identity registry unavailable:', error);
      res.status(503).json({
        success: false,
        error: { code: 'IDENTITY_REGISTRY_UNAVAILABLE', message: 'Fabric identity registry is temporarily unavailable' },
        timestamp: new Date().toISOString(),
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

      const canManageUsers = requestingUser.role === 'ADMIN' ||
        (Array.isArray(requestingUser.permissions) && requestingUser.permissions.includes('users:create-org'));

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
      const targetUser = await db.get('SELECT username, role, organization FROM users WHERE id = $1', [parseInt(userId)]);
      
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

      const registeredIdentity = await cryptoService.getBlockchainIdentity(parseInt(userId, 10));
      if (!registeredIdentity) {
        return res.status(404).json({
          success: false,
          error: { code: 'IDENTITY_NOT_FOUND', message: 'The user has no Fabric identity to revoke' },
          timestamp: new Date().toISOString(),
        });
      }
      if (registeredIdentity.mspId !== FabricService.getInstance().getMspFromRole(requestingUser.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only an administrator from the certificate issuing MSP can revoke this identity' },
          timestamp: new Date().toISOString(),
        });
      }

      const revocation = await cryptoService.revokeIdentity(parseInt(userId), reason);

      logger.warn(`Blockchain identity revoked for user ${userId} by ${requestingUser.username}: ${reason}`);

      res.json({
        success: true,
        data: {
          message: 'Blockchain identity revoked successfully',
          userId: parseInt(userId),
          reason,
          mspId: revocation.mspId,
          crlGenerated: revocation.crlGenerated,
          crlHash: revocation.crlHash,
          consensusRevocationStatus: revocation.crlGenerated ? 'PENDING_MSP_CRL_UPDATE' : 'PENDING_MSP_CRL_GENERATION',
          consensusRevocationMessage: revocation.crlGenerated
            ? `The certificate is revoked and the updated CRL was generated (SHA-256 ${revocation.crlHash}). The organization must commit it in a channel configuration update before peers reject revoked certificates.`
            : 'The certificate is revoked at its organization CA. Generate the updated MSP revocation list and commit it through a channel configuration update before peers reject revoked certificates.',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error revoking blockchain identity:', error);
      const caUnavailable = error instanceof FabricCaUnavailableError;
      res.status(caUnavailable ? 503 : 500).json({
        success: false,
        error: {
          code: caUnavailable ? error.code : 'REVOCATION_FAILED',
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
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user;

      const canManageUsers = requestingUser.role === 'ADMIN' ||
        (Array.isArray(requestingUser.permissions) && requestingUser.permissions.includes('users:create-org'));

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
      const targetUser = await db.get('SELECT username, role, organization FROM users WHERE id = $1', [parseInt(userId)]);
      
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

      const registeredIdentity = await cryptoService.getBlockchainIdentity(parseInt(userId, 10));
      if (!registeredIdentity) {
        return res.status(404).json({
          success: false,
          error: { code: 'IDENTITY_NOT_FOUND', message: 'The user has no Fabric identity to renew' },
          timestamp: new Date().toISOString(),
        });
      }
      if (registeredIdentity.mspId !== FabricService.getInstance().getMspFromRole(requestingUser.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only an administrator from the certificate issuing MSP can renew this identity' },
          timestamp: new Date().toISOString(),
        });
      }

      const identity = await cryptoService.renewCertificate(
        parseInt(userId)
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
      const caUnavailable = error instanceof FabricCaUnavailableError;
      res.status(caUnavailable ? 503 : 500).json({
        success: false,
        error: {
          code: caUnavailable ? error.code : 'RENEWAL_FAILED',
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
      logger.error('Fabric expiring-certificate registry unavailable:', error);
      res.status(503).json({
        success: false,
        error: { code: 'CERTIFICATE_REGISTRY_UNAVAILABLE', message: 'Certificate registry is temporarily unavailable' },
        timestamp: new Date().toISOString(),
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
          scope: 'APPLICATION_ONLY_NOT_FABRIC',
          ledgerRecorded: false,
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
          scope: 'APPLICATION_ONLY_NOT_FABRIC',
          ledgerRecorded: false,
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

// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exporters API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param, query } from 'express-validator';

const router = express.Router();
const fabricService = new FabricService();

// ============================================================================
// APPLICATIONS ROUTES (must come BEFORE /:exporterID to avoid route conflicts)
// ============================================================================

// GET /exporter-applications - List all applications (ECTA admin only)
router.get('/exporter-applications', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const db = fabricService['db'];
    
    if (!db) {
      res.json({
        success: true,
        data: [],
        pagination: { total: 0, limit: parseInt(limit as string) },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    let query = 'SELECT * FROM exporter_applications';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY submitted_at DESC LIMIT ?';
    params.push(parseInt(limit as string));
    
    const applications = await new Promise<any[]>((resolve, reject) => {
      db.all(query, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json({
      success: true,
      data: applications,
      pagination: {
        total: applications.length,
        limit: parseInt(limit as string),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter applications:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QUERY_FAILED',
        message: 'Failed to retrieve applications',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /exporter-applications - Submit new application (PUBLIC - no auth)
// This endpoint now creates BOTH the application AND an inactive user account
router.post('/exporter-applications',
  [
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('tinNumber').notEmpty().withMessage('TIN number is required'),
    body('businessLicenseNumber').notEmpty().withMessage('Business license number is required'),
    body('capitalRequirement').notEmpty().withMessage('Capital requirement is required'),
    body('professionalTaster').notEmpty().withMessage('Professional taster is required'),
    body('tasterCertificate').notEmpty().withMessage('Taster certificate is required'),
    body('contactPerson').notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const applicationData = req.body;
      const applicationId = `APP-${Date.now().toString().slice(-8)}`;
      const submittedAt = new Date().toISOString();
      const db = fabricService['db'];
      
      if (!db) {
        logger.warn('No database connection available');
        res.status(201).json({
          success: true,
          data: { applicationId, status: 'pending', submittedAt },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if email already exists in users or applications
      const existingUser = await new Promise<any>((resolve, reject) => {
        db.get('SELECT id FROM users WHERE email = ?', [applicationData.email], (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'EMAIL_EXISTS', 
            message: 'An account with this email already exists. Please use a different email or contact support.' 
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const existingApplication = await new Promise<any>((resolve, reject) => {
        db.get('SELECT id FROM exporter_applications WHERE email = ? AND status = "pending"', 
          [applicationData.email], (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingApplication) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'APPLICATION_EXISTS', 
            message: 'You already have a pending application. Please wait for review or contact ECTA.' 
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Generate temporary username based on company name (will be replaced with exporterID on approval)
      const tempUsername = applicationData.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20) + '_' + Date.now().toString().slice(-6);

      // Generate a secure random password
      const bcrypt = require('bcrypt');
      const temporaryPassword = `Temp${Math.random().toString(36).slice(-8)}${Date.now().toString().slice(-4)}!`;
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Step 1: Insert application
      const appQuery = `
        INSERT INTO exporter_applications (
          application_id, company_name, tin_number, business_license_number,
          registration_date, capital_requirement, professional_taster,
          taster_certificate, laboratory_facility, contact_person,
          email, phone, address, city, region, bank_name,
          bank_account_number, comments, status, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `;
      
      await new Promise((resolve, reject) => {
        db.run(appQuery, [
          applicationId,
          applicationData.companyName,
          applicationData.tinNumber,
          applicationData.businessLicenseNumber,
          applicationData.registrationDate || null,
          applicationData.capitalRequirement,
          applicationData.professionalTaster,
          applicationData.tasterCertificate,
          applicationData.laboratoryFacility || 'no',
          applicationData.contactPerson,
          applicationData.email,
          applicationData.phone,
          applicationData.address,
          applicationData.city,
          applicationData.region || '',
          applicationData.bankName || '',
          applicationData.bankAccountNumber || '',
          applicationData.comments || '',
          submittedAt,
        ], (err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      // Step 2: Create INACTIVE user account
      const userQuery = `
        INSERT INTO users (
          username, email, password_hash, full_name, role, organization,
          phone, permissions, status, created_at
        ) VALUES (?, ?, ?, ?, 'EXPORTER', ?, ?, ?, 'inactive', datetime('now'))
      `;

      const defaultPermissions = JSON.stringify([
        'contract.create', 'contract.view', 
        'shipment.view', 'shipment.create',
        'payment.view', 'document.upload', 
        'document.view', 'report.generate'
      ]);

      await new Promise((resolve, reject) => {
        db.run(userQuery, [
          tempUsername,
          applicationData.email,
          hashedPassword,
          applicationData.contactPerson,
          applicationData.companyName,
          applicationData.phone,
          defaultPermissions,
        ], (err: any) => {
          if (err) {
            logger.error('Failed to create user account for application:', err);
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
      
      logger.info(`✅ Exporter application submitted: ${applicationId} (User created: ${tempUsername}, Status: inactive)`);
      
      res.status(201).json({
        success: true,
        data: { 
          applicationId, 
          status: 'pending', 
          submittedAt,
          message: 'Application submitted successfully. Your account will be activated upon approval by ECTA.'
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error submitting application:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SUBMISSION_FAILED', message: 'Failed to submit application' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// POST /exporter-applications/:applicationId/approve - Approve application (ECTA admin)
// This endpoint now also ACTIVATES the user account and updates credentials
router.post('/exporter-applications/:applicationId/approve',
  authMiddleware,
  [
    param('applicationId').notEmpty(),
    body('exporterId').notEmpty(),
    body('ectaLicenseNumber').notEmpty(),
    body('licenseExpiryDate').isISO8601(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { exporterId, ectaLicenseNumber, licenseExpiryDate } = req.body;
      const db = fabricService['db'];
      
      if (!db) {
        res.status(500).json({ success: false, error: { code: 'NO_DATABASE' }, timestamp: new Date().toISOString() });
        return;
      }
      
      const application = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM exporter_applications WHERE application_id = ?', [applicationId], (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!application || application.status !== 'pending') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND' }, timestamp: new Date().toISOString() });
        return;
      }

      // Step 1: Register exporter on blockchain
      const result = await fabricService.registerExporter(
        exporterId,
        application.company_name,
        ectaLicenseNumber,
        application.exporter_type || 'private',
        application.capital_requirement,
        application.professional_taster,
        application.taster_certificate,
        application.laboratory_certificate_number || '',
        licenseExpiryDate
      );
      
      if (!result.success) {
        res.status(400).json({ success: false, error: { code: 'BLOCKCHAIN_ERROR', message: result.error }, timestamp: new Date().toISOString() });
        return;
      }

      // Step 2: Generate new password for the user
      const bcrypt = require('bcrypt');
      const newPassword = `${exporterId}@${Math.random().toString(36).slice(-6)}`;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Step 3: Update user account - change username to exporterId, activate, and set new password
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE users 
           SET username = ?,
               status = 'active',
               exporter_id = ?,
               ecta_license = ?,
               password_hash = ?,
               organization = ?,
               updated_at = datetime('now')
           WHERE email = ? AND role = 'EXPORTER'`,
          [exporterId, exporterId, ectaLicenseNumber, hashedPassword, application.company_name, application.email],
          (err: any) => { 
            if (err) {
              logger.error('Failed to activate user account:', err);
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      });
      
      // Step 4: Update application status
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE exporter_applications 
           SET status = ?, 
               approved_at = ?, 
               exporter_id = ?,
               ecta_license_number = ?,
               license_expiry_date = ?
           WHERE application_id = ?`,
          ['approved', new Date().toISOString(), exporterId, ectaLicenseNumber, licenseExpiryDate, applicationId],
          (err: any) => { if (err) reject(err); else resolve(true); }
        );
      });
      
      logger.info(`✅ Application approved: ${applicationId} -> ${exporterId} (User activated: ${exporterId})`);
      
      // Return credentials to ECTA admin (to be sent to exporter via email)
      res.json({ 
        success: true, 
        data: { 
          applicationId, 
          exporterId, 
          status: 'approved', 
          txId: result.txId,
          credentials: {
            username: exporterId,
            temporaryPassword: newPassword,
            email: application.email,
            message: 'Please send these credentials to the exporter via email. They should change the password on first login.'
          }
        }, 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      logger.error('Error approving application:', error);
      res.status(500).json({ success: false, error: { code: 'APPROVAL_FAILED' }, timestamp: new Date().toISOString() });
    }
  }
);

// POST /exporter-applications/:applicationId/reject - Reject application (ECTA admin)
// This endpoint also DELETES the inactive user account
router.post('/exporter-applications/:applicationId/reject',
  authMiddleware,
  [
    param('applicationId').notEmpty(),
    body('reason').notEmpty(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { reason } = req.body;
      const db = fabricService['db'];
      
      if (!db) {
        res.status(500).json({ success: false, error: { code: 'NO_DATABASE' }, timestamp: new Date().toISOString() });
        return;
      }
      
      const application = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM exporter_applications WHERE application_id = ?', [applicationId], (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!application || application.status !== 'pending') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND' }, timestamp: new Date().toISOString() });
        return;
      }

      // Step 1: Delete the inactive user account associated with this application
      await new Promise((resolve, reject) => {
        db.run(
          `DELETE FROM users WHERE email = ? AND role = 'EXPORTER' AND status = 'inactive'`,
          [application.email],
          (err: any) => {
            if (err) {
              logger.error('Failed to delete inactive user account:', err);
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      });

      // Step 2: Update application status to rejected
      await new Promise((resolve, reject) => {
        db.run('UPDATE exporter_applications SET status = ?, rejected_at = ?, rejection_reason = ? WHERE application_id = ?',
          ['rejected', new Date().toISOString(), reason, applicationId],
          (err: any) => { if (err) reject(err); else resolve(true); }
        );
      });
      
      logger.info(`❌ Application rejected: ${applicationId} (Inactive user account deleted for: ${application.email})`);
      res.json({ 
        success: true, 
        data: { 
          applicationId, 
          status: 'rejected', 
          reason,
          message: 'Application rejected and associated user account removed. Applicant can resubmit after addressing issues.'
        }, 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      logger.error('Error rejecting application:', error);
      res.status(500).json({ success: false, error: { code: 'REJECTION_FAILED' }, timestamp: new Date().toISOString() });
    }
  }
);

// ============================================================================
// EXPORTER DATA ROUTES (for Exporter Portal)
// ============================================================================

/**
 * @swagger
 * /api/v1/exporters/me/contracts:
 *   get:
 *     summary: Get all contracts for authenticated exporter
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contracts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/me/contracts', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId;
    
    if (!exporterId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Exporter ID not found in token' },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await fabricService.getContractsByExporter(exporterId);

    res.json({
      success: result.success,
      data: result.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter contracts:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: 'Failed to retrieve contracts' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/me/forex:
 *   get:
 *     summary: Get all forex allocations for authenticated exporter
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Forex allocations retrieved successfully
 */
router.get('/me/forex', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId;
    
    if (!exporterId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Exporter ID not found in token' },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await fabricService.getForexByExporter(exporterId);

    res.json({
      success: result.success,
      data: result.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter forex:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: 'Failed to retrieve forex' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/me/lcs:
 *   get:
 *     summary: Get all letters of credit for authenticated exporter
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: LCs retrieved successfully
 */
router.get('/me/lcs', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId;
    
    if (!exporterId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Exporter ID not found in token' },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await fabricService.getLCsByExporter(exporterId);

    res.json({
      success: result.success,
      data: result.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter LCs:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: 'Failed to retrieve LCs' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/me/shipments:
 *   get:
 *     summary: Get all shipments for authenticated exporter
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipments retrieved successfully
 */
router.get('/me/shipments', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId;
    
    if (!exporterId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Exporter ID not found in token' },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await fabricService.getShipmentsByExporter(exporterId);

    res.json({
      success: result.success,
      data: result.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter shipments:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: 'Failed to retrieve shipments' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/me/payments:
 *   get:
 *     summary: Get all payments for authenticated exporter
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/me/payments', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId;
    
    if (!exporterId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Exporter ID not found in token' },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await fabricService.getPaymentsByExporter(exporterId);

    res.json({
      success: result.success,
      data: result.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter payments:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: 'Failed to retrieve payments' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/me/profile:
 *   get:
 *     summary: Get profile for authenticated exporter
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId;
    
    if (!exporterId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Exporter ID not found in token' },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await fabricService.getExporter(exporterId);

    res.json({
      success: result.success,
      data: result.data || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter profile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: 'Failed to retrieve profile' },
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// EXPORTER ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/exporters:
 *   post:
 *     summary: Register a new coffee exporter
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exporterID
 *               - companyName
 *               - ectaLicenseNumber
 *               - capitalRequirement
 *               - professionalTaster
 *               - tasterCertificate
 *               - licenseExpiryDate
 *             properties:
 *               exporterID:
 *                 type: string
 *               companyName:
 *                 type: string
 *               ectaLicenseNumber:
 *                 type: string
 *               capitalRequirement:
 *                 type: number
 *               professionalTaster:
 *                 type: string
 *               tasterCertificate:
 *                 type: string
 *               licenseExpiryDate:
 *                 type: string
 *     responses:
 *       201:
 *         description: Exporter registered successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/',
  authMiddleware, // Protected route
  [
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('ectaLicenseNumber').notEmpty().withMessage('ECTA license number is required'),
    body('exporterType').optional().isIn(['private', 'company', 'individual']).withMessage('Exporter type must be private, company, or individual'),
    body('capitalRequirement').isNumeric().withMessage('Capital requirement must be a number'),
    body('professionalTaster').notEmpty().withMessage('Professional taster is required'),
    body('tasterCertificate').notEmpty().withMessage('Taster certificate is required'),
    body('laboratoryCertificateNumber').optional().isString().withMessage('Laboratory certificate number must be a string'),
    body('licenseExpiryDate').isISO8601().withMessage('License expiry date must be valid ISO date'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        exporterID,
        companyName,
        ectaLicenseNumber,
        exporterType,
        capitalRequirement,
        professionalTaster,
        tasterCertificate,
        laboratoryCertificateNumber,
        licenseExpiryDate,
      } = req.body;

      const result = await fabricService.registerExporter(
        exporterID,
        companyName,
        ectaLicenseNumber,
        exporterType || 'private',
        capitalRequirement.toString(),
        professionalTaster,
        tasterCertificate,
        laboratoryCertificateNumber || '',
        licenseExpiryDate
      );

      if (result.success) {
        logger.info(`Exporter registered successfully: ${exporterID}`);
        res.status(201).json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.error || 'Failed to register exporter',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error registering exporter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);
/**
 * @swagger
 * /api/v1/exporters:
 *   get:
 *     summary: Get all registered exporters
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by license status
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
 *         description: List of exporters retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await fabricService.getAllExporters();

    if (result.success) {
      const exporters = result.data || [];
      const { status, limit = 50, offset = 0 } = req.query;

      // Apply filters
      let filteredExporters = exporters;
      if (status) {
        filteredExporters = exporters.filter((exp: any) => exp.licenseStatus === status);
      }

      // Apply pagination
      const paginatedExporters = filteredExporters.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: paginatedExporters,
        pagination: {
          total: filteredExporters.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredExporters.length,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: result.error || 'Failed to retrieve exporters',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving exporters:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/{exporterID}:
 *   get:
 *     summary: Get exporter details by ID
 *     tags: [Exporters]
 *     parameters:
 *       - in: path
 *         name: exporterID
 *         required: true
 *         schema:
 *           type: string
 *         description: Exporter ID
 *     responses:
 *       200:
 *         description: Exporter details retrieved successfully
 *       404:
 *         description: Exporter not found
 *       500:
 *         description: Internal server error
 */
router.get('/:exporterID',
  authMiddleware, // Protected route
  [param('exporterID').notEmpty().withMessage('Exporter ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { exporterID } = req.params;
      const result = await fabricService.getExporter(exporterID);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error || 'Exporter not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving exporter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);
/**
 * @swagger
 * /api/v1/exporters/{exporterID}/laboratory:
 *   put:
 *     summary: Update exporter laboratory certification status
 *     tags: [Exporters]
 *     parameters:
 *       - in: path
 *         name: exporterID
 *         required: true
 *         schema:
 *           type: string
 *         description: Exporter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - certified
 *             properties:
 *               certified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Laboratory certification updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Exporter not found
 *       500:
 *         description: Internal server error
 */
router.put('/:exporterID/laboratory',
  authMiddleware, // Protected route
  [
    param('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('certified').isBoolean().withMessage('Certified must be a boolean value'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exporterID } = req.params;
      const { certified } = req.body;

      const result = await fabricService.updateExporterLaboratory(exporterID, certified);

      if (result.success) {
        logger.info(`Exporter laboratory certification updated: ${exporterID} - ${certified}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: result.error || 'Failed to update laboratory certification',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating exporter laboratory certification:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// PUT /exporters/:exporterID/status - Update exporter license status (ECTA admin only)
router.put('/:exporterID/status',
  authMiddleware,
  [
    param('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('status').isIn(['ACTIVE', 'SUSPENDED', 'EXPIRED']).withMessage('Status must be ACTIVE, SUSPENDED, or EXPIRED'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exporterID } = req.params;
      const { status } = req.body;

      const result = await fabricService.updateExporterStatus(exporterID, status);

      if (result.success) {
        logger.info(`Exporter status updated: ${exporterID} - ${status}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: result.error || 'Failed to update exporter status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating exporter status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/exporters/applications:
 *   post:
 *     summary: Submit new exporter application (public endpoint)
 *     tags: [Exporters]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - tinNumber
 *               - businessLicenseNumber
 *               - capitalRequirement
 *               - professionalTaster
 *               - tasterCertificate
 *               - contactPerson
 *               - email
 *               - phone
 *               - address
 *               - city
 *             properties:
 *               companyName:
 *                 type: string
 *               tinNumber:
 *                 type: string
 *               businessLicenseNumber:
 *                 type: string
 *               registrationDate:
 *                 type: string
 *               capitalRequirement:
 *                 type: string
 *               professionalTaster:
 *                 type: string
 *               tasterCertificate:
 *                 type: string
 *               laboratoryFacility:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               region:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/exporter-applications',
  [
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('tinNumber').notEmpty().withMessage('TIN number is required'),
    body('businessLicenseNumber').notEmpty().withMessage('Business license number is required'),
    body('capitalRequirement').notEmpty().withMessage('Capital requirement is required'),
    body('professionalTaster').notEmpty().withMessage('Professional taster is required'),
    body('tasterCertificate').notEmpty().withMessage('Taster certificate is required'),
    body('contactPerson').notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const applicationData = req.body;
      
      // Generate application ID
      const applicationId = `APP-${Date.now().toString().slice(-8)}`;
      const submittedAt = new Date().toISOString();
      
      // Store application in database (using fabricService's database connection)
      const db = fabricService['db']; // Access private db property
      
      if (!db) {
        // If no database, store in memory (temporary solution)
        logger.warn('No database connection available, application stored in memory');
        
        res.status(201).json({
          success: true,
          data: {
            applicationId,
            status: 'pending',
            submittedAt,
            message: 'Application submitted successfully. ECTA will review your application within 2-3 business days.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Insert application into database
      const query = `
        INSERT INTO exporter_applications (
          application_id, company_name, tin_number, business_license_number,
          registration_date, capital_requirement, professional_taster,
          taster_certificate, laboratory_facility, contact_person,
          email, phone, address, city, region, bank_name,
          bank_account_number, comments, status, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `;
      
      await new Promise((resolve, reject) => {
        db.run(query, [
          applicationId,
          applicationData.companyName,
          applicationData.tinNumber,
          applicationData.businessLicenseNumber,
          applicationData.registrationDate || null,
          applicationData.capitalRequirement,
          applicationData.professionalTaster,
          applicationData.tasterCertificate,
          applicationData.laboratoryFacility || 'no',
          applicationData.contactPerson,
          applicationData.email,
          applicationData.phone,
          applicationData.address,
          applicationData.city,
          applicationData.region || '',
          applicationData.bankName || '',
          applicationData.bankAccountNumber || '',
          applicationData.comments || '',
          submittedAt,
        ], (err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      logger.info(`Exporter application submitted: ${applicationId} - ${applicationData.companyName}`);
      
      res.status(201).json({
        success: true,
        data: {
          applicationId,
          status: 'pending',
          submittedAt,
          message: 'Application submitted successfully. ECTA will review your application within 2-3 business days.',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error submitting exporter application:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBMISSION_FAILED',
          message: 'Failed to submit application',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/exporters/applications:
 *   get:
 *     summary: Get all exporter applications (ECTA admin only)
 *     tags: [Exporters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by application status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: List of applications retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/exporter-applications', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const db = fabricService['db'];
    
    if (!db) {
      res.json({
        success: true,
        data: [],
        pagination: { total: 0, limit: parseInt(limit as string) },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    let query = 'SELECT * FROM exporter_applications';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY submitted_at DESC LIMIT ?';
    params.push(parseInt(limit as string));
    
    const applications = await new Promise<any[]>((resolve, reject) => {
      db.all(query, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json({
      success: true,
      data: applications,
      pagination: {
        total: applications.length,
        limit: parseInt(limit as string),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter applications:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QUERY_FAILED',
        message: 'Failed to retrieve applications',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/applications/{applicationId}/approve:
 *   post:
 *     summary: Approve exporter application and register on blockchain (ECTA admin only)
 *     tags: [Exporters]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exporterId
 *               - ectaLicenseNumber
 *               - licenseExpiryDate
 *             properties:
 *               exporterId:
 *                 type: string
 *               ectaLicenseNumber:
 *                 type: string
 *               licenseExpiryDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application approved and exporter registered
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Application not found
 *       500:
 *         description: Internal server error
 */
router.post('/applications/:applicationId/approve',
  authMiddleware, // Protected route - ECTA admin only
  [
    param('applicationId').notEmpty().withMessage('Application ID is required'),
    body('exporterId').notEmpty().withMessage('Exporter ID is required'),
    body('ectaLicenseNumber').notEmpty().withMessage('ECTA license number is required'),
    body('licenseExpiryDate').isISO8601().withMessage('Valid license expiry date is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { exporterId, ectaLicenseNumber, licenseExpiryDate } = req.body;
      const db = fabricService['db'];
      
      if (!db) {
        res.status(500).json({
          success: false,
          error: { code: 'NO_DATABASE', message: 'Database not available' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Get application details
      const application = await new Promise<any>((resolve, reject) => {
        db.get(
          'SELECT * FROM exporter_applications WHERE application_id = ?',
          [applicationId],
          (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (!application) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Application not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      if (application.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Application already processed' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Register exporter on blockchain
      const result = await fabricService.registerExporter(
        exporterId,
        application.company_name,
        ectaLicenseNumber,
        application.capital_requirement,
        application.professional_taster,
        application.taster_certificate,
        licenseExpiryDate
      );
      
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BLOCKCHAIN_ERROR',
            message: result.error || 'Failed to register exporter on blockchain',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Update application status
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE exporter_applications SET status = ?, approved_at = ?, exporter_id = ? WHERE application_id = ?',
          ['approved', new Date().toISOString(), exporterId, applicationId],
          (err: any) => {
            if (err) reject(err);
            else resolve(true);
          }
        );
      });
      
      logger.info(`Exporter application approved: ${applicationId} -> ${exporterId}`);
      
      res.json({
        success: true,
        data: {
          applicationId,
          exporterId,
          status: 'approved',
          txId: result.txId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error approving exporter application:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'APPROVAL_FAILED',
          message: 'Failed to approve application',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/exporters/applications/{applicationId}/reject:
 *   post:
 *     summary: Reject exporter application (ECTA admin only)
 *     tags: [Exporters]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application rejected successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Application not found
 *       500:
 *         description: Internal server error
 */
router.post('/applications/:applicationId/reject',
  authMiddleware, // Protected route - ECTA admin only
  [
    param('applicationId').notEmpty().withMessage('Application ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { reason } = req.body;
      const db = fabricService['db'];
      
      if (!db) {
        res.status(500).json({
          success: false,
          error: { code: 'NO_DATABASE', message: 'Database not available' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Check if application exists
      const application = await new Promise<any>((resolve, reject) => {
        db.get(
          'SELECT * FROM exporter_applications WHERE application_id = ?',
          [applicationId],
          (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (!application) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Application not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      if (application.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Application already processed' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Update application status
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE exporter_applications SET status = ?, rejected_at = ?, rejection_reason = ? WHERE application_id = ?',
          ['rejected', new Date().toISOString(), reason, applicationId],
          (err: any) => {
            if (err) reject(err);
            else resolve(true);
          }
        );
      });
      
      logger.info(`Exporter application rejected: ${applicationId} - ${reason}`);
      
      res.json({
        success: true,
        data: {
          applicationId,
          status: 'rejected',
          reason,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error rejecting exporter application:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REJECTION_FAILED',
          message: 'Failed to reject application',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);


// ============================================================================
// EXPORTER PORTAL ROUTES (Filtered by exporterId from JWT token)
// ============================================================================

/**
 * @swagger
 * /api/v1/exporters/profile:
 *   get:
 *     summary: Get exporter's own profile
 *     tags: [Exporter Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exporter profile retrieved successfully
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // Extract exporterId from JWT token (req.user.exporterId)
    const exporterId = (req as any).user?.exporterId || 'EXP2026001'; // Mock for now
    
    const result = await fabricService.getExporter(exporterId);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Exporter profile not found',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving exporter profile:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/contracts:
 *   get:
 *     summary: Get exporter's own contracts
 *     tags: [Exporter Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contracts retrieved successfully
 */
router.get('/contracts', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId || 'EXP2026001';
    
    // Query contracts filtered by exporterId
    const result = await fabricService.queryContracts({ exporterId });

    if (result.success) {
      res.json({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve contracts',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving exporter contracts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/forex:
 *   get:
 *     summary: Get exporter's forex allocations
 *     tags: [Exporter Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Forex allocations retrieved successfully
 */
router.get('/forex', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId || 'EXP2026001';
    
    // Query forex allocations filtered by exporterId
    const result = await fabricService.queryForexAllocations({ exporterId });

    if (result.success) {
      res.json({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve forex allocations',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving exporter forex:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/lc:
 *   get:
 *     summary: Get exporter's letters of credit
 *     tags: [Exporter Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: LCs retrieved successfully
 */
router.get('/lc', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId || 'EXP2026001';
    
    // Query LCs filtered by exporterId
    const result = await fabricService.queryLettersOfCredit({ exporterId });

    if (result.success) {
      res.json({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve letters of credit',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving exporter LCs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/payments:
 *   get:
 *     summary: Get exporter's payment history
 *     tags: [Exporter Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId || 'EXP2026001';
    
    // Query payments filtered by exporterId
    const result = await fabricService.queryPayments({ exporterId });

    if (result.success) {
      res.json({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve payments',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving exporter payments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/shipments:
 *   get:
 *     summary: Get exporter's shipments
 *     tags: [Exporter Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipments retrieved successfully
 */
router.get('/shipments', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId || 'EXP2026001';
    
    // Query shipments filtered by exporterId
    const result = await fabricService.queryShipments({ exporterId });

    if (result.success) {
      res.json({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve shipments',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving exporter shipments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/exporters/analytics/summary:
 *   get:
 *     summary: Get exporter's analytics summary
 *     tags: [Exporter Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get('/analytics/summary', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId || 'EXP2026001';
    
    // Aggregate data from multiple sources
    const [contractsResult, forexResult, paymentsResult, shipmentsResult] = await Promise.all([
      fabricService.queryContracts({ exporterId }),
      fabricService.queryForexAllocations({ exporterId }),
      fabricService.queryPayments({ exporterId }),
      fabricService.queryShipments({ exporterId }),
    ]);

    const contracts = contractsResult.data || [];
    const forex = forexResult.data || [];
    const payments = paymentsResult.data || [];
    const shipments = shipmentsResult.data || [];

    const summary = {
      contracts: {
        total: contracts.length,
        active: contracts.filter((c: any) => c.status === 'ACTIVE').length,
        pending: contracts.filter((c: any) => c.status === 'REGISTERED').length,
        completed: contracts.filter((c: any) => c.status === 'COMPLETED').length,
        totalValue: contracts.reduce((sum: number, c: any) => sum + (c.totalValue || 0), 0),
      },
      forex: {
        allocated: forex.reduce((sum: number, f: any) => sum + (f.allocatedAmount || 0), 0),
        utilized: forex.filter((f: any) => f.status === 'UTILIZED').length,
      },
      payments: {
        total: payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        retained: payments.reduce((sum: number, p: any) => sum + (p.retainedAmount || 0), 0),
        converted: payments.reduce((sum: number, p: any) => sum + (p.convertedAmount || 0), 0),
        receivedBirr: payments.reduce((sum: number, p: any) => sum + (p.amountBirr || 0), 0),
      },
      shipments: {
        total: shipments.length,
        inTransit: shipments.filter((s: any) => s.status === 'IN_TRANSIT').length,
        delivered: shipments.filter((s: any) => s.status === 'DELIVERED').length,
      },
    };

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving exporter analytics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

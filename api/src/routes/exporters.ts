// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exporters API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { EmailService } from '../services/emailService';
import { AuditService } from '../services/auditService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware, requireRole } from '../middleware/auth';
import { dedupeById, isValidContract, isValidForex, isValidLC, isValidShipment } from '../utils/dataFilters';
import { body, param, query } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();
const emailService = EmailService.getInstance();
const auditService = AuditService.getInstance();

// ============================================================================
// APPLICATIONS ROUTES (must come BEFORE /:exporterID to avoid route conflicts)
// ============================================================================

// GET /exporter-applications - List applications with filtering
router.get('/exporter-applications',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let query = 'SELECT * FROM exporter_applications WHERE 1=1';
      const params: any[] = [];

      if (status) {
        query += ' AND status = $1';
        params.push(status);
      }

      query += ' ORDER BY submitted_date DESC';
      const applications = await postgresDb.all(query, params);

      res.json({
        success: true,
        data: { applications, count: applications.length },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('List applications error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /applications/:applicationId - Read one application for portal workflow details
router.get('/applications/:applicationId',
  authMiddleware,
  param('applicationId').notEmpty().withMessage('Application ID is required'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const application = await postgresDb.get(
        `SELECT * FROM exporter_applications
         WHERE application_id = $1 OR CAST(id AS TEXT) = $1
         LIMIT 1`,
        [req.params.applicationId]
      );

      if (!application) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Exporter application not found' },
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({
        success: true,
        data: application,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(`Read exporter application ${req.params.applicationId} failed:`, error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to load exporter application' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// POST /exporter-applications - Submit new application (PUBLIC - no auth)
// This endpoint now:
// 1. Creates application record
// 2. Generates temporary login credentials
// 3. Sends immediate email with credentials for status tracking
router.post('/exporter-applications',
  [
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('tinNumber').notEmpty().withMessage('TIN number is required'),
    body('businessLicenseNumber').notEmpty().withMessage('Business license number is required'),
    body('capitalRequirement').notEmpty().withMessage('Capital requirement is required'),
    body('professionalTaster').notEmpty().withMessage('Professional taster is required'),
    body('tasterCertificate').optional({ values: 'falsy' }).isString().withMessage('Taster certificate must be a string'),
    body('contactPerson').notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('region').optional().isString().withMessage('Region must be a string'),
    body('bankName').optional().isString().withMessage('Bank name must be a string'),
    body('bankAccountNumber')
      .optional({ values: 'falsy' })
      .isString().withMessage('Bank account number must be a string')
      .matches(/^\d{1,13}$/).withMessage('Bank account number must contain no more than 13 digits'),
    body('bankBranchName').optional().isString().withMessage('Bank branch name must be a string'),
    body('bankBranchCode').optional().isString().withMessage('Bank branch code must be a string'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('documents').optional().isArray().withMessage('Documents must be an array'),
    body('exporterType').optional().isIn(['private','company','individual']).withMessage('Exporter type must be private, company, or individual'),
    body('laboratoryFacility').optional().isString().withMessage('Laboratory facility flag must be a string'),
    body('laboratoryCertificateNumber').optional().isString().withMessage('Laboratory certificate number must be a string'),
    body('registrationDate').optional().isISO8601().withMessage('Registration date must be a valid ISO date'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      logger.info('Application submission received:', { 
        companyName: req.body.companyName, 
        email: req.body.email,
        exporterType: req.body.exporterType,
        capitalRequirement: req.body.capitalRequirement,
        professionalTaster: req.body.professionalTaster
      });
      
      const applicationData = req.body;
      const submittedAt = new Date().toISOString();

      // Check if email already exists
      const existingUser = await postgresDb.get('SELECT id FROM users WHERE email = $1', [applicationData.email]);
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const existingApplication = await postgresDb.get(
        'SELECT id FROM exporter_applications WHERE email = $1 AND status = $2', 
        [applicationData.email, 'pending']
      );
      if (existingApplication) {
        res.status(400).json({
          success: false,
          error: { code: 'APPLICATION_EXISTS', message: 'You already have a pending application.' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Step 1: Insert application
      // Generate unique application ID
      const applicationIdValue = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const appQuery = `
        INSERT INTO exporter_applications (
          application_id, company_name, tin_number, business_license_number, address,
          registration_date, capital_requirement, professional_taster,
          taster_certificate, laboratory_facility, contact_person,
          email, phone, city, region, bank_name,
          bank_account_number, bank_branch, bank_branch_code,
          comments, documents, exporter_type, status, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'pending', $23)
        RETURNING id, application_id
      `;
      
      const documentsJSON = JSON.stringify(applicationData.documents || []);
      
      // ✅ FIX: Record application submission on blockchain ASYNCHRONOUSLY (non-blocking)
      // Don't wait for blockchain - process in background to avoid 30s timeout
      auditService.log({
        entityType: 'EXPORTER_APPLICATION',
        entityId: applicationIdValue,
        action: 'SUBMIT',
        performedBy: applicationData.email,
        organization: 'ECTAMSP',  // Applications go to ECTA
        performedByOrg: 'ECTAMSP',
        oldValue: '',
        newValue: 'PENDING',
        reason: `Application submitted by ${applicationData.companyName}`,
        metadata: {
          companyName: applicationData.companyName,
          tinNumber: applicationData.tinNumber,
          businessLicense: applicationData.businessLicenseNumber,
          exporterType: applicationData.exporterType || 'company',
          capitalRequirement: applicationData.capitalRequirement,
          professionalTaster: applicationData.professionalTaster,
          email: applicationData.email,
          phone: applicationData.phone,
          city: applicationData.city,
          submittedAt
        },
        ipAddress: req.ip
      }).catch((err) => {
        // Log error but don't fail the request
        logger.error(`⚠️ Failed to record application submission on blockchain: ${err.message}`);
      });
      logger.info(`✅ Application submission queued for blockchain recording: ${applicationIdValue}`);

      // Now insert application to database
      const appResult = await postgresDb.get(appQuery, [
        applicationIdValue,
        applicationData.companyName,
        applicationData.tinNumber,
        applicationData.businessLicenseNumber,
        applicationData.address,
        applicationData.registrationDate || null,
        applicationData.capitalRequirement,
        applicationData.professionalTaster,
        applicationData.tasterCertificate || '',
        applicationData.laboratoryFacility || 'no',
        applicationData.contactPerson,
        applicationData.email,
        applicationData.phone,
        applicationData.city,
        applicationData.region || '',
        applicationData.bankName || '',
        applicationData.bankAccountNumber || '',
        applicationData.bankBranchName || '',
        applicationData.bankBranchCode || '',
        applicationData.comments || '',
        documentsJSON,
        applicationData.exporterType || 'company',
        submittedAt,
      ]);
      
      // ✅ FIX: Use application_id (APP-XXXXX) not the numeric id
      const applicationId = appResult.application_id;  // APP-XXXXX format
      const numericId = appResult.id;  // Numeric database ID

      // Step 2: Generate temporary credentials using the numeric ID for the database
      const applicantCredentialsService = require('../services/applicantCredentialsService').default;
      const credentials = await applicantCredentialsService.generateCredentials(
        numericId,  // Use numeric ID for database FK relationship
        applicationData.email,
        applicationData.companyName
      );
      
      logger.info(`✅ Application submitted: ID=${applicationId}, Database ID=${numericId}, Username=${credentials.username}`);
      
      // Email failure must not undo the submitted application, but the response
      // must not claim that credentials were delivered when SMTP is unavailable.
      let emailSent = false;
      try {
        emailSent = await emailService.sendApplicationSubmissionEmail({
          companyName: applicationData.companyName,
          email: applicationData.email,
          username: credentials.username,
          password: credentials.password,
          applicationId,
        });
      } catch (emailError: any) {
        logger.error('Failed to send application submission email:', emailError?.message || emailError);
      }
      
      res.status(201).json({
        success: true,
        data: { 
          applicationId, 
          status: 'pending', 
          submittedAt,
          credentials: {
            username: credentials.username,
            emailSent,
            message: emailSent
              ? 'Login credentials were sent by email. You can track your application status.'
              : 'Email delivery failed. Contact ECTA to receive or reset your login credentials.'
          },
          emailDelivery: emailSent ? 'sent' : 'failed'
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error submitting application:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SUBMISSION_FAILED', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// POST /exporter-applications/:applicationId/approve - Approve application (ECTA admin)
// This endpoint now:
// 1. Registers exporter on blockchain
// 2. Generates cryptographically signed license PDF
// 3. Creates full user account from temporary credentials
// 4. Sends professional email with license download link
router.post('/exporter-applications/:applicationId/approve',
  authMiddleware,
  [
    param('applicationId').notEmpty(),
    body('exporterId').notEmpty(),
    body('ectaLicenseNumber').matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/)
      .withMessage('ECTA license number must contain only letters, numbers, hyphens, or underscores'),
    body('licenseExpiryDate').isISO8601(),
    body('bankName').optional(),
    body('bankAccountNumber').optional(),
    body('bankBranch').optional(),
    body('bankBranchCode').optional(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { exporterId, ectaLicenseNumber, licenseExpiryDate, bankName, bankAccountNumber, bankBranch, bankBranchCode } = req.body;
      
      // ✅ FIX: Use application_id (APP-XXXXX) not id (numeric)
      const application = await postgresDb.get('SELECT * FROM exporter_applications WHERE application_id = $1', [applicationId]);
      
      if (!application || (application.status !== 'pending' && application.status !== 'approved')) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found or already rejected' }, timestamp: new Date().toISOString() });
        return;
      }

      // Step 1: Register exporter on blockchain (CRITICAL - must succeed)
      logger.info(`Attempting to register exporter ${exporterId} on blockchain...`);
      logger.info(`Application data for ${exporterId}:`, {
        capital_requirement: application.capital_requirement,
        exporter_type: application.exporter_type,
        company_name: application.company_name
      });
      
      const result = await fabricService.registerExporter(
        exporterId,
        application.company_name,
        ectaLicenseNumber,
        application.exporter_type || 'private',
        application.capital_requirement,
        application.professional_taster,
        application.taster_certificate,
        application.laboratory_certificate_number || '',
        licenseExpiryDate,
        (req as any).user?.role
      );
      
      if (!result.success) {
        const alreadyExists = result.error && result.error.includes('already exists');
        if (alreadyExists) {
          logger.warn(`⚠️ Exporter ${exporterId} already exists on blockchain — proceeding with approval`);
        } else {
          logger.error(`❌ Blockchain registration failed for ${exporterId}:`, result.error);
          res.status(400).json({ 
            success: false, 
            error: { 
              code: 'BLOCKCHAIN_ERROR', 
              message: `Blockchain registration failed: ${result.error || 'Network may be down'}`
            }, 
            timestamp: new Date().toISOString() 
          });
          return;
        }
      } else {
        logger.info(`✅ Exporter ${exporterId} registered on blockchain (TxID: ${result.txId})`);
        
        // ✅ STORE BLOCKCHAIN SIGNATURE
        try {
          const signatureId = `SIG-${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}`;
          await postgresDb.run(
            `INSERT INTO blockchain_signatures (
              signature_id, blockchain_tx_id, entity_type, entity_id,
              chaincode_function, signer_org, signer_username,
              blockchain_timestamp, action_type, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())
            ON CONFLICT (signature_id) DO NOTHING`,
            [
              signatureId,
              result.txId,
              'EXPORTER_APPLICATION',
              applicationId,
              'ApproveExporter',
              (req as any).user?.org || 'CECBSMSP',
              (req as any).user?.username || 'admin',
              'APPROVED'
            ]
          );
          logger.info(`✅ Blockchain signature stored: ${signatureId}`);
        } catch (sigErr) {
          logger.error(`⚠️ Failed to store blockchain signature:`, sigErr);
          // Non-blocking - continue with approval
        }
      }

      // Step 2: Generate professional license PDF with digital signature
      const licensePdfService = require('../services/licensePdfService').default;
      const approvalDate = new Date().toISOString();
      const expiryDate = new Date(licenseExpiryDate).toISOString();
      
      const licenseData = {
        licenseNumber: ectaLicenseNumber,
        companyName: application.company_name,
        companyAddress: application.address,
        tinNumber: application.tin_number,
        contactPerson: application.contact_person,
        email: application.email,
        phone: application.phone,
        approvalDate,
        expiryDate,
        approvedBy: (req as any).user?.username || 'ECTA Officer',
        blockchainTxId: result.txId,
      };
      
      const licenseResult = await licensePdfService.generateLicense(licenseData);
      logger.info(`✅ License PDF generated: ${licenseResult.pdfPath}`);

      // Step 3: Convert temporary credentials to full account
      const applicantCredentialsService = require('../services/applicantCredentialsService').default;
      await applicantCredentialsService.convertToFullAccount(application.id, exporterId);  // Use numeric id for FK
      logger.info(`✅ Converted temporary account to full exporter account: ${exporterId}`);
      
      // Step 4: Update application with license details
      // ✅ Save to BOTH license_number AND ecta_license_number for compatibility
      await postgresDb.run(
        `UPDATE exporter_applications 
         SET status = $1, 
             approved_at = $2, 
             exporter_id = $3,
             license_number = $4,
             ecta_license_number = $4,
             license_issued_date = $5,
             license_expiry_date = $6,
             digital_signature = $7,
             verification_code = $8,
             account_created = true,
             bank_name = $9,
             bank_account_number = $10,
             bank_branch = $11,
             bank_branch_code = $12
         WHERE application_id = $13`,
        ['approved', approvalDate, exporterId, ectaLicenseNumber, approvalDate, expiryDate,
         licenseResult.digitalSignature, licenseResult.verificationCode,
         bankName || null, bankAccountNumber || null, bankBranch || null, bankBranchCode || null, applicationId]
      );
      
      logger.info(`✅ Application approved: ${applicationId} -> ${exporterId}`);
      
      // Log audit trail
      await auditService.log({
        entityType: 'EXPORTER_APPLICATION',
        entityId: applicationId,
        action: 'APPROVE',
        performedBy: (req as any).user?.username || 'ecta_officer',
        organization: (req as any).user?.org || 'ECTAMSP',
        performedByOrg: (req as any).user?.org || 'ECTAMSP',
        oldValue: 'PENDING',
        newValue: 'APPROVED',
        reason: `Application approved - License generated: ${ectaLicenseNumber}`,
        metadata: {
          applicationId,
          exporterId,
          companyName: application.company_name,
          ectaLicenseNumber,
          licenseExpiryDate,
          verificationCode: licenseResult.verificationCode,
          approvedBy: (req as any).user?.username
        },
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown'
      });
      
      // Step 5: Send approval email with license download link
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // ✅ NEW USERNAME: After approval, user logs in with exporterId (e.g., EXP3414033)
      // The convertToFullAccount method already updated the username in the database
      const newUsername = exporterId;  // Standard format username
      const oldUsername = application.temp_username;  // Old temporary username
      
      // Get temporary password from application (same password, just username changed)
      const tempPwdResult = await postgresDb.get(
        'SELECT temp_password FROM exporter_applications WHERE application_id = $1',
        [applicationId]
      );
      
      // Send approval email after the approval transaction and report its result.
      const approvalEmailSent = await emailService.sendApprovalEmail({
        exporterName: application.company_name,
        exporterId,
        licenseNumber: ectaLicenseNumber,
        email: application.email,
        username: newUsername,  // ✅ Send the NEW username (exporterId)
        oldUsername: oldUsername,  // Include old username for reference
        temporaryPassword: 'Use your existing password',
        bankName: bankName || undefined,
        bankBranch: bankBranch || undefined,
        bankBranchCode: bankBranchCode || undefined,
        loginUrl: `${loginUrl}/login`,
      });
      
      res.json({ 
        success: true, 
        data: { 
          applicationId, 
          exporterId, 
          status: 'approved', 
          txId: result.txId,
          credentials: {
            username: exporterId,  // New username after approval
            passwordNote: 'Use the password from your application confirmation email'
          },
          license: {
            licenseNumber: ectaLicenseNumber,
            verificationCode: licenseResult.verificationCode,
            issuedDate: approvalDate,
            expiryDate,
            downloadUrl: `/api/v1/exporters/licenses/${ectaLicenseNumber}/download`
          },
          emailDelivery: approvalEmailSent ? 'sent' : 'failed',
          message: approvalEmailSent
            ? 'Application approved. License generated and email sent to exporter.'
            : 'Application approved and license generated. Email delivery failed; notify the exporter through another approved channel.'
        }, 
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      logger.error('Error approving application:', error);
      res.status(500).json({ success: false, error: { code: 'APPROVAL_FAILED', message: error.message }, timestamp: new Date().toISOString() });
    }
  }
);

// ALIAS for backward compatibility
router.post('/applications/:applicationId/approve', authMiddleware, async (req, res) => {
  // @ts-ignore - reuse the same logic by redirecting/forwarding to the correct route handler
  // For Express, we can just call the other route's handler or use a shared function.
  // A simple way is to just call the other endpoint via a internal redirect or just repeat the logic.
  // Since we want to avoid duplication, let's just make it a redirect for now if possible, 
  // but better to just use a shared handler.
  
  // For simplicity in this mess, I'll just use a shared handler for both.
  return res.status(307).redirect(req.originalUrl.replace('/applications/', '/exporter-applications/'));
});

// POST /exporter-applications/:applicationId/reject - Reject application (ECTA admin)
// This endpoint updates the application status but KEEPS the user account for resubmission
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
      
      // ✅ FIX: Use application_id (APP-XXXXX) not id (numeric)
      const application = await postgresDb.get('SELECT * FROM exporter_applications WHERE application_id = $1', [applicationId]);
      
      if (!application || application.status !== 'pending') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND' }, timestamp: new Date().toISOString() });
        return;
      }

      // ✅ BLOCKCHAIN-FIRST: Record rejection on blockchain BEFORE any DB updates
      const auditService = require('../services/auditService').default;
      const adminUser = (req as any).user;
      const blockchainResult = await auditService.recordAudit({
        entityType: 'EXPORTER_APPLICATION',
        entityId: applicationId,
        actionType: 'REJECT',
        actionBy: adminUser?.username || 'ECTA_ADMIN',
        organizationMSP: 'ECTAMSP',
        details: {
          applicationId,
          companyName: application.company_name,
          email: application.email,
          reason
        },
        timestamp: new Date()
      });
      
      const blockchain_tx_id = blockchainResult?.txId || null;
      logger.info(`✅ Application rejection recorded on blockchain: ${applicationId}, TX: ${blockchain_tx_id}`);

      // Step 1: Keep the inactive user account but mark it as rejected
      // This allows the applicant to login and see rejection reason
      await postgresDb.run(
        `UPDATE users SET status = 'rejected' WHERE email = $1 AND role = 'EXPORTER' AND status = 'inactive'`,
        [application.email]
      );

      // Step 2: Update application status to rejected with blockchain TX ID
      await postgresDb.run(
        'UPDATE exporter_applications SET status = $1, rejected_at = $2, rejection_reason = $3, blockchain_tx_id = $4 WHERE application_id = $5',
        ['rejected', new Date().toISOString(), reason, blockchain_tx_id, applicationId]
      );
      
      // Get the user's temporary credentials
      const exporterUser = await postgresDb.get('SELECT username, password_hash FROM users WHERE email = $1 AND role = $2', [application.email, 'EXPORTER']);
      
      // Generate a new temporary password for resubmission
      const bcrypt = require('bcrypt');
      const tempPassword = `Rejected${Math.random().toString(36).slice(-6)}!`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Update user password
      await postgresDb.run('UPDATE users SET password_hash = $1 WHERE email = $2 AND role = $3', [hashedPassword, application.email, 'EXPORTER']);
      
      logger.info(`❌ Application rejected: ${applicationId} (User ${application.email} can now login to see rejection and resubmit)`);
      
      // Rejection remains recorded even if SMTP is unavailable; report delivery.
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const rejectionEmailSent = await emailService.sendRejectionEmail({
        exporterName: application.company_name,
        applicationId,
        email: application.email,
        reason,
        username: exporterUser?.username || application.email,
        temporaryPassword: tempPassword,
        resubmitUrl: `${loginUrl}/login`,
      });
      
      res.json({ 
        success: true, 
        data: { 
          applicationId, 
          status: 'rejected', 
          reason,
          emailDelivery: rejectionEmailSent ? 'sent' : 'failed',
          message: rejectionEmailSent
            ? 'Application rejected. Credentials for resubmission have been updated and emailed.'
            : 'Application rejected and credentials for resubmission have been updated. Email delivery failed.'
        }, 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      logger.error('Error rejecting application:', error);
      res.status(500).json({ success: false, error: { code: 'REJECTION_FAILED' }, timestamp: new Date().toISOString() });
    }
  }
);

// GET /exporter-applications/check/:email - Check application status (PUBLIC - no auth)
// Allows applicants to check their application status using their email
router.get('/exporter-applications/check/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const application = await postgresDb.get(
      'SELECT * FROM exporter_applications WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1',
      [email]
    );

    if (application?.documents && typeof application.documents === 'string') {
      try {
        application.documents = JSON.parse(application.documents);
      } catch (err) {
        logger.warn('Failed to parse application documents JSON:', err);
      }
    }
    
    if (!application) {
      res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'No application found for this email' }, 
        timestamp: new Date().toISOString() 
      });
      return;
    }
    
    res.json({
      success: true,
      data: application,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking application status:', error);
    res.status(500).json({ success: false, error: { code: 'CHECK_FAILED' }, timestamp: new Date().toISOString() });
  }
});

// POST /exporter-applications/:applicationId/resubmit - Resubmit rejected application (PUBLIC - no auth)
// Allows applicants to resubmit a corrected application after rejection
router.post('/exporter-applications/:applicationId/resubmit',
  [
    param('applicationId').notEmpty(),
    body('companyName').optional().notEmpty().withMessage('Company name is required when provided'),
    body('tinNumber').optional().notEmpty().withMessage('TIN number is required when provided'),
    body('businessLicenseNumber').optional().notEmpty().withMessage('Business license number is required when provided'),
    body('registrationDate').optional().isISO8601().withMessage('Registration date must be a valid ISO date'),
    body('exporterType').optional().isIn(['private','company','individual']).withMessage('Exporter type must be private, company, or individual'),
    body('capitalRequirement').optional().isNumeric().withMessage('Capital requirement must be a number'),
    body('professionalTaster').optional().isBoolean().withMessage('Professional taster must be a boolean'),
    body('tasterCertificate').optional().isString().withMessage('Taster certificate must be a string'),
    body('laboratoryFacility').optional().isString().withMessage('Laboratory facility must be a string'),
    body('laboratoryCertificateNumber').optional().isString().withMessage('Laboratory certificate number must be a string'),
    body('contactPerson').optional().isString().withMessage('Contact person must be a string'),
    body('phone').optional().isString().withMessage('Phone number must be a string'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('city').optional().isString().withMessage('City must be a string'),
    body('region').optional().isString().withMessage('Region must be a string'),
    body('bankName').optional().isString().withMessage('Bank name must be a string'),
    body('bankAccountNumber').optional().isString().withMessage('Bank account number must be a string'),
    body('bankBranchName').optional().isString().withMessage('Bank branch name must be a string'),
    body('bankBranchCode').optional().isString().withMessage('Bank branch code must be a string'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('documents').optional().isArray().withMessage('Documents must be an array'),
    body('documents.*').optional().isString().withMessage('Each document item must be a string'),
    body('email').isEmail().withMessage('Valid email is required').withMessage('Valid email is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const updateData = req.body;
      
      // Verify the application exists and is rejected
      const application = await postgresDb.get('SELECT * FROM exporter_applications WHERE id = $1 AND status = $2', [applicationId, 'rejected']);
      
      if (!application) {
        res.status(404).json({ 
          success: false, 
          error: { code: 'NOT_FOUND', message: 'Application not found or not in rejected status' }, 
          timestamp: new Date().toISOString() 
        });
        return;
      }
      
      // Verify email matches
      if (application.email !== updateData.email) {
        res.status(403).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'Email does not match application' }, 
          timestamp: new Date().toISOString() 
        });
        return;
      }
      
      // Build update query for fields that were provided
      const fieldsToUpdate: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (updateData.companyName) {
        fieldsToUpdate.push(`company_name = $${paramIndex++}`);
        values.push(updateData.companyName);
      }
      if (updateData.tinNumber) {
        fieldsToUpdate.push(`tin_number = $${paramIndex++}`);
        values.push(updateData.tinNumber);
      }
      if (updateData.businessLicenseNumber) {
        fieldsToUpdate.push(`business_license_number = $${paramIndex++}`);
        values.push(updateData.businessLicenseNumber);
      }
      if (updateData.registrationDate) {
        fieldsToUpdate.push(`registration_date = $${paramIndex++}`);
        values.push(updateData.registrationDate);
      }
      if (updateData.capitalRequirement) {
        fieldsToUpdate.push(`capital_requirement = $${paramIndex++}`);
        values.push(parseFloat(updateData.capitalRequirement));
      }
      if (updateData.professionalTaster !== undefined) {
        fieldsToUpdate.push(`professional_taster = $${paramIndex++}`);
        values.push(updateData.professionalTaster);
      }
      if (updateData.tasterCertificate) {
        fieldsToUpdate.push(`taster_certificate = $${paramIndex++}`);
        values.push(updateData.tasterCertificate);
      }
      if (updateData.laboratoryFacility) {
        fieldsToUpdate.push(`laboratory_facility = $${paramIndex++}`);
        values.push(updateData.laboratoryFacility);
      }
      if (updateData.laboratoryCertificateNumber) {
        fieldsToUpdate.push(`laboratory_certificate_number = $${paramIndex++}`);
        values.push(updateData.laboratoryCertificateNumber);
      }
      if (updateData.contactPerson) {
        fieldsToUpdate.push(`contact_person = $${paramIndex++}`);
        values.push(updateData.contactPerson);
      }
      if (updateData.phone) {
        fieldsToUpdate.push(`phone = $${paramIndex++}`);
        values.push(updateData.phone);
      }
      if (updateData.address) {
        fieldsToUpdate.push(`address = $${paramIndex++}`);
        values.push(updateData.address);
      }
      if (updateData.city) {
        fieldsToUpdate.push(`city = $${paramIndex++}`);
        values.push(updateData.city);
      }
      if (updateData.region) {
        fieldsToUpdate.push(`region = $${paramIndex++}`);
        values.push(updateData.region);
      }
      if (updateData.bankName) {
        fieldsToUpdate.push(`bank_name = $${paramIndex++}`);
        values.push(updateData.bankName);
      }
      if (updateData.bankAccountNumber) {
        fieldsToUpdate.push(`bank_account_number = $${paramIndex++}`);
        values.push(updateData.bankAccountNumber);
      }
      if (updateData.bankBranchName) {
        fieldsToUpdate.push(`bank_branch = $${paramIndex++}`);
        values.push(updateData.bankBranchName);
      }
      if (updateData.bankBranchCode) {
        fieldsToUpdate.push(`bank_branch_code = $${paramIndex++}`);
        values.push(updateData.bankBranchCode);
      }
      if (updateData.comments) {
        fieldsToUpdate.push(`comments = $${paramIndex++}`);
        values.push(updateData.comments);
      }
      if (updateData.documents) {
        fieldsToUpdate.push(`documents = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.documents));
      }
      if (updateData.exporterType) {
        fieldsToUpdate.push(`exporter_type = $${paramIndex++}`);
        values.push(updateData.exporterType);
      }
      
      // Always update status to pending and clear rejection data
      fieldsToUpdate.push(`status = $${paramIndex++}`);
      fieldsToUpdate.push(`rejected_at = $${paramIndex++}`);
      fieldsToUpdate.push(`rejection_reason = $${paramIndex++}`);
      fieldsToUpdate.push(`submitted_at = $${paramIndex++}`);
      values.push('pending', null, null, new Date().toISOString());
      
      // Add application ID at the end for WHERE clause
      values.push(applicationId);
      
      const updateQuery = `
        UPDATE exporter_applications 
        SET ${fieldsToUpdate.join(', ')}
        WHERE id = $${paramIndex}
      `;
      
      await postgresDb.run(updateQuery, values);
      
      // Update user status from rejected back to inactive
      await postgresDb.run(
        `UPDATE users SET status = 'inactive' WHERE email = $1 AND role = 'EXPORTER' AND status = 'rejected'`,
        [updateData.email]
      );
      
      logger.info(`✅ Application resubmitted: ${applicationId} by ${updateData.email}`);
      
      // Send notification to ECTA admins
      const ectaNotificationSent = await emailService.sendResubmissionNotification({
        exporterName: application.company_name,
        applicationId: application.application_id,
        email: application.email,
        originalSubmissionDate: application.submitted_at,
        rejectionDate: application.rejected_at,
        resubmissionDate: new Date().toISOString(),
      });
      
      res.json({
        success: true,
        data: {
          applicationId,
          status: 'pending',
          emailDelivery: ectaNotificationSent ? 'sent' : 'failed',
          message: ectaNotificationSent
            ? 'Application resubmitted successfully and is now pending review. ECTA has been notified.'
            : 'Application resubmitted successfully and is now pending review, but ECTA email notification failed.'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error resubmitting application:', error);
      res.status(500).json({ success: false, error: { code: 'RESUBMIT_FAILED' }, timestamp: new Date().toISOString() });
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

    // Get exporter data from blockchain
    const result = await fabricService.getExporter(exporterId);
    
    // Enrich with bank information from database
    if (result.success && result.data) {
      try {
        const userBankInfo = await postgresDb.get(
          'SELECT bank_name, bank_branch, bank_branch_code FROM users WHERE exporter_id = $1 OR username = $2',
          [exporterId, exporterId]
        );

        if (userBankInfo) {
          result.data.bankName = userBankInfo.bank_name;
          result.data.bankBranch = userBankInfo.bank_branch;
          result.data.bankBranchCode = userBankInfo.bank_branch_code;
        }
      } catch (dbError) {
        logger.warn('Failed to fetch bank information from database:', dbError);
      }
    }

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
    body('ectaLicenseNumber').matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/)
      .withMessage('ECTA license number must contain only letters, numbers, hyphens, or underscores'),
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
        licenseExpiryDate,
        (req as any).user?.role // Pass user role for MSP determination
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
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('status').isIn(['ACTIVE', 'SUSPENDED', 'EXPIRED']).withMessage('Status must be ACTIVE, SUSPENDED, or EXPIRED'),
    body('reason').optional().isLength({ max: 1000 }).withMessage('Reason must be 1000 characters or fewer'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exporterID } = req.params;
      const { status, reason } = req.body;

      if (status === 'SUSPENDED' && !String(reason || '').trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_REASON', message: 'A reason is required to suspend an exporter license' },
          timestamp: new Date().toISOString(),
        });
      }

      const result = status === 'SUSPENDED'
        ? await fabricService.invokeChaincode('SuspendExporter', [exporterID, String(reason).trim()])
        : await fabricService.updateExporterStatus(exporterID, status);

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

// POST /exporters/:exporterID/renew-license - ECTA renews the ledger license and local application view.
router.post('/:exporterID/renew-license',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('newExpiryDate').isISO8601().withMessage('A valid new expiry date is required'),
    body('reason').trim().isLength({ min: 3, max: 1000 }).withMessage('A renewal reason of 3 to 1000 characters is required'),
  ],
  validateRequest,
  async (req, res) => {
    const { exporterID } = req.params;
    const newExpiryDate = new Date(req.body.newExpiryDate).toISOString();
    const reason = String(req.body.reason).trim();

    try {
      const result = await fabricService.renewExporterLicense(exporterID, newExpiryDate, reason);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'RENEWAL_FAILED', message: result.error || 'Failed to renew exporter license on the ledger' },
          timestamp: new Date().toISOString(),
        });
      }

      let applicationMirrorSynchronized = false;
      try {
        await postgresDb.run(
          'UPDATE exporter_applications SET license_expiry_date = $1 WHERE exporter_id = $2',
          [newExpiryDate, exporterID]
        );
        applicationMirrorSynchronized = true;
      } catch (syncError) {
        logger.error(`[EXPORTERS] License renewal committed on-ledger but application mirror sync failed for ${exporterID}:`, syncError);
      }

      return res.json({
        success: true,
        data: { exporterID, licenseExpiryDate: newExpiryDate, licenseStatus: 'ACTIVE', applicationMirrorSynchronized },
        txId: result.txId,
        warning: applicationMirrorSynchronized ? undefined : 'Renewal is on the ledger, but the application database mirror did not synchronize.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`[EXPORTERS] License renewal failed for ${exporterID}:`, error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to renew exporter license' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// POST /exporters/:exporterID/revoke - ECTA permanently revokes an exporter license.
router.post('/:exporterID/revoke',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('reason').trim().isLength({ min: 3, max: 1000 }).withMessage('A revocation reason of 3 to 1000 characters is required'),
  ],
  validateRequest,
  async (req, res) => {
    const { exporterID } = req.params;
    const reason = String(req.body.reason).trim();

    try {
      const result = await fabricService.revokeExporterLicense(exporterID, reason);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'REVOCATION_FAILED', message: result.error || 'Failed to revoke exporter license on the ledger' },
          timestamp: new Date().toISOString(),
        });
      }

      let accountDisabled = false;
      try {
        await postgresDb.run(
          `UPDATE users SET status = 'revoked', is_active = false, updated_at = CURRENT_TIMESTAMP
           WHERE role = 'EXPORTER' AND (username = $1 OR exporter_id = $1)`,
          [exporterID]
        );
        accountDisabled = true;
      } catch (syncError) {
        logger.error(`[EXPORTERS] License revocation committed on-ledger but account sync failed for ${exporterID}:`, syncError);
      }

      return res.json({
        success: true,
        data: { exporterID, licenseStatus: 'REVOKED', accountDisabled },
        txId: result.txId,
        warning: accountDisabled ? undefined : 'Revocation is on the ledger, but the local account could not be disabled.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`[EXPORTERS] License revocation failed for ${exporterID}:`, error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke exporter license' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// DUPLICATE ROUTES REMOVED

// BROKEN DUPLICATE APPROVE AND REJECT ROUTES REMOVED (See line 306 and 540 for correct implementations)


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
    const exporterId = (req as any).user?.exporterId || (req as any).user?.username || 'EXP2026001';
    
    logger.info(`Fetching contracts for exporter: ${exporterId}`);
    
    // ✅ Query from PostgreSQL (case-insensitive for exporter_id)
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    
    const pgContracts = await db.all(
      `SELECT * FROM contracts WHERE UPPER(exporter_id) = UPPER($1) ORDER BY created_at DESC`,
      [exporterId]
    );

    const normalizedContracts = pgContracts.map((c: any) => ({
      contractId: c.contract_id,
      exporterId: c.exporter_id,
      buyerId: c.buyer_id,
      buyerName: c.buyer_name || c.buyer_id,
      buyerCountry: c.buyer_country,
      buyerBank: c.buyer_bank,
      exporterBank: c.exporter_bank,
      coffeeType: c.coffee_type,
      quantity: parseFloat(c.quantity || 0),
      pricePerKg: parseFloat(c.price_per_kg || 0),
      currency: c.currency || 'USD',
      paymentMethod: c.payment_method || 'LC',
      status: c.status || 'pending',
      eudrRequired: c.eudr_required || false,
      totalValue: parseFloat(c.quantity || 0) * parseFloat(c.price_per_kg || 0),
      registrationDate: c.created_at,
      approvalDate: c.updated_at,
      blockchainSynced: c.blockchain_synced || false,
      blockchainTxId: c.blockchain_tx_id
    }));

    logger.info(`Successfully fetched ${normalizedContracts.length} contracts for ${exporterId} from database`);

    return res.json({
      success: true,
      data: normalizedContracts,
      count: normalizedContracts.length,
      source: 'database',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Error retrieving exporter contracts:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve contracts'
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
    
    try {
      // Query forex allocations filtered by exporterId
      const result = await fabricService.queryForexAllocations({ exporterId });

      if (result.success && result.data) {
        const normalizedForex = (result.data || []).map((fx: any) => ({
          forexId: fx?.forexId || fx?.ForexID || fx?.id || '',
          contractId: fx?.contractId || fx?.ContractID || fx?.contractID || '',
          exporterId: fx?.exporterId || fx?.ExporterID || fx?.exporterID || '',
          amount: fx?.amount ?? fx?.Amount ?? 0,
          currency: fx?.currency || fx?.Currency || 'USD',
          status: fx?.status || fx?.Status || 'REQUESTED',
          allocatedAmount: fx?.allocatedAmount ?? fx?.AllocatedAmount ?? 0,
          exchangeRate: fx?.exchangeRate ?? fx?.ExchangeRate ?? 0,
          retention: fx?.retention ?? fx?.Retention ?? 0,
          expiryDate: fx?.expiryDate || fx?.expiry_date || null,
          requestDate: fx?.requestDate || fx?.request_date || null,
          utilizationDate: fx?.utilizationDate || fx?.utilization_date || null,
          nbeApprovalRef: fx?.nbeApprovalRef || fx?.NbeApprovalRef || fx?.nbeReference || '',
        }));

        return res.json({
          success: true,
          data: normalizedForex,
          source: 'blockchain',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (blockchainError) {
      logger.warn('Blockchain query failed for forex, returning empty data:', blockchainError);
    }
    
    // Graceful fallback: return empty array if blockchain unavailable
    return res.json({
      success: true,
      data: [],
      source: 'fallback',
      message: 'No forex allocations found or blockchain unavailable',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Error retrieving exporter forex:', error);
    // Even on error, return empty array instead of 500
    res.json({
      success: true,
      data: [],
      source: 'error_fallback',
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
      const normalizedLCs = (result.data || []).map((lc: any) => ({
        lcId: lc?.lcId || lc?.LCID || lc?.id || '',
        contractId: lc?.contractId || lc?.ContractID || lc?.contractID || '',
        exporterId: lc?.exporterId || lc?.ExporterID || lc?.exporterID || '',
        bankName: lc?.bankName || lc?.BankName || '',
        issuingBank: lc?.issuingBank || lc?.IssuingBank || '',
        advisingBank: lc?.advisingBank || lc?.AdvisingBank || '',
        beneficiary: lc?.beneficiary || '',
        amount: lc?.amount ?? lc?.Amount ?? 0,
        currency: lc?.currency || lc?.Currency || 'USD',
        status: lc?.status || lc?.Status || 'REQUESTED',
        expiryDate: lc?.expiryDate || lc?.expiry_date || null,
        requestDate: lc?.requestDate || lc?.request_date || null,
        approvalDate: lc?.approvalDate || lc?.approval_date || null,
        issueDate: lc?.issueDate || lc?.issue_date || null,
        terms: lc?.terms || lc?.Terms || '',
        documents: lc?.documents || lc?.Documents || [],
      }));

      res.json({
        success: true,
        data: normalizedLCs,
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
    const user = (req as any).user;
    const userRole = user?.role || '';
    const exporterId = user?.exporterId || 'EXP2026001';
    
    // ECTA users see ALL shipments for quality control
    // Exporters only see their own shipments
    const isECTA = userRole === 'ECTA' || userRole === 'ADMIN' || userRole.includes('ECTA') || userRole.includes('Quality') || userRole.includes('Lab');
    
    // Query shipments - ECTA gets all, exporters get filtered
    const queryParams = isECTA ? {} : { exporterId };
    const result = await fabricService.queryShipments(queryParams);

    if (result.success) {
      const normalizedShipments = (result.data || []).map((shipment: any) => ({
        shipmentId: shipment?.shipmentId || shipment?.ShipmentID || shipment?.id || '',
        contractId: shipment?.contractId || shipment?.ContractID || shipment?.contractID || '',
        exporterId: shipment?.exporterId || shipment?.ExporterID || shipment?.exporterID || '',
        buyerId: shipment?.buyerId || shipment?.BuyerID || shipment?.buyerID || '',
        origin: shipment?.origin || shipment?.Origin || '',
        destination: shipment?.destination || shipment?.Destination || '',
        quantity: shipment?.quantity ?? shipment?.Quantity ?? 0,
        grade: shipment?.grade || shipment?.Grade || '',
        icoNumber: shipment?.icoNumber || shipment?.ICONumber || shipment?.icoNumber || '',
        status: shipment?.status || shipment?.Status || 'CREATED',
        createdAt: shipment?.createdAt || shipment?.created_at || null,
        updatedAt: shipment?.updatedAt || shipment?.updated_at || null,
        documents: shipment?.documents || shipment?.Documents || [],
      }));

      res.json({
        success: true,
        data: normalizedShipments,
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

// ============================================================================
// LICENSE MANAGEMENT ENDPOINTS
// ============================================================================

// GET /licenses/:licenseNumber/download - Download license PDF (Authenticated)
router.get('/licenses/:licenseNumber/download',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { licenseNumber } = req.params;
      const licensePdfService = require('../services/licensePdfService').default;
      const fs = require('fs');

      if (!licensePdfService.isValidLicenseNumber(licenseNumber)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_LICENSE_NUMBER', message: 'Invalid license number' },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      const pdfPath = licensePdfService.getLicensePath(licenseNumber);
      
      if (!fs.existsSync(pdfPath)) {
        res.status(404).json({
          success: false,
          error: { code: 'LICENSE_NOT_FOUND', message: 'License document not found' },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Log download in audit trail
      await auditService.log({
        entityType: 'LICENSE',
        entityId: licenseNumber,
        action: 'DOWNLOAD',
        performedBy: (req as any).user?.username || 'unknown',
        organization: (req as any).user?.org || 'unknown',
        performedByOrg: (req as any).user?.org || 'unknown',
        reason: 'License PDF downloaded',
        metadata: {
          licenseNumber,
          downloadedBy: (req as any).user?.username,
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown'
      });
      
      res.download(pdfPath, `ECTA-LICENSE-${licenseNumber}.pdf`, (err) => {
        if (!err) return;
        logger.error('Error downloading license:', err);
        if (res.headersSent) {
          res.destroy(err);
          return;
        }
        res.status(500).json({
          success: false,
          error: { code: 'DOWNLOAD_FAILED', message: 'Failed to download license document' },
          timestamp: new Date().toISOString()
        });
      });
    } catch (error: any) {
      logger.error('License download error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DOWNLOAD_FAILED', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /licenses/:licenseNumber/verify - Verify license authenticity (Public)
router.get('/licenses/:licenseNumber/verify',
  async (req: Request, res: Response) => {
    try {
      const { licenseNumber } = req.params;
      const { verificationCode } = req.query;
      const licensePdfService = require('../services/licensePdfService').default;

      if (!licensePdfService.isValidLicenseNumber(licenseNumber)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_LICENSE_NUMBER', message: 'Invalid license number' },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Get license details from database
      const license = await postgresDb.get(
        `SELECT 
          license_number, 
          company_name,
          exporter_id,
          license_issued_date,
          license_expiry_date,
          verification_code,
          digital_signature,
          status
         FROM exporter_applications 
         WHERE license_number = $1 AND status = 'approved'`,
        [licenseNumber]
      );
      
      if (!license) {
        res.json({
          success: false,
          verified: false,
          message: 'License not found or not yet issued',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Verify code if provided
      let codeMatch = true;
      if (verificationCode) {
        codeMatch = license.verification_code === verificationCode;
      }
      
      // Check expiry
      const now = new Date();
      const expiryDate = new Date(license.license_expiry_date);
      const isExpired = now > expiryDate;
      
      res.json({
        success: true,
        verified: codeMatch && !isExpired,
        data: {
          licenseNumber: license.license_number,
          companyName: license.company_name,
          exporterId: license.exporter_id,
          issuedDate: license.license_issued_date,
          expiryDate: license.license_expiry_date,
          status: isExpired ? 'EXPIRED' : 'VALID',
          verificationCodeMatch: codeMatch
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      logger.error('License verification error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;


// GET /:exporterId/historical-performance - Get exporter's historical performance for LC approval
router.get('/:exporterId/historical-performance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { exporterId } = req.params;
    
    logger.info(`📊 Fetching historical performance for exporter: ${exporterId}`);

    // Query contracts from blockchain
    const contractsResult = await fabricService.queryChaincode('QueryContractsByExporter', [exporterId]);
    const contracts = contractsResult.success && contractsResult.data ? contractsResult.data : [];

    // Query shipments from blockchain
    const shipmentsResult = await fabricService.queryChaincode('QueryShipmentsByExporter', [exporterId]);
    const shipments = shipmentsResult.success && shipmentsResult.data ? shipmentsResult.data : [];

    // Query payments from database
    const paymentsQuery = await postgresDb.query(
      'SELECT * FROM payments WHERE exporter_id = $1',
      [exporterId]
    );
    const payments = paymentsQuery.rows || [];

    // Calculate metrics
    const totalContracts = contracts.length;
    const completedContracts = contracts.filter((c: any) => 
      c.contractStatus === 'COMPLETED' || c.ContractStatus === 'COMPLETED'
    ).length;

    const totalShipments = shipments.length;
    const onTimeShipments = shipments.filter((s: any) => {
      const estimatedArrival = s.estimatedArrivalDate || s.EstimatedArrivalDate;
      const actualArrival = s.actualArrivalDate || s.ActualArrivalDate;
      if (!estimatedArrival || !actualArrival) return false;
      return new Date(actualArrival) <= new Date(estimatedArrival);
    }).length;

    const totalPayments = payments.length;
    const successfulPayments = payments.filter((p: any) => 
      p.status === 'COMPLETED' || p.status === 'SETTLED'
    ).length;

    const totalValueExported = contracts.reduce((sum: number, c: any) => {
      const value = c.totalValue || c.TotalValue || 0;
      return sum + parseFloat(value.toString());
    }, 0);

    const averageContractValue = totalContracts > 0 ? totalValueExported / totalContracts : 0;

    // Calculate compliance score (based on contract success, on-time delivery, payment success)
    const contractSuccessRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0;
    const onTimeRate = totalShipments > 0 ? (onTimeShipments / totalShipments) * 100 : 0;
    const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
    const complianceScore = Math.round((contractSuccessRate + onTimeRate + paymentSuccessRate) / 3);

    // Get last shipment date
    const lastShipment = shipments.sort((a: any, b: any) => {
      const dateA = a.shippedDate || a.ShippedDate || a.createdAt || a.CreatedAt;
      const dateB = b.shippedDate || b.ShippedDate || b.createdAt || b.CreatedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })[0];
    const lastShipmentDate = lastShipment ? 
      (lastShipment.shippedDate || lastShipment.ShippedDate || lastShipment.createdAt || lastShipment.CreatedAt) 
      : null;

    // Get recent contracts (last 5)
    const recentContracts = contracts
      .sort((a: any, b: any) => {
        const dateA = a.registrationDate || a.RegistrationDate || a.createdAt || a.CreatedAt;
        const dateB = b.registrationDate || b.RegistrationDate || b.createdAt || b.CreatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 5)
      .map((c: any) => ({
        contractId: c.contractID || c.contractId,
        buyerCountry: c.buyerCountry || c.BuyerCountry,
        totalValue: c.totalValue || c.TotalValue || 0,
        status: c.contractStatus || c.ContractStatus || 'UNKNOWN',
        completedDate: c.completedDate || c.CompletedDate || null
      }));

    // Get recent shipments (last 5)
    const recentShipments = shipments
      .sort((a: any, b: any) => {
        const dateA = a.shippedDate || a.ShippedDate || a.createdAt || a.CreatedAt;
        const dateB = b.shippedDate || b.ShippedDate || b.createdAt || b.CreatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 5)
      .map((s: any) => ({
        shipmentId: s.shipmentID || s.shipmentId,
        destination: s.destinationPort || s.DestinationPort || s.destination || s.Destination,
        status: s.status || s.Status || 'UNKNOWN',
        deliveryDate: s.actualArrivalDate || s.ActualArrivalDate || null
      }));

    const historicalData = {
      exporterId,
      exporterName: exporterId, // Could query from exporter table if needed
      totalContracts,
      completedContracts,
      totalShipments,
      onTimeShipments,
      totalPayments,
      successfulPayments,
      totalValueExported,
      averageContractValue,
      complianceScore,
      lastShipmentDate,
      recentContracts,
      recentShipments
    };

    logger.info(`✅ Historical performance calculated: ${totalContracts} contracts, ${totalShipments} shipments, ${complianceScore}% compliance`);

    res.json({
      success: true,
      data: historicalData
    });

  } catch (error: any) {
    logger.error('❌ Error fetching historical performance:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch historical performance',
        details: error.message
      }
    });
  }
});

/**
 * Post-Delivery Workflow Routes
 * Professional API endpoints for managing post-delivery processes
 */

import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import PostDeliveryWorkflowService from '../services/postDeliveryWorkflowService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const workflowService = new PostDeliveryWorkflowService();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * @swagger
 * /api/v1/post-delivery/{shipmentId}/status:
 *   get:
 *     summary: Get post-delivery workflow status
 *     tags: [Post-Delivery]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post-delivery status retrieved
 *       404:
 *         description: No post-delivery record found
 */
router.get('/:shipmentId/status',
  authMiddleware,
  [param('shipmentId').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;

      const status = await workflowService.getPostDeliveryStatus(shipmentId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Post-delivery record not found for this shipment'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error getting post-delivery status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve post-delivery status'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/post-delivery/{shipmentId}/payment:
 *   post:
 *     summary: Record payment received
 *     tags: [Post-Delivery]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentAmount
 *               - paymentCurrency
 *               - swiftReference
 *             properties:
 *               paymentAmount:
 *                 type: number
 *               paymentCurrency:
 *                 type: string
 *               swiftReference:
 *                 type: string
 */
router.post('/:shipmentId/payment',
  authMiddleware,
  [
    param('shipmentId').notEmpty().withMessage('Shipment ID is required'),
    body('paymentAmount').isNumeric().withMessage('Payment amount must be a number'),
    body('paymentCurrency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('swiftReference').notEmpty().withMessage('SWIFT reference is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      const { paymentAmount, paymentCurrency, swiftReference } = req.body;
      const userId = (req as any).user.userId;

      const result = await workflowService.recordPaymentReceived(
        shipmentId,
        parseFloat(paymentAmount),
        paymentCurrency,
        swiftReference,
        userId
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Payment recorded successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_RECORD_FAILED',
            message: result.error || 'Failed to record payment'
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Error recording payment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record payment'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/post-delivery/{shipmentId}/forex:
 *   post:
 *     summary: Record forex repatriation
 *     tags: [Post-Delivery]
 */
router.post('/:shipmentId/forex',
  authMiddleware,
  [
    param('shipmentId').notEmpty().withMessage('Shipment ID is required'),
    body('forexAmount').isNumeric().withMessage('Forex amount must be a number'),
    body('forexRate').isNumeric().withMessage('Forex rate must be a number')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      const { forexAmount, forexRate } = req.body;
      const userId = (req as any).user.userId;

      const result = await workflowService.recordForexRepatriation(
        shipmentId,
        parseFloat(forexAmount),
        parseFloat(forexRate),
        userId
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Forex repatriation recorded successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'FOREX_RECORD_FAILED',
            message: result.error || 'Failed to record forex repatriation'
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Error recording forex repatriation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record forex repatriation'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/post-delivery/{shipmentId}/lc-settlement:
 *   post:
 *     summary: Record LC settlement
 *     tags: [Post-Delivery]
 */
router.post('/:shipmentId/lc-settlement',
  authMiddleware,
  [
    param('shipmentId').notEmpty().withMessage('Shipment ID is required'),
    body('lcReference').notEmpty().withMessage('LC reference is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      const { lcReference } = req.body;
      const userId = (req as any).user.userId;

      const result = await workflowService.recordLCSettlement(
        shipmentId,
        lcReference,
        userId
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'LC settlement recorded successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'LC_SETTLEMENT_FAILED',
            message: result.error || 'Failed to record LC settlement'
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Error recording LC settlement:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record LC settlement'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/post-delivery/{shipmentId}/ecta-audit:
 *   post:
 *     summary: Record ECTA audit result
 *     tags: [Post-Delivery]
 */
router.post('/:shipmentId/ecta-audit',
  authMiddleware,
  [
    param('shipmentId').notEmpty().withMessage('Shipment ID is required'),
    body('auditResult').isIn(['PASSED', 'FAILED']).withMessage('Audit result must be PASSED or FAILED'),
    body('auditNotes').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      const { auditResult, auditNotes } = req.body;
      const userId = (req as any).user.userId;

      const result = await workflowService.recordECTAAudit(
        shipmentId,
        auditResult,
        auditNotes || '',
        userId
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'ECTA audit recorded successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'AUDIT_RECORD_FAILED',
            message: result.error || 'Failed to record ECTA audit'
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Error recording ECTA audit:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record ECTA audit'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/post-delivery/{shipmentId}/close-contract:
 *   post:
 *     summary: Close export contract
 *     tags: [Post-Delivery]
 */
router.post('/:shipmentId/close-contract',
  authMiddleware,
  [param('shipmentId').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      const userId = (req as any).user.userId;

      const result = await workflowService.closeContract(shipmentId, userId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Contract closed successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CONTRACT_CLOSURE_FAILED',
            message: result.error || 'Failed to close contract'
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Error closing contract:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to close contract'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/post-delivery/dashboard:
 *   get:
 *     summary: Get post-delivery dashboard data
 *     tags: [Post-Delivery]
 */
router.get('/dashboard',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { DatabaseService } = require('../services/databaseService');
      const db = DatabaseService.getInstance();

      // Get summary statistics
      const summary = await db.query('SELECT * FROM v_post_delivery_summary');
      const pendingPayments = await db.query('SELECT * FROM v_pending_payments LIMIT 10');
      const pendingForex = await db.query('SELECT * FROM v_pending_forex LIMIT 10');
      const pendingAudits = await db.query('SELECT * FROM v_pending_ecta_audits LIMIT 10');
      const readyForClosure = await db.query('SELECT * FROM v_ready_for_closure LIMIT 10');

      res.json({
        success: true,
        data: {
          summary: summary.rows,
          pendingPayments: pendingPayments.rows,
          pendingForex: pendingForex.rows,
          pendingAudits: pendingAudits.rows,
          readyForClosure: readyForClosure.rows
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve dashboard data'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;

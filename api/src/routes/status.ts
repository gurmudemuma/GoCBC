// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Unified Status Management API Routes

import express from 'express';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param, query } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * /api/v1/status/transitions/{entityType}:
 *   get:
 *     summary: Get allowed status transitions for an entity type
 *     tags: [Status Management]
 */
router.get('/transitions/:entityType',
  authMiddleware,
  [
    param('entityType').notEmpty().withMessage('Entity type is required'),
    query('currentStatus').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { entityType } = req.params;
      const { currentStatus } = req.query;

      if (currentStatus) {
        // Get next possible statuses from current status
        const nextStatuses = statusManager.getNextStatuses(entityType.toUpperCase(), currentStatus as string);
        
        res.json({
          success: true,
          data: {
            entityType,
            currentStatus,
            nextStatuses,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        // Get all transitions for entity type
        const { StatusTransitions } = await import('../utils/statusManager');
        const transitions = StatusTransitions[entityType.toUpperCase() as keyof typeof StatusTransitions];
        
        res.json({
          success: true,
          data: {
            entityType,
            transitions: transitions || {},
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[STATUS] Error getting transitions:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/status/{entityType}/{entityId}/timeline:
 *   get:
 *     summary: Get status timeline for an entity
 *     tags: [Status Management]
 */
router.get('/:entityType/:entityId/timeline',
  authMiddleware,
  [
    param('entityType').notEmpty().withMessage('Entity type is required'),
    param('entityId').notEmpty().withMessage('Entity ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;

      const timeline = await statusManager.getStatusTimeline(
        entityType.toUpperCase(),
        entityId
      );

      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          timeline,
          totalChanges: timeline.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[STATUS] Error getting timeline:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/status/{entityType}/{entityId}/validate:
 *   post:
 *     summary: Validate if a status transition is allowed
 *     tags: [Status Management]
 */
router.post('/:entityType/:entityId/validate',
  authMiddleware,
  [
    param('entityType').notEmpty().withMessage('Entity type is required'),
    param('entityId').notEmpty().withMessage('Entity ID is required'),
    body('currentStatus').notEmpty().withMessage('Current status is required'),
    body('newStatus').notEmpty().withMessage('New status is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { currentStatus, newStatus } = req.body;

      const isValid = statusManager.validateTransition(
        entityType.toUpperCase(),
        currentStatus,
        newStatus
      );

      const nextStatuses = statusManager.getNextStatuses(
        entityType.toUpperCase(),
        currentStatus
      );

      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          currentStatus,
          newStatus,
          isValid,
          allowedNextStatuses: nextStatuses,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[STATUS] Error validating transition:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/status/workflow/{entityId}:
 *   get:
 *     summary: Get complete workflow status across all related entities
 *     tags: [Status Management]
 */
router.get('/workflow/:entityId',
  authMiddleware,
  [
    param('entityId').notEmpty().withMessage('Entity ID is required'),
    query('type').isIn(['CONTRACT', 'SHIPMENT', 'PAYMENT']).withMessage('Type must be CONTRACT, SHIPMENT, or PAYMENT'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { entityId } = req.params;
      const { type } = req.query;

      // Get statuses for all related entities in the workflow
      const workflowStatus: any = {
        rootEntity: { type, id: entityId },
        statuses: {},
      };

      if (type === 'CONTRACT') {
        // Get contract, forex, LC, shipment, customs, payment statuses
        workflowStatus.statuses = {
          contract: await getEntityStatus('CONTRACT', entityId),
          forex: await getRelatedStatus('FOREX', 'contractId', entityId),
          lc: await getRelatedStatus('LC', 'contractId', entityId),
          shipment: await getRelatedStatus('SHIPMENT', 'contractId', entityId),
          payment: await getRelatedStatus('PAYMENT', 'contractId', entityId),
        };
      } else if (type === 'SHIPMENT') {
        // Get shipment and all its related statuses
        workflowStatus.statuses = {
          shipment: await getEntityStatus('SHIPMENT', entityId),
          quality: await getRelatedStatus('QUALITY', 'shipmentId', entityId),
          phytosanitary: await getRelatedStatus('PHYTOSANITARY', 'shipmentId', entityId),
          eudr: await getRelatedStatus('EUDR', 'shipmentId', entityId),
          insurance: await getRelatedStatus('INSURANCE', 'shipmentId', entityId),
          landTransport: await getRelatedStatus('LANDTRANSPORT', 'shipmentId', entityId),
          customs: await getRelatedStatus('CUSTOMS', 'shipmentId', entityId),
          courier: await getRelatedStatus('COURIER', 'shipmentId', entityId),
        };
      } else if (type === 'PAYMENT') {
        // Get payment and related statuses
        workflowStatus.statuses = {
          payment: await getEntityStatus('PAYMENT', entityId),
          swift: await getRelatedStatus('SWIFT', 'paymentId', entityId),
          documents: await getRelatedStatus('DOCUMENTS', 'paymentId', entityId),
        };
      }

      res.json({
        success: true,
        data: workflowStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[STATUS] Error getting workflow status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Helper functions
async function getEntityStatus(entityType: string, entityId: string) {
  try {
    const { FabricService } = await import('../services/fabricService');
    const fabricService = FabricService.getInstance();
    
    const result = await fabricService.queryChaincode(`Read${entityType}`, [entityId]);
    
    if (result.success && result.data) {
      return {
        id: entityId,
        status: result.data.status || result.data.Status || 'UNKNOWN',
        lastUpdated: result.data.updatedAt || result.data.UpdatedAt,
      };
    }
  } catch (error) {
    logger.warn(`Could not get status for ${entityType} ${entityId}`);
  }
  
  return { id: entityId, status: 'NOT_FOUND', lastUpdated: null };
}

async function getRelatedStatus(entityType: string, fieldName: string, fieldValue: string) {
  try {
    const { FabricService } = await import('../services/fabricService');
    const fabricService = FabricService.getInstance();
    
    const result = await fabricService.queryChaincode(
      `QueryBy${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
      [fieldValue]
    );
    
    if (result.success && result.data) {
      const entities = Array.isArray(result.data) ? result.data : [result.data];
      
      return entities.map((entity: any) => ({
        id: entity.id || entity.ID || entity[`${entityType.toLowerCase()}Id`],
        status: entity.status || entity.Status || 'UNKNOWN',
        lastUpdated: entity.updatedAt || entity.UpdatedAt,
      }));
    }
  } catch (error) {
    logger.warn(`Could not get related ${entityType} for ${fieldName}=${fieldValue}`);
  }
  
  return [];
}

export default router;

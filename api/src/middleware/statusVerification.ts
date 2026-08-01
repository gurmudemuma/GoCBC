// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Status Verification Middleware

import { Request, Response, NextFunction } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

const fabricService = FabricService.getInstance();

/**
 * Status Verification Middleware
 * Verifies that entities have reached expected status before allowing operations
 */

interface StatusVerificationConfig {
  entityType: 'contract' | 'forex' | 'lc' | 'shipment' | 'inspection' | 'declaration' | 'payment';
  idParam: string;
  requiredStatuses: string[];
  operation: string;
}

/**
 * Creates middleware to verify entity status before operation
 */
export const verifyStatus = (config: StatusVerificationConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = req.params[config.idParam] || req.body[config.idParam];

      if (!entityId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ENTITY_ID',
            message: `${config.entityType} ID is required for operation: ${config.operation}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Query blockchain for entity status
      let result;
      let currentStatus: string;

      switch (config.entityType) {
        case 'contract':
          result = await fabricService.getSalesContract(entityId);
          currentStatus = result.data?.status || result.data?.Status || '';
          break;

        case 'forex':
          result = await fabricService.getForex(entityId);
          currentStatus = result.data?.status || result.data?.Status || '';
          break;

        case 'lc':
          result = await fabricService.getLC(entityId);
          currentStatus = result.data?.status || result.data?.Status || '';
          break;

        case 'shipment':
          result = await fabricService.getShipment(entityId);
          currentStatus = result.data?.status || result.data?.Status || '';
          break;

        case 'inspection':
          result = await fabricService.getInspection(entityId);
          currentStatus = result.data?.status || result.data?.Status || '';
          break;

        case 'declaration':
          result = await fabricService.getCustomsDeclaration(entityId);
          currentStatus = result.data?.status || result.data?.Status || '';
          break;

        case 'payment':
          result = await fabricService.queryChaincode('ReadPayment', [entityId]);
          currentStatus = result.data?.status || result.data?.Status || '';
          break;

        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ENTITY_TYPE',
              message: `Unknown entity type: ${config.entityType}`,
            },
            timestamp: new Date().toISOString(),
          });
      }

      // Check if entity exists
      if (!result.success || !result.data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ENTITY_NOT_FOUND',
            message: `${config.entityType} ${entityId} not found`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Verify status is in required list
      const statusMatch = config.requiredStatuses.some(
        (requiredStatus) => currentStatus.toUpperCase() === requiredStatus.toUpperCase()
      );

      if (!statusMatch) {
        logger.warn(
          `Status verification failed: ${config.entityType} ${entityId} has status ${currentStatus}, required: ${config.requiredStatuses.join(' or ')}`
        );

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot perform ${config.operation}: ${config.entityType} must have status ${config.requiredStatuses.join(' or ')}, current status is ${currentStatus}`,
            currentStatus,
            requiredStatuses: config.requiredStatuses,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Status verified, attach entity data to request for use by route handler
      (req as any).verifiedEntity = result.data;
      (req as any).verifiedEntityStatus = currentStatus;

      logger.info(
        `Status verified: ${config.entityType} ${entityId} has status ${currentStatus} for operation: ${config.operation}`
      );

      next();
    } catch (error: any) {
      logger.error(`Status verification error for ${config.operation}:`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: 'Failed to verify entity status',
          details: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
};

/**
 * Predefined status verification configurations
 */
export const statusVerifiers = {
  // Contract must be ECTA_APPROVED before forex request
  contractApprovedForForex: verifyStatus({
    entityType: 'contract',
    idParam: 'contractID',
    requiredStatuses: ['ECTA_APPROVED', 'ACTIVE'],
    operation: 'forex request',
  }),

  // Forex must be ALLOCATED before LC request
  forexAllocatedForLC: verifyStatus({
    entityType: 'forex',
    idParam: 'forexID',
    requiredStatuses: ['ALLOCATED'],
    operation: 'LC issuance',
  }),

  // LC must be ISSUED before shipment
  lcIssuedForShipment: verifyStatus({
    entityType: 'lc',
    idParam: 'lcID',
    requiredStatuses: ['ISSUED'],
    operation: 'shipment creation',
  }),

  // Shipment must exist before quality inspection
  shipmentExistsForInspection: verifyStatus({
    entityType: 'shipment',
    idParam: 'shipmentID',
    requiredStatuses: ['PENDING_QUALITY_CHECK', 'CREATED'],
    operation: 'quality inspection',
  }),

  // Inspection must be APPROVED before export permit
  inspectionApprovedForPermit: verifyStatus({
    entityType: 'inspection',
    idParam: 'inspectionID',
    requiredStatuses: ['APPROVED'],
    operation: 'export permit issuance',
  }),

  // Inspection must have EXPORT_PERMIT before customs
  inspectionHasPermitForCustoms: verifyStatus({
    entityType: 'inspection',
    idParam: 'inspectionID',
    requiredStatuses: ['APPROVED'],
    operation: 'customs declaration',
  }),

  // Declaration must be UNDER_REVIEW before clearance
  declarationReadyForClearance: verifyStatus({
    entityType: 'declaration',
    idParam: 'declarationId',
    requiredStatuses: ['UNDER_REVIEW'],
    operation: 'customs clearance',
  }),

  // Shipment must be CUSTOMS_CLEARED before bill of lading
  shipmentClearedForBL: verifyStatus({
    entityType: 'shipment',
    idParam: 'shipmentID',
    requiredStatuses: ['CUSTOMS_CLEARED'],
    operation: 'bill of lading',
  }),

  // LC must be ISSUED before payment
  lcIssuedForPayment: verifyStatus({
    entityType: 'lc',
    idParam: 'lcID',
    requiredStatuses: ['ISSUED'],
    operation: 'payment initiation',
  }),

  // Payment must be VERIFIED before settlement
  paymentVerifiedForSettlement: verifyStatus({
    entityType: 'payment',
    idParam: 'paymentID',
    requiredStatuses: ['VERIFIED', 'DOCUMENTS_VERIFIED'],
    operation: 'payment settlement',
  }),
};

/**
 * Utility to verify multiple entities in sequence
 */
export const verifyMultipleStatuses = (configs: StatusVerificationConfig[]) => {
  const middlewares = configs.map((config) => verifyStatus(config));

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const middleware of middlewares) {
        await new Promise<void>((resolve, reject) => {
          middleware(req, res, (err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      next();
    } catch (error) {
      // Error already sent by individual middleware
      return;
    }
  };
};

export default verifyStatus;

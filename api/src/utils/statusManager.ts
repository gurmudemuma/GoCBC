// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Status Management Utility - Ensures status transitions cascade properly

import { logger } from './logger';
import { FabricService } from '../services/fabricService';

/**
 * Status Transition Rules for Each Entity
 */
export const StatusTransitions = {
  // Exporter Application Status Flow
  APPLICATION: {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: [],
    REJECTED: ['PENDING'], // Can resubmit
  },

  // User Account Status Flow
  USER: {
    INACTIVE: ['ACTIVE', 'REJECTED'],
    ACTIVE: ['SUSPENDED', 'INACTIVE'],
    REJECTED: ['INACTIVE'], // Can resubmit
    SUSPENDED: ['ACTIVE', 'INACTIVE'],
  },

  // Sales Contract Status Flow
  CONTRACT: {
    REGISTERED: ['APPROVED', 'REJECTED'],
    APPROVED: ['EXECUTED', 'CANCELLED'],
    REJECTED: [],
    EXECUTED: ['COMPLETED'],
    CANCELLED: [],
    COMPLETED: [],
  },

  // Forex Request Status Flow
  FOREX: {
    REQUESTED: ['ALLOCATED', 'REJECTED'],
    ALLOCATED: ['UTILIZED', 'EXPIRED'],
    REJECTED: [],
    UTILIZED: ['SETTLED'],
    EXPIRED: [],
    SETTLED: [],
  },

  // Letter of Credit Status Flow
  LC: {
    REQUESTED: ['APPROVED', 'REJECTED'],
    APPROVED: ['ISSUED'],
    ISSUED: ['SHIPPED', 'AMENDED', 'EXPIRED'],
    AMENDED: ['SHIPPED', 'EXPIRED'],
    SHIPPED: ['DOCUMENTS_PRESENTED'],
    DOCUMENTS_PRESENTED: ['DOCUMENTS_ACCEPTED', 'DISCREPANCY_NOTED'],
    DOCUMENTS_ACCEPTED: ['PAYMENT_RELEASED'],
    DISCREPANCY_NOTED: ['DOCUMENTS_ACCEPTED', 'REJECTED'],
    PAYMENT_RELEASED: ['UTILIZED'],
    UTILIZED: [],
    REJECTED: [],
    EXPIRED: [],
  },

  // Shipment Status Flow
  SHIPMENT: {
    CREATED: ['QUALITY_INSPECTION', 'CANCELLED'],
    QUALITY_INSPECTION: ['QUALITY_APPROVED', 'QUALITY_REJECTED'],
    QUALITY_APPROVED: ['PHYTO_INSPECTION'],
    PHYTO_INSPECTION: ['PHYTO_APPROVED'],
    PHYTO_APPROVED: ['EUDR_VERIFICATION'],
    EUDR_VERIFICATION: ['EUDR_APPROVED'],
    EUDR_APPROVED: ['INSURANCE_REGISTERED'],
    INSURANCE_REGISTERED: ['LAND_TRANSPORT_STARTED'],
    LAND_TRANSPORT_STARTED: ['BORDER_CROSSING'],
    BORDER_CROSSING: ['PORT_ARRIVED'],
    PORT_ARRIVED: ['CUSTOMS_DECLARED'],
    CUSTOMS_DECLARED: ['CUSTOMS_CLEARED', 'CUSTOMS_REJECTED'],
    CUSTOMS_CLEARED: ['CONTAINER_STUFFED'],
    CONTAINER_STUFFED: ['VESSEL_LOADED'],
    VESSEL_LOADED: ['IN_TRANSIT'],
    IN_TRANSIT: ['ARRIVED_DESTINATION'],
    ARRIVED_DESTINATION: ['DELIVERED'],
    DELIVERED: [],
    QUALITY_REJECTED: [],
    CUSTOMS_REJECTED: [],
    CANCELLED: [],
  },

  // Payment Status Flow
  PAYMENT: {
    PENDING: ['DOCUMENTS_SUBMITTED', 'CANCELLED'],
    DOCUMENTS_SUBMITTED: ['VERIFIED', 'REJECTED'],
    VERIFIED: ['SWIFT_INITIATED'],
    SWIFT_INITIATED: ['SWIFT_RECEIVED', 'SWIFT_FAILED'],
    SWIFT_RECEIVED: ['SETTLED'],
    SETTLED: ['DOCUMENTS_RELEASED'],
    DOCUMENTS_RELEASED: ['COMPLETED'],
    COMPLETED: [],
    REJECTED: [],
    SWIFT_FAILED: ['SWIFT_INITIATED'], // Can retry
    CANCELLED: [],
  },

  // Phytosanitary Certificate Status Flow
  PHYTOSANITARY: {
    REQUESTED: ['INSPECTION_SCHEDULED'],
    INSPECTION_SCHEDULED: ['INSPECTION_COMPLETED'],
    INSPECTION_COMPLETED: ['ISSUED', 'REJECTED'],
    ISSUED: ['VALID', 'EXPIRED'],
    VALID: ['EXPIRED'],
    REJECTED: [],
    EXPIRED: [],
  },

  // EUDR Due Diligence Status Flow
  EUDR: {
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['VERIFIED', 'REJECTED'],
    VERIFIED: ['VALID'],
    VALID: [],
    REJECTED: ['SUBMITTED'], // Can resubmit with corrections
  },

  // Insurance Policy Status Flow
  INSURANCE: {
    REGISTERED: ['ACTIVE'],
    ACTIVE: ['CLAIM_FILED', 'EXPIRED', 'CANCELLED'],
    CLAIM_FILED: ['CLAIM_UNDER_REVIEW'],
    CLAIM_UNDER_REVIEW: ['CLAIM_APPROVED', 'CLAIM_REJECTED'],
    CLAIM_APPROVED: ['CLAIM_SETTLED'],
    CLAIM_SETTLED: ['ACTIVE', 'EXPIRED'],
    CLAIM_REJECTED: ['ACTIVE'],
    EXPIRED: [],
    CANCELLED: [],
  },

  // Customs Declaration Status Flow
  CUSTOMS: {
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['INSPECTION_REQUIRED', 'PRE_CLEARED'],
    INSPECTION_REQUIRED: ['INSPECTION_SCHEDULED'],
    INSPECTION_SCHEDULED: ['INSPECTION_IN_PROGRESS'],
    INSPECTION_IN_PROGRESS: ['INSPECTION_PASSED', 'INSPECTION_FAILED'],
    INSPECTION_PASSED: ['CLEARED'],
    PRE_CLEARED: ['CLEARED'],
    CLEARED: ['RELEASED'],
    RELEASED: [],
    INSPECTION_FAILED: ['INSPECTION_SCHEDULED'], // Can reschedule
  },
};

/**
 * Related Entity Status Updates
 * When one entity changes status, these related entities should also update
 */
export const RelatedStatusUpdates = {
  // When contract is approved
  CONTRACT_APPROVED: [
    { entity: 'FOREX', field: 'contractId', statusField: 'status', newStatus: 'ELIGIBLE' },
  ],

  // When forex is allocated
  FOREX_ALLOCATED: [
    { entity: 'LC', field: 'contractId', statusField: 'status', newStatus: 'FOREX_BACKED' },
  ],

  // When LC is issued
  LC_ISSUED: [
    { entity: 'CONTRACT', field: 'contractId', statusField: 'status', newStatus: 'LC_ISSUED' },
  ],

  // When shipment is created
  SHIPMENT_CREATED: [
    { entity: 'CONTRACT', field: 'contractId', statusField: 'shipmentStatus', newStatus: 'SHIPMENT_CREATED' },
  ],

  // When quality is approved
  QUALITY_APPROVED: [
    { entity: 'SHIPMENT', field: 'shipmentId', statusField: 'status', newStatus: 'QUALITY_APPROVED' },
  ],

  // When phytosanitary is issued
  PHYTO_ISSUED: [
    { entity: 'SHIPMENT', field: 'shipmentId', statusField: 'phytoStatus', newStatus: 'PHYTO_APPROVED' },
  ],

  // When EUDR is verified
  EUDR_VERIFIED: [
    { entity: 'SHIPMENT', field: 'shipmentId', statusField: 'eudrStatus', newStatus: 'EUDR_VERIFIED' },
  ],

  // When customs is cleared
  CUSTOMS_CLEARED: [
    { entity: 'SHIPMENT', field: 'shipmentId', statusField: 'customsStatus', newStatus: 'CLEARED' },
  ],

  // When payment is settled
  PAYMENT_SETTLED: [
    { entity: 'LC', field: 'lcId', statusField: 'status', newStatus: 'UTILIZED' },
    { entity: 'FOREX', field: 'forexId', statusField: 'status', newStatus: 'UTILIZED' },
    { entity: 'CONTRACT', field: 'contractId', statusField: 'paymentStatus', newStatus: 'SETTLED' },
  ],

  // When documents are received by courier
  DOCUMENTS_RECEIVED: [
    { entity: 'PAYMENT', field: 'paymentId', statusField: 'documentsStatus', newStatus: 'RECEIVED' },
  ],
};

export class StatusManager {
  private fabricService: FabricService;

  constructor() {
    this.fabricService = FabricService.getInstance();
  }

  /**
   * Validate if a status transition is allowed
   */
  validateTransition(entityType: string, currentStatus: string, newStatus: string): boolean {
    const transitions = StatusTransitions[entityType as keyof typeof StatusTransitions];
    
    if (!transitions) {
      logger.warn(`No status transitions defined for entity type: ${entityType}`);
      return true; // Allow if not defined
    }

    const allowedNextStatuses = transitions[currentStatus as keyof typeof transitions] as string[] | undefined;
    
    if (!allowedNextStatuses || allowedNextStatuses.length === 0) {
      logger.warn(`Current status ${currentStatus} not found in transitions for ${entityType}`);
      return true; // Allow if not defined
    }

    const isAllowed = allowedNextStatuses.includes(newStatus);
    
    if (!isAllowed) {
      logger.error(`Invalid status transition for ${entityType}: ${currentStatus} → ${newStatus}`);
      logger.error(`Allowed transitions: ${allowedNextStatuses.join(', ')}`);
    }

    return isAllowed;
  }

  /**
   * Get next possible statuses for an entity
   */
  getNextStatuses(entityType: string, currentStatus: string): string[] {
    const transitions = StatusTransitions[entityType as keyof typeof StatusTransitions];
    
    if (!transitions) {
      return [];
    }

    const nextStatuses = transitions[currentStatus as keyof typeof transitions] as string[] | undefined;
    return nextStatuses || [];
  }

  /**
   * Update entity status with validation
   */
  async updateEntityStatus(
    entityType: string,
    entityId: string,
    currentStatus: string,
    newStatus: string,
    updateData?: any
  ): Promise<{ success: boolean; error?: string }> {
    // Validate transition
    if (!this.validateTransition(entityType, currentStatus, newStatus)) {
      return {
        success: false,
        error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
      };
    }

    try {
      // Update the entity on blockchain
      const result = await this.fabricService.invokeChaincode(
        `Update${entityType}Status`,
        [entityId, newStatus, JSON.stringify(updateData || {})]
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      logger.info(`✅ ${entityType} ${entityId}: ${currentStatus} → ${newStatus}`);

      // Trigger related status updates
      await this.cascadeStatusUpdates(entityType, entityId, newStatus);

      return { success: true };
    } catch (error: any) {
      logger.error(`Failed to update ${entityType} status:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cascade status updates to related entities
   */
  private async cascadeStatusUpdates(
    entityType: string,
    entityId: string,
    newStatus: string
  ): Promise<void> {
    const updateKey = `${entityType}_${newStatus}`;
    const relatedUpdates = RelatedStatusUpdates[updateKey as keyof typeof RelatedStatusUpdates];

    if (!relatedUpdates || !Array.isArray(relatedUpdates)) {
      return; // No cascading updates needed
    }

    logger.info(`🔄 Cascading status updates for ${updateKey}`);

    for (const update of relatedUpdates) {
      try {
        // Query related entities
        const queryResult = await this.fabricService.queryChaincode(
          `QueryBy${update.field.charAt(0).toUpperCase() + update.field.slice(1)}`,
          [entityId]
        );

        if (queryResult.success && queryResult.data) {
          const entities = Array.isArray(queryResult.data) ? queryResult.data : [queryResult.data];

          for (const entity of entities) {
            const relatedEntityId = entity[update.field];
            
            if (relatedEntityId) {
              await this.fabricService.invokeChaincode(
                `Update${update.entity}Status`,
                [relatedEntityId, update.newStatus]
              );

              logger.info(`  ↳ Updated ${update.entity} ${relatedEntityId}: ${update.newStatus}`);
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to cascade update to ${update.entity}:`, error);
        // Don't fail the main operation if cascade fails
      }
    }
  }

  /**
   * Get complete status timeline for an entity
   */
  async getStatusTimeline(
    entityType: string,
    entityId: string
  ): Promise<Array<{ status: string; timestamp: string; updatedBy: string }>> {
    try {
      const result = await this.fabricService.queryChaincode(
        `Get${entityType}History`,
        [entityId]
      );

      if (result.success && result.data) {
        return result.data.map((record: any) => ({
          status: record.status || record.Value?.status,
          timestamp: record.timestamp || record.Timestamp,
          updatedBy: record.updatedBy || record.Value?.updatedBy || 'SYSTEM',
        }));
      }

      return [];
    } catch (error) {
      logger.error(`Failed to get status timeline for ${entityType}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const statusManager = new StatusManager();

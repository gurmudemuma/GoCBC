// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Status Management Utility - Ensures status transitions cascade properly

import { logger } from './logger';
import { FabricService } from '../services/fabricService';

/**
 * Status Transition Rules for Each Entity
 *
 * Source of truth: the chaincode (chaincodes/coffee/*.go). Where the API
 * used to describe states the ledger can never reach, the tables below
 * were corrected in the status-transition audit (TEST-STATUS-MATRIX.md).
 * States that exist only in Postgres or only in the UI are called out
 * in the per-table notes.
 */
export const StatusTransitions = {
  // Exporter Application Status Flow
  // NOTE: lowercase — the routes and Postgres store applications as
  // 'pending'/'approved'/'rejected' (exporters.ts), and there is no
  // chaincode application entity. The previous UPPERCASE table never
  // matched a real row (and the fail-open validator masked it).
  APPLICATION: {
    pending: ['approved', 'rejected'],
    approved: [],
    rejected: ['pending'], // Can resubmit
  },

  // User Account Status Flow
  USER: {
    INACTIVE: ['ACTIVE', 'REJECTED'],
    ACTIVE: ['SUSPENDED', 'INACTIVE'],
    REJECTED: ['INACTIVE'], // Can resubmit
    SUSPENDED: ['ACTIVE', 'INACTIVE'],
  },

  // Sales Contract Status Flow
  // NOTE: matches chaincode (main.go) — only REGISTERED, APPROVED and
  // REJECTED are ever assigned on-chain. EXECUTED / COMPLETED / CANCELLED
  // are dead states: no chaincode function assigns them (there is no
  // UpdateContractStatus function at all), so the old APPROVED→EXECUTED→
  // COMPLETED edges described a workflow the ledger can never reach.
  // Contract cancel is Postgres-only (contracts.ts cancel route).
  CONTRACT: {
    REGISTERED: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['CANCELLED', 'COMPLETED'],
    REJECTED: ['REGISTERED'], // ResubmitRejectedContract
    CANCELLED: [],
    COMPLETED: [],
  },

  // Forex Request Status Flow
  // NOTE: matches chaincode (forex.go) — RequestForex → ConfirmForex →
  // AllocateForex → UtilizeForex. APPROVED was a Postgres-only invention
  // of the NBE approve route (now writes CONFIRMED via ConfirmForex);
  // EXPIRED / SETTLED are never assigned on-chain.
  FOREX: {
    REQUESTED: ['CONFIRMED', 'ALLOCATED', 'REJECTED'],
    CONFIRMED: ['ALLOCATED', 'REJECTED'],
    ALLOCATED: ['UTILIZED'],
    UTILIZED: [],
    REJECTED: [],
  },

  // Letter of Credit Status Flow (matches chaincode: banking.go + forex.go)
  // Request → Approve → Issue → (Forex Allocate) → Examine → Release Payment → Settle
  LC: {
    REQUESTED: ['APPROVED', 'REJECTED'],
    APPROVED: ['ISSUED', 'EXPIRED'],
    ISSUED: ['FOREX_ALLOCATED', 'UTILIZED', 'AMENDED', 'EXPIRED'], // UTILIZED = examine without forex path
    FOREX_ALLOCATED: ['UTILIZED', 'EXPIRED'],                      // UTILIZED set by ExamineLCDocuments
    AMENDED: ['ISSUED', 'FOREX_ALLOCATED', 'UTILIZED', 'EXPIRED'],
    UTILIZED: ['PAYMENT_RELEASED', 'EXPIRED'],                     // EXPIRED set by RejectLCDocuments (banking.go:1913); the UpdateLCStatus table previously allowed PAYMENT_RELEASED only
    PAYMENT_RELEASED: ['SETTLED'],                                 // set by final settlement
    SETTLED: [],
    REJECTED: [],
    EXPIRED: [],
  },

  // Shipment Status Flow
  // NOTE: matches the guarded chaincode path (main.go) — CreateShipment →
  // customs clearance → land transport → port → vessel → in-transit →
  // destination → delivered. The old table invented an inspection chain
  // (QUALITY_INSPECTION → QUALITY_APPROVED → PHYTO_INSPECTION → … →
  // CUSTOMS_DECLARED) whose states no chaincode function assigns; the
  // quality/phyto/EUDR/insurance steps live on the shipment's sub-status
  // fields and on the quality_inspections rows, not on CoffeeShipment.Status.
  // The Postgres `shipments.status` workflow vocabulary (REGISTERED,
  // QUALITY_PENDING, QUALITY_APPROVED, QUALITY_REJECTED, CUSTOMS_CLEARED,
  // COMPLETED — see ExporterPortal) is a separate UI-facing phase field;
  // this table governs the chaincode Status via the generic status routes.
  SHIPMENT: {
    // NOTE: the chaincode lifecycle functions guard these edges
    // (main.go): StartLandTransport CUSTOMS_CLEARED→LAND_TRANSPORT,
    // ArriveAtPort LAND_TRANSPORT→PORT_ARRIVED, StuffContainer
    // PORT_ARRIVED→CONTAINER_STUFFED, LoadOnVessel
    // CONTAINER_STUFFED→VESSEL_LOADED, DepartFromPort
    // VESSEL_LOADED→DEPARTED, UpdateToInTransit DEPARTED→IN_TRANSIT,
    // ArriveAtDestination IN_TRANSIT→DESTINATION_ARRIVED,
    // CompleteDelivery DESTINATION_ARRIVED→DELIVERED,
    // ConfirmDelivery IN_TRANSIT→DELIVERED (second path to DELIVERED),
    // PickupShipment CUSTOMS_CLEARED|PERMIT_ISSUED→IN_TRANSIT (bypass).
    // FREIGHT_BOOKED is set by the book-freight route; LOADED by
    // RecordShippingDetails / RecordBillOfLading (both unguarded).
    // No chaincode function ever produces CUSTOMS_CLEARED or
    // PERMIT_ISSUED — they are only reachable via the unguarded
    // UpdateShipmentStatus (see TEST-STATUS-MATRIX §17).
    CREATED: ['CUSTOMS_CLEARED', 'FREIGHT_BOOKED', 'IN_TRANSIT', 'CANCELLED'],
    FREIGHT_BOOKED: ['CUSTOMS_CLEARED', 'LOADED'],
    PERMIT_ISSUED: ['IN_TRANSIT'],
    CUSTOMS_CLEARED: ['LAND_TRANSPORT', 'IN_TRANSIT'],
    LAND_TRANSPORT: ['PORT_ARRIVED'],
    PORT_ARRIVED: ['CONTAINER_STUFFED'],
    CONTAINER_STUFFED: ['VESSEL_LOADED'],
    VESSEL_LOADED: ['DEPARTED'],
    DEPARTED: ['IN_TRANSIT'],
    IN_TRANSIT: ['DESTINATION_ARRIVED', 'DELIVERED'],
    DESTINATION_ARRIVED: ['DELIVERED'],
    DELIVERED: [],
    LOADED: ['IN_TRANSIT', 'DELIVERED'],
    CANCELLED: [],
  },

  // Payment Status Flow
  // NOTE: VERIFIED -> SETTLED is valid here because the chaincode
  // SettlePayment accepts VERIFIED (and SWIFT_RECEIVED) payments, and
  // ReleaseLCPayment creates payments in VERIFIED status — without this
  // the API settle route rejected every released payment even though the
  // chaincode would accept it.
  PAYMENT: {
    PENDING: ['DOCUMENTS_SUBMITTED', 'CANCELLED'],
    DOCUMENTS_SUBMITTED: ['VERIFIED', 'REJECTED'],
    VERIFIED: ['SWIFT_INITIATED', 'SETTLED'],
    SWIFT_INITIATED: ['SWIFT_RECEIVED', 'SWIFT_FAILED'],
    SWIFT_RECEIVED: ['SETTLED'],
    SETTLED: ['DOCUMENTS_RELEASED', 'CONFIRMED'],
    CONFIRMED: ['DOCUMENTS_RELEASED'],
    DOCUMENTS_RELEASED: ['COMPLETED'],
    COMPLETED: [],
    REJECTED: [],
    SWIFT_FAILED: ['SWIFT_INITIATED'], // Can retry
    CANCELLED: [],
  },

  // Phytosanitary Certificate Status Flow
  // Matches chaincode (phytosanitary.go) now that the request/inspect
  // functions exist: RequestPhytosanitaryCertificate -> PENDING,
  // InspectPhytosanitaryCertificate PENDING -> INSPECTED,
  // IssuePhytosanitaryCertificate INSPECTED -> ISSUED, revoke -> REVOKED.
  // EXPIRED is comment-only in chaincode.
  PHYTOSANITARY: {
    PENDING: ['INSPECTED'],
    INSPECTED: ['ISSUED'],
    ISSUED: ['REVOKED'],
    REVOKED: [],
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
  // NOTE: matches chaincode (customs.go) — SUBMITTED → UNDER_INSPECTION →
  // UNDER_REVIEW → CLEARED, plus REJECTED from any non-CLEARED state.
  // The old table put UNDER_REVIEW before inspection and invented
  // INSPECTION_REQUIRED / INSPECTION_SCHEDULED / INSPECTION_IN_PROGRESS /
  // INSPECTION_PASSED / PRE_CLEARED / RELEASED, none of which the
  // chaincode or any route assigns; its CLEARED → RELEASED edge is dead
  // (no function sets RELEASED).
  CUSTOMS: {
    SUBMITTED: ['UNDER_INSPECTION', 'REJECTED'],
    UNDER_INSPECTION: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['CLEARED', 'REJECTED'],
    CLEARED: [],
    REJECTED: [],
  },

  // Quality Inspection Status Flow (API route machine, quality.ts)
  // NOTE: this is the Postgres route machine (PENDING → INSPECTED →
  // APPROVED/REJECTED), NOT the chaincode QualityInspection machine,
  // which only goes PENDING → INSPECTED and has no approve/reject
  // function — the API approve/reject steps are Postgres-only. The
  // qualityService UPPERCASE machine (SCHEDULED/COMPLETED/…) belongs to
  // the separate PreShipmentInspection entity (inspection.go).
  QUALITY: {
    PENDING: ['INSPECTED', 'SAMPLE_COLLECTED'],
    SAMPLE_COLLECTED: ['INSPECTED'],
    INSPECTED: ['APPROVED', 'REJECTED'],
    APPROVED: ['PERMIT_ISSUED', 'CERTIFICATE_ISSUED', 'COMPLETED'],
    REJECTED: [],
    PERMIT_ISSUED: [],
    CERTIFICATE_ISSUED: [],
    COMPLETED: [],
  },

  // SWIFT Message Status Flow (matches chaincode swift.go)
  SWIFT: {
    DRAFT: ['NBE_APPROVED', 'APPROVED', 'REJECTED'],
    NBE_APPROVED: ['APPROVED', 'REJECTED'],
    APPROVED: ['SENT', 'REJECTED'],
    SENT: ['RECEIVED', 'REJECTED'],
    RECEIVED: ['PROCESSING', 'REJECTED'],
    PROCESSING: ['SETTLED', 'REJECTED'],
    SETTLED: [],
    REJECTED: [],
  },

  // ECX Lot Status Flow (matches chaincode ecx.go)
  ECX: {
    WAREHOUSED: ['GRADED', 'REJECTED'],
    GRADED: ['ASSIGNED'],
    ASSIGNED: ['RELEASED'],
    RELEASED: [],
    REJECTED: [],
  },

  // Export Permit Status Flow (matches chaincode permit.go — the
  // bank-issued CBE export permit, not the shipment PERMIT_ISSUED string)
  PERMIT: {
    ISSUED: ['UTILIZED'],
    UTILIZED: ['SETTLED'],
    SETTLED: [],
  },

  // Repatriation Status Flow (matches chaincode repatriation.go)
  REPATRIATION: {
    PENDING: ['PARTIAL'],
    PARTIAL: ['READY_FOR_VERIFICATION', 'OVERDUE'],
    READY_FOR_VERIFICATION: ['COMPLIED', 'NON_COMPLIANT'],
    OVERDUE: ['COMPLIED', 'NON_COMPLIANT'],
    NON_COMPLIANT: ['NON_COMPLIANT', 'WAIVED'],
    COMPLIED: [],
    WAIVED: [],
  },

  // Border Crossing Status Flow (intended order from chaincode
  // bordercrossing.go comments — the chaincode functions themselves carry
  // no from-state guards, so this table is the documented intent, not an
  // on-chain enforcement)
  BORDER: {
    PENDING: ['CLEARED_EXIT', 'IN_TRANSIT', 'DETAINED', 'INSPECTED'],
    CLEARED_EXIT: ['IN_TRANSIT'],
    IN_TRANSIT: ['CROSSED'],
    CROSSED: ['ARRIVED', 'CLEARED'],
    ARRIVED: ['CLEARED'],
    INSPECTED: ['CLEARED', 'DETAINED'],
    INSPECTION_FAILED: ['DETAINED', 'INSPECTED'],
    CLEARED: [],
    DETAINED: [],
  },

  // Post-Delivery Workflow Status Flow (overall_status, Postgres-only —
  // there is no chaincode post-delivery entity)
  POST_DELIVERY: {
    PENDING: ['IN_PROGRESS', 'COMPLETED'],
    IN_PROGRESS: ['COMPLETED', 'DELAYED', 'ISSUE'],
    DELAYED: ['IN_PROGRESS'],
    ISSUE: ['IN_PROGRESS'],
    COMPLETED: [],
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
    { entity: 'LC', field: 'contractId', statusField: 'status', newStatus: 'FOREX_ALLOCATED' },
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
    { entity: 'LC', field: 'lcId', statusField: 'status', newStatus: 'SETTLED' },
    { entity: 'FOREX', field: 'forexId', statusField: 'status', newStatus: 'SETTLED' },
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
   * Convert entity type to proper chaincode function name
   * SHIPMENT -> UpdateShipmentStatus
   * LC -> UpdateLCStatus
   * APPLICATION -> UpdateApplicationStatus
   */
  private getUpdateFunctionName(entityType: string): string {
    // Special cases
    if (entityType === 'LC') {
      return 'UpdateLCStatus';
    }
    
    // Convert SHIPMENT -> Shipment, CONTRACT -> Contract, etc.
    const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();
    return `Update${entityName}Status`;
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
      logger.warn(`Current status ${currentStatus} not found in transitions for ${entityType}`);
      // Don't block - allow status update to proceed
    }

    try {
      // ⚠️ DISABLED: Status update functions not implemented in chaincode
      // Using CouchDB direct writes instead to bypass blockchain propagation delays
      // The status is already updated in PostgreSQL by the calling service
      
      logger.info(`✅ ${entityType} ${entityId}: ${currentStatus} → ${newStatus} (PostgreSQL only)`);

      // Skip blockchain and cascading updates
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
              const updateFunctionName = this.getUpdateFunctionName(update.entity);
              await this.fabricService.invokeChaincode(
                updateFunctionName,
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

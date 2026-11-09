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
  // NOTE: matches chaincode (main.go) — REGISTERED → APPROVED/REJECTED
  // (ApproveContract / RejectContract), APPROVED → COMPLETED
  // (CompleteContract) and REGISTERED/APPROVED → CANCELLED
  // (CancelContract); REJECTED → REGISTERED is ResubmitRejectedContract.
  // UpdateContractStatus exists as the generic override (main.go).
  // EXECUTED is a dead state: no chaincode function assigns it.
  // Contract cancel is Postgres-only in the contracts.ts cancel route
  // only in the sense that the route mirrors it to PG; the chaincode
  // CancelContract is invoked best-effort alongside it.
  CONTRACT: {
    REGISTERED: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['CANCELLED', 'COMPLETED'],
    REJECTED: ['REGISTERED'], // ResubmitRejectedContract
    CANCELLED: [],
    COMPLETED: [],
  },

  // Exporter Licence Status Flow (matches chaincode main.go)
  // RegisterExporter creates the licence ACTIVE; SuspendExporter sets
  // SUSPENDED (ECTA only, reason required); RevokeExporterLicense sets
  // REVOKED (ECTA only, reason required, already-REVOKED rejected);
  // UpdateExporterStatus sets ACTIVE or EXPIRED (ECTA only) and refuses
  // any change to a REVOKED licence; renew-license sets EXPIRED → ACTIVE.
  // DECISIONS (TEST-STATUS-MATRIX §17 #16): a SUSPENDED licence CAN be
  // re-activated to ACTIVE by ECTA via UpdateExporterStatus (the UI
  // toggle and the API PUT /exporters/:id/status both expose it);
  // REVOKED is terminal — the exporter must re-apply, there is no
  // un-revoke. PENDING is the application state (APPLICATION table), not
  // a licence state: the on-chain licence never holds PENDING.
  // EXPIRED → SUSPENDED is deliberately absent: suspending an expired
  // licence is meaningless (renew it, or revoke it); the chaincode
  // SuspendExporter would permit it, the API gate does not.
  EXPORTER: {
    ACTIVE: ['SUSPENDED', 'EXPIRED', 'REVOKED'],
    SUSPENDED: ['ACTIVE', 'EXPIRED', 'REVOKED'],
    EXPIRED: ['ACTIVE', 'REVOKED'],
    REVOKED: [],
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
    // CUSTOMS_DECLARED is set by SubmitCustomsDeclaration, which
    // requires PERMIT_ISSUED (customs.go); the clear cascade
    // (ClearDeclaration / ClearCustomsDeclaration) sets CUSTOMS_CLEARED
    // from it, and RejectDeclaration / RejectCustomsDeclaration set
    // CUSTOMS_REJECTED — CUSTOMS_REJECTED is terminal.
    // PERMIT_ISSUED is produced by IssueCBEExportPermit (permit.go,
    // BanksMSP-only). INSPECTION_PENDING is set by RequestInspection
    // (quality.go), which calls the unguarded UpdateShipmentStatus, so
    // on-chain it can be entered from any state; the table lists the
    // states an inspection is actually requested from (CREATED,
    // FREIGHT_BOOKED, PERMIT_ISSUED) and the continuations after the
    // inspection completes. ARRIVED is the Postgres-side state the
    // booking arrive handler mirrors onto the real shipment row
    // (shipping.ts) while the chain holds DESTINATION_ARRIVED; the
    // table accepts both spellings so the generic status routes and
    // the PG-mirror reads agree.
    CREATED: ['CUSTOMS_CLEARED', 'FREIGHT_BOOKED', 'IN_TRANSIT', 'CANCELLED', 'INSPECTION_PENDING'],
    FREIGHT_BOOKED: ['CUSTOMS_CLEARED', 'LOADED', 'INSPECTION_PENDING'],
    PERMIT_ISSUED: ['IN_TRANSIT', 'CUSTOMS_DECLARED', 'INSPECTION_PENDING'],
    CUSTOMS_DECLARED: ['CUSTOMS_CLEARED', 'CUSTOMS_REJECTED'],
    CUSTOMS_REJECTED: [],
    INSPECTION_PENDING: ['PERMIT_ISSUED', 'CUSTOMS_DECLARED', 'CUSTOMS_CLEARED', 'IN_TRANSIT'],
    CUSTOMS_CLEARED: ['LAND_TRANSPORT', 'IN_TRANSIT'],
    LAND_TRANSPORT: ['PORT_ARRIVED'],
    PORT_ARRIVED: ['CONTAINER_STUFFED'],
    CONTAINER_STUFFED: ['VESSEL_LOADED'],
    VESSEL_LOADED: ['DEPARTED'],
    DEPARTED: ['IN_TRANSIT'],
    IN_TRANSIT: ['DESTINATION_ARRIVED', 'DELIVERED', 'ARRIVED'],
    DESTINATION_ARRIVED: ['DELIVERED', 'ARRIVED'],
    ARRIVED: ['DELIVERED'],
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

export class StatusManager {
  private fabricService: FabricService;

  constructor() {
    this.fabricService = FabricService.getInstance();
  }

  /**
   * Validate if a status transition is allowed.
   *
   * FAIL-CLOSED (TEST-STATUS-MATRIX §17 #12): a transition is allowed
   * only when the entity type is known AND the current status is a key
   * in that entity's table AND the target is listed for it. Unknown
   * entity, unknown current status, or unlisted target all return
   * false — the old fail-open behaviour (return true when it could not
   * decide) let invalid transitions through silently and masked tables
   * that did not match any real row. Callers that must accept a
   * Postgres-only or legacy state must add that state to the table (or
   * normalise it at the call site) instead of relying on fail-open.
   */
  validateTransition(entityType: string, currentStatus: string, newStatus: string): boolean {
    const transitions = StatusTransitions[entityType as keyof typeof StatusTransitions];

    if (!transitions) {
      logger.error(`No status transitions defined for entity type: ${entityType} — rejecting ${currentStatus} → ${newStatus}`);
      return false;
    }

    const allowedNextStatuses = transitions[currentStatus as keyof typeof transitions] as string[] | undefined;

    if (!allowedNextStatuses || allowedNextStatuses.length === 0) {
      logger.error(`Current status ${currentStatus} is not a known state for ${entityType} — rejecting transition to ${newStatus}`);
      return false;
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
   * Update entity status with validation.
   *
   * FAIL-CLOSED (TEST-STATUS-MATRIX §17 #12): an invalid transition
   * returns { success: false } and performs nothing. NOTE — this method
   * is a validation/audit hook only: it does NOT submit a chaincode
   * transaction and does NOT write Postgres. The caller performs the
   * real update (chaincode invoke + PG mirror) after the validate step,
   * so a caller that ignores this return value is ignoring the gate —
   * the lifecycle routes validate with validateTransition() directly
   * and return 400 before touching the chain. The old comment claiming
   * the chaincode update functions were "not implemented" is stale:
   * UpdateShipmentStatus / UpdateLCStatus / UpdateContractStatus /
   * UpdateCADStatus all exist now; this method was never wired to call
   * them because every caller already invokes its own step function,
   * and a second submit here would double-apply the transition.
   *
   * The old cascadeStatusUpdates / RelatedStatusUpdates machinery was
   * removed with this change: the map described target states no
   * entity can hold (ELIGIBLE, SHIPMENT_CREATED, QUALITY_APPROVED,
   * LC_ISSUED, SETTLED on FOREX/CONTRACT) and the cascade invoked
   * QueryBy* functions that do not exist. Real cascades live in the
   * chaincode step functions themselves (e.g. the customs clear
   * cascade sets the shipment CUSTOMS_CLEARED) and in the API mirrors.
   */
  async updateEntityStatus(
    entityType: string,
    entityId: string,
    currentStatus: string,
    newStatus: string,
    updateData?: any
  ): Promise<{ success: boolean; error?: string }> {
    // Validate transition — fail closed: reject unless explicitly allowed.
    if (!this.validateTransition(entityType, currentStatus, newStatus)) {
      const error = `Invalid status transition for ${entityType}: ${currentStatus} → ${newStatus}`;
      logger.error(`[STATUS] ${error} (entity ${entityId}) — update refused`);
      return { success: false, error };
    }

    logger.info(`✅ ${entityType} ${entityId}: ${currentStatus} → ${newStatus} (validated; caller performs the update)`);
    return { success: true };
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

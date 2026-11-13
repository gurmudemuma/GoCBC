// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipment Service - Handles all shipment-related blockchain operations

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';

export class ShipmentService {
  private static instance: ShipmentService;
  private fabricService: FabricService;
  private dbService: DatabaseService;
  private auditService: AuditService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): ShipmentService {
    if (!ShipmentService.instance) {
      ShipmentService.instance = new ShipmentService();
    }
    return ShipmentService.instance;
  }

  /**
   * Create new shipment. NOTE: shipment creation does NOT create a quality
   * inspection. Inspections are created only by an explicit quality request
   * (POST /quality/inspections), which writes RequestInspection to the ledger
   * first and mirrors to Postgres only on success (see quality.ts). The old
   * auto-create here inserted a Postgres-only PENDING inspection (INS-<ts>,
   * NULL tx id) that the quality-request guard then returned as "already
   * exists", so the explicit quality step never exercised a real on-chain
   * inspection. Removed 2026-11-12.
   */
  async createShipment(shipmentData: {
    shipmentID: string;
    contractID: string;
    exporterID: string;
    buyerID: string;
    origin: string;
    quantity: number;
    grade: string;
    icoNumber?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[ShipmentService] Creating shipment: ${shipmentData.shipmentID}`);

      // Verify contract is approved
      const contract = await this.dbService.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [shipmentData.contractID]
      );

      if (!contract || contract.status !== 'APPROVED') {
        throw new Error('Contract must be APPROVED to create shipment');
      }

      const result = await this.fabricService.invokeChaincode('CreateShipment', [
        shipmentData.shipmentID,
        shipmentData.contractID,
        shipmentData.exporterID,
        shipmentData.buyerID,
        shipmentData.origin,
        shipmentData.quantity.toString(),
        shipmentData.grade,
        shipmentData.icoNumber || '',
        '', // ecxLotNumber
        'EXPORT', // channel
        '0', // forexRate: 0 = auto-map from the ALLOCATED forex for this contract (CreateShipment, main.go); a hardcoded rate defeats that lookup
        '0', // valueUSD: 0 = auto-map from contract TotalValue (CreateShipment, main.go)
        'true', // eudrCompliant
        '[]', // documents JSON
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create shipment on blockchain');
      }

      await this.dbService.run(
        `INSERT INTO shipments (
          shipment_id, contract_id, exporter_id, buyer_id, origin,
          quantity, grade, ico_number, status, logistics_status, blockchain_synced,
          blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          shipmentData.shipmentID,
          shipmentData.contractID,
          shipmentData.exporterID,
          shipmentData.buyerID,
          shipmentData.origin,
          shipmentData.quantity,
          shipmentData.grade,
          shipmentData.icoNumber || null,
          'REGISTERED', // Workflow status
          'PENDING',    // Logistics status (not yet booked)
          true,
          result.txId,
        ]
      );

      await this.auditService.log({
        entityType: 'SHIPMENT',
        entityId: shipmentData.shipmentID,
        action: 'CREATE',
        performedBy: shipmentData.userId,
        organization: shipmentData.userOrg,
        performedByOrg: shipmentData.userOrg,
        oldValue: '',
        newValue: 'REGISTERED',
        reason: 'Shipment registered',
        metadata: { contractID: shipmentData.contractID, quantity: shipmentData.quantity },
      });

      // NOTE: no quality inspection is auto-created here. A shipment has NO
      // inspection row until an explicit quality request runs RequestInspection
      // on-chain (see routes/quality.ts). The old auto-create inserted a
      // Postgres-only PENDING inspection (INS-<ts>, NULL tx id) that made the
      // explicit quality step vacuous. Removed 2026-11-12.

      logger.info(`✅ [ShipmentService] Shipment created: ${shipmentData.shipmentID}`);
      return { success: true, shipmentID: shipmentData.shipmentID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ShipmentService] Create failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * REMOVED 2026-11-12: createQualityInspectionTask / createQualityInspectionTaskInternal.
   * These auto-created a Postgres-only PENDING inspection (INS-<Date.now()>,
   * NULL blockchain_tx_id, no ledger write) on every shipment creation and
   * flipped the shipment to QUALITY_PENDING. That phantom row tripped the
   * "shipment already has a pending inspection" guard in routes/quality.ts,
   * so an explicit quality request returned 200 with the phantom's ID instead
   * of running RequestInspection on-chain. Inspections are now created ONLY
   * by the explicit quality flow (POST /quality/inspections), which writes to
   * the ledger first and mirrors to Postgres only on success.
   */

  /**
   * 🔥 WORKFLOW TRIGGER: Auto-create customs declaration after quality approval
   * Called from quality approval workflow
   */
  async triggerCustomsDeclaration(shipmentID: string, inspectionID: string, userId: string) {
    try {
      logger.info(`[ShipmentService] 🔥 Triggering customs declaration for shipment: ${shipmentID}`);

      // IDEMPOTENCY (phase-3 seq-7 fix): the trigger now fires from two
      // places — quality approval (alternate order: permit already issued)
      // and permit issuance (literal order: inspection already approved).
      // At most one of them can succeed per shipment, but a second permit
      // for the same contract would re-fire; never create a second live
      // declaration for a shipment that already has one. Only SUBMITTED /
      // CLEARED count as live: a REJECTED declaration may legitimately be
      // replaced (F-7 resubmit), and a stray non-live row must not block
      // the real declaration. (PG SUBMITTED implies ledger success —
      // submitDeclaration inserts PG only after the chain call commits.)
      const existing = await this.dbService.get(
        `SELECT declaration_id FROM customs_declarations
          WHERE shipment_id = $1 AND status IN ('SUBMITTED', 'CLEARED')
          ORDER BY created_at DESC LIMIT 1`,
        [shipmentID]
      );
      if (existing?.declaration_id) {
        logger.info(`[ShipmentService] Customs declaration already exists for shipment ${shipmentID}: ${existing.declaration_id} — skipping duplicate trigger`);
        return { success: true, declarationID: existing.declaration_id, alreadyExists: true };
      }

      // Get shipment details
      const shipment = await this.dbService.get(
        'SELECT * FROM shipments WHERE shipment_id = $1',
        [shipmentID]
      );

      if (!shipment) {
        throw new Error(`Shipment not found: ${shipmentID}`);
      }

      // Get contract details for value
      const contract = await this.dbService.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [shipment.contract_id]
      );

      // Get exporter details
      const exporter = await this.dbService.get(
        'SELECT * FROM exporters WHERE exporter_id = $1',
        [shipment.exporter_id]
      );

      // Import CustomsService dynamically to avoid circular dependency
      const { customsService } = await import('./customsService');

      // Leg2 #9/#18: the value is the contract's total_value — never an
      // invented per-kg price (the old fallback was quantity × $5) — and
      // the HS code is the one code used everywhere, '090111' (green
      // coffee). No contract value means no auto-declaration: throwing
      // here only fails the trigger (the caller returns success:false),
      // it never fabricates a declaration.
      if (!contract || !Number.isFinite(Number(contract.total_value)) || Number(contract.total_value) <= 0) {
        throw new Error(`Cannot auto-create a customs declaration for shipment ${shipmentID}: contract ${shipment.contract_id} carries no total_value`);
      }
      const declarationID = `DECL-${Date.now()}`;

      await customsService.submitDeclaration({
        declarationID,
        shipmentID,
        exporterID: shipment.exporter_id,
        exporterName: exporter?.company_name || 'Unknown Exporter',
        hsCode: '090111', // Coffee HS code (green coffee, unroasted)
        quantity: shipment.quantity,
        value: Number(contract.total_value),
        currency: 'USD',
        destination: shipment.destination || contract?.buyer_country || 'Unknown',
        contractId: contract?.contract_id || shipment.contract_id,
        userId,
        userOrg: 'ECTAMSP'
      });

      // O-1: SubmitCustomsDeclaration moves the shipment to
      // CUSTOMS_DECLARED on-chain (customs.go:360); mirror it in
      // Postgres so the shipment leaves INSPECTION_COMPLETE in the
      // portals too. submitDeclaration throws on a chain failure, so
      // reaching here means the ledger move committed. Best-effort:
      // the mirror never fails this trigger.
      await this.mirrorShipmentStatus(shipmentID, 'CUSTOMS_DECLARED');

      logger.info(`✅ [ShipmentService] Customs declaration auto-created: ${declarationID} for shipment: ${shipmentID}`);

      return { success: true, declarationID };

    } catch (error: any) {
      logger.error(`❌ [ShipmentService] Customs declaration trigger failed: ${error.message}`);
      // Don't fail quality approval if customs declaration fails
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔥 WORKFLOW TRIGGER (phase-3 seq-7 fix): Auto-create the customs
   * declaration when a permit is issued AFTER inspection approval — the
   * literal order (inspect → permit → customs). The quality-approval
   * trigger (quality.ts) fires too early in that order: no permit exists
   * yet, so SubmitCustomsDeclaration fails its PERMIT_ISSUED gate on all
   * 6 peers and is never retried. Permit issuance is the first moment
   * both preconditions hold (inspection APPROVED + permit ISSUED). In the
   * alternate order (permit → inspection) there is no APPROVED inspection
   * yet, so this skips and the quality-approval trigger fires later
   * instead. Never throws; never creates a duplicate
   * (triggerCustomsDeclaration is idempotent per shipment).
   */
  async maybeTriggerCustomsDeclarationAfterPermit(shipmentID: string, userId: string) {
    try {
      if (!shipmentID) return { success: false, skipped: 'NO_SHIPMENT' };
      const inspection = await this.dbService.get(
        `SELECT inspection_id FROM quality_inspections
          WHERE shipment_id = $1 AND status = 'APPROVED'
          ORDER BY created_at DESC LIMIT 1`,
        [shipmentID]
      );
      if (!inspection?.inspection_id) {
        logger.info(`[ShipmentService] No APPROVED inspection for shipment ${shipmentID} yet — customs auto-declaration deferred to quality approval`);
        return { success: false, skipped: 'NO_APPROVED_INSPECTION' };
      }
      const result = await this.triggerCustomsDeclaration(shipmentID, inspection.inspection_id, userId);
      if (result.success && !result.alreadyExists) {
        logger.info(`✅ [ShipmentService] Customs declaration auto-created on permit issuance: ${result.declarationID} for shipment ${shipmentID}`);
      }
      return result;
    } catch (error: any) {
      logger.error(`[ShipmentService] Permit-issuance customs trigger failed (best-effort, permit stands): ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(
    shipmentID: string,
    newStatus: string,
    userId: string,
    userOrg: string,
    metadata?: any
  ) {
    try {
      logger.info(`[ShipmentService] Updating shipment status: ${shipmentID} -> ${newStatus}`);

      const shipment = await this.dbService.get(
        'SELECT * FROM shipments WHERE shipment_id = $1',
        [shipmentID]
      );

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      const isValid = statusManager.validateTransition('SHIPMENT', shipment.status, newStatus);
      if (!isValid) {
        throw new Error(`Invalid status transition from ${shipment.status} to ${newStatus}`);
      }

      await statusManager.updateEntityStatus('SHIPMENT', shipmentID, shipment.status, newStatus, metadata);

      await this.dbService.run(
        `UPDATE shipments SET status = $1, updated_at = NOW() WHERE shipment_id = $2`,
        [newStatus, shipmentID]
      );

      await this.auditService.log({
        entityType: 'SHIPMENT',
        entityId: shipmentID,
        action: 'UPDATE_STATUS',
        performedBy: userId,
        organization: userOrg,
        performedByOrg: userOrg,
        oldValue: shipment.status,
        newValue: newStatus,
        reason: `Status updated to ${newStatus}`,
        metadata,
      });

      logger.info(`✅ [ShipmentService] Shipment status updated: ${shipmentID} -> ${newStatus}`);
      return { success: true, shipmentID, newStatus };
    } catch (error: any) {
      logger.error(`❌ [ShipmentService] Status update failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Best-effort Postgres mirror of a ledger shipment status (O-1).
   *
   * This is NOT updateShipmentStatus above: that method validates the
   * transition against the API statusManager table, throws when the
   * shipment row is missing, and writes an audit row — all wrong for a
   * mirror of a status the ledger has ALREADY committed (e.g. the
   * quality-approve auto-trigger moves a shipment INSPECTION_COMPLETE
   * -> CUSTOMS_DECLARED, a transition the statusManager table does not
   * list). This method does one plain UPDATE and never throws: a mirror
   * failure must never turn a committed chain write into an error —
   * try/catch, warn-and-continue, same as mirrorShipmentStatusPG in
   * routes/shipments.ts (which now delegates here) and the other mirrors
   * in this codebase. A missing row simply updates 0 rows.
   *
   * @param onlyFrom when given, mirror only if the Postgres row currently
   *   holds one of these states — used for the IssueCBEExportPermit
   *   cascade, which moves only CREATED / INSPECTION_COMPLETE shipments
   *   to PERMIT_ISSUED (permit.go) and must never regress a shipment
   *   that already moved on.
   */
  async mirrorShipmentStatus(
    shipmentID: string,
    status: string,
    onlyFrom?: string[]
  ): Promise<void> {
    try {
      if (onlyFrom && onlyFrom.length > 0) {
        await this.dbService.run(
          `UPDATE shipments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE shipment_id = $2 AND status = ANY($3)`,
          [status, shipmentID, onlyFrom]
        );
      } else {
        await this.dbService.run(
          `UPDATE shipments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE shipment_id = $2`,
          [status, shipmentID]
        );
      }
    } catch (err) {
      logger.warn(`[ShipmentService] Could not mirror shipment ${shipmentID} status ${status} to Postgres:`, err);
    }
  }

  /**
   * Best-effort Postgres mirror of the IssueCBEExportPermit cascade
   * (permit.go): the permit carries no ShipmentID — it links shipments
   * through ContractID — so the chaincode moves EVERY shipment under the
   * contract that is waiting for a permit. Mirror the same set in
   * Postgres. Same never-throws contract as mirrorShipmentStatus.
   */
  async mirrorShipmentStatusForContract(
    contractID: string,
    status: string,
    onlyFrom?: string[]
  ): Promise<void> {
    try {
      if (onlyFrom && onlyFrom.length > 0) {
        await this.dbService.run(
          `UPDATE shipments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE contract_id = $2 AND status = ANY($3)`,
          [status, contractID, onlyFrom]
        );
      } else {
        await this.dbService.run(
          `UPDATE shipments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE contract_id = $2`,
          [status, contractID]
        );
      }
    } catch (err) {
      logger.warn(`[ShipmentService] Could not mirror contract ${contractID} shipments to ${status} in Postgres:`, err);
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentID: string) {
    return await this.dbService.get(
      'SELECT * FROM shipments WHERE shipment_id = $1',
      [shipmentID]
    );
  }

  /**
   * Validate a shipment exists in BOTH stores before a write that names
   * it (permit issuance, customs submission). Two holes this closes:
   * (1) issue-permit returned 200/201 for a shipmentID that exists
   * nowhere — the chaincode IssueCBEExportPermit never sees a
   * shipmentID (it links shipments through ContractID only) and the PG
   * mirror silently no-opped; (2) SubmitCustomsDeclaration's guard only
   * fires when the shipment IS found, so a missing shipment silently
   * passed it and the declaration was stored on-chain and in PG.
   * The ledger is checked via ReadShipment: its error text is
   * "shipment <id> does not exist" for a missing shipment, which is
   * what distinguishes "not found" (404) from "the ledger could not be
   * reached to verify" (503, unavailable:true — the caller must not
   * report a missing shipment it could not actually check).
   */
  async assertShipmentExists(shipmentId: string): Promise<
    | { ok: true; pg: any; ledger: any }
    | { ok: false; missing: 'postgres' | 'ledger'; unavailable?: boolean; message: string }
  > {
    const pg = await this.dbService.get(
      'SELECT shipment_id, contract_id, exporter_id, status FROM shipments WHERE shipment_id = $1',
      [shipmentId]
    );
    if (!pg) {
      return { ok: false, missing: 'postgres', message: `Shipment ${shipmentId} not found in the database` };
    }
    let ledgerRes;
    try {
      ledgerRes = await this.fabricService.getShipment(shipmentId);
    } catch (err: any) {
      return { ok: false, missing: 'ledger', unavailable: true, message: `Could not verify shipment ${shipmentId} on the ledger: ${err?.message || String(err)}` };
    }
    if (!ledgerRes?.success || !ledgerRes?.data) {
      const errMsg = String(ledgerRes?.error || '');
      if (/does not exist/i.test(errMsg)) {
        return { ok: false, missing: 'ledger', message: `Shipment ${shipmentId} not found on the ledger` };
      }
      return { ok: false, missing: 'ledger', unavailable: true, message: `Could not verify shipment ${shipmentId} on the ledger: ${errMsg || 'query failed'}` };
    }
    return { ok: true, pg, ledger: ledgerRes.data };
  }

  /**
   * States from which a bill of lading / shipping document may be
   * recorded (F3, leg2). Mirrors the chaincode gate in
   * RecordBillOfLading / RecordShippingDetails / RecordAirwayBill
   * (main.go): the cargo must be cleared for loading
   * (CUSTOMS_CLEARED), booked for loading (FREIGHT_BOOKED), or
   * already loaded (LOADED, re-issue/correction). Every other state
   * refuses. assertBillOfLadingAllowed verifies the shipment exists
   * (PG + ledger) and is in one of these states, so the B/L routes
   * can refuse honestly with 404/400 before invoking the chaincode.
   */
  static readonly BILL_OF_LADING_STATES = ['CUSTOMS_CLEARED', 'FREIGHT_BOOKED', 'LOADED'];

  async assertBillOfLadingAllowed(shipmentId: string): Promise<
    | { ok: true; pg: any; ledger: any; status: string }
    | { ok: false; code: 'SHIPMENT_NOT_FOUND' | 'SHIPMENT_VERIFY_UNAVAILABLE' | 'INVALID_SHIPMENT_STATUS'; message: string }
  > {
    const exists = await this.assertShipmentExists(shipmentId);
    if (!exists.ok) {
      if (exists.unavailable) {
        return { ok: false, code: 'SHIPMENT_VERIFY_UNAVAILABLE', message: exists.message };
      }
      return { ok: false, code: 'SHIPMENT_NOT_FOUND', message: exists.message };
    }
    // PG and the ledger can disagree briefly (the PG mirror follows
    // the chain write); the ledger is the truth for a loading
    // decision, PG is the fallback when the ledger read has no
    // status (legacy docs).
    const status = String((exists.ledger as any)?.status || (exists.pg as any)?.status || '');
    if (!ShipmentService.BILL_OF_LADING_STATES.includes(status)) {
      return {
        ok: false,
        code: 'INVALID_SHIPMENT_STATUS',
        message: `Cannot record a bill of lading: shipment ${shipmentId} is ${status || 'in an unknown state'}; the shipment must be CUSTOMS_CLEARED, FREIGHT_BOOKED or LOADED`,
      };
    }
    return { ok: true, pg: exists.pg, ledger: exists.ledger, status };
  }

  /**
   * Get shipments by contract
   */
  async getShipmentsByContract(contractID: string) {
    return await this.dbService.all(
      'SELECT * FROM shipments WHERE contract_id = $1 ORDER BY created_at DESC',
      [contractID]
    );
  }

  /**
   * Get shipments by status
   */
  async getShipmentsByStatus(status: string) {
    return await this.dbService.all(
      'SELECT * FROM shipments WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
  }

  /**
   * Update shipment logistics status (separate from workflow status)
   * Used for tracking: PENDING → BOOKED → LOADED → DEPARTED → IN_TRANSIT → ARRIVED → DELIVERED
   */
  async updateLogisticsStatus(
    shipmentID: string,
    logisticsStatus: string,
    userId: string,
    userOrg: string,
    metadata?: any
  ) {
    try {
      logger.info(`[ShipmentService] Updating logistics status: ${shipmentID} -> ${logisticsStatus}`);

      const validLogisticsStatuses = ['PENDING', 'BOOKED', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CONFIRMED'];
      
      if (!validLogisticsStatuses.includes(logisticsStatus)) {
        throw new Error(`Invalid logistics status: ${logisticsStatus}`);
      }

      const shipment = await this.dbService.get(
        'SELECT * FROM shipments WHERE shipment_id = $1',
        [shipmentID]
      );

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      await this.dbService.run(
        `UPDATE shipments SET logistics_status = $1, updated_at = NOW() WHERE shipment_id = $2`,
        [logisticsStatus, shipmentID]
      );

      await this.auditService.log({
        entityType: 'SHIPMENT',
        entityId: shipmentID,
        action: 'UPDATE_LOGISTICS_STATUS',
        performedBy: userId,
        organization: userOrg,
        performedByOrg: userOrg,
        oldValue: shipment.logistics_status || 'PENDING',
        newValue: logisticsStatus,
        reason: `Logistics status updated to ${logisticsStatus}`,
        metadata,
      });

      logger.info(`✅ [ShipmentService] Logistics status updated: ${shipmentID} -> ${logisticsStatus}`);
      return { success: true, shipmentID, logisticsStatus };
    } catch (error: any) {
      logger.error(`❌ [ShipmentService] Logistics status update failed: ${error.message}`);
      throw error;
    }
  }
}

export const shipmentService = ShipmentService.getInstance();

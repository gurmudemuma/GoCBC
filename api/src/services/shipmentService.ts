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

      const declarationID = `DECL-${Date.now()}`;
      
      await customsService.submitDeclaration({
        declarationID,
        shipmentID,
        exporterID: shipment.exporter_id,
        exporterName: exporter?.company_name || 'Unknown Exporter',
        hsCode: '0901.21', // Coffee HS code
        quantity: shipment.quantity,
        value: contract?.total_value || shipment.quantity * 5, // Fallback calculation
        currency: 'USD',
        destination: shipment.destination || contract?.buyer_country || 'Unknown',
        invoiceNumber: contract?.contract_id,
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

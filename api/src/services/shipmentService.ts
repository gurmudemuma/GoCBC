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
   * Create new shipment - 🔥 TRIGGERS QUALITY INSPECTION TASK
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

      const result = await this.fabricService.invokeChaincode('RegisterShipment', [
        shipmentData.shipmentID,
        shipmentData.contractID,
        shipmentData.exporterID,
        shipmentData.buyerID,
        shipmentData.origin,
        shipmentData.quantity.toString(),
        shipmentData.grade,
        shipmentData.icoNumber || '',
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

      // 🔥 WORKFLOW TRIGGER: Create quality inspection task
      await this.createQualityInspectionTaskInternal(shipmentData.shipmentID, shipmentData);

      logger.info(`✅ [ShipmentService] Shipment created: ${shipmentData.shipmentID}`);
      return { success: true, shipmentID: shipmentData.shipmentID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ShipmentService] Create failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔥 WORKFLOW FIX: Auto-create quality inspection task
   * Public method for external callers (routes)
   */
  async createQualityInspectionTask(taskData: {
    shipmentID: string;
    contractID?: string;
    exporterID: string;
    coffeeType: string;
    quantity: number;
  }) {
    try {
      const inspectionID = `INS-${Date.now()}`;

      await this.dbService.run(
        `INSERT INTO quality_inspections (
          inspection_id, shipment_id, exporter_id, coffee_type,
          quantity, grade, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          inspectionID,
          taskData.shipmentID,
          taskData.exporterID,
          taskData.coffeeType || 'ARABICA', // Default
          taskData.quantity,
          taskData.coffeeType, // Use coffeeType as grade fallback
          'PENDING',
        ]
      );

      // Update shipment status to QUALITY_PENDING
      await this.dbService.run(
        `UPDATE shipments SET status = $1, updated_at = NOW() WHERE shipment_id = $2`,
        ['QUALITY_PENDING', taskData.shipmentID]
      );

      logger.info(`✅ [ShipmentService] Quality inspection task created: ${inspectionID} for shipment: ${taskData.shipmentID}`);
      return { success: true, inspectionID };
    } catch (error: any) {
      logger.error(`❌ [ShipmentService] Quality task creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Internal helper for creating quality task from shipment creation
   */
  private async createQualityInspectionTaskInternal(shipmentID: string, shipmentData: any) {
    return this.createQualityInspectionTask({
      shipmentID,
      exporterID: shipmentData.exporterID,
      coffeeType: 'ARABICA',
      quantity: shipmentData.quantity,
    });
  }

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

// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Customs Service - Handles customs declarations and clearance workflow

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';

export class CustomsService {
  private static instance: CustomsService;
  private fabricService: FabricService;
  private dbService: DatabaseService;
  private auditService: AuditService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): CustomsService {
    if (!CustomsService.instance) {
      CustomsService.instance = new CustomsService();
    }
    return CustomsService.instance;
  }

  /**
   * Submit customs declaration - Auto-created after quality inspection passes
   * @workflow Quality Inspection Pass → Customs Declaration Submitted
   */
  async submitDeclaration(declarationData: {
    declarationID: string;
    shipmentID: string;
    exporterID: string;
    exporterName: string;
    hsCode: string;
    quantity: number;
    value: number;
    currency: string;
    destination: string;
    invoiceNumber?: string;
    packingListNumber?: string;
    certificateOfOrigin?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[CustomsService] Submitting declaration: ${declarationData.declarationID}`);

      // Connect as ECTA (submitting on behalf of exporter after quality pass)
      await this.fabricService.connectAsOrg('ECTAMSP');

      // Submit to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'SubmitCustomsDeclaration',
        declarationData.declarationID,
        declarationData.shipmentID,
        declarationData.exporterID,
        declarationData.exporterName,
        declarationData.hsCode,
        declarationData.quantity.toString(),
        declarationData.value.toString(),
        declarationData.currency,
        declarationData.destination,
        declarationData.invoiceNumber || '',
        declarationData.packingListNumber || '',
        declarationData.certificateOfOrigin || '',
        new Date().toISOString()
      );

      // Update database
      await this.dbService.run(
        `INSERT INTO customs_declarations (
          declaration_id, shipment_id, exporter_id, exporter_name,
          hs_code, quantity, value, currency, destination,
          invoice_number, packing_list_number, certificate_of_origin,
          status, submitted_date, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)`,
        [
          declarationData.declarationID,
          declarationData.shipmentID,
          declarationData.exporterID,
          declarationData.exporterName,
          declarationData.hsCode,
          declarationData.quantity,
          declarationData.value,
          declarationData.currency,
          declarationData.destination,
          declarationData.invoiceNumber,
          declarationData.packingListNumber,
          declarationData.certificateOfOrigin,
          'SUBMITTED',
          new Date().toISOString(),
          typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        ]
      );

      // Update shipment status
      await statusManager.updateEntityStatus(
        'SHIPMENT',
        declarationData.shipmentID,
        'QUALITY_PASSED', // currentStatus
        'CUSTOMS_PENDING',
        { reason: 'Customs declaration submitted', updatedBy: declarationData.userId }
      );

      // Audit log
      await this.auditService.log({
        entityType: 'CUSTOMS_DECLARATION',
        entityId: declarationData.declarationID,
        action: 'SUBMIT',
        performedBy: declarationData.userId,
        organization: declarationData.userOrg,
        performedByOrg: declarationData.userOrg,
        newValue: 'SUBMITTED',
        metadata: { 
          status: 'SUBMITTED',
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[CustomsService] ✅ Declaration submitted: ${declarationData.declarationID}`);

      return {
        success: true,
        declarationID: declarationData.declarationID,
        status: 'SUBMITTED',
        blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
      };

    } catch (error) {
      logger.error(`[CustomsService] Failed to submit declaration:`, error);
      throw error;
    }
  }

  /**
   * Review customs declaration - CUSTOMS officer reviews
   * @workflow Declaration Submitted → Under Review
   */
  async reviewDeclaration(reviewData: {
    declarationID: string;
    reviewerName: string;
    reviewNotes?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[CustomsService] Reviewing declaration: ${reviewData.declarationID}`);

      // Connect as Customs MSP
      await this.fabricService.connectAsOrg('CustomsMSP');

      // Submit review to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'ReviewCustomsDeclaration',
        reviewData.declarationID,
        reviewData.reviewerName,
        reviewData.reviewNotes || 'Under customs review',
        new Date().toISOString()
      );

      // Update database
      await this.dbService.run(
        `UPDATE customs_declarations 
         SET status = $1, reviewer_name = $2, review_notes = $3, review_date = $4, updated_at = CURRENT_TIMESTAMP
         WHERE declaration_id = $5`,
        ['UNDER_REVIEW', reviewData.reviewerName, reviewData.reviewNotes, new Date().toISOString(), reviewData.declarationID]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'CUSTOMS_DECLARATION',
        entityId: reviewData.declarationID,
        action: 'REVIEW',
        performedBy: reviewData.userId,
        organization: reviewData.userOrg,
        performedByOrg: reviewData.userOrg,
        newValue: 'UNDER_REVIEW',
        metadata: { 
          status: 'UNDER_REVIEW', 
          reviewer: reviewData.reviewerName,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[CustomsService] ✅ Declaration under review: ${reviewData.declarationID}`);

      return {
        success: true,
        declarationID: reviewData.declarationID,
        status: 'UNDER_REVIEW'
      };

    } catch (error) {
      logger.error(`[CustomsService] Failed to review declaration:`, error);
      throw error;
    }
  }

  /**
   * Complete physical inspection - CUSTOMS officer inspects goods
   * @workflow Under Review → Inspection Complete
   */
  async completeInspection(inspectionData: {
    declarationID: string;
    inspectorName: string;
    inspectionResult: string;
    inspectionNotes?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[CustomsService] Completing inspection: ${inspectionData.declarationID}`);

      // Connect as Customs MSP
      await this.fabricService.connectAsOrg('CustomsMSP');

      // Submit inspection to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'CompleteCustomsInspection',
        inspectionData.declarationID,
        inspectionData.inspectorName,
        inspectionData.inspectionResult,
        inspectionData.inspectionNotes || 'Physical inspection completed',
        new Date().toISOString()
      );

      // Update database
      await this.dbService.run(
        `UPDATE customs_declarations 
         SET status = $1, inspector_name = $2, inspection_result = $3, 
             inspection_notes = $4, inspection_date = $5, updated_at = CURRENT_TIMESTAMP
         WHERE declaration_id = $6`,
        [
          'INSPECTION_COMPLETE',
          inspectionData.inspectorName,
          inspectionData.inspectionResult,
          inspectionData.inspectionNotes,
          new Date().toISOString(),
          inspectionData.declarationID
        ]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'CUSTOMS_DECLARATION',
        entityId: inspectionData.declarationID,
        action: 'INSPECT',
        performedBy: inspectionData.userId,
        organization: inspectionData.userOrg,
        performedByOrg: inspectionData.userOrg,
        newValue: 'INSPECTION_COMPLETE',
        metadata: { 
          status: 'INSPECTION_COMPLETE', 
          inspector: inspectionData.inspectorName,
          result: inspectionData.inspectionResult,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[CustomsService] ✅ Inspection complete: ${inspectionData.declarationID}`);

      return {
        success: true,
        declarationID: inspectionData.declarationID,
        status: 'INSPECTION_COMPLETE',
        result: inspectionData.inspectionResult
      };

    } catch (error) {
      logger.error(`[CustomsService] Failed to complete inspection:`, error);
      throw error;
    }
  }

  /**
   * Clear declaration - Final customs clearance 🔥 TRIGGERS FREIGHT ELIGIBILITY
   * @workflow Inspection Complete → Cleared → Shipment Ready for Freight
   */
  async clearDeclaration(clearanceData: {
    declarationID: string;
    clearedBy: string;
    clearanceNumber: string;
    duties?: number;
    taxes?: number;
    clearanceNotes?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[CustomsService] Clearing declaration: ${clearanceData.declarationID}`);

      // Get declaration to find shipment
      const declaration = await this.dbService.get(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1',
        [clearanceData.declarationID]
      );

      if (!declaration) {
        throw new Error(`Declaration not found: ${clearanceData.declarationID}`);
      }

      // Connect as Customs MSP
      await this.fabricService.connectAsOrg('CustomsMSP');

      // Submit clearance to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'ClearCustomsDeclaration',
        clearanceData.declarationID,
        clearanceData.clearedBy,
        clearanceData.clearanceNumber,
        (clearanceData.duties || 0).toString(),
        (clearanceData.taxes || 0).toString(),
        clearanceData.clearanceNotes || 'Customs clearance approved',
        new Date().toISOString()
      );

      // Update database
      await this.dbService.run(
        `UPDATE customs_declarations 
         SET status = $1, cleared_by = $2, clearance_number = $3, 
             duties = $4, taxes = $5, clearance_notes = $6, 
             clearance_date = $7, updated_at = CURRENT_TIMESTAMP
         WHERE declaration_id = $8`,
        [
          'CLEARED',
          clearanceData.clearedBy,
          clearanceData.clearanceNumber,
          clearanceData.duties,
          clearanceData.taxes,
          clearanceData.clearanceNotes,
          new Date().toISOString(),
          clearanceData.declarationID
        ]
      );

      // 🔥 WORKFLOW TRIGGER: Update shipment to CUSTOMS_CLEARED (ready for freight booking)
      await statusManager.updateEntityStatus(
        'SHIPMENT',
        declaration.shipment_id,
        'CUSTOMS_PENDING', // currentStatus
        'CUSTOMS_CLEARED',
        { reason: `Customs cleared with permit ${clearanceData.clearanceNumber}`, updatedBy: clearanceData.userId }
      );

      // Audit log
      await this.auditService.log({
        entityType: 'CUSTOMS_DECLARATION',
        entityId: clearanceData.declarationID,
        action: 'CLEAR',
        performedBy: clearanceData.userId,
        organization: clearanceData.userOrg,
        performedByOrg: clearanceData.userOrg,
        newValue: 'CLEARED',
        metadata: { 
          status: 'CLEARED', 
          clearedBy: clearanceData.clearedBy,
          clearanceNumber: clearanceData.clearanceNumber,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[CustomsService] ✅ Declaration cleared: ${clearanceData.declarationID}, Shipment ${declaration.shipment_id} ready for freight`);

      return {
        success: true,
        declarationID: clearanceData.declarationID,
        shipmentID: declaration.shipment_id,
        status: 'CLEARED',
        clearanceNumber: clearanceData.clearanceNumber,
        message: 'Customs cleared. Shipment ready for freight booking.'
      };

    } catch (error) {
      logger.error(`[CustomsService] Failed to clear declaration:`, error);
      throw error;
    }
  }

  /**
   * Reject declaration - CUSTOMS officer rejects
   * @workflow Any Status → Rejected
   */
  async rejectDeclaration(rejectData: {
    declarationID: string;
    rejectedBy: string;
    rejectionReason: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[CustomsService] Rejecting declaration: ${rejectData.declarationID}`);

      // Get declaration to find shipment
      const declaration = await this.dbService.get(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1',
        [rejectData.declarationID]
      );

      if (!declaration) {
        throw new Error(`Declaration not found: ${rejectData.declarationID}`);
      }

      // Connect as Customs MSP
      await this.fabricService.connectAsOrg('CustomsMSP');

      // Submit rejection to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'RejectCustomsDeclaration',
        rejectData.declarationID,
        rejectData.rejectedBy,
        rejectData.rejectionReason,
        new Date().toISOString()
      );

      // Update database
      await this.dbService.run(
        `UPDATE customs_declarations 
         SET status = $1, rejected_by = $2, rejection_reason = $3, 
             rejection_date = $4, updated_at = CURRENT_TIMESTAMP
         WHERE declaration_id = $5`,
        ['REJECTED', rejectData.rejectedBy, rejectData.rejectionReason, new Date().toISOString(), rejectData.declarationID]
      );

      // Update shipment status to blocked
      await statusManager.updateEntityStatus(
        'SHIPMENT',
        declaration.shipment_id,
        'CUSTOMS_PENDING', // currentStatus
        'CUSTOMS_REJECTED',
        { reason: rejectData.rejectionReason, updatedBy: rejectData.userId }
      );

      // Audit log
      await this.auditService.log({
        entityType: 'CUSTOMS_DECLARATION',
        entityId: rejectData.declarationID,
        action: 'REJECT',
        performedBy: rejectData.userId,
        organization: rejectData.userOrg,
        performedByOrg: rejectData.userOrg,
        newValue: 'REJECTED',
        metadata: { 
          status: 'REJECTED', 
          rejectedBy: rejectData.rejectedBy,
          reason: rejectData.rejectionReason,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[CustomsService] ❌ Declaration rejected: ${rejectData.declarationID}`);

      return {
        success: true,
        declarationID: rejectData.declarationID,
        status: 'REJECTED',
        reason: rejectData.rejectionReason
      };

    } catch (error) {
      logger.error(`[CustomsService] Failed to reject declaration:`, error);
      throw error;
    }
  }

  /**
   * Get declaration by ID
   */
  async getDeclaration(declarationID: string) {
    try {
      // Try database first (faster)
      const dbDeclaration = await this.dbService.get(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1',
        [declarationID]
      );

      if (dbDeclaration) {
        return dbDeclaration;
      }

      // Fallback to blockchain
      await this.fabricService.connectAsOrg('ECTAMSP');
      const blockchainResult = await this.fabricService.queryChaincode(
        'ReadCustomsDeclaration',
        [declarationID]
      );

      return blockchainResult;

    } catch (error) {
      logger.error(`[CustomsService] Failed to get declaration:`, error);
      throw error;
    }
  }

  /**
   * Get declarations by shipment
   */
  async getDeclarationsByShipment(shipmentID: string) {
    try {
      const declarations = await this.dbService.all(
        'SELECT * FROM customs_declarations WHERE shipment_id = $1 ORDER BY created_at DESC',
        [shipmentID]
      );

      return declarations;

    } catch (error) {
      logger.error(`[CustomsService] Failed to get declarations for shipment:`, error);
      throw error;
    }
  }

  /**
   * Get declarations by status
   */
  async getDeclarationsByStatus(status: string) {
    try {
      const declarations = await this.dbService.all(
        'SELECT * FROM customs_declarations WHERE status = $1 ORDER BY created_at DESC',
        [status]
      );

      return declarations;

    } catch (error) {
      logger.error(`[CustomsService] Failed to get declarations by status:`, error);
      throw error;
    }
  }

  /**
   * Get all declarations with optional filters
   */
  async getAllDeclarations(filters?: {
    exporterID?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    try {
      let query = 'SELECT * FROM customs_declarations WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (filters?.exporterID) {
        query += ` AND exporter_id = $${paramCount}`;
        params.push(filters.exporterID);
        paramCount++;
      }

      if (filters?.status) {
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      if (filters?.fromDate) {
        query += ` AND created_at >= $${paramCount}`;
        params.push(filters.fromDate);
        paramCount++;
      }

      if (filters?.toDate) {
        query += ` AND created_at <= $${paramCount}`;
        params.push(filters.toDate);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC';

      const declarations = await this.dbService.all(query, params);
      return declarations;

    } catch (error) {
      logger.error(`[CustomsService] Failed to get all declarations:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const customsService = CustomsService.getInstance();

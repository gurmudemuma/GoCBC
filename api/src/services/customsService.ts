// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Customs Service - Handles customs declarations and clearance workflow

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
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

      // Submit to blockchain. SubmitCustomsDeclaration takes exactly 11
      // args (customs.go:244-247); the old call passed 14 (exporterName,
      // invoiceNumber, packingListNumber, certificateOfOrigin and a
      // timestamp), which the Fabric Go dispatcher rejects, so the
      // quality-pass auto-declaration (shipmentService.
      // triggerCustomsDeclaration, called from quality.ts) could never
      // land on-chain and always fell into its silent best-effort catch.
      // The dropped values stay PG-only (see the INSERT below).
      const blockchainResult = await this.fabricService.submitTransaction(
        'SubmitCustomsDeclaration',
        declarationData.declarationID,
        declarationData.shipmentID,
        declarationData.exporterID,
        'STANDARD',
        declarationData.hsCode,
        declarationData.quantity.toString(),
        declarationData.value.toString(),
        declarationData.currency,
        declarationData.destination,
        'Djibouti Port',
        'false'
      );

      // Update database
      await this.dbService.run(
        `INSERT INTO customs_declarations (
          declaration_id, shipment_id, exporter_id,
          hs_code, quantity, customs_value_usd, currency, destination,
          invoice_number, packing_list_number, certificate_of_origin,
          status, submitted_date, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)`,
        [
          declarationData.declarationID,
          declarationData.shipmentID,
          declarationData.exporterID,
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

      // The shipment status is set on-chain by SubmitCustomsDeclaration
      // (PERMIT_ISSUED → CUSTOMS_DECLARED, customs.go); the old
      // updateEntityStatus call here passed QUALITY_PASSED →
      // CUSTOMS_PENDING, states no SHIPMENT row ever held, and is
      // removed with the fail-closed validator (TEST-STATUS-MATRIX
      // §17 #12) — it validated nothing and updated nothing.

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
      // NOTE: ReviewCustomsDeclaration moves the chaincode declaration
      // SUBMITTED → UNDER_INSPECTION (customs.go). The old PG value
      // UNDER_REVIEW was the *next* step's state, so Postgres and the
      // ledger disagreed after every review.
      await this.dbService.run(
        `UPDATE customs_declarations 
         SET status = $1, reviewer_name = $2, review_notes = $3, review_date = $4, updated_at = CURRENT_TIMESTAMP
         WHERE declaration_id = $5`,
        ['UNDER_INSPECTION', reviewData.reviewerName, reviewData.reviewNotes, new Date().toISOString(), reviewData.declarationID]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'CUSTOMS_DECLARATION',
        entityId: reviewData.declarationID,
        action: 'REVIEW',
        performedBy: reviewData.userId,
        organization: reviewData.userOrg,
        performedByOrg: reviewData.userOrg,
        newValue: 'UNDER_INSPECTION',
        metadata: { 
          status: 'UNDER_INSPECTION', 
          reviewer: reviewData.reviewerName,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[CustomsService] ✅ Declaration under inspection: ${reviewData.declarationID}`);

      return {
        success: true,
        declarationID: reviewData.declarationID,
        status: 'UNDER_INSPECTION'
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
      // NOTE: CompleteCustomsInspection moves the chaincode declaration
      // UNDER_INSPECTION → UNDER_REVIEW (customs.go). The old PG value
      // INSPECTION_COMPLETE exists in no state machine.
      await this.dbService.run(
        `UPDATE customs_declarations 
         SET status = $1, inspector_name = $2, inspection_result = $3, 
             inspection_notes = $4, inspection_date = $5, updated_at = CURRENT_TIMESTAMP
         WHERE declaration_id = $6`,
        [
          'UNDER_REVIEW',
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
        newValue: 'UNDER_REVIEW',
        metadata: { 
          status: 'UNDER_REVIEW', 
          inspector: inspectionData.inspectorName,
          result: inspectionData.inspectionResult,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[CustomsService] ✅ Inspection complete: ${inspectionData.declarationID}`);

      return {
        success: true,
        declarationID: inspectionData.declarationID,
        status: 'UNDER_REVIEW',
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

      // Chaincode sync is best-effort (cf. submit/review/complete in
      // customs.ts and quality.ts syncQualityDecisionBestEffort): the
      // Postgres CLEARED row is the record of the clearance. A failed
      // chain call must never produce a fabricated blockchain_tx_id, must
      // never be logged as recorded on-chain, and must not block the
      // workflow in dev mode — otherwise no dev-mode path to CLEARED
      // exists at all (the old plural PG-only route was removed).
      // submitTransaction throws on failure and returns {txId,
      // transactionId} on success.
      let blockchainTxId: string | null = null;
      let blockchainError: string | null = null;
      try {
        // Connect as Customs MSP
        await this.fabricService.connectAsOrg('CustomsMSP');

        // Submit clearance to blockchain
        // NOTE: ClearCustomsDeclaration takes 4 args (declarationID,
        // clearedBy, clearanceNumber, dutiesAmountStr — customs.go:682).
        // The old call passed 7 (adding taxes, clearanceNotes and a date),
        // which the chaincode dispatcher rejects.
        const blockchainResult = await this.fabricService.submitTransactionAs(
          'CustomsMSP',
          'ClearCustomsDeclaration',
          clearanceData.declarationID,
          clearanceData.clearedBy,
          clearanceData.clearanceNumber,
          (clearanceData.duties || 0).toString()
        );
        blockchainTxId = (blockchainResult as any)?.transactionId || (blockchainResult as any)?.txId || null;
      } catch (chainError: any) {
        blockchainError = chainError?.message || 'Chaincode call failed';
      }
      const blockchainSynced = !blockchainError && !!blockchainTxId;
      if (blockchainSynced) {
        logger.info(`[CustomsService] ✅ Declaration cleared on blockchain: ${clearanceData.declarationID}, TX: ${blockchainTxId}`);
      } else {
        // Ledger-first: a PG-only CLEARED row with no on-chain clear is a
        // phantom — the shipment never moves to CUSTOMS_CLEARED on the
        // ledger (the cascade lives in ClearCustomsDeclaration) and the
        // portal would show CLEARED for a declaration the ledger still
        // holds as SUBMITTED/REJECTED. Fail honestly instead of keeping
        // the PG row, like the quality perform route.
        throw new Error(`Failed to clear declaration ${clearanceData.declarationID} on the ledger: ${blockchainError || 'no transaction id'}; no status change was recorded.`);
      }

      // Update database (blockchain_tx_id is the ledger-confirmed txId,
      // or NULL when the chain call did not sync — never a fabricated id)
      await this.dbService.run(
        `UPDATE customs_declarations 
         SET status = $1, cleared_by = $2, clearance_number = $3, 
             duties = $4, taxes = $5, clearance_notes = $6, 
             clearance_date = $7, blockchain_tx_id = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE declaration_id = $9`,
        [
          'CLEARED',
          clearanceData.clearedBy,
          clearanceData.clearanceNumber,
          clearanceData.duties,
          clearanceData.taxes,
          clearanceData.clearanceNotes,
          new Date().toISOString(),
          blockchainTxId,
          clearanceData.declarationID
        ]
      );

      // The shipment status is set on-chain by the ClearCustomsDeclaration
      // cascade (→ CUSTOMS_CLEARED, customs.go); the old
      // updateEntityStatus call here passed CUSTOMS_PENDING, a state no
      // SHIPMENT row ever held, and is removed with the fail-closed
      // validator (TEST-STATUS-MATRIX §17 #12).

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
          blockchainTxId
        }
      });

      if (blockchainSynced) {
        logger.info(`[CustomsService] ✅ Declaration cleared: ${clearanceData.declarationID}, Shipment ${declaration.shipment_id} ready for freight`);
      } else {
        logger.info(`[CustomsService] Declaration cleared in PG only (chain not synced): ${clearanceData.declarationID}, Shipment ${declaration.shipment_id} ready for freight`);
      }

      return {
        success: true,
        declarationID: clearanceData.declarationID,
        shipmentID: declaration.shipment_id,
        status: 'CLEARED',
        clearanceNumber: clearanceData.clearanceNumber,
        blockchainSynced,
        blockchainError,
        blockchainTxId,
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

      // The shipment status is set on-chain by the RejectDeclaration
      // cascade (→ CUSTOMS_REJECTED, customs.go); the old
      // updateEntityStatus call here passed CUSTOMS_PENDING, a state no
      // SHIPMENT row ever held, and is removed with the fail-closed
      // validator (TEST-STATUS-MATRIX §17 #12).

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

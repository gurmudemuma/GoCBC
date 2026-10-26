/**
 * QualityService
 * Handles quality inspection operations for coffee exports
 */

import { DatabaseService } from './databaseService';
import { FabricService } from './fabricService';
import { AuditService } from './auditService';
import logger from '../utils/logger';

export class QualityService {
  private static instance: QualityService;
  private dbService: DatabaseService;
  private fabricService: FabricService;
  private auditService: AuditService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.fabricService = FabricService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): QualityService {
    if (!QualityService.instance) {
      QualityService.instance = new QualityService();
    }
    return QualityService.instance;
  }

  /**
   * Get quality inspection by ID
   */
  async getInspection(inspectionID: string) {
    try {
      const inspection = await this.dbService.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );
      
      return inspection;
    } catch (error: any) {
      logger.error(`[QualityService] Error fetching inspection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all quality inspections for a shipment
   */
  async getInspectionsByShipment(shipmentID: string) {
    try {
      const inspections = await this.dbService.all(
        'SELECT * FROM quality_inspections WHERE shipment_id = $1 ORDER BY created_at DESC',
        [shipmentID]
      );
      
      return inspections;
    } catch (error: any) {
      logger.error(`[QualityService] Error fetching shipment inspections: ${error.message}`);
      throw error;
    }
  }

  /**
   * Request quality inspection
   */
  async requestInspection(inspectionData: {
    inspectionID: string;
    shipmentID: string;
    contractID: string;
    exporterID: string;
    scheduledDate?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[QualityService] Requesting inspection: ${inspectionData.inspectionID}`);

      // Record on blockchain
      const result = await this.fabricService.invokeChaincode('RequestInspection', [
        inspectionData.inspectionID,
        inspectionData.shipmentID,
        inspectionData.contractID,
        inspectionData.exporterID,
        inspectionData.scheduledDate || new Date().toISOString()
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to request inspection on blockchain');
      }

      // Update database
      await this.dbService.run(
        `UPDATE quality_inspections 
         SET status = $1, blockchain_tx_id = $2, scheduled_date = $3
         WHERE inspection_id = $4`,
        ['SCHEDULED', result.txId, inspectionData.scheduledDate || new Date().toISOString(), inspectionData.inspectionID]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'QUALITY_INSPECTION',
        entityId: inspectionData.inspectionID,
        action: 'REQUEST',
        performedBy: inspectionData.userId,
        organization: inspectionData.userOrg,
        performedByOrg: inspectionData.userOrg,
        oldValue: 'PENDING',
        newValue: 'SCHEDULED',
        reason: 'Inspection requested',
      });

      logger.info(`✅ [QualityService] Inspection requested: ${inspectionData.inspectionID}`);
      
      return { 
        success: true, 
        inspectionID: inspectionData.inspectionID, 
        blockchainTxId: result.txId 
      };
    } catch (error: any) {
      logger.error(`❌ [QualityService] Request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform quality inspection
   */
  async performInspection(inspectionData: {
    inspectionID: string;
    inspectorID: string;
    inspectorName: string;
    sampleSize: string;
    moistureContent: string;
    defectCount: string;
    beanSize: string;
    color: string;
    odor: string;
    fragrance: string;
    flavor: string;
    aftertaste: string;
    acidity: string;
    body: string;
    balance: string;
    uniformity: string;
    cleanCup: string;
    sweetness: string;
    overall: string;
    classification: string;
    pesticideTest: string;
    heavyMetalTest: string;
    mycotoxinTest: string;
    remarks: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[QualityService] Performing inspection: ${inspectionData.inspectionID}`);

      // Record on blockchain
      const result = await this.fabricService.invokeChaincode('PerformInspection', [
        inspectionData.inspectionID,
        inspectionData.inspectorID,
        inspectionData.inspectorName,
        inspectionData.sampleSize,
        inspectionData.moistureContent,
        inspectionData.defectCount,
        inspectionData.beanSize,
        inspectionData.color,
        inspectionData.odor,
        inspectionData.fragrance,
        inspectionData.flavor,
        inspectionData.aftertaste,
        inspectionData.acidity,
        inspectionData.body,
        inspectionData.balance,
        inspectionData.uniformity,
        inspectionData.cleanCup,
        inspectionData.sweetness,
        inspectionData.overall,
        inspectionData.classification,
        inspectionData.pesticideTest,
        inspectionData.heavyMetalTest,
        inspectionData.mycotoxinTest,
        inspectionData.remarks
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to perform inspection on blockchain');
      }

      // Update database
      await this.dbService.run(
        `UPDATE quality_inspections 
         SET status = $1, 
             inspector_id = $2,
             inspector_name = $3,
             sample_size = $4,
             moisture_content = $5,
             defect_count = $6,
             classification = $7,
             remarks = $8,
             blockchain_tx_id = $9,
             inspected_at = NOW()
         WHERE inspection_id = $10`,
        [
          'COMPLETED',
          inspectionData.inspectorID,
          inspectionData.inspectorName,
          inspectionData.sampleSize,
          inspectionData.moistureContent,
          inspectionData.defectCount,
          inspectionData.classification,
          inspectionData.remarks,
          result.txId,
          inspectionData.inspectionID
        ]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'QUALITY_INSPECTION',
        entityId: inspectionData.inspectionID,
        action: 'PERFORM',
        performedBy: inspectionData.userId,
        organization: inspectionData.userOrg,
        performedByOrg: inspectionData.userOrg,
        oldValue: 'SCHEDULED',
        newValue: 'COMPLETED',
        reason: 'Inspection performed',
        metadata: {
          classification: inspectionData.classification,
          inspector: inspectionData.inspectorName,
        },
      });

      logger.info(`✅ [QualityService] Inspection performed: ${inspectionData.inspectionID}`);
      
      return { 
        success: true, 
        inspectionID: inspectionData.inspectionID, 
        blockchainTxId: result.txId 
      };
    } catch (error: any) {
      logger.error(`❌ [QualityService] Perform failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve quality inspection
   */
  async approveInspection(approvalData: {
    inspectionID: string;
    approvedBy: string;
    certificateNo: string;
    remarks?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[QualityService] Approving inspection: ${approvalData.inspectionID}`);

      // Get inspection details
      const inspection = await this.getInspection(approvalData.inspectionID);
      if (!inspection) {
        throw new Error('Inspection not found');
      }

      // Record on blockchain
      const result = await this.fabricService.invokeChaincode('ApproveInspection', [
        approvalData.inspectionID,
        approvalData.approvedBy,
        approvalData.certificateNo
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve inspection on blockchain');
      }

      // Update database
      await this.dbService.run(
        `UPDATE quality_inspections 
         SET status = $1, 
             approved_by = $2,
             certificate_no = $3,
             approval_remarks = $4,
             blockchain_tx_id = $5,
             approved_at = NOW()
         WHERE inspection_id = $6`,
        [
          'APPROVED',
          approvalData.approvedBy,
          approvalData.certificateNo,
          approvalData.remarks || null,
          result.txId,
          approvalData.inspectionID
        ]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'QUALITY_INSPECTION',
        entityId: approvalData.inspectionID,
        action: 'APPROVE',
        performedBy: approvalData.userId,
        organization: approvalData.userOrg,
        performedByOrg: approvalData.userOrg,
        oldValue: 'COMPLETED',
        newValue: 'APPROVED',
        reason: 'Quality inspection approved',
        metadata: {
          certificateNo: approvalData.certificateNo,
        },
      });

      logger.info(`✅ [QualityService] Inspection approved: ${approvalData.inspectionID}`);
      
      return { 
        success: true, 
        inspectionID: approvalData.inspectionID,
        certificateNo: approvalData.certificateNo,
        blockchainTxId: result.txId 
      };
    } catch (error: any) {
      logger.error(`❌ [QualityService] Approval failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject quality inspection
   */
  async rejectInspection(rejectionData: {
    inspectionID: string;
    rejectedBy: string;
    reason: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[QualityService] Rejecting inspection: ${rejectionData.inspectionID}`);

      // Record on blockchain
      const result = await this.fabricService.invokeChaincode('RejectInspection', [
        rejectionData.inspectionID,
        rejectionData.rejectedBy,
        rejectionData.reason
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to reject inspection on blockchain');
      }

      // Update database
      await this.dbService.run(
        `UPDATE quality_inspections 
         SET status = $1, 
             rejected_by = $2,
             rejection_reason = $3,
             blockchain_tx_id = $4,
             rejected_at = NOW()
         WHERE inspection_id = $5`,
        [
          'REJECTED',
          rejectionData.rejectedBy,
          rejectionData.reason,
          result.txId,
          rejectionData.inspectionID
        ]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'QUALITY_INSPECTION',
        entityId: rejectionData.inspectionID,
        action: 'REJECT',
        performedBy: rejectionData.userId,
        organization: rejectionData.userOrg,
        performedByOrg: rejectionData.userOrg,
        oldValue: 'COMPLETED',
        newValue: 'REJECTED',
        reason: rejectionData.reason,
      });

      logger.info(`✅ [QualityService] Inspection rejected: ${rejectionData.inspectionID}`);
      
      return { 
        success: true, 
        inspectionID: rejectionData.inspectionID, 
        blockchainTxId: result.txId 
      };
    } catch (error: any) {
      logger.error(`❌ [QualityService] Rejection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Issue export permit after quality approval
   */
  async issueExportPermit(permitData: {
    inspectionID: string;
    exportPermitNo: string;
    issuedBy: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[QualityService] Issuing export permit: ${permitData.exportPermitNo}`);

      // Record on blockchain
      const result = await this.fabricService.invokeChaincode('IssueExportPermit', [
        permitData.inspectionID,
        permitData.exportPermitNo,
        permitData.issuedBy
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to issue export permit on blockchain');
      }

      // Update database
      await this.dbService.run(
        `UPDATE quality_inspections 
         SET export_permit_no = $1, 
             permit_issued_by = $2,
             permit_issued_at = NOW(),
             blockchain_tx_id = $3
         WHERE inspection_id = $4`,
        [
          permitData.exportPermitNo,
          permitData.issuedBy,
          result.txId,
          permitData.inspectionID
        ]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'QUALITY_INSPECTION',
        entityId: permitData.inspectionID,
        action: 'ISSUE_PERMIT',
        performedBy: permitData.userId,
        organization: permitData.userOrg,
        performedByOrg: permitData.userOrg,
        newValue: permitData.exportPermitNo,
        reason: 'Export permit issued',
      });

      logger.info(`✅ [QualityService] Export permit issued: ${permitData.exportPermitNo}`);
      
      return { 
        success: true, 
        exportPermitNo: permitData.exportPermitNo, 
        blockchainTxId: result.txId 
      };
    } catch (error: any) {
      logger.error(`❌ [QualityService] Permit issuance failed: ${error.message}`);
      throw error;
    }
  }
}

export const qualityService = QualityService.getInstance();

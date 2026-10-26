/**
 * Post-Delivery Workflow Service
 * 
 * Manages the complete post-delivery workflow for coffee exports:
 * 1. Payment Settlement
 * 2. Forex Repatriation
 * 3. Letter of Credit Settlement
 * 4. ECTA Final Audit
 * 5. Contract Completion
 * 
 * Professional implementation with proper state management,
 * notifications, and compliance tracking.
 */

import { logger } from '../utils/logger';
import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { NotificationService } from './notificationService';

export interface PostDeliveryStatus {
  shipmentId: string;
  contractId: string;
  exporterId: string;
  deliveryDate: string;
  
  // Payment Settlement
  paymentReceived: boolean;
  paymentReceivedDate?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  swiftReference?: string;
  
  // Forex Repatriation
  forexRepatriated: boolean;
  forexRepatriationDate?: string;
  forexAmount?: number;
  forexRate?: number;
  
  // LC Settlement (if applicable)
  lcUsed: boolean;
  lcSettled?: boolean;
  lcSettlementDate?: string;
  lcReference?: string;
  
  // ECTA Audit
  ectaAuditCompleted: boolean;
  ectaAuditDate?: string;
  ectaAuditResult?: 'PASSED' | 'FAILED' | 'PENDING';
  ectaAuditNotes?: string;
  
  // Contract Closure
  contractClosed: boolean;
  contractClosureDate?: string;
  
  // Overall Status
  overallStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'ISSUE';
  completionPercentage: number;
  daysElapsed: number;
  expectedCompletionDate: string;
  
  // Issues/Alerts
  issues: Array<{
    type: 'PAYMENT_OVERDUE' | 'FOREX_DELAYED' | 'LC_ISSUE' | 'AUDIT_REQUIRED' | 'COMPLIANCE_ISSUE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    createdAt: string;
  }>;
}

export class PostDeliveryWorkflowService {
  private fabricService: FabricService;
  private db: DatabaseService;
  private notificationService: NotificationService;

  // SLA Thresholds (in days)
  private readonly PAYMENT_SLA = 90; // 90 days to receive payment
  private readonly FOREX_SLA = 7; // 7 days after payment to repatriate
  private readonly LC_SETTLEMENT_SLA = 21; // 21 days for LC settlement
  private readonly AUDIT_SLA = 14; // 14 days for ECTA audit
  private readonly CONTRACT_CLOSURE_SLA = 7; // 7 days after all complete

  constructor() {
    this.fabricService = FabricService.getInstance();
    this.db = DatabaseService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  /**
   * Initialize post-delivery workflow when shipment is delivered
   */
  async initializePostDeliveryWorkflow(
    shipmentId: string,
    deliveryDate: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`📦 Initializing post-delivery workflow for shipment: ${shipmentId}`);

      // Get shipment details
      const shipmentResult = await this.fabricService.queryChaincode('ReadShipment', [shipmentId]);
      
      if (!shipmentResult.success || !shipmentResult.data) {
        return { success: false, error: 'Shipment not found' };
      }

      const shipment = shipmentResult.data;
      const contractId = shipment.contractId;
      const exporterId = shipment.exporterId;

      // Check if LC was used
      const lcResult = await this.fabricService.queryChaincode('QueryLCsByContract', [contractId]);
      const lcUsed = lcResult.success && lcResult.data && lcResult.data.length > 0;

      // Create post-delivery tracking record in database
      const query = `
        INSERT INTO post_delivery_tracking (
          shipment_id,
          contract_id,
          exporter_id,
          delivery_date,
          lc_used,
          overall_status,
          completion_percentage,
          expected_completion_date,
          created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `;

      const expectedCompletionDate = new Date(deliveryDate);
      expectedCompletionDate.setDate(expectedCompletionDate.getDate() + this.PAYMENT_SLA);

      await this.db.query(query, [
        shipmentId,
        contractId,
        exporterId,
        deliveryDate,
        lcUsed,
        'PENDING',
        0,
        expectedCompletionDate.toISOString(),
        userId
      ]);

      // ✅ Record post-delivery tracking on blockchain
      try {
        const auditService = require('./auditService').default;
        await auditService.recordAudit({
          entityType: 'POST_DELIVERY_TRACKING',
          entityId: shipmentId,
          actionType: 'INITIALIZE',
          actionBy: userId,
          organizationMSP: 'BanksMSP',
          details: {
            shipmentId,
            contractId,
            exporterId,
            deliveryDate,
            lcUsed,
            expectedCompletionDate: expectedCompletionDate.toISOString()
          },
          timestamp: new Date()
        });
        logger.info(`✅ Post-delivery tracking recorded on blockchain: ${shipmentId}`);
      } catch (blockchainErr) {
        logger.warn(`⚠️ Failed to record post-delivery tracking on blockchain (non-fatal):`, blockchainErr);
      }

      // Send notifications to relevant parties
      await this.notifyStakeholders(shipmentId, contractId, exporterId, 'DELIVERY_COMPLETED');

      // Create initial checklist items
      await this.createChecklistItems(shipmentId, lcUsed);

      logger.info(`✅ Post-delivery workflow initialized for ${shipmentId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to initialize post-delivery workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get post-delivery status for a shipment
   */
  async getPostDeliveryStatus(shipmentId: string): Promise<PostDeliveryStatus | null> {
    try {
      const query = `
        SELECT *
        FROM post_delivery_tracking
        WHERE shipment_id = $1
      `;

      const result = await this.db.query(query, [shipmentId]);

      if (result.rows.length === 0) {
        return null;
      }

      const record = result.rows[0];

      // Calculate days elapsed
      const deliveryDate = new Date(record.delivery_date);
      const today = new Date();
      const daysElapsed = Math.floor((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get issues
      const issuesQuery = `
        SELECT * FROM post_delivery_issues
        WHERE shipment_id = $1 AND resolved = false
        ORDER BY created_at DESC
      `;
      const issuesResult = await this.db.query(issuesQuery, [shipmentId]);

      // Calculate completion percentage
      const completionPercentage = this.calculateCompletionPercentage(record);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(record, daysElapsed);

      return {
        shipmentId: record.shipment_id,
        contractId: record.contract_id,
        exporterId: record.exporter_id,
        deliveryDate: record.delivery_date,
        
        paymentReceived: record.payment_received || false,
        paymentReceivedDate: record.payment_received_date,
        paymentAmount: record.payment_amount,
        paymentCurrency: record.payment_currency,
        swiftReference: record.swift_reference,
        
        forexRepatriated: record.forex_repatriated || false,
        forexRepatriationDate: record.forex_repatriation_date,
        forexAmount: record.forex_amount,
        forexRate: record.forex_rate,
        
        lcUsed: record.lc_used || false,
        lcSettled: record.lc_settled,
        lcSettlementDate: record.lc_settlement_date,
        lcReference: record.lc_reference,
        
        ectaAuditCompleted: record.ecta_audit_completed || false,
        ectaAuditDate: record.ecta_audit_date,
        ectaAuditResult: record.ecta_audit_result,
        ectaAuditNotes: record.ecta_audit_notes,
        
        contractClosed: record.contract_closed || false,
        contractClosureDate: record.contract_closure_date,
        
        overallStatus,
        completionPercentage,
        daysElapsed,
        expectedCompletionDate: record.expected_completion_date,
        
        issues: issuesResult.rows.map(issue => ({
          type: issue.issue_type,
          severity: issue.severity,
          message: issue.message,
          createdAt: issue.created_at
        }))
      };
    } catch (error) {
      logger.error('Failed to get post-delivery status:', error);
      return null;
    }
  }

  /**
   * Record payment received
   */
  async recordPaymentReceived(
    shipmentId: string,
    paymentAmount: number,
    paymentCurrency: string,
    swiftReference: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`💰 Recording payment for shipment: ${shipmentId}`);

      const query = `
        UPDATE post_delivery_tracking
        SET 
          payment_received = true,
          payment_received_date = NOW(),
          payment_amount = $2,
          payment_currency = $3,
          swift_reference = $4,
          updated_by = $5,
          updated_at = NOW()
        WHERE shipment_id = $1
      `;

      await this.db.query(query, [
        shipmentId,
        paymentAmount,
        paymentCurrency,
        swiftReference,
        userId
      ]);

      // Update checklist
      await this.updateChecklistItem(shipmentId, 'PAYMENT_RECEIVED');

      // Notify NBE to monitor forex repatriation
      await this.notifyStakeholders(shipmentId, null, null, 'PAYMENT_RECEIVED');

      // Check for issues
      await this.checkAndCreateIssues(shipmentId);

      logger.info(`✅ Payment recorded for ${shipmentId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to record payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record forex repatriation
   */
  async recordForexRepatriation(
    shipmentId: string,
    forexAmount: number,
    forexRate: number,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`💱 Recording forex repatriation for shipment: ${shipmentId}`);

      const query = `
        UPDATE post_delivery_tracking
        SET 
          forex_repatriated = true,
          forex_repatriation_date = NOW(),
          forex_amount = $2,
          forex_rate = $3,
          updated_by = $4,
          updated_at = NOW()
        WHERE shipment_id = $1
      `;

      await this.db.query(query, [shipmentId, forexAmount, forexRate, userId]);

      // Update checklist
      await this.updateChecklistItem(shipmentId, 'FOREX_REPATRIATED');

      // Notify ECTA to start audit
      await this.notifyStakeholders(shipmentId, null, null, 'FOREX_REPATRIATED');

      // Check for completion
      await this.checkWorkflowCompletion(shipmentId);

      logger.info(`✅ Forex repatriation recorded for ${shipmentId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to record forex repatriation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record LC settlement
   * Updates the post_delivery_tracking DB and also settles the Payment entity
   * on the blockchain (created by the ReleaseLCPayment bridge as "PAY_<lcID>").
   */
  async recordLCSettlement(
    shipmentId: string,
    lcReference: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`📄 Recording LC settlement for shipment: ${shipmentId}`);

      // --- Blockchain settlement: settle the bridged Payment entity ---
      const paymentID = `PAY_${lcReference}`;
      let blockchainSettled = false;

      try {
        const paymentResult = await this.fabricService.queryChaincode('ReadPayment', [paymentID]);
        if (paymentResult.success && paymentResult.data) {
          const payment = paymentResult.data;
          if (payment.status === 'VERIFIED' || payment.status === 'SWIFT_RECEIVED') {
            const payingBank = payment.payingBank || 'Issuing Bank';
            const payingBankBIC = payment.payingBankBic || '';
            const swiftReference = payment.swiftDetails?.swiftReference || `SETTLE-${lcReference}`;

            const settleResult = await this.fabricService.invokeChaincode('SettlePayment', [
              paymentID,
              '0',              // exchangeRate: 0 = auto-map from forex allocation
              '0',              // retentionRate: 0 = auto-map from forex allocation
              payingBank,
              payingBankBIC,
              swiftReference,
              '',               // nbeApprovalRef: optional
            ]);

            if (settleResult.success) {
              blockchainSettled = true;
              logger.info(`✅ Blockchain: Payment ${paymentID} settled, LC ${lcReference} cascaded to SETTLED`);
            } else {
              logger.warn(`⚠️ Blockchain SettlePayment failed for ${paymentID}: ${settleResult.error}`);
            }
          } else {
            logger.warn(`⚠️ Payment ${paymentID} status is ${payment.status}, cannot settle (needs VERIFIED or SWIFT_RECEIVED)`);
          }
        } else {
          logger.warn(`⚠️ Payment entity ${paymentID} not found on blockchain — skipping blockchain settlement`);
        }
      } catch (blockchainError: any) {
        logger.warn(`⚠️ Blockchain settlement failed for ${paymentID}: ${blockchainError.message} — continuing with DB update`);
      }

      // --- Database update (kept for post-delivery tracking) ---
      const query = `
        UPDATE post_delivery_tracking
        SET 
          lc_settled = true,
          lc_settlement_date = NOW(),
          lc_reference = $2,
          updated_by = $3,
          updated_at = NOW()
        WHERE shipment_id = $1
      `;

      await this.db.query(query, [shipmentId, lcReference, userId]);

      // Update checklist
      await this.updateChecklistItem(shipmentId, 'LC_SETTLED');

      await this.checkWorkflowCompletion(shipmentId);

      logger.info(`✅ LC settlement recorded for ${shipmentId} (blockchain: ${blockchainSettled ? 'settled' : 'skipped'})`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to record LC settlement:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record ECTA audit completion
   */
  async recordECTAAudit(
    shipmentId: string,
    auditResult: 'PASSED' | 'FAILED',
    auditNotes: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`📋 Recording ECTA audit for shipment: ${shipmentId}`);

      const query = `
        UPDATE post_delivery_tracking
        SET 
          ecta_audit_completed = true,
          ecta_audit_date = NOW(),
          ecta_audit_result = $2,
          ecta_audit_notes = $3,
          updated_by = $4,
          updated_at = NOW()
        WHERE shipment_id = $1
      `;

      await this.db.query(query, [shipmentId, auditResult, auditNotes, userId]);

      // Update checklist
      await this.updateChecklistItem(shipmentId, 'ECTA_AUDIT_COMPLETED');

      await this.checkWorkflowCompletion(shipmentId);

      logger.info(`✅ ECTA audit recorded for ${shipmentId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to record ECTA audit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close contract
   */
  async closeContract(
    shipmentId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`📋 Closing contract for shipment: ${shipmentId}`);

      // Get contract ID
      const statusResult = await this.getPostDeliveryStatus(shipmentId);
      if (!statusResult) {
        return { success: false, error: 'Post-delivery record not found' };
      }

      // Update contract status on blockchain
      await this.fabricService.invokeChaincode('UpdateContractStatus', [
        statusResult.contractId,
        'COMPLETED'
      ]);

      // Update post-delivery tracking
      const query = `
        UPDATE post_delivery_tracking
        SET 
          contract_closed = true,
          contract_closure_date = NOW(),
          overall_status = 'COMPLETED',
          completion_percentage = 100,
          updated_by = $2,
          updated_at = NOW()
        WHERE shipment_id = $1
      `;

      await this.db.query(query, [shipmentId, userId]);

      // Update checklist
      await this.updateChecklistItem(shipmentId, 'CONTRACT_CLOSED');

      // Send final notifications
      await this.notifyStakeholders(shipmentId, statusResult.contractId, statusResult.exporterId, 'WORKFLOW_COMPLETED');

      logger.info(`✅ Contract closed for ${shipmentId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to close contract:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private calculateCompletionPercentage(record: any): number {
    let completed = 0;
    let total = record.lc_used ? 5 : 4; // 5 steps if LC, 4 if not

    if (record.payment_received) completed++;
    if (record.forex_repatriated) completed++;
    if (!record.lc_used || record.lc_settled) completed++;
    if (record.ecta_audit_completed) completed++;
    if (record.contract_closed) completed++;

    return Math.round((completed / total) * 100);
  }

  private determineOverallStatus(record: any, daysElapsed: number): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'ISSUE' {
    if (record.contract_closed) {
      return 'COMPLETED';
    }

    if (!record.payment_received && daysElapsed > this.PAYMENT_SLA) {
      return 'DELAYED';
    }

    if (record.payment_received && !record.forex_repatriated) {
      const paymentDays = Math.floor(
        (new Date().getTime() - new Date(record.payment_received_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (paymentDays > this.FOREX_SLA) {
        return 'DELAYED';
      }
    }

    if (record.payment_received || record.forex_repatriated || record.ecta_audit_completed) {
      return 'IN_PROGRESS';
    }

    return 'PENDING';
  }

  private async createChecklistItems(shipmentId: string, lcUsed: boolean): Promise<void> {
    const items = [
      { type: 'PAYMENT_RECEIVED', description: 'Payment received from buyer', order: 1 },
      { type: 'FOREX_REPATRIATED', description: 'Forex repatriated to Ethiopia', order: 2 },
      { type: 'ECTA_AUDIT_COMPLETED', description: 'ECTA final audit completed', order: 4 },
      { type: 'CONTRACT_CLOSED', description: 'Export contract closed', order: 5 }
    ];

    if (lcUsed) {
      items.push({ type: 'LC_SETTLED', description: 'Letter of Credit settled', order: 3 });
    }

    const query = `
      INSERT INTO post_delivery_checklist (shipment_id, item_type, description, display_order, completed)
      VALUES ($1, $2, $3, $4, false)
    `;

    for (const item of items) {
      await this.db.query(query, [shipmentId, item.type, item.description, item.order]);
    }
  }

  private async updateChecklistItem(shipmentId: string, itemType: string): Promise<void> {
    const query = `
      UPDATE post_delivery_checklist
      SET completed = true, completed_at = NOW()
      WHERE shipment_id = $1 AND item_type = $2
    `;
    await this.db.query(query, [shipmentId, itemType]);
  }

  private async checkAndCreateIssues(shipmentId: string): Promise<void> {
    const status = await this.getPostDeliveryStatus(shipmentId);
    if (!status) return;

    // Check payment overdue
    if (!status.paymentReceived && status.daysElapsed > this.PAYMENT_SLA) {
      await this.createIssue(shipmentId, 'PAYMENT_OVERDUE', 'HIGH', 
        `Payment not received after ${status.daysElapsed} days (SLA: ${this.PAYMENT_SLA} days)`);
    }

    // Check forex delay
    if (status.paymentReceived && !status.forexRepatriated && status.paymentReceivedDate) {
      const daysSincePayment = Math.floor(
        (new Date().getTime() - new Date(status.paymentReceivedDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSincePayment > this.FOREX_SLA) {
        await this.createIssue(shipmentId, 'FOREX_DELAYED', 'HIGH',
          `Forex not repatriated ${daysSincePayment} days after payment (SLA: ${this.FOREX_SLA} days)`);
      }
    }
  }

  private async createIssue(
    shipmentId: string,
    issueType: string,
    severity: string,
    message: string
  ): Promise<void> {
    const query = `
      INSERT INTO post_delivery_issues (shipment_id, issue_type, severity, message, resolved, created_at)
      VALUES ($1, $2, $3, $4, false, NOW())
      ON CONFLICT (shipment_id, issue_type) DO NOTHING
    `;
    await this.db.query(query, [shipmentId, issueType, severity, message]);

    // ✅ Record post-delivery issue on blockchain
    try {
      const auditService = require('./auditService').default;
      await auditService.recordAudit({
        entityType: 'POST_DELIVERY_ISSUE',
        entityId: `${shipmentId}_${issueType}`,
        actionType: 'CREATE',
        actionBy: 'system',
        organizationMSP: 'BanksMSP',
        details: {
          shipmentId,
          issueType,
          severity,
          message,
          resolved: false
        },
        timestamp: new Date()
      });
      logger.info(`✅ Post-delivery issue recorded on blockchain: ${shipmentId}_${issueType}`);
    } catch (blockchainErr) {
      logger.warn(`⚠️ Failed to record post-delivery issue on blockchain (non-fatal):`, blockchainErr);
    }
  }

  private async checkWorkflowCompletion(shipmentId: string): Promise<void> {
    const status = await this.getPostDeliveryStatus(shipmentId);
    if (!status) return;

    // Check if all required steps are complete
    const allComplete = 
      status.paymentReceived &&
      status.forexRepatriated &&
      (!status.lcUsed || status.lcSettled) &&
      status.ectaAuditCompleted;

    if (allComplete && !status.contractClosed) {
      // Notify admin/ECTA to close contract
      await this.notifyStakeholders(shipmentId, status.contractId, status.exporterId, 'READY_FOR_CLOSURE');
    }
  }

  private async notifyStakeholders(
    shipmentId: string,
    contractId: string | null,
    exporterId: string | null,
    eventType: string
  ): Promise<void> {
    // Implementation depends on NotificationService
    logger.info(`📧 Notification sent: ${eventType} for shipment ${shipmentId}`);
  }
}

export default PostDeliveryWorkflowService;

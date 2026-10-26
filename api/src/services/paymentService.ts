// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Payment Service - Handles payment workflow with 40% NBE retention policy

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';

/**
 * NBE Retention Policy:
 * - 40% of export earnings must be retained and converted to Birr
 * - 60% can be held in foreign currency or used for approved imports
 * - Retention applies to all export payments
 */
const NBE_RETENTION_RATE = 40; // 40% mandatory retention

export class PaymentService {
  private static instance: PaymentService;
  private fabricService: FabricService;
  private dbService: DatabaseService;
  private auditService: AuditService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Record incoming payment - Automatically calculates 40% retention
   * @workflow Shipment Delivered → Payment Received → 40% Retention Applied
   */
  async recordPayment(paymentData: {
    paymentID: string;
    contractID: string;
    shipmentID: string;
    exporterID: string;
    lcID?: string;
    forexID?: string;
    amountUSD: number;
    currency: string;
    swiftReference?: string;
    paymentDate: string;
    payerName: string;
    payerBank?: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[PaymentService] Recording payment: ${paymentData.paymentID}`);

      // Calculate 40% retention automatically
      const totalAmount = paymentData.amountUSD;
      const retentionAmount = totalAmount * (NBE_RETENTION_RATE / 100); // 40%
      const releaseAmount = totalAmount - retentionAmount; // 60%

      logger.info(`[PaymentService] Retention breakdown: Total=${totalAmount} USD, Retention=${retentionAmount} USD (40%), Release=${releaseAmount} USD (60%)`);

      // Connect as Banks MSP to record payment
      await this.fabricService.connectAsOrg('BanksMSP');

      // Submit to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'RecordPayment',
        paymentData.paymentID,
        paymentData.contractID,
        paymentData.shipmentID,
        paymentData.exporterID,
        paymentData.lcID || '',
        paymentData.forexID || '',
        totalAmount.toString(),
        paymentData.currency,
        retentionAmount.toString(), // 40% retention
        releaseAmount.toString(), // 60% release
        NBE_RETENTION_RATE.toString(), // Policy rate
        paymentData.swiftReference || '',
        paymentData.paymentDate,
        paymentData.payerName,
        paymentData.payerBank || ''
      );

      // Store in database
      await this.dbService.run(
        `INSERT INTO payments (
          payment_id, contract_id, shipment_id, exporter_id, lc_id, forex_id,
          amount_usd, currency, retention_rate, retention_amount, release_amount,
          swift_reference, payment_date, payer_name, payer_bank,
          status, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)`,
        [
          paymentData.paymentID,
          paymentData.contractID,
          paymentData.shipmentID,
          paymentData.exporterID,
          paymentData.lcID,
          paymentData.forexID,
          totalAmount,
          paymentData.currency,
          NBE_RETENTION_RATE,
          retentionAmount,
          releaseAmount,
          paymentData.swiftReference,
          paymentData.paymentDate,
          paymentData.payerName,
          paymentData.payerBank,
          'RECEIVED',  // Payment received (will auto-split to 40% NBE, 60% Exporter)
          typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        ]
      );

      // Immediately split payment (40% NBE, 60% Exporter)
      await this.dbService.run(
        `UPDATE payments SET status = $1 WHERE payment_id = $2`,
        ['SPLIT', paymentData.paymentID]
      );

      // Update contract status
      await statusManager.updateEntityStatus(
        'CONTRACT',
        paymentData.contractID,
        'ACTIVE', // currentStatus - need to get from contract
        'PAYMENT_RECEIVED',
        { reason: 'Payment received from buyer', updatedBy: paymentData.userId }
      );

      // Audit log
      await this.auditService.log({
        entityType: 'PAYMENT',
        entityId: paymentData.paymentID,
        action: 'RECORD',
        performedBy: paymentData.userId,
        organization: paymentData.userOrg,
        performedByOrg: paymentData.userOrg,
        newValue: 'RECEIVED',
        metadata: {
          status: 'RECEIVED',
          amount: totalAmount,
          retention: retentionAmount,
          release: releaseAmount,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[PaymentService] ✅ Payment recorded: ${paymentData.paymentID} (${totalAmount} USD, 40% retention = ${retentionAmount} USD)`);

      return {
        success: true,
        paymentID: paymentData.paymentID,
        status: 'RECEIVED',
        totalAmount,
        retentionAmount,
        releaseAmount,
        retentionRate: NBE_RETENTION_RATE,
        blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
      };

    } catch (error) {
      logger.error(`[PaymentService] Failed to record payment:`, error);
      throw error;
    }
  }

  /**
   * Convert retention amount to Birr - NBE/Bank processes 40% retention
   * @workflow Payment Received → Retention Converted → Birr Deposited
   */
  async convertRetention(conversionData: {
    paymentID: string;
    exchangeRate: number;
    amountBirr: number;
    convertedBy: string;
    conversionRef: string;
    conversionDate: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[PaymentService] Converting retention for payment: ${conversionData.paymentID}`);

      // Get payment details
      const payment = await this.dbService.get(
        'SELECT * FROM payments WHERE payment_id = $1',
        [conversionData.paymentID]
      );

      if (!payment) {
        throw new Error(`Payment not found: ${conversionData.paymentID}`);
      }

      if (payment.status === 'RETENTION_CONVERTED') {
        throw new Error(`Retention already converted for payment: ${conversionData.paymentID}`);
      }

      // Connect as NBE MSP
      await this.fabricService.connectAsOrg('NBEMSP');

      // Submit conversion to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'ConvertRetention',
        conversionData.paymentID,
        conversionData.exchangeRate.toString(),
        conversionData.amountBirr.toString(),
        conversionData.convertedBy,
        conversionData.conversionRef,
        conversionData.conversionDate
      );

      // Update database
      await this.dbService.run(
        `UPDATE payments 
         SET status = $1, exchange_rate = $2, amount_birr = $3, 
             converted_by = $4, conversion_ref = $5, conversion_date = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = $7`,
        [
          'RETENTION_CONVERTED',
          conversionData.exchangeRate,
          conversionData.amountBirr,
          conversionData.convertedBy,
          conversionData.conversionRef,
          conversionData.conversionDate,
          conversionData.paymentID
        ]
      );

      // Audit log
      await this.auditService.log({
        entityType: 'PAYMENT',
        entityId: conversionData.paymentID,
        action: 'CONVERT_RETENTION',
        performedBy: conversionData.userId,
        organization: conversionData.userOrg,
        performedByOrg: conversionData.userOrg,
        newValue: 'RETENTION_CONVERTED',
        metadata: {
          status: 'RETENTION_CONVERTED',
          exchangeRate: conversionData.exchangeRate,
          amountBirr: conversionData.amountBirr,
          retentionUSD: payment.retention_amount,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[PaymentService] ✅ Retention converted: ${payment.retention_amount} USD → ${conversionData.amountBirr} Birr @ ${conversionData.exchangeRate}`);

      return {
        success: true,
        paymentID: conversionData.paymentID,
        status: 'RETENTION_CONVERTED',
        retentionUSD: payment.retention_amount,
        amountBirr: conversionData.amountBirr,
        exchangeRate: conversionData.exchangeRate
      };

    } catch (error) {
      logger.error(`[PaymentService] Failed to convert retention:`, error);
      throw error;
    }
  }

  /**
   * Release 60% to exporter - Bank releases non-retained portion
   * @workflow Retention Converted → 60% Released to Exporter
   */
  async releasePayment(releaseData: {
    paymentID: string;
    exporterAccount: string;
    releasedBy: string;
    releaseRef: string;
    releaseDate: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[PaymentService] Releasing payment to exporter: ${releaseData.paymentID}`);

      // Get payment details
      const payment = await this.dbService.get(
        'SELECT * FROM payments WHERE payment_id = $1',
        [releaseData.paymentID]
      );

      if (!payment) {
        throw new Error(`Payment not found: ${releaseData.paymentID}`);
      }

      if (payment.status === 'RELEASED') {
        throw new Error(`Payment already released: ${releaseData.paymentID}`);
      }

      // Connect as Banks MSP
      await this.fabricService.connectAsOrg('BanksMSP');

      // Submit release to blockchain
      const blockchainResult = await this.fabricService.submitTransaction(
        'ReleasePayment',
        releaseData.paymentID,
        payment.release_amount.toString(), // 60% amount
        releaseData.exporterAccount,
        releaseData.releasedBy,
        releaseData.releaseRef,
        releaseData.releaseDate
      );

      // Update database
      await this.dbService.run(
        `UPDATE payments 
         SET status = $1, exporter_account = $2, released_by = $3, 
             release_ref = $4, release_date = $5, updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = $6`,
        [
          'RELEASED',
          releaseData.exporterAccount,
          releaseData.releasedBy,
          releaseData.releaseRef,
          releaseData.releaseDate,
          releaseData.paymentID
        ]
      );

      // Update contract to COMPLETED
      await statusManager.updateEntityStatus(
        'CONTRACT',
        payment.contract_id,
        'PAYMENT_RECEIVED', // currentStatus
        'COMPLETED',
        { reason: 'Payment released to exporter', updatedBy: releaseData.userId }
      );

      // Audit log
      await this.auditService.log({
        entityType: 'PAYMENT',
        entityId: releaseData.paymentID,
        action: 'RELEASE',
        performedBy: releaseData.userId,
        organization: releaseData.userOrg,
        performedByOrg: releaseData.userOrg,
        newValue: 'RELEASED',
        metadata: {
          status: 'RELEASED',
          releaseAmount: payment.release_amount,
          exporterAccount: releaseData.exporterAccount,
          blockchainTxId: typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        }
      });

      logger.info(`[PaymentService] ✅ Payment released: ${payment.release_amount} USD to exporter account ${releaseData.exporterAccount}`);

      return {
        success: true,
        paymentID: releaseData.paymentID,
        status: 'RELEASED',
        releaseAmount: payment.release_amount,
        totalAmount: payment.amount_usd,
        retentionAmount: payment.retention_amount
      };

    } catch (error) {
      logger.error(`[PaymentService] Failed to release payment:`, error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentID: string) {
    try {
      // Try database first
      const dbPayment = await this.dbService.get(
        'SELECT * FROM payments WHERE payment_id = $1',
        [paymentID]
      );

      if (dbPayment) {
        return dbPayment;
      }

      // Fallback to blockchain
      await this.fabricService.connectAsOrg('BanksMSP');
      const blockchainResult = await this.fabricService.queryChaincode(
        'ReadPayment',
        [paymentID]
      );

      return blockchainResult;

    } catch (error) {
      logger.error(`[PaymentService] Failed to get payment:`, error);
      throw error;
    }
  }

  /**
   * Get payments by contract
   */
  async getPaymentsByContract(contractID: string) {
    try {
      const payments = await this.dbService.all(
        'SELECT * FROM payments WHERE contract_id = $1 ORDER BY created_at DESC',
        [contractID]
      );

      return payments;

    } catch (error) {
      logger.error(`[PaymentService] Failed to get payments for contract:`, error);
      throw error;
    }
  }

  /**
   * Get payments by exporter
   */
  async getPaymentsByExporter(exporterID: string) {
    try {
      const payments = await this.dbService.all(
        'SELECT * FROM payments WHERE exporter_id = $1 ORDER BY created_at DESC',
        [exporterID]
      );

      return payments;

    } catch (error) {
      logger.error(`[PaymentService] Failed to get payments for exporter:`, error);
      throw error;
    }
  }

  /**
   * Get payment statistics for exporter (with retention breakdown)
   */
  async getPaymentStats(exporterID: string) {
    try {
      const payments = await this.getPaymentsByExporter(exporterID);

      const stats = {
        totalPayments: payments.length,
        totalAmountUSD: payments.reduce((sum, p) => sum + (p.amount_usd || 0), 0),
        totalRetentionUSD: payments.reduce((sum, p) => sum + (p.retention_amount || 0), 0),
        totalReleaseUSD: payments.reduce((sum, p) => sum + (p.release_amount || 0), 0),
        totalBirrReceived: payments.reduce((sum, p) => sum + (p.amount_birr || 0), 0),
        retentionRate: NBE_RETENTION_RATE,
        statusBreakdown: {
          received: payments.filter(p => p.status === 'RECEIVED').length,
          retentionConverted: payments.filter(p => p.status === 'RETENTION_CONVERTED').length,
          released: payments.filter(p => p.status === 'RELEASED').length,
        },
        payments: payments
      };

      return stats;

    } catch (error) {
      logger.error(`[PaymentService] Failed to get payment stats:`, error);
      throw error;
    }
  }

  /**
   * Get all payments with optional filters
   */
  async getAllPayments(filters?: {
    exporterID?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    try {
      let query = 'SELECT * FROM payments WHERE 1=1';
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

      const payments = await this.dbService.all(query, params);
      return payments;

    } catch (error) {
      logger.error(`[PaymentService] Failed to get all payments:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();

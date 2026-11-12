// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Payment Service - Handles payment workflow with 40% NBE retention policy

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { ExchangeRateService } from './exchangeRateService';
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
  private exchangeRateService: ExchangeRateService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
    this.exchangeRateService = ExchangeRateService.getInstance();
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

      // Submit to blockchain using InitiatePayment (the actual function that exists)
      const blockchainResult = await this.fabricService.submitTransaction(
        'InitiatePayment',
        paymentData.paymentID,
        paymentData.contractID,
        paymentData.exporterID,
        paymentData.lcID || '',
        totalAmount.toString(),
        paymentData.currency,
        'Commercial Bank of Ethiopia', // receivingBank
        'CBETETAA', // receivingBankBIC
        paymentData.exporterID, // beneficiaryName (use exporter ID as fallback)
        `${paymentData.exporterID}-001`, // beneficiaryAccount
        'LC' // paymentMethod
      );

      // Submit payment documents (moves status from PENDING to DOCUMENTS_SUBMITTED)
      await this.fabricService.submitTransaction(
        'SubmitPaymentDocuments',
        paymentData.paymentID,
        JSON.stringify(['Bill of Lading', 'Commercial Invoice', 'Certificate of Origin', 'Quality Certificate'])
      );

      // Verify payment documents (moves status from DOCUMENTS_SUBMITTED to VERIFIED)
      await this.fabricService.submitTransaction(
        'VerifyPaymentDocuments',
        paymentData.paymentID,
        paymentData.userId || 'Bank Officer',
        'Payment documents verified - all documents in order'
      );

      logger.info(`✅ Payment ${paymentData.paymentID} initiated, documents submitted and verified on blockchain`);



      // Store in database. status carries the SETTLEMENT machine only
      // (the chain has just verified the documents, so VERIFIED);
      // the NBE retention machine lives on retention_status
      // (TEST-STATUS-MATRIX §17 #8) — the old code wrote 'RECEIVED'
      // into status, so the settle mirror later overwrote it with
      // SETTLED and the retention state was lost.
      await this.dbService.run(
        `INSERT INTO payments (
          payment_id, contract_id, shipment_id, exporter_id, lc_id, forex_id,
          amount_usd, currency, retention_rate, retention_amount, release_amount,
          swift_reference, payment_date, payer_name, payer_bank,
          status, retention_status, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)`,
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
          'VERIFIED',  // Settlement machine: documents verified on-chain
          'RECEIVED',  // Retention machine: payment received (will auto-split to 40% NBE, 60% Exporter)
          typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId
        ]
      );

      // Immediately split payment (40% NBE, 60% Exporter) — retention
      // machine only; the settlement status stays VERIFIED.
      await this.dbService.run(
        `UPDATE payments SET retention_status = $1 WHERE payment_id = $2`,
        ['SPLIT', paymentData.paymentID]
      );

      // The contract status is NOT advanced here: 'ACTIVE' →
      // 'PAYMENT_RECEIVED' was never a CONTRACT transition (no such
      // states in the CONTRACT table or on-chain), and the chaincode
      // has no payment-received contract step. The contract reaches
      // COMPLETED via CompleteContract (contracts close route), not via
      // payment recording. Removed with the fail-closed validator
      // (TEST-STATUS-MATRIX §17 #12).

      // Audit log
      await this.auditService.log({
        entityType: 'PAYMENT',
        entityId: paymentData.paymentID,
        action: 'RECORD',
        performedBy: paymentData.userId,
        organization: paymentData.userOrg,
        performedByOrg: paymentData.userOrg,
        newValue: 'VERIFIED',
        metadata: {
          status: 'VERIFIED',
          retentionStatus: 'SPLIT',
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
        status: 'VERIFIED',
        retentionStatus: 'SPLIT',
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

      if (payment.retention_status === 'RETENTION_CONVERTED') {
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

      // Update database — retention machine only (status stays VERIFIED;
      // the settlement machine does not move on a retention conversion).
      await this.dbService.run(
        `UPDATE payments 
         SET retention_status = $1, exchange_rate = $2, amount_birr = $3, 
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
          retentionStatus: 'RETENTION_CONVERTED',
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
        status: payment.status || 'VERIFIED',
        retentionStatus: 'RETENTION_CONVERTED',
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
   * Canonical SettlePayment invocation (TEST-STATUS-MATRIX §17 #14):
   * the settle route (payments.ts) and releasePayment below both
   * submitted SettlePayment with the same 7-arg order — paymentID,
   * exchangeRate, retentionRate, payingBank, payingBankBIC,
   * swiftReference, nbeApprovalRef — from two places, a divergence
   * risk if the order ever changes. Both now go through here. Returns
   * the raw chain result; the caller decides the failure mode (the
   * settle route returns 400, releasePayment throws).
   */
  async settleOnChain(params: {
    paymentID: string;
    exchangeRate: string;
    retentionRate: string;
    payingBank: string;
    payingBankBIC: string;
    swiftReference: string;
    nbeApprovalRef: string;
  }) {
    return this.fabricService.invokeChaincode('SettlePayment', [
      params.paymentID,
      params.exchangeRate,
      params.retentionRate,
      params.payingBank,
      params.payingBankBIC,
      params.swiftReference,
      params.nbeApprovalRef,
    ]);
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

      if (payment.retention_status === 'RELEASED') {
        throw new Error(`Payment already released: ${releaseData.paymentID}`);
      }

      // F1: SettlePayment (chaincode payment.go) accepts VERIFIED and
      // SWIFT_RECEIVED only — calling it for an already-SETTLED payment
      // is rejected on-chain, which is why the NBE 60% release failed.
      // Read the on-chain status first and settle ONLY when the payment
      // is still settleable; when it is already settled (or beyond),
      // skip the chain call and go straight to the PG release update
      // below. Any other status is refused here without invoking the
      // chain (the chaincode would reject it the same way).
      const onChain = await this.fabricService.queryChaincode('ReadPayment', [releaseData.paymentID]);
      if (!onChain.success || !onChain.data) {
        throw new Error(`Cannot release payment ${releaseData.paymentID}: could not read its on-chain status (${onChain.error || 'payment not found on ledger'})`);
      }
      const onChainStatus = onChain.data.status || onChain.data.Status || '';
      const alreadySettled = ['SETTLED', 'CONFIRMED', 'DOCUMENTS_RELEASED', 'COMPLETED'].includes(onChainStatus);
      const settleable = ['VERIFIED', 'SWIFT_RECEIVED'].includes(onChainStatus);
      if (!alreadySettled && !settleable) {
        throw new Error(`Cannot release payment ${releaseData.paymentID}: on-chain status is ${onChainStatus || 'unknown'} — only VERIFIED or SWIFT_RECEIVED payments can be settled`);
      }

      // Connect as Banks MSP
      await this.fabricService.connectAsOrg('BanksMSP');

      // Submit settlement to blockchain using SettlePayment, via the
      // canonical helper (§17 #14) — same 7 args the settle route uses.
      // settleOnChain returns the raw result (unlike submitTransaction,
      // it does not throw), so a rejection is turned into an error here
      // to preserve the old throw-on-failure behaviour. Skipped entirely
      // when the payment is already settled on-chain (F1 above).
      // The exchange rate is the LIVE NBE mid-rate from the ledger
      // (QueryExchangeRate via ExchangeRateService — the same reader
      // payments.ts GET / uses), NOT a hardcoded constant: the old
      // '120.5' was a stale hardcode. NOTE: no allocate path reads the
      // ledger rate to follow — banking.ts allocate-forex and
      // forexService.allocateForex both take the rate from the caller —
      // so the ledger reader is ExchangeRateService.getCurrentRate.
      // It throws when no active rate is recorded: fail honestly rather
      // than settle at a fabricated rate.
      let blockchainTxId: string | null = null;
      if (settleable) {
        const liveRate = await this.exchangeRateService.getCurrentRate(payment.currency || 'USD');
        const blockchainResult = await this.settleOnChain({
          paymentID: releaseData.paymentID,
          exchangeRate: liveRate.toString(),
          retentionRate: '40',     // NBE retention rate (40%)
          payingBank: 'Commercial Bank of Ethiopia',
          payingBankBIC: 'CBETETAA',
          swiftReference: releaseData.releaseRef,
          nbeApprovalRef: `NBE-APPROVAL-${releaseData.paymentID}`,
        });
        if (!blockchainResult.success) {
          throw new Error(blockchainResult.error || 'Fabric rejected transaction SettlePayment');
        }
        blockchainTxId = typeof blockchainResult === 'string' ? JSON.parse(blockchainResult).transactionId : blockchainResult.txId || null;
      } else {
        logger.info(`[PaymentService] Payment ${releaseData.paymentID} already ${onChainStatus} on-chain; skipping SettlePayment and releasing the 60% in Postgres only`);
      }

      // Update database — SettlePayment settles the payment on-chain, so
      // status becomes SETTLED (settlement machine) and the retention
      // machine advances to RELEASED. The old code wrote status
      // 'RELEASED', which both hid the settlement and failed the
      // settlement CHECK once the machines split (§17 #8).
      await this.dbService.run(
        `UPDATE payments 
         SET status = $1, retention_status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = $3`,
        [
          'SETTLED',
          'RELEASED',
          releaseData.paymentID
        ]
      );

      // The contract status is NOT advanced here: 'PAYMENT_RECEIVED'
      // was never a CONTRACT state, so PAYMENT_RECEIVED → COMPLETED
      // validated nothing and updated nothing. The contract reaches
      // COMPLETED via CompleteContract (contracts close route), not via
      // payment release. Removed with the fail-closed validator
      // (TEST-STATUS-MATRIX §17 #12).

      // Audit log
      await this.auditService.log({
        entityType: 'PAYMENT',
        entityId: releaseData.paymentID,
        action: 'RELEASE',
        performedBy: releaseData.userId,
        organization: releaseData.userOrg,
        performedByOrg: releaseData.userOrg,
        newValue: 'SETTLED',
        metadata: {
          status: 'SETTLED',
          retentionStatus: 'RELEASED',
          releaseAmount: payment.release_amount,
          exporterAccount: releaseData.exporterAccount,
          blockchainTxId: blockchainTxId
        }
      });

      logger.info(`[PaymentService] ✅ Payment released: ${payment.release_amount} USD to exporter account ${releaseData.exporterAccount}`);

      return {
        success: true,
        paymentID: releaseData.paymentID,
        status: 'SETTLED',
        retentionStatus: 'RELEASED',
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
          received: payments.filter(p => p.retention_status === 'RECEIVED').length,
          retentionConverted: payments.filter(p => p.retention_status === 'RETENTION_CONVERTED').length,
          released: payments.filter(p => p.retention_status === 'RELEASED').length,
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

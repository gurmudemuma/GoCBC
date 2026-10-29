// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Contract Service - Handles all contract-related blockchain operations

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';

export class ContractService {
  private static instance: ContractService;
  private fabricService: FabricService;
  private dbService: DatabaseService;
  private auditService: AuditService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  /**
   * Register a new sales contract
   */
  async registerContract(contractData: {
    contractID: string;
    exporterID: string;
    buyerID: string;
    buyerName?: string;
    buyerCountry: string;
    buyerBank?: string;
    exporterBank?: string;
    coffeeType: string;
    quantity: number;
    pricePerKg: number;
    currency: string;
    paymentMethod: string;
    eudrRequired: boolean;
    documents?: string[];
    supersedesContractID?: string | null;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[ContractService] Registering contract: ${contractData.contractID}`);

      // 1. Register on blockchain - FINAL correct order based on chaincode error analysis
      // The chaincode reads paymentMethod from position 13 (index 12), not position 10!
      const chaincodeParams = [
        contractData.contractID,           // 1
        contractData.exporterID,           // 2
        contractData.buyerID,              // 3
        contractData.buyerName || contractData.buyerID,  // 4
        contractData.buyerCountry,         // 5
        contractData.coffeeType,           // 6
        contractData.quantity.toString(),  // 7
        contractData.pricePerKg.toString(), // 8
        contractData.currency,             // 9
        contractData.eudrRequired.toString(), // 10
        contractData.buyerBank || '',      // 11
        contractData.exporterBank || '',   // 12
        contractData.paymentMethod,        // 13 - CORRECT POSITION!
        (contractData.documents || []).join(','), // 14
      ];
      
      logger.info(`🔍 DEBUG: Chaincode parameters for ${contractData.contractID}:`, {
        param13_paymentMethod: chaincodeParams[12],
        param10_eudrRequired: chaincodeParams[9],
        allParams: chaincodeParams
      });
      
      const result = await this.fabricService.invokeChaincode(
        'RegisterSalesContractWithPaymentMethod',
        chaincodeParams
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to register contract on blockchain');
      }

      // 2. Save to PostgreSQL
      const totalValue = contractData.quantity * contractData.pricePerKg;
      await this.dbService.run(
        `INSERT INTO contracts (
          contract_id, exporter_id, buyer_id, buyer_name, buyer_country, 
          buyer_bank, exporter_bank,
          coffee_type, quantity, price_per_kg, currency, 
          total_value, payment_method, eudr_required, 
          supersedes_contract_id,
          status, blockchain_synced, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())`,
        [
          contractData.contractID,
          contractData.exporterID,
          contractData.buyerID,
          contractData.buyerName || contractData.buyerID,
          contractData.buyerCountry,
          contractData.buyerBank || '',
          contractData.exporterBank || '',
          contractData.coffeeType,
          contractData.quantity,
          contractData.pricePerKg,
          contractData.currency,
          totalValue,
          contractData.paymentMethod,
          contractData.eudrRequired,
          contractData.supersedesContractID || null,
          'REGISTERED',
          true,
          result.txId,
        ]
      );

      // 3. Auto-log audit trail
      await this.auditService.log({
        entityType: 'CONTRACT',
        entityId: contractData.contractID,
        action: 'CREATE',
        performedBy: contractData.userId,
        organization: contractData.userOrg,
        performedByOrg: contractData.userOrg,
        oldValue: '',
        newValue: 'REGISTERED',
        reason: 'Contract registered',
        metadata: { totalValue, paymentMethod: contractData.paymentMethod },
      });

      logger.info(`✅ [ContractService] Contract registered: ${contractData.contractID}`);
      return { success: true, contractID: contractData.contractID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ContractService] Register failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve a contract (ECTA only)
   */
  async approveContract(approvalData: {
    contractID: string;
    approvedBy: string;
    approverOrg: string;
    reason?: string;
  }) {
    try {
      logger.info(`[ContractService] Approving contract: ${approvalData.contractID}`);

      // 1. Get current contract
      const contract = await this.dbService.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [approvalData.contractID]
      );

      if (!contract) {
        throw new Error('Contract not found');
      }

      // 2. Validate status transition
      // 2. Validate status transition
      const isValid = statusManager.validateTransition('CONTRACT', contract.status, 'APPROVED');
      if (!isValid) {
        throw new Error(`Invalid status transition from ${contract.status} to APPROVED`);
      }

      // 3. Approve on blockchain
      const result = await this.fabricService.invokeChaincode('ApproveSalesContract', [
        approvalData.contractID,
        approvalData.approvedBy,
        approvalData.reason || 'Contract approved by ECTA',
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve contract on blockchain');
      }

      // 4. Update status (this will cascade to related entities)
      await statusManager.updateEntityStatus('CONTRACT', approvalData.contractID, contract.status, 'APPROVED');

      // 5. Update PostgreSQL
      await this.dbService.run(
        `UPDATE contracts 
         SET status = $1, approved_by = $2, approved_at = NOW(), blockchain_tx_id = $3
         WHERE contract_id = $4`,
        ['APPROVED', approvalData.approvedBy, result.txId, approvalData.contractID]
      );

      // 6. Auto-log audit
      await this.auditService.log({
        entityType: 'CONTRACT',
        entityId: approvalData.contractID,
        action: 'APPROVE',
        performedBy: approvalData.approvedBy,
        organization: approvalData.approverOrg,
        performedByOrg: approvalData.approverOrg,
        oldValue: contract.status,
        newValue: 'APPROVED',
        reason: approvalData.reason || 'Contract approved',
        metadata: { exporterID: contract.exporter_id, amount: contract.total_value },
      });

      // 7. 🔥 WORKFLOW TRIGGER: Auto-create LC when contract approved
      logger.info(`🔥 [ContractService] Contract approved - triggering LC auto-creation for ${approvalData.contractID}`);
      await this.triggerLCAutoCreation(approvalData.contractID, contract, approvalData.approvedBy, approvalData.approverOrg);

      logger.info(`✅ [ContractService] Contract approved: ${approvalData.contractID}`);
      return { success: true, contractID: approvalData.contractID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ContractService] Approve failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject a contract (ECTA only)
   */
  async rejectContract(rejectionData: {
    contractID: string;
    rejectedBy: string;
    reason: string;
    rejectorOrg: string;
  }) {
    try {
      logger.info(`[ContractService] Rejecting contract: ${rejectionData.contractID}`);

      const contract = await this.dbService.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [rejectionData.contractID]
      );

      if (!contract) {
        throw new Error('Contract not found');
      }

      const result = await this.fabricService.invokeChaincode('RejectSalesContract', [
        rejectionData.contractID,
        rejectionData.rejectedBy,
        rejectionData.reason,
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to reject contract on blockchain');
      }

      await statusManager.updateEntityStatus('CONTRACT', rejectionData.contractID, contract.status, 'REJECTED');

      await this.dbService.run(
        `UPDATE contracts 
         SET status = $1, rejected_by = $2, rejected_at = NOW(), rejection_reason = $3, blockchain_tx_id = $4
         WHERE contract_id = $5`,
        ['REJECTED', rejectionData.rejectedBy, rejectionData.reason, result.txId, rejectionData.contractID]
      );

      await this.auditService.log({
        entityType: 'CONTRACT',
        entityId: rejectionData.contractID,
        action: 'REJECT',
        performedBy: rejectionData.rejectedBy,
        organization: rejectionData.rejectorOrg,
        performedByOrg: rejectionData.rejectorOrg,
        oldValue: contract.status,
        newValue: 'REJECTED',
        reason: rejectionData.reason,
        metadata: { exporterID: contract.exporter_id },
      });

      logger.info(`✅ [ContractService] Contract rejected: ${rejectionData.contractID}`);
      return { success: true, contractID: rejectionData.contractID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ContractService] Reject failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔥 WORKFLOW FIX: Auto-create LC when contract is approved
   */
  private async triggerLCAutoCreation(contractID: string, contract: any, userId: string, userOrg: string) {
    try {
      const { LCService } = await import('./lcService');
      const lcService = LCService.getInstance();

      const lcID = `LC-${Date.now()}`;
      
      // Calculate expiry date (90 days from now as default)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);
      
      await lcService.requestLC({
        lcID,
        contractID,
        exporterID: contract.exporter_id,
        bankName: 'Commercial Bank of Ethiopia', // Default bank
        amount: contract.total_value,
        currency: contract.currency,
        expiryDate: expiryDate.toISOString(),
        userId,
        userOrg
      });

      logger.info(`✅ [ContractService] LC auto-created: ${lcID} for contract: ${contractID}`);
      return { success: true, lcID };
    } catch (error: any) {
      logger.error(`❌ [ContractService] LC auto-creation failed: ${error.message}`);
      // Don't fail contract approval if LC creation fails
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contract by ID from PostgreSQL
   */
  async getContract(contractID: string) {
    return await this.dbService.get(
      'SELECT * FROM contracts WHERE contract_id = $1',
      [contractID]
    );
  }

  /**
   * Get all contracts for an exporter
   */
  async getContractsByExporter(exporterID: string) {
    return await this.dbService.all(
      'SELECT * FROM contracts WHERE UPPER(exporter_id) = UPPER($1) ORDER BY created_at DESC',
      [exporterID]
    );
  }

  /**
   * Get contracts by status
   */
  async getContractsByStatus(status: string) {
    return await this.dbService.all(
      'SELECT * FROM contracts WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
  }
}

export const contractService = ContractService.getInstance();

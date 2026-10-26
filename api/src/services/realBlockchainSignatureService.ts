/**
 * Real Blockchain Signature Service
 * Queries transaction data DIRECTLY from Hyperledger Fabric blockchain
 * No database - pure blockchain source of truth
 */

import { FabricService } from "./fabricService";
import { logger } from "../utils/logger";

export interface BlockchainTransactionSignature {
  txId: string;
  timestamp: string;
  creator: {
    mspId: string;
    identity: string; // X.509 certificate DN
    signatureValid?: boolean | null;
    certificateTrustStatus?: string;
  };
  chaincodeName: string | null;
  chaincodeFunction: string;
  args: string[];
  endorsers: Array<{
    mspId: string;
    identity?: string;
    signatureValid?: boolean | null;
    endpoint?: string;
  }>;
  endorsementNote?: string;
  validationCode: string;
  blockNumber: number | null;
  blockHash: string;
}

export class RealBlockchainSignatureService {
  private static instance: RealBlockchainSignatureService;
  private fabricService: FabricService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
  }

  static getInstance(): RealBlockchainSignatureService {
    if (!RealBlockchainSignatureService.instance) {
      RealBlockchainSignatureService.instance =
        new RealBlockchainSignatureService();
    }
    return RealBlockchainSignatureService.instance;
  }

  /** Read one transaction directly from QSCC, including block validation metadata. */
  getTransactionDetails(txId: string) {
    return this.fabricService.getTransactionDetails(txId);
  }

  /**
   * Get blockchain transaction signatures for an entity
   * Resolve entity audit/history transaction IDs through QSCC. CouchDB revisions
   * and application audit rows are state/audit data, not proof of block validity.
   */
  async getEntityTransactions(
    entityType: string,
    entityId: string,
  ): Promise<BlockchainTransactionSignature[]> {
    try {
      const txIds = new Set<string>();
      const auditResult = await this.fabricService.queryChaincode('QueryAuditLogsByEntity', [entityType, entityId]);
      for (const audit of Array.isArray(auditResult.data) ? auditResult.data : []) {
        const signature = audit.Signature || audit.signature;
        const txId = signature?.TransactionID || signature?.transactionId || audit.TransactionID || audit.transactionId;
        if (typeof txId === 'string' && txId) txIds.add(txId);
      }

      const historyResult = await this.fabricService.queryChaincode('GetHistory', [entityId]);
      for (const record of Array.isArray(historyResult.data) ? historyResult.data : []) {
        const txId = record.TxId || record.txId || record.tx_id;
        if (typeof txId === 'string' && txId) txIds.add(txId);
      }

      const ledgerTransactions = await Promise.all(
        [...txIds].map((txId) => this.fabricService.getTransactionDetails(txId)),
      );
      return ledgerTransactions
        .filter((transaction): transaction is NonNullable<typeof transaction> => transaction !== null)
        .map((transaction) => ({
          txId: transaction.txId,
          timestamp: transaction.timestamp || '',
          creator: transaction.creator,
          chaincodeName: transaction.chaincodeName,
          chaincodeFunction: transaction.chaincodeFunction || 'UNKNOWN',
          args: transaction.args,
          endorsers: transaction.endorsers,
          endorsementNote: 'Endorsements and validation status were decoded from the committed Fabric transaction envelope.',
          validationCode: transaction.validationStatus,
          blockNumber: transaction.blockNumber,
          blockHash: transaction.blockHash || '',
        }))
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    } catch (error: any) {
      logger.error(
        `❌ Error querying blockchain for ${entityType}/${entityId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get current blockchain state with signatures
   */
  async getEntityWithSignatures(
    entityType: string,
    entityId: string,
  ): Promise<any> {
    try {
      // Get current state from blockchain
      const stateResult = await this.getEntityState(entityType, entityId);

      // Get transaction history
      const transactions = await this.getEntityTransactions(
        entityType,
        entityId,
      );

      return {
        currentState: stateResult,
        transactions,
        summary: {
          total: transactions.length,
          verified: transactions.filter((t) => t.validationCode === "VALID")
            .length,
          organizations: [...new Set(transactions.map((t) => t.creator.mspId))],
          latestTx: transactions[transactions.length - 1] || null,
        },
      };
    } catch (error: any) {
      logger.error(`Error getting entity with signatures:`, error);
      throw error;
    }
  }

  /**
   * Get current entity state from blockchain
   */
  private async getEntityState(
    entityType: string,
    entityId: string,
  ): Promise<any> {
    const functionMap: Record<string, string> = {
      FOREX_ALLOCATION: "ReadForex",
      LETTER_OF_CREDIT: "ReadLC",
      PAYMENT: "ReadPayment",
      CONTRACT: "ReadSalesContract",
      SHIPMENT: "ReadShipment",
      CUSTOMS_DECLARATION: "ReadDeclaration",
      EXPORTER: "ReadExporter",
      EXPORTER_APPLICATION: "ReadExporter",
      APPLICATION: "ReadExporter",
      INSPECTION: "ReadInspection",
      QUALITY_INSPECTION: "ReadInspection",
    };

    const func = functionMap[entityType];
    if (!func) {
      // Unknown chaincode entity types do not have a state lookup mapping.
      logger.warn(`Unknown entity type for state lookup: ${entityType}, skipping state fetch`);
      return null;
    }

    const result = await this.fabricService.queryChaincode(func, [entityId]);
    return result.success ? result.data : null;
  }

}

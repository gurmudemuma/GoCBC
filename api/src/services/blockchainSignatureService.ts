/**
 * Blockchain Signature Service
 * Records cryptographic proof of blockchain transactions for audit and verification
 */

import { DatabaseService } from './databaseService';
import { logger } from '../utils/logger';

export interface BlockchainSignatureData {
  entityType: string;  // CONTRACT, LETTER_OF_CREDIT, SHIPMENT, FOREX_ALLOCATION, PAYMENT, etc.
  entityId: string;
  actionType: string;  // CREATE, UPDATE, APPROVE, ALLOCATE, VERIFY, etc.
  signerUsername: string;
  signerOrg: string;
  signerRole?: string;
  blockchainTxId?: string;
  blockchainTimestamp?: Date;
  chaincodeName?: string;
  chaincodeFunction?: string;
  transactionArgs?: any[];
  endorsingPeers?: string[];
  metadata?: any;
}

export class BlockchainSignatureService {
  private static instance: BlockchainSignatureService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): BlockchainSignatureService {
    if (!BlockchainSignatureService.instance) {
      BlockchainSignatureService.instance = new BlockchainSignatureService();
    }
    return BlockchainSignatureService.instance;
  }

  /**
   * Record a blockchain signature after a successful transaction
   */
  async recordSignature(data: BlockchainSignatureData): Promise<string> {
    try {
      const signatureId = `SIG-${data.entityType}-${data.entityId}-${Date.now()}`;
      
      // For now, certificate details will be null - can be enhanced later to fetch from crypto_user_service
      const certificateDN: string | null = null;
      const certificateFingerprint: string | null = null;

      // Insert signature record
      await this.db.run(
        `INSERT INTO blockchain_signatures (
          signature_id, entity_type, entity_id, action_type,
          signer_username, signer_org, signer_role,
          certificate_dn, certificate_fingerprint,
          blockchain_tx_id, blockchain_timestamp,
          chaincode_name, chaincode_function, transaction_args,
          endorsing_peers, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          signatureId,
          data.entityType,
          data.entityId,
          data.actionType,
          data.signerUsername,
          data.signerOrg,
          data.signerRole || null,
          certificateDN,
          certificateFingerprint,
          data.blockchainTxId || null,
          data.blockchainTimestamp || new Date(),
          data.chaincodeName || 'coffee',
          data.chaincodeFunction || 'unknown',
          data.transactionArgs ? JSON.stringify(data.transactionArgs) : null,
          data.endorsingPeers ? JSON.stringify(data.endorsingPeers) : null,
          data.metadata ? JSON.stringify(data.metadata) : null
        ]
      );

      logger.info(`✅ Blockchain signature recorded: ${signatureId} for ${data.entityType}/${data.entityId}`);
      return signatureId;
    } catch (error: any) {
      logger.error('Failed to record blockchain signature:', error);
      throw error;
    }
  }

  /**
   * Get all signatures for an entity
   */
  async getSignatures(entityType: string, entityId: string): Promise<any[]> {
    try {
      const signatures = await this.db.all(
        `SELECT * FROM blockchain_signatures 
         WHERE entity_type = $1 AND entity_id = $2 
         ORDER BY created_at ASC`,
        [entityType, entityId]
      );
      
      return signatures || [];
    } catch (error: any) {
      logger.error(`Failed to get signatures for ${entityType}/${entityId}:`, error);
      return [];
    }
  }

  /**
   * Get verification summary for an entity
   */
  async getVerificationSummary(entityType: string, entityId: string) {
    try {
      const signatures = await this.getSignatures(entityType, entityId);
      
      return {
        total: signatures.length,
        verified: signatures.filter(s => s.blockchain_tx_id).length,
        pending: signatures.filter(s => !s.blockchain_tx_id).length,
        uniqueSigners: new Set(signatures.map(s => s.signer_username)).size,
        organizations: [...new Set(signatures.map(s => s.signer_org))],
        latestSignature: signatures[signatures.length - 1] || null
      };
    } catch (error: any) {
      logger.error(`Failed to get verification summary for ${entityType}/${entityId}:`, error);
      return { total: 0, verified: 0, pending: 0, uniqueSigners: 0, organizations: [], latestSignature: null };
    }
  }

  /**
   * Extract Distinguished Name from X.509 certificate
   */
  private extractDNFromCertificate(certificate: string): string {
    try {
      // Parse certificate and extract DN
      // For now, return a placeholder - full implementation would parse X.509
      const match = certificate.match(/CN=([^,]+)/);
      return match ? `CN=${match[1]}` : 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Calculate SHA-256 fingerprint of certificate
   */
  private calculateCertificateFingerprint(certificate: string): string {
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256');
      hash.update(certificate);
      return hash.digest('hex').toUpperCase();
    } catch (error) {
      return 'UNKNOWN';
    }
  }
}

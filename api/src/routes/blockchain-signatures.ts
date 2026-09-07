/**
 * Blockchain Signatures API
 * Queries transaction signatures from BOTH Hyperledger Fabric blockchain AND PostgreSQL
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { RealBlockchainSignatureService } from '../services/realBlockchainSignatureService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const signatureService = RealBlockchainSignatureService.getInstance();
const postgresDb = DatabaseService.getInstance();

/**
 * GET /api/v1/blockchain-signatures/entity/:entityType/:entityId
 * Get blockchain transaction signatures by querying Fabric ledger directly
 * Public endpoint - blockchain transparency is a core feature
 */
router.get('/entity/:entityType/:entityId',
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      
      logger.info(`🔗 Fetching blockchain signatures from BOTH sources: ${entityType}/${entityId}`);
      
      // STEP 1: Query blockchain CouchDB (Hyperledger Fabric state database)
      const blockchainResult = await signatureService.getEntityWithSignatures(entityType, entityId);
      
      // STEP 2: Query PostgreSQL blockchain_signatures table
      let postgresSignatures: any[] = [];
      try {
        const pgResult = await postgresDb.all(
          `SELECT * FROM blockchain_signatures 
           WHERE entity_type = $1 AND (entity_id = $2 OR entity_id LIKE $3)
           ORDER BY created_at DESC`,
          [entityType, entityId, `%${entityId}%`]
        );
        postgresSignatures = pgResult || [];
        logger.info(`✅ Found ${postgresSignatures.length} signatures in PostgreSQL`);
      } catch (pgErr) {
        logger.warn('Could not fetch signatures from PostgreSQL:', pgErr);
      }
      
      // STEP 3: Convert PostgreSQL signatures to same format as blockchain signatures
      const pgFormattedSignatures = postgresSignatures.map(sig => ({
        txId: sig.blockchain_tx_id,
        timestamp: sig.blockchain_timestamp || sig.created_at,
        creator: {
          mspId: sig.signer_org,
          identity: `CN=${sig.signer_username}, OU=client`
        },
        chaincodeName: 'coffee',
        chaincodeFunction: sig.chaincode_function || sig.action_type,
        args: [entityId],
        endorsers: [
          { mspId: sig.signer_org, endpoint: `peer0.${sig.signer_org.toLowerCase().replace('msp', '')}.cecbs.et:7051` }
        ],
        validationCode: 'VALID',
        blockNumber: 0,
        blockHash: sig.blockchain_tx_id,
        source: 'POSTGRESQL'
      }));
      
      // STEP 4: Combine both sources and deduplicate by txId
      const allTransactions = [
        ...blockchainResult.transactions.map((t: any) => ({ ...t, source: 'BLOCKCHAIN' })),
        ...pgFormattedSignatures
      ];
      
      // Deduplicate by txId
      const uniqueTransactions = allTransactions.filter((tx, index, self) =>
        index === self.findIndex(t => t.txId === tx.txId)
      );
      
      logger.info(`✅ Total signatures: ${uniqueTransactions.length} (Blockchain CouchDB: ${blockchainResult.transactions.length}, PostgreSQL: ${postgresSignatures.length})`);
      
      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          currentState: blockchainResult.currentState,
          transactions: uniqueTransactions,
          summary: {
            total: uniqueTransactions.length,
            verified: uniqueTransactions.filter(t => t.validationCode === 'VALID').length,
            organizations: [...new Set(uniqueTransactions.map(t => t.creator.mspId))],
            latestTx: uniqueTransactions[uniqueTransactions.length - 1] || null
          },
          sources: {
            blockchainCouchDB: blockchainResult.transactions.length,
            postgresSQL: postgresSignatures.length,
            total: uniqueTransactions.length
          }
        },
        source: 'BOTH_DATABASES',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error querying blockchain:', error);
      res.status(500).json({
        success: false,
        error: { code: 'BLOCKCHAIN_QUERY_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v1/blockchain-signatures/transactions/:entityType/:entityId
 * Get transaction history for an entity from blockchain
 */
router.get('/transactions/:entityType/:entityId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      
      const transactions = await signatureService.getEntityTransactions(entityType, entityId);
      
      res.json({
        success: true,
        data: transactions,
        source: 'HYPERLEDGER_FABRIC_BLOCKCHAIN',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error querying blockchain transactions:', error);
      res.status(500).json({
        success: false,
        error: { code: 'BLOCKCHAIN_QUERY_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;

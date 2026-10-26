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

const isCryptographicallyVerified = (transaction: any): boolean =>
  transaction?.validationCode === 'VALID' &&
  transaction.creator?.signatureValid === true &&
  transaction.creator?.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT' &&
  transaction.endorsers?.length > 0 &&
  transaction.endorsers.every((endorser: any) =>
    endorser.signatureValid === true &&
    endorser.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT'
  );

/**
 * GET /api/v1/blockchain-signatures/entity/:entityType/:entityId
 * Get blockchain transaction signatures by querying Fabric ledger directly
 * Authenticated endpoint - transaction arguments may contain regulated business data
 */
router.get('/entity/:entityType/:entityId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      
      logger.info(`🔗 Fetching ledger transactions and application signature metadata: ${entityType}/${entityId}`);
      
      // STEP 1: Query the chaincode's committed audit/history state, then resolve
      // every transaction ID against QSCC for block validation and signatures.
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
      
      // STEP 3: Group PostgreSQL signatures by transaction and aggregate endorsers
      // Group by transaction ID
      const txGroups = new Map<string, any[]>();
      postgresSignatures
        .filter(sig => typeof sig.blockchain_tx_id === 'string' && sig.blockchain_tx_id.length > 0)
        .forEach(sig => {
          if (!txGroups.has(sig.blockchain_tx_id)) {
            txGroups.set(sig.blockchain_tx_id, []);
          }
          txGroups.get(sig.blockchain_tx_id)!.push(sig);
        });
      
      // Convert grouped signatures to transaction format with all endorsers
      const pgFormattedSignatures = await Promise.all(Array.from(txGroups.entries()).map(async ([txId, sigs]) => {
        const firstSig = sigs[0];
        const ledgerTransaction = await signatureService.getTransactionDetails(txId).catch(() => null);
        const signerLabel = firstSig.signer_username || 'Application signer';
        return {
          txId: txId,
          timestamp: ledgerTransaction?.timestamp || firstSig.blockchain_timestamp || firstSig.created_at,
          creator: ledgerTransaction?.creator || { mspId: 'UNVERIFIED', identity: 'Not read from Fabric transaction envelope', certificateSubject: null },
          chaincodeName: ledgerTransaction?.chaincodeName || null,
          chaincodeFunction: ledgerTransaction?.chaincodeFunction || null,
          args: ledgerTransaction?.args || [],
          endorsers: ledgerTransaction?.endorsers || [],
          endorsementNote: ledgerTransaction
            ? 'Transaction fields were read from the Fabric ledger. The signer label below comes from the application record.'
            : 'Application signature record only; this transaction ID was not confirmed on the Fabric ledger.',
          validationCode: ledgerTransaction?.validationStatus || 'UNVERIFIED',
          cryptographicallyVerified: isCryptographicallyVerified({
            validationCode: ledgerTransaction?.validationStatus,
            creator: ledgerTransaction?.creator,
            endorsers: ledgerTransaction?.endorsers,
          }),
          blockNumber: ledgerTransaction?.blockNumber ?? null,
          blockHash: ledgerTransaction?.blockHash || null,
          source: ledgerTransaction ? 'FABRIC_AND_POSTGRESQL' : 'POSTGRESQL',
          signerInfo: {
            name: signerLabel,
            username: signerLabel,
            email: firstSig.signer_email || '',
            organization: firstSig.signer_org,
            mspId: null
          }
        };
      }));
      
      // STEP 4: Combine both sources, enhance with certificate details, extract REAL endorsers
      const allTransactions = await Promise.all(
        blockchainResult.transactions.map(async (t: any) => {
          const identity = t.creator?.identity || 'Unknown identity';
          const username = identity.split('CN=')[1]?.split(',')[0] || 'Unknown';
          
          return {
            ...t,
            source: 'BLOCKCHAIN',
            cryptographicallyVerified: isCryptographicallyVerified(t),
            signerInfo: {
              name: identity,
              username: username,
              email: '',
              organization: t.creator.mspId,
              mspId: t.creator.mspId
            },
            endorsers: t.endorsers || [],
            endorsementNote: t.endorsementNote || 'The ledger history does not expose peer endorsement identities.'
          };
        })
      );
      
      const allTransactionsFlat = [
        ...allTransactions,
        ...pgFormattedSignatures
      ];
      
      // Deduplicate by txId. Do not discard a real ledger transaction based on
      // a hard-coded MSP allowlist; the decoded creator is the ledger identity.
      const uniqueTransactions = allTransactionsFlat
        .filter((tx, index, self) => index === self.findIndex(t => t.txId === tx.txId));
      
      logger.info(`✅ Total records: ${uniqueTransactions.length} (Fabric ledger: ${blockchainResult.transactions.length}, PostgreSQL metadata: ${postgresSignatures.length})`);
      
      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          currentState: blockchainResult.currentState,
          transactions: uniqueTransactions,
          summary: {
            total: uniqueTransactions.length,
            verified: uniqueTransactions.filter((transaction) => transaction.cryptographicallyVerified === true).length,
            organizations: [...new Set(uniqueTransactions.map(t => t.creator.mspId))],
            latestTx: uniqueTransactions[uniqueTransactions.length - 1] || null
          },
          sources: {
            fabricLedger: blockchainResult.transactions.length,
            applicationMetadata: postgresSignatures.length,
            total: uniqueTransactions.length
          }
        },
        source: 'FABRIC_LEDGER_WITH_APPLICATION_SIGNATURE_METADATA',
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

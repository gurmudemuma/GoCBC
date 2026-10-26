import path from 'path';
import { CertificateManager } from '../utils/certificateManager';
import { calculateDocumentHash } from '../utils/fileUtils';
import { DigitalSignatureService } from './digitalSignatureService';
import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';

export interface DocumentSigningOptions {
  filePath: string;
  signerUsername: string;
  signerEmail?: string;
  organization: string;
  reason: string;
  documentId: string;
  documentType: string;
  positionIndex?: number;
  isPDF?: boolean;
}

/** Sign the current file bytes in a detached proof without changing the file. */
export async function signDocumentFile(options: DocumentSigningOptions): Promise<{
  documentHash: string;
  visualSignatureAdded: boolean;
  detachedSignatureCreated: boolean;
}> {
  const certificate = await CertificateManager.getUserCertificate(options.signerUsername, options.organization);
  const documentHash = calculateDocumentHash(options.filePath);
  const ledgerResult = await FabricService.getInstance().queryChaincode(
    'ReadDocumentHash',
    [options.documentId],
    options.organization,
  );
  const ledgerHash = ledgerResult.data?.hash || ledgerResult.data?.Hash;
  if (!ledgerResult.success || typeof ledgerHash !== 'string' || ledgerHash.toLowerCase() !== documentHash.toLowerCase()) {
    // Do not create a detached proof for bytes that are not the current
    // document revision committed on the channel.
    return {
      documentHash,
      visualSignatureAdded: false,
      detachedSignatureCreated: false,
    };
  }

  const signatureInfo = {
    signerName: options.signerUsername,
    signerEmail: options.signerEmail || '',
    organization: options.organization,
    reason: options.reason,
    location: 'Ethiopian Coffee Export Consortium',
    contactInfo: options.signerEmail || '',
    timestamp: new Date(),
    documentId: options.documentId,
    documentType: options.documentType || path.extname(options.filePath).slice(1).toUpperCase() || 'DOCUMENT',
  };
  await DigitalSignatureService.signFileDetached(options.filePath, certificate, signatureInfo);

  return {
    documentHash,
    visualSignatureAdded: false,
    detachedSignatureCreated: true,
  };
}

/** Persist committed transaction proof fields alongside an application signature row. */
export async function persistDocumentLedgerProof(
  database: DatabaseService,
  signatureId: string,
  documentId: string,
  documentHash: string,
  detachedSignatureCreated: boolean,
  txId: string
): Promise<void> {
  const transaction = await FabricService.getInstance().getTransactionDetails(txId);
  await database.run(
    `UPDATE document_signatures
     SET blockchain_tx_id = $1,
         detached_signature_created = $2,
         document_hash_signed = $3,
         ledger_validation_code = $4,
         ledger_validation_status = $5,
         ledger_block_number = $6,
         ledger_block_hash = $7,
         ledger_creator_msp_id = $8,
         ledger_creator_identity = $9,
         endorsing_msp_ids = $10::jsonb,
         creator_signature_valid = $11,
         endorsement_signatures_valid = $12
     WHERE signature_id = $13 AND document_id = $14`,
    [
      txId,
      detachedSignatureCreated,
      documentHash,
      transaction?.validationCode ?? null,
      transaction?.validationStatus ?? 'UNAVAILABLE',
      transaction?.blockNumber ?? null,
      transaction?.blockHash ?? null,
      transaction?.creator.mspId ?? null,
      transaction?.creator.identity ?? null,
      JSON.stringify(transaction?.endorsers.map((endorser) => endorser.mspId) || []),
      transaction?.creator.signatureValid ?? null,
      transaction ? transaction.endorsers.every((endorser) => endorser.signatureValid === true) : null,
      signatureId,
      documentId,
    ]
  );
}

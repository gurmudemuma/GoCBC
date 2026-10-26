-- Keep document file proofs separate from the actual Fabric transaction proof.
-- crypto_signature_embedded describes PDF embedded signatures only; the service
-- currently records detached signatures alongside the file.

-- Create document_signatures table if it doesn't exist (should have been created earlier)
CREATE TABLE IF NOT EXISTS document_signatures (
    id SERIAL PRIMARY KEY,
    signature_id VARCHAR(255) UNIQUE NOT NULL,
    document_id VARCHAR(255) NOT NULL,
    signer_id VARCHAR(255),
    signer_org VARCHAR(100),
    signature_type VARCHAR(50),
    certificate_id VARCHAR(255),
    remarks TEXT,
    blockchain_tx_id VARCHAR(255),
    visual_signature_added BOOLEAN DEFAULT FALSE,
    crypto_signature_embedded BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_doc_sig_document_id ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_blockchain_tx ON document_signatures(blockchain_tx_id);

-- Now add the ledger proof columns
ALTER TABLE document_signatures
  ADD COLUMN IF NOT EXISTS detached_signature_created BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS document_hash_signed TEXT,
  ADD COLUMN IF NOT EXISTS ledger_validation_code INTEGER,
  ADD COLUMN IF NOT EXISTS ledger_validation_status TEXT,
  ADD COLUMN IF NOT EXISTS ledger_block_number BIGINT,
  ADD COLUMN IF NOT EXISTS ledger_block_hash TEXT,
  ADD COLUMN IF NOT EXISTS ledger_creator_msp_id TEXT,
  ADD COLUMN IF NOT EXISTS ledger_creator_identity TEXT,
  ADD COLUMN IF NOT EXISTS endorsing_msp_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS creator_signature_valid BOOLEAN,
  ADD COLUMN IF NOT EXISTS endorsement_signatures_valid BOOLEAN;

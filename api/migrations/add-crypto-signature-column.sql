-- Migration: Add crypto_signature_embedded column to document_signatures table
-- Date: 2026-10-17
-- Purpose: Track whether cryptographic signatures are permanently embedded in PDFs

-- Add new column to track cryptographic signature embedding
ALTER TABLE document_signatures 
ADD COLUMN IF NOT EXISTS crypto_signature_embedded BOOLEAN DEFAULT FALSE;

-- Add comment explaining the column
COMMENT ON COLUMN document_signatures.crypto_signature_embedded IS 
  'Indicates whether a cryptographic signature with X.509 certificate was permanently embedded in the PDF file. 
   True = signature is permanently in the PDF and verifiable. 
   False = signature only recorded in blockchain/database (legacy).';

-- Update existing records to set crypto_signature_embedded based on visual_signature_added
-- (Assume that if visual signature was added, it might need crypto upgrade)
UPDATE document_signatures 
SET crypto_signature_embedded = FALSE 
WHERE crypto_signature_embedded IS NULL;

-- Create index for quick queries on crypto-signed documents
CREATE INDEX IF NOT EXISTS idx_document_signatures_crypto_embedded 
ON document_signatures(crypto_signature_embedded);

-- Create index for finding documents with complete signature chains
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_crypto 
ON document_signatures(document_id, crypto_signature_embedded);

-- View: Documents with full cryptographic signatures
CREATE OR REPLACE VIEW v_crypto_signed_documents AS
SELECT 
  d.document_id,
  d.document_type,
  d.file_name,
  d.entity_type,
  d.entity_id,
  d.status,
  COUNT(ds.signature_id) as total_signatures,
  COUNT(CASE WHEN ds.crypto_signature_embedded = TRUE THEN 1 END) as crypto_signatures,
  BOOL_AND(ds.crypto_signature_embedded) as all_signatures_cryptographic,
  MAX(ds.signed_at) as last_signed_at,
  STRING_AGG(DISTINCT ds.signer_org, ', ' ORDER BY ds.signer_org) as signing_organizations
FROM documents d
LEFT JOIN document_signatures ds ON d.document_id = ds.document_id
GROUP BY d.document_id, d.document_type, d.file_name, d.entity_type, d.entity_id, d.status;

COMMENT ON VIEW v_crypto_signed_documents IS 
  'View showing documents with signature status: total signatures, cryptographic signatures, and whether all are cryptographic.';

-- Grant permissions (adjust as needed for your user setup)
GRANT SELECT ON v_crypto_signed_documents TO PUBLIC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: crypto_signature_embedded column added';
  RAISE NOTICE '   - Column added to document_signatures table';
  RAISE NOTICE '   - Indexes created for performance';
  RAISE NOTICE '   - View v_crypto_signed_documents created';
  RAISE NOTICE '   - All existing signatures marked as non-cryptographic (upgradeable)';
END $$;

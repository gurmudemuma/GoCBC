-- Keep bank LC rejection feedback available to PostgreSQL fallback queries.
-- The Fabric ledger remains authoritative for the LC status and signer.
ALTER TABLE letters_of_credit
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rejected_by_msp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS document_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS document_rejected_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS document_rejected_by_msp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS document_rejection_date TIMESTAMP;

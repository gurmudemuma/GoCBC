-- Repair LC rejection metadata if an earlier deployment marked migration 036
-- complete before all columns were created. This migration is safe to re-run.
ALTER TABLE letters_of_credit
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rejected_by_msp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS document_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS document_rejected_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS document_rejected_by_msp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS document_rejection_date TIMESTAMP;

-- Preserve ECTA rejection feedback on sales contracts so exporters can see
-- why a rejected registration needs correction.
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supersedes_contract_id VARCHAR(100);

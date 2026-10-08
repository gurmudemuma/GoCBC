-- Migration: Add actor tracking fields to letters_of_credit table
-- These fields track WHO performed key actions (request, approve, issue)

ALTER TABLE letters_of_credit
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(500),
ADD COLUMN IF NOT EXISTS approved_by_msp VARCHAR(100),
ADD COLUMN IF NOT EXISTS issued_by VARCHAR(500),
ADD COLUMN IF NOT EXISTS issued_by_msp VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_updated_by VARCHAR(500),
ADD COLUMN IF NOT EXISTS last_updated_by_msp VARCHAR(100);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lc_approved_by_msp ON letters_of_credit(approved_by_msp);
CREATE INDEX IF NOT EXISTS idx_lc_issued_by_msp ON letters_of_credit(issued_by_msp);

-- Add comments for documentation
COMMENT ON COLUMN letters_of_credit.approved_by IS 'X.509 certificate of user who approved the LC';
COMMENT ON COLUMN letters_of_credit.approved_by_msp IS 'MSP ID of organization that approved the LC (e.g., BanksMSP)';
COMMENT ON COLUMN letters_of_credit.issued_by IS 'X.509 certificate of user who issued the LC';
COMMENT ON COLUMN letters_of_credit.issued_by_msp IS 'MSP ID of organization that issued the LC';
COMMENT ON COLUMN letters_of_credit.last_updated_by IS 'X.509 certificate of last user to update the LC';
COMMENT ON COLUMN letters_of_credit.last_updated_by_msp IS 'MSP ID of last organization to update the LC';

-- Complete the Fabric CA identity registry for installations that applied
-- 034 before its audit and certificate-attribute fields were added.
-- Keep this forward-only: existing migration records must remain immutable.
ALTER TABLE blockchain_identities
  ADD COLUMN IF NOT EXISTS certified_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS certified_organization VARCHAR(100),
  ADD COLUMN IF NOT EXISTS revocation_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS crl_generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS crl_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_blockchain_identities_msp_status
  ON blockchain_identities(msp_id, status);
CREATE INDEX IF NOT EXISTS idx_blockchain_identities_expiration
  ON blockchain_identities(expires_at) WHERE status = 'active';

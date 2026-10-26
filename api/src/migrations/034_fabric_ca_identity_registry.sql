-- Persist public Fabric CA identity metadata. Private keys remain only in the
-- protected Fabric wallet and are never stored in PostgreSQL.
CREATE TABLE IF NOT EXISTS blockchain_identities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  msp_id VARCHAR(50) NOT NULL,
  public_key TEXT NOT NULL,
  certificate TEXT NOT NULL,
  certificate_hash VARCHAR(64) NOT NULL,
  enrollment_id VARCHAR(200) NOT NULL UNIQUE,
  certified_role VARCHAR(50),
  certified_organization VARCHAR(100),
  revocation_status VARCHAR(40),
  crl_generated_at TIMESTAMP,
  crl_hash VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
  revocation_reason TEXT,
  last_used_at TIMESTAMP
);

ALTER TABLE blockchain_identities
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS certified_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS certified_organization VARCHAR(100),
  ADD COLUMN IF NOT EXISTS revocation_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS crl_generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS crl_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_blockchain_identities_msp_status
  ON blockchain_identities(msp_id, status);
CREATE INDEX IF NOT EXISTS idx_blockchain_identities_expiration
  ON blockchain_identities(expires_at) WHERE status = 'active';

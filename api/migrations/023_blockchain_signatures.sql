-- Blockchain Signatures Table
-- Stores cryptographic signature records for blockchain transactions
-- Different from document_signatures (which are for document signing workflow)
-- These signatures prove blockchain participation and authorization

CREATE TABLE IF NOT EXISTS blockchain_signatures (
  id SERIAL PRIMARY KEY,
  signature_id VARCHAR(100) UNIQUE NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- CONTRACT, LETTER_OF_CREDIT, SHIPMENT, FOREX_ALLOCATION, PAYMENT, CUSTOMS_DECLARATION
  entity_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, APPROVE, VERIFY, ALLOCATE, etc.
  signer_username VARCHAR(100) NOT NULL,
  signer_org VARCHAR(100) NOT NULL,
  signer_role VARCHAR(50),
  certificate_dn TEXT, -- X.509 certificate Distinguished Name
  certificate_fingerprint VARCHAR(255), -- Certificate SHA-256 fingerprint
  blockchain_tx_id VARCHAR(255), -- Fabric transaction ID
  blockchain_timestamp TIMESTAMP,
  chaincode_name VARCHAR(100),
  chaincode_function VARCHAR(100),
  transaction_args TEXT, -- JSON array of chaincode arguments
  endorsing_peers TEXT, -- JSON array of peer names that endorsed
  metadata JSONB, -- Additional context (amounts, rates, remarks, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_blockchain_sigs_entity (entity_type, entity_id),
  INDEX idx_blockchain_sigs_tx (blockchain_tx_id),
  INDEX idx_blockchain_sigs_signer (signer_username)
);

-- Migration audit
INSERT INTO schema_migrations (version, description) 
VALUES (23, 'Create blockchain_signatures table for entity-level blockchain proof')
ON CONFLICT (version) DO NOTHING;

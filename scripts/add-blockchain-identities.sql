-- Add Blockchain Identities Table for Cryptographic User Management
-- This table stores cryptographic credentials and certificates for blockchain access

CREATE TABLE IF NOT EXISTS blockchain_identities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL,
    msp_id VARCHAR(50) NOT NULL,
    public_key TEXT NOT NULL,
    certificate TEXT NOT NULL,
    certificate_hash VARCHAR(64) NOT NULL,
    enrollment_id VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
    revocation_reason TEXT,
    last_used_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for blockchain_identities
CREATE INDEX idx_blockchain_identities_user_id ON blockchain_identities(user_id);
CREATE INDEX idx_blockchain_identities_username ON blockchain_identities(username);
CREATE INDEX idx_blockchain_identities_msp_id ON blockchain_identities(msp_id);
CREATE INDEX idx_blockchain_identities_enrollment_id ON blockchain_identities(enrollment_id);
CREATE INDEX idx_blockchain_identities_certificate_hash ON blockchain_identities(certificate_hash);
CREATE INDEX idx_blockchain_identities_status ON blockchain_identities(status);
CREATE INDEX idx_blockchain_identities_expires_at ON blockchain_identities(expires_at);

-- Table for storing blockchain transaction signatures
CREATE TABLE IF NOT EXISTS transaction_signatures (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    signature TEXT NOT NULL,
    signed_data_hash VARCHAR(64) NOT NULL,
    certificate_hash VARCHAR(64) NOT NULL,
    msp_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT false,
    verification_timestamp TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for transaction_signatures
CREATE INDEX idx_transaction_signatures_transaction_id ON transaction_signatures(transaction_id);
CREATE INDEX idx_transaction_signatures_user_id ON transaction_signatures(user_id);
CREATE INDEX idx_transaction_signatures_timestamp ON transaction_signatures(timestamp DESC);
CREATE INDEX idx_transaction_signatures_verified ON transaction_signatures(verified);
CREATE INDEX idx_transaction_signatures_certificate_hash ON transaction_signatures(certificate_hash);

-- Table for certificate revocation list
CREATE TABLE IF NOT EXISTS certificate_revocation_list (
    id SERIAL PRIMARY KEY,
    certificate_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    revoked_by VARCHAR(100) NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(200) NOT NULL,
    effective_date TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for certificate_revocation_list
CREATE INDEX idx_crl_certificate_hash ON certificate_revocation_list(certificate_hash);
CREATE INDEX idx_crl_user_id ON certificate_revocation_list(user_id);
CREATE INDEX idx_crl_revoked_at ON certificate_revocation_list(revoked_at DESC);
CREATE INDEX idx_crl_effective_date ON certificate_revocation_list(effective_date);

-- Table for MSP (Membership Service Provider) configuration
CREATE TABLE IF NOT EXISTS msp_configuration (
    id SERIAL PRIMARY KEY,
    msp_id VARCHAR(50) NOT NULL UNIQUE,
    organization VARCHAR(100) NOT NULL,
    root_cert TEXT NOT NULL,
    admin_cert TEXT,
    tls_root_cert TEXT,
    ca_endpoint VARCHAR(255),
    config JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for msp_configuration
CREATE INDEX idx_msp_configuration_msp_id ON msp_configuration(msp_id);
CREATE INDEX idx_msp_configuration_organization ON msp_configuration(organization);
CREATE INDEX idx_msp_configuration_active ON msp_configuration(active);

-- Insert default MSP configurations for all organizations
INSERT INTO msp_configuration (msp_id, organization, root_cert, active) VALUES
('ECTAMSP', 'Ethiopian Coffee & Tea Authority', 'ECTA_ROOT_CERT_PLACEHOLDER', true),
('ECXMSP', 'Ethiopian Commodity Exchange', 'ECX_ROOT_CERT_PLACEHOLDER', true),
('NBEMSP', 'National Bank of Ethiopia', 'NBE_ROOT_CERT_PLACEHOLDER', true),
('BanksMSP', 'Commercial Banks', 'BANKS_ROOT_CERT_PLACEHOLDER', true),
('CustomsMSP', 'Ethiopian Customs Commission', 'CUSTOMS_ROOT_CERT_PLACEHOLDER', true),
('ShippingMSP', 'Shipping & Logistics', 'SHIPPING_ROOT_CERT_PLACEHOLDER', true)
ON CONFLICT (msp_id) DO NOTHING;

-- View for identity status monitoring
CREATE OR REPLACE VIEW v_identity_status AS
SELECT 
    bi.id,
    bi.user_id,
    bi.username,
    u.role,
    u.organization,
    bi.msp_id,
    bi.enrollment_id,
    bi.status as identity_status,
    u.status as user_status,
    bi.created_at,
    bi.expires_at,
    bi.revoked_at,
    CASE 
        WHEN bi.expires_at < CURRENT_TIMESTAMP THEN 'expired'
        WHEN bi.expires_at < CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'expiring_soon'
        WHEN bi.status = 'revoked' THEN 'revoked'
        WHEN bi.status = 'suspended' THEN 'suspended'
        ELSE 'valid'
    END as certificate_status,
    EXTRACT(DAY FROM (bi.expires_at - CURRENT_TIMESTAMP)) as days_until_expiry
FROM blockchain_identities bi
JOIN users u ON bi.user_id = u.id
ORDER BY bi.expires_at ASC;

-- View for recent transaction signatures
CREATE OR REPLACE VIEW v_recent_signatures AS
SELECT 
    ts.id,
    ts.transaction_id,
    ts.username,
    u.role,
    u.organization,
    ts.msp_id,
    ts.timestamp,
    ts.verified,
    ts.verification_timestamp,
    bi.status as identity_status
FROM transaction_signatures ts
JOIN users u ON ts.user_id = u.id
LEFT JOIN blockchain_identities bi ON ts.user_id = bi.user_id
ORDER BY ts.timestamp DESC
LIMIT 100;

-- Function to automatically mark expired certificates
CREATE OR REPLACE FUNCTION update_expired_certificates()
RETURNS void AS $$
BEGIN
    UPDATE blockchain_identities
    SET status = 'expired'
    WHERE expires_at < CURRENT_TIMESTAMP
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to check if certificate is revoked
CREATE OR REPLACE FUNCTION is_certificate_revoked(cert_hash VARCHAR(64))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM certificate_revocation_list
        WHERE certificate_hash = cert_hash
        AND effective_date <= CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- END OF BLOCKCHAIN IDENTITIES MIGRATION
-- ============================================================================

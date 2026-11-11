-- Migration 069: Add NBE retention management tables
-- Created: 2026-11-10
-- Purpose: Support retention accounts, penalty calculations, waiver requests, and compliance tracking

-- ============================================================================
-- 1. Retention Accounts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_accounts (
    account_id SERIAL PRIMARY KEY,
    exporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'FOREX_RETENTION',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Retention requirements
    retention_percentage DECIMAL(5, 2) NOT NULL DEFAULT 40.00, -- Percentage of export proceeds to retain
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    minimum_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    
    -- Policy and holds
    holds_policy VARCHAR(50) DEFAULT 'STANDARD', -- STANDARD, STRICT, FLEXIBLE
    hold_until_date DATE, -- Optional hold release date
    
    -- Status and metadata
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    
    -- Audit fields
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Blockchain reference
    blockchain_tx_id VARCHAR(255),
    
    CONSTRAINT valid_account_type CHECK (account_type IN (
        'FOREX_RETENTION',
        'EXPORT_PROCEEDS',
        'REPATRIATION_ACCOUNT'
    )),
    CONSTRAINT valid_retention_percentage CHECK (retention_percentage >= 0 AND retention_percentage <= 100),
    CONSTRAINT positive_balances CHECK (current_balance >= 0 AND minimum_balance >= 0),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED', 'UNDER_REVIEW')),
    CONSTRAINT unique_exporter_account UNIQUE (exporter_id, account_number)
);

CREATE INDEX idx_retention_accounts_exporter ON retention_accounts(exporter_id);
CREATE INDEX idx_retention_accounts_status ON retention_accounts(status);
CREATE INDEX idx_retention_accounts_currency ON retention_accounts(currency);
CREATE INDEX idx_retention_accounts_balance ON retention_accounts(current_balance);

-- ============================================================================
-- 2. Retention Penalties Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_penalties (
    penalty_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES retention_accounts(account_id) ON DELETE CASCADE,
    
    -- Violation details
    violation_type VARCHAR(50) NOT NULL,
    violation_description TEXT,
    
    -- Amount calculation
    required_amount DECIMAL(15, 2) NOT NULL, -- Amount that should have been retained
    actual_amount DECIMAL(15, 2) NOT NULL, -- Amount actually retained
    shortfall_amount DECIMAL(15, 2) NOT NULL, -- Difference (required - actual)
    
    -- Penalty calculation
    penalty_rate DECIMAL(5, 4) NOT NULL, -- Penalty rate (e.g., 0.02 for 2%)
    penalty_amount DECIMAL(15, 2) NOT NULL, -- Calculated penalty
    total_owed DECIMAL(15, 2) NOT NULL, -- Shortfall + penalty
    
    -- Time period
    violation_start_date DATE,
    violation_end_date DATE,
    violation_duration_months INTEGER DEFAULT 1,
    
    -- Payment tracking
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    payment_deadline DATE,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'CALCULATED',
    penalty_description TEXT,
    notes TEXT,
    
    -- Audit fields
    calculated_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Blockchain reference
    blockchain_tx_id VARCHAR(255),
    
    CONSTRAINT valid_violation_type CHECK (violation_type IN (
        'UNDER_RETENTION',
        'LATE_REPATRIATION',
        'UNAUTHORIZED_WITHDRAWAL',
        'POLICY_VIOLATION',
        'MINIMUM_BALANCE_BREACH',
        'REPORTING_FAILURE'
    )),
    CONSTRAINT valid_penalty_status CHECK (status IN (
        'CALCULATED',
        'APPROVED',
        'DISPUTED',
        'PAID',
        'WAIVED',
        'CANCELLED'
    )),
    CONSTRAINT positive_penalty_amounts CHECK (
        required_amount >= 0 AND
        actual_amount >= 0 AND
        shortfall_amount >= 0 AND
        penalty_rate >= 0 AND
        penalty_amount >= 0 AND
        total_owed >= 0 AND
        amount_paid >= 0
    )
);

CREATE INDEX idx_retention_penalties_account ON retention_penalties(account_id);
CREATE INDEX idx_retention_penalties_status ON retention_penalties(status);
CREATE INDEX idx_retention_penalties_violation_type ON retention_penalties(violation_type);
CREATE INDEX idx_retention_penalties_payment_deadline ON retention_penalties(payment_deadline);
CREATE INDEX idx_retention_penalties_created ON retention_penalties(created_at);

-- ============================================================================
-- 3. Retention Waivers Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_waivers (
    waiver_id SERIAL PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,
    
    -- Related entities
    exporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES retention_accounts(account_id) ON DELETE SET NULL,
    penalty_id INTEGER REFERENCES retention_penalties(penalty_id) ON DELETE SET NULL,
    
    -- Waiver request details
    waiver_amount DECIMAL(15, 2), -- Amount of waiver requested (for penalty waivers)
    justification TEXT NOT NULL, -- Reason for waiver request
    supporting_documents JSONB, -- [{type: 'financial_hardship', file: 'doc.pdf'}, ...]
    
    -- Request status
    request_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    
    -- Review details
    reviewed_by INTEGER REFERENCES users(id),
    review_notes TEXT,
    decision_date TIMESTAMP,
    
    -- Approval details
    approved_amount DECIMAL(15, 2), -- May be less than requested
    approval_conditions TEXT, -- Any conditions attached to waiver
    
    -- Audit fields
    requested_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Blockchain reference
    blockchain_tx_id VARCHAR(255),
    
    CONSTRAINT valid_request_type CHECK (request_type IN (
        'PENALTY_WAIVER',
        'RETENTION_REDUCTION',
        'COMPLIANCE_EXTENSION',
        'HARDSHIP_RELIEF',
        'FORCE_MAJEURE'
    )),
    CONSTRAINT valid_request_status CHECK (request_status IN (
        'PENDING',
        'UNDER_REVIEW',
        'APPROVED',
        'PARTIALLY_APPROVED',
        'REJECTED',
        'WITHDRAWN'
    )),
    CONSTRAINT positive_waiver_amounts CHECK (
        (waiver_amount IS NULL OR waiver_amount >= 0) AND
        (approved_amount IS NULL OR approved_amount >= 0)
    )
);

CREATE INDEX idx_retention_waivers_exporter ON retention_waivers(exporter_id);
CREATE INDEX idx_retention_waivers_account ON retention_waivers(account_id);
CREATE INDEX idx_retention_waivers_penalty ON retention_waivers(penalty_id);
CREATE INDEX idx_retention_waivers_status ON retention_waivers(request_status);
CREATE INDEX idx_retention_waivers_type ON retention_waivers(request_type);
CREATE INDEX idx_retention_waivers_created ON retention_waivers(created_at);

-- ============================================================================
-- 4. Retention Transactions Table (optional - for balance tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_transactions (
    transaction_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES retention_accounts(account_id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Balance tracking
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    
    -- References
    reference_type VARCHAR(50), -- 'REPATRIATION', 'PENALTY_PAYMENT', 'ADJUSTMENT', etc.
    reference_id VARCHAR(100), -- ID of related entity
    
    -- Description
    description TEXT,
    notes TEXT,
    
    -- Audit fields
    processed_by INTEGER REFERENCES users(id),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Blockchain reference
    blockchain_tx_id VARCHAR(255),
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
        'DEPOSIT',
        'WITHDRAWAL',
        'REPATRIATION',
        'PENALTY_PAYMENT',
        'INTEREST_CREDIT',
        'FEE_DEBIT',
        'ADJUSTMENT',
        'TRANSFER_IN',
        'TRANSFER_OUT'
    )),
    CONSTRAINT positive_transaction_amount CHECK (amount >= 0),
    CONSTRAINT valid_balances CHECK (balance_before >= 0 AND balance_after >= 0)
);

CREATE INDEX idx_retention_transactions_account ON retention_transactions(account_id);
CREATE INDEX idx_retention_transactions_type ON retention_transactions(transaction_type);
CREATE INDEX idx_retention_transactions_processed ON retention_transactions(processed_at);
CREATE INDEX idx_retention_transactions_reference ON retention_transactions(reference_type, reference_id);

-- ============================================================================
-- 5. Compliance Policies Table (optional - for policy management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_compliance_policies (
    policy_id SERIAL PRIMARY KEY,
    policy_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50) NOT NULL,
    
    -- Policy parameters
    retention_percentage DECIMAL(5, 2) NOT NULL,
    minimum_retention_period_days INTEGER NOT NULL DEFAULT 180, -- 6 months
    grace_period_days INTEGER DEFAULT 30,
    
    -- Product/sector specific
    product_category VARCHAR(100), -- 'COFFEE', 'ALL', etc.
    applies_to_export_value_min DECIMAL(15, 2), -- Minimum export value for policy to apply
    applies_to_export_value_max DECIMAL(15, 2), -- Maximum export value
    
    -- Penalty parameters
    penalty_rate_monthly DECIMAL(5, 4) DEFAULT 0.02, -- 2% per month
    penalty_cap_percentage DECIMAL(5, 2), -- Maximum penalty as % of violation amount
    
    -- Effective dates
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Description
    description TEXT,
    legal_reference TEXT, -- Reference to NBE directive/regulation
    
    -- Audit fields
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_policy_type CHECK (policy_type IN (
        'STANDARD',
        'PREFERENTIAL',
        'SECTOR_SPECIFIC',
        'TEMPORARY',
        'EMERGENCY'
    )),
    CONSTRAINT valid_retention_percentage CHECK (retention_percentage >= 0 AND retention_percentage <= 100),
    CONSTRAINT positive_periods CHECK (
        minimum_retention_period_days >= 0 AND
        (grace_period_days IS NULL OR grace_period_days >= 0)
    )
);

CREATE INDEX idx_retention_policies_active ON retention_compliance_policies(is_active) WHERE is_active = true;
CREATE INDEX idx_retention_policies_effective ON retention_compliance_policies(effective_from, effective_to);
CREATE INDEX idx_retention_policies_product ON retention_compliance_policies(product_category);

-- ============================================================================
-- 6. JSONB Constraints for audit trail prevention
-- ============================================================================

ALTER TABLE retention_waivers
    ADD CONSTRAINT retention_waivers_supporting_documents_valid 
        CHECK (supporting_documents IS NULL OR jsonb_typeof(supporting_documents) IN ('array', 'object'));

-- ============================================================================
-- 7. Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_retention_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_retention_accounts_updated
    BEFORE UPDATE ON retention_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_retention_timestamp();

CREATE TRIGGER trigger_retention_penalties_updated
    BEFORE UPDATE ON retention_penalties
    FOR EACH ROW
    EXECUTE FUNCTION update_retention_timestamp();

CREATE TRIGGER trigger_retention_waivers_updated
    BEFORE UPDATE ON retention_waivers
    FOR EACH ROW
    EXECUTE FUNCTION update_retention_timestamp();

CREATE TRIGGER trigger_retention_policies_updated
    BEFORE UPDATE ON retention_compliance_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_retention_timestamp();

-- ============================================================================
-- 8. Trigger to update retention account balance on transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION update_retention_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the account balance
    UPDATE retention_accounts
    SET current_balance = NEW.balance_after,
        updated_at = CURRENT_TIMESTAMP
    WHERE account_id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_retention_transaction_balance_update
    AFTER INSERT ON retention_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_retention_account_balance();

-- ============================================================================
-- 9. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON retention_accounts TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON retention_penalties TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON retention_waivers TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON retention_transactions TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON retention_compliance_policies TO gocbc_app;

GRANT USAGE, SELECT ON SEQUENCE retention_accounts_account_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE retention_penalties_penalty_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE retention_waivers_waiver_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE retention_transactions_transaction_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE retention_compliance_policies_policy_id_seq TO gocbc_app;

-- ============================================================================
-- 10. Insert default compliance policy (40% retention for coffee exports)
-- ============================================================================

INSERT INTO retention_compliance_policies (
    policy_name,
    policy_type,
    retention_percentage,
    minimum_retention_period_days,
    grace_period_days,
    product_category,
    penalty_rate_monthly,
    effective_from,
    is_active,
    description,
    legal_reference
) VALUES (
    'NBE Standard Coffee Export Retention Policy',
    'STANDARD',
    40.00,
    180,
    30,
    'COFFEE',
    0.02,
    '2024-01-01',
    true,
    'Standard 40% forex retention requirement for coffee exports as per NBE regulations',
    'NBE Directive No. FXD/XX/2024'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration complete
-- ============================================================================

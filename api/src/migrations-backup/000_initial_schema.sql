-- Migration: Initial Database Schema
-- Description: Creates all base tables for CECBS system
-- Date: 2026-10-01
-- Version: 1.0

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    full_name VARCHAR(255),
    exporter_id VARCHAR(50),
    ecta_license VARCHAR(100),
    phone VARCHAR(50),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch VARCHAR(255),
    bank_branch_code VARCHAR(50),
    permissions TEXT,
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EXPORTER APPLICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS exporter_applications (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    tin VARCHAR(50),
    license_number VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_date TIMESTAMP,
    reviewed_by INTEGER,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- QUALITY CONTROL
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_inspections (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(100),
    inspector_id INTEGER,
    inspection_date TIMESTAMP,
    grade VARCHAR(50),
    moisture_content DECIMAL(5,2),
    defect_count INTEGER,
    cup_quality VARCHAR(50),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SHIPMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(100) UNIQUE NOT NULL,
    contract_id VARCHAR(100),
    exporter_id VARCHAR(100),
    buyer_id VARCHAR(100),
    origin VARCHAR(100),
    destination VARCHAR(100),
    quantity DECIMAL(10,2),
    grade VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipment_status_history (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(100),
    status VARCHAR(50),
    changed_by INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(100) UNIQUE NOT NULL,
    shipment_id VARCHAR(100),
    document_type VARCHAR(100),
    document_name VARCHAR(255),
    file_hash VARCHAR(255),
    ipfs_hash VARCHAR(255),
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS document_verifications (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(100),
    verified_by INTEGER,
    verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    notes TEXT
);

-- ============================================================================
-- CONTRACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_id VARCHAR(100) UNIQUE NOT NULL,
    exporter_id VARCHAR(100),
    buyer_id VARCHAR(100),
    quantity DECIMAL(10,2),
    price_per_kg DECIMAL(10,2),
    total_value DECIMAL(15,2),
    payment_terms VARCHAR(255),
    delivery_terms VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LETTERS OF CREDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS letters_of_credit (
    id SERIAL PRIMARY KEY,
    lc_number VARCHAR(100) UNIQUE NOT NULL,
    shipment_id VARCHAR(100),
    issuing_bank VARCHAR(255),
    advising_bank VARCHAR(255),
    beneficiary VARCHAR(255),
    applicant VARCHAR(255),
    amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    lc_number VARCHAR(100),
    shipment_id VARCHAR(100),
    amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    payment_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FOREX ALLOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS forex_allocations (
    id SERIAL PRIMARY KEY,
    allocation_id VARCHAR(100) UNIQUE NOT NULL,
    shipment_id VARCHAR(100),
    lc_number VARCHAR(100),
    amount_usd DECIMAL(15,2),
    exchange_rate DECIMAL(10,4),
    amount_local DECIMAL(15,2),
    allocation_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CUSTOMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customs_declarations (
    id SERIAL PRIMARY KEY,
    declaration_id VARCHAR(100) UNIQUE NOT NULL,
    shipment_id VARCHAR(100),
    declaration_number VARCHAR(100),
    declared_value DECIMAL(15,2),
    duty_amount DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pending',
    submitted_date TIMESTAMP,
    cleared_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customs_clearances (
    id SERIAL PRIMARY KEY,
    clearance_id VARCHAR(100) UNIQUE NOT NULL,
    shipment_id VARCHAR(100),
    declaration_id VARCHAR(100),
    clearance_date TIMESTAMP,
    exit_point VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- WEBHOOKS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    webhook_id VARCHAR(100) UNIQUE NOT NULL,
    url VARCHAR(500) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    secret VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AUDIT & WORKFLOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    action VARCHAR(100),
    user_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    action VARCHAR(100),
    user_id INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    user_id INTEGER,
    changes JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_workflow_state (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    current_state VARCHAR(50),
    required_approvals INTEGER,
    received_approvals INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- POST DELIVERY TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_delivery_tracking (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(100) UNIQUE NOT NULL,
    shipment_id VARCHAR(100),
    arrival_date TIMESTAMP,
    warehouse_location VARCHAR(255),
    quality_recheck_status VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_exporter ON shipments(exporter_id);
CREATE INDEX IF NOT EXISTS idx_shipments_created ON shipments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_shipment ON documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

CREATE INDEX IF NOT EXISTS idx_contracts_exporter ON contracts(exporter_id);
CREATE INDEX IF NOT EXISTS idx_contracts_buyer ON contracts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

CREATE INDEX IF NOT EXISTS idx_lc_shipment ON letters_of_credit(shipment_id);
CREATE INDEX IF NOT EXISTS idx_lc_status ON letters_of_credit(status);

CREATE INDEX IF NOT EXISTS idx_payments_lc ON payments(lc_number);
CREATE INDEX IF NOT EXISTS idx_payments_shipment ON payments(shipment_id);

CREATE INDEX IF NOT EXISTS idx_forex_shipment ON forex_allocations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_forex_lc ON forex_allocations(lc_number);

CREATE INDEX IF NOT EXISTS idx_customs_decl_shipment ON customs_declarations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_customs_clear_shipment ON customs_clearances(shipment_id);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'System users with roles and permissions';
COMMENT ON TABLE shipments IS 'Coffee shipment records';
COMMENT ON TABLE documents IS 'Shipping documents and certificates';
COMMENT ON TABLE contracts IS 'Export contracts between parties';
COMMENT ON TABLE letters_of_credit IS 'LC payment instruments';
COMMENT ON TABLE payments IS 'Payment transactions';
COMMENT ON TABLE forex_allocations IS 'Foreign exchange allocations';
COMMENT ON TABLE customs_declarations IS 'Customs declaration records';
COMMENT ON TABLE customs_clearances IS 'Customs clearance approvals';
COMMENT ON TABLE audit_trail IS 'Complete audit trail of all system changes';

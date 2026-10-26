-- Migration: Create Blockchain Sync Tables
-- Description: Creates tables for CouchDB to PostgreSQL synchronization
-- Date: 2026-10-01
-- Purpose: Enable fast querying of blockchain data through PostgreSQL

-- ============================================================================
-- BLOCKCHAIN SYNC TABLES
-- ============================================================================

-- Blockchain Shipments (synced from CouchDB state database)
CREATE TABLE IF NOT EXISTS blockchain_shipments (
    shipment_id VARCHAR(100) PRIMARY KEY,
    contract_id VARCHAR(100),
    exporter_id VARCHAR(100),
    buyer_id VARCHAR(100),
    origin VARCHAR(100),
    quantity DECIMAL(10,2),
    grade VARCHAR(50),
    ico_number VARCHAR(100),
    ecx_lot_number VARCHAR(100),
    ecx_lots TEXT[],
    documents TEXT[],
    status VARCHAR(50),
    channel VARCHAR(50),
    forex_rate DECIMAL(10,4),
    value_usd DECIMAL(15,2),
    eudr_compliant BOOLEAN,
    packaging_type VARCHAR(50),
    bag_weight DECIMAL(10,2),
    total_bags INTEGER,
    net_weight DECIMAL(10,2),
    gross_weight DECIMAL(10,2),
    insurance_policy VARCHAR(100),
    insurance_company VARCHAR(100),
    insurance_amount DECIMAL(15,2),
    transport_mode VARCHAR(20),
    shipping_line VARCHAR(255),
    bill_of_lading_no VARCHAR(100),
    vessel_name VARCHAR(255),
    container_number VARCHAR(100),
    departure_port VARCHAR(100),
    destination_port VARCHAR(100),
    estimated_arrival TIMESTAMP,
    actual_arrival TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    synced_from VARCHAR(20),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
);

-- Blockchain Documents (synced from CouchDB)
CREATE TABLE IF NOT EXISTS blockchain_documents (
    document_id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(100),
    document_type VARCHAR(50),
    issuer VARCHAR(100),
    status VARCHAR(50),
    ipfs_hash VARCHAR(255),
    file_path TEXT,
    verified BOOLEAN,
    verification_date TIMESTAMP,
    created_at TIMESTAMP,
    synced_from VARCHAR(20),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
);

-- Blockchain Contracts (synced from CouchDB)
CREATE TABLE IF NOT EXISTS blockchain_contracts (
    contract_id VARCHAR(100) PRIMARY KEY,
    exporter_id VARCHAR(100),
    buyer_id VARCHAR(100),
    contract_type VARCHAR(50),
    quantity DECIMAL(10,2),
    price_per_kg DECIMAL(10,2),
    total_value DECIMAL(15,2),
    payment_terms VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP,
    synced_from VARCHAR(20),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
);

-- Blockchain Payments (synced from CouchDB)
CREATE TABLE IF NOT EXISTS blockchain_payments (
    payment_id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(100),
    lc_number VARCHAR(100),
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    status VARCHAR(50),
    payment_date TIMESTAMP,
    bank_reference VARCHAR(100),
    created_at TIMESTAMP,
    synced_from VARCHAR(20),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
);

-- Blockchain Customs Clearances (synced from CouchDB)
CREATE TABLE IF NOT EXISTS blockchain_customs (
    clearance_id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(100),
    declaration_number VARCHAR(100),
    clearance_status VARCHAR(50),
    duty_paid DECIMAL(15,2),
    clearance_date TIMESTAMP,
    exit_point VARCHAR(100),
    created_at TIMESTAMP,
    synced_from VARCHAR(20),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
);

-- Sync Status Tracking Table
CREATE TABLE IF NOT EXISTS sync_status (
    id SERIAL PRIMARY KEY,
    couch_instance VARCHAR(50) NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    last_sync TIMESTAMP,
    last_seq VARCHAR(100),
    documents_synced INTEGER,
    status VARCHAR(50),
    error_message TEXT,
    UNIQUE(couch_instance, database_name)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Blockchain Shipments Indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_status 
    ON blockchain_shipments(status);

CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_exporter 
    ON blockchain_shipments(exporter_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_buyer 
    ON blockchain_shipments(buyer_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_contract 
    ON blockchain_shipments(contract_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_synced_at 
    ON blockchain_shipments(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_synced_from 
    ON blockchain_shipments(synced_from);

-- Blockchain Documents Indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_documents_shipment 
    ON blockchain_documents(shipment_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_documents_type 
    ON blockchain_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_blockchain_documents_status 
    ON blockchain_documents(status);

CREATE INDEX IF NOT EXISTS idx_blockchain_documents_issuer 
    ON blockchain_documents(issuer);

-- Blockchain Contracts Indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_contracts_exporter 
    ON blockchain_contracts(exporter_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_contracts_buyer 
    ON blockchain_contracts(buyer_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_contracts_status 
    ON blockchain_contracts(status);

-- Blockchain Payments Indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_payments_shipment 
    ON blockchain_payments(shipment_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_payments_lc 
    ON blockchain_payments(lc_number);

CREATE INDEX IF NOT EXISTS idx_blockchain_payments_status 
    ON blockchain_payments(status);

-- Blockchain Customs Indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_customs_shipment 
    ON blockchain_customs(shipment_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_customs_declaration 
    ON blockchain_customs(declaration_number);

CREATE INDEX IF NOT EXISTS idx_blockchain_customs_status 
    ON blockchain_customs(clearance_status);

-- Sync Status Indexes
CREATE INDEX IF NOT EXISTS idx_sync_status_last_sync 
    ON sync_status(last_sync DESC);

CREATE INDEX IF NOT EXISTS idx_sync_status_status 
    ON sync_status(status);

CREATE INDEX IF NOT EXISTS idx_sync_status_instance 
    ON sync_status(couch_instance);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE blockchain_shipments IS 
    'Synced copy of shipments from blockchain CouchDB state database for fast querying';

COMMENT ON TABLE blockchain_documents IS 
    'Synced copy of documents from blockchain CouchDB state database';

COMMENT ON TABLE blockchain_contracts IS 
    'Synced copy of contracts from blockchain CouchDB state database';

COMMENT ON TABLE blockchain_payments IS 
    'Synced copy of payments from blockchain CouchDB state database';

COMMENT ON TABLE blockchain_customs IS 
    'Synced copy of customs clearances from blockchain CouchDB state database';

COMMENT ON TABLE sync_status IS 
    'Tracks synchronization status between CouchDB and PostgreSQL';

COMMENT ON COLUMN blockchain_shipments.raw_data IS 
    'Original JSON document from CouchDB for reference';

COMMENT ON COLUMN blockchain_shipments.synced_from IS 
    'Organization that synced this data (ecta, ecx, banks, nbe, customs, shipping)';

COMMENT ON COLUMN sync_status.last_seq IS 
    'CouchDB sequence number for incremental sync (future enhancement)';

-- CECBS PostgreSQL Database Initialization

-- Users and Authentication
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

-- Coffee Lots
CREATE TABLE IF NOT EXISTS coffee_lots (
    id SERIAL PRIMARY KEY,
    lot_number VARCHAR(100) UNIQUE NOT NULL,
    farm_id VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    processing_method VARCHAR(50),
    quantity_kg DECIMAL(10,2) NOT NULL,
    harvest_date DATE,
    quality_grade VARCHAR(20),
    certification VARCHAR(100),
    status VARCHAR(50) DEFAULT 'registered',
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Export Contracts
CREATE TABLE IF NOT EXISTS export_contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    exporter_id VARCHAR(100) NOT NULL,
    buyer_id VARCHAR(100) NOT NULL,
    lot_ids TEXT[], -- Array of lot IDs
    total_quantity_kg DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    total_value_usd DECIMAL(15,2) NOT NULL,
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forex Declarations
CREATE TABLE IF NOT EXISTS forex_declarations (
    id SERIAL PRIMARY KEY,
    declaration_number VARCHAR(100) UNIQUE NOT NULL,
    contract_id INTEGER REFERENCES export_contracts(id),
    amount_usd DECIMAL(15,2) NOT NULL,
    exchange_rate DECIMAL(10,4),
    amount_etb DECIMAL(15,2),
    bank_id VARCHAR(100) NOT NULL,
    nbe_approval_status VARCHAR(50) DEFAULT 'pending',
    nbe_approval_date TIMESTAMP,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customs Declarations
CREATE TABLE IF NOT EXISTS customs_declarations (
    id SERIAL PRIMARY KEY,
    declaration_number VARCHAR(100) UNIQUE NOT NULL,
    contract_id INTEGER REFERENCES export_contracts(id),
    customs_value_usd DECIMAL(15,2) NOT NULL,
    duty_paid DECIMAL(15,2),
    clearance_status VARCHAR(50) DEFAULT 'pending',
    clearance_date TIMESTAMP,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    shipment_number VARCHAR(100) UNIQUE NOT NULL,
    contract_id INTEGER REFERENCES export_contracts(id),
    shipping_line VARCHAR(100) NOT NULL,
    vessel_name VARCHAR(100),
    container_numbers TEXT[],
    port_of_loading VARCHAR(100) DEFAULT 'Djibouti',
    port_of_discharge VARCHAR(100),
    estimated_departure DATE,
    actual_departure DATE,
    estimated_arrival DATE,
    actual_arrival DATE,
    status VARCHAR(50) DEFAULT 'preparing',
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EUDR Compliance
CREATE TABLE IF NOT EXISTS eudr_compliance (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES coffee_lots(id),
    farm_gps_coordinates POINT,
    deforestation_risk_assessment VARCHAR(50),
    due_diligence_statement TEXT,
    compliance_status VARCHAR(50) DEFAULT 'pending',
    verified_by VARCHAR(100),
    verified_at TIMESTAMP,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exporter Applications (Public Registration)
CREATE TABLE IF NOT EXISTS exporter_applications (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(100) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    tin_number VARCHAR(50) NOT NULL,
    business_license_number VARCHAR(100) NOT NULL,
    registration_date DATE,
    capital_requirement VARCHAR(50) NOT NULL,
    professional_taster VARCHAR(100) NOT NULL,
    taster_certificate VARCHAR(100) NOT NULL,
    laboratory_facility VARCHAR(10) DEFAULT 'no',
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    comments TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    exporter_id VARCHAR(100), -- Assigned after approval
    reviewed_by VARCHAR(100)
);

-- Audit Trail
-- Audit Trail Table (Professional Standards)
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    organization VARCHAR(100) NOT NULL,
    performed_by_org VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Professional audit trail requirements
    CONSTRAINT audit_trail_entity_check CHECK (entity_type != '' AND entity_id != ''),
    CONSTRAINT audit_trail_action_check CHECK (action != ''),
    CONSTRAINT audit_trail_performer_check CHECK (performed_by != '')
);

-- Create professional indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performer ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_source ON audit_trail USING gin ((metadata->'source'));
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_created ON audit_trail(entity_type, entity_id, created_at DESC);

-- Create other necessary indexes
CREATE INDEX IF NOT EXISTS idx_coffee_lots_status ON coffee_lots(status);
CREATE INDEX IF NOT EXISTS idx_export_contracts_status ON export_contracts(status);
CREATE INDEX IF NOT EXISTS idx_forex_declarations_status ON forex_declarations(nbe_approval_status);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_status ON customs_declarations(clearance_status);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_exporter_applications_status ON exporter_applications(status);
CREATE INDEX IF NOT EXISTS idx_exporter_applications_email ON exporter_applications(email);

-- Insert default admin user (password: admin123)
-- Note: The password hash below needs to be generated with: bcrypt.hash('admin123', 10)
INSERT INTO users (username, password_hash, email, organization, role, full_name, status) 
VALUES ('admin', '$2a$10$K7K7K7K7K7K7K7K7K7K7K.O7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K', 'admin@cecbs.et', 'Admin', 'ADMIN', 'System Administrator', 'active')
ON CONFLICT (username) DO UPDATE SET organization = 'Admin', role = 'ADMIN';

-- Insert test exporter user (password: password123)
INSERT INTO users (username, password_hash, email, organization, role, full_name, status) 
VALUES ('exporter1', '$2a$10$rKZqYqYqYqYqYqYqYqYqYuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K', 'exporter1@cecbs.et', 'Exporters', 'EXPORTER', 'Test Exporter', 'active')
ON CONFLICT (username) DO NOTHING;

COMMIT;


-- Documents table for document management workflow
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    ipfs_cid VARCHAR(255),
    uploaded_by VARCHAR(255) NOT NULL,
    encrypted BOOLEAN DEFAULT false,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    verification_status VARCHAR(50) DEFAULT 'pending',
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

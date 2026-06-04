-- CECBS PostgreSQL Database Initialization

-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
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
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    organization VARCHAR(100) NOT NULL,
    changes JSONB,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_coffee_lots_status ON coffee_lots(status);
CREATE INDEX idx_export_contracts_status ON export_contracts(status);
CREATE INDEX idx_forex_declarations_status ON forex_declarations(nbe_approval_status);
CREATE INDEX idx_customs_declarations_status ON customs_declarations(clearance_status);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_exporter_applications_status ON exporter_applications(status);
CREATE INDEX idx_exporter_applications_email ON exporter_applications(email);
CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_type, entity_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, email, organization, role) 
VALUES ('admin', '$2a$10$rKZqYqYqYqYqYqYqYqYqYuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K', 'admin@cecbs.et', 'ECTA', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert test exporter user (password: password123)
INSERT INTO users (username, password_hash, email, organization, role) 
VALUES ('exporter1', '$2a$10$rKZqYqYqYqYqYqYqYqYqYuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K', 'exporter1@cecbs.et', 'Exporters', 'exporter')
ON CONFLICT (username) DO NOTHING;

COMMIT;

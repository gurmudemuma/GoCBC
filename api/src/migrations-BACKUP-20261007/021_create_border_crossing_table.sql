-- Create Border Crossing Documentation table
-- Purpose: Track cargo through Ethiopian borders (GALAFI, MOYALE, METEMA)

CREATE TABLE IF NOT EXISTS border_crossings (
    crossing_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50),
    contract_id VARCHAR(50),
    exporter_id VARCHAR(50),
    
    -- Border Post Details
    border_post VARCHAR(100),
    border_country VARCHAR(50),
    crossing_type VARCHAR(30),
    transit_country VARCHAR(50),
    final_destination VARCHAR(100),
    
    -- Exit Documentation
    exit_permit_number VARCHAR(100),
    exit_permit_issued DATE,
    exit_permit_expiry DATE,
    customs_declaration VARCHAR(100),
    
    -- Vehicle/Transport Details
    transport_mode VARCHAR(30),
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(200),
    driver_license VARCHAR(50),
    seal_number VARCHAR(50),
    
    -- Cargo Details
    cargo_weight DECIMAL(12, 2),
    number_of_bags INTEGER,
    container_numbers JSONB DEFAULT '[]'::jsonb,
    
    -- Crossing Timeline
    status VARCHAR(30) DEFAULT 'PENDING',
    departure_date DATE,
    crossing_date DATE,
    arrival_date DATE,
    transit_duration INTEGER,
    
    -- Ethiopian Customs Clearance
    ethiopian_customs_officer VARCHAR(200),
    ethiopian_clearance_date TIMESTAMP,
    ethiopian_clearance_ref VARCHAR(100),
    
    -- Border Country Clearance
    border_customs_officer VARCHAR(200),
    border_clearance_date TIMESTAMP,
    border_clearance_ref VARCHAR(100),
    border_stamp_url TEXT,
    
    -- Transit Monitoring
    last_known_location VARCHAR(200),
    last_location_update TIMESTAMP,
    tracking_number VARCHAR(100),
    checkpoints_passed JSONB DEFAULT '[]'::jsonb,
    
    -- Issues & Delays
    delay_reported BOOLEAN DEFAULT FALSE,
    delay_reason TEXT,
    delay_duration INTEGER,
    issues_encountered JSONB DEFAULT '[]'::jsonb,
    
    -- Verification & Compliance
    verified_by TEXT,
    verified_by_msp VARCHAR(50),
    verification_date TIMESTAMP,
    compliance_status VARCHAR(30),
    compliance_notes TEXT,
    
    -- Audit Trail
    recorded_by TEXT,
    recorded_by_msp VARCHAR(50),
    last_updated_by TEXT,
    last_updated_by_msp VARCHAR(50),
    comments TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crossing_shipment ON border_crossings(shipment_id);
CREATE INDEX IF NOT EXISTS idx_crossing_contract ON border_crossings(contract_id);
CREATE INDEX IF NOT EXISTS idx_crossing_exporter ON border_crossings(exporter_id);
CREATE INDEX IF NOT EXISTS idx_crossing_status ON border_crossings(status);
CREATE INDEX IF NOT EXISTS idx_crossing_border_post ON border_crossings(border_post);
CREATE INDEX IF NOT EXISTS idx_crossing_departure ON border_crossings(departure_date);
CREATE INDEX IF NOT EXISTS idx_crossing_arrival ON border_crossings(arrival_date);
CREATE INDEX IF NOT EXISTS idx_crossing_compliance ON border_crossings(compliance_status);

-- Add foreign key constraints (if tables exist)
ALTER TABLE border_crossings
    ADD CONSTRAINT fk_crossing_exporter 
    FOREIGN KEY (exporter_id) REFERENCES exporters(exporter_id) ON DELETE SET NULL;

-- Comments for documentation
COMMENT ON TABLE border_crossings IS 'Border crossing documentation for Ethiopian coffee exports';
COMMENT ON COLUMN border_crossings.border_post IS 'Ethiopian border posts: GALAFI (Djibouti), MOYALE (Kenya), METEMA (Sudan)';
COMMENT ON COLUMN border_crossings.crossing_type IS 'SEA_PORT, LAND, or AIR';
COMMENT ON COLUMN border_crossings.transit_duration IS 'Days in transit from departure to arrival';
COMMENT ON COLUMN border_crossings.seal_number IS 'Customs seal number (must be intact)';
COMMENT ON COLUMN border_crossings.checkpoints_passed IS 'Array of checkpoint names during transit';

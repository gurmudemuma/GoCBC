-- Shipment Tracking Enhancement Tables

-- Shipment Status History
CREATE TABLE IF NOT EXISTS shipment_status_history (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    updated_by VARCHAR(50) NOT NULL,
    update_date TIMESTAMP DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shipment Locations (GPS tracking)
CREATE TABLE IF NOT EXISTS shipment_locations (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(255),
    recorded_at TIMESTAMP NOT NULL,
    vessel_name VARCHAR(100),
    container_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_status_history_shipment ON shipment_status_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON shipment_status_history(update_date);
CREATE INDEX IF NOT EXISTS idx_locations_shipment ON shipment_locations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_locations_recorded ON shipment_locations(recorded_at);

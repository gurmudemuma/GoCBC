-- Shipment Tracking Enhancement Tables

-- Enhance Shipment Status History table (already exists from base schema)
ALTER TABLE shipment_status_history
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS update_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Shipment Locations (GPS tracking) - new table
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

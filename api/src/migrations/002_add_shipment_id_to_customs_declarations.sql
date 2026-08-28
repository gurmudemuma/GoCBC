-- Add shipment_id column to customs_declarations table
ALTER TABLE customs_declarations 
ADD COLUMN IF NOT EXISTS shipment_id VARCHAR(100);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customs_declarations_shipment_id 
ON customs_declarations(shipment_id);

-- Fix sync_status table by adding UNIQUE constraint
-- This allows ON CONFLICT clause to work properly

-- Drop the existing table
DROP TABLE IF EXISTS sync_status;

-- Recreate with UNIQUE constraint
CREATE TABLE sync_status (
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

-- Create index for faster lookups
CREATE INDEX idx_sync_status_last_sync ON sync_status(last_sync DESC);
CREATE INDEX idx_sync_status_status ON sync_status(status);

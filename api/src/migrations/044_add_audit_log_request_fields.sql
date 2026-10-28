-- Migration: Add ip_address and user_agent columns to audit_log table
-- These fields are needed to track the source of audit events

ALTER TABLE audit_log 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update existing records to have NULL for these fields (they're optional)
-- New records will populate these fields automatically

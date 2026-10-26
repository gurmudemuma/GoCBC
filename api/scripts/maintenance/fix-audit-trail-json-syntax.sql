-- Fix Audit Trail JSONB columns
-- Change old_value and new_value from JSONB to TEXT to accommodate plain status strings
-- used throughout the application.

DO $$
BEGIN
    -- 1. Alter audit_trail columns to TEXT
    -- We use USING clause to safely convert existing JSONB data to TEXT
    ALTER TABLE audit_trail ALTER COLUMN old_value TYPE TEXT USING old_value::TEXT;
    ALTER TABLE audit_trail ALTER COLUMN new_value TYPE TEXT USING new_value::TEXT;
    
    RAISE NOTICE 'Changed audit_trail old_value and new_value to TEXT';
END$$;

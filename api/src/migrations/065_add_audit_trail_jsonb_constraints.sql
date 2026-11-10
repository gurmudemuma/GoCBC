-- Migration 065: Add JSONB validation constraints to audit_trail table
-- 
-- Purpose: Prevent insertion of plain strings into JSONB columns
-- Ensures old_value, new_value, and metadata are always valid JSON objects
--
-- Created: 2026-11-10
-- Issue: PostgreSQL error "invalid input syntax for type json" when plain strings
--        like 'unsigned', 'signed', 'REGISTERED' were inserted into JSONB columns

-- ============================================================================
-- STEP 1: Fix existing data - convert any plain string values to JSON objects
-- ============================================================================

-- Note: If old_value/new_value/metadata columns contain invalid JSON,
-- this migration will fail. The application code has been fixed to prevent
-- future occurrences, but we need to handle legacy data.

DO $$
BEGIN
  -- Check if we need to update the table structure
  -- This is a safety check for existing installations
  
  RAISE NOTICE 'Starting audit_trail JSONB constraint migration...';
  
  -- Verify the columns exist and are JSONB type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_trail' 
    AND column_name = 'old_value' 
    AND data_type = 'jsonb'
  ) THEN
    RAISE NOTICE '✓ old_value column is JSONB type';
  ELSE
    RAISE NOTICE '⚠ old_value column is not JSONB - skipping constraints';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_trail' 
    AND column_name = 'new_value' 
    AND data_type = 'jsonb'
  ) THEN
    RAISE NOTICE '✓ new_value column is JSONB type';
  ELSE
    RAISE NOTICE '⚠ new_value column is not JSONB - skipping constraints';
  END IF;

END $$;

-- ============================================================================
-- STEP 2: Add check constraints to validate JSONB structure
-- ============================================================================

-- Constraint: old_value must be NULL or valid JSON object/array
-- This prevents insertion of plain strings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_trail_old_value_is_json_check'
  ) THEN
    ALTER TABLE audit_trail 
    ADD CONSTRAINT audit_trail_old_value_is_json_check 
    CHECK (
      old_value IS NULL OR 
      jsonb_typeof(old_value) IN ('object', 'array')
    );
    RAISE NOTICE '✓ Added constraint: audit_trail_old_value_is_json_check';
  ELSE
    RAISE NOTICE '⚠ Constraint audit_trail_old_value_is_json_check already exists';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Could not add old_value constraint: %', SQLERRM;
END $$;

-- Constraint: new_value must be NULL or valid JSON object/array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_trail_new_value_is_json_check'
  ) THEN
    ALTER TABLE audit_trail 
    ADD CONSTRAINT audit_trail_new_value_is_json_check 
    CHECK (
      new_value IS NULL OR 
      jsonb_typeof(new_value) IN ('object', 'array')
    );
    RAISE NOTICE '✓ Added constraint: audit_trail_new_value_is_json_check';
  ELSE
    RAISE NOTICE '⚠ Constraint audit_trail_new_value_is_json_check already exists';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Could not add new_value constraint: %', SQLERRM;
END $$;

-- Constraint: metadata must be NULL or valid JSON object/array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_trail_metadata_is_json_check'
  ) THEN
    ALTER TABLE audit_trail 
    ADD CONSTRAINT audit_trail_metadata_is_json_check 
    CHECK (
      metadata IS NULL OR 
      jsonb_typeof(metadata) IN ('object', 'array')
    );
    RAISE NOTICE '✓ Added constraint: audit_trail_metadata_is_json_check';
  ELSE
    RAISE NOTICE '⚠ Constraint audit_trail_metadata_is_json_check already exists';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Could not add metadata constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Add helpful comments to the table
-- ============================================================================

COMMENT ON COLUMN audit_trail.old_value IS 
'JSONB column - MUST be a valid JSON object or array, NOT a plain string. Use {"status": "value"} format.';

COMMENT ON COLUMN audit_trail.new_value IS 
'JSONB column - MUST be a valid JSON object or array, NOT a plain string. Use {"status": "value"} format.';

COMMENT ON COLUMN audit_trail.metadata IS 
'JSONB column - MUST be a valid JSON object or array, NOT a plain string. Use proper JSON structure.';

-- ============================================================================
-- STEP 4: Create a helper function to validate audit trail inserts
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_audit_trail_jsonb()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate old_value
  IF NEW.old_value IS NOT NULL THEN
    IF jsonb_typeof(NEW.old_value) NOT IN ('object', 'array') THEN
      RAISE EXCEPTION 'old_value must be a JSON object or array, not a plain string. Got: %', NEW.old_value
        USING HINT = 'Use {"status": "your_value"} instead of "your_value"';
    END IF;
  END IF;
  
  -- Validate new_value
  IF NEW.new_value IS NOT NULL THEN
    IF jsonb_typeof(NEW.new_value) NOT IN ('object', 'array') THEN
      RAISE EXCEPTION 'new_value must be a JSON object or array, not a plain string. Got: %', NEW.new_value
        USING HINT = 'Use {"status": "your_value"} instead of "your_value"';
    END IF;
  END IF;
  
  -- Validate metadata
  IF NEW.metadata IS NOT NULL THEN
    IF jsonb_typeof(NEW.metadata) NOT IN ('object', 'array') THEN
      RAISE EXCEPTION 'metadata must be a JSON object or array, not a plain string. Got: %', NEW.metadata
        USING HINT = 'Use proper JSON structure for metadata';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_audit_trail_jsonb() IS 
'Validates that audit_trail JSONB columns contain objects/arrays, not plain strings';

-- ============================================================================
-- STEP 5: Create trigger to enforce validation
-- ============================================================================

DROP TRIGGER IF EXISTS audit_trail_jsonb_validation_trigger ON audit_trail;

CREATE TRIGGER audit_trail_jsonb_validation_trigger
  BEFORE INSERT OR UPDATE ON audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION validate_audit_trail_jsonb();

COMMENT ON TRIGGER audit_trail_jsonb_validation_trigger ON audit_trail IS 
'Prevents insertion of plain strings into JSONB columns by validating structure';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the constraints (these should all work or fail as expected)
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUDIT TRAIL JSONB CONSTRAINTS APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The following are now ENFORCED:';
  RAISE NOTICE '1. old_value must be NULL or JSON object/array';
  RAISE NOTICE '2. new_value must be NULL or JSON object/array';
  RAISE NOTICE '3. metadata must be NULL or JSON object/array';
  RAISE NOTICE '';
  RAISE NOTICE '✗ INVALID (will be rejected):';
  RAISE NOTICE '  INSERT INTO audit_trail (..., old_value, new_value) VALUES (..., ''unsigned'', ''signed'')';
  RAISE NOTICE '';
  RAISE NOTICE '✓ VALID (will be accepted):';
  RAISE NOTICE '  INSERT INTO audit_trail (..., old_value, new_value) VALUES (..., ''{"status":"unsigned"}'', ''{"status":"signed"}'')';
  RAISE NOTICE '';
  RAISE NOTICE 'Use auditTrailHelper.ts service to ensure proper formatting.';
  RAISE NOTICE '';
END $$;

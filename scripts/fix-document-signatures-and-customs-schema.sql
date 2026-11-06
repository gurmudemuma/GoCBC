-- ═══════════════════════════════════════════════════════════════
-- Fix Database Schema Issues Found in E2E Test
-- Date: November 5, 2026
-- Issues:
--   1. document_signatures table missing 'signed_by_role' column
--   2. customs_declarations table missing 'invoice_number' column
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Fix 1: Add signed_by_role column to document_signatures table
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'document_signatures'
        AND column_name = 'signed_by_role'
    ) THEN
        ALTER TABLE document_signatures 
        ADD COLUMN signed_by_role VARCHAR(50);
        
        RAISE NOTICE 'Added signed_by_role column to document_signatures table';
    ELSE
        RAISE NOTICE 'signed_by_role column already exists in document_signatures table';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Fix 2: Add invoice_number column to customs_declarations table
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customs_declarations'
        AND column_name = 'invoice_number'
    ) THEN
        ALTER TABLE customs_declarations 
        ADD COLUMN invoice_number VARCHAR(100);
        
        RAISE NOTICE 'Added invoice_number column to customs_declarations table';
    ELSE
        RAISE NOTICE 'invoice_number column already exists in customs_declarations table';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Fix 3: Add packing_list_number if missing
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customs_declarations'
        AND column_name = 'packing_list_number'
    ) THEN
        ALTER TABLE customs_declarations 
        ADD COLUMN packing_list_number VARCHAR(100);
        
        RAISE NOTICE 'Added packing_list_number column to customs_declarations table';
    ELSE
        RAISE NOTICE 'packing_list_number column already exists in customs_declarations table';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Fix 4: Add certificate_of_origin if missing
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customs_declarations'
        AND column_name = 'certificate_of_origin'
    ) THEN
        ALTER TABLE customs_declarations 
        ADD COLUMN certificate_of_origin VARCHAR(100);
        
        RAISE NOTICE 'Added certificate_of_origin column to customs_declarations table';
    ELSE
        RAISE NOTICE 'certificate_of_origin column already exists in customs_declarations table';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Verify the changes
-- ═══════════════════════════════════════════════════════════════

SELECT 
    'document_signatures' as table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'document_signatures'
AND column_name IN ('signed_by_role', 'signer_id', 'signature_type')
ORDER BY ordinal_position;

SELECT 
    'customs_declarations' as table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'customs_declarations'
AND column_name IN ('invoice_number', 'packing_list_number', 'certificate_of_origin', 'declaration_id')
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- Success message
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✓ Schema fixes applied successfully!';
    RAISE NOTICE '  1. document_signatures.signed_by_role column added/verified';
    RAISE NOTICE '  2. customs_declarations.invoice_number column added/verified';
    RAISE NOTICE '  3. customs_declarations.packing_list_number column added/verified';
    RAISE NOTICE '  4. customs_declarations.certificate_of_origin column added/verified';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

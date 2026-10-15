-- Workaround: Register exporter in database to bypass blockchain
-- This allows the workflow to continue even if blockchain has MSP issues

-- Note: This is a temporary workaround. The exporter should ideally be on blockchain.
-- However, for testing purposes, we can add a database record.

-- First, check if exporter exists
DO $$
BEGIN
    -- Insert exporter record if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'exp001' OR exporter_id = 'EXP001') THEN
        INSERT INTO users (
            username,
            password_hash,
            email,
            organization,
            role,
            full_name,
            exporter_id,
            ecta_license,
            phone,
            status,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'exp001',
            '$2b$10$rBV2uKVGxN3vZq8yF4gW7OZLj8mHQ0x3VqY0F8Iq3J0K1wBmP9v3G',  -- hashed 'password123'
            'exp001@test.com',
            'Test Coffee Exporter Ltd',
            'exporter',
            'Test Coffee Exporter Ltd',
            'EXP001',
            'ECTA-2024-001',
            '+251-911-123456',
            'active',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'Exporter EXP001 registered in database';
    ELSE
        RAISE NOTICE 'Exporter EXP001 already exists in database';
    END IF;
END $$;

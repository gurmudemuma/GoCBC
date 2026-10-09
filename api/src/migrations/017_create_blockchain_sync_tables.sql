-- Migration 017: Blockchain Sync Tables
-- Note: These tables were already created in 000_initial_schema.sql
-- This migration file exists for compatibility with the verification script

-- The following tables already exist in the initial schema:
-- - blockchain_transactions
-- - blockchain_blocks
-- - blockchain_events
-- - shipment_blockchain_sync
-- - contract_blockchain_sync
-- - lc_blockchain_sync

-- No changes needed - all blockchain sync tables are already present
-- Verification query to confirm tables exist:
SELECT 
    tablename, 
    schemaname
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename IN (
        'blockchain_transactions',
        'blockchain_blocks', 
        'blockchain_events',
        'shipment_blockchain_sync',
        'contract_blockchain_sync',
        'lc_blockchain_sync'
    )
ORDER BY 
    tablename;

-- Expected result: 6 rows confirming all blockchain sync tables exist

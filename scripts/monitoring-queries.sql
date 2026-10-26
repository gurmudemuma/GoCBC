-- ============================================================================
-- GoCBC System Monitoring Dashboard Queries
-- ============================================================================
-- These queries provide real-time insights into system health, blockchain sync
-- status, and operational metrics for production monitoring.
-- ============================================================================

-- ============================================================================
-- 1. BLOCKCHAIN SYNC STATUS
-- ============================================================================

-- Pending blockchain syncs by entity type
SELECT 
    'contracts' as entity_type,
    COUNT(*) as pending_count,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending
FROM contracts 
WHERE blockchain_synced = false OR blockchain_synced IS NULL
UNION ALL
SELECT 
    'shipments' as entity_type,
    COUNT(*) as pending_count,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending
FROM shipments 
WHERE blockchain_synced = false OR blockchain_synced IS NULL;

-- Failed blockchain syncs (require manual intervention)
SELECT 
    'contracts' as entity_type,
    COUNT(*) as failed_count,
    array_agg(contract_id) as failed_ids
FROM contracts 
WHERE blockchain_tx_id LIKE 'FAILED:%'
UNION ALL
SELECT 
    'shipments' as entity_type,
    COUNT(*) as failed_count,
    array_agg(shipment_id) as failed_ids
FROM shipments 
WHERE blockchain_tx_id LIKE 'FAILED:%';

-- Blockchain sync success rate (last 24 hours)
SELECT 
    'contracts' as entity_type,
    COUNT(*) as total,
    SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) as synced,
    ROUND(100.0 * SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM contracts 
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'shipments' as entity_type,
    COUNT(*) as total,
    SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) as synced,
    ROUND(100.0 * SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM shipments 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================================
-- 2. SYSTEM ACTIVITY METRICS
-- ============================================================================

-- Daily transaction counts (last 7 days)
SELECT 
    DATE(created_at) as date,
    COUNT(CASE WHEN entity_type = 'CONTRACT' THEN 1 END) as contracts,
    COUNT(CASE WHEN entity_type = 'SHIPMENT' THEN 1 END) as shipments,
    COUNT(CASE WHEN entity_type = 'EXPORTER_APPLICATION' THEN 1 END) as applications,
    COUNT(*) as total
FROM audit_trail
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Recent audit trail (last 100 actions)
SELECT 
    entity_type,
    entity_id,
    action,
    performed_by,
    organization,
    created_at,
    blockchain_tx_id
FROM audit_trail
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- 3. APPLICATION STATUS TRACKING
-- ============================================================================

-- Exporter application pipeline
SELECT 
    status,
    COUNT(*) as count,
    MIN(submitted_at) as oldest,
    MAX(submitted_at) as newest,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(approved_at, rejected_at, NOW()) - submitted_at)) / 86400), 2) as avg_days_to_decision
FROM exporter_applications
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'pending' THEN 1 
        WHEN 'approved' THEN 2 
        WHEN 'rejected' THEN 3 
    END;

-- Applications pending more than 48 hours (require attention)
SELECT 
    application_id,
    company_name,
    email,
    submitted_at,
    EXTRACT(EPOCH FROM (NOW() - submitted_at)) / 3600 as hours_pending
FROM exporter_applications
WHERE status = 'pending' 
    AND submitted_at < NOW() - INTERVAL '48 hours'
ORDER BY submitted_at ASC;

-- ============================================================================
-- 4. CONTRACT & SHIPMENT STATUS
-- ============================================================================

-- Contract status distribution
SELECT 
    status,
    COUNT(*) as count,
    SUM(quantity_kg) as total_kg,
    SUM(quantity_kg * price_per_kg) as total_value_usd,
    COUNT(CASE WHEN blockchain_synced = true THEN 1 END) as synced_to_blockchain
FROM contracts
GROUP BY status
ORDER BY count DESC;

-- Shipment status distribution
SELECT 
    status,
    COUNT(*) as count,
    SUM(weight_kg) as total_kg,
    COUNT(CASE WHEN blockchain_synced = true THEN 1 END) as synced_to_blockchain
FROM shipments
GROUP BY status
ORDER BY count DESC;

-- Contracts awaiting shipment (approved but not shipped)
SELECT 
    c.contract_id,
    c.exporter_id,
    c.buyer_name,
    c.quantity_kg,
    c.contract_date,
    c.delivery_date,
    COUNT(s.id) as shipment_count,
    COALESCE(SUM(s.weight_kg), 0) as shipped_kg,
    c.quantity_kg - COALESCE(SUM(s.weight_kg), 0) as remaining_kg
FROM contracts c
LEFT JOIN shipments s ON c.contract_id = s.contract_id
WHERE c.status = 'approved'
GROUP BY c.id, c.contract_id, c.exporter_id, c.buyer_name, c.quantity_kg, c.contract_date, c.delivery_date
HAVING c.quantity_kg > COALESCE(SUM(s.weight_kg), 0)
ORDER BY c.delivery_date ASC;

-- ============================================================================
-- 5. USER ACTIVITY & SECURITY
-- ============================================================================

-- Active users by role
SELECT 
    role,
    status,
    COUNT(*) as count
FROM users
GROUP BY role, status
ORDER BY role, status;

-- Recent login activity (requires login_logs table)
-- Note: Uncomment if login_logs table exists
/*
SELECT 
    username,
    COUNT(*) as login_count,
    MAX(login_at) as last_login,
    COUNT(CASE WHEN login_at > NOW() - INTERVAL '24 hours' THEN 1 END) as logins_24h
FROM login_logs
WHERE login_at > NOW() - INTERVAL '7 days'
GROUP BY username
ORDER BY last_login DESC;
*/

-- ============================================================================
-- 6. SYSTEM HEALTH INDICATORS
-- ============================================================================

-- Database size and growth
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Record counts by table
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'shipments', COUNT(*) FROM shipments
UNION ALL
SELECT 'exporter_applications', COUNT(*) FROM exporter_applications
UNION ALL
SELECT 'audit_trail', COUNT(*) FROM audit_trail
ORDER BY record_count DESC;

-- ============================================================================
-- 7. PERFORMANCE INDICATORS
-- ============================================================================

-- Average processing times (last 24 hours)
SELECT 
    'application_to_approval' as metric,
    COUNT(*) as count,
    ROUND(AVG(EXTRACT(EPOCH FROM (approved_at - submitted_at)) / 3600), 2) as avg_hours
FROM exporter_applications
WHERE approved_at IS NOT NULL 
    AND approved_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'contract_to_shipment' as metric,
    COUNT(*) as count,
    ROUND(AVG(EXTRACT(EPOCH FROM (s.created_at - c.created_at)) / 3600), 2) as avg_hours
FROM contracts c
JOIN shipments s ON c.contract_id = s.contract_id
WHERE s.created_at > NOW() - INTERVAL '24 hours';

-- ============================================================================
-- 8. ALERT CONDITIONS (For automated monitoring)
-- ============================================================================

-- Critical alerts (should trigger notifications)
SELECT 
    'CRITICAL' as severity,
    'Blockchain sync failures detected' as alert,
    COUNT(*) as affected_records
FROM (
    SELECT blockchain_tx_id FROM contracts WHERE blockchain_tx_id LIKE 'FAILED:%'
    UNION ALL
    SELECT blockchain_tx_id FROM shipments WHERE blockchain_tx_id LIKE 'FAILED:%'
) failed
UNION ALL
SELECT 
    'WARNING' as severity,
    'Applications pending over 48 hours' as alert,
    COUNT(*) as affected_records
FROM exporter_applications
WHERE status = 'pending' AND submitted_at < NOW() - INTERVAL '48 hours'
UNION ALL
SELECT 
    'WARNING' as severity,
    'Contracts past delivery date' as alert,
    COUNT(*) as affected_records
FROM contracts
WHERE status IN ('approved', 'pending') AND delivery_date < CURRENT_DATE;

-- ============================================================================
-- 9. EXPORT METRICS (Business Intelligence)
-- ============================================================================

-- Monthly export volumes
SELECT 
    TO_CHAR(shipping_date, 'YYYY-MM') as month,
    COUNT(*) as shipment_count,
    SUM(weight_kg) as total_kg,
    COUNT(DISTINCT exporter_id) as unique_exporters,
    COUNT(DISTINCT destination_country) as unique_destinations
FROM shipments
WHERE shipping_date IS NOT NULL
GROUP BY TO_CHAR(shipping_date, 'YYYY-MM')
ORDER BY month DESC
LIMIT 12;

-- Top exporters by volume (last 90 days)
SELECT 
    s.exporter_id,
    u.full_name as exporter_name,
    COUNT(DISTINCT s.shipment_id) as shipment_count,
    COUNT(DISTINCT s.contract_id) as contract_count,
    SUM(s.weight_kg) as total_kg,
    ROUND(SUM(c.quantity_kg * c.price_per_kg), 2) as total_value_usd
FROM shipments s
JOIN contracts c ON s.contract_id = c.contract_id
LEFT JOIN users u ON s.exporter_id = u.username
WHERE s.created_at > NOW() - INTERVAL '90 days'
GROUP BY s.exporter_id, u.full_name
ORDER BY total_kg DESC
LIMIT 10;

-- ============================================================================
-- 10. QUICK HEALTH CHECK (Single query for dashboard)
-- ============================================================================

SELECT 
    (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
    (SELECT COUNT(*) FROM exporter_applications WHERE status = 'pending') as pending_applications,
    (SELECT COUNT(*) FROM contracts WHERE blockchain_synced = false OR blockchain_synced IS NULL) as contracts_pending_sync,
    (SELECT COUNT(*) FROM shipments WHERE blockchain_synced = false OR blockchain_synced IS NULL) as shipments_pending_sync,
    (SELECT COUNT(*) FROM contracts WHERE blockchain_tx_id LIKE 'FAILED:%') + 
    (SELECT COUNT(*) FROM shipments WHERE blockchain_tx_id LIKE 'FAILED:%') as blockchain_failures,
    (SELECT COUNT(*) FROM audit_trail WHERE created_at > NOW() - INTERVAL '24 hours') as audit_entries_24h,
    (SELECT COUNT(*) FROM contracts WHERE created_at > NOW() - INTERVAL '24 hours') as contracts_24h,
    (SELECT COUNT(*) FROM shipments WHERE created_at > NOW() - INTERVAL '24 hours') as shipments_24h;

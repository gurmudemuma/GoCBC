-- Create missing critical tables

-- 1. sales_contracts (modern contract table)
CREATE TABLE IF NOT EXISTS sales_contracts (
    id SERIAL PRIMARY KEY,
    contract_id VARCHAR(100) UNIQUE NOT NULL,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    exporter_id VARCHAR(100) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_country VARCHAR(100),
    buyer_address TEXT,
    coffee_type VARCHAR(100),
    coffee_grade VARCHAR(50),
    quantity_kg DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2),
    total_value DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    contract_date DATE NOT NULL,
    delivery_date DATE,
    delivery_terms VARCHAR(100),
    payment_terms VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    destination_port VARCHAR(100),
    shipping_method VARCHAR(50),
    quality_specs TEXT,
    special_conditions TEXT,
    notes TEXT,
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    blockchain_tx_id VARCHAR(255),
    blockchain_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_sales_contracts_exporter ON sales_contracts(exporter_id);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_status ON sales_contracts(status);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_date ON sales_contracts(contract_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_blockchain ON sales_contracts(blockchain_tx_id);

-- 2. blockchain_sync_queue (tracks pending blockchain operations)
CREATE TABLE IF NOT EXISTS blockchain_sync_queue (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    chaincode_function VARCHAR(100) NOT NULL,
    chaincode_args JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    last_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    blockchain_tx_id VARCHAR(255),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON blockchain_sync_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON blockchain_sync_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON blockchain_sync_queue(created_at);

-- 3. blockchain_cache (LRU cache for blockchain queries)
CREATE TABLE IF NOT EXISTS blockchain_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value JSONB NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    query_type VARCHAR(50),
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    ttl_seconds INTEGER DEFAULT 300
);

CREATE INDEX IF NOT EXISTS idx_cache_entity ON blockchain_cache(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON blockchain_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_accessed ON blockchain_cache(last_accessed_at);

-- Verify creation
SELECT 'Created tables:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public' 
  AND table_name IN ('sales_contracts', 'blockchain_sync_queue', 'blockchain_cache')
ORDER BY table_name;

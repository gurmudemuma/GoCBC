-- Migration 017: Blockchain Sync Tables
-- Purpose: Track blockchain synchronization state and blockchain data

-- Blockchain Transactions (from blockchain)
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id SERIAL PRIMARY KEY,
    tx_id VARCHAR(100) UNIQUE NOT NULL,
    channel_id VARCHAR(100) NOT NULL,
    chaincode_id VARCHAR(100) NOT NULL,
    block_number BIGINT,
    timestamp TIMESTAMP NOT NULL,
    creator_msp VARCHAR(100),
    tx_type VARCHAR(50),
    validation_code INTEGER,
    payload JSONB,
    endorsements JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blockchain Blocks (from blockchain)
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    id SERIAL PRIMARY KEY,
    block_number BIGINT UNIQUE NOT NULL,
    block_hash VARCHAR(100) UNIQUE NOT NULL,
    previous_hash VARCHAR(100),
    channel_id VARCHAR(100) NOT NULL,
    data_hash VARCHAR(100),
    tx_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blockchain Events (from blockchain)
CREATE TABLE IF NOT EXISTS blockchain_events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    tx_id VARCHAR(100),
    block_number BIGINT,
    channel_id VARCHAR(100),
    chaincode_id VARCHAR(100),
    payload JSONB,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Blockchain Sync (sync tracking)
CREATE TABLE IF NOT EXISTS shipment_blockchain_sync (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(100) UNIQUE NOT NULL,
    blockchain_tx_id VARCHAR(100),
    blockchain_block_number BIGINT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync_at TIMESTAMP,
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contract Blockchain Sync (sync tracking)
CREATE TABLE IF NOT EXISTS contract_blockchain_sync (
    id SERIAL PRIMARY KEY,
    contract_id VARCHAR(100) UNIQUE NOT NULL,
    blockchain_tx_id VARCHAR(100),
    blockchain_block_number BIGINT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync_at TIMESTAMP,
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Letter of Credit Blockchain Sync (sync tracking)
CREATE TABLE IF NOT EXISTS lc_blockchain_sync (
    id SERIAL PRIMARY KEY,
    lc_id VARCHAR(100) UNIQUE NOT NULL,
    blockchain_tx_id VARCHAR(100),
    blockchain_block_number BIGINT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync_at TIMESTAMP,
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_block ON blockchain_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_channel ON blockchain_transactions(channel_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_channel ON blockchain_blocks(channel_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_tx ON blockchain_events(tx_id);
CREATE INDEX IF NOT EXISTS idx_shipment_sync_status ON shipment_blockchain_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_contract_sync_status ON contract_blockchain_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_lc_sync_status ON lc_blockchain_sync(sync_status);

-- Comments
COMMENT ON TABLE blockchain_transactions IS 'Blockchain transactions synced from Hyperledger Fabric';
COMMENT ON TABLE blockchain_blocks IS 'Blockchain blocks synced from Hyperledger Fabric';
COMMENT ON TABLE blockchain_events IS 'Blockchain events emitted by chaincode';
COMMENT ON TABLE shipment_blockchain_sync IS 'Tracks synchronization status of shipments to blockchain';
COMMENT ON TABLE contract_blockchain_sync IS 'Tracks synchronization status of contracts to blockchain';
COMMENT ON TABLE lc_blockchain_sync IS 'Tracks synchronization status of Letters of Credit to blockchain';

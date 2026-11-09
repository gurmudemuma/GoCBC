-- Migration 056: create the ecx_lots mirror table.
--
-- The ECX portal dashboard reads available lots from PostgreSQL
-- (SELECT * FROM ecx_lots WHERE status = 'AVAILABLE'), and the
-- dual-source service merges the same table with the ledger — but no
-- migration ever created the table and nothing ever inserted into it,
-- so the portal always showed zero lots even after a successful
-- warehouse intake (POST /ecx/lots writes the chaincode only).
-- POST /ecx/lots now also inserts a row here (status AVAILABLE) once
-- the chaincode intake succeeds.
CREATE TABLE IF NOT EXISTS ecx_lots (
    id SERIAL PRIMARY KEY,
    lot_id VARCHAR(100) UNIQUE NOT NULL,
    lot_number VARCHAR(100),
    exporter_id VARCHAR(100),
    exporter_name VARCHAR(255),
    warehouse_id VARCHAR(100),
    origin VARCHAR(100),
    sub_region VARCHAR(100),
    quantity DECIMAL(15, 2),
    bags INTEGER,
    processing_method VARCHAR(50),
    harvest_season VARCHAR(20),
    grade VARCHAR(20),
    quality_score DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    receipt_date TIMESTAMP,
    contract_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ecx_lots_status ON ecx_lots(status);
CREATE INDEX IF NOT EXISTS idx_ecx_lots_exporter ON ecx_lots(exporter_id);
CREATE INDEX IF NOT EXISTS idx_ecx_lots_number ON ecx_lots(lot_number);

COMMENT ON TABLE ecx_lots IS 'PostgreSQL mirror of ECX warehouse lots (chaincode RegisterECXLot); the ECX portal reads available lots from here';

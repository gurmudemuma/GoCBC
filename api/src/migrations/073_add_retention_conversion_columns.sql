-- Migration 073: Add retention conversion columns to payments
-- Created: 2026-11-12 (LEG3 M-5)
-- Purpose: PaymentService.convertRetention updates these columns after the
-- ConvertRetention chaincode write, but NONE of them existed on payments
-- (000 schema + 020/021/023/026/043/051/063 add only contract_id,
-- exporter_id, payment_method, blockchain_tx_id, payment_tracking_status,
-- lc_id, forex_id, retention_rate, retention_amount, release_amount,
-- swift_reference, payer_name, payer_bank, amount_usd, retention_status).
-- So a retention conversion would have failed on Postgres after the chain
-- write. exchange_rate already exists on forex_allocations (000) but never
-- existed on payments.
-- Safe on a live DB: all ADD COLUMN IF NOT EXISTS, nullable, no backfill
-- (existing rows keep NULL until their retention is converted).

ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_birr DECIMAL(15,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS converted_by VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS conversion_ref VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP;

COMMENT ON COLUMN payments.exchange_rate IS 'Ledger NBE rate (ETB/USD) used when the retained portion was converted to Birr (LEG3 M-5)';
COMMENT ON COLUMN payments.amount_birr IS 'Retained amount converted to Birr by ConvertRetention (LEG3 M-5)';
COMMENT ON COLUMN payments.converted_by IS 'User who converted the retention (LEG3 M-5)';
COMMENT ON COLUMN payments.conversion_ref IS 'Retention conversion reference (LEG3 M-5)';
COMMENT ON COLUMN payments.conversion_date IS 'When the retention was converted (LEG3 M-5)';

-- Migration 073: contract buyer contact fields (LEG 1 / F3)
--
-- The exporter contract form collects buyerEmail and buyerPhone, but no
-- columns existed for them, so the API silently dropped both values at
-- creation (the other seven trade fields — organic_certified,
-- fair_trade_certified, port_of_loading, port_of_destination,
-- delivery_date, incoterm, special_instructions — already exist via
-- migration 023). Idempotent: safe to re-run, no data is altered.

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(50);

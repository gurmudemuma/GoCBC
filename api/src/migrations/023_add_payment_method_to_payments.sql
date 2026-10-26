-- Migration: Add payment_method column to payments table
-- Description: Adds payment_method column required by payment recording functionality
-- Date: 2026-10-14

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Update any existing null values with a default
UPDATE payments SET payment_method = 'LC' WHERE payment_method IS NULL;

COMMENT ON COLUMN payments.payment_method IS 'Payment method (LC, TT, etc.)';

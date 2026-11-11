-- Migration 066: Add Advanced Banking Tables
-- 
-- Purpose: Support advanced banking operations including LC transfers, standby LCs,
--          deferred payments, acceptance financing, and forex conversions
--
-- Created: 2026-11-10

-- ============================================================================
-- LC TRANSFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lc_transfers (
  id SERIAL PRIMARY KEY,
  transfer_id VARCHAR(100) UNIQUE NOT NULL,
  lc_id VARCHAR(100) NOT NULL,
  original_beneficiary VARCHAR(255) NOT NULL,
  new_beneficiary VARCHAR(255) NOT NULL,
  new_beneficiary_bank VARCHAR(255) NOT NULL,
  transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('FULL', 'PARTIAL')),
  transfer_amount DECIMAL(15, 2) NOT NULL,
  original_amount DECIMAL(15, 2),
  transfer_reason TEXT NOT NULL,
  transfer_date TIMESTAMP NOT NULL,
  transferred_by VARCHAR(100),
  consent_confirmed BOOLEAN DEFAULT FALSE,
  terms_and_conditions TEXT,
  status VARCHAR(50) DEFAULT 'TRANSFERRED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lc_transfers_lc_id ON lc_transfers(lc_id);
CREATE INDEX IF NOT EXISTS idx_lc_transfers_transfer_id ON lc_transfers(transfer_id);
CREATE INDEX IF NOT EXISTS idx_lc_transfers_status ON lc_transfers(status);

COMMENT ON TABLE lc_transfers IS 'Records of LC transfers to second beneficiaries per UCP 600 Article 38';

-- ============================================================================
-- STANDBY LETTERS OF CREDIT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS standby_letters_of_credit (
  id SERIAL PRIMARY KEY,
  standby_lc_id VARCHAR(100) UNIQUE NOT NULL,
  standby_lc_number VARCHAR(100) UNIQUE NOT NULL,
  contract_id VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  expiry_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PERFORMANCE', 'ADVANCE_PAYMENT', 'BID_BOND', 'FINANCIAL')),
  purpose TEXT NOT NULL,
  beneficiary VARCHAR(255) NOT NULL,
  applicant VARCHAR(255) NOT NULL,
  terms TEXT,
  issuing_bank VARCHAR(255),
  advising_bank VARCHAR(255),
  issued_by VARCHAR(100),
  issue_date TIMESTAMP NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claim_date TIMESTAMP,
  claim_amount DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'ISSUED',
  blockchain_tx_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_standby_lc_id ON standby_letters_of_credit(standby_lc_id);
CREATE INDEX IF NOT EXISTS idx_standby_lc_number ON standby_letters_of_credit(standby_lc_number);
CREATE INDEX IF NOT EXISTS idx_standby_contract_id ON standby_letters_of_credit(contract_id);
CREATE INDEX IF NOT EXISTS idx_standby_status ON standby_letters_of_credit(status);
CREATE INDEX IF NOT EXISTS idx_standby_type ON standby_letters_of_credit(type);

COMMENT ON TABLE standby_letters_of_credit IS 'Standby Letters of Credit (SBLC) for guarantees and performance bonds';

-- ============================================================================
-- DEFERRED PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS deferred_payments (
  id SERIAL PRIMARY KEY,
  deferred_payment_id VARCHAR(100) UNIQUE NOT NULL,
  lc_id VARCHAR(100) NOT NULL,
  document_presentation_date TIMESTAMP NOT NULL,
  maturity_date TIMESTAMP NOT NULL,
  deferred_days INTEGER NOT NULL,
  deferred_amount DECIMAL(15, 2) NOT NULL,
  interest_amount DECIMAL(15, 2) DEFAULT 0,
  total_payable DECIMAL(15, 2) NOT NULL,
  acceptance_by VARCHAR(100),
  acceptance_date TIMESTAMP,
  payment_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACCEPTED' CHECK (status IN ('PENDING', 'ACCEPTED', 'PAID', 'OVERDUE')),
  blockchain_tx_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deferred_payments_lc_id ON deferred_payments(lc_id);
CREATE INDEX IF NOT EXISTS idx_deferred_payments_status ON deferred_payments(status);
CREATE INDEX IF NOT EXISTS idx_deferred_payments_maturity_date ON deferred_payments(maturity_date);

COMMENT ON TABLE deferred_payments IS 'Usance LC deferred payments with future maturity dates';

-- ============================================================================
-- ACCEPTANCE FINANCING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS acceptance_financing (
  id SERIAL PRIMARY KEY,
  financing_id VARCHAR(100) UNIQUE NOT NULL,
  lc_id VARCHAR(100) NOT NULL,
  financing_amount DECIMAL(15, 2) NOT NULL,
  discount_rate DECIMAL(5, 2) NOT NULL,
  discount_amount DECIMAL(15, 2) NOT NULL,
  net_amount DECIMAL(15, 2) NOT NULL,
  financing_period INTEGER NOT NULL,
  beneficiary VARCHAR(255),
  request_date TIMESTAMP NOT NULL,
  maturity_date TIMESTAMP,
  terms TEXT,
  approved_by VARCHAR(100),
  approval_date TIMESTAMP,
  disbursement_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DISBURSED', 'REJECTED')),
  blockchain_tx_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acceptance_financing_lc_id ON acceptance_financing(lc_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_financing_status ON acceptance_financing(status);
CREATE INDEX IF NOT EXISTS idx_acceptance_financing_maturity ON acceptance_financing(maturity_date);

COMMENT ON TABLE acceptance_financing IS 'Acceptance financing (negotiation/discounting) for early payment at discount';

-- ============================================================================
-- FOREX CONVERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS forex_conversions (
  id SERIAL PRIMARY KEY,
  conversion_id VARCHAR(100) UNIQUE NOT NULL,
  payment_id VARCHAR(100),
  lc_id VARCHAR(100),
  source_amount DECIMAL(15, 2) NOT NULL,
  source_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  forex_rate DECIMAL(10, 4) NOT NULL,
  converted_amount DECIMAL(15, 2) NOT NULL,
  rate_date TIMESTAMP NOT NULL,
  rate_source VARCHAR(100) DEFAULT 'NBE Official Rate',
  converted_by VARCHAR(100),
  conversion_date TIMESTAMP NOT NULL,
  blockchain_tx_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forex_conversions_payment_id ON forex_conversions(payment_id);
CREATE INDEX IF NOT EXISTS idx_forex_conversions_lc_id ON forex_conversions(lc_id);
CREATE INDEX IF NOT EXISTS idx_forex_conversions_rate_date ON forex_conversions(rate_date);

COMMENT ON TABLE forex_conversions IS 'Currency conversion records for payments and settlements';

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger for lc_transfers updated_at
CREATE OR REPLACE FUNCTION update_lc_transfers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lc_transfers_updated_at_trigger ON lc_transfers;
CREATE TRIGGER lc_transfers_updated_at_trigger
  BEFORE UPDATE ON lc_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_lc_transfers_timestamp();

-- Trigger for standby_letters_of_credit updated_at
CREATE OR REPLACE FUNCTION update_standby_lc_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS standby_lc_updated_at_trigger ON standby_letters_of_credit;
CREATE TRIGGER standby_lc_updated_at_trigger
  BEFORE UPDATE ON standby_letters_of_credit
  FOR EACH ROW
  EXECUTE FUNCTION update_standby_lc_timestamp();

-- Trigger for deferred_payments updated_at
CREATE OR REPLACE FUNCTION update_deferred_payments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deferred_payments_updated_at_trigger ON deferred_payments;
CREATE TRIGGER deferred_payments_updated_at_trigger
  BEFORE UPDATE ON deferred_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_deferred_payments_timestamp();

-- Trigger for acceptance_financing updated_at
CREATE OR REPLACE FUNCTION update_acceptance_financing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS acceptance_financing_updated_at_trigger ON acceptance_financing;
CREATE TRIGGER acceptance_financing_updated_at_trigger
  BEFORE UPDATE ON acceptance_financing
  FOR EACH ROW
  EXECUTE FUNCTION update_acceptance_financing_timestamp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADVANCED BANKING TABLES CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '1. lc_transfers - LC beneficiary transfers';
  RAISE NOTICE '2. standby_letters_of_credit - Performance guarantees';
  RAISE NOTICE '3. deferred_payments - Usance LC payments';
  RAISE NOTICE '4. acceptance_financing - Early payment discounting';
  RAISE NOTICE '5. forex_conversions - Currency conversions';
  RAISE NOTICE '';
  RAISE NOTICE 'New API endpoints available:';
  RAISE NOTICE '- POST /api/v1/banking/lc/:lcID/transfer';
  RAISE NOTICE '- POST /api/v1/banking/lc/standby/issue';
  RAISE NOTICE '- POST /api/v1/banking/lc/:lcID/deferred-payment/record';
  RAISE NOTICE '- POST /api/v1/banking/lc/:lcID/acceptance-financing';
  RAISE NOTICE '- POST /api/v1/banking/payment/:paymentID/apply-forex';
  RAISE NOTICE '';
END $$;

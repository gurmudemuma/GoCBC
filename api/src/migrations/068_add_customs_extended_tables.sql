-- Migration 068: Add customs extended tables for advanced customs operations
-- Created: 2026-11-10
-- Purpose: Support declaration amendments, duty calculations, customs valuations, and cancellations

-- ============================================================================
-- 1. Declaration Amendments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS declaration_amendments (
    amendment_id SERIAL PRIMARY KEY,
    declaration_id VARCHAR(100) NOT NULL REFERENCES customs_declarations(declaration_id) ON DELETE CASCADE,
    amendment_number INTEGER NOT NULL, -- Sequential amendment number (1, 2, 3...)
    amendment_reason TEXT NOT NULL,
    original_values JSONB NOT NULL, -- Store fields being changed with their original values
    amended_values JSONB NOT NULL, -- Store new values for changed fields
    amendment_requested_by VARCHAR(255) NOT NULL,
    amendment_requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customs_officer_id INTEGER REFERENCES users(id),
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approval_notes TEXT,
    approved_rejected_at TIMESTAMP,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_amendment_status CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT unique_amendment_number UNIQUE (declaration_id, amendment_number)
);

CREATE INDEX idx_declaration_amendments_declaration ON declaration_amendments(declaration_id);
CREATE INDEX idx_declaration_amendments_status ON declaration_amendments(approval_status);
CREATE INDEX idx_declaration_amendments_requested_at ON declaration_amendments(amendment_requested_at);

-- ============================================================================
-- 2. Duty Calculations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS duty_calculations (
    calculation_id SERIAL PRIMARY KEY,
    declaration_id VARCHAR(100) NOT NULL REFERENCES customs_declarations(declaration_id) ON DELETE CASCADE,
    calculation_method VARCHAR(50) NOT NULL,
    
    -- Base values
    customs_value DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate DECIMAL(10, 6),
    
    -- Duty breakdown
    basic_duty_rate DECIMAL(5, 2) NOT NULL, -- Percentage
    basic_duty_amount DECIMAL(15, 2) NOT NULL,
    additional_duties JSONB, -- [{type: 'anti_dumping', rate: 10.5, amount: 1050}, ...]
    vat_rate DECIMAL(5, 2),
    vat_amount DECIMAL(15, 2),
    excise_rate DECIMAL(5, 2),
    excise_amount DECIMAL(15, 2),
    other_charges JSONB, -- [{type: 'processing_fee', amount: 50}, ...]
    
    -- Totals
    total_duties DECIMAL(15, 2) NOT NULL,
    total_taxes DECIMAL(15, 2) NOT NULL,
    total_payable DECIMAL(15, 2) NOT NULL,
    
    -- Preferences and exemptions
    trade_preference_id INTEGER, -- Foreign key could reference trade_preferences if we add that table
    preference_applied VARCHAR(100),
    duty_exemption_amount DECIMAL(15, 2) DEFAULT 0,
    exemption_reason TEXT,
    
    -- Metadata
    calculated_by INTEGER REFERENCES users(id),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_calculation_method CHECK (calculation_method IN ('standard', 'preferential', 'exempted', 'simplified')),
    CONSTRAINT positive_amounts CHECK (
        customs_value >= 0 AND
        basic_duty_amount >= 0 AND
        total_duties >= 0 AND
        total_taxes >= 0 AND
        total_payable >= 0
    )
);

CREATE INDEX idx_duty_calculations_declaration ON duty_calculations(declaration_id);
CREATE INDEX idx_duty_calculations_calculated_at ON duty_calculations(calculated_at);

-- ============================================================================
-- 3. Customs Valuations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS customs_valuations (
    valuation_id SERIAL PRIMARY KEY,
    declaration_id VARCHAR(100) NOT NULL REFERENCES customs_declarations(declaration_id) ON DELETE CASCADE,
    
    -- Valuation method (WTO methods)
    valuation_method VARCHAR(50) NOT NULL,
    
    -- Transaction value (Method 1)
    invoice_value DECIMAL(15, 2),
    invoice_currency VARCHAR(3),
    
    -- Adjustments to transaction value
    adjustments JSONB, -- [{type: 'royalties', amount: 500}, {type: 'assists', amount: 200}, ...]
    freight_cost DECIMAL(15, 2),
    insurance_cost DECIMAL(15, 2),
    loading_costs DECIMAL(15, 2),
    deductible_costs JSONB, -- [{type: 'post_importation_construction', amount: 1000}, ...]
    
    -- Final values
    adjusted_value DECIMAL(15, 2) NOT NULL,
    final_customs_value DECIMAL(15, 2) NOT NULL,
    valuation_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Related party information
    is_related_party BOOLEAN DEFAULT false,
    related_party_declaration TEXT,
    relationship_affects_price BOOLEAN,
    
    -- Comparable values (for methods 2-6)
    comparable_goods_value DECIMAL(15, 2),
    comparable_goods_reference VARCHAR(255),
    
    -- Supporting documentation
    supporting_documents JSONB, -- [{type: 'commercial_invoice', reference: 'INV-123'}, ...]
    valuation_notes TEXT,
    
    -- Approval
    valued_by INTEGER REFERENCES users(id),
    valued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_status VARCHAR(50) DEFAULT 'pending',
    
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_valuation_method CHECK (valuation_method IN (
        'TRANSACTION',       -- Method 1: Transaction value
        'IDENTICAL',         -- Method 2: Transaction value of identical goods
        'SIMILAR',          -- Method 3: Transaction value of similar goods
        'DEDUCTIVE',        -- Method 4: Deductive value
        'COMPUTED',         -- Method 5: Computed value
        'FALLBACK'          -- Method 6: Fallback method
    )),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'under_review')),
    CONSTRAINT positive_valuation_amounts CHECK (
        final_customs_value >= 0 AND
        adjusted_value >= 0
    )
);

CREATE INDEX idx_customs_valuations_declaration ON customs_valuations(declaration_id);
CREATE INDEX idx_customs_valuations_method ON customs_valuations(valuation_method);
CREATE INDEX idx_customs_valuations_status ON customs_valuations(approval_status);

-- ============================================================================
-- 4. Add cancellation columns to customs_declarations
-- ============================================================================
ALTER TABLE customs_declarations 
    ADD COLUMN IF NOT EXISTS cancellation_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancellation_approved_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancellation_approved_at TIMESTAMP;

ALTER TABLE customs_declarations
    ADD CONSTRAINT valid_cancellation_status CHECK (
        cancellation_status IS NULL OR 
        cancellation_status IN ('requested', 'approved', 'rejected')
    );

CREATE INDEX idx_customs_declarations_cancellation ON customs_declarations(cancellation_status) 
    WHERE cancellation_status IS NOT NULL;

-- ============================================================================
-- 5. Optional: Customs Tariffs Reference Table (for duty rate lookups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customs_tariffs (
    tariff_id SERIAL PRIMARY KEY,
    hs_code VARCHAR(20) NOT NULL, -- Harmonized System code
    description TEXT NOT NULL,
    duty_rate DECIMAL(5, 2) NOT NULL, -- Percentage
    vat_rate DECIMAL(5, 2),
    excise_rate DECIMAL(5, 2),
    import_restrictions TEXT, -- Any special conditions or restrictions
    effective_from DATE NOT NULL,
    effective_to DATE,
    country_of_origin VARCHAR(100), -- Some rates vary by origin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_rates CHECK (
        duty_rate >= 0 AND
        (vat_rate IS NULL OR vat_rate >= 0) AND
        (excise_rate IS NULL OR excise_rate >= 0)
    )
);

CREATE INDEX idx_customs_tariffs_hs_code ON customs_tariffs(hs_code);
CREATE INDEX idx_customs_tariffs_effective ON customs_tariffs(effective_from, effective_to);
CREATE INDEX idx_customs_tariffs_origin ON customs_tariffs(country_of_origin);

-- ============================================================================
-- 6. Optional: Trade Preferences Table (for preferential duty rates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trade_preferences (
    preference_id SERIAL PRIMARY KEY,
    agreement_name VARCHAR(255) NOT NULL, -- e.g., 'COMESA FTA', 'EU-EPA'
    country_group VARCHAR(100) NOT NULL, -- e.g., 'COMESA', 'EU', 'SADC'
    hs_code VARCHAR(20) NOT NULL,
    preferential_rate DECIMAL(5, 2) NOT NULL,
    standard_rate DECIMAL(5, 2) NOT NULL, -- Normal duty rate
    duty_savings DECIMAL(5, 2) GENERATED ALWAYS AS (standard_rate - preferential_rate) STORED,
    
    -- Rules of origin requirements
    origin_criteria TEXT, -- Description of origin requirements
    required_documents JSONB, -- [{type: 'form_a', description: 'GSP Certificate of Origin'}, ...]
    
    -- Validity
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_preference_rates CHECK (
        preferential_rate >= 0 AND
        standard_rate >= 0
    )
);

CREATE INDEX idx_trade_preferences_agreement ON trade_preferences(agreement_name);
CREATE INDEX idx_trade_preferences_hs_code ON trade_preferences(hs_code);
CREATE INDEX idx_trade_preferences_country_group ON trade_preferences(country_group);
CREATE INDEX idx_trade_preferences_active ON trade_preferences(is_active) WHERE is_active = true;

-- ============================================================================
-- 7. JSONB Constraints for audit trail prevention
-- ============================================================================

-- Ensure JSONB columns contain valid JSON (PostgreSQL enforces this by type)
-- Add CHECK constraints to prevent storing plain strings

ALTER TABLE declaration_amendments
    ADD CONSTRAINT declaration_amendments_original_values_not_string 
        CHECK (jsonb_typeof(original_values) != 'string'),
    ADD CONSTRAINT declaration_amendments_amended_values_not_string 
        CHECK (jsonb_typeof(amended_values) != 'string');

ALTER TABLE duty_calculations
    ADD CONSTRAINT duty_calculations_additional_duties_valid 
        CHECK (additional_duties IS NULL OR jsonb_typeof(additional_duties) IN ('array', 'object')),
    ADD CONSTRAINT duty_calculations_other_charges_valid 
        CHECK (other_charges IS NULL OR jsonb_typeof(other_charges) IN ('array', 'object'));

ALTER TABLE customs_valuations
    ADD CONSTRAINT customs_valuations_adjustments_valid 
        CHECK (adjustments IS NULL OR jsonb_typeof(adjustments) IN ('array', 'object')),
    ADD CONSTRAINT customs_valuations_deductible_costs_valid 
        CHECK (deductible_costs IS NULL OR jsonb_typeof(deductible_costs) IN ('array', 'object')),
    ADD CONSTRAINT customs_valuations_supporting_documents_valid 
        CHECK (supporting_documents IS NULL OR jsonb_typeof(supporting_documents) IN ('array', 'object'));

-- ============================================================================
-- 8. Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_customs_extended_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_declaration_amendments_updated
    BEFORE UPDATE ON declaration_amendments
    FOR EACH ROW
    EXECUTE FUNCTION update_customs_extended_timestamp();

CREATE TRIGGER trigger_duty_calculations_updated
    BEFORE UPDATE ON duty_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_customs_extended_timestamp();

CREATE TRIGGER trigger_customs_valuations_updated
    BEFORE UPDATE ON customs_valuations
    FOR EACH ROW
    EXECUTE FUNCTION update_customs_extended_timestamp();

CREATE TRIGGER trigger_customs_tariffs_updated
    BEFORE UPDATE ON customs_tariffs
    FOR EACH ROW
    EXECUTE FUNCTION update_customs_extended_timestamp();

CREATE TRIGGER trigger_trade_preferences_updated
    BEFORE UPDATE ON trade_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_customs_extended_timestamp();

-- ============================================================================
-- 9. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON declaration_amendments TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON duty_calculations TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON customs_valuations TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON customs_tariffs TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON trade_preferences TO gocbc_app;
GRANT UPDATE ON customs_declarations TO gocbc_app; -- For cancellation columns

GRANT USAGE, SELECT ON SEQUENCE declaration_amendments_amendment_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE duty_calculations_calculation_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE customs_valuations_valuation_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE customs_tariffs_tariff_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE trade_preferences_preference_id_seq TO gocbc_app;

-- ============================================================================
-- Migration complete
-- ============================================================================

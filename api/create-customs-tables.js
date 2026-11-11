require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTables() {
  try {
    console.log('🔨 Dropping existing tables if they exist...');
    
    await pool.query('DROP TABLE IF EXISTS customs_valuations CASCADE');
    await pool.query('DROP TABLE IF EXISTS duty_calculations CASCADE');
    
    console.log('✅ Old tables dropped');
    console.log('🔨 Creating duty_calculations table...');
    
    await pool.query(`
      CREATE TABLE duty_calculations (
        id SERIAL PRIMARY KEY,
        calculation_id VARCHAR(255) UNIQUE NOT NULL,
        declaration_id VARCHAR(255) NOT NULL,
        customs_value_usd NUMERIC(20,2) NOT NULL,
        customs_value_etb NUMERIC(20,2) NOT NULL,
        exchange_rate NUMERIC(10,4) NOT NULL,
        hs_code VARCHAR(50),
        origin_country VARCHAR(100),
        duty_rate NUMERIC(5,4) NOT NULL,
        vat_rate NUMERIC(5,4) NOT NULL,
        excise_rate NUMERIC(5,4) DEFAULT 0,
        duty_amount NUMERIC(20,2) NOT NULL,
        vat_amount NUMERIC(20,2) NOT NULL,
        excise_amount NUMERIC(20,2) DEFAULT 0,
        total_duty NUMERIC(20,2) NOT NULL,
        calculated_by VARCHAR(255),
        calculation_date TIMESTAMP NOT NULL,
        preferences_applied BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ duty_calculations table created');
    console.log('🔨 Creating customs_valuations table...');
    
    await pool.query(`
      CREATE TABLE customs_valuations (
        id SERIAL PRIMARY KEY,
        valuation_id VARCHAR(255) UNIQUE NOT NULL,
        declaration_id VARCHAR(255) NOT NULL,
        declared_value NUMERIC(20,2) NOT NULL,
        adjusted_value NUMERIC(20,2) NOT NULL,
        adjustment_amount NUMERIC(20,2),
        adjustment_percentage NUMERIC(20,4),
        valuation_method VARCHAR(50) NOT NULL,
        adjustment_reason TEXT,
        basis_of_valuation TEXT,
        comparable_goods TEXT,
        market_research TEXT,
        valuation_officer VARCHAR(255),
        supporting_documents JSONB,
        valuation_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        invoice_value NUMERIC(20,2),
        invoice_currency VARCHAR(10),
        adjustments JSONB,
        is_related_party BOOLEAN DEFAULT FALSE,
        comparable_goods_value NUMERIC(20,2),
        comparable_goods_reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ customs_valuations table created');
    console.log('🎉 All customs tables created successfully!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTables();

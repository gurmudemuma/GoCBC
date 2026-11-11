import { DatabaseService } from '../services/databaseService';

export async function up() {
  const db = DatabaseService.getInstance();
  
  // Create duty_calculations table
  await db.run(`
    CREATE TABLE IF NOT EXISTS duty_calculations (
      id SERIAL PRIMARY KEY,
      calculation_id VARCHAR(255) UNIQUE NOT NULL,
      declaration_id VARCHAR(255) NOT NULL,
      customs_value_usd DECIMAL(15,2) NOT NULL,
      customs_value_etb DECIMAL(15,2) NOT NULL,
      exchange_rate DECIMAL(10,4) NOT NULL,
      hs_code VARCHAR(50),
      origin_country VARCHAR(100),
      duty_rate DECIMAL(5,4) NOT NULL,
      vat_rate DECIMAL(5,4) NOT NULL,
      excise_rate DECIMAL(5,4) DEFAULT 0,
      duty_amount DECIMAL(15,2) NOT NULL,
      vat_amount DECIMAL(15,2) NOT NULL,
      excise_amount DECIMAL(15,2) DEFAULT 0,
      total_duty DECIMAL(15,2) NOT NULL,
      calculated_by VARCHAR(255),
      calculation_date TIMESTAMP NOT NULL,
      preferences_applied BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create customs_valuations table
  await db.run(`
    CREATE TABLE IF NOT EXISTS customs_valuations (
      id SERIAL PRIMARY KEY,
      valuation_id VARCHAR(255) UNIQUE NOT NULL,
      declaration_id VARCHAR(255) NOT NULL,
      declared_value DECIMAL(15,2) NOT NULL,
      adjusted_value DECIMAL(15,2) NOT NULL,
      valuation_method VARCHAR(50) NOT NULL,
      adjustment_reason TEXT,
      valuation_officer VARCHAR(255),
      valuation_date TIMESTAMP NOT NULL,
      invoice_value DECIMAL(15,2),
      invoice_currency VARCHAR(10),
      adjustments JSONB,
      is_related_party BOOLEAN DEFAULT FALSE,
      comparable_goods_value DECIMAL(15,2),
      comparable_goods_reference VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ Created duty_calculations and customs_valuations tables');
}

export async function down() {
  const db = DatabaseService.getInstance();
  
  await db.run('DROP TABLE IF EXISTS customs_valuations');
  await db.run('DROP TABLE IF EXISTS duty_calculations');
  
  console.log('✅ Dropped duty_calculations and customs_valuations tables');
}

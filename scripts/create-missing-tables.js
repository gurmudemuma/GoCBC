#!/usr/bin/env node
// Create missing PostgreSQL tables for dual-source data fetching

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function createMissingTables() {
  console.log('=== Creating Missing PostgreSQL Tables ===\n');

  const tables = [
    {
      name: 'letters_of_credit',
      sql: `
        CREATE TABLE IF NOT EXISTS letters_of_credit (
          lc_id VARCHAR(255) PRIMARY KEY,
          contract_id VARCHAR(255),
          exporter_id VARCHAR(255),
          bank_name VARCHAR(255),
          issuing_bank VARCHAR(255),
          advising_bank VARCHAR(255),
          beneficiary_bank VARCHAR(255),
          amount DECIMAL(15,2),
          currency VARCHAR(10),
          status VARCHAR(50),
          expiry_date TIMESTAMP,
          issue_date TIMESTAMP,
          request_date TIMESTAMP,
          terms TEXT,
          documents JSONB,
          amendments JSONB,
          discrepancies JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_lc_contract ON letters_of_credit(contract_id);
        CREATE INDEX IF NOT EXISTS idx_lc_exporter ON letters_of_credit(exporter_id);
        CREATE INDEX IF NOT EXISTS idx_lc_status ON letters_of_credit(status);
      `
    },
    {
      name: 'sales_contracts',
      sql: `
        CREATE TABLE IF NOT EXISTS sales_contracts (
          contract_id VARCHAR(255) PRIMARY KEY,
          exporter_id VARCHAR(255),
          buyer_id VARCHAR(255),
          buyer_name VARCHAR(255),
          buyer_country VARCHAR(100),
          buyer_bank VARCHAR(255),
          exporter_bank VARCHAR(255),
          coffee_type VARCHAR(100),
          quantity DECIMAL(15,2),
          price_per_kg DECIMAL(10,2),
          total_value DECIMAL(15,2),
          currency VARCHAR(10),
          status VARCHAR(50),
          contract_status VARCHAR(50),
          nbe_reference_number VARCHAR(255),
          registration_date TIMESTAMP,
          approval_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_contract_exporter ON sales_contracts(exporter_id);
        CREATE INDEX IF NOT EXISTS idx_contract_status ON sales_contracts(status);
      `
    },
    {
      name: 'exporters',
      sql: `
        CREATE TABLE IF NOT EXISTS exporters (
          exporter_id VARCHAR(255) PRIMARY KEY,
          company_name VARCHAR(255),
          license_number VARCHAR(255),
          license_status VARCHAR(50),
          tin_number VARCHAR(50),
          contact_person VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          registration_date TIMESTAMP,
          approval_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_exporter_license ON exporters(license_number);
        CREATE INDEX IF NOT EXISTS idx_exporter_status ON exporters(license_status);
      `
    },
    {
      name: 'advance_payments',
      sql: `
        CREATE TABLE IF NOT EXISTS advance_payments (
          payment_id VARCHAR(255) PRIMARY KEY,
          contract_id VARCHAR(255),
          exporter_id VARCHAR(255),
          lc_id VARCHAR(255),
          amount DECIMAL(15,2),
          currency VARCHAR(10),
          credit_advice_number VARCHAR(255),
          receiving_bank VARCHAR(255),
          receiving_bank_bic VARCHAR(50),
          paying_bank VARCHAR(255),
          paying_bank_bic VARCHAR(50),
          swift_reference VARCHAR(255),
          beneficiary_name VARCHAR(255),
          beneficiary_account VARCHAR(255),
          status VARCHAR(50),
          received_date TIMESTAMP,
          recorded_by VARCHAR(255),
          recorded_by_msp VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_advance_contract ON advance_payments(contract_id);
        CREATE INDEX IF NOT EXISTS idx_advance_exporter ON advance_payments(exporter_id);
      `
    },
    {
      name: 'consignment_payments',
      sql: `
        CREATE TABLE IF NOT EXISTS consignment_payments (
          consignment_id VARCHAR(255) PRIMARY KEY,
          exporter_id VARCHAR(255),
          permit_id VARCHAR(255),
          commodity_type VARCHAR(100),
          description TEXT,
          destination VARCHAR(255),
          buyer_name VARCHAR(255),
          buyer_address TEXT,
          permit_amount DECIMAL(15,2),
          currency VARCHAR(10),
          shipped_value DECIMAL(15,2),
          settled_amount DECIMAL(15,2),
          outstanding_amount DECIMAL(15,2),
          status VARCHAR(50),
          bank_branch VARCHAR(255),
          partial_payments JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_consignment_exporter ON consignment_payments(exporter_id);
        CREATE INDEX IF NOT EXISTS idx_consignment_status ON consignment_payments(status);
      `
    },
    {
      name: 'documentary_collections',
      sql: `
        CREATE TABLE IF NOT EXISTS documentary_collections (
          collection_id VARCHAR(255) PRIMARY KEY,
          contract_id VARCHAR(255),
          exporter_id VARCHAR(255),
          permit_id VARCHAR(255),
          drawer_name VARCHAR(255),
          drawee_name VARCHAR(255),
          drawee_address TEXT,
          payment_term VARCHAR(50),
          acceptance_days INTEGER,
          amount DECIMAL(15,2),
          currency VARCHAR(10),
          collecting_bank VARCHAR(255),
          collecting_bank_bic VARCHAR(50),
          remitting_bank VARCHAR(255),
          remitting_bank_bic VARCHAR(50),
          documents JSONB,
          instructions TEXT,
          status VARCHAR(50),
          sent_date TIMESTAMP,
          sent_by VARCHAR(255),
          sent_by_msp VARCHAR(50),
          due_date TIMESTAMP,
          charges_account VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_collection_contract ON documentary_collections(contract_id);
        CREATE INDEX IF NOT EXISTS idx_collection_exporter ON documentary_collections(exporter_id);
      `
    },
    {
      name: 'ecx_lots',
      sql: `
        CREATE TABLE IF NOT EXISTS ecx_lots (
          lot_number VARCHAR(255) PRIMARY KEY,
          exporter_id VARCHAR(255),
          warehouse_id VARCHAR(255),
          coffee_type VARCHAR(100),
          quantity DECIMAL(15,2),
          grade VARCHAR(50),
          cup_score DECIMAL(5,2),
          status VARCHAR(50),
          registration_date TIMESTAMP,
          grading_date TIMESTAMP,
          assignment_date TIMESTAMP,
          release_date TIMESTAMP,
          assigned_to VARCHAR(255),
          graded_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ecx_exporter ON ecx_lots(exporter_id);
        CREATE INDEX IF NOT EXISTS idx_ecx_status ON ecx_lots(status);
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}...`);
      await pool.query(table.sql);
      console.log(`✅ ${table.name} created`);
    } catch (error) {
      console.error(`❌ Error creating ${table.name}:`, error.message);
    }
  }

  await pool.end();
  console.log('\n✅ All tables created successfully!');
}

createMissingTables().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

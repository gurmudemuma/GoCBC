const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function fixTable() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to database');
    
    // Add missing columns to exporter_applications
    const queries = [
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS application_id VARCHAR(100) UNIQUE`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS tin_number VARCHAR(50)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS business_license_number VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS registration_date DATE`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS capital_requirement VARCHAR(50)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS professional_taster VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS taster_certificate VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS laboratory_facility VARCHAR(10) DEFAULT 'no'`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS laboratory_certificate_number VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS region VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS bank_branch_code VARCHAR(50)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS comments TEXT`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS exporter_type VARCHAR(20) DEFAULT 'company'`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS account_created BOOLEAN DEFAULT false`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS ecta_license_number VARCHAR(100)`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS license_issued_date TIMESTAMP`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS license_expiry_date TIMESTAMP`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS digital_signature TEXT`,
      `ALTER TABLE exporter_applications ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50)`
    ];

    for (const q of queries) {
      try {
        await client.query(q);
        console.log(`✅ Executed: ${q.substring(0, 50)}...`);
      } catch (err) {
        console.warn(`⚠️ Failed to execute: ${q.substring(0, 50)}... - ${err.message}`);
      }
    }

    // Populate application_id for existing rows if any
    await client.query(`UPDATE exporter_applications SET application_id = 'APP-' || id WHERE application_id IS NULL`);
    
    // Make application_id NOT NULL now that it's populated
    await client.query(`ALTER TABLE exporter_applications ALTER COLUMN application_id SET NOT NULL`);

    console.log('✅ exporter_applications table fixed successfully');
  } catch (error) {
    console.error('❌ Failed to fix table:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTable();

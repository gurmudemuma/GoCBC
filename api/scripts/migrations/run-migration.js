#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'gocbc_db',
  user: process.env.POSTGRES_USER || 'gocbc_user',
  password: process.env.POSTGRES_PASSWORD || 'gocbc_password_2024',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to database');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'fix-audit-trail-columns.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 Running migration...');
    const result = await client.query(sql);
    
    console.log('✅ Migration completed successfully');
    console.log(result);
    
    // Check the table structure
    console.log('\n📊 Current audit_trail table structure:');
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      ORDER BY ordinal_position
    `);
    
    console.table(structure.rows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

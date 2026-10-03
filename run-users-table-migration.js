#!/usr/bin/env node

/**
 * Run Users Table Schema Migration
 * This script applies migration 018 to fix the users table schema
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  
  const pool = new Pool({ connectionString });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    const client = await pool.connect();
    
    console.log('✅ Connected successfully');
    console.log('📋 Checking current users table schema...\n');

    // Check current columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Current users table columns:');
    console.log('----------------------------');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, 'api', 'src', 'migrations', '018_update_users_table_schema.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Applying migration 018_update_users_table_schema...\n');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Check updated columns
    const updatedColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Updated users table columns:');
    console.log('----------------------------');
    updatedColumnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if all required columns exist
    const requiredColumns = [
      'id', 'username', 'password_hash', 'email', 'full_name', 
      'role', 'organization', 'exporter_id', 'ecta_license', 
      'phone', 'permissions', 'status', 'last_login', 'created_at', 'updated_at'
    ];

    const existingColumns = updatedColumnsResult.rows.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Warning: Some required columns are still missing:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('\n✅ All required columns are present!');
    }

    // Test a simple query
    console.log('\n🧪 Testing SELECT query...');
    const testResult = await client.query(`
      SELECT id, username, email, full_name, role, organization, status
      FROM users
      LIMIT 3;
    `);

    console.log(`✅ Query successful! Found ${testResult.rows.length} users:`);
    testResult.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) - ${user.full_name || 'No name'}`);
    });

    client.release();
    console.log('\n✅ Migration completed successfully!');
    console.log('🔄 Please restart the API server for changes to take effect.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

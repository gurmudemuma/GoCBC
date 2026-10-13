#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123',
  connectionTimeoutMillis: 5000,
});

async function setupDatabase() {
  console.log('==========================================');
  console.log('CECBS Database Setup');
  console.log('==========================================\n');

  try {
    // Test connection
    console.log('🔍 Testing PostgreSQL connection...');
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected\n');

    // Count tables before
    console.log('📊 Checking current tables...');
    const beforeCount = await pool.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log(`   Found ${beforeCount.rows[0].count} tables\n`);

    // Run init-db.sql
    console.log('🔧 Running database initialization...');
    const sqlPath = path.join(__dirname, 'scripts', 'init-db.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.log(`❌ File not found: ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL (may have errors for existing tables - that's OK)
    try {
      await pool.query(sql);
      console.log('✅ Schema initialization completed\n');
    } catch (err) {
      // Ignore "already exists" errors
      if (err.message.includes('already exists')) {
        console.log('✅ Schema applied (some tables already existed)\n');
      } else {
        console.log(`⚠️ Schema errors (might be OK):\n   ${err.message}\n`);
      }
    }

    // Count tables after
    console.log('📊 Recounting tables...');
    const afterCount = await pool.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log(`   Total tables now: ${afterCount.rows[0].count}\n`);

    // Check critical tables
    console.log('🔍 Checking critical tables...');
    const criticalTables = [
      'users',
      'exporter_applications',
      'documents',
      'audit_trail',
      'sales_contracts',
      'shipments',
      'quality_inspections',
      'blockchain_sync_queue',
      'blockchain_cache'
    ];

    let allExist = true;
    for (const table of criticalTables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema='public' AND table_name=$1
        )`,
        [table]
      );
      
      const exists = result.rows[0].exists;
      if (exists) {
        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const rowCount = countResult.rows[0].count;
        console.log(`   ✅ ${table} (${rowCount} rows)`);
      } else {
        console.log(`   ❌ ${table} (MISSING)`);
        allExist = false;
      }
    }

    console.log('\n==========================================');
    if (allExist && afterCount.rows[0].count >= 30) {
      console.log('✅ DATABASE SETUP COMPLETE');
      console.log(`   ${afterCount.rows[0].count} tables ready`);
      console.log('   All critical tables exist');
    } else {
      console.log('⚠️ SETUP INCOMPLETE');
      console.log(`   ${afterCount.rows[0].count} tables (need 30+)`);
      if (!allExist) {
        console.log('   Some critical tables missing');
      }
    }
    console.log('==========================================\n');

    await pool.end();
    process.exit(allExist && afterCount.rows[0].count >= 30 ? 0 : 1);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();

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

async function completeSetup() {
  console.log('==========================================');
  console.log('CECBS Complete Database Initialization');
  console.log('==========================================\n');

  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await pool.query('SELECT version()');
    console.log('✅ Connected to PostgreSQL\n');

    // Count tables before
    const beforeResult = await pool.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log(`📊 Current tables: ${beforeResult.rows[0].count}\n`);

    // Run the full init-db.sql from scripts folder
    console.log('🔧 Running full schema initialization...');
    const initDbPath = path.join(__dirname, '..', 'scripts', 'init-db.sql');
    
    if (fs.existsSync(initDbPath)) {
      const initSql = fs.readFileSync(initDbPath, 'utf8');
      
      // Split by semicolons and execute each statement
      const statements = initSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      let created = 0;
      let existed = 0;
      let errors = 0;
      
      for (const statement of statements) {
        try {
          await pool.query(statement);
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            created++;
          }
        } catch (err) {
          if (err.message.includes('already exists')) {
            existed++;
          } else {
            errors++;
            if (errors <= 3) {
              console.log(`   ⚠️ Error: ${err.message.substring(0, 80)}...`);
            }
          }
        }
      }
      
      console.log(`   Created: ${created} new tables`);
      console.log(`   Existed: ${existed} tables already present`);
      if (errors > 0) {
        console.log(`   Errors: ${errors} (might be OK)\n`);
      } else {
        console.log('');
      }
    } else {
      console.log(`   ⚠️ File not found: ${initDbPath}\n`);
    }

    // Count tables after
    const afterResult = await pool.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
    );
    const finalCount = parseInt(afterResult.rows[0].count);
    console.log(`📊 Final table count: ${finalCount}\n`);

    // Check critical tables with row counts
    console.log('🔍 Verifying critical tables:\n');
    const criticalTables = [
      'users',
      'exporter_applications',
      'documents',
      'audit_trail',
      'sales_contracts',
      'export_contracts',
      'shipments',
      'quality_inspections',
      'blockchain_sync_queue',
      'blockchain_cache'
    ];

    let missing = [];
    for (const table of criticalTables) {
      try {
        const existsResult = await pool.query(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema='public' AND table_name=$1
          )`,
          [table]
        );
        
        if (existsResult.rows[0].exists) {
          try {
            const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ✅ ${table.padEnd(25)} (${countResult.rows[0].count} rows)`);
          } catch (e) {
            console.log(`   ✅ ${table.padEnd(25)} (exists)`);
          }
        } else {
          console.log(`   ❌ ${table.padEnd(25)} (MISSING)`);
          missing.push(table);
        }
      } catch (err) {
        console.log(`   ❌ ${table.padEnd(25)} (ERROR: ${err.message})`);
        missing.push(table);
      }
    }

    console.log('\n==========================================');
    if (missing.length === 0 && finalCount >= 30) {
      console.log('✅ DATABASE SETUP COMPLETE');
      console.log(`   ${finalCount} tables created`);
      console.log('   All critical tables exist');
      console.log('   System ready for use');
    } else {
      console.log('⚠️ SETUP INCOMPLETE');
      console.log(`   ${finalCount} tables (expected 30+)`);
      if (missing.length > 0) {
        console.log(`   ${missing.length} critical tables missing:`);
        missing.forEach(t => console.log(`     - ${t}`));
      }
    }
    console.log('==========================================\n');

    await pool.end();
    process.exit(missing.length === 0 && finalCount >= 30 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('   Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

completeSetup();

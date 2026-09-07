/**
 * Show ALL transactions - Simple version that works with actual schema
 */

const axios = require('axios');
const { Pool } = require('pg');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function showAllTransactions() {
  log('\n' + '='.repeat(80), 'blue');
  log('📊 COMPLETE DATABASE INVENTORY', 'blue');
  log('='.repeat(80) + '\n', 'blue');

  try {
    // Get all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    log('🗄️  POSTGRESQL DATABASE\n', 'cyan');

    const tableCounts = {};
    let totalRows = 0;

    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      try {
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const rowCount = parseInt(count.rows[0].count);
        tableCounts[tableName] = rowCount;
        totalRows += rowCount;

        if (rowCount > 0) {
          log(`📋 ${tableName.toUpperCase().replace(/_/g, ' ')}`, 'yellow');
          log(`   Total Records: ${rowCount}`, 'green');

          // Get sample records
          const sample = await pool.query(`SELECT * FROM ${tableName} LIMIT 3`);
          
          if (sample.rows.length > 0) {
            sample.rows.forEach((row, idx) => {
              // Get the primary key (first column with _id)
              const idField = Object.keys(row).find(k => k.endsWith('_id')) || Object.keys(row)[0];
              const idValue = row[idField];
              
              // Get status field if exists
              const statusField = Object.keys(row).find(k => k === 'status' || k.includes('status'));
              const statusValue = statusField ? row[statusField] : '';
              
              const statusStr = statusValue ? ` | Status: ${statusValue}` : '';
              log(`   - ${idValue}${statusStr}`, 'reset');
            });
            
            if (rowCount > 3) {
              log(`   ... and ${rowCount - 3} more records`, 'reset');
            }
          }
          log('', 'reset');
        }
      } catch (err) {
        log(`   ⚠️  Could not query ${tableName}: ${err.message}`, 'yellow');
      }
    }

    log('-'.repeat(80), 'blue');
    log('📊 POSTGRESQL SUMMARY', 'cyan');
    log('-'.repeat(80), 'blue');
    
    // Sort by count descending
    const sortedTables = Object.entries(tableCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    sortedTables.forEach(([table, count]) => {
      log(`${table}: ${count}`, 'reset');
    });
    
    log(`\n🎯 Total Tables: ${tables.rows.length}`, 'green');
    log(`🎯 Total Records: ${totalRows}`, 'green');

    // ==================== BLOCKCHAIN ====================
    log('\n' + '='.repeat(80), 'blue');
    log('⛓️  BLOCKCHAIN DATABASE (CouchDB)', 'cyan');
    log('='.repeat(80) + '\n', 'blue');

    const couchResp = await axios.get(
      'http://localhost:5984/coffeechannel_coffee/_all_docs?limit=1000',
      { auth: { username: 'admin', password: 'adminpw' } }
    );

    const blockchainIds = couchResp.data.rows.map(r => r.id).filter(id => !id.startsWith('_design'));

    // Categorize
    const categories = {
      'Sales Contracts (CONTRACT_)': blockchainIds.filter(id => id.startsWith('CONTRACT_CON-')),
      'Audit Trail: Contracts': blockchainIds.filter(id => id.startsWith('AUDIT_CONTRACT_') && !id.includes('LATEST')),
      'Audit Trail: Exporters': blockchainIds.filter(id => id.startsWith('AUDIT_EXPORTER_EXP')),
      'Audit Trail: Applications': blockchainIds.filter(id => id.startsWith('AUDIT_EXPORTER_APPLICATION_')),
      'Audit Trail: Customs': blockchainIds.filter(id => id.startsWith('AUDIT_CUSTOMS_')),
      'Audit Trail: Quality': blockchainIds.filter(id => id.startsWith('AUDIT_QUALITY_')),
      'Audit Trail: Documents': blockchainIds.filter(id => id.startsWith('AUDIT_DOCUMENT_')),
      'Audit Trail: Payments': blockchainIds.filter(id => id.startsWith('AUDIT_PAYMENT_')),
      'Audit Trail: LC/Banking': blockchainIds.filter(id => id.startsWith('AUDIT_LC_') || id.startsWith('AUDIT_LETTER_OF_CREDIT_') || id.startsWith('AUDIT_FOREX_')),
      'Forex Allocations (FOREX_)': blockchainIds.filter(id => id.startsWith('FOREX_') && !id.startsWith('FOREX_ALLOCATION')),
      'Shipments (SHIPMENT_)': blockchainIds.filter(id => id.startsWith('SHIPMENT_')),
      'Payments (PAYMENT_)': blockchainIds.filter(id => id.startsWith('PAYMENT_')),
      'ECX Lots (LOT_)': blockchainIds.filter(id => id.startsWith('LOT_')),
      'Letters of Credit (LC_)': blockchainIds.filter(id => id.startsWith('LC_') && !id.startsWith('LC-')),
      'Latest State Pointers': blockchainIds.filter(id => id.includes('LATEST')),
    };

    Object.entries(categories).forEach(([category, ids]) => {
      if (ids.length > 0) {
        log(`📋 ${category}`, 'yellow');
        log(`   Total: ${ids.length}`, 'green');
        ids.slice(0, 2).forEach(id => {
          log(`   - ${id}`, 'reset');
        });
        if (ids.length > 2) {
          log(`   ... and ${ids.length - 2} more`, 'reset');
        }
        log('', 'reset');
      }
    });

    const totalBlockchain = Object.values(categories).reduce((sum, ids) => sum + ids.length, 0);

    log('-'.repeat(80), 'blue');
    log('📊 BLOCKCHAIN SUMMARY', 'cyan');
    log('-'.repeat(80), 'blue');
    log(`Total Blockchain Records: ${couchResp.data.total_rows}`, 'green');
    log(`Categorized Entities: ${totalBlockchain}`, 'green');
    
    Object.entries(categories).forEach(([category, ids]) => {
      if (ids.length > 0) {
        log(`${category}: ${ids.length}`, 'reset');
      }
    });

    // GRAND SUMMARY
    log('\n' + '='.repeat(80), 'blue');
    log('🎯 GRAND SUMMARY', 'cyan');
    log('='.repeat(80), 'blue');
    log(`PostgreSQL Records: ${totalRows}`, 'green');
    log(`Blockchain Records: ${couchResp.data.total_rows}`, 'green');
    log(`Combined Total: ${totalRows + couchResp.data.total_rows}`, 'green');
    log('='.repeat(80) + '\n', 'blue');

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await pool.end();
  }
}

showAllTransactions();

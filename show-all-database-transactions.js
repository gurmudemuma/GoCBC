/**
 * Show ALL transactions in PostgreSQL database and Blockchain
 * Complete inventory of all entities across the system
 */

const axios = require('axios');
const { Pool } = require('pg');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// PostgreSQL connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function showAllTransactions() {
  log('\n' + '='.repeat(80), 'blue');
  log('📊 COMPLETE DATABASE INVENTORY - ALL TRANSACTIONS', 'blue');
  log('='.repeat(80) + '\n', 'blue');

  try {
    // ==================== POSTGRESQL DATABASE ====================
    log('🗄️  POSTGRESQL DATABASE\n', 'cyan');

    // 1. Exporter Applications
    log('1️⃣  EXPORTER APPLICATIONS', 'yellow');
    const applications = await pool.query(`
      SELECT application_id, exporter_id, company_name, status, 
             created_at, approved_at
      FROM exporter_applications 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${applications.rows.length}`, 'green');
    if (applications.rows.length > 0) {
      applications.rows.forEach((app, idx) => {
        if (idx < 5) { // Show first 5
          log(`   - ${app.application_id} | ${app.company_name} | Status: ${app.status}`, 'reset');
        }
      });
      if (applications.rows.length > 5) {
        log(`   ... and ${applications.rows.length - 5} more`, 'reset');
      }
    }

    // 2. Exporters
    log('\n2️⃣  EXPORTERS', 'yellow');
    const exporters = await pool.query(`
      SELECT exporter_id, company_name, registration_status, created_at
      FROM exporters 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${exporters.rows.length}`, 'green');
    if (exporters.rows.length > 0) {
      exporters.rows.forEach((exp, idx) => {
        if (idx < 5) {
          log(`   - ${exp.exporter_id} | ${exp.company_name} | Status: ${exp.registration_status}`, 'reset');
        }
      });
      if (exporters.rows.length > 5) {
        log(`   ... and ${exporters.rows.length - 5} more`, 'reset');
      }
    }

    // 3. Sales Contracts
    log('\n3️⃣  SALES CONTRACTS', 'yellow');
    const contracts = await pool.query(`
      SELECT contract_id, exporter_id, buyer_country, quantity, 
             price_per_kg, currency, status, created_at
      FROM sales_contracts 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${contracts.rows.length}`, 'green');
    if (contracts.rows.length > 0) {
      contracts.rows.forEach((con, idx) => {
        if (idx < 5) {
          log(`   - ${con.contract_id} | Qty: ${con.quantity}kg @ $${con.price_per_kg} | Status: ${con.status}`, 'reset');
        }
      });
      if (contracts.rows.length > 5) {
        log(`   ... and ${contracts.rows.length - 5} more`, 'reset');
      }
    }

    // 4. ECX Lots
    log('\n4️⃣  ECX LOTS', 'yellow');
    const lots = await pool.query(`
      SELECT lot_id, contract_id, coffee_type, quantity, 
             grade, warehouse_location, status, created_at
      FROM ecx_lots 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${lots.rows.length}`, 'green');
    if (lots.rows.length > 0) {
      lots.rows.forEach((lot, idx) => {
        if (idx < 5) {
          log(`   - ${lot.lot_id} | ${lot.coffee_type} | Grade: ${lot.grade} | ${lot.quantity}kg | Status: ${lot.status}`, 'reset');
        }
      });
      if (lots.rows.length > 5) {
        log(`   ... and ${lots.rows.length - 5} more`, 'reset');
      }
    }

    // 5. Letters of Credit
    log('\n5️⃣  LETTERS OF CREDIT', 'yellow');
    const lcs = await pool.query(`
      SELECT lc_id, contract_id, exporter_id, amount, currency,
             issuing_bank, status, created_at
      FROM letters_of_credit 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${lcs.rows.length}`, 'green');
    if (lcs.rows.length > 0) {
      lcs.rows.forEach((lc, idx) => {
        if (idx < 5) {
          log(`   - ${lc.lc_id} | ${lc.amount} ${lc.currency} | ${lc.issuing_bank} | Status: ${lc.status}`, 'reset');
        }
      });
      if (lcs.rows.length > 5) {
        log(`   ... and ${lcs.rows.length - 5} more`, 'reset');
      }
    }

    // 6. Forex Allocations
    log('\n6️⃣  FOREX ALLOCATIONS', 'yellow');
    const forex = await pool.query(`
      SELECT forex_id, lc_id, exporter_id, amount_usd, amount_etb,
             exchange_rate, status, created_at
      FROM forex_allocations 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${forex.rows.length}`, 'green');
    if (forex.rows.length > 0) {
      forex.rows.forEach((fx, idx) => {
        if (idx < 5) {
          log(`   - ${fx.forex_id} | USD ${fx.amount_usd} → ETB ${fx.amount_etb} | Rate: ${fx.exchange_rate} | Status: ${fx.status}`, 'reset');
        }
      });
      if (forex.rows.length > 5) {
        log(`   ... and ${forex.rows.length - 5} more`, 'reset');
      }
    }

    // 7. Shipments
    log('\n7️⃣  SHIPMENTS', 'yellow');
    const shipments = await pool.query(`
      SELECT shipment_id, contract_id, lot_id, 
             departure_port, destination_port, status, created_at
      FROM shipments 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${shipments.rows.length}`, 'green');
    if (shipments.rows.length > 0) {
      shipments.rows.forEach((ship, idx) => {
        if (idx < 5) {
          log(`   - ${ship.shipment_id} | ${ship.departure_port} → ${ship.destination_port} | Status: ${ship.status}`, 'reset');
        }
      });
      if (shipments.rows.length > 5) {
        log(`   ... and ${shipments.rows.length - 5} more`, 'reset');
      }
    }

    // 8. Customs Declarations
    log('\n8️⃣  CUSTOMS DECLARATIONS', 'yellow');
    const declarations = await pool.query(`
      SELECT declaration_id, shipment_id, customs_officer_id,
             clearance_status, created_at
      FROM customs_declarations 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${declarations.rows.length}`, 'green');
    if (declarations.rows.length > 0) {
      declarations.rows.forEach((decl, idx) => {
        if (idx < 5) {
          log(`   - ${decl.declaration_id} | Shipment: ${decl.shipment_id} | Status: ${decl.clearance_status}`, 'reset');
        }
      });
      if (declarations.rows.length > 5) {
        log(`   ... and ${declarations.rows.length - 5} more`, 'reset');
      }
    }

    // 9. Customs Clearances
    log('\n9️⃣  CUSTOMS CLEARANCES', 'yellow');
    const clearances = await pool.query(`
      SELECT clearance_id, shipment_id, declaration_id,
             clearance_status, cleared_at
      FROM customs_clearances 
      ORDER BY cleared_at DESC NULLS LAST
    `);
    log(`   Total: ${clearances.rows.length}`, 'green');
    if (clearances.rows.length > 0) {
      clearances.rows.forEach((clear, idx) => {
        if (idx < 5) {
          log(`   - ${clear.clearance_id} | Status: ${clear.clearance_status}`, 'reset');
        }
      });
      if (clearances.rows.length > 5) {
        log(`   ... and ${clearances.rows.length - 5} more`, 'reset');
      }
    }

    // 10. Quality Inspections
    log('\n🔟 QUALITY INSPECTIONS', 'yellow');
    const inspections = await pool.query(`
      SELECT inspection_id, lot_id, inspector_id,
             inspection_status, created_at
      FROM quality_inspections 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${inspections.rows.length}`, 'green');
    if (inspections.rows.length > 0) {
      inspections.rows.forEach((insp, idx) => {
        if (idx < 5) {
          log(`   - ${insp.inspection_id} | Lot: ${insp.lot_id} | Status: ${insp.inspection_status}`, 'reset');
        }
      });
      if (inspections.rows.length > 5) {
        log(`   ... and ${inspections.rows.length - 5} more`, 'reset');
      }
    }

    // 11. Payments
    log('\n1️⃣1️⃣  PAYMENTS', 'yellow');
    const payments = await pool.query(`
      SELECT payment_id, lc_id, amount, currency,
             payment_status, created_at
      FROM payments 
      ORDER BY created_at DESC
    `);
    log(`   Total: ${payments.rows.length}`, 'green');
    if (payments.rows.length > 0) {
      payments.rows.forEach((pay, idx) => {
        if (idx < 5) {
          log(`   - ${pay.payment_id} | ${pay.amount} ${pay.currency} | Status: ${pay.payment_status}`, 'reset');
        }
      });
      if (payments.rows.length > 5) {
        log(`   ... and ${payments.rows.length - 5} more`, 'reset');
      }
    }

    // 12. Documents
    log('\n1️⃣2️⃣  DOCUMENTS', 'yellow');
    const documents = await pool.query(`
      SELECT document_id, entity_type, entity_id, 
             document_type, file_name, uploaded_at
      FROM documents 
      ORDER BY uploaded_at DESC
    `);
    log(`   Total: ${documents.rows.length}`, 'green');
    if (documents.rows.length > 0) {
      documents.rows.forEach((doc, idx) => {
        if (idx < 5) {
          log(`   - ${doc.document_id} | ${doc.document_type} | ${doc.file_name}`, 'reset');
        }
      });
      if (documents.rows.length > 5) {
        log(`   ... and ${documents.rows.length - 5} more`, 'reset');
      }
    }

    // 13. Audit Trail
    log('\n1️⃣3️⃣  AUDIT TRAIL', 'yellow');
    const audits = await pool.query(`
      SELECT audit_id, entity_type, entity_id, action,
             performed_by, created_at
      FROM audit_trail 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const auditCount = await pool.query(`SELECT COUNT(*) as count FROM audit_trail`);
    log(`   Total: ${auditCount.rows[0].count}`, 'green');
    if (audits.rows.length > 0) {
      log(`   Recent 10 entries:`, 'reset');
      audits.rows.forEach((audit) => {
        log(`   - ${audit.entity_type}:${audit.entity_id} | ${audit.action} by ${audit.performed_by}`, 'reset');
      });
    }

    // Summary
    log('\n' + '-'.repeat(80), 'blue');
    log('📊 POSTGRESQL SUMMARY', 'cyan');
    log('-'.repeat(80), 'blue');
    log(`Exporter Applications: ${applications.rows.length}`, 'reset');
    log(`Exporters: ${exporters.rows.length}`, 'reset');
    log(`Sales Contracts: ${contracts.rows.length}`, 'reset');
    log(`ECX Lots: ${lots.rows.length}`, 'reset');
    log(`Letters of Credit: ${lcs.rows.length}`, 'reset');
    log(`Forex Allocations: ${forex.rows.length}`, 'reset');
    log(`Shipments: ${shipments.rows.length}`, 'reset');
    log(`Customs Declarations: ${declarations.rows.length}`, 'reset');
    log(`Customs Clearances: ${clearances.rows.length}`, 'reset');
    log(`Quality Inspections: ${inspections.rows.length}`, 'reset');
    log(`Payments: ${payments.rows.length}`, 'reset');
    log(`Documents: ${documents.rows.length}`, 'reset');
    log(`Audit Trail Entries: ${auditCount.rows[0].count}`, 'reset');
    
    const totalPostgres = 
      applications.rows.length +
      exporters.rows.length +
      contracts.rows.length +
      lots.rows.length +
      lcs.rows.length +
      forex.rows.length +
      shipments.rows.length +
      declarations.rows.length +
      clearances.rows.length +
      inspections.rows.length +
      payments.rows.length +
      documents.rows.length;
    
    log(`\n🎯 Total Entities: ${totalPostgres}`, 'green');
    log(`🎯 Total Audit Entries: ${auditCount.rows[0].count}`, 'green');

    // ==================== BLOCKCHAIN DATABASE ====================
    log('\n' + '='.repeat(80), 'blue');
    log('⛓️  BLOCKCHAIN DATABASE (CouchDB)', 'cyan');
    log('='.repeat(80) + '\n', 'blue');

    const couchResp = await axios.get(
      'http://localhost:5984/coffeechannel_coffee/_all_docs?limit=1000',
      { auth: { username: 'admin', password: 'adminpw' } }
    );

    const blockchainIds = couchResp.data.rows.map(r => r.id).filter(id => !id.startsWith('_design'));

    // Categorize blockchain entities
    const blockchainTypes = {
      'Contracts': blockchainIds.filter(id => id.startsWith('CONTRACT_CON-')),
      'Audit: Contracts': blockchainIds.filter(id => id.startsWith('AUDIT_CONTRACT_') && !id.includes('LATEST')),
      'Audit: Exporters': blockchainIds.filter(id => id.startsWith('AUDIT_EXPORTER_EXP')),
      'Audit: Applications': blockchainIds.filter(id => id.startsWith('AUDIT_EXPORTER_APPLICATION_')),
      'Audit: Customs': blockchainIds.filter(id => id.startsWith('AUDIT_CUSTOMS_')),
      'Audit: Quality': blockchainIds.filter(id => id.startsWith('AUDIT_QUALITY_')),
      'Audit: Documents': blockchainIds.filter(id => id.startsWith('AUDIT_DOCUMENT_')),
      'Audit: Payments': blockchainIds.filter(id => id.startsWith('AUDIT_PAYMENT_')),
      'Audit: LC': blockchainIds.filter(id => id.startsWith('AUDIT_LC_') || id.startsWith('AUDIT_LETTER_OF_CREDIT_')),
      'Forex': blockchainIds.filter(id => id.startsWith('FOREX_')),
      'Shipments': blockchainIds.filter(id => id.startsWith('SHIPMENT_')),
      'Payments': blockchainIds.filter(id => id.startsWith('PAYMENT_')),
      'ECX Lots': blockchainIds.filter(id => id.startsWith('LOT_')),
      'Letters of Credit': blockchainIds.filter(id => id.startsWith('LC_') && !id.startsWith('LC-')),
      'Latest Pointers': blockchainIds.filter(id => id.includes('LATEST')),
      'Other': blockchainIds.filter(id => 
        !id.startsWith('CONTRACT_') && 
        !id.startsWith('AUDIT_') && 
        !id.startsWith('FOREX_') && 
        !id.startsWith('SHIPMENT_') && 
        !id.startsWith('PAYMENT_') && 
        !id.startsWith('LOT_') && 
        !id.startsWith('LC_') &&
        !id.includes('LATEST')
      )
    };

    Object.entries(blockchainTypes).forEach(([type, ids]) => {
      if (ids.length > 0) {
        log(`${type}: ${ids.length}`, 'yellow');
        ids.slice(0, 3).forEach(id => {
          log(`   - ${id}`, 'reset');
        });
        if (ids.length > 3) {
          log(`   ... and ${ids.length - 3} more`, 'reset');
        }
      }
    });

    log('\n' + '-'.repeat(80), 'blue');
    log('📊 BLOCKCHAIN SUMMARY', 'cyan');
    log('-'.repeat(80), 'blue');
    log(`Total Records on Blockchain: ${couchResp.data.total_rows}`, 'green');
    log(`Queryable Entities: ${blockchainIds.length}`, 'green');
    
    Object.entries(blockchainTypes).forEach(([type, ids]) => {
      if (ids.length > 0) {
        log(`${type}: ${ids.length}`, 'reset');
      }
    });

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await pool.end();
  }

  log('\n' + '='.repeat(80), 'blue');
  log('✅ INVENTORY COMPLETE', 'green');
  log('='.repeat(80) + '\n', 'blue');
}

showAllTransactions();

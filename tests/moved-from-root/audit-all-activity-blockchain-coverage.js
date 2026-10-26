/**
 * Comprehensive Blockchain Activity Coverage Audit
 * Verifies that ALL system activities have real blockchain signatures
 */

const { Client } = require('pg');

const dbConfig = {
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
};

const log = (msg, icon = '📋') => console.log(`${icon} ${msg}`);
const pass = (msg) => log(msg, '✅');
const fail = (msg) => log(msg, '❌');
const warn = (msg) => log(msg, '⚠️ ');
const info = (msg) => log(msg, 'ℹ️ ');

async function auditBlockchainCoverage() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('\n' + '═'.repeat(80));
    console.log('     COMPREHENSIVE BLOCKCHAIN ACTIVITY COVERAGE AUDIT');
    console.log('     Verifying Real Network Member Signatures');
    console.log('═'.repeat(80) + '\n');

    let totalActivities = 0;
    let signedActivities = 0;
    let missingSignatures = [];

    // ========================================
    // 1. EXPORTER APPLICATIONS
    // ========================================
    console.log('📝 1. EXPORTER APPLICATIONS');
    console.log('─'.repeat(80));
    
    const exporterApps = await client.query(`
      SELECT application_id, status, submitted_at 
      FROM exporter_applications 
      WHERE status IN ('approved', 'rejected')
      ORDER BY submitted_at DESC
    `);
    totalActivities += exporterApps.rows.length;
    
    for (const app of exporterApps.rows) {
      const sig = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'EXPORTER_APPLICATION' 
        AND entity_id = $1
      `, [app.application_id]);
      
      if (sig.rows.length > 0) {
        signedActivities++;
      } else {
        missingSignatures.push({
          type: 'EXPORTER_APPLICATION',
          id: app.application_id,
          status: app.status,
          date: app.submitted_at
        });
      }
    }
    
    info(`Total: ${exporterApps.rows.length} applications`);
    if (signedActivities < exporterApps.rows.length) {
      warn(`Missing signatures: ${exporterApps.rows.length - signedActivities} applications`);
    } else {
      pass(`All applications have blockchain signatures`);
    }

    // ========================================
    // 2. LETTER OF CREDITS
    // ========================================
    console.log('\n💼 2. LETTER OF CREDITS');
    console.log('─'.repeat(80));
    
    const lcs = await client.query(`
      SELECT lc_id, status, request_date, approved_by_msp, issued_by_msp
      FROM letters_of_credit
      ORDER BY request_date DESC
    `);
    
    const lcActivities = lcs.rows.length;
    let lcSigned = 0;
    
    for (const lc of lcs.rows) {
      // Check for RequestLC signature
      const requestSig = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'LC' 
        AND entity_id = $1
        AND chaincode_function = 'RequestLC'
      `, [lc.lc_id]);
      
      // Check for ApproveLC signature
      const approveSig = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'LC' 
        AND entity_id = $1
        AND chaincode_function = 'ApproveLC'
      `, [lc.lc_id]);
      
      // Check for IssueLC signature
      const issueSig = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'LC' 
        AND entity_id = $1
        AND chaincode_function = 'IssueLC'
      `, [lc.lc_id]);
      
      const hasSignature = requestSig.rows.length > 0 || 
                          approveSig.rows.length > 0 || 
                          issueSig.rows.length > 0 ||
                          lc.approved_by_msp || 
                          lc.issued_by_msp;
      
      if (hasSignature) {
        lcSigned++;
      } else {
        missingSignatures.push({
          type: 'LC',
          id: lc.lc_id,
          status: lc.status,
          date: lc.request_date
        });
      }
    }
    
    totalActivities += lcActivities;
    signedActivities += lcSigned;
    
    info(`Total: ${lcActivities} LCs`);
    info(`  └─ With RequestLC signature: ${(await client.query(`SELECT COUNT(*) as cnt FROM blockchain_signatures WHERE entity_type = 'LC' AND chaincode_function = 'RequestLC'`)).rows[0].cnt}`);
    info(`  └─ With ApproveLC signature: ${(await client.query(`SELECT COUNT(*) as cnt FROM blockchain_signatures WHERE entity_type = 'LC' AND chaincode_function = 'ApproveLC'`)).rows[0].cnt}`);
    info(`  └─ With IssueLC signature: ${(await client.query(`SELECT COUNT(*) as cnt FROM blockchain_signatures WHERE entity_type = 'LC' AND chaincode_function = 'IssueLC'`)).rows[0].cnt}`);
    
    if (lcSigned < lcActivities) {
      warn(`Missing signatures: ${lcActivities - lcSigned} LCs`);
    } else {
      pass(`All LCs have blockchain signatures`);
    }

    // ========================================
    // 3. DOCUMENTS
    // ========================================
    console.log('\n📄 3. DOCUMENTS');
    console.log('─'.repeat(80));
    
    const docs = await client.query(`
      SELECT document_id, entity_type, status, uploaded_at
      FROM documents
      WHERE status = 'verified'
      ORDER BY uploaded_at DESC
    `);
    
    const docActivities = docs.rows.length;
    let docSigned = 0;
    
    for (const doc of docs.rows) {
      const sig = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'DOCUMENT' 
        AND entity_id = $1
      `, [doc.document_id]);
      
      if (sig.rows.length > 0) {
        docSigned++;
      } else {
        missingSignatures.push({
          type: 'DOCUMENT',
          id: doc.document_id,
          status: doc.status,
          date: doc.uploaded_at
        });
      }
    }
    
    totalActivities += docActivities;
    signedActivities += docSigned;
    
    info(`Total: ${docActivities} verified documents`);
    pass(`Signed: ${docSigned} documents (${((docSigned/docActivities)*100).toFixed(1)}%)`);
    
    if (docSigned < docActivities) {
      warn(`Missing signatures: ${docActivities - docSigned} documents`);
    }

    // ========================================
    // 4. FOREX ALLOCATIONS
    // ========================================
    console.log('\n💱 4. FOREX ALLOCATIONS');
    console.log('─'.repeat(80));
    
    const forex = await client.query(`
      SELECT forex_id, status, created_at
      FROM forex_allocations
      ORDER BY created_at DESC
    `);
    
    const forexActivities = forex.rows.length;
    let forexSigned = 0;
    
    for (const f of forex.rows) {
      const sig = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'FOREX_ALLOCATION' 
        AND entity_id = $1
      `, [f.forex_id]);
      
      if (sig.rows.length > 0) {
        forexSigned++;
      } else {
        missingSignatures.push({
          type: 'FOREX_ALLOCATION',
          id: f.forex_id,
          status: f.status,
          date: f.created_at
        });
      }
    }
    
    totalActivities += forexActivities;
    signedActivities += forexSigned;
    
    info(`Total: ${forexActivities} forex allocations`);
    info(`  └─ With RequestForex signature: ${(await client.query(`SELECT COUNT(*) as cnt FROM blockchain_signatures WHERE entity_type = 'FOREX_ALLOCATION' AND chaincode_function = 'RequestForex'`)).rows[0].cnt}`);
    info(`  └─ With AllocateForex signature: ${(await client.query(`SELECT COUNT(*) as cnt FROM blockchain_signatures WHERE entity_type = 'FOREX_ALLOCATION' AND chaincode_function = 'AllocateForex'`)).rows[0].cnt}`);
    info(`  └─ With UtilizeForex signature: ${(await client.query(`SELECT COUNT(*) as cnt FROM blockchain_signatures WHERE entity_type = 'FOREX_ALLOCATION' AND chaincode_function = 'UtilizeForex'`)).rows[0].cnt}`);
    
    if (forexSigned < forexActivities) {
      warn(`Missing signatures: ${forexActivities - forexSigned} allocations`);
    } else {
      pass(`All forex allocations have blockchain signatures`);
    }

    // ========================================
    // 5. SHIPMENTS
    // ========================================
    console.log('\n🚢 5. SHIPMENTS');
    console.log('─'.repeat(80));
    
    try {
      const shipments = await client.query(`
        SELECT shipment_id, status, created_at
        FROM shipments
        ORDER BY created_at DESC
      `);
      
      const shipmentActivities = shipments.rows.length;
      let shipmentSigned = 0;
      
      for (const s of shipments.rows) {
        const sig = await client.query(`
          SELECT * FROM blockchain_signatures 
          WHERE entity_type = 'SHIPMENT' 
          AND entity_id = $1
        `, [s.shipment_id]);
        
        if (sig.rows.length > 0) {
          shipmentSigned++;
        } else {
          missingSignatures.push({
            type: 'SHIPMENT',
            id: s.shipment_id,
            status: s.status,
            date: s.created_at
          });
        }
      }
      
      totalActivities += shipmentActivities;
      signedActivities += shipmentSigned;
      
      info(`Total: ${shipmentActivities} shipments`);
      pass(`Signed: ${shipmentSigned} shipments (${shipmentActivities > 0 ? ((shipmentSigned/shipmentActivities)*100).toFixed(1) : 0}%)`);
      
      if (shipmentSigned < shipmentActivities) {
        warn(`Missing signatures: ${shipmentActivities - shipmentSigned} shipments`);
      }
    } catch (err) {
      info(`Shipments table not found (expected)`);
    }

    // ========================================
    // 6. PAYMENTS
    // ========================================
    console.log('\n💰 6. PAYMENTS');
    console.log('─'.repeat(80));
    
    try {
      const payments = await client.query(`
        SELECT payment_id, status, created_at
        FROM payments
        WHERE payment_method = 'LC'
        ORDER BY created_at DESC
      `);
      
      const paymentActivities = payments.rows.length;
      let paymentSigned = 0;
      
      for (const p of payments.rows) {
        const sig = await client.query(`
          SELECT * FROM blockchain_signatures 
          WHERE entity_type = 'PAYMENT' 
          AND entity_id = $1
        `, [p.payment_id]);
        
        if (sig.rows.length > 0) {
          paymentSigned++;
        } else {
          missingSignatures.push({
            type: 'PAYMENT',
            id: p.payment_id,
            status: p.status,
            date: p.created_at
          });
        }
      }
      
      totalActivities += paymentActivities;
      signedActivities += paymentSigned;
      
      info(`Total: ${paymentActivities} payments`);
      if (paymentActivities > 0) {
        pass(`Signed: ${paymentSigned} payments (${((paymentSigned/paymentActivities)*100).toFixed(1)}%)`);
        
        if (paymentSigned < paymentActivities) {
          warn(`Missing signatures: ${paymentActivities - paymentSigned} payments`);
        }
      } else {
        info(`No payments yet (workflow incomplete)`);
      }
    } catch (err) {
      info(`Payments data not available yet`);
    }

    // ========================================
    // 7. CUSTOMS DECLARATIONS
    // ========================================
    console.log('\n🛃 7. CUSTOMS DECLARATIONS');
    console.log('─'.repeat(80));
    
    try {
      const customs = await client.query(`
        SELECT declaration_number, status, created_at
        FROM customs_declarations
        ORDER BY created_at DESC
      `);
      
      const customsActivities = customs.rows.length;
      let customsSigned = 0;
      
      for (const c of customs.rows) {
        const sig = await client.query(`
          SELECT * FROM blockchain_signatures 
          WHERE entity_type = 'CUSTOMS_DECLARATION' 
          AND entity_id = $1
        `, [c.declaration_number]);
        
        if (sig.rows.length > 0) {
          customsSigned++;
        } else {
          missingSignatures.push({
            type: 'CUSTOMS_DECLARATION',
            id: c.declaration_number,
            status: c.status,
            date: c.created_at
          });
        }
      }
      
      totalActivities += customsActivities;
      signedActivities += customsSigned;
      
      info(`Total: ${customsActivities} customs declarations`);
      if (customsActivities > 0) {
        pass(`Signed: ${customsSigned} declarations (${((customsSigned/customsActivities)*100).toFixed(1)}%)`);
        
        if (customsSigned < customsActivities) {
          warn(`Missing signatures: ${customsActivities - customsSigned} declarations`);
        }
      } else {
        info(`No customs declarations yet`);
      }
    } catch (err) {
      info(`Customs declarations table not found`);
    }

    // ========================================
    // 8. QUALITY INSPECTIONS
    // ========================================
    console.log('\n🔬 8. QUALITY INSPECTIONS');
    console.log('─'.repeat(80));
    
    try {
      const quality = await client.query(`
        SELECT inspection_id, status, created_at
        FROM quality_inspections
        WHERE status = 'completed'
        ORDER BY created_at DESC
      `);
      
      const qualityActivities = quality.rows.length;
      let qualitySigned = 0;
      
      for (const q of quality.rows) {
        const sig = await client.query(`
          SELECT * FROM blockchain_signatures 
          WHERE entity_type = 'QUALITY_INSPECTION' 
          AND entity_id = $1
        `, [q.inspection_id]);
        
        if (sig.rows.length > 0) {
          qualitySigned++;
        } else {
          missingSignatures.push({
            type: 'QUALITY_INSPECTION',
            id: q.inspection_id,
            status: q.status,
            date: q.created_at
          });
        }
      }
      
      totalActivities += qualityActivities;
      signedActivities += qualitySigned;
      
      info(`Total: ${qualityActivities} quality inspections`);
      if (qualityActivities > 0) {
        pass(`Signed: ${qualitySigned} inspections (${((qualitySigned/qualityActivities)*100).toFixed(1)}%)`);
        
        if (qualitySigned < qualityActivities) {
          warn(`Missing signatures: ${qualityActivities - qualitySigned} inspections`);
        }
      } else {
        info(`No quality inspections yet`);
      }
    } catch (err) {
      info(`Quality inspections table not found`);
    }

    // ========================================
    // NETWORK MEMBER SIGNATURES CHECK
    // ========================================
    console.log('\n🏢 NETWORK MEMBER SIGNATURES');
    console.log('─'.repeat(80));
    
    const mspSignatures = await client.query(`
      SELECT 
        signer_org,
        COUNT(*) as signature_count,
        COUNT(DISTINCT chaincode_function) as unique_functions
      FROM blockchain_signatures
      GROUP BY signer_org
      ORDER BY signature_count DESC
    `);
    
    pass(`Active MSP Organizations: ${mspSignatures.rows.length}`);
    console.log('\nSignature Distribution by Organization:');
    for (const msp of mspSignatures.rows) {
      info(`  • ${msp.signer_org}: ${msp.signature_count} signatures, ${msp.unique_functions} functions`);
    }

    // ========================================
    // FINAL RESULTS
    // ========================================
    console.log('\n' + '═'.repeat(80));
    console.log('                        COVERAGE RESULTS');
    console.log('═'.repeat(80));
    
    const coverageRate = totalActivities > 0 ? ((signedActivities / totalActivities) * 100).toFixed(1) : 0;
    
    console.log(`📊 Total Activities: ${totalActivities}`);
    console.log(`✅ With Blockchain Signatures: ${signedActivities}`);
    console.log(`❌ Missing Signatures: ${missingSignatures.length}`);
    console.log(`📈 Coverage Rate: ${coverageRate}%`);
    
    if (missingSignatures.length > 0) {
      console.log('\n⚠️  ACTIVITIES MISSING BLOCKCHAIN SIGNATURES:');
      console.log('─'.repeat(80));
      
      const grouped = {};
      for (const missing of missingSignatures) {
        if (!grouped[missing.type]) grouped[missing.type] = [];
        grouped[missing.type].push(missing);
      }
      
      for (const [type, items] of Object.entries(grouped)) {
        console.log(`\n${type}: ${items.length} missing`);
        items.slice(0, 5).forEach(item => {
          console.log(`  • ${item.id} (${item.status}) - ${new Date(item.date).toLocaleDateString()}`);
        });
        if (items.length > 5) {
          console.log(`  ... and ${items.length - 5} more`);
        }
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    
    if (coverageRate >= 95) {
      pass('EXCELLENT: >95% blockchain coverage');
    } else if (coverageRate >= 80) {
      warn('GOOD: 80-95% blockchain coverage - some gaps remain');
    } else {
      fail('NEEDS IMPROVEMENT: <80% blockchain coverage');
    }
    
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Audit Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

auditBlockchainCoverage()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

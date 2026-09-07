#!/usr/bin/env node
/**
 * Fetch ALL blockchain signatures from both databases
 */

const axios = require('axios');
const { Pool } = require('pg');

const COUCHDB_URL = 'http://admin:adminpw@localhost:5984/coffeechannel_coffee';

async function fetchAllSignatures() {
  console.log('🔐 Fetching ALL Blockchain Signatures\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Connect to PostgreSQL
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123'
  });

  // 1. Fetch from PostgreSQL blockchain_signatures table
  console.log('1️⃣  POSTGRESQL blockchain_signatures table:\n');
  try {
    const pgSigs = await pool.query(`
      SELECT 
        entity_type,
        entity_id,
        action_type,
        signer_username,
        signer_org,
        blockchain_tx_id,
        blockchain_timestamp,
        chaincode_function,
        created_at
      FROM blockchain_signatures 
      ORDER BY created_at DESC
    `);
    
    console.log(`   ✅ Found ${pgSigs.rows.length} signatures in PostgreSQL\n`);
    
    if (pgSigs.rows.length > 0) {
      console.log('   Recent signatures:');
      pgSigs.rows.slice(0, 10).forEach((sig, i) => {
        console.log(`   ${i + 1}. ${sig.action_type} on ${sig.entity_type}/${sig.entity_id}`);
        console.log(`      By: ${sig.signer_username} (${sig.signer_org})`);
        console.log(`      TX: ${sig.blockchain_tx_id}`);
        console.log(`      Function: ${sig.chaincode_function}`);
        console.log(`      Time: ${sig.blockchain_timestamp || sig.created_at}`);
        console.log('');
      });
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // 2. Fetch audit log entries from blockchain (CouchDB)
  console.log('\n2️⃣  BLOCKCHAIN Audit Log (CouchDB):\n');
  try {
    const auditDocs = await axios.get(`${COUCHDB_URL}/_all_docs?limit=1000&include_docs=true`);
    const auditRecords = auditDocs.data.rows
      .filter(r => r.doc?.docType === 'audit' || r.id.startsWith('AUDIT_'))
      .map(r => r.doc);
    
    console.log(`   ✅ Found ${auditRecords.length} audit entries in blockchain\n`);
    
    if (auditRecords.length > 0) {
      console.log('   Recent audit entries:');
      auditRecords.slice(0, 10).forEach((audit, i) => {
        console.log(`   ${i + 1}. ${audit.actionType} on ${audit.entityType}/${audit.entityID}`);
        console.log(`      By: ${audit.performedBy} (${audit.performedByMsp})`);
        console.log(`      From: ${audit.fromStatus} → ${audit.toStatus}`);
        console.log(`      Time: ${audit.timestamp}`);
        console.log('');
      });
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // 3. Fetch all entity signatures from blockchain
  console.log('\n3️⃣  BLOCKCHAIN Entity Signatures:\n');
  
  const entityTypes = ['CONTRACT', 'SHIPMENT', 'LC', 'FOREX_ALLOCATION', 'PAYMENT', 'CUSTOMS', 'QUALITY'];
  
  for (const entityType of entityTypes) {
    try {
      const allDocs = await axios.get(`${COUCHDB_URL}/_all_docs?limit=1000&include_docs=true`);
      const entities = allDocs.data.rows
        .filter(r => {
          const doc = r.doc;
          if (entityType === 'CONTRACT') return doc?.docType === 'salesContract' || r.id.startsWith('CONTRACT');
          if (entityType === 'SHIPMENT') return doc?.docType === 'shipment' || r.id.startsWith('SHIPMENT');
          if (entityType === 'LC') return doc?.docType === 'lc' || r.id.startsWith('LC');
          if (entityType === 'FOREX_ALLOCATION') return doc?.docType === 'forexAllocation' || r.id.startsWith('FOREX');
          if (entityType === 'PAYMENT') return doc?.docType === 'payment' || r.id.startsWith('PAYMENT');
          if (entityType === 'CUSTOMS') return doc?.docType === 'customsClearance' || r.id.startsWith('CUSTOMS');
          if (entityType === 'QUALITY') return doc?.docType === 'qualityInspection' || r.id.startsWith('QUALITY');
          return false;
        })
        .map(r => r.doc);
      
      console.log(`   ${entityType}: ${entities.length} records with implicit blockchain signatures`);
      
      if (entities.length > 0 && entities.length <= 5) {
        entities.forEach(entity => {
          console.log(`      - ${entity._id} (version: ${entity['~version'] || 'N/A'})`);
        });
      }
    } catch (err) {
      console.log(`   ${entityType}: Error - ${err.message}`);
    }
  }

  // 4. Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY\n');
  
  try {
    const pgCount = await pool.query('SELECT COUNT(*) FROM blockchain_signatures');
    const pgAuditCount = await pool.query('SELECT COUNT(*) FROM audit_trail WHERE blockchain_tx_id IS NOT NULL');
    
    const allDocs = await axios.get(`${COUCHDB_URL}/_all_docs`);
    const bcAuditCount = allDocs.data.rows.filter(r => r.id.startsWith('AUDIT_')).length;
    const bcContractCount = allDocs.data.rows.filter(r => r.id.startsWith('CONTRACT')).length;
    const bcShipmentCount = allDocs.data.rows.filter(r => r.id.startsWith('SHIPMENT')).length;
    const bcLCCount = allDocs.data.rows.filter(r => r.id.startsWith('LC')).length;
    const bcForexCount = allDocs.data.rows.filter(r => r.id.startsWith('FOREX')).length;
    
    console.log('PostgreSQL:');
    console.log(`  - blockchain_signatures table: ${pgCount.rows[0].count} signatures`);
    console.log(`  - audit_trail with TX IDs: ${pgAuditCount.rows[0].count} records`);
    console.log('');
    console.log('Blockchain (CouchDB):');
    console.log(`  - Audit entries: ${bcAuditCount}`);
    console.log(`  - Contracts: ${bcContractCount} (each has implicit blockchain signature)`);
    console.log(`  - Shipments: ${bcShipmentCount}`);
    console.log(`  - LCs: ${bcLCCount}`);
    console.log(`  - Forex: ${bcForexCount}`);
    console.log(`  - TOTAL blockchain records: ${bcAuditCount + bcContractCount + bcShipmentCount + bcLCCount + bcForexCount}`);
    console.log('');
    console.log('💡 Every record in the blockchain is cryptographically signed');
    console.log('   with a transaction ID and immutable version number (~version)');
    
  } catch (err) {
    console.log('Error generating summary:', err.message);
  }

  await pool.end();
  console.log('\n✅ Signature fetch complete!');
}

fetchAllSignatures().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});

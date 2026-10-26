#!/usr/bin/env node

/**
 * Test N/A Fields - Check what data is missing
 */

const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

function apiRequest(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1${path}`,
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          resolve({ success: false, rawData: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function testNAFields() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║            TEST N/A FIELDS IN BANKS PORTAL                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get an LC from PostgreSQL
    const lc = await pool.query(`
      SELECT lc.*, sc.buyer_name, sc.buyer_bank, sc.exporter_bank
      FROM letters_of_credit lc
      LEFT JOIN sales_contracts sc ON lc.contract_id = sc.contract_id
      WHERE lc.status IN ('ISSUED', 'FOREX_ALLOCATED', 'UTILIZED')
      LIMIT 1
    `);

    if (lc.rows.length === 0) {
      console.log('❌ No LCs found for testing');
      return;
    }

    const lcData = lc.rows[0];
    console.log(`📋 Testing LC: ${lcData.lc_id}`);
    console.log(`   Status: ${lcData.status}`);
    console.log(`   Contract: ${lcData.contract_id}\n`);

    console.log('🔍 POSTGRESQL DATA:\n');
    console.log(`   issuing_bank: ${lcData.issuing_bank || '❌ NULL'}`);
    console.log(`   advising_bank: ${lcData.advising_bank || '❌ NULL'}`);
    console.log(`   approved_by: ${lcData.approved_by || '❌ NULL'}`);
    console.log(`   issued_by: ${lcData.issued_by || '❌ NULL'}`);
    console.log(`   buyer_name: ${lcData.buyer_name || '❌ NULL'}`);
    console.log(`   buyer_bank: ${lcData.buyer_bank || '❌ NULL'}`);
    console.log(`   exporter_bank: ${lcData.exporter_bank || '❌ NULL'}\n`);

    // Now try API
    console.log('🌐 API RESPONSE:\n');
    try {
      const apiResponse = await apiRequest(`/banking/lc/${lcData.lc_id}`);
      
      if (apiResponse.success && apiResponse.data) {
        const apiData = apiResponse.data;
        console.log(`   issuingBank: ${apiData.issuingBank || '❌ N/A'}`);
        console.log(`   advisingBank: ${apiData.advisingBank || '❌ N/A'}`);
        console.log(`   approvedBy: ${apiData.approvedBy || '❌ N/A'}`);
        console.log(`   issuedBy: ${apiData.issuedBy || '❌ N/A'}`);
        console.log(`   buyerName: ${apiData.buyerName || '❌ N/A'}`);
        console.log(`   buyerBank: ${apiData.buyerBank || '❌ N/A'}`);
        console.log(`   \n   Source: ${apiResponse.source}`);
        console.log(`   Fetch Time: ${apiResponse.fetchTimeMs}ms\n`);
      } else {
        console.log(`   ❌ API Error: ${apiResponse.error?.message || 'Unknown'}\n`);
      }
    } catch (apiError) {
      console.log(`   ❌ API call failed: ${apiError.message}\n`);
    }

    // Check SWIFT messages
    console.log('🔍 SWIFT MESSAGES:\n');
    const swiftMsgs = await pool.query(`
      SELECT message_id, swift_reference, sender_bic, receiver_bic, status
      FROM swift_messages
      ORDER BY created_at DESC
      LIMIT 3
    `);

    if (swiftMsgs.rows.length > 0) {
      swiftMsgs.rows.forEach((msg, idx) => {
        console.log(`   ${idx + 1}. ${msg.message_id}`);
        console.log(`      swift_reference: ${msg.swift_reference || '❌ NULL'}`);
        console.log(`      sender_bic: ${msg.sender_bic || '❌ NULL'}`);
        console.log(`      receiver_bic: ${msg.receiver_bic || '❌ NULL'}`);
        console.log(`      status: ${msg.status || '❌ NULL'}\n`);
      });
    } else {
      console.log('   No SWIFT messages found\n');
    }

    // Check forex allocations
    console.log('🔍 FOREX ALLOCATIONS:\n');
    const forex = await pool.query(`
      SELECT fa.forex_id, fa.lc_id, fa.exporter_id, sc.buyer_name
      FROM forex_allocations fa
      LEFT JOIN letters_of_credit lc ON fa.lc_id = lc.lc_id
      LEFT JOIN sales_contracts sc ON lc.contract_id = sc.contract_id
      ORDER BY fa.created_at DESC
      LIMIT 3
    `);

    if (forex.rows.length > 0) {
      forex.rows.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.forex_id}`);
        console.log(`      lc_id: ${f.lc_id || '❌ NULL'}`);
        console.log(`      exporter_id: ${f.exporter_id || '❌ NULL'}`);
        console.log(`      buyer_name: ${f.buyer_name || '❌ NULL'}\n`);
      });
    } else {
      console.log('   No forex allocations found\n');
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                      RECOMMENDATIONS                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('   1. If PostgreSQL has NULL values:');
    console.log('      → Run backfill scripts to populate from blockchain\n');
    
    console.log('   2. If API returns N/A but PostgreSQL has data:');
    console.log('      → Check field name mapping (PascalCase vs camelCase)\n');
    
    console.log('   3. If both are NULL/N/A:');
    console.log('      → Data never written to blockchain or PostgreSQL\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testNAFields().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

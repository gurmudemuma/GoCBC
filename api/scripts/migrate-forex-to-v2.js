/**
 * Migrate existing forex requests to _v2 format
 * This script creates new forex requests with _v2 suffix for all ISSUED LCs that don't have forex yet
 */

const { execSync } = require('child_process');
const path = require('path');

// Get auth token from environment or command line
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.argv[2];

if (!AUTH_TOKEN) {
  console.log('❌ Error: Auth token required');
  console.log('\nUsage:');
  console.log('  node migrate-forex-to-v2.js YOUR_AUTH_TOKEN');
  console.log('\nOr set environment variable:');
  console.log('  set AUTH_TOKEN=YOUR_TOKEN');
  console.log('  node migrate-forex-to-v2.js');
  process.exit(1);
}

const API_BASE = 'http://localhost:3001/api/v1';

async function migrateForexToV2() {
  console.log('🔄 Migrating Forex Requests to _v2 Format\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Get all LCs
    console.log('\n📋 Step 1: Fetching all Letter of Credits...');
    const lcResponse = await fetch(`${API_BASE}/banking/lc/all`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    
    const lcResult = await lcResponse.json();
    
    if (!lcResult.success) {
      throw new Error(`Failed to fetch LCs: ${lcResult.error?.message}`);
    }
    
    const issuedLCs = lcResult.data.filter(lc => lc.status === 'ISSUED');
    console.log(`✅ Found ${issuedLCs.length} ISSUED LC(s)`);
    
    // Step 2: Get all existing forex
    console.log('\n💱 Step 2: Fetching existing forex allocations...');
    const forexResponse = await fetch(`${API_BASE}/forex`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    
    const forexResult = await forexResponse.json();
    const existingForex = forexResult.success ? forexResult.data : [];
    console.log(`   Found ${existingForex.length} existing forex allocation(s)`);
    
    // Step 3: Create forex requests for LCs that don't have them
    console.log('\n🔧 Step 3: Creating new forex requests with _v2 suffix...');
    console.log('-'.repeat(60));
    
    let created = 0;
    let skipped = 0;
    
    for (const lc of issuedLCs) {
      // Check if forex already exists for this LC
      const hasForex = existingForex.some(f => f.lcId === lc.lcId);
      
      if (hasForex) {
        console.log(`⏩ Skipping ${lc.lcId} - forex already exists`);
        skipped++;
        continue;
      }
      
      // Create new forex request with _v2 suffix
      const forexId = `FOREX_${lc.lcId}_${Date.now()}_v2`;
      
      console.log(`\n🆕 Creating forex for LC: ${lc.lcId}`);
      console.log(`   Forex ID: ${forexId}`);
      console.log(`   Amount: ${lc.currency} ${lc.amount}`);
      
      try {
        const createResponse = await fetch(`${API_BASE}/forex/request`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            forexID: forexId,
            contractID: lc.contractId,
            exporterID: lc.exporterId,
            amount: lc.amount.toString(),
            currency: lc.currency
          })
        });
        
        const createResult = await createResponse.json();
        
        if (createResult.success) {
          console.log(`   ✅ Created successfully`);
          created++;
        } else {
          console.log(`   ❌ Failed: ${createResult.error?.message}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('-'.repeat(60));
    console.log(`Total ISSUED LCs: ${issuedLCs.length}`);
    console.log(`Forex created: ${created}`);
    console.log(`Skipped (already have forex): ${skipped}`);
    console.log(`\n✅ Migration complete!`);
    console.log('\nNext steps:');
    console.log('1. Refresh your browser');
    console.log('2. Go to Banking Operations → 3. Forex Allocation');
    console.log('3. You should now see the forex requests');
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. API server is running');
    console.error('2. Auth token is valid');
    console.error('3. You have permission to create forex requests');
  }
}

// Run migration
migrateForexToV2();

#!/usr/bin/env node
/**
 * Sync Buyer Names from PostgreSQL to Blockchain Contracts
 * 
 * This script:
 * 1. Loads contracts from blockchain
 * 2. Fetches buyer names from PostgreSQL buyers table
 * 3. Updates blockchain contracts with buyer names
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { FabricService } = require('./dist/services/fabricService');
const { DatabaseService } = require('./dist/services/databaseService');

async function syncBuyersToBlockchain() {
  console.log('🔄 Starting buyer data sync from PostgreSQL to Blockchain...\n');

  try {
    // Initialize services
    const fabricService = FabricService.getInstance();
    const db = DatabaseService.getInstance();

    // Step 1: Load all contracts from blockchain
    console.log('📦 Step 1: Loading contracts from blockchain...');
    const result = await fabricService.getAllContracts();
    
    if (!result.success || !result.data || result.data.length === 0) {
      console.log('⚠️  No contracts found in blockchain or blockchain query failed');
      return;
    }

    const blockchainContracts = result.data;
    console.log(`✅ Loaded ${blockchainContracts.length} contracts from blockchain\n`);

    // Step 2: Load buyer names from PostgreSQL
    console.log('📊 Step 2: Loading buyer names from PostgreSQL...');
    const buyers = await db.all(`
      SELECT buyer_id, company_name, country 
      FROM buyers
    `);
    
    const buyersMap = new Map(buyers.map(b => [b.buyer_id, {
      name: b.company_name,
      country: b.country
    }]));
    
    console.log(`✅ Loaded ${buyers.length} buyers from PostgreSQL`);
    console.log(`   Buyers: ${Array.from(buyersMap.keys()).join(', ')}\n`);

    // Step 3: Sync buyer data to blockchain contracts
    console.log('🔄 Step 3: Syncing buyer names to blockchain contracts...');
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const contract of blockchainContracts) {
      const contractId = contract.contractId || contract.ContractID;
      const buyerId = contract.buyerId || contract.BuyerID;

      if (!buyerId) {
        console.log(`  ⚠️  Skipping ${contractId}: no buyer ID`);
        skippedCount++;
        continue;
      }

      const buyerData = buyersMap.get(buyerId);
      
      if (!buyerData) {
        console.log(`  ⚠️  Skipping ${contractId}: buyer ${buyerId} not found in PostgreSQL`);
        skippedCount++;
        continue;
      }

      // Check if buyer name already exists
      const existingBuyerName = contract.buyerName || contract.BuyerName;
      if (existingBuyerName === buyerData.name) {
        console.log(`  ✓ ${contractId}: buyer name already synced (${buyerData.name})`);
        skippedCount++;
        continue;
      }

      // Update contract with buyer name
      try {
        const updateResult = await fabricService.updateContract(contractId, {
          buyerName: buyerData.name,
          buyerCountry: buyerData.country || contract.buyerCountry || contract.BuyerCountry
        });

        if (updateResult.success) {
          console.log(`  ✅ Updated ${contractId}: ${buyerId} → ${buyerData.name}`);
          updatedCount++;
        } else {
          console.log(`  ❌ Failed to update ${contractId}: ${updateResult.error}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`  ❌ Error updating ${contractId}: ${error.message}`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Sync Summary:');
    console.log('='.repeat(60));
    console.log(`Total Contracts:        ${blockchainContracts.length}`);
    console.log(`✅ Updated:             ${updatedCount}`);
    console.log(`⚠️  Skipped:             ${skippedCount}`);
    console.log(`❌ Errors:              ${errorCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncBuyersToBlockchain()
  .then(() => {
    console.log('\n✅ Buyer data sync completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });

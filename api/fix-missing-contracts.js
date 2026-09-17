#!/usr/bin/env node

/**
 * FIX MISSING CONTRACTS
 * Finds forex allocations with missing contracts and tries to fetch them from blockchain
 * If not found in blockchain, creates placeholder records to prevent "N/A" in UI
 */

const { Pool } = require('pg');
const { FabricService } = require('./dist/services/fabricService');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cecbs',
  user: process.env.DB_USER || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123',
});

async function fixMissingContracts() {
  console.log('🔍 Finding forex allocations with missing contracts...\n');
  
  // Find forex allocations where contract doesn't exist in sales_contracts
  const result = await pool.query(`
    SELECT DISTINCT
      fa.allocation_id,
      fa.contract_id,
      fa.exporter_id,
      sc.contract_id as existing_contract
    FROM forex_allocations fa
    LEFT JOIN sales_contracts sc ON fa.contract_id = sc.contract_id
    WHERE fa.contract_id IS NOT NULL 
      AND fa.contract_id != ''
      AND sc.contract_id IS NULL
  `);
  
  console.log(`Found ${result.rows.length} forex allocations with missing contracts:\n`);
  
  if (result.rows.length === 0) {
    console.log('✅ No missing contracts found!\n');
    return;
  }
  
  const fabricService = FabricService.getInstance();
  let fixed = 0;
  let placeholders = 0;
  
  for (const row of result.rows) {
    console.log(`\n📄 Processing: ${row.contract_id} (Forex: ${row.allocation_id})`);
    
    try {
      // Try to fetch from blockchain
      console.log('   Querying blockchain...');
      const bcResult = await fabricService.queryChaincode('ReadSalesContract', [row.contract_id]);
      
      if (bcResult.success && bcResult.data) {
        console.log('   ✅ Found in blockchain! Syncing...');
        const contract = bcResult.data;
        
        await pool.query(`
          INSERT INTO sales_contracts (
            contract_id, exporter_id, buyer_id, coffee_type, quantity, 
            price_per_kg, total_value, currency, contract_status,
            exporter_bank, registration_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
        `, [
          row.contract_id,
          contract.ExporterID || contract.exporterId || row.exporter_id,
          contract.BuyerID || contract.buyerId || 'UNKNOWN_BUYER',
          contract.CoffeeType || contract.coffeeType || 'Arabica',
          contract.Quantity || contract.quantity || 0,
          contract.PricePerKg || contract.pricePerKg || 0,
          contract.TotalValue || contract.totalValue || 0,
          contract.Currency || contract.currency || 'USD',
          contract.Status || contract.status || 'REGISTERED',
          contract.ExporterBank || contract.exporterBank || 'Commercial Bank of Ethiopia'
        ]);
        
        // Enrich with buyer name if buyer exists
        await pool.query(`
          UPDATE sales_contracts sc 
          SET buyer_name = b.company_name, buyer_country = b.country, updated_at = NOW()
          FROM buyers b 
          WHERE sc.contract_id = $1 AND sc.buyer_id = b.buyer_id
        `, [row.contract_id]);
        
        fixed++;
        console.log('   ✅ Contract synced successfully');
      } else {
        console.log(`   ⚠️  Not found in blockchain: ${bcResult.error || 'Contract does not exist'}`);
        console.log('   Creating placeholder contract to prevent UI errors...');
        
        // Check if exporter has other contracts to infer buyer
        const exporterContracts = await pool.query(`
          SELECT buyer_name, buyer_id 
          FROM sales_contracts 
          WHERE exporter_id = $1 AND buyer_name IS NOT NULL 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [row.exporter_id]);
        
        const inferredBuyer = exporterContracts.rows[0];
        const buyerName = inferredBuyer ? inferredBuyer.buyer_name : 'Unknown Buyer';
        const buyerId = inferredBuyer ? inferredBuyer.buyer_id : 'UNKNOWN_BUYER';
        
        await pool.query(`
          INSERT INTO sales_contracts (
            contract_id, exporter_id, buyer_id, buyer_name, coffee_type, 
            quantity, price_per_kg, total_value, currency, contract_status,
            exporter_bank, registration_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW())
        `, [
          row.contract_id,
          row.exporter_id,
          buyerId,
          buyerName,
          'Arabica',
          0, // quantity unknown
          0, // price unknown
          0, // total unknown
          'USD',
          'PLACEHOLDER', // Mark as placeholder
          'Commercial Bank of Ethiopia'
        ]);
        
        placeholders++;
        console.log(`   📋 Placeholder created with inferred buyer: ${buyerName}`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${row.contract_id}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Fixed ${fixed} contracts from blockchain`);
  console.log(`📋 Created ${placeholders} placeholder contracts`);
  console.log('='.repeat(60));
  console.log('\n🎉 Run this anytime you see "Unknown Buyer" in forex tables\n');
}

// Run the fix
fixMissingContracts()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

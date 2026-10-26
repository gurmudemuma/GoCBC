#!/usr/bin/env node

/**
 * COMPREHENSIVE CONTRACT SYNC: Blockchain → PostgreSQL
 * Syncs ALL contracts from blockchain to PostgreSQL with buyer enrichment
 */

const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cecbs',
  user: process.env.DB_USER || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123',
});

const COUCHDB_URL = 'http://admin:adminpw@localhost:5984';
const DB_NAME = 'coffeechannel_coffee';

async function syncAllContracts() {
  console.log('🔗 Syncing ALL contracts from blockchain to PostgreSQL...\n');
  
  try {
    // Fetch ALL contracts from CouchDB
    console.log('1️⃣  Fetching contracts from blockchain (CouchDB)...');
    const response = await axios.get(`${COUCHDB_URL}/${DB_NAME}/_all_docs`, {
      params: {
        startkey: '"CONTRACT_"',
        endkey: '"CONTRACT_\ufff0"',
        include_docs: true,
        limit: 10000
      },
      timeout: 30000
    });
    
    if (!response.data || !response.data.rows) {
      console.log('❌ No contracts found in blockchain');
      return;
    }
    
    const contracts = response.data.rows
      .filter(row => row.doc && !row.doc._id.startsWith('_'))
      .map(row => {
        const doc = row.doc;
        delete doc._id;
        delete doc._rev;
        delete doc['~version'];
        return doc;
      });
    
    console.log(`✅ Found ${contracts.length} contracts in blockchain\n`);
    
    if (contracts.length === 0) {
      console.log('ℹ️  No contracts to sync');
      return;
    }
    
    // Sync each contract to PostgreSQL
    console.log('2️⃣  Syncing to PostgreSQL...');
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const contract of contracts) {
      const contractId = contract.contractId || contract.ContractID || contract.contract_id;
      
      if (!contractId) {
        console.warn('  ⚠️  Skipping contract with no ID');
        skipped++;
        continue;
      }
      
      try {
        // Check if exists
        const existing = await pool.query(
          'SELECT contract_id FROM sales_contracts WHERE contract_id = $1',
          [contractId]
        );
        
        // Extract data
        const exporterId = contract.exporterId || contract.ExporterID || contract.exporter_id || 'UNKNOWN';
        const buyerId = contract.buyerId || contract.BuyerID || contract.buyer_id || null;
        const buyerName = contract.buyerName || contract.BuyerName || contract.buyer_name || null;
        const buyerCountry = contract.buyerCountry || contract.BuyerCountry || contract.buyer_country || null;
        const buyerBank = contract.buyerBank || contract.BuyerBank || contract.buyer_bank || null;
        const exporterBank = contract.exporterBank || contract.ExporterBank || contract.exporter_bank || null;
        const coffeeType = contract.coffeeType || contract.CoffeeType || contract.coffee_type || 'Arabica';
        const quantity = parseFloat(contract.quantity || contract.Quantity || 0);
        const pricePerKg = parseFloat(contract.pricePerKg || contract.PricePerKg || contract.price_per_kg || 0);
        const totalValue = parseFloat(contract.totalValue || contract.TotalValue || contract.total_value || 0);
        const currency = contract.currency || contract.Currency || 'USD';
        const status = contract.contractStatus || contract.status || contract.Status || 'REGISTERED';
        
        if (existing.rows.length > 0) {
          // Update existing
          await pool.query(`
            UPDATE sales_contracts SET
              exporter_id = $2,
              buyer_id = $3,
              buyer_name = $4,
              buyer_country = $5,
              buyer_bank = $6,
              exporter_bank = $7,
              coffee_type = $8,
              quantity = $9,
              price_per_kg = $10,
              total_value = $11,
              currency = $12,
              contract_status = $13,
              updated_at = NOW()
            WHERE contract_id = $1
          `, [
            contractId, exporterId, buyerId, buyerName, buyerCountry,
            buyerBank, exporterBank, coffeeType, quantity, pricePerKg,
            totalValue, currency, status
          ]);
          console.log(`  ✓ Updated: ${contractId}`);
          updated++;
        } else {
          // Insert new
          await pool.query(`
            INSERT INTO sales_contracts (
              contract_id, exporter_id, buyer_id, buyer_name, buyer_country,
              buyer_bank, exporter_bank, coffee_type, quantity, price_per_kg,
              total_value, currency, contract_status, registration_date,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())
          `, [
            contractId, exporterId, buyerId, buyerName, buyerCountry,
            buyerBank, exporterBank, coffeeType, quantity, pricePerKg,
            totalValue, currency, status
          ]);
          console.log(`  ✓ Inserted: ${contractId}`);
          inserted++;
        }
      } catch (err) {
        console.error(`  ✗ Failed: ${contractId}`, err.message);
        skipped++;
      }
    }
    
    console.log('\n✅ SYNC COMPLETE!');
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated:  ${updated}`);
    console.log(`   Skipped:  ${skipped}`);
    console.log(`   Total:    ${contracts.length}\n`);
    
    // Now enrich with buyer names from buyers table
    console.log('3️⃣  Enriching with buyer names from buyers table...');
    const enrichResult = await pool.query(`
      UPDATE sales_contracts sc
      SET buyer_name = b.company_name,
          buyer_country = COALESCE(sc.buyer_country, b.country),
          updated_at = NOW()
      FROM buyers b
      WHERE sc.buyer_id = b.buyer_id 
        AND (sc.buyer_name IS NULL OR sc.buyer_name = sc.buyer_id)
    `);
    
    console.log(`✅ Enriched ${enrichResult.rowCount} contracts with buyer names\n`);
    
    console.log('🎉 ALL DONE! Restart API and refresh browser to see buyer names.');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.status, error.response.data);
    }
  } finally {
    await pool.end();
  }
}

syncAllContracts();

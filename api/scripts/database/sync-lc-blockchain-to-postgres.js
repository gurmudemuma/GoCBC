#!/usr/bin/env node

/**
 * Sync Letter of Credit data FROM Blockchain TO PostgreSQL
 * This ensures both databases are in sync and the system works with dual-database architecture
 */

const { Pool } = require('pg');
const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cecbs',
  user: process.env.DB_USER || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123',
});

async function syncLCsFromBlockchain() {
  console.log('🔗 Connecting to Hyperledger Fabric blockchain...');
  
  try {
    // Load connection profile
    const ccpPath = path.resolve(__dirname, '..', 'blockchain', 'connection-profile.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    // Create wallet
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if admin identity exists
    const identity = await wallet.get('admin');
    if (!identity) {
      console.error('❌ Admin identity not found in wallet. Run enrollAdmin.js first.');
      process.exit(1);
    }
    
    // Connect to gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');
    
    console.log('✅ Connected to blockchain');
    console.log('📊 Querying all LCs from blockchain...');
    
    // Query all LCs from blockchain
    const result = await contract.evaluateTransaction('QueryAllLCs');
    const lcs = JSON.parse(result.toString());
    
    console.log(`✅ Found ${lcs.length} LCs on blockchain`);
    
    if (lcs.length === 0) {
      console.log('ℹ️  No LCs to sync');
      await gateway.disconnect();
      return;
    }
    
    // Sync each LC to PostgreSQL
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const lc of lcs) {
      const lcId = lc.lcId || lc.LCID || lc.id;
      if (!lcId) {
        console.warn('⚠️  Skipping LC with no ID');
        skippedCount++;
        continue;
      }
      
      try {
        // Check if LC already exists in PostgreSQL
        const existing = await pool.query(
          'SELECT lc_id FROM letters_of_credit WHERE lc_id = $1',
          [lcId]
        );
        
        if (existing.rows.length > 0) {
          // Update existing LC
          await pool.query(`
            UPDATE letters_of_credit SET
              contract_id = $2,
              exporter_id = $3,
              amount = $4,
              currency = $5,
              status = $6,
              issue_date = $7,
              expiry_date = $8,
              request_date = $9,
              issuing_bank = $10,
              advising_bank = $11,
              terms = $12,
              updated_at = NOW()
            WHERE lc_id = $1
          `, [
            lcId,
            lc.contractId || lc.ContractID || null,
            lc.exporterId || lc.ExporterID || null,
            lc.amount || 0,
            lc.currency || 'USD',
            lc.status || 'PENDING',
            lc.issueDate || lc.issue_date || null,
            lc.expiryDate || lc.expiry_date || null,
            lc.requestDate || lc.request_date || null,
            lc.issuingBank || lc.issuing_bank || null,
            lc.advisingBank || lc.advising_bank || null,
            lc.terms || null
          ]);
          console.log(`  ✓ Updated LC ${lcId}`);
        } else {
          // Insert new LC
          await pool.query(`
            INSERT INTO letters_of_credit (
              lc_id, contract_id, exporter_id, amount, currency, status,
              issue_date, expiry_date, request_date, issuing_bank, advising_bank, terms,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          `, [
            lcId,
            lc.contractId || lc.ContractID || null,
            lc.exporterId || lc.ExporterID || null,
            lc.amount || 0,
            lc.currency || 'USD',
            lc.status || 'PENDING',
            lc.issueDate || lc.issue_date || null,
            lc.expiryDate || lc.expiry_date || null,
            lc.requestDate || lc.request_date || null,
            lc.issuingBank || lc.issuing_bank || null,
            lc.advisingBank || lc.advising_bank || null,
            lc.terms || null
          ]);
          console.log(`  ✓ Inserted LC ${lcId}`);
        }
        
        syncedCount++;
      } catch (err) {
        console.error(`  ✗ Failed to sync LC ${lcId}:`, err.message);
        skippedCount++;
      }
    }
    
    console.log('\n✅ Sync complete!');
    console.log(`   Synced: ${syncedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${lcs.length}`);
    
    await gateway.disconnect();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    await pool.end();
    process.exit(1);
  }
}

syncLCsFromBlockchain();

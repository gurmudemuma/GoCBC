#!/usr/bin/env node
// Complete Backfill Script: Blockchain → PostgreSQL
// Syncs all existing blockchain data to PostgreSQL for fast queries

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

// Fabric service connection
const API_BASE = process.env.API_URL || 'http://localhost:3001/api/v1';

async function backfillLCs() {
  console.log('\n📋 Backfilling Letters of Credit...');
  
  try {
    // Try to get from blockchain (may timeout, that's OK)
    let lcs = [];
    try {
      const response = await axios.get(`${API_BASE}/banking/lc`, { timeout: 90000 });
      if (response.data.success && response.data.data) {
        lcs = response.data.data;
      }
    } catch (err) {
      console.log('⚠️  Could not fetch LCs from blockchain (timeout or error), skipping...');
      return;
    }
    
    console.log(`Found ${lcs.length} LCs on blockchain`);
    
    for (const lc of lcs) {
      try {
        await pool.query(
          `INSERT INTO letters_of_credit (
            lc_id, contract_id, exporter_id, issuing_bank, advising_bank,
            amount, currency, status, expiry_date, request_date, 
            approval_date, issue_date, terms, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          ON CONFLICT (lc_id) DO UPDATE SET
            contract_id = COALESCE(EXCLUDED.contract_id, letters_of_credit.contract_id),
            exporter_id = COALESCE(EXCLUDED.exporter_id, letters_of_credit.exporter_id),
            issuing_bank = COALESCE(EXCLUDED.issuing_bank, letters_of_credit.issuing_bank),
            advising_bank = COALESCE(EXCLUDED.advising_bank, letters_of_credit.advising_bank),
            amount = COALESCE(EXCLUDED.amount, letters_of_credit.amount),
            currency = COALESCE(EXCLUDED.currency, letters_of_credit.currency),
            status = COALESCE(EXCLUDED.status, letters_of_credit.status),
            updated_at = NOW()`,
          [
            lc.lcId, lc.contractId, lc.exporterId, lc.issuingBank, lc.advisingBank,
            lc.amount, lc.currency, lc.status, lc.expiryDate, lc.requestDate,
            lc.approvalDate, lc.issueDate, lc.terms
          ]
        );
        console.log(`✅ Synced LC: ${lc.lcId}`);
      } catch (err) {
        console.log(`❌ Failed to sync LC ${lc.lcId}:`, err.message);
      }
    }
    
    console.log(`✅ Backfilled ${lcs.length} LCs`);
  } catch (error) {
    console.error('❌ LC backfill failed:', error.message);
  }
}

async function backfillForex() {
  console.log('\n💱 Backfilling Forex Allocations...');
  
  try {
    let forex = [];
    try {
      const response = await axios.get(`${API_BASE}/forex`, { timeout: 90000 });
      if (response.data.success && response.data.data) {
        forex = response.data.data;
      }
    } catch (err) {
      console.log('⚠️  Could not fetch forex from blockchain (timeout or error), skipping...');
      return;
    }
    
    console.log(`Found ${forex.length} forex allocations on blockchain`);
    
    for (const fx of forex) {
      try {
        const amountEtb = (fx.allocatedAmount || fx.amount || 0) * (fx.exchangeRate || 115);
        
        await pool.query(
          `INSERT INTO forex_allocations (
            allocation_id, lc_number, contract_id, exporter_id,
            amount_usd, exchange_rate, amount_etb, allocation_date,
            approved_by, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (allocation_id) DO UPDATE SET
            lc_number = COALESCE(EXCLUDED.lc_number, forex_allocations.lc_number),
            contract_id = COALESCE(EXCLUDED.contract_id, forex_allocations.contract_id),
            exporter_id = COALESCE(EXCLUDED.exporter_id, forex_allocations.exporter_id),
            amount_usd = COALESCE(EXCLUDED.amount_usd, forex_allocations.amount_usd),
            updated_at = NOW()`,
          [
            fx.forexId, fx.lcId, fx.contractId, fx.exporterId,
            fx.allocatedAmount || fx.amount, fx.exchangeRate, amountEtb,
            fx.allocationDate || new Date().toISOString(),
            fx.nbeOfficer || 'NBE Officer', fx.status || 'ALLOCATED'
          ]
        );
        console.log(`✅ Synced Forex: ${fx.forexId}`);
      } catch (err) {
        console.log(`❌ Failed to sync forex ${fx.forexId}:`, err.message);
      }
    }
    
    console.log(`✅ Backfilled ${forex.length} forex allocations`);
  } catch (error) {
    console.error('❌ Forex backfill failed:', error.message);
  }
}

async function backfillContracts() {
  console.log('\n📄 Backfilling Contracts...');
  
  try {
    let contracts = [];
    try {
      const response = await axios.get(`${API_BASE}/contracts`, { timeout: 90000 });
      if (response.data.success && response.data.data) {
        contracts = response.data.data;
      }
    } catch (err) {
      console.log('⚠️  Could not fetch contracts from blockchain (timeout or error), skipping...');
      return;
    }
    
    console.log(`Found ${contracts.length} contracts on blockchain`);
    
    for (const contract of contracts) {
      try {
        await pool.query(
          `INSERT INTO sales_contracts (
            contract_id, exporter_id, buyer_id, buyer_country,
            coffee_type, quantity, price_per_kg, total_value, currency,
            status, registration_date, approval_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (contract_id) DO UPDATE SET
            exporter_id = COALESCE(EXCLUDED.exporter_id, sales_contracts.exporter_id),
            buyer_id = COALESCE(EXCLUDED.buyer_id, sales_contracts.buyer_id),
            status = COALESCE(EXCLUDED.status, sales_contracts.status),
            updated_at = NOW()`,
          [
            contract.contractId, contract.exporterId, contract.buyerId, contract.buyerCountry,
            contract.coffeeType, contract.quantity, contract.pricePerKg, contract.totalValue,
            contract.currency, contract.status, contract.registrationDate, contract.approvalDate
          ]
        );
        console.log(`✅ Synced Contract: ${contract.contractId}`);
      } catch (err) {
        console.log(`❌ Failed to sync contract ${contract.contractId}:`, err.message);
      }
    }
    
    console.log(`✅ Backfilled ${contracts.length} contracts`);
  } catch (error) {
    console.error('❌ Contract backfill failed:', error.message);
  }
}

async function main() {
  console.log('🔄 Starting Complete Blockchain → PostgreSQL Backfill');
  console.log('================================================\n');
  
  try {
    await backfillLCs();
    await backfillForex();
    await backfillContracts();
    
    console.log('\n================================================');
    console.log('✅ Backfill Complete!');
    console.log('================================================\n');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await pool.end();
  }
}

main();

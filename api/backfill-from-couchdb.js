#!/usr/bin/env node
// Direct CouchDB → PostgreSQL Sync
// Bypasses Fabric SDK timeout issues

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:adminpw@localhost:5984';
const COUCHDB_DB = 'coffeechannel_coffee';

async function fetchFromCouchDB(startKey, endKey, limit = 100) {
  try {
    const url = `${COUCHDB_URL}/${COUCHDB_DB}/_all_docs?include_docs=true&startkey="${startKey}"&endkey="${endKey}"&limit=${limit}`;
    const response = await axios.get(url);
    return response.data.rows.map(row => row.doc);
  } catch (error) {
    console.error(`Failed to fetch from CouchDB (${startKey}):`, error.message);
    return [];
  }
}

async function syncLCs() {
  console.log('\n📋 Syncing Letters of Credit from CouchDB...');
  
  try {
    const lcs = await fetchFromCouchDB('LC_', 'LC_\ufff0', 1000);
    console.log(`Found ${lcs.length} LCs in CouchDB`);
    
    let synced = 0;
    for (const lc of lcs) {
      try {
        await pool.query(
          `INSERT INTO letters_of_credit (
            lc_id, contract_id, exporter_id, issuing_bank, advising_bank,
            amount, currency, status, expiry_date, request_date,
            approval_date, issue_date, terms, 
            approved_by_msp, issued_by_msp, last_updated_by_msp,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (lc_id) DO UPDATE SET
            contract_id = EXCLUDED.contract_id,
            exporter_id = EXCLUDED.exporter_id,
            issuing_bank = EXCLUDED.issuing_bank,
            advising_bank = EXCLUDED.advising_bank,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            status = EXCLUDED.status,
            expiry_date = EXCLUDED.expiry_date,
            approval_date = EXCLUDED.approval_date,
            issue_date = EXCLUDED.issue_date,
            terms = EXCLUDED.terms,
            approved_by_msp = EXCLUDED.approved_by_msp,
            issued_by_msp = EXCLUDED.issued_by_msp,
            last_updated_by_msp = EXCLUDED.last_updated_by_msp,
            updated_at = NOW()`,
          [
            lc.lcId || lc.LCID,
            lc.contractId || lc.ContractID,
            lc.exporterId || lc.ExporterID,
            lc.issuingBank,
            lc.advisingBank,
            lc.amount,
            lc.currency || 'USD',
            lc.status,
            lc.expiryDate || null,
            lc.requestDate || null,
            lc.approvalDate || null,
            lc.issueDate || null,  // Handle empty string
            lc.terms || '',
            lc.approvedByMsp || lc.ApprovedByMsp || null,
            lc.issuedByMsp || lc.IssuedByMsp || null,
            lc.lastUpdatedByMsp || lc.LastUpdatedByMsp || null,
            lc.createdAt || new Date().toISOString(),
            lc.updatedAt || new Date().toISOString()
          ]
        );
        synced++;
        console.log(`✅ ${synced}/${lcs.length} - Synced LC: ${lc.lcId || lc.LCID} (${lc.exporterId})`);
      } catch (err) {
        console.log(`❌ Failed to sync LC ${lc.lcId}:`, err.message);
      }
    }
    
    console.log(`✅ Synced ${synced}/${lcs.length} LCs from CouchDB`);
  } catch (error) {
    console.error('❌ LC sync failed:', error.message);
  }
}

async function syncForex() {
  console.log('\n💱 Syncing Forex from CouchDB...');
  
  try {
    const forex = await fetchFromCouchDB('FOREX_', 'FOREX_\ufff0', 1000);
    console.log(`Found ${forex.length} forex allocations in CouchDB`);
    
    let synced = 0;
    for (const fx of forex) {
      try {
        const amountEtb = (fx.allocatedAmount || fx.amount || 0) * (fx.exchangeRate || 115);
        
        await pool.query(
          `INSERT INTO forex_allocations (
            allocation_id, lc_number, contract_id, exporter_id,
            amount_usd, exchange_rate, amount_etb, allocation_date,
            approved_by, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (allocation_id) DO UPDATE SET
            lc_number = EXCLUDED.lc_number,
            contract_id = EXCLUDED.contract_id,
            exporter_id = EXCLUDED.exporter_id,
            amount_usd = EXCLUDED.amount_usd,
            exchange_rate = EXCLUDED.exchange_rate,
            amount_etb = EXCLUDED.amount_etb,
            updated_at = NOW()`,
          [
            fx.forexId || fx.ForexID,
            fx.lcId || fx.LCID,
            fx.contractId || fx.ContractID,
            fx.exporterId || fx.ExporterID,
            fx.allocatedAmount || fx.amount,
            fx.exchangeRate || 115,
            amountEtb,
            fx.allocationDate || new Date().toISOString(),
            fx.nbeOfficer || 'NBE Officer',
            fx.status || 'ALLOCATED',
            fx.createdAt || new Date().toISOString(),
            fx.updatedAt || new Date().toISOString()
          ]
        );
        synced++;
        console.log(`✅ ${synced}/${forex.length} - Synced Forex: ${fx.forexId || fx.ForexID}`);
      } catch (err) {
        console.log(`❌ Failed to sync forex ${fx.forexId}:`, err.message);
      }
    }
    
    console.log(`✅ Synced ${synced}/${forex.length} forex allocations from CouchDB`);
  } catch (error) {
    console.error('❌ Forex sync failed:', error.message);
  }
}

async function syncContracts() {
  console.log('\n📄 Syncing Contracts from CouchDB...');
  
  try {
    const contracts = await fetchFromCouchDB('CONTRACT_', 'CONTRACT_\ufff0', 1000);
    console.log(`Found ${contracts.length} contracts in CouchDB`);
    
    let synced = 0;
    for (const contract of contracts) {
      try {
        await pool.query(
          `INSERT INTO sales_contracts (
            contract_id, exporter_id, buyer_id, buyer_country,
            coffee_type, quantity, price_per_kg, total_value, currency,
            status, registration_date, approval_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (contract_id) DO UPDATE SET
            exporter_id = EXCLUDED.exporter_id,
            buyer_id = EXCLUDED.buyer_id,
            status = EXCLUDED.status,
            updated_at = NOW()`,
          [
            contract.contractId || contract.ContractID,
            contract.exporterId || contract.ExporterID,
            contract.buyerId || contract.BuyerID,
            contract.buyerCountry,
            contract.coffeeType,
            contract.quantity,
            contract.pricePerKg,
            contract.totalValue,
            contract.currency || 'USD',
            contract.status || contract.contractStatus,
            contract.registrationDate || null,
            contract.approvalDate || null,
            contract.createdAt || new Date().toISOString(),
            contract.updatedAt || new Date().toISOString()
          ]
        );
        synced++;
        console.log(`✅ ${synced}/${contracts.length} - Synced Contract: ${contract.contractId} (${contract.exporterId})`);
      } catch (err) {
        console.log(`❌ Failed to sync contract ${contract.contractId}:`, err.message);
      }
    }
    
    console.log(`✅ Synced ${synced}/${contracts.length} contracts from CouchDB`);
  } catch (error) {
    console.error('❌ Contract sync failed:', error.message);
  }
}

async function main() {
  console.log('🔄 Direct CouchDB → PostgreSQL Sync');
  console.log('====================================\n');
  
  try {
    await syncLCs();
    await syncForex();
    await syncContracts();
    
    console.log('\n====================================');
    console.log('✅ Sync Complete!');
    console.log('====================================\n');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await pool.end();
  }
}

main();

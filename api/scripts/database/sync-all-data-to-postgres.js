#!/usr/bin/env node

/**
 * COMPREHENSIVE DATA SYNC: Blockchain → PostgreSQL
 * Syncs ALL data types across the entire system
 * Run this to ensure both databases are in sync
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

async function syncContracts() {
  console.log('📄 Syncing contracts...');
  const response = await axios.get(`${COUCHDB_URL}/${DB_NAME}/_all_docs`, {
    params: { startkey: '"CONTRACT_"', endkey: '"CONTRACT_\ufff0"', include_docs: true, limit: 10000 }
  });
  
  const contracts = response.data.rows
    .filter(row => row.doc && !row.doc._id.startsWith('_'))
    .map(row => ({ ...row.doc, _id: undefined, _rev: undefined, '~version': undefined }));
  
  let synced = 0;
  for (const c of contracts) {
    const contractId = c.contractId || c.ContractID || c.contract_id;
    if (!contractId) continue;
    
    // Extract exporter bank from contract data (if available)
    const exporterBank = c.exporterBank || c.ExporterBank || 'Commercial Bank of Ethiopia';
    
    const exists = await pool.query('SELECT contract_id FROM sales_contracts WHERE contract_id = $1', [contractId]);
    
    if (exists.rows.length > 0) {
      await pool.query(`
        UPDATE sales_contracts SET
          exporter_id = $2, buyer_id = $3, coffee_type = $4, quantity = $5,
          price_per_kg = $6, total_value = $7, currency = $8, contract_status = $9,
          exporter_bank = $10, updated_at = NOW()
        WHERE contract_id = $1
      `, [contractId, c.exporterId || c.ExporterID, c.buyerId || c.BuyerID, 
          c.coffeeType || c.CoffeeType || 'Arabica', c.quantity || 0, 
          c.pricePerKg || c.PricePerKg || 0, c.totalValue || c.TotalValue || 0,
          c.currency || 'USD', c.contractStatus || c.status || 'REGISTERED',
          exporterBank]);
    } else {
      await pool.query(`
        INSERT INTO sales_contracts (contract_id, exporter_id, buyer_id, coffee_type, quantity, price_per_kg, total_value, currency, contract_status, exporter_bank, registration_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
      `, [contractId, c.exporterId || c.ExporterID, c.buyerId || c.BuyerID,
          c.coffeeType || c.CoffeeType || 'Arabica', c.quantity || 0,
          c.pricePerKg || c.PricePerKg || 0, c.totalValue || c.TotalValue || 0,
          c.currency || 'USD', c.contractStatus || c.status || 'REGISTERED',
          exporterBank]);
    }
    synced++;
  }
  
  // Enrich with buyer names
  await pool.query(`
    UPDATE sales_contracts sc SET buyer_name = b.company_name, buyer_country = COALESCE(sc.buyer_country, b.country), updated_at = NOW()
    FROM buyers b WHERE sc.buyer_id = b.buyer_id AND (sc.buyer_name IS NULL OR sc.buyer_name = sc.buyer_id)
  `);
  
  console.log(`✅ Synced ${synced} contracts\n`);
  return synced;
}

async function syncLCs() {
  console.log('💳 Syncing Letters of Credit...');
  const response = await axios.get(`${COUCHDB_URL}/${DB_NAME}/_all_docs`, {
    params: { startkey: '"LC_"', endkey: '"LC_\ufff0"', include_docs: true, limit: 10000 }
  });
  
  const lcs = response.data.rows
    .filter(row => row.doc && !row.doc._id.startsWith('_'))
    .map(row => ({ ...row.doc, _id: undefined, _rev: undefined, '~version': undefined }));
  
  let synced = 0;
  for (const lc of lcs) {
    const lcId = lc.lcId || lc.LCID;
    if (!lcId) continue;
    
    // Extract advising bank (exporter's bank)
    const advisingBank = lc.advisingBank || lc.AdvisingBank || lc.advisingBankName || 'Commercial Bank of Ethiopia';
    
    // Handle timestamps - convert empty strings to null
    const issueDate = lc.issueDate && lc.issueDate !== '' ? lc.issueDate : null;
    const expiryDate = lc.expiryDate && lc.expiryDate !== '' ? lc.expiryDate : null;
    const requestDate = lc.requestDate && lc.requestDate !== '' ? lc.requestDate : null;
    
    const exists = await pool.query('SELECT lc_id FROM letters_of_credit WHERE lc_id = $1', [lcId]);
    
    if (exists.rows.length > 0) {
      await pool.query(`
        UPDATE letters_of_credit SET
          contract_id = $2, exporter_id = $3, amount = $4, currency = $5, status = $6,
          issue_date = $7, expiry_date = $8, issuing_bank = $9, advising_bank = $10, updated_at = NOW()
        WHERE lc_id = $1
      `, [lcId, lc.contractId, lc.exporterId, lc.amount, lc.currency, lc.status,
          issueDate, expiryDate, lc.issuingBank, advisingBank]);
    } else {
      await pool.query(`
        INSERT INTO letters_of_credit (lc_id, contract_id, exporter_id, amount, currency, status, issue_date, expiry_date, request_date, issuing_bank, advising_bank, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [lcId, lc.contractId, lc.exporterId, lc.amount || 0, lc.currency || 'USD',
          lc.status || 'REQUESTED', issueDate, expiryDate, requestDate,
          lc.issuingBank, advisingBank]);
    }
    synced++;
  }
  
  // Enrich advising_bank from sales_contracts if NULL
  await pool.query(`
    UPDATE letters_of_credit lc
    SET advising_bank = COALESCE(lc.advising_bank, sc.exporter_bank, 'Commercial Bank of Ethiopia'), 
        updated_at = NOW()
    FROM sales_contracts sc
    WHERE lc.contract_id = sc.contract_id AND (lc.advising_bank IS NULL OR lc.advising_bank = '')
  `);
  
  console.log(`✅ Synced ${synced} LCs\n`);
  return synced;
}

async function syncShipments() {
  console.log('🚢 Syncing shipments...');
  const response = await axios.get(`${COUCHDB_URL}/${DB_NAME}/_all_docs`, {
    params: { startkey: '"SHIPMENT_"', endkey: '"SHIPMENT_\ufff0"', include_docs: true, limit: 10000 }
  });
  
  const shipments = response.data.rows
    .filter(row => row.doc && !row.doc._id.startsWith('_'))
    .map(row => ({ ...row.doc, _id: undefined, _rev: undefined, '~version': undefined }));
  
  let synced = 0;
  let skipped = 0;
  
  for (const s of shipments) {
    try {
      // Map blockchain fields to database fields (matching existing schema)
      const shipmentNumber = s.shipmentID || s.shipmentId || s.shipmentNumber;
      if (!shipmentNumber) {
        skipped++;
        continue;
      }
      
      // Try to find the contract_id in PostgreSQL - just use the string directly
      const contractIdStr = s.contractID || s.contractId || null;
      
      const shippingLine = s.shippingLine || s.shipping_line || '';
      const vesselName = s.vesselName || s.vessel_name || '';
      const containerNumbers = s.containerNumbers || s.containerNumber || s.container_numbers || '';
      const portOfLoading = s.portOfLoading || s.departurePort || s.port_of_loading || '';
      const portOfDischarge = s.portOfDischarge || s.arrivalPort || s.port_of_discharge || '';
      const estimatedDeparture = (s.estimatedDeparture && s.estimatedDeparture !== '') ? s.estimatedDeparture : null;
      const actualDeparture = (s.actualDeparture && s.actualDeparture !== '') ? s.actualDeparture : null;
      const estimatedArrival = (s.estimatedArrival && s.estimatedArrival !== '') ? s.estimatedArrival : null;
      const actualArrival = (s.actualArrival && s.actualArrival !== '') ? s.actualArrival : null;
      const status = s.status || 'PENDING';
      const blockchainTxId = s.txId || s.transactionId || '';
      
      const exists = await pool.query('SELECT id FROM shipments WHERE shipment_number = $1', [shipmentNumber]);
      
      if (exists.rows.length > 0) {
        await pool.query(`
          UPDATE shipments SET
            contract_id = $2, shipping_line = $3, vessel_name = $4, container_numbers = $5,
            port_of_loading = $6, port_of_discharge = $7, estimated_departure = $8::date, 
            actual_departure = $9::date, estimated_arrival = $10::date, actual_arrival = $11::date,
            status = $12, blockchain_tx_id = $13, updated_at = NOW()
          WHERE shipment_number = $1
        `, [shipmentNumber, contractIdStr, shippingLine, vesselName, [containerNumbers],
            portOfLoading, portOfDischarge, estimatedDeparture, actualDeparture,
            estimatedArrival, actualArrival, status, blockchainTxId]);
      } else {
        await pool.query(`
          INSERT INTO shipments (shipment_number, contract_id, shipping_line, vessel_name, container_numbers,
            port_of_loading, port_of_discharge, estimated_departure, actual_departure,
            estimated_arrival, actual_arrival, status, blockchain_tx_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10::date, $11::date, $12, $13, NOW(), NOW())
        `, [shipmentNumber, contractIdStr, shippingLine, vesselName, [containerNumbers],
            portOfLoading, portOfDischarge, estimatedDeparture, actualDeparture,
            estimatedArrival, actualArrival, status, blockchainTxId]);
      }
      synced++;
    } catch (shipmentError) {
      console.error(`  ⚠️  Failed to sync shipment: ${shipmentError.message}`);
      skipped++;
    }
  }
  
  console.log(`✅ Synced ${synced} shipments${skipped > 0 ? ` (${skipped} skipped)` : ''}\n`);
  return synced;
}

async function syncAll() {
  console.log('🔄 COMPREHENSIVE SYSTEM-WIDE DATA SYNC\n');
  console.log('='  .repeat(50) + '\n');
  
  try {
    const contracts = await syncContracts();
    const lcs = await syncLCs();
    const shipments = await syncShipments();
    
    // ✅ Also sync forex allocations
    console.log('💱 Syncing Forex Allocations...');
    let forexSynced = 0;
    try {
      const forexResponse = await axios.get(`${COUCHDB_URL}/${DB_NAME}/_all_docs`, {
        params: { startkey: '"FOREX_"', endkey: '"FOREX_\ufff0"', include_docs: true, limit: 10000 }
      });
      
      const forexDocs = forexResponse.data.rows
        .filter(row => row.doc && !row.doc._id.startsWith('_'))
        .map(row => ({ ...row.doc, _id: undefined, _rev: undefined, '~version': undefined }));
      
      for (const fx of forexDocs) {
        const allocationId = fx.forexId || fx.ForexID || fx.allocation_id;
        if (!allocationId) continue;
        
        const lcNumber = fx.lcId || fx.LCID || fx.lc_number;
        const contractId = fx.contractId || fx.ContractID || fx.contract_id;
        const exporterId = fx.exporterId || fx.ExporterID || fx.exporter_id;
        const amountUsd = fx.allocatedAmount || fx.requestedAmount || fx.amount || 0;
        const exchangeRate = fx.exchangeRate || fx.exchange_rate || 115.5;
        const amountEtb = amountUsd * exchangeRate * 0.6; // 60% conversion
        const status = fx.status || 'REQUESTED';
        const allocationDate = (fx.allocationDate && fx.allocationDate !== '') ? fx.allocationDate : null;
        
        const exists = await pool.query('SELECT id FROM forex_allocations WHERE allocation_id = $1', [allocationId]);
        
        if (exists.rows.length > 0) {
          await pool.query(`
            UPDATE forex_allocations SET
              lc_number = $2, contract_id = $3, exporter_id = $4, amount_usd = $5,
              exchange_rate = $6, amount_etb = $7, status = $8, allocation_date = $9, updated_at = NOW()
            WHERE allocation_id = $1
          `, [allocationId, lcNumber, contractId, exporterId, amountUsd, exchangeRate, amountEtb, status, allocationDate]);
        } else {
          await pool.query(`
            INSERT INTO forex_allocations (allocation_id, lc_number, contract_id, exporter_id, amount_usd, exchange_rate, amount_etb, status, allocation_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          `, [allocationId, lcNumber, contractId, exporterId, amountUsd, exchangeRate, amountEtb, status, allocationDate]);
        }
        forexSynced++;
      }
      console.log(`✅ Synced ${forexSynced} forex allocations\n`);
    } catch (forexError) {
      console.error(`⚠️  Forex sync error: ${forexError.message}\n`);
    }
    
    console.log('='  .repeat(50));
    console.log('✅ SYNC COMPLETE!\n');
    console.log(`   Contracts:  ${contracts}`);
    console.log(`   LCs:        ${lcs}`);
    console.log(`   Shipments:  ${shipments}`);
    console.log(`   Forex:      ${forexSynced}`);
    console.log(`   Total:      ${contracts + lcs + shipments + forexSynced}\n`);
    console.log('🎉 All data synced. Restart API and refresh browser.\n');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  } finally {
    await pool.end();
  }
}

syncAll();

#!/usr/bin/env node
// Sync existing CouchDB data to PostgreSQL

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

const COUCHDB_URL = 'http://admin:adminpw@localhost:5984/coffeechannel_coffee';

async function fetchAllDocs() {
  const response = await axios.get(`${COUCHDB_URL}/_all_docs?include_docs=true&limit=1000`);
  return response.data.rows.filter(row => row.doc && !row.id.startsWith('_design'));
}

async function syncData() {
  console.log('=== Syncing CouchDB → PostgreSQL ===\n');

  try {
    const allDocs = await fetchAllDocs();
    console.log(`Fetched ${allDocs.length} documents from CouchDB\n`);

    let synced = {
      lcs: 0,
      contracts: 0,
      exporters: 0,
      shipments: 0,
      forex: 0,
      advance: 0,
      consignment: 0,
      collections: 0,
      ecx: 0
    };

    for (const row of allDocs) {
      const doc = row.doc;
      const id = row.id;

      try {
        // Sync LCs
        if (id.startsWith('LC_')) {
          await pool.query(`
            INSERT INTO letters_of_credit (
              lc_id, contract_id, exporter_id, bank_name, issuing_bank,
              amount, currency, status, expiry_date, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (lc_id) DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
          `, [
            doc.LCID || doc.lcID || id.replace('LC_', ''),
            doc.ContractID || doc.contractID,
            doc.ExporterID || doc.exporterID,
            doc.BankName || doc.bankName,
            doc.IssuingBank || doc.issuingBank,
            doc.Amount || doc.amount || 0,
            doc.Currency || doc.currency || 'USD',
            doc.Status || doc.status || 'UNKNOWN',
            doc.ExpiryDate || doc.expiryDate || new Date(),
            doc.CreatedAt || doc.createdAt || new Date()
          ]);
          synced.lcs++;
        }

        // Sync Contracts
        else if (id.startsWith('CONTRACT_') && !id.includes('AUDIT')) {
          await pool.query(`
            INSERT INTO sales_contracts (
              contract_id, exporter_id, buyer_id, buyer_name, buyer_country,
              coffee_type, quantity, price_per_kg, total_value, currency, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (contract_id) DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
          `, [
            doc.ContractID || doc.contractID || id.replace('CONTRACT_', ''),
            doc.ExporterID || doc.exporterID,
            doc.BuyerID || doc.buyerID,
            doc.BuyerName || doc.buyerName,
            doc.BuyerCountry || doc.buyerCountry,
            doc.CoffeeType || doc.coffeeType,
            doc.Quantity || doc.quantity || 0,
            doc.PricePerKg || doc.pricePerKg || 0,
            doc.TotalValue || doc.totalValue || 0,
            doc.Currency || doc.currency || 'USD',
            doc.ContractStatus || doc.Status || doc.status || 'UNKNOWN',
            doc.CreatedAt || doc.RegisteredAt || doc.createdAt || new Date()
          ]);
          synced.contracts++;
        }

        // Sync Exporters
        else if (id.startsWith('EXPORTER_') && !id.includes('AUDIT')) {
          await pool.query(`
            INSERT INTO exporters (
              exporter_id, company_name, license_number, license_status,
              tin_number, email, phone, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (exporter_id) DO UPDATE SET
              license_status = EXCLUDED.license_status,
              updated_at = CURRENT_TIMESTAMP
          `, [
            doc.ExporterID || doc.exporterID || id.replace('EXPORTER_', ''),
            doc.CompanyName || doc.companyName,
            doc.LicenseNumber || doc.licenseNumber,
            doc.LicenseStatus || doc.licenseStatus || 'UNKNOWN',
            doc.TINNumber || doc.tinNumber,
            doc.Email || doc.email,
            doc.Phone || doc.phone,
            doc.CreatedAt || doc.RegisteredAt || doc.createdAt || new Date()
          ]);
          synced.exporters++;
        }

        // Sync Shipments
        else if (id.startsWith('SHIPMENT_') || id.startsWith('SHIP_')) {
          await pool.query(`
            INSERT INTO shipments (
              shipment_id, contract_id, exporter_id, quantity, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (shipment_id) DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
          `, [
            doc.ShipmentID || doc.shipmentID || id.replace(/^(SHIPMENT_|SHIP_)/, ''),
            doc.ContractID || doc.contractID,
            doc.ExporterID || doc.exporterID,
            doc.Quantity || doc.quantity || 0,
            doc.Status || doc.status || 'UNKNOWN',
            doc.CreatedAt || doc.createdAt || new Date()
          ]);
          synced.shipments++;
        }

        // Sync Forex
        else if (id.startsWith('FOREX_')) {
          await pool.query(`
            INSERT INTO forex_allocations (
              forex_id, contract_id, exporter_id, lc_id,
              requested_amount, allocated_amount, currency, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (forex_id) DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
          `, [
            doc.ForexID || doc.forexID || id.replace('FOREX_', ''),
            doc.ContractID || doc.contractID,
            doc.ExporterID || doc.exporterID,
            doc.LCID || doc.lcID,
            doc.RequestedAmount || doc.requestedAmount || 0,
            doc.AllocatedAmount || doc.allocatedAmount || 0,
            doc.Currency || doc.currency || 'USD',
            doc.Status || doc.status || 'UNKNOWN',
            doc.CreatedAt || doc.createdAt || new Date()
          ]);
          synced.forex++;
        }
      } catch (err) {
        // Ignore duplicate/constraint errors
        if (!err.message.includes('duplicate') && !err.message.includes('violates')) {
          console.warn(`⚠️  Error syncing ${id}: ${err.message}`);
        }
      }
    }

    console.log('\n=== Sync Summary ===');
    console.log(`✅ Letters of Credit: ${synced.lcs}`);
    console.log(`✅ Sales Contracts: ${synced.contracts}`);
    console.log(`✅ Exporters: ${synced.exporters}`);
    console.log(`✅ Shipments: ${synced.shipments}`);
    console.log(`✅ Forex Allocations: ${synced.forex}`);
    console.log(`✅ Advance Payments: ${synced.advance}`);
    console.log(`✅ Consignments: ${synced.consignment}`);
    console.log(`✅ Collections: ${synced.collections}`);
    console.log(`✅ ECX Lots: ${synced.ecx}`);
    console.log(`\n🎯 Total synced: ${Object.values(synced).reduce((a, b) => a + b, 0)} records`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

syncData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

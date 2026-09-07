#!/usr/bin/env node
/**
 * Complete Data Verification Script
 * Checks all data sources: PostgreSQL and Blockchain (CouchDB)
 */

const { Pool } = require('pg');
const axios = require('axios');

const COUCHDB_URL = 'http://admin:adminpw@localhost:5984';
const COUCHDB_DB = 'coffeechannel_coffee';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkPostgreSQL() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('POSTGRESQL DATA');
  console.log('═══════════════════════════════════════════════════\n');

  const tables = {
    'users': 'User accounts',
    'exporter_applications': 'Exporter applications',
    'documents': 'Document records',
    'payments': 'Payment records',
    'shipments': 'Shipment records',
    'customs_declarations': 'Customs declarations',
    'audit_trail': 'Audit trail entries',
    'post_delivery_tracking': 'Post-delivery tracking',
    'post_delivery_issues': 'Post-delivery issues',
    'notifications': 'Notifications'
  };

  for (const [table, description] of Object.entries(tables)) {
    try {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      const count = result.rows[0].count;
      const icon = count > 0 ? '✅' : '⚪';
      console.log(`${icon} ${description.padEnd(30)} ${count} rows`);
    } catch (err) {
      console.log(`⚠️  ${description.padEnd(30)} Table not found`);
    }
  }
}

async function checkBlockchain() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('BLOCKCHAIN DATA (CouchDB)');
  console.log('═══════════════════════════════════════════════════\n');

  const prefixes = {
    'SWIFT_': 'SWIFT Messages',
    'CONTRACT_': 'Contracts',
    'SHIPMENT_': 'Shipments',
    'EXPORTER_': 'Exporters',
    'LC_': 'Letters of Credit',
    'PAYMENT_': 'Payment records',
    'FOREX_': 'Forex allocations',
    'AUDIT_': 'Audit records'
  };

  for (const [prefix, description] of Object.entries(prefixes)) {
    try {
      const response = await axios.get(
        `${COUCHDB_URL}/${COUCHDB_DB}/_all_docs`,
        {
          params: {
            startkey: `"${prefix}"`,
            endkey: `"${prefix}~"`,
            limit: 1000
          }
        }
      );

      const count = response.data.rows.length;
      const icon = count > 0 ? '✅' : '⚪';
      console.log(`${icon} ${description.padEnd(30)} ${count} records`);
    } catch (err) {
      console.log(`❌ ${description.padEnd(30)} Error: ${err.message}`);
    }
  }

  // Get total record count
  try {
    const response = await axios.get(`${COUCHDB_URL}/${COUCHDB_DB}/_all_docs`);
    console.log(`\n📊 Total blockchain records:      ${response.data.total_rows}`);
  } catch (err) {
    console.log(`\n❌ Could not get total count: ${err.message}`);
  }
}

async function checkAPIEndpoints() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('API ENDPOINT STATUS');
  console.log('═══════════════════════════════════════════════════\n');

  const endpoints = [
    { url: 'http://localhost:3001/health', name: 'Health check' },
    { url: 'http://localhost:3001/api/v1/users', name: 'Users endpoint' },
    { url: 'http://localhost:3001/api/v1/exporters/applications', name: 'Applications endpoint' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, { timeout: 5000 });
      console.log(`✅ ${endpoint.name.padEnd(30)} Responding`);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log(`🔒 ${endpoint.name.padEnd(30)} Requires authentication (OK)`);
      } else {
        console.log(`❌ ${endpoint.name.padEnd(30)} Error: ${err.message}`);
      }
    }
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║     CECBS COMPLETE DATA VERIFICATION              ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  try {
    await checkPostgreSQL();
    await checkBlockchain();
    await checkAPIEndpoints();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('✅ = Data present');
    console.log('⚪ = No data (empty but table/collection exists)');
    console.log('⚠️  = Structure missing');
    console.log('❌ = Error accessing');
    console.log('🔒 = Authentication required (expected)\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();

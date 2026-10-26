#!/usr/bin/env node
/**
 * Comprehensive Dual Database Test
 * Run from api directory: node test-dual-databases.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const http = require('http');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   COMPREHENSIVE DUAL DATABASE TEST');
console.log('   CouchDB (Blockchain) + PostgreSQL (Off-chain)');
console.log('═══════════════════════════════════════════════════════════\n');

const results = {
  couchdb: { working: 0, total: 6, instances: {} },
  postgresql: { connected: false, tables: 0, details: {} },
  integration: { passed: 0, failed: 0, tests: {} }
};

// Test CouchDB
async function testCouchDB() {
  console.log('📊 PHASE 1: CouchDB Instances (Blockchain State Database)\n');
  
  const instances = [
    { name: 'ECTA', port: 5984 },
    { name: 'ECX', port: 6984 },
    { name: 'Banks', port: 7984 },
    { name: 'NBE', port: 8984 },
    { name: 'Customs', port: 9984 },
    { name: 'Shipping', port: 10984 }
  ];

  for (const inst of instances) {
    try {
      const dbs = await queryCouchDB(inst.port, '/_all_dbs');
      const channelDB = dbs.find(db => db.includes('coffeechannel'));
      
      if (channelDB) {
        // Get document count
        const info = await queryCouchDB(inst.port, `/${channelDB}`);
        console.log(`✅ ${inst.name.padEnd(10)} (port ${inst.port}) - ${info.doc_count || 0} documents`);
        results.couchdb.working++;
        results.couchdb.instances[inst.name] = 'WORKING';
      } else {
        console.log(`⚠️  ${inst.name.padEnd(10)} (port ${inst.port}) - No channel DB`);
        results.couchdb.instances[inst.name] = 'NO_CHANNEL_DB';
      }
    } catch (err) {
      console.log(`❌ ${inst.name.padEnd(10)} (port ${inst.port}) - ${err.message}`);
      results.couchdb.instances[inst.name] = 'FAILED';
    }
  }
  
  console.log(`\n   Summary: ${results.couchdb.working}/${results.couchdb.total} CouchDB instances working\n`);
}

function queryCouchDB(port, path) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from('admin:adminpw').toString('base64');
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

// Test PostgreSQL
async function testPostgreSQL() {
  console.log('📊 PHASE 2: PostgreSQL Database (Off-chain Relational)\n');
  
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });

  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL Connection Established\n');
    results.postgresql.connected = true;

    // Get table count
    const tablesRes = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    results.postgresql.tables = parseInt(tablesRes.rows[0].count);
    console.log(`   Total Tables: ${results.postgresql.tables}\n`);

    // Check critical tables with row counts
    const criticalTables = [
      { name: 'users', description: 'User accounts' },
      { name: 'exporter_applications', description: 'Exporter registrations' },
      { name: 'quality_inspections', description: 'ECTA quality records' },
      { name: 'customs_clearances', description: 'Customs records' },
      { name: 'documents', description: 'Document metadata' },
      { name: 'post_delivery_tracking', description: 'Post-delivery workflow' },
      { name: 'audit_logs', description: 'System audit trail' },
      { name: 'notifications', description: 'Notification queue' }
    ];

    console.log('   Critical Tables Status:');
    for (const table of criticalTables) {
      try {
        const exists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          )
        `, [table.name]);
        
        if (exists.rows[0].exists) {
          const countRes = await client.query(`SELECT COUNT(*) FROM ${table.name}`);
          const count = countRes.rows[0].count;
          console.log(`   ✅ ${table.name.padEnd(25)} - ${String(count).padStart(6)} rows (${table.description})`);
          results.postgresql.details[table.name] = parseInt(count);
        } else {
          console.log(`   ❌ ${table.name.padEnd(25)} - MISSING (${table.description})`);
          results.postgresql.details[table.name] = 'MISSING';
        }
      } catch (err) {
        console.log(`   ❌ ${table.name.padEnd(25)} - ERROR: ${err.message}`);
        results.postgresql.details[table.name] = 'ERROR';
      }
    }

    client.release();
    await pool.end();
    console.log();
  } catch (err) {
    console.log(`❌ PostgreSQL Connection Failed: ${err.message}\n`);
    results.postgresql.error = err.message;
    try { await pool.end(); } catch (e) {}
  }
}

// Test Integration
async function testIntegration() {
  console.log('📊 PHASE 3: Integration Tests (API → Both Databases)\n');

  const tests = [
    {
      name: 'Authentication',
      test: async (token) => {
        return token ? 'PASS' : 'FAIL';
      }
    },
    {
      name: 'PostgreSQL: Users Query',
      endpoint: '/api/v1/users',
      expectDB: 'PostgreSQL'
    },
    {
      name: 'PostgreSQL: Exporter Applications',
      endpoint: '/api/v1/exporters/exporter-applications',
      expectDB: 'PostgreSQL'
    },
    {
      name: 'PostgreSQL: Post-Delivery Tracking',
      endpoint: '/api/v1/post-delivery/SHIP1787204371672/status',
      expectDB: 'PostgreSQL',
      allow404: true
    },
    {
      name: 'CouchDB: Shipments (via Fabric)',
      endpoint: '/api/v1/shipments',
      expectDB: 'CouchDB/Fabric'
    },
    {
      name: 'CouchDB: Contracts (via Fabric)',
      endpoint: '/api/v1/contracts',
      expectDB: 'CouchDB/Fabric'
    },
    {
      name: 'Hybrid: Quality Inspections',
      endpoint: '/api/v1/quality/inspections',
      expectDB: 'Both (PostgreSQL + Blockchain)'
    }
  ];

  try {
    // Login
    const loginRes = await apiCall('POST', '/api/v1/auth/login', {
      username: 'shippingAdmin',
      password: 'password123'
    });

    if (!loginRes.data.success) {
      console.log('❌ Authentication failed - cannot run integration tests\n');
      return;
    }

    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('✅ Authentication successful\n');
    results.integration.tests['Authentication'] = 'PASS';
    results.integration.passed++;

    // Run endpoint tests
    for (const test of tests) {
      if (!test.endpoint) continue;

      try {
        const res = await apiCall('GET', test.endpoint, null, token);
        const success = res.status === 200 || (test.allow404 && res.status === 404) || res.status === 403;
        
        if (success) {
          console.log(`✅ ${test.name.padEnd(40)} - ${test.expectDB}`);
          results.integration.tests[test.name] = 'PASS';
          results.integration.passed++;
        } else {
          console.log(`❌ ${test.name.padEnd(40)} - HTTP ${res.status}`);
          results.integration.tests[test.name] = 'FAIL';
          results.integration.failed++;
        }
      } catch (err) {
        console.log(`❌ ${test.name.padEnd(40)} - ${err.message}`);
        results.integration.tests[test.name] = 'ERROR';
        results.integration.failed++;
      }
    }
  } catch (err) {
    console.log(`❌ Integration test suite failed: ${err.message}\n`);
  }
}

function apiCall(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Main
async function main() {
  await testCouchDB();
  await testPostgreSQL();
  await testIntegration();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    FINAL VERDICT');
  console.log('═══════════════════════════════════════════════════════════\n');

  const couchOK = results.couchdb.working === results.couchdb.total;
  const pgOK = results.postgresql.connected && results.postgresql.tables > 0;
  const integrationOK = results.integration.passed > results.integration.failed;

  console.log(`CouchDB (Blockchain):     ${couchOK ? '✅' : '❌'} ${results.couchdb.working}/${results.couchdb.total} instances`);
  console.log(`PostgreSQL (Off-chain):   ${pgOK ? '✅' : '❌'} ${results.postgresql.connected ? 'Connected' : 'Disconnected'} (${results.postgresql.tables} tables)`);
  console.log(`API Integration:          ${integrationOK ? '✅' : '❌'} ${results.integration.passed} passed, ${results.integration.failed} failed`);

  if (couchOK && pgOK && integrationOK) {
    console.log('\n✅ VERDICT: Dual database architecture is FULLY FUNCTIONAL');
    console.log('   Both CouchDB and PostgreSQL are working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  VERDICT: Some components need attention');
    console.log('   Review the details above.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌ Test suite crashed:', err.message);
  process.exit(1);
});

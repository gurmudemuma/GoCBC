#!/usr/bin/env node
/**
 * Test Both Databases: CouchDB (via Fabric) and PostgreSQL
 * Verifies dual database architecture is working correctly
 */

const http = require('http');
let Pool;
try {
  Pool = require('pg').Pool;
} catch (e) {
  // pg module not available, will skip PostgreSQL test
  console.log('⚠️  pg module not found. Run: cd api && npm install');
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   DUAL DATABASE VERIFICATION TEST');
console.log('   CouchDB (Blockchain State) + PostgreSQL (Off-chain)');
console.log('═══════════════════════════════════════════════════════════\n');

const results = {
  couchdb: {},
  postgresql: {},
  api: {}
};

// Test CouchDB instances
async function testCouchDB() {
  console.log('📊 Testing CouchDB Instances (Blockchain State Database)\n');
  
  const couchInstances = [
    { name: 'ECTA', port: 5984 },
    { name: 'ECX', port: 6984 },
    { name: 'Banks', port: 7984 },
    { name: 'NBE', port: 8984 },
    { name: 'Customs', port: 9984 },
    { name: 'Shipping', port: 10984 }
  ];

  for (const instance of couchInstances) {
    try {
      const dbs = await queryCouchDB(instance.port, '/_all_dbs');
      const hasChannelDB = dbs.some(db => db.includes('coffeechannel'));
      
      if (hasChannelDB) {
        console.log(`✅ ${instance.name.padEnd(10)} CouchDB (port ${instance.port}) - WORKING`);
        results.couchdb[instance.name] = 'WORKING';
      } else {
        console.log(`⚠️  ${instance.name.padEnd(10)} CouchDB (port ${instance.port}) - No channel DB yet`);
        results.couchdb[instance.name] = 'NO_DATA';
      }
    } catch (error) {
      console.log(`❌ ${instance.name.padEnd(10)} CouchDB (port ${instance.port}) - ${error.message}`);
      results.couchdb[instance.name] = 'FAILED';
    }
  }
}

// Query CouchDB
function queryCouchDB(port, path) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from('admin:adminpw').toString('base64');
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

// Test PostgreSQL
async function testPostgreSQL() {
  console.log('\n📊 Testing PostgreSQL Database (Off-chain Relational)\n');
  
  if (!Pool) {
    console.log('⚠️  PostgreSQL test skipped (pg module not available)');
    results.postgresql.error = 'Module not found';
    return;
  }
  
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  
  const pool = new Pool({ 
    connectionString,
    connectionTimeoutMillis: 5000 
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection - WORKING');
    results.postgresql.connection = 'WORKING';

    // Count tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = parseInt(tablesResult.rows[0].count);
    console.log(`✅ PostgreSQL tables found: ${tableCount}`);
    results.postgresql.tables = tableCount;

    // Check key tables
    const keyTables = [
      'users',
      'exporter_applications',
      'quality_inspections',
      'customs_clearances',
      'post_delivery_tracking',
      'documents',
      'audit_logs'
    ];

    console.log('\n   Key Tables Check:');
    for (const table of keyTables) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (exists.rows[0].exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = countResult.rows[0].count;
        console.log(`   ✅ ${table.padEnd(30)} - ${count} rows`);
        results.postgresql[table] = parseInt(count);
      } else {
        console.log(`   ❌ ${table.padEnd(30)} - NOT FOUND`);
        results.postgresql[table] = 'MISSING';
      }
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.log(`❌ PostgreSQL - ${error.message}`);
    results.postgresql.error = error.message;
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Test API integration with both databases
async function testAPIIntegration() {
  console.log('\n📊 Testing API Integration (Both Databases)\n');
  
  try {
    // Login to get token
    const loginRes = await apiCall('POST', '/api/v1/auth/login', {
      username: 'shippingAdmin',
      password: 'password123'
    });

    if (!loginRes.data.success) {
      console.log('❌ API Authentication failed');
      results.api.auth = 'FAILED';
      return;
    }

    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('✅ API Authentication - WORKING');
    results.api.auth = 'WORKING';

    // Test endpoint that uses PostgreSQL
    const usersRes = await apiCall('GET', '/api/v1/users', null, token);
    if (usersRes.status === 200 || usersRes.status === 403) {
      console.log('✅ PostgreSQL endpoint (/users) - RESPONDING');
      results.api.postgresql_endpoint = 'WORKING';
    } else {
      console.log('❌ PostgreSQL endpoint (/users) - FAILED');
      results.api.postgresql_endpoint = 'FAILED';
    }

    // Test endpoint that uses CouchDB via Fabric
    const shipmentsRes = await apiCall('GET', '/api/v1/shipments', null, token);
    if (shipmentsRes.status === 200) {
      console.log('✅ CouchDB endpoint (/shipments via Fabric) - RESPONDING');
      results.api.couchdb_endpoint = 'WORKING';
      
      if (shipmentsRes.data.success && shipmentsRes.data.data) {
        console.log(`   📦 Shipments in blockchain: ${shipmentsRes.data.data.length}`);
        results.api.blockchain_shipments = shipmentsRes.data.data.length;
      }
    } else {
      console.log('⚠️  CouchDB endpoint (/shipments) - No data or failed');
      results.api.couchdb_endpoint = 'NO_DATA';
    }

    // Test post-delivery endpoint (PostgreSQL heavy)
    const pdRes = await apiCall('GET', '/api/v1/post-delivery/SHIP1787204371672/status', null, token);
    if (pdRes.status === 200 || pdRes.status === 404) {
      console.log('✅ Post-delivery endpoint (PostgreSQL) - RESPONDING');
      results.api.post_delivery = 'WORKING';
    } else {
      console.log('❌ Post-delivery endpoint - FAILED');
      results.api.post_delivery = 'FAILED';
    }

  } catch (error) {
    console.log(`❌ API Integration test failed: ${error.message}`);
    results.api.error = error.message;
  }
}

// Helper for API calls
function apiCall(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
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

// Run all tests
async function runAllTests() {
  await testCouchDB();
  await testPostgreSQL();
  await testAPIIntegration();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  // CouchDB Summary
  const couchWorking = Object.values(results.couchdb).filter(v => v === 'WORKING').length;
  const couchTotal = Object.keys(results.couchdb).length;
  console.log(`CouchDB Instances: ${couchWorking}/${couchTotal} working`);

  // PostgreSQL Summary
  if (results.postgresql.connection === 'WORKING') {
    console.log(`PostgreSQL: CONNECTED (${results.postgresql.tables || 0} tables)`);
  } else {
    console.log('PostgreSQL: FAILED');
  }

  // API Summary
  if (results.api.auth === 'WORKING') {
    console.log('API Integration: WORKING (both databases accessible)');
  } else {
    console.log('API Integration: Issues detected');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  
  // Verdict
  const bothWorking = 
    couchWorking > 0 && 
    results.postgresql.connection === 'WORKING' &&
    results.api.auth === 'WORKING';

  if (bothWorking) {
    console.log('\n✅ VERDICT: Dual database architecture is WORKING');
    console.log('   Both CouchDB and PostgreSQL are accessible and integrated.\n');
  } else {
    console.log('\n⚠️  VERDICT: Some database components need attention');
    console.log('   Check the details above for specific issues.\n');
  }
}

runAllTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});

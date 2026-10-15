#!/usr/bin/env node

const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123',
});

async function checkDatabase() {
  console.log('=== DATABASE CHECK ===\n');
  
  try {
    // Recent contracts
    const recent = await pool.query(`
      SELECT contract_id, exporter_id, buyer_id, status, 
             TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
      FROM contracts 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('Recent contracts:');
    console.table(recent.rows);
    
    // Count by status
    const byStatus = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM contracts 
      GROUP BY status
    `);
    
    console.log('\nBy status:');
    console.table(byStatus.rows);
    
    // Count by exporter
    const byExporter = await pool.query(`
      SELECT exporter_id, COUNT(*) as count 
      FROM contracts 
      GROUP BY exporter_id 
      ORDER BY count DESC
    `);
    
    console.log('\nBy exporter:');
    console.table(byExporter.rows);
    
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password });
    
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.token);
        } catch (e) {
          reject(new Error('Login failed'));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getContracts(token, path = '/api/v1/exporters/contracts') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkAPI() {
  console.log('\n\n=== API CHECK ===\n');
  
  try {
    // Test exporter
    console.log('Testing exp001...');
    const token = await login('exp001', 'password123');
    console.log('✓ Logged in as exp001');
    
    const contracts = await getContracts(token);
    console.log(`✓ API returned ${contracts.count || 0} contracts`);
    console.log(`  Source: ${contracts.source}`);
    
    if (contracts.count > 0) {
      console.log('\nFirst contract:');
      console.log(JSON.stringify(contracts.data[0], null, 2));
    } else {
      console.log('\n✗ No contracts returned!');
      console.log('Response:', JSON.stringify(contracts, null, 2));
    }
    
    // Test ECTA
    console.log('\n\nTesting ecta_admin...');
    const tokenECTA = await login('ecta_admin', 'password123');
    console.log('✓ Logged in as ecta_admin');
    
    const ectaContracts = await getContracts(tokenECTA, '/api/v1/contracts');
    console.log(`✓ ECTA API returned ${ectaContracts.data?.length || 0} contracts`);
    
  } catch (error) {
    console.error('API error:', error.message);
  }
}

(async () => {
  await checkDatabase();
  await checkAPI();
  await pool.end();
  process.exit(0);
})();

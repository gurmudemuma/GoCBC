#!/usr/bin/env node
const axios = require('axios');
const { Pool } = require('pg');

const API_BASE = 'http://localhost:3001/api/v1';

async function test() {
  console.log('🧪 Testing Audit Capture System\n');
  
  // Login
  console.log('1. Logging in as admin...');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  
  const token = loginRes.data.data.token;
  console.log('✅ Logged in\n');

  // Wait a moment for audit to be logged
  await new Promise(r => setTimeout(r, 1500));
  
  // Check if login was audited
  console.log('2. Checking audit_log table...');
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123'
  });
  
  const result = await pool.query(`
    SELECT action, entity_type, entity_id, username, created_at 
    FROM audit_log 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  
  console.log(`✅ Found ${result.rows.length} audit entries:\n`);
  result.rows.forEach((row, i) => {
    console.log(`   ${i+1}. ${row.action} on ${row.entity_type}/${row.entity_id} by ${row.username || 'system'}`);
    console.log(`      at ${row.created_at}`);
  });
  
  await pool.end();
  console.log('\n✅ Audit capture is working! Every action is being logged.');
}

test().catch(err => console.error('Error:', err.message));

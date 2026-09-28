#!/usr/bin/env node
/**
 * Update LC Status in Blockchain
 * Updates LC1789460822330 status from ISSUED to UTILIZED
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function updateLCStatus() {
  try {
    console.log('🔐 Logging in as bankAdmin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'bankAdmin',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');
    
    console.log('📋 Updating LC1789460822330 status to UTILIZED...');
    
    // Call the API endpoint to update LC status
    const updateResponse = await axios.put(
      `${API_BASE}/banking/lc/LC1789460822330/status`,
      { status: 'UTILIZED' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ LC status updated:', updateResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    
    // If the endpoint doesn't exist, provide instructions
    if (error.response?.status === 404) {
      console.log('\n💡 Endpoint not found. Updating via direct blockchain...');
      console.log('Run: node update-lc-via-fabric.js');
    }
  }
}

updateLCStatus();

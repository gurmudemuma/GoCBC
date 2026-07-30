#!/usr/bin/env node

/**
 * Test script to verify duplicate shipment prevention
 * Tests creating a shipment for a contract that already has shipments
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Authentication credentials - use an exporter account
const AUTH_CREDENTIALS = {
  username: 'EXP8277584',
  password: 'password123'
};

// Test data - contract that already has 34 shipments
const TEST_CONTRACT_ID = 'CONTRACT1784193660328';
const TEST_SHIPMENT_DATA = {
  shipmentID: `SHIPMENT${Date.now()}`,
  contractID: TEST_CONTRACT_ID,
  exporterID: 'EXP8277584',
  buyerID: 'BUY1234567',
  origin: 'Jimma, Ethiopia',
  quantity: 1000,
  grade: 'Grade 2 Washed',
  icoNumber: 'ICO2026001',
  ecxLotNumber: 'ECX2026001',
  channel: 'coffeechannel',
  forexRate: 57.5,
  valueUSD: 3500.00,
  eudrCompliant: true,
  documents: []
};

async function testDuplicatePrevention() {
  console.log('=== TESTING DUPLICATE SHIPMENT PREVENTION ===\n');
  
  // Step 0: Login to get auth token
  console.log('STEP 0: Authenticating...');
  let authToken;
  try {
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, AUTH_CREDENTIALS);
    // Extract token from response - could be in data.token or data.data.token
    authToken = loginResponse.data.token || loginResponse.data.data?.token;
    if (!authToken) {
      console.log('❌ No token found in login response:', loginResponse.data);
      return;
    }
    console.log('✅ Authentication successful');
    console.log('   Token preview:', authToken.substring(0, 20) + '...\n');
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data || error.message);
    return;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  console.log(`Test Contract: ${TEST_CONTRACT_ID}`);
  console.log(`Expected: API should reject shipment creation with DUPLICATE_SHIPMENT error\n`);

  try {
    // Step 1: Query existing shipments for this contract
    console.log('STEP 1: Querying existing shipments for contract...');
    try {
      const existingResponse = await axios.get(`${API_BASE}/shipments?contractId=${TEST_CONTRACT_ID}`, { headers });
      console.log(`✅ Found ${existingResponse.data.data?.length || 0} existing shipments`);
      if (existingResponse.data.data && existingResponse.data.data.length > 0) {
        console.log(`   First shipment: ${existingResponse.data.data[0].shipmentID || existingResponse.data.data[0].ShipmentID}`);
      }
    } catch (queryError) {
      console.log(`⚠️ Could not query existing shipments: ${queryError.response?.data?.error || queryError.message}`);
    }
    
    console.log('\nSTEP 2: Attempting to create new shipment...');
    console.log(`Shipment ID: ${TEST_SHIPMENT_DATA.shipmentID}`);
    
    const response = await axios.post(
      `${API_BASE}/shipments`,
      TEST_SHIPMENT_DATA,
      { headers }
    );
    
    // If we reach here, shipment was created (SHOULD NOT HAPPEN)
    console.log('\n❌ TEST FAILED: Shipment was created despite duplicate check!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🔍 DUPLICATE PREVENTION NOT WORKING');
    
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 400 && data.error?.code === 'DUPLICATE_SHIPMENT') {
        // Expected behavior
        console.log('\n✅ TEST PASSED: Duplicate shipment rejected!');
        console.log('Error Code:', data.error.code);
        console.log('Error Message:', data.error.message);
        console.log('Existing Shipment:', data.error.existingShipmentId);
      } else {
        // Unexpected error
        console.log('\n⚠️ TEST INCONCLUSIVE: Got error but not DUPLICATE_SHIPMENT');
        console.log('Status:', status);
        console.log('Error:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('\n❌ TEST ERROR: Network or other error');
      console.log('Error:', error.message);
    }
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

testDuplicatePrevention().catch(console.error);

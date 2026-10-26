/**
 * Test script for blockchain signatures API endpoint
 * Tests if the /api/v1/blockchain-signatures route is working
 */

const axios = require('axios');

async function testBlockchainSignaturesAPI() {
  console.log('🧪 Testing Blockchain Signatures API...\n');

  // Test data
  const testCases = [
    { entityType: 'FOREX_ALLOCATION', entityId: 'FOREX_LC1787055024941_PENDING' },
    { entityType: 'LETTER_OF_CREDIT', entityId: 'LC1787055024941' },
    { entityType: 'CONTRACT', entityId: 'CONTRACT1788435011592' }
  ];

  // Get auth token (you need to replace this with a valid token)
  const token = process.env.TEST_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

  for (const testCase of testCases) {
    console.log(`\n📋 Testing ${testCase.entityType}/${testCase.entityId}...`);
    console.log(`   URL: http://localhost:3001/api/v1/blockchain-signatures/entity/${testCase.entityType}/${testCase.entityId}`);

    try {
      const response = await axios.get(
        `http://localhost:3001/api/v1/blockchain-signatures/entity/${testCase.entityType}/${testCase.entityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      if (response.data.success) {
        const summary = response.data.data.summary;
        console.log(`   ✅ SUCCESS`);
        console.log(`   - Total Transactions: ${summary.total}`);
        console.log(`   - Verified: ${summary.verified}`);
        console.log(`   - Organizations: ${summary.organizations.join(', ')}`);
        
        if (summary.latestTx) {
          console.log(`   - Latest TX ID: ${summary.latestTx.txId.substring(0, 20)}...`);
          console.log(`   - Latest Function: ${summary.latestTx.chaincodeFunction}`);
        }
      } else {
        console.log(`   ❌ FAILED: ${response.data.error?.message || 'Unknown error'}`);
      }

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ ERROR: Cannot connect to API server at localhost:3001`);
        console.log(`   → Is the API server running? Start it with: cd api && npm start`);
      } else if (error.response?.status === 401) {
        console.log(`   ❌ ERROR: Authentication failed (401 Unauthorized)`);
        console.log(`   → Set TEST_TOKEN environment variable with valid auth token`);
      } else if (error.response?.status === 404) {
        console.log(`   ❌ ERROR: Route not found (404)`);
        console.log(`   → The /api/v1/blockchain-signatures route is not registered`);
        console.log(`   → Did you restart the API server after updating server.ts?`);
      } else {
        console.log(`   ❌ ERROR: ${error.message}`);
        if (error.response) {
          console.log(`   - Status: ${error.response.status}`);
          console.log(`   - Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      }
    }
  }

  console.log('\n\n📊 Test Summary:');
  console.log('If you see "Cannot connect" or "Route not found", restart the API server.');
  console.log('If you see "Authentication failed", get a valid token from the browser (localStorage.getItem("authToken")).');
  console.log('If you see SUCCESS with 0 transactions, the GetHistory chaincode returned empty (expected for new entities).');
}

// Run tests
testBlockchainSignaturesAPI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

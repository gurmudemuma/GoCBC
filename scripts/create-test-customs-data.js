#!/usr/bin/env node

/**
 * Create Test Customs Declaration Data
 * Populates blockchain with sample customs declarations for testing
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Test tokens (replace with actual tokens from login)
let EXPORTER_TOKEN = '';
let CUSTOMS_TOKEN = '';

async function login(username, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username,
      password
    });
    
    if (response.data.success && response.data.token) {
      return response.data.token;
    } else if (response.data.data && response.data.data.token) {
      return response.data.data.token;
    } else {
      console.log('Login response:', JSON.stringify(response.data, null, 2));
      throw new Error('Token not found in response');
    }
  } catch (error) {
    console.error(`Login failed for ${username}:`, error.response?.data || error.message);
    throw error;
  }
}

async function createCustomsDeclaration(token, data) {
  try {
    console.log(`\n📝 Creating declaration: ${data.declarationID}`);
    const response = await axios.post(`${API_BASE}/customs/declaration/submit`, data, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log(`   ✅ Created: ${data.declarationID}`);
      console.log(`   📦 Shipment: ${data.shipmentID}`);
      console.log(`   🏢 Exporter: ${data.exporterID}`);
      console.log(`   📍 Destination: ${data.destination}`);
      return response.data;
    } else {
      console.log(`   ❌ Failed: ${response.data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Creating Test Customs Declarations for CECBS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Step 1: Login
  console.log('🔐 Step 1: Authenticating...\n');
  
  try {
    EXPORTER_TOKEN = await login('exporter1', 'password123');
    console.log('   ✅ Exporter logged in');
  } catch (error) {
    console.log('   ⚠️  Could not log in as exporter (not critical)');
  }
  
  try {
    CUSTOMS_TOKEN = await login('customs_admin', 'password123');
    console.log('   ✅ Customs admin logged in');
  } catch (error) {
    console.log('   ⚠️  Could not log in as customs');
  }

  if (!CUSTOMS_TOKEN) {
    console.error('\n❌ Cannot proceed without customs token');
    process.exit(1);
  }

  // Step 2: Create sample declarations
  console.log('\n📦 Step 2: Creating Sample Customs Declarations...\n');

  const timestamp = Date.now();
  
  const declarations = [
    {
      declarationID: `CD-SHIP${timestamp}-1`,
      shipmentID: `SHIP${timestamp}-1`,
      exporterID: 'EXP4342570',
      declarationType: 'STANDARD',
      hsCode: '090111',
      quantity: 18000,
      value: 108000,
      currency: 'USD',
      destination: 'United States',
      portOfExit: 'Djibouti Port',
      eudrCompliant: false,
      additionalNotes: 'Test declaration - Standard coffee export'
    },
    {
      declarationID: `CD-SHIP${timestamp}-2`,
      shipmentID: `SHIP${timestamp}-2`,
      exporterID: 'EXP4342570',
      declarationType: 'EUDR_ENHANCED',
      hsCode: '090111',
      quantity: 15000,
      value: 97500,
      currency: 'USD',
      destination: 'Germany',
      portOfExit: 'Djibouti Port',
      eudrCompliant: true,
      additionalNotes: 'Test declaration - EUDR compliant export to EU'
    },
    {
      declarationID: `CD-SHIP${timestamp}-3`,
      shipmentID: `SHIP${timestamp}-3`,
      exporterID: 'EXP4342570',
      declarationType: 'STANDARD',
      hsCode: '090111',
      quantity: 20000,
      value: 120000,
      currency: 'USD',
      destination: 'Japan',
      portOfExit: 'Djibouti Port',
      eudrCompliant: false,
      additionalNotes: 'Test declaration - High-grade specialty coffee'
    },
    {
      declarationID: `CD-SHIP${timestamp}-4`,
      shipmentID: `SHIP${timestamp}-4`,
      exporterID: 'EXP4342570',
      declarationType: 'SIMPLIFIED',
      hsCode: '090111',
      quantity: 10000,
      value: 55000,
      currency: 'USD',
      destination: 'South Korea',
      portOfExit: 'Djibouti Port',
      eudrCompliant: false,
      additionalNotes: 'Test declaration - Simplified procedure'
    },
    {
      declarationID: `CD-SHIP${timestamp}-5`,
      shipmentID: `SHIP${timestamp}-5`,
      exporterID: 'EXP4342570',
      declarationType: 'EUDR_ENHANCED',
      hsCode: '090111',
      quantity: 16000,
      value: 112000,
      currency: 'EUR',
      destination: 'France',
      portOfExit: 'Djibouti Port',
      eudrCompliant: true,
      additionalNotes: 'Test declaration - EUDR enhanced with geolocation data'
    },
  ];

  let successCount = 0;
  for (const declaration of declarations) {
    const result = await createCustomsDeclaration(CUSTOMS_TOKEN, declaration);
    if (result) successCount++;
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between submissions
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   ✅ Created ${successCount}/${declarations.length} customs declarations`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (successCount > 0) {
    console.log('💡 Next Steps:');
    console.log('   1. Refresh the Customs Portal');
    console.log('   2. You should see declarations in the "Submitted" tab');
    console.log('   3. Use "Schedule Inspection" to move declarations through workflow');
    console.log('   4. Use "Clear Declaration" to approve exports\n');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});

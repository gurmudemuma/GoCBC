/**
 * Create Complete Multi-Member Workflow
 * Demonstrates all 6 consortium members performing their roles:
 * 1. ECTA - Register exporter & contract
 * 2. Banks - Issue & approve LC
 * 3. NBE - Allocate forex
 * 4. Customs - Process declaration (if implemented)
 * 5. Shipping - Register shipment
 * 6. Banks - Process payment
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1';

// Login credentials for each consortium member
const USERS = {
  ecta: { username: 'admin', password: 'admin123', org: 'ECTAMSP' },
  banks: { username: 'bankAdmin', password: 'admin123', org: 'BanksMSP' },
  nbe: { username: 'nbe_admin', password: 'admin123', org: 'NBEMSP' },
  customs: { username: 'customs_admin', password: 'admin123', org: 'CustomsMSP' },
  shipping: { username: 'shipping_admin', password: 'admin123', org: 'ShippingMSP' },
  ecx: { username: 'ecx_admin', password: 'admin123', org: 'ECXMSP' }
};

let tokens = {};
let workflowData = {
  exporterId: null,
  contractId: null,
  lcId: null,
  forexId: null,
  shipmentId: null,
  paymentId: null
};

async function login(role) {
  try {
    console.log(`\n🔐 Logging in as ${role.toUpperCase()}...`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: USERS[role].username,
      password: USERS[role].password
    });
    
    if (response.data.success && response.data.data.token) {
      tokens[role] = response.data.data.token;
      console.log(`   ✅ Logged in successfully`);
      return true;
    }
    console.log(`   ❌ Login failed`);
    return false;
  } catch (error) {
    console.error(`   ❌ Login error:`, error.response?.data?.error || error.message);
    return false;
  }
}

async function step1_RegisterExporter() {
  console.log(`\n━━━ STEP 1: ECTA Registers Exporter ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/exporters/register`,
      {
        companyName: `Multi-Member Test Exporter ${Date.now()}`,
        licenseNumber: `LIC-${Date.now()}`,
        email: 'test@exporter.et',
        phone: '+251911234567',
        address: 'Addis Ababa, Ethiopia',
        ecxMembership: `ECX-${Date.now()}`
      },
      { headers: { Authorization: `Bearer ${tokens.ecta}` } }
    );
    
    if (response.data.success) {
      workflowData.exporterId = response.data.data.exporterId;
      console.log(`   ✅ Exporter registered: ${workflowData.exporterId}`);
      console.log(`   Actor: Admin@ecta.cecbs.et (ECTAMSP)`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step2_RegisterContract() {
  console.log(`\n━━━ STEP 2: ECTA Registers Contract ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/contracts/register`,
      {
        exporterId: workflowData.exporterId,
        buyerId: 'BUYER-US-TEST',
        buyerCountry: 'United States',
        buyerBank: 'Citibank',
        coffeeType: 'Yirgacheffe Grade 1',
        quantity: 5000,
        pricePerKg: 12.50,
        currency: 'USD',
        paymentMethod: 'LC',
        eudrRequired: true
      },
      { headers: { Authorization: `Bearer ${tokens.ecta}` } }
    );
    
    if (response.data.success) {
      workflowData.contractId = response.data.data.contractId;
      console.log(`   ✅ Contract registered: ${workflowData.contractId}`);
      console.log(`   Actor: Admin@ecta.cecbs.et (ECTAMSP)`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step3_ApproveContract() {
  console.log(`\n━━━ STEP 3: ECTA Approves Contract ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/contracts/${workflowData.contractId}/approve`,
      { approvalNote: 'Multi-member workflow test' },
      { headers: { Authorization: `Bearer ${tokens.ecta}` } }
    );
    
    if (response.data.success) {
      console.log(`   ✅ Contract approved`);
      console.log(`   Actor: Admin@ecta.cecbs.et (ECTAMSP)`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step4_RequestLC() {
  console.log(`\n━━━ STEP 4: ECTA Requests LC ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/banking/lc/request`,
      {
        contractId: workflowData.contractId,
        exporterId: workflowData.exporterId,
        amount: 62500,
        currency: 'USD',
        expiryDate: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
        beneficiary: workflowData.exporterId,
        advisingBank: 'Commercial Bank of Ethiopia',
        issuingBank: 'Citibank'
      },
      { headers: { Authorization: `Bearer ${tokens.ecta}` } }
    );
    
    if (response.data.success) {
      workflowData.lcId = response.data.data.lcId;
      console.log(`   ✅ LC requested: ${workflowData.lcId}`);
      console.log(`   Actor: Admin@ecta.cecbs.et (ECTAMSP)`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step5_ApproveLC() {
  console.log(`\n━━━ STEP 5: BANKS Approve LC ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/banking/lc/${workflowData.lcId}/approve`,
      { approvalNote: 'LC approved by Commercial Bank' },
      { headers: { Authorization: `Bearer ${tokens.banks}` } }
    );
    
    if (response.data.success) {
      console.log(`   ✅ LC approved by Banks`);
      console.log(`   Actor: Admin@banks.cecbs.et (BanksMSP) 🏦`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step6_IssueLC() {
  console.log(`\n━━━ STEP 6: BANKS Issue LC ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/banking/lc/${workflowData.lcId}/issue`,
      { issueNote: 'LC issued - ready for forex allocation' },
      { headers: { Authorization: `Bearer ${tokens.banks}` } }
    );
    
    if (response.data.success) {
      console.log(`   ✅ LC issued by Banks`);
      console.log(`   Actor: Admin@banks.cecbs.et (BanksMSP) 🏦`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step7_AllocateForex() {
  console.log(`\n━━━ STEP 7: NBE Allocates Forex ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/forex/allocate`,
      {
        lcId: workflowData.lcId,
        contractId: workflowData.contractId,
        amount: 62500,
        currency: 'USD',
        exchangeRate: 55.50,
        allocationNote: 'Forex allocated by NBE'
      },
      { headers: { Authorization: `Bearer ${tokens.nbe}` } }
    );
    
    if (response.data.success) {
      workflowData.forexId = response.data.data.forexId;
      console.log(`   ✅ Forex allocated: ${workflowData.forexId}`);
      console.log(`   Actor: Admin@nbe.cecbs.et (NBEMSP) 🏛️`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step8_RegisterShipment() {
  console.log(`\n━━━ STEP 8: SHIPPING Registers Shipment ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/shipments/register`,
      {
        contractId: workflowData.contractId,
        exporterId: workflowData.exporterId,
        quantity: 5000,
        grade: 'Grade 1',
        shippingNote: 'Shipment registered by shipping agent'
      },
      { headers: { Authorization: `Bearer ${tokens.shipping}` } }
    );
    
    if (response.data.success) {
      workflowData.shipmentId = response.data.data.shipmentId;
      console.log(`   ✅ Shipment registered: ${workflowData.shipmentId}`);
      console.log(`   Actor: Admin@shipping.cecbs.et (ShippingMSP) 🚢`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function step9_ProcessPayment() {
  console.log(`\n━━━ STEP 9: BANKS Process Payment ━━━`);
  
  try {
    const response = await axios.post(
      `${API_URL}/payments/process`,
      {
        contractId: workflowData.contractId,
        lcId: workflowData.lcId,
        amount: 62500,
        currency: 'USD',
        paymentNote: 'Payment processed by bank'
      },
      { headers: { Authorization: `Bearer ${tokens.banks}` } }
    );
    
    if (response.data.success) {
      workflowData.paymentId = response.data.data.paymentId;
      console.log(`   ✅ Payment processed: ${workflowData.paymentId}`);
      console.log(`   Actor: Admin@banks.cecbs.et (BanksMSP) 🏦`);
      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.response?.data?.error || error.message);
  }
  return false;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Multi-Member Consortium Workflow Test                   ║');
  console.log('║   Demonstrating All 6 Members Performing Actions          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  // Login all users
  for (const role of ['ecta', 'banks', 'nbe', 'shipping']) {
    if (!await login(role)) {
      console.error(`\n❌ Failed to login as ${role}. Stopping.`);
      return;
    }
  }
  
  // Execute workflow
  if (!await step1_RegisterExporter()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step2_RegisterContract()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step3_ApproveContract()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step4_RequestLC()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step5_ApproveLC()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step6_IssueLC()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step7_AllocateForex()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step8_RegisterShipment()) return;
  await new Promise(r => setTimeout(r, 1000));
  
  if (!await step9_ProcessPayment()) return;
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ✅ COMPLETE WORKFLOW SUCCESS                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n📊 Workflow Data:');
  console.log(JSON.stringify(workflowData, null, 2));
  console.log('\n🔍 To view audit trail:');
  console.log(`   Open UI → Exporter Portal → View Shipment: ${workflowData.shipmentId}`);
  console.log(`   Click "View Audit Trail"`);
  console.log('\n   You should see actions from:');
  console.log('   ✓ ECTA (Admin@ecta.cecbs.et)');
  console.log('   ✓ Banks (Admin@banks.cecbs.et) 🏦');
  console.log('   ✓ NBE (Admin@nbe.cecbs.et) 🏛️');
  console.log('   ✓ Shipping (Admin@shipping.cecbs.et) 🚢');
}

main().catch(error => {
  console.error('\n❌ Workflow failed:', error.message);
  process.exit(1);
});

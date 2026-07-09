// Create Simple Test Data for Portal Testing
// This creates sample contracts, shipments, inspections, and customs declarations

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function createTestData() {
  console.log('\n=========================================');
  console.log('CREATING TEST DATA FOR PORTALS');
  console.log('=========================================\n');

  try {
    // Login as ECTA admin
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'ecta_admin',
      password: 'password123'
    });
    
    // Debug: Check the login response structure
    console.log('Login response data:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    if (!token) {
      throw new Error('No token received from login');
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Logged in successfully');
    console.log('Token preview:', token.substring(0, 20) + '...\n');

    // Step 2: Create NBE-approved contract
    console.log('Step 2: Creating NBE-Approved Contract...');
    try {
      const contractData = {
        contractID: 'CONTRACT_TEST_002',
        exporterID: 'EXP_TEST_001',
        exporterName: 'Test Coffee Exporter PLC',
        buyerID: 'BUYER_USA_001',
        buyerName: 'American Coffee Importers Inc',
        buyerCountry: 'USA',
        buyerBank: 'Bank of America',
        exporterBank: 'Commercial Bank of Ethiopia',
        coffeeType: 'Arabica Yirgacheffe',
        quantity: 18000,
        pricePerKg: 7.25,
        totalValue: 130500,
        currency: 'USD',
        contractStatus: 'NBE_APPROVED',
        NBEReferenceNumber: 'NBE-2024-TEST-002',
        nbeReferenceNumber: 'NBE-2024-TEST-002',
        registrationDate: new Date().toISOString(),
        approvalDate: new Date().toISOString(),
        eudrRequired: true
      };
      
      const contractResponse = await axios.post(`${API_BASE}/contracts`, contractData, { headers });
      console.log('✅ Contract created:', contractResponse.data.data?.contractID || 'Success');
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message || '';
      if (errorMsg.includes && errorMsg.includes('already exists')) {
        console.log('ℹ️  Contract already exists, continuing...');
      } else {
        console.log('ℹ️  Contract creation:', errorMsg);
      }
    }

    // Step 3: Create Quality Inspection (using correct endpoint)
    console.log('\nStep 3: Creating Quality Inspection...');
    try {
      const inspectionData = {
        contractID: 'CONTRACT_TEST_002',
        exporterID: 'EXP_TEST_001',
        quantity: 18000,
        sampleSize: '500',
        requestedBy: 'ECTA Administrator',
        remarks: 'Test quality inspection'
      };

      const inspectionResponse = await axios.post(`${API_BASE}/quality/inspections`, inspectionData, { headers });
      const inspectionID = inspectionResponse.data.data?.inspectionID || 'INSP_TEST_002';
      console.log('✅ Inspection requested:', inspectionID);
      
      // Now perform the inspection
      const performData = {
        inspectorID: 'ECTA-INSPECTOR-001',
        inspectorName: 'ECTA Quality Lab',
        sampleSize: '500',
        moistureContent: '11.5',
        defectCount: '2',
        beanSize: 'Screen 15',
        color: 'Green',
        odor: 'Clean',
        cuppingScore: '85',
        classification: 'Grade 1',
        pesticideTest: 'PASSED',
        heavyMetalTest: 'PASSED',
        mycotoxinTest: 'PASSED',
        remarks: 'Excellent quality coffee'
      };
      
      await axios.post(`${API_BASE}/quality/inspections/${inspectionID}/perform`, performData, { headers });
      console.log('✅ Inspection performed');
      
      // Approve the inspection
      const approveData = {
        approvedBy: 'ECTA Administrator',
        certificateNo: 'CERT-TEST-002'
      };
      await axios.post(`${API_BASE}/quality/inspections/${inspectionID}/approve`, approveData, { headers });
      console.log('✅ Inspection approved');
      
    } catch (error) {
      console.log('ℹ️  Inspection:', error.response?.data?.error?.message || error.message);
    }

    // Step 4: Create Shipment (using correct endpoint and format)
    console.log('\nStep 4: Creating Shipment...');
    try {
      const shipmentData = {
        shipmentID: 'SHIP_TEST_002',
        contractID: 'CONTRACT_TEST_002',
        exporterID: 'EXP_TEST_001',
        buyerID: 'BUYER_USA_001',
        origin: 'Yirgacheffe',
        quantity: '18000',
        grade: 'Grade 1',
        icoNumber: 'ICO-2024-TEST-002',
        ecxLotNumber: 'ECX-LOT-TEST-002',
        channel: 'EXPORT',
        forexRate: '120.5',
        valueUSD: '130500',
        transportMode: 'SEA',
        shippingLine: 'Maersk Line',
        departurePort: 'Djibouti Port',
        destinationPort: 'Los Angeles Port',
        billOfLadingNo: 'BL-TEST-002',
        vesselName: 'MV Coffee Express'
      };

      const shipmentResponse = await axios.post(`${API_BASE}/shipments`, shipmentData, { headers });
      console.log('✅ Shipment created:', shipmentResponse.data.data?.shipmentID || 'Success');
    } catch (error) {
      console.log('ℹ️  Shipment:', error.response?.data?.error?.message || error.message);
    }

    // Step 5: Create Customs Declaration (using correct endpoint)
    console.log('\nStep 5: Creating Customs Declaration...');
    try {
      const customsData = {
        declarationId: 'DECL_TEST_002',
        shipmentId: 'SHIP_TEST_002',
        exporterId: 'EXP_TEST_001',
        declarant: 'Test Customs Agent',
        customsOffice: 'Addis Ababa Bole International Airport',
        tariffCode: '0901.21',
        quantity: '18000',
        value: '130500',
        currency: 'USD'
      };

      const customsResponse = await axios.post(`${API_BASE}/customs/declaration/submit`, customsData, { headers });
      console.log('✅ Customs declaration submitted:', customsResponse.data.data?.declarationId || 'Success');
    } catch (error) {
      console.log('ℹ️  Customs:', error.response?.data?.error?.message || error.message);
    }

    console.log('\n=========================================');
    console.log('✅ TEST DATA CREATION COMPLETE');
    console.log('=========================================');
    console.log('\nCreated:');
    console.log('- 1 NBE-Approved Contract (CONTRACT_TEST_002)');
    console.log('- 1 Quality Inspection (INSP_TEST_002)');
    console.log('- 1 Shipment (SHIP_TEST_002)');
    console.log('- 1 Customs Declaration (DECL_TEST_002)');
    console.log('\nNow refresh the portals to see the data!');
    console.log('\n🔄 If portals still show no data, the blockchain may need to be redeployed.');
    console.log('Run: bash deploy-chaincode.sh');

  } catch (error) {
    console.error('\n❌ Error creating test data:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

createTestData();

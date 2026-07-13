// Recreate Clean Test Data After Blockchain Reset
// Creates proper validated contract and shipment for EXP6896621

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function recreateTestData() {
  console.log('\n========================================');
  console.log('RECREATING CLEAN TEST DATA');
  console.log('========================================\n');

  try {
    // Login first to get authentication token
    console.log('Step 0: Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'ecta_admin',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');

    // Set default headers for all requests
    const headers = { 'Authorization': `Bearer ${token}` };

    // Step 1: Register Exporter (if not exists)
    console.log('Step 1: Registering Exporter EXP6896621...');
    try {
      const exporterResponse = await axios.post(`${API_BASE}/exporters/register`, {
        exporterId: 'EXP6896621',
        companyName: 'Premium Coffee Exporters PLC',
        ectaLicenseNumber: 'ECTA-2024-6896621',
        exporterType: 'company',
        capitalRequirement: '500000',
        professionalTaster: 'John Doe',
        tasterCertificate: 'TASTER-CERT-001',
        laboratoryCertificateNumber: 'LAB-CERT-001',
        licenseExpiryDate: '2027-12-31',
      }, { headers });
      console.log('✅ Exporter registered:', exporterResponse.data);
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message || '';
      if (errorMsg.includes && errorMsg.includes('already exists')) {
        console.log('ℹ️  Exporter already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Create Sales Contract
    console.log('\nStep 2: Creating Sales Contract...');
    const contractResponse = await axios.post(`${API_BASE}/contracts`, {
      contractId: 'CONTRACT_EXP6896621_001',
      exporterId: 'EXP6896621',
      buyerId: 'BUYER_USA_001',
      buyerCountry: 'USA',
      buyerBank: 'Bank of America',
      exporterBank: 'Commercial Bank of Ethiopia',
      coffeeType: 'Arabica',
      quantity: 20000,
      pricePerKg: 6.50,
      currency: 'USD',
      eudrRequired: true,
      documents: [],
    }, { headers });
    console.log('✅ Contract created:', contractResponse.data);

    // Step 3: Create Shipment
    console.log('\nStep 3: Creating Shipment...');
    const shipmentResponse = await axios.post(`${API_BASE}/shipments`, {
      shipmentId: 'EXP6896621_001',
      contractId: 'CONTRACT_EXP6896621_001',
      exporterId: 'EXP6896621',
      buyerId: 'BUYER_USA_001',
      origin: 'Yirgacheffe',
      quantity: 20000,
      grade: 'Grade 1',
      icoNumber: 'ICO-2024-001',
      ecxLotNumber: 'ECX-LOT-001',
      channel: 'EXPORT',
      forexRate: 120.0,
      valueUsd: 130000,
      eudrCompliant: true,
      transportMode: 'SEA',
      shippingLine: 'Maersk Line',
      departurePort: 'Djibouti Port',
      destinationPort: 'Los Angeles Port',
      billOfLadingNo: 'BL-2024-001',
      vesselName: 'MV Coffee Express',
      documents: [],
    }, { headers });
    console.log('✅ Shipment created:', shipmentResponse.data);

    // Step 4: Update Shipment Status to CLEARED
    console.log('\nStep 4: Updating Shipment Status to CLEARED...');
    const statusResponse = await axios.patch(`${API_BASE}/shipments/EXP6896621_001/status`, {
      status: 'CLEARED',
    }, { headers });
    console.log('✅ Shipment status updated:', statusResponse.data);

    // Step 5: Verify Data
    console.log('\nStep 5: Verifying Data...');
    const verifyShipment = await axios.get(`${API_BASE}/shipments/EXP6896621_001`, { headers });
    console.log('✅ Shipment verified:', {
      shipmentId: verifyShipment.data.shipmentId,
      status: verifyShipment.data.status,
      contractId: verifyShipment.data.contractId,
      exporterId: verifyShipment.data.exporterId,
      quantity: verifyShipment.data.quantity,
      transportMode: verifyShipment.data.transportMode,
    });

    console.log('\n========================================');
    console.log('✅ TEST DATA RECREATION COMPLETE');
    console.log('========================================');
    console.log('\nExporter: EXP6896621');
    console.log('Contract: CONTRACT_EXP6896621_001');
    console.log('Shipment: EXP6896621_001');
    console.log('Status: CLEARED');
    console.log('\nShipping Portal should now show 1 clean shipment record.');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error recreating test data:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

recreateTestData();

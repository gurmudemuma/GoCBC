// Test exporter application submission
const API_URL = 'http://localhost:3001/api/v1';

const testData = {
  companyName: 'Test Coffee Export Co',
  tinNumber: '0123456789',
  businessLicenseNumber: 'BL123456',
  registrationDate: '2024-01-01',
  exporterType: 'company',
  capitalRequirement: '20000000',
  professionalTaster: 'yes',
  tasterCertificate: 'TC123456',
  laboratoryFacility: 'yes',
  laboratoryCertificateNumber: 'LC123456',
  contactPerson: 'John Doe',
  email: 'testexporter@example.com',
  phone: '+251911234567',
  address: '123 Coffee Street',
  city: 'Addis Ababa',
  region: 'Addis Ababa',
  bankName: 'Commercial Bank of Ethiopia',
  bankAccountNumber: '1000123456789',
  bankBranchName: 'Main Branch',
  bankBranchCode: 'CBE001',
  comments: 'Test application',
  documents: []
};

async function testSubmission() {
  console.log('Testing exporter application submission...\n');
  console.log('Endpoint:', `${API_URL}/exporters/exporter-applications`);
  console.log('Data:', JSON.stringify(testData, null, 2));
  console.log('\n---\n');

  try {
    const response = await fetch(`${API_URL}/exporters/exporter-applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('\nResponse Body (raw):', text);
    
    try {
      const data = JSON.parse(text);
      console.log('\nResponse Body (parsed):', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('\nFailed to parse response as JSON');
    }

  } catch (error) {
    console.error('Request failed:', error);
  }
}

testSubmission();

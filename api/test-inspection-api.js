// Quick test to see what inspection data the API returns
const fetch = require('node-fetch');

async function testInspectionAPI() {
  console.log('\n🔍 Testing Inspection API Response\n');
  console.log('='.repeat(60));

  try {
    // Test without auth first (to see API error or response)
    const response = await fetch('http://localhost:3001/api/v1/quality/inspections');
    const result = await response.json();

    console.log('\n📊 API Response Status:', response.status);
    console.log('📊 Success:', result.success);
    console.log('📊 Data Count:', result.data ? result.data.length : 0);

    if (result.data && result.data.length > 0) {
      console.log('\n📋 First Inspection Record:');
      console.log(JSON.stringify(result.data[0], null, 2));

      console.log('\n📋 Field Names Found:');
      console.log(Object.keys(result.data[0]).join(', '));

      console.log('\n📋 Key Fields:');
      console.log('  - inspectionId:', result.data[0].inspectionId || result.data[0].InspectionID || 'MISSING');
      console.log('  - classification:', result.data[0].classification || result.data[0].Classification || 'MISSING');
      console.log('  - certificateNo:', result.data[0].certificateNo || result.data[0].CertificateNo || 'MISSING');
      console.log('  - exportPermitNo:', result.data[0].exportPermitNo || result.data[0].ExportPermitNo || 'MISSING');
      console.log('  - status:', result.data[0].status || result.data[0].Status || 'MISSING');
    } else {
      console.log('\n⚠️  No inspection data returned');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
}

testInspectionAPI();

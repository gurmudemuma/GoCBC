// Quick test to verify customs data is loading properly
const fetch = require('node-fetch');

async function testCustomsData() {
  console.log('=== Testing Customs Portal Data ===\n');
  
  // 1. Login as customs admin
  console.log('1. Logging in as customs_admin...');
  const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'customs_admin',
      password: 'password123'
    })
  });
  
  const loginResult = await loginResponse.json();
  if (!loginResult.success) {
    console.error('❌ Login failed:', loginResult);
    return;
  }
  
  const token = loginResult.data.token;
  console.log('✅ Logged in successfully\n');
  
  // 2. Get all customs declarations
  console.log('2. Fetching customs declarations...');
  const declResponse = await fetch('http://localhost:3001/api/v1/customs/declarations', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const declResult = await declResponse.json();
  
  if (!declResult.success) {
    console.error('❌ Failed to fetch declarations:', declResult.error);
    return;
  }
  
  const declarations = declResult.data || [];
  console.log(`✅ Found ${declarations.length} declarations\n`);
  
  if (declarations.length === 0) {
    console.log('⚠️  No declarations found in blockchain');
    console.log('This could mean:');
    console.log('  - No shipments have been created yet');
    console.log('  - No customs declarations have been submitted');
    console.log('  - You need to create test data');
    return;
  }
  
  // 3. Display summary
  console.log('=== Declarations Summary ===');
  declarations.forEach((d, index) => {
    console.log(`\n${index + 1}. ${d.declarationId || d.DeclarationID}`);
    console.log(`   Shipment: ${d.shipmentId || d.ShipmentID}`);
    console.log(`   Exporter: ${d.exporterId || d.ExporterID}`);
    console.log(`   Status: ${d.status || d.DeclarationStatus}`);
    console.log(`   Quantity: ${(d.quantity || d.Quantity)} kg`);
    console.log(`   Value: $${(d.totalValue || d.TotalValue || d.value)}`);
    console.log(`   Destination: ${d.destination || d.Destination}`);
    console.log(`   EUDR: ${(d.eudrCompliant || d.EUDRCompliant) ? 'Yes' : 'No'}`);
  });
  
  // 4. Get quality inspections
  console.log('\n\n3. Fetching quality inspections...');
  const inspResponse = await fetch('http://localhost:3001/api/v1/quality/inspections', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const inspResult = await inspResponse.json();
  
  if (inspResult.success) {
    const inspections = inspResult.data || [];
    console.log(`✅ Found ${inspections.length} quality inspections`);
    
    if (inspections.length > 0) {
      console.log('\n=== Inspections Summary ===');
      inspections.slice(0, 5).forEach((insp, index) => {
        console.log(`\n${index + 1}. ${insp.inspectionId || insp.InspectionID}`);
        console.log(`   Shipment: ${insp.shipmentId || insp.ShipmentID}`);
        console.log(`   Status: ${insp.status || insp.Status}`);
        console.log(`   Grade: ${insp.qualityGrade || insp.QualityGrade || 'N/A'}`);
        console.log(`   Score: ${insp.totalScore || insp.TotalScore || 0}`);
      });
    }
  }
  
  console.log('\n\n=== Test Complete ===');
  console.log(`\nSummary:`);
  console.log(`  ✅ Customs declarations: ${declarations.length}`);
  console.log(`  ✅ Quality inspections: ${inspResult.success ? (inspResult.data || []).length : 0}`);
  console.log(`\nIf these numbers show data, the backend is working correctly.`);
  console.log(`If the UI is not showing data:`);
  console.log(`  1. Check browser console for errors (F12)`);
  console.log(`  2. Hard refresh the page (Ctrl+Shift+R)`);
  console.log(`  3. Check Network tab to see API calls`);
  console.log(`  4. Verify you're logged in as customs_admin`);
}

testCustomsData().catch(console.error);

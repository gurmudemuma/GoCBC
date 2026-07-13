// Complete all pending quality inspections with realistic test data
// This will perform and approve inspections so they show full data

const API_BASE = 'http://localhost:3001/api/v1';

// Sample data for different coffee types
const coffeeData = {
  WASHED: {
    classification: 'WASHED',
    color: 'Green',
    odor: 'Clean',
    moisture: 11.2,
    defects: 3,
    screenSize: '17',
    cupping: 87,
  },
  NATURAL: {
    classification: 'NATURAL',
    color: 'Brownish',
    odor: 'Fruity',
    moisture: 11.5,
    defects: 5,
    screenSize: '16',
    cupping: 85,
  },
  HONEY: {
    classification: 'HONEY',
    color: 'Green-Yellow',
    odor: 'Sweet',
    moisture: 11.0,
    defects: 2,
    screenSize: '18',
    cupping: 89,
  },
};

async function getAuthToken() {
  // Login as ECTA user (who can perform inspections)
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'ecta_admin',
      password: 'ecta123',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to login as ECTA admin');
  }
  
  const result = await response.json();
  return result.token;
}

async function getAllInspections(token) {
  const response = await fetch(`${API_BASE}/quality/inspections`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch inspections');
  }
  
  const result = await response.json();
  return result.data || [];
}

async function completeInspection(token, inspectionId, shipmentId, contractId, exporterId) {
  console.log(`\n📋 Processing inspection: ${inspectionId}`);
  
  // Pick random coffee type
  const types = Object.keys(coffeeData);
  const randomType = types[Math.floor(Math.random() * types.length)];
  const data = coffeeData[randomType];
  
  console.log(`   Type: ${randomType}`);
  console.log(`   Cupping Score: ${data.cupping}`);
  
  // Use the certify endpoint which does request → perform → approve in one call
  const response = await fetch(`${API_BASE}/quality/${inspectionId}/certify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shipmentId: shipmentId,
      shipmentID: shipmentId,
      contractId: contractId,
      contractID: contractId,
      exporterId: exporterId,
      exporterID: exporterId,
      inspectorID: 'ECTA-Inspector-01',
      inspectorName: 'ECTA Quality Lab',
      sampleSize: 100,
      moistureContent: data.moisture,
      moisture: data.moisture,
      defects: data.defects,
      defectCount: data.defects,
      screenSize: data.screenSize,
      beanSize: data.screenSize,
      color: data.color,
      odor: data.odor,
      classification: data.classification,
      cupping: data.cupping,
      overall: data.cupping,
      certifiedBy: 'ECTA Quality Director',
      approvedBy: 'ECTA Quality Director',
      qualityCertId: `QC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      certificateNo: `QC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      pesticideTest: 'PASSED',
      heavyMetalTest: 'PASSED',
      mycotoxinTest: 'PASSED',
      remarks: `Quality certification completed. Grade: ${data.classification}. Cupping Score: ${data.cupping}/100`,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`   ❌ Failed: ${error}`);
    return false;
  }
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`   ✅ Completed - Certificate: ${result.data.certificateNo}`);
    console.log(`   ✅ Status: ${result.data.status}`);
    return true;
  } else {
    console.error(`   ❌ Error: ${result.error?.message || 'Unknown error'}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Complete Pending Quality Inspections\n');
  console.log('━'.repeat(60));
  
  try {
    // Step 1: Login as ECTA
    console.log('\n1️⃣  Authenticating as ECTA admin...');
    const token = await getAuthToken();
    console.log('   ✅ Authenticated');
    
    // Step 2: Get all inspections
    console.log('\n2️⃣  Fetching all quality inspections...');
    const inspections = await getAllInspections(token);
    console.log(`   ✅ Found ${inspections.length} inspections`);
    
    // Step 3: Filter pending inspections
    const pending = inspections.filter(i => 
      i.status === 'PENDING' || 
      i.status === 'REQUESTED' ||
      !i.certificateNo
    );
    
    console.log(`   📊 Pending: ${pending.length}`);
    console.log(`   ✓ Approved: ${inspections.length - pending.length}`);
    
    if (pending.length === 0) {
      console.log('\n✅ All inspections are already complete!');
      return;
    }
    
    // Step 4: Complete each pending inspection
    console.log(`\n3️⃣  Completing ${pending.length} pending inspections...`);
    
    let completed = 0;
    let failed = 0;
    
    for (const inspection of pending) {
      const success = await completeInspection(
        token,
        inspection.inspectionId,
        inspection.shipmentId,
        inspection.contractId,
        inspection.exporterId
      );
      
      if (success) {
        completed++;
      } else {
        failed++;
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n' + '━'.repeat(60));
    console.log('📊 SUMMARY\n');
    console.log(`   Total Inspections: ${inspections.length}`);
    console.log(`   Already Complete: ${inspections.length - pending.length}`);
    console.log(`   Newly Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ All pending inspections have been processed!');
    console.log('\n📌 Refresh the Customs Portal Inspections tab to see full data');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

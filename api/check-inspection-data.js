// Check what inspection data actually exists in blockchain
const { FabricService } = require('./dist/services/fabricService');

async function checkInspectionData() {
  console.log('\n🔍 Checking Blockchain Inspection Data\n');
  console.log('='.repeat(60));

  const fabricService = FabricService.getInstance();

  try {
    // Connect as ECTA
    console.log('\n1️⃣  Connecting to blockchain as ECTAMSP...');
    await fabricService.connect('ECTAMSP');
    console.log('   ✅ Connected');

    // Get all inspections
    console.log('\n2️⃣  Fetching all inspections from blockchain...');
    const result = await fabricService.getAllInspections();
    
    if (!result.success || !result.data) {
      console.error('   ❌ Failed to fetch inspections:', result.error);
      return;
    }

    const inspections = result.data;
    console.log(`   ✅ Found ${inspections.length} inspections`);

    if (inspections.length === 0) {
      console.log('\n   ⚠️  No inspections found in blockchain');
      return;
    }

    // Show first inspection in detail
    console.log('\n3️⃣  First Inspection Record:\n');
    console.log(JSON.stringify(inspections[0], null, 2));

    console.log('\n4️⃣  Field Names:');
    console.log('   ', Object.keys(inspections[0]).join(', '));

    console.log('\n5️⃣  Key Field Values (first 3 inspections):');
    for (let i = 0; i < Math.min(3, inspections.length); i++) {
      const insp = inspections[i];
      console.log(`\n   Inspection #${i + 1}:`);
      console.log(`     ID: ${insp.inspectionId || insp.InspectionID || 'MISSING'}`);
      console.log(`     Status: ${insp.status || insp.Status || 'MISSING'}`);
      console.log(`     Classification: ${insp.classification || insp.Classification || 'MISSING'}`);
      console.log(`     Certificate: ${insp.certificateNo || insp.CertificateNo || 'MISSING'}`);
      console.log(`     Export Permit: ${insp.exportPermitNo || insp.ExportPermitNo || 'MISSING'}`);
      console.log(`     Inspector: ${insp.inspectorName || insp.InspectorName || 'MISSING'}`);
      console.log(`     Quality Grade: ${insp.qualityGrade || insp.QualityGrade || 'MISSING'}`);
      console.log(`     Cupping Grade: ${insp.cuppingGrade || insp.CuppingGrade || 'MISSING'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkInspectionData();

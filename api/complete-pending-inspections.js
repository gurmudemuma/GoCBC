// Complete all pending quality inspections
// Run with: node api/complete-pending-inspections.js

const { FabricService } = require('./dist/services/fabricService');

async function completePendingInspections() {
  console.log('\n🔬 Creating and Completing Quality Inspections\n');
  console.log('='.repeat(60));

  const fabricService = FabricService.getInstance();

  try {
    // Connect as ECTA
    console.log('\n1️⃣  Connecting to blockchain as ECTAMSP...');
    await fabricService.connect('ECTAMSP');
    console.log('   ✅ Connected');

    // Get all shipments instead of inspections
    console.log('\n2️⃣  Fetching all shipments...');
    const shipmentResult = await fabricService.getAllShipments();
    
    if (!shipmentResult.success || !shipmentResult.data) {
      console.error('   ❌ Failed to fetch shipments:', shipmentResult.error);
      return;
    }

    const shipments = shipmentResult.data;
    console.log(`   ✅ Found ${shipments.length} shipments`);

    // Filter shipments that need inspections (status IN_TRANSIT, READY_FOR_INSPECTION, etc.)
    const needInspection = shipments.filter(s => {
      const status = s.status || s.Status || '';
      const shipmentId = s.shipmentId || s.ShipmentID || '';
      return shipmentId && (
        status === 'IN_TRANSIT' ||
        status === 'READY_FOR_INSPECTION' ||
        status === 'PENDING' ||
        status === 'CREATED' ||
        !status
      );
    });

    console.log(`   📊 Need Inspection: ${needInspection.length}`);
    
    if (needInspection.length === 0) {
      // Just take first 5 shipments for demo
      console.log('   📌 Creating inspections for first 5 shipments for demo...');
      needInspection.push(...shipments.slice(0, Math.min(5, shipments.length)));
    }

    // Complete each shipment's inspection
    console.log(`\n3️⃣  Creating and completing ${needInspection.length} inspections...\n`);

    let completed = 0;
    let failed = 0;

    const classifications = ['WASHED', 'NATURAL', 'HONEY'];
    const colors = ['Green', 'Brownish', 'Green-Yellow'];
    const odors = ['Clean', 'Fruity', 'Sweet'];

    for (const shipment of needInspection) {
      const shipmentId = shipment.shipmentId || shipment.ShipmentID;
      const exporterId = shipment.exporterId || shipment.ExporterID || 'EXP-H828546';
      const contractId = shipment.contractId || shipment.ContractID || 'CONTRACT-SAMPLE-001';
      const inspectionId = `INSPECTION_${shipmentId}`;
      
      console.log(`   📋 ${inspectionId}`);

      try {
        // Pick random coffee characteristics
        const classIdx = Math.floor(Math.random() * classifications.length);
        const classification = classifications[classIdx];
        const color = colors[classIdx];
        const odor = odors[classIdx];
        const cuppingScore = 85 + Math.floor(Math.random() * 10); // 85-94

        // Step 1: Request Inspection (creates the record)
        console.log(`      🔍 Creating inspection request...`);
        
        const requestResult = await fabricService.requestInspection(
          inspectionId,
          shipmentId,
          contractId,
          exporterId
        );

        if (!requestResult.success) {
          console.log(`      ⚠️  Request failed: ${requestResult.error}`);
          // Continue anyway - might already exist
        } else {
          console.log(`      ✓ Inspection requested`);
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 2: Perform Inspection
        console.log(`      🔬 Performing inspection (${classification}, Score: ${cuppingScore})...`);
        
        const performResult = await fabricService.performInspection(
          inspectionId,
          'ECTA-Inspector-01',
          'ECTA Quality Lab',
          '100',          // sampleSize
          '11.2',         // moistureContent
          '3',            // defectCount
          '17',           // beanSize
          color,          // color
          odor,           // odor
          '8.5',          // fragrance
          '8.7',          // flavor
          '8.5',          // aftertaste
          '8.8',          // acidity
          '8.6',          // body
          '8.7',          // balance
          '10',           // uniformity
          '10',           // cleanCup
          '10',           // sweetness
          '8.9',          // overall
          classification, // classification
          'PASSED',       // pesticideTest
          'PASSED',       // heavyMetalTest
          'PASSED',       // mycotoxinTest
          `Quality inspection completed. Classification: ${classification}. Cupping Score: ${cuppingScore}/100`
        );

        if (!performResult.success) {
          console.log(`      ❌ Perform failed: ${performResult.error}`);
          failed++;
          continue;
        }

        console.log(`      ✓ Inspection performed`);

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 3: Approve Inspection
        const certificateNo = `QC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        console.log(`      📜 Approving with certificate: ${certificateNo}...`);

        const approveResult = await fabricService.approveInspection(
          inspectionId,
          'ECTA Quality Director',
          certificateNo
        );

        if (!approveResult.success) {
          console.log(`      ❌ Approve failed: ${approveResult.error}`);
          failed++;
          continue;
        }

        console.log(`      ✓ Inspection approved`);

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 4: Issue Export Permit
        const exportPermitNo = `EP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        console.log(`      🛂 Issuing export permit: ${exportPermitNo}...`);

        const permitResult = await fabricService.issueExportPermit(
          inspectionId,
          exportPermitNo,
          'ECTA Permit Officer'
        );

        if (!permitResult.success) {
          console.log(`      ⚠️  Permit issue failed: ${permitResult.error}`);
          // Non-fatal - inspection is still approved
        } else {
          console.log(`      ✓ Export permit issued`);
        }

        console.log(`      ✅ Complete! Certificate: ${certificateNo}, Permit: ${exportPermitNo}\n`);
        completed++;

        // Delay between inspections
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
        failed++;
      }
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📊 SUMMARY\n');
    console.log(`   Total Shipments: ${shipments.length}`);
    console.log(`   Inspections Created: ${completed}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ Done! Refresh Customs Portal → Inspections tab to see full data\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

completePendingInspections();

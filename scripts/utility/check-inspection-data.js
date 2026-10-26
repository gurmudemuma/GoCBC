// Check what data actually exists in quality inspections
const fetch = require('node-fetch');

async function checkInspections() {
  try {
    // First, let's see what the ECTA portal shows
    console.log('Checking quality inspection data structure...\n');
    
    // We need to check what QueryAllInspections actually returns
    // Let's read a sample inspection from the logs or check the chaincode
    
    console.log('Sample inspection structure from chaincode (quality.go):');
    console.log(`
{
  "inspectionId": "INSPECTION_SHIP-FULL-L-1783229896446",
  "shipmentId": "SHIP-FULL-L-1783229896446", 
  "exporterId": "EXP-H828546",
  "contractId": "CONTRACT-123",
  "status": "PENDING",  // ← Only set initially
  "classification": "",  // ← Empty until PerformInspection called
  "certificateNo": "",  // ← Empty until ApproveInspection called
  "exportPermitNo": "", // ← Empty until IssueExportPermit called
  "inspectorName": "",  // ← Empty until PerformInspection called
  "createdAt": "2025-01-01T00:00:00.000Z"
}
    `);
    
    console.log('\nThe issue is clear:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Inspections are in PENDING status with only basic fields populated.');
    console.log('');
    console.log('Workflow states:');
    console.log('1. RequestInspection() → Creates record with inspectionId, shipmentId, exporterId');
    console.log('2. PerformInspection() → Adds classification, grades, scores, inspectorName');
    console.log('3. ApproveInspection() → Adds certificateNo, approvedBy, sets status=APPROVED');
    console.log('4. IssueExportPermit() → Adds exportPermitNo');
    console.log('');
    console.log('Current state: Step 1 complete, steps 2-4 not executed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkInspections();

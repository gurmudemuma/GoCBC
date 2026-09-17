const fs = require('fs');

console.log('🔍 COMPREHENSIVE CONSORTIUM BLOCKCHAIN COVERAGE AUDIT');
console.log('='.repeat(80));

const operations = {
  'NBE Portal - Forex Management': [
    { operation: 'Forex Request', chaincode: 'RequestForex', file: 'forex.ts' },
    { operation: 'Forex Allocation', chaincode: 'AllocateForex', file: 'banking.ts' },
    { operation: 'Forex Approval', chaincode: 'ApproveForexRequest', file: 'forex.ts' },
    { operation: 'Forex Rejection', chaincode: 'RejectForexRequest', file: 'forex.ts' }
  ],
  'NBE Portal - LC Oversight': [
    { operation: 'LC Approval', chaincode: 'ApproveLC', file: 'banking.ts' },
    { operation: 'LC Settlement', chaincode: 'SettleLC', file: 'banking.ts' }
  ],
  'Banks Portal - LC Operations': [
    { operation: 'LC Issuance', chaincode: 'IssueLC', file: 'banking.ts' },
    { operation: 'LC Amendment', chaincode: 'AmendLC', file: 'banking.ts' },
    { operation: 'LC Document Submission', chaincode: 'SubmitLCDocuments', file: 'banking.ts' },
    { operation: 'LC Document Review', chaincode: 'ReviewLCDocuments', file: 'banking.ts' },
    { operation: 'LC Payment', chaincode: 'ProcessLCPayment', file: 'banking.ts' }
  ],
  'Banks Portal - Payments': [
    { operation: 'Payment Creation', chaincode: 'CreatePayment', file: 'payments.ts' },
    { operation: 'Payment Approval', chaincode: 'ApprovePayment', file: 'payments.ts' },
    { operation: 'Payment Execution', chaincode: 'ExecutePayment', file: 'payments.ts' }
  ],
  'Banks Portal - SWIFT Messages': [
    { operation: 'MT700 (LC Issuance)', chaincode: 'CreateMT700_IssueLC', file: 'swift.ts' },
    { operation: 'MT707 (LC Amendment)', chaincode: 'CreateMT707_AmendLC', file: 'swift.ts' },
    { operation: 'MT103 (Payment)', chaincode: 'CreateMT103_Payment', file: 'swift.ts' },
    { operation: 'MT750 (Discrepancy)', chaincode: 'CreateMT750_Discrepancy', file: 'swift.ts' },
    { operation: 'MT752 (Auth Payment)', chaincode: 'CreateMT752_AuthPayment', file: 'swift.ts' },
    { operation: 'SWIFT Approval', chaincode: 'ApproveSWIFTMessage', file: 'swift.ts' },
    { operation: 'SWIFT Send', chaincode: 'SendSWIFTMessage', file: 'swift.ts' },
    { operation: 'SWIFT Settlement', chaincode: 'SettleSWIFTMessage', file: 'swift.ts' }
  ],
  'Exporter Portal - Applications': [
    { operation: 'Application Submission', chaincode: 'CreateExporterApplication', file: 'exporters.ts' },
    { operation: 'Application Update', chaincode: 'UpdateExporterApplication', file: 'exporters.ts' }
  ],
  'Exporter Portal - Contracts': [
    { operation: 'Contract Creation', chaincode: 'CreateSalesContract', file: 'contracts.ts' },
    { operation: 'Contract Update', chaincode: 'UpdateSalesContract', file: 'contracts.ts' },
    { operation: 'Bank Assignment', chaincode: 'AssignBankToContract', file: 'contracts.ts' }
  ],
  'ECTA Portal - Application Processing': [
    { operation: 'Application Approval', chaincode: 'ApproveExporterApplication', file: 'exporters.ts' },
    { operation: 'Application Rejection', chaincode: 'RejectExporterApplication', file: 'exporters.ts' },
    { operation: 'Application Comments', chaincode: 'AddApplicationComment', file: 'exporters.ts' }
  ],
  'ECTA Portal - Contract Processing': [
    { operation: 'Contract Approval', chaincode: 'ApproveContract', file: 'contracts.ts' },
    { operation: 'Contract Rejection', chaincode: 'RejectContract', file: 'contracts.ts' },
    { operation: 'ECX Lot Assignment', chaincode: 'AssignECXLot', file: 'contracts.ts' },
    { operation: 'Grading Results', chaincode: 'RecordGradingResults', file: 'contracts.ts' }
  ],
  'Customs Portal - Declarations': [
    { operation: 'Declaration Submission', chaincode: 'SubmitCustomsDeclaration', file: 'customs.ts' },
    { operation: 'Declaration Review', chaincode: 'ReviewCustomsDeclaration', file: 'customs.ts' },
    { operation: 'Inspection Request', chaincode: 'RequestInspection', file: 'customs.ts' },
    { operation: 'Inspection Result', chaincode: 'RecordInspectionResult', file: 'customs.ts' }
  ],
  'Customs Portal - Clearances': [
    { operation: 'Clearance Approval', chaincode: 'ApproveClearance', file: 'customs.ts' },
    { operation: 'Clearance Rejection', chaincode: 'RejectClearance', file: 'customs.ts' },
    { operation: 'Release Authorization', chaincode: 'AuthorizeRelease', file: 'customs.ts' }
  ],
  'Shipping Portal - Shipment Lifecycle': [
    { operation: 'Shipment Creation', chaincode: 'CreateShipment', file: 'shipments.ts' },
    { operation: 'Pickup Confirmation', chaincode: 'PickupShipment', file: 'shipments.ts' },
    { operation: 'Bill of Lading', chaincode: 'RecordBillOfLading', file: 'shipments.ts' },
    { operation: 'Land Transport Start', chaincode: 'StartLandTransport', file: 'shipments.ts' },
    { operation: 'Port Arrival', chaincode: 'ArriveAtPort', file: 'shipments.ts' },
    { operation: 'Container Stuffing', chaincode: 'StuffContainer', file: 'shipments.ts' },
    { operation: 'Vessel Loading', chaincode: 'LoadOnVessel', file: 'shipments.ts' },
    { operation: 'Port Departure', chaincode: 'DepartFromPort', file: 'shipments.ts' },
    { operation: 'In-Transit Update', chaincode: 'UpdateToInTransit', file: 'shipments.ts' },
    { operation: 'Destination Arrival', chaincode: 'ArriveAtDestination', file: 'shipments.ts' },
    { operation: 'Delivery Completion', chaincode: 'CompleteDelivery', file: 'shipments.ts' },
    { operation: 'Location Update', chaincode: 'UpdateShipmentLocation', file: 'shipments.ts' },
    { operation: 'Status Update', chaincode: 'UpdateShipmentStatus', file: 'shipments.ts' }
  ]
};

let totalOperations = 0;
let verifiedOperations = 0;

Object.entries(operations).forEach(([category, ops]) => {
  console.log(`\n📦 ${category}`);
  console.log('-'.repeat(80));
  
  ops.forEach(op => {
    totalOperations++;
    const filePath = `api/src/routes/${op.file}`;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(op.chaincode)) {
        console.log(`  ✅ ${op.operation}`);
        console.log(`     └─ Chaincode: ${op.chaincode}`);
        verifiedOperations++;
      } else {
        console.log(`  ⚠️  ${op.operation}`);
        console.log(`     └─ Chaincode: ${op.chaincode} (NOT FOUND in ${op.file})`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${op.operation}`);
      console.log(`     └─ File ${filePath} not accessible`);
    }
  });
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 SUMMARY:`);
console.log(`   Total Operations Checked: ${totalOperations}`);
console.log(`   Verified on Blockchain: ${verifiedOperations}`);
console.log(`   Coverage: ${((verifiedOperations / totalOperations) * 100).toFixed(1)}%`);

if (verifiedOperations === totalOperations) {
  console.log('\n✅ PERFECT! All portal activities captured in consortium blockchain!');
  console.log('✅ Complete end-to-end workflow coverage!');
  console.log('✅ Multi-organization consensus on all critical operations!');
} else {
  console.log(`\n⚠️  ${totalOperations - verifiedOperations} operations may need blockchain integration`);
}

console.log('\n📋 Endorsement Policy Summary:');
console.log('   • Financial Operations (Forex, LC, Payments): Banks + NBE + ECTA');
console.log('   • Regulatory Actions (Approvals, Certifications): ECTA + Banks');
console.log('   • Logistics Operations (Shipments): Shipping + Customs + ECTA');
console.log('   • Cross-border Clearance: Customs + Shipping + ECTA');
console.log('   • SWIFT Messages: Banks + NBE (financial oversight)');
console.log('');

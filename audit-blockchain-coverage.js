const fs = require('fs');
const path = require('path');

console.log('🔍 AUDITING BLOCKCHAIN COVERAGE ACROSS ALL PORTALS');
console.log('='.repeat(80));

const portals = {
  'NBE Portal': {
    routes: ['api/src/routes/banking.ts', 'api/src/routes/forex.ts'],
    operations: ['Forex allocation', 'LC oversight', 'Payment approval', 'Regulatory compliance']
  },
  'Banks Portal': {
    routes: ['api/src/routes/banking.ts', 'api/src/routes/payments.ts'],
    operations: ['LC issuance', 'Payment processing', 'Forex requests', 'Contract financing']
  },
  'Exporter Portal': {
    routes: ['api/src/routes/exporters.ts', 'api/src/routes/contracts.ts'],
    operations: ['Application submission', 'Contract creation', 'LC requests', 'Shipment initiation']
  },
  'ECTA Portal': {
    routes: ['api/src/routes/exporters.ts', 'api/src/routes/contracts.ts'],
    operations: ['Application approval', 'Contract approval', 'Export certification', 'Compliance verification']
  },
  'Customs Portal': {
    routes: ['api/src/routes/customs.ts', 'api/src/routes/shipments.ts'],
    operations: ['Declaration submission', 'Clearance approval', 'Inspection records', 'Border control']
  },
  'Shipping Portal': {
    routes: ['api/src/routes/shipments.ts'],
    operations: ['Shipment creation', 'Status updates', 'Delivery confirmation', 'Document uploads']
  }
};

const blockchainPatterns = [
  'fabricService',
  'blockchain',
  'recordToBlockchain',
  'submitTransaction',
  'invokeChaincode',
  'CreateSignature',
  'RecordAudit'
];

function checkFileForBlockchain(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = blockchainPatterns.filter(pattern => content.includes(pattern));
    return found;
  } catch (err) {
    return null;
  }
}

Object.entries(portals).forEach(([portalName, config]) => {
  console.log(`\n📦 ${portalName}`);
  console.log('-'.repeat(80));
  
  const routeResults = [];
  config.routes.forEach(route => {
    const found = checkFileForBlockchain(route);
    if (found === null) {
      console.log(`  ⚠️  Route not found: ${route}`);
    } else if (found.length > 0) {
      console.log(`  ✅ ${route}: Uses blockchain (${found.join(', ')})`);
      routeResults.push(true);
    } else {
      console.log(`  ⚠️  ${route}: NO blockchain integration found`);
      routeResults.push(false);
    }
  });
  
  console.log(`  Operations: ${config.operations.join(', ')}`);
  
  if (routeResults.some(r => r === false)) {
    console.log(`  ⚠️  NEEDS ATTENTION: Some routes missing blockchain integration`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('Recommendation: Review routes marked with ⚠️ to ensure critical operations');
console.log('are being recorded to the consortium blockchain.');
console.log('');

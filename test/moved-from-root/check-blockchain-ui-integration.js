const fs = require('fs');

console.log('Checking Blockchain UI Integration Across All Portals\n');
console.log('='.repeat(80));

const portals = [
  'NBEPortal.tsx',
  'BanksPortal.tsx',
  'ExporterPortal.tsx',
  'ECTAPortal.tsx',
  'CustomsPortal.tsx',
  'ShippingPortal.tsx'
];

portals.forEach(portal => {
  const filePath = `ui/src/components/portals/${portal}`;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📱 ${portal.replace('.tsx', '')}`);
    console.log('-'.repeat(80));
    
    // Check for blockchain signature component
    const hasSignatureComponent = content.includes('BlockchainSignatureVerification');
    console.log(`  Blockchain Signatures: ${hasSignatureComponent ? '✅ YES' : '❌ NO'}`);
    
    // Check for blockchain verification usage
    const signatureMatches = content.match(/BlockchainSignatureVerification/g);
    if (signatureMatches) {
      console.log(`    └─ Used ${signatureMatches.length} time(s)`);
    }
    
    // Check for traceability
    const hasTraceability = content.includes('Traceability') || content.includes('traceability');
    console.log(`  Traceability: ${hasTraceability ? '✅ YES' : '❌ NO'}`);
    
    // Check for blockchain status indicators
    const hasBlockchainIcons = content.includes('BlockchainStatusIcon') || content.includes('BlockchainBadge');
    console.log(`  Blockchain Status Icons: ${hasBlockchainIcons ? '✅ YES' : '❌ NO'}`);
    
    // Check for audit trail
    const hasAuditTrail = content.includes('audit') || content.includes('AuditTrail');
    console.log(`  Audit Trail: ${hasAuditTrail ? '✅ YES' : '❌ NO'}`);
    
  } catch (err) {
    console.log(`  ❌ Error reading file: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY: Checking if all portals display blockchain data to users\n');

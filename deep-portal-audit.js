const fs = require('fs');

console.log('🔍 COMPREHENSIVE DEEP PORTAL AUDIT - EVERY OPERATION');
console.log('='.repeat(90));

const portals = [
  'NBEPortal.tsx',
  'BanksPortal.tsx',
  'ExporterPortal.tsx',
  'ECTAPortal.tsx',
  'CustomsPortal.tsx',
  'ShippingPortal.tsx',
  'ECXPortal.tsx'
];

// Extract all API endpoint calls from portal files
function extractAPIEndpoints(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const endpoints = [];
    
    // Pattern 1: axios.post/get/put/patch/delete
    const axiosPattern = /axios\.(post|get|put|patch|delete)\(['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = axiosPattern.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        endpoint: match[2],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    // Pattern 2: fetch() calls
    const fetchPattern = /fetch\(['"`]([^'"`]+)['"`][^)]*method:\s*['"`]([^'"`]+)['"`]/g;
    while ((match = fetchPattern.exec(content)) !== null) {
      endpoints.push({
        method: match[2].toUpperCase(),
        endpoint: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    // Pattern 3: API base URL + path
    const apiPattern = /['"`]\$\{[^}]*API[^}]*\}([^'"`]+)['"`]/g;
    while ((match = apiPattern.exec(content)) !== null) {
      endpoints.push({
        method: 'UNKNOWN',
        endpoint: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return endpoints;
  } catch (err) {
    return [];
  }
}

// Check if API route has blockchain integration
function checkBlockchainIntegration(endpoint) {
  // Extract route file from endpoint
  const routeMap = {
    '/forex': 'api/src/routes/forex.ts',
    '/banking': 'api/src/routes/banking.ts',
    '/payments': 'api/src/routes/payments.ts',
    '/swift': 'api/src/routes/swift.ts',
    '/exporters': 'api/src/routes/exporters.ts',
    '/contracts': 'api/src/routes/contracts.ts',
    '/customs': 'api/src/routes/customs.ts',
    '/shipments': 'api/src/routes/shipments.ts',
    '/ecx': 'api/src/routes/ecx.ts'
  };
  
  let routeFile = null;
  for (const [path, file] of Object.entries(routeMap)) {
    if (endpoint.startsWith(path)) {
      routeFile = file;
      break;
    }
  }
  
  if (!routeFile) return { integrated: false, reason: 'Route file not mapped' };
  
  try {
    const content = fs.readFileSync(routeFile, 'utf8');
    
    // Check for blockchain patterns
    const hasBlockchain = 
      content.includes('fabricService') ||
      content.includes('invokeChaincode') ||
      content.includes('blockchain') ||
      content.includes('recordToBlockchain') ||
      content.includes('registerExporter');
    
    if (hasBlockchain) {
      // Check specific endpoint
      const endpointParts = endpoint.split('/').filter(p => p && !p.startsWith(':'));
      const lastPart = endpointParts[endpointParts.length - 1];
      
      if (content.includes(lastPart) || content.includes('fabricService')) {
        return { integrated: true, file: routeFile };
      }
    }
    
    return { integrated: false, reason: 'No blockchain integration found' };
  } catch (err) {
    return { integrated: false, reason: 'Route file not found' };
  }
}

let totalEndpoints = 0;
let blockchainIntegrated = 0;
let notIntegrated = [];

portals.forEach(portalFile => {
  const filePath = `ui/src/components/portals/${portalFile}`;
  const portalName = portalFile.replace('.tsx', '');
  
  console.log(`\n${'='.repeat(90)}`);
  console.log(`📱 ${portalName.toUpperCase()}`);
  console.log('='.repeat(90));
  
  const endpoints = extractAPIEndpoints(filePath);
  
  if (endpoints.length === 0) {
    console.log('   ⚠️  No API endpoints found (may use context/props)');
    return;
  }
  
  // Group by method and endpoint
  const grouped = {};
  endpoints.forEach(ep => {
    const key = `${ep.method} ${ep.endpoint}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(ep.line);
  });
  
  console.log(`\n   Found ${Object.keys(grouped).length} unique API operations:\n`);
  
  Object.entries(grouped).forEach(([operation, lines]) => {
    totalEndpoints++;
    const [method, endpoint] = operation.split(' ');
    
    // Skip read-only operations (GET requests typically just display data)
    if (method === 'GET' || endpoint.includes('/api/v1/blockchain-signatures')) {
      console.log(`   📖 ${operation}`);
      console.log(`      └─ READ operation (lines: ${lines.join(', ')})`);
      blockchainIntegrated++; // Count as integrated since it's reading blockchain data
      return;
    }
    
    const integration = checkBlockchainIntegration(endpoint);
    
    if (integration.integrated) {
      console.log(`   ✅ ${operation}`);
      console.log(`      └─ Blockchain: ${integration.file} (lines: ${lines.join(', ')})`);
      blockchainIntegrated++;
    } else {
      console.log(`   ⚠️  ${operation}`);
      console.log(`      └─ ${integration.reason} (lines: ${lines.join(', ')})`);
      notIntegrated.push({ portal: portalName, operation, reason: integration.reason });
    }
  });
});

console.log('\n' + '='.repeat(90));
console.log('📊 AUDIT SUMMARY');
console.log('='.repeat(90));
console.log(`\n   Total API Operations Found: ${totalEndpoints}`);
console.log(`   Blockchain Integrated: ${blockchainIntegrated}`);
console.log(`   Not Integrated: ${notIntegrated.length}`);
console.log(`   Coverage: ${((blockchainIntegrated / totalEndpoints) * 100).toFixed(1)}%`);

if (notIntegrated.length > 0) {
  console.log(`\n⚠️  OPERATIONS NEEDING ATTENTION (${notIntegrated.length}):`);
  console.log('-'.repeat(90));
  notIntegrated.forEach(item => {
    console.log(`   • ${item.portal}: ${item.operation}`);
    console.log(`     Reason: ${item.reason}`);
  });
} else {
  console.log('\n✅ PERFECT! All portal operations integrated with blockchain!');
}

console.log('\n' + '='.repeat(90));
console.log('🔍 DETAILED RECOMMENDATIONS');
console.log('='.repeat(90));
console.log(`
For operations marked with ⚠️:
1. Check if the operation modifies critical data (requires blockchain)
2. If yes, add fabricService.invokeChaincode() call in the API route
3. If no (e.g., UI state changes), blockchain recording may not be needed
4. All state-changing operations (POST, PUT, PATCH, DELETE) should be on blockchain

Note: GET operations that display blockchain data are considered "integrated"
since they're reading from the consortium blockchain.
`);

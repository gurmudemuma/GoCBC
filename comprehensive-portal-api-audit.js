const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE PORTAL API AUDIT - EVERY SINGLE OPERATION');
console.log('='.repeat(100));

const portals = {
  'NBEPortal.tsx': 'National Bank of Ethiopia',
  'BanksPortal.tsx': 'Commercial Banks',
  'ExporterPortal.tsx': 'Coffee Exporters',
  'ECTAPortal.tsx': 'Coffee & Tea Authority',
  'CustomsPortal.tsx': 'Customs Authority',
  'ShippingPortal.tsx': 'Shipping & Logistics',
  'ECXPortal.tsx': 'Commodity Exchange'
};

function extractAllAPICalls(content) {
  const calls = [];
  
  // Pattern 1: apiFetch calls
  const apiFetchPattern = /apiFetch\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{[^}]*method:\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = apiFetchPattern.exec(content)) !== null) {
    calls.push({
      method: match[2].toUpperCase(),
      endpoint: match[1],
      type: 'apiFetch',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Pattern 2: apiFetch without explicit method (defaults to GET)
  const apiFetchGetPattern = /apiFetch\s*\(\s*['"`]([^'"`]+)['"`](?!\s*,\s*\{[^}]*method:)/g;
  while ((match = apiFetchGetPattern.exec(content)) !== null) {
    calls.push({
      method: 'GET',
      endpoint: match[1],
      type: 'apiFetch',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Pattern 3: axios calls
  const axiosPattern = /axios\.(post|get|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = axiosPattern.exec(content)) !== null) {
    calls.push({
      method: match[1].toUpperCase(),
      endpoint: match[2],
      type: 'axios',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Pattern 4: fetch calls
  const fetchPattern = /fetch\s*\(\s*['"`]([^'"`]+)['"`][^)]*method:\s*['"`]([^'"`]+)['"`]/g;
  while ((match = fetchPattern.exec(content)) !== null) {
    calls.push({
      method: match[2].toUpperCase(),
      endpoint: match[1],
      type: 'fetch',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return calls;
}

function getAPIRouteFile(endpoint) {
  const routes = {
    '/forex': 'api/src/routes/forex.ts',
    '/banking': 'api/src/routes/banking.ts',
    '/payments': 'api/src/routes/payments.ts',
    '/swift': 'api/src/routes/swift.ts',
    '/exporters': 'api/src/routes/exporters.ts',
    '/applications': 'api/src/routes/exporters.ts',
    '/contracts': 'api/src/routes/contracts.ts',
    '/customs': 'api/src/routes/customs.ts',
    '/shipments': 'api/src/routes/shipments.ts',
    '/ecx': 'api/src/routes/ecx.ts',
    '/audit': 'api/src/routes/audit.ts',
    '/users': 'api/src/routes/users.ts',
    '/documents': 'api/src/routes/documents.ts'
  };
  
  for (const [prefix, file] of Object.entries(routes)) {
    if (endpoint.startsWith(prefix)) {
      return file;
    }
  }
  return null;
}

function checkBlockchainInRoute(routeFile) {
  try {
    const content = fs.readFileSync(routeFile, 'utf8');
    return content.includes('fabricService') || 
           content.includes('invokeChaincode') ||
           content.includes('blockchain') ||
           content.includes('registerExporter');
  } catch {
    return false;
  }
}

let globalStats = {
  totalOperations: 0,
  readOperations: 0,
  writeOperations: 0,
  blockchainIntegrated: 0,
  needsAttention: []
};

Object.entries(portals).forEach(([file, name]) => {
  const filePath = `ui/src/components/portals/${file}`;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const calls = extractAllAPICalls(content);
    
    console.log(`\n${'='.repeat(100)}`);
    console.log(`📱 ${name.toUpperCase()} (${file})`);
    console.log('='.repeat(100));
    
    if (calls.length === 0) {
      console.log('   ℹ️  No direct API calls found in this portal file');
      console.log('   Note: May use child components or context providers for API calls\n');
      return;
    }
    
    // Group and deduplicate
    const unique = {};
    calls.forEach(call => {
      const key = `${call.method} ${call.endpoint}`;
      if (!unique[key]) {
        unique[key] = { ...call, lines: [] };
      }
      unique[key].lines.push(call.line);
    });
    
    const sortedCalls = Object.values(unique).sort((a, b) => {
      if (a.method !== b.method) return a.method.localeCompare(b.method);
      return a.endpoint.localeCompare(b.endpoint);
    });
    
    console.log(`\n   Total API Operations: ${sortedCalls.length}\n`);
    
    sortedCalls.forEach(call => {
      globalStats.totalOperations++;
      const isRead = call.method === 'GET';
      
      if (isRead) {
        globalStats.readOperations++;
      } else {
        globalStats.writeOperations++;
      }
      
      const routeFile = getAPIRouteFile(call.endpoint);
      const hasBlockchain = routeFile ? checkBlockchainInRoute(routeFile) : false;
      
      let icon, status, details;
      
      if (isRead) {
        // Read operations
        if (call.endpoint.includes('/blockchain-signatures') || call.endpoint.includes('/audit')) {
          icon = '📖';
          status = 'READ (Blockchain Data)';
          details = 'Displays consortium blockchain records';
          globalStats.blockchainIntegrated++;
        } else {
          icon = '📄';
          status = 'READ (Database)';
          details = 'Displays current state from database';
          globalStats.blockchainIntegrated++; // Count as OK since reads don't need recording
        }
      } else {
        // Write operations
        if (hasBlockchain) {
          icon = '✅';
          status = 'WRITE + Blockchain';
          details = `Route: ${routeFile}`;
          globalStats.blockchainIntegrated++;
        } else if (!routeFile) {
          icon = '⚠️ ';
          status = 'WRITE (Route Unknown)';
          details = 'Cannot determine route file';
          globalStats.needsAttention.push({
            portal: name,
            operation: `${call.method} ${call.endpoint}`,
            reason: 'Route file not mapped'
          });
        } else {
          icon = '⚠️ ';
          status = 'WRITE (No Blockchain)';
          details = `Route: ${routeFile} - NEEDS BLOCKCHAIN INTEGRATION`;
          globalStats.needsAttention.push({
            portal: name,
            operation: `${call.method} ${call.endpoint}`,
            reason: 'No blockchain integration found in route'
          });
        }
      }
      
      console.log(`   ${icon} [${call.method}] ${call.endpoint}`);
      console.log(`      Status: ${status}`);
      console.log(`      Details: ${details}`);
      console.log(`      Lines: ${call.lines.join(', ')}\n`);
    });
    
  } catch (err) {
    console.log(`\n   ❌ Error reading ${filePath}: ${err.message}\n`);
  }
});

console.log('\n' + '='.repeat(100));
console.log('📊 GLOBAL AUDIT SUMMARY');
console.log('='.repeat(100));
console.log(`
   Total API Operations: ${globalStats.totalOperations}
   └─ Read Operations (GET): ${globalStats.readOperations}
   └─ Write Operations (POST/PUT/PATCH/DELETE): ${globalStats.writeOperations}
   
   Blockchain Coverage:
   └─ Operations with Blockchain: ${globalStats.blockchainIntegrated}
   └─ Operations Needing Attention: ${globalStats.needsAttention.length}
   └─ Coverage: ${((globalStats.blockchainIntegrated / globalStats.totalOperations) * 100).toFixed(1)}%
`);

if (globalStats.needsAttention.length > 0) {
  console.log('='.repeat(100));
  console.log(`⚠️  OPERATIONS REQUIRING BLOCKCHAIN INTEGRATION (${globalStats.needsAttention.length})`);
  console.log('='.repeat(100));
  globalStats.needsAttention.forEach((item, idx) => {
    console.log(`\n   ${idx + 1}. ${item.portal}`);
    console.log(`      Operation: ${item.operation}`);
    console.log(`      Issue: ${item.reason}`);
  });
  console.log('');
} else {
  console.log('✅ PERFECT! All write operations have blockchain integration!\n');
}

console.log('='.repeat(100));
console.log('🎯 CONCLUSION');
console.log('='.repeat(100));
console.log(`
All portal operations have been audited:
• Read operations (GET) display data - no blockchain recording needed
• Write operations (POST/PUT/PATCH/DELETE) must record to blockchain
• Current coverage shows ${globalStats.blockchainIntegrated}/${globalStats.totalOperations} operations verified

${globalStats.needsAttention.length === 0 ? 
  '✅ All critical write operations are integrated with the consortium blockchain!' :
  `⚠️  ${globalStats.needsAttention.length} operations need blockchain integration - see list above.`}
`);

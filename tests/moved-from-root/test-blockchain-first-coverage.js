#!/usr/bin/env node
/**
 * Test: Blockchain-First Coverage Analysis
 * Checks which API endpoints call blockchain BEFORE writing to database
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('  BLOCKCHAIN-FIRST PATTERN COVERAGE ANALYSIS');
console.log('═══════════════════════════════════════════════════════════\n');

const routesDir = path.join(__dirname, 'api', 'src', 'routes');

// Scan ALL route files
const allRouteFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

console.log(`📁 Scanning ${allRouteFiles.length} route files...\n`);

let totalEndpoints = 0;
let blockchainFirstEndpoints = 0;
let dbFirstEndpoints = 0;

const results = {};

allRouteFiles.forEach(routeFile => {
  const filePath = path.join(routesDir, routeFile);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${routeFile} not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  results[routeFile] = {
    blockchainFirst: [],
    dbFirst: [],
    endpoints: 0
  };

  // Find route handlers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for route definitions
    if (/router\.(post|put|patch|delete)\(/.test(line)) {
      const routePath = line.match(/['"`]([^'"`]+)['"`]/)?.[1] || 'unknown';
      const method = line.match(/router\.(\w+)/)?.[1]?.toUpperCase() || 'UNKNOWN';
      
      // Check the next 100 lines for this endpoint's implementation
      const endpointCode = lines.slice(i, i + 150).join('\n');
      
      // Check if it calls blockchain first
      const hasFabricCall = /fabricService\.(invoke|register|sign|allocate|request|submit|approve)|auditService\.(recordAudit|log)/i.test(endpointCode);
      const hasDbWrite = /(INSERT INTO|UPDATE .* SET|db\.run\(.*INSERT|db\.run\(.*UPDATE|postgresDb\.run\(.*INSERT|postgresDb\.run\(.*UPDATE)/i.test(endpointCode);
      
      if (hasDbWrite) {
        results[routeFile].endpoints++;
        totalEndpoints++;
        
        // Find position of first blockchain call vs first DB write
        const fabricMatch = endpointCode.match(/fabricService\.(invoke|register|sign|allocate|request|submit|approve)|auditService\.(recordAudit|log)/i);
        const dbMatch = endpointCode.match(/(INSERT INTO|UPDATE .* SET|db\.run\(.*INSERT|db\.run\(.*UPDATE|postgresDb\.run\(.*INSERT|postgresDb\.run\(.*UPDATE)/i);
        
        if (fabricMatch && dbMatch) {
          const fabricPos = endpointCode.indexOf(fabricMatch[0]);
          const dbPos = endpointCode.indexOf(dbMatch[0]);
          
          if (fabricPos < dbPos) {
            results[routeFile].blockchainFirst.push(`${method} ${routePath}`);
            blockchainFirstEndpoints++;
          } else {
            results[routeFile].dbFirst.push(`${method} ${routePath}`);
            dbFirstEndpoints++;
          }
        } else if (hasFabricCall) {
          results[routeFile].blockchainFirst.push(`${method} ${routePath}`);
          blockchainFirstEndpoints++;
        } else {
          results[routeFile].dbFirst.push(`${method} ${routePath}`);
          dbFirstEndpoints++;
        }
      }
    }
  }
});

// Print results
console.log('\n📊 RESULTS BY FILE:\n');

Object.keys(results).forEach(file => {
  const data = results[file];
  if (data.endpoints === 0) return;
  
  console.log(`\n${file}:`);
  console.log(`  Total Endpoints: ${data.endpoints}`);
  
  if (data.blockchainFirst.length > 0) {
    console.log(`  ✅ Blockchain-First (${data.blockchainFirst.length}):`);
    data.blockchainFirst.forEach(endpoint => {
      console.log(`     ${endpoint}`);
    });
  }
  
  if (data.dbFirst.length > 0) {
    console.log(`  ❌ DB-First (${data.dbFirst.length}):`);
    data.dbFirst.forEach(endpoint => {
      console.log(`     ${endpoint}`);
    });
  }
});

// Summary
console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const percentageCorrect = totalEndpoints > 0 
  ? Math.round((blockchainFirstEndpoints / totalEndpoints) * 100)
  : 0;

console.log(`Total Endpoints Analyzed: ${totalEndpoints}`);
console.log(`✅ Blockchain-First: ${blockchainFirstEndpoints} (${percentageCorrect}%)`);
console.log(`❌ DB-First: ${dbFirstEndpoints} (${100 - percentageCorrect}%)`);

if (percentageCorrect >= 90) {
  console.log('\n🎯 EXCELLENT: System is mostly blockchain-first!');
} else if (percentageCorrect >= 70) {
  console.log('\n✓ GOOD: Most endpoints use blockchain-first pattern.');
} else if (percentageCorrect >= 50) {
  console.log('\n⚠️  PARTIAL: Significant work needed for blockchain-first.');
} else {
  console.log('\n❌ NEEDS WORK: Most endpoints bypass blockchain.');
}

console.log('\n═══════════════════════════════════════════════════════════\n');

// Exit with appropriate code
process.exit(dbFirstEndpoints > 0 ? 1 : 0);

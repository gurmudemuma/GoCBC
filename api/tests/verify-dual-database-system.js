#!/usr/bin/env node

/**
 * DUAL-DATABASE ARCHITECTURE VERIFICATION
 * Verifies all API endpoints properly use blockchain + PostgreSQL enrichment
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, 'src', 'routes');

const EXPECTED_PATTERNS = {
  'banking.ts': {
    enrichment: ['dataEnrichmentService', 'enrichLCs'],
    fallback: ['PostgreSQL', 'fallback'],
    endpoints: ["router.get('/lc'"]
  },
  'contracts.ts': {
    enrichment: ['dataEnrichmentService', 'enrichContracts'],
    fallback: ['PostgreSQL', 'fallback'],
    endpoints: ["router.get('/'"]
  },
  'shipments.ts': {
    enrichment: ['dataEnrichmentService', 'enrichShipments'],
    fallback: [],
    endpoints: ["router.get('/'"]
  },
  'forex.ts': {
    enrichment: ['dataEnrichmentService', 'enrichForexAllocations'],
    fallback: [],
    endpoints: ["router.get('/'"]
  },
  'payments.ts': {
    enrichment: ['dataEnrichmentService', 'buyerName'],
    fallback: [],
    endpoints: ["router.get('/'"]
  }
};

function checkFile(filename, patterns) {
  const filepath = path.join(ROUTES_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return false;
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  
  console.log(`\n📄 Checking ${filename}...`);
  
  let allPassed = true;
  
  // Check enrichment patterns
  console.log('   Enrichment Service:');
  for (const pattern of patterns.enrichment) {
    if (content.includes(pattern)) {
      console.log(`   ✅ Found: ${pattern}`);
    } else {
      console.log(`   ❌ Missing: ${pattern}`);
      allPassed = false;
    }
  }
  
  // Check fallback patterns (optional for some endpoints)
  if (patterns.fallback.length > 0) {
    console.log('   Fallback Pattern:');
    let foundFallback = false;
    for (const pattern of patterns.fallback) {
      if (content.includes(pattern)) {
        console.log(`   ✅ Found: ${pattern}`);
        foundFallback = true;
      }
    }
    if (!foundFallback) {
      console.log(`   ⚠️  No fallback pattern found (optional)`);
    }
  }
  
  // Check endpoint definitions
  console.log('   Endpoints:');
  for (const endpoint of patterns.endpoints) {
    if (content.includes(endpoint)) {
      console.log(`   ✅ Endpoint: ${endpoint}`);
    } else {
      console.log(`   ❌ Missing endpoint: ${endpoint}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

function checkEnrichmentService() {
  const servicePath = path.join(__dirname, 'src', 'services', 'dataEnrichmentService.ts');
  
  console.log('\n🔧 Checking Data Enrichment Service...');
  
  if (!fs.existsSync(servicePath)) {
    console.log('   ❌ dataEnrichmentService.ts not found!');
    return false;
  }
  
  const content = fs.readFileSync(servicePath, 'utf8');
  
  const requiredMethods = [
    'enrichContracts',
    'enrichLCs',
    'enrichShipments',
    'enrichForexAllocations'
  ];
  
  let allPassed = true;
  for (const method of requiredMethods) {
    if (content.includes(`async ${method}`) || content.includes(`${method}(`)) {
      console.log(`   ✅ Method: ${method}`);
    } else {
      console.log(`   ❌ Missing method: ${method}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

function checkSyncScripts() {
  console.log('\n📦 Checking Sync Scripts...');
  
  const scripts = [
    'sync-all-contracts-to-postgres.js',
    'sync-all-data-to-postgres.js'
  ];
  
  let allPassed = true;
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`   ✅ Script: ${script}`);
    } else {
      console.log(`   ❌ Missing script: ${script}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

function checkDocumentation() {
  console.log('\n📚 Checking Documentation...');
  
  const docPath = path.join(__dirname, '..', 'Docs', 'DUAL-DATABASE-ARCHITECTURE.md');
  
  if (fs.existsSync(docPath)) {
    console.log('   ✅ Documentation: DUAL-DATABASE-ARCHITECTURE.md');
    return true;
  } else {
    console.log('   ❌ Missing documentation: DUAL-DATABASE-ARCHITECTURE.md');
    return false;
  }
}

console.log('='  .repeat(60));
console.log('   DUAL-DATABASE ARCHITECTURE VERIFICATION');
console.log('='  .repeat(60));

let allChecks = true;

// Check enrichment service
allChecks = checkEnrichmentService() && allChecks;

// Check all route files
for (const [filename, patterns] of Object.entries(EXPECTED_PATTERNS)) {
  allChecks = checkFile(filename, patterns) && allChecks;
}

// Check sync scripts
allChecks = checkSyncScripts() && allChecks;

// Check documentation
allChecks = checkDocumentation() && allChecks;

console.log('\n' + '='  .repeat(60));
if (allChecks) {
  console.log('✅ VERIFICATION PASSED - Dual-database architecture implemented!');
} else {
  console.log('⚠️  VERIFICATION INCOMPLETE - Some components need attention');
}
console.log('='  .repeat(60) + '\n');

process.exit(allChecks ? 0 : 1);

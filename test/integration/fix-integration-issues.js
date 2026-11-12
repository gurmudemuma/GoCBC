#!/usr/bin/env node

/**
 * Integration Fixer
 * 1. Match frontend API calls to backend endpoints (with /api/v1 prefix handling)
 * 2. Identify truly orphaned frontend calls (no matching backend)
 * 3. List missing frontend implementations for backend endpoints
 * 4. Provide actionable recommendations
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const UI_DIR = path.join(PROJECT_ROOT, 'ui/src');
const catalogFile = path.join(PROJECT_ROOT, 'test/integration/backend-endpoints-catalog.json');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║ FRONTEND-BACKEND INTEGRATION FIXER                             ║');
console.log('║ Identifying orphaned calls and missing implementations         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

// Load backend catalog
if (!fs.existsSync(catalogFile)) {
  console.error('❌ Backend catalog not found. Run catalog-all-endpoints.js first.');
  process.exit(1);
}

const backendRoutes = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));

// Helper to recursively find files
function findFiles(dir, extensions, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
        findFiles(fullPath, extensions, files);
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract frontend API calls with file locations
function extractFrontendCalls() {
  console.log('Step 1: Extracting frontend API calls...');
  console.log('─────────────────────────────────────────────────────────');
  
  const calls = new Map(); // endpoint -> [{file, line}]
  const frontendFiles = findFiles(UI_DIR, ['.ts', '.tsx']);
  
  const patterns = [
    { regex: /apiFetch\s*\(\s*['"`]([^'"`]+)['"`]/g, offset: 0 },
    { regex: /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g, offset: 1 },
    { regex: /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g, offset: 0 },
    { regex: /api\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g, offset: 1 },
  ];
  
  for (const file of frontendFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (const pattern of patterns) {
        let match;
        pattern.regex.lastIndex = 0;
        
        while ((match = pattern.regex.exec(content)) !== null) {
          const url = match[pattern.offset + 1] || match[1];
          
          // Only process relative URLs that look like API endpoints
          if (url && url.startsWith('/') && !url.startsWith('//')) {
            // Remove query parameters and fragments
            let cleanUrl = url.split('?')[0].split('#')[0];
            
            // Skip asset paths
            if (!cleanUrl.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot)$/)) {
              // Normalize: remove /api/v1 prefix if present for comparison
              const normalizedUrl = cleanUrl.replace(/^\/api\/v1/, '');
              
              // Find line number
              const matchPos = content.substring(0, match.index).split('\n').length;
              
              if (!calls.has(normalizedUrl)) {
                calls.set(normalizedUrl, []);
              }
              
              calls.get(normalizedUrl).push({
                file: path.relative(PROJECT_ROOT, file),
                line: matchPos,
                original: cleanUrl
              });
            }
          }
        }
      }
    } catch (err) {
      // Silently skip unreadable files
    }
  }
  
  console.log(`Found ${calls.size} unique frontend API endpoints`);
  console.log('');
  
  return calls;
}

// Check if frontend call matches backend route
function matchesRoute(call, route) {
  // Exact match
  if (call === route.path) return true;
  
  // Convert route pattern with params to regex
  const pattern = route.path.replace(/:[a-zA-Z0-9_-]+/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  
  return regex.test(call);
}

// Find matching backend routes for a frontend call
function findMatchingBackendRoutes(call, routes) {
  return routes.filter(route => matchesRoute(call, route));
}

// Main analysis
function analyzeIntegration() {
  const frontendCalls = extractFrontendCalls();
  const backendPaths = new Set(backendRoutes.map(r => r.path));
  
  console.log('Step 2: Matching frontend calls to backend routes...');
  console.log('─────────────────────────────────────────────────────────');
  console.log('');
  
  const matched = [];
  const orphaned = [];
  
  for (const [endpoint, locations] of frontendCalls.entries()) {
    const matchingRoutes = findMatchingBackendRoutes(endpoint, backendRoutes);
    
    if (matchingRoutes.length > 0) {
      matched.push({
        endpoint,
        locations,
        backendRoutes: matchingRoutes
      });
    } else {
      orphaned.push({
        endpoint,
        locations
      });
    }
  }
  
  console.log(`✅ Matched: ${matched.length} endpoints`);
  console.log(`⚠️  Orphaned: ${orphaned.length} endpoints`);
  console.log('');
  
  // Print orphaned calls
  if (orphaned.length > 0) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║ ORPHANED FRONTEND CALLS (No matching backend)                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    
    for (const item of orphaned) {
      console.log(`❌ ${item.endpoint}`);
      for (const loc of item.locations.slice(0, 3)) { // Show max 3 locations
        console.log(`   📄 ${loc.file}:${loc.line}`);
      }
      if (item.locations.length > 3) {
        console.log(`   ... and ${item.locations.length - 3} more locations`);
      }
      console.log('');
    }
  }
  
  // Find backend endpoints not called by frontend
  console.log('Step 3: Finding backend endpoints without frontend calls...');
  console.log('─────────────────────────────────────────────────────────');
  console.log('');
  
  const frontendEndpoints = new Set(frontendCalls.keys());
  const uncalledBackend = backendRoutes.filter(route => {
    // Check if any frontend call matches this route
    for (const fe of frontendEndpoints) {
      if (matchesRoute(fe, route)) {
        return false;
      }
    }
    return true;
  });
  
  console.log(`Found ${uncalledBackend.length} backend endpoints not called by frontend`);
  console.log('');
  
  // Focus on important uncalled endpoints (exclude internal/debug routes)
  const importantUncalled = uncalledBackend.filter(route => {
    const path = route.path.toLowerCase();
    return !path.includes('debug') && 
           !path.includes('test') &&
           !path.includes('health') &&
           path !== '/' &&
           route.method === 'GET'; // Focus on GET endpoints for display
  });
  
  if (importantUncalled.length > 0) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║ BACKEND ENDPOINTS WITHOUT FRONTEND IMPLEMENTATION              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Showing ${Math.min(importantUncalled.length, 30)} of ${importantUncalled.length} GET endpoints:`);
    console.log('');
    
    for (const route of importantUncalled.slice(0, 30)) {
      console.log(`⚠️  ${route.method} ${route.path}`);
      console.log(`   📁 ${route.file}`);
    }
    
    if (importantUncalled.length > 30) {
      console.log(`   ... and ${importantUncalled.length - 30} more`);
    }
  }
  
  // Generate summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('INTEGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Backend endpoints: ${backendRoutes.length}`);
  console.log(`Frontend unique calls: ${frontendCalls.size}`);
  console.log(`Successfully matched: ${matched.length}`);
  console.log(`Orphaned frontend calls: ${orphaned.length}`);
  console.log(`Backend endpoints not used: ${uncalledBackend.length}`);
  console.log('');
  
  // Save detailed report
  const report = {
    summary: {
      backendEndpoints: backendRoutes.length,
      frontendCalls: frontendCalls.size,
      matched: matched.length,
      orphaned: orphaned.length,
      unusedBackend: uncalledBackend.length
    },
    orphanedCalls: orphaned,
    unusedBackendEndpoints: importantUncalled.slice(0, 50),
    matchedIntegrations: matched.slice(0, 20)
  };
  
  const reportFile = path.join(PROJECT_ROOT, 'test/integration/integration-fix-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📊 Detailed report saved to: ${path.relative(PROJECT_ROOT, reportFile)}`);
  console.log('');
  
  // Recommendations
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  if (orphaned.length > 0) {
    console.log('1. ORPHANED FRONTEND CALLS:');
    console.log('   - Review each orphaned call to determine if:');
    console.log('     a) Backend endpoint needs to be created');
    console.log('     b) Frontend code is outdated and should be removed');
    console.log('     c) Call is external/proxy (no action needed)');
    console.log('');
  }
  
  if (importantUncalled.length > 0) {
    console.log('2. MISSING FRONTEND IMPLEMENTATIONS:');
    console.log('   - Create frontend components/calls for new endpoints');
    console.log('   - Focus on the 12 recently added endpoints:');
    console.log('     • /renewals, /pre-shipment, /post-delivery');
    console.log('     • /pending-release, /lc/pending-examination');
    console.log('     • /lc/discrepancies, /swift/analytics');
    console.log('     • /analytics/ecta, /analytics/nbe, /analytics/trends');
    console.log('     • /market/prices, /grading-standards');
    console.log('');
  }
  
  return {
    orphaned: orphaned.length,
    unusedBackend: importantUncalled.length
  };
}

// Run analysis
const results = analyzeIntegration();
process.exit(0);

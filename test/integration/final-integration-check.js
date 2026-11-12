#!/usr/bin/env node

/**
 * Final Integration Check
 * Maps server.ts base paths to actual backend endpoints to get full paths
 * Then compares with frontend calls to find true orphans
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const API_DIR = path.join(PROJECT_ROOT, 'api/src');
const UI_DIR = path.join(PROJECT_ROOT, 'ui/src');

// Base path mappings from server.ts
const BASE_PATHS = {
  'authRoutes': '/auth',
  'exporterRoutes': '/exporters',
  'usersRoutes': '/users',
  'cryptoUsersRoutes': '/crypto-users',
  'contractRoutes': '/contracts',
  'bankingRoutes': '/banking',
  'shipmentRoutes': '/shipments',
  'analyticsRoutes': '/analytics',
  'blockchainRoutes': '/blockchain',
  'fileRoutes': '/files',
  'forexRoutes': '/forex',
  'customsRoutes': '/customs',
  'ecxRoutes': '/ecx',
  'qualityRoutes': '/quality',
  'permitsRoutes': '/permits',
  'auditRoutes': '/audit',
  'traceabilityRoutes': '/traceability',
  'phytosanitaryRoutes': '/phytosanitary',
  'insuranceRoutes': '/insurance',
  'paymentsRoutes': '/payments',
  'documentsRoutes': '/documents',
  'landTransportRoutes': '/land-transport',
  'retentionRoutes': '/retention',
  'lcAmendmentsRoutes': '/lc',
  'swiftRoutes': '/swift',
  'eudrRoutes': '/eudr',
  'courierRoutes': '/courier',
  'statusRoutes': '/status',
  'notificationsRoutes': '/notifications',
  'postDeliveryWorkflowRoutes': '/post-delivery',
  'blockchainSignaturesRoutes': '/blockchain-signatures',
  'blockchainSyncRoutes': '/blockchain-sync',
  'monitoringRoutes': '/monitoring',
  'cacheRoutes': '/cache',
  'statsRoutes': '/stats',
  'repatriationRoutes': '/repatriation',
  'exchangeRatesRoutes': '/exchange-rates',
  'inspectionRoutes': '/inspection',
  'bordercrossingRoutes': '/bordercrossing',
  'portalsRoutes': '/portals',
  'complianceRoutes': '/compliance',
  'warehouseRoutes': '/warehouse',
  'marketRoutes': '/market',
  'shippingRoutes': '/shipping',
  'certificatesRoutes': '/certificates',
};

// Reverse mapping: filename -> router variable name (best guess)
const ROUTE_FILE_TO_ROUTER = {
  'auth.routes.ts': 'authRoutes',
  'auth.ts': 'authRoutes',
  'exporters.routes.ts': 'exporterRoutes',
  'exporters.ts': 'exporterRoutes',
  'users.routes.ts': 'usersRoutes',
  'users.ts': 'usersRoutes',
  'crypto-users.ts': 'cryptoUsersRoutes',
  'contracts.ts': 'contractRoutes',
  'banking.ts': 'bankingRoutes',
  'shipments.ts': 'shipmentRoutes',
  'analytics.ts': 'analyticsRoutes',
  'blockchain.ts': 'blockchainRoutes',
  'files.ts': 'fileRoutes',
  'forex.ts': 'forexRoutes',
  'customs.ts': 'customsRoutes',
  'ecx.ts': 'ecxRoutes',
  'quality.ts': 'qualityRoutes',
  'permits.ts': 'permitsRoutes',
  'audit.ts': 'auditRoutes',
  'traceability.ts': 'traceabilityRoutes',
  'phytosanitary.ts': 'phytosanitaryRoutes',
  'insurance.ts': 'insuranceRoutes',
  'payments.ts': 'paymentsRoutes',
  'documents.ts': 'documentsRoutes',
  'landTransport.ts': 'landTransportRoutes',
  'retention.ts': 'retentionRoutes',
  'lc-amendments.ts': 'lcAmendmentsRoutes',
  'lcAmendments.ts': 'lcAmendmentsRoutes',
  'swift.ts': 'swiftRoutes',
  'eudr.ts': 'eudrRoutes',
  'courier.ts': 'courierRoutes',
  'status.ts': 'statusRoutes',
  'notifications.ts': 'notificationsRoutes',
  'postDeliveryWorkflow.ts': 'postDeliveryWorkflowRoutes',
  'blockchainSignatures.ts': 'blockchainSignaturesRoutes',
  'blockchainSync.ts': 'blockchainSyncRoutes',
  'monitoring.ts': 'monitoringRoutes',
  'cache.ts': 'cacheRoutes',
  'stats.ts': 'statsRoutes',
  'repatriation.ts': 'repatriationRoutes',
  'exchangeRates.ts': 'exchangeRatesRoutes',
  'inspection.ts': 'inspectionRoutes',
  'bordercrossing.ts': 'bordercrossingRoutes',
  'portals.ts': 'portalsRoutes',
  'compliance.ts': 'complianceRoutes',
  'warehouse.ts': 'warehouseRoutes',
  'market.ts': 'marketRoutes',
  'shipping.ts': 'shippingRoutes',
  'certificates.ts': 'certificatesRoutes',
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║ FINAL INTEGRATION CHECK                                        ║');
console.log('║ Complete frontend-backend endpoint validation                  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

// Helper to find files
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

// Extract backend routes with full paths
function extractBackendRoutes() {
  console.log('Step 1: Extracting backend routes with full base paths...');
  console.log('─────────────────────────────────────────────────────────');
  
  const routes = new Map(); // fullPath -> {method, file}
  const routeFiles = findFiles(path.join(API_DIR, 'routes'), ['.ts']);
  
  for (const file of routeFiles) {
    const fileName = path.basename(file);
    const routerName = ROUTE_FILE_TO_ROUTER[fileName];
    const basePath = routerName ? BASE_PATHS[routerName] : '';
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routePattern.exec(content)) !== null) {
        const [, method, routePath] = match;
        let fullPath = basePath + routePath;
        fullPath = fullPath.replace(/\/+/g, '/');
        if (fullPath !== '/' && fullPath.endsWith('/')) {
          fullPath = fullPath.slice(0, -1);
        }
        
        const key = `${method.toUpperCase()} ${fullPath}`;
        if (!routes.has(key)) {
          routes.set(key, { method: method.toUpperCase(), path: fullPath, file: fileName });
        }
      }
    } catch (err) {
      // Skip
    }
  }
  
  console.log(`Found ${routes.size} backend endpoints with full paths`);
  console.log('');
  return routes;
}

// Extract frontend calls
function extractFrontendCalls() {
  console.log('Step 2: Extracting frontend API calls...');
  console.log('─────────────────────────────────────────────────────────');
  
  const calls = new Map();
  const frontendFiles = findFiles(UI_DIR, ['.ts', '.tsx']);
  
  const patterns = [
    /apiFetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /api\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ];
  
  for (const file of frontendFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(content)) !== null) {
          const url = match[2] || match[1];
          
          if (url && url.startsWith('/') && !url.startsWith('//')) {
            let cleanUrl = url.split('?')[0].split('#')[0];
            
            if (!cleanUrl.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot)$/)) {
              // Remove /api/v1 prefix if present
              cleanUrl = cleanUrl.replace(/^\/api\/v1/, '');
              
              const matchPos = content.substring(0, match.index).split('\n').length;
              
              if (!calls.has(cleanUrl)) {
                calls.set(cleanUrl, []);
              }
              
              calls.get(cleanUrl).push({
                file: path.relative(PROJECT_ROOT, file),
                line: matchPos,
              });
            }
          }
        }
      }
    } catch (err) {
      // Skip
    }
  }
  
  console.log(`Found ${calls.size} unique frontend API calls`);
  console.log('');
  return calls;
}

// Check if call matches route (with param matching)
function matchesRoute(call, route) {
  if (call === route.path) return true;
  const pattern = route.path.replace(/:[a-zA-Z0-9_-]+/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(call);
}

// Main analysis
function analyzeIntegration() {
  const backendRoutes = extractBackendRoutes();
  const frontendCalls = extractFrontendCalls();
  
  console.log('Step 3: Matching frontend calls to backend endpoints...');
  console.log('─────────────────────────────────────────────────────────');
  console.log('');
  
  const matched = [];
  const orphaned = [];
  
  // Convert backend routes map to array for matching
  const routesArray = Array.from(backendRoutes.values());
  
  for (const [endpoint, locations] of frontendCalls.entries()) {
    const matchingRoutes = routesArray.filter(route => matchesRoute(endpoint, route));
    
    if (matchingRoutes.length > 0) {
      matched.push({ endpoint, locations, backendRoutes: matchingRoutes });
    } else {
      orphaned.push({ endpoint, locations });
    }
  }
  
  console.log(`✅ Matched: ${matched.length} endpoints`);
  console.log(`❌ Orphaned: ${orphaned.length} endpoints (TRUE orphans)`);
  console.log('');
  
  // Print TRUE orphaned calls
  if (orphaned.length > 0) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║ TRUE ORPHANED FRONTEND CALLS                                   ║');
    console.log('║ These frontend calls have NO matching backend endpoint         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    
    for (const item of orphaned) {
      console.log(`❌ ${item.endpoint}`);
      for (const loc of item.locations.slice(0, 2)) {
        console.log(`   📄 ${loc.file}:${loc.line}`);
      }
      if (item.locations.length > 2) {
        console.log(`   ... and ${item.locations.length - 2} more locations`);
      }
      console.log('');
    }
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('FINAL INTEGRATION STATUS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Backend endpoints: ${backendRoutes.size}`);
  console.log(`Frontend API calls: ${frontendCalls.size}`);
  console.log(`✅ Successfully integrated: ${matched.length}`);
  console.log(`❌ True orphans (need fixing): ${orphaned.length}`);
  console.log('');
  
  // Save report
  const report = {
    summary: {
      backendEndpoints: backendRoutes.size,
      frontendCalls: frontendCalls.size,
      matched: matched.length,
      trueOrphans: orphaned.length,
    },
    orphanedCalls: orphaned,
    matchedCalls: matched.slice(0, 50),
  };
  
  const reportFile = path.join(PROJECT_ROOT, 'INTEGRATION-STATUS-FINAL.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📊 Report saved to: ${path.basename(reportFile)}`);
  console.log('');
  
  // Next steps
  if (orphaned.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('ACTIONS REQUIRED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('For each orphaned call, you need to either:');
    console.log('  1. CREATE the missing backend endpoint');
    console.log('  2. REMOVE the dead frontend code (if feature deprecated)');
    console.log('  3. FIX the frontend URL (if it\'s incorrect)');
    console.log('');
  } else {
    console.log('✅ ALL FRONTEND CALLS ARE PROPERLY INTEGRATED!');
    console.log('');
  }
  
  return { matched: matched.length, orphaned: orphaned.length };
}

// Run
const results = analyzeIntegration();
process.exit(results.orphaned > 0 ? 1 : 0);

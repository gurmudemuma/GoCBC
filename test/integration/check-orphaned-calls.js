#!/usr/bin/env node

/**
 * Orphaned API Calls Checker
 * Finds frontend API calls that don't have corresponding backend endpoints
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const UI_DIR = path.join(PROJECT_ROOT, 'ui/src');
const API_DIR = path.join(PROJECT_ROOT, 'api/src');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║ ORPHANED API CALLS CHECKER                                     ║');
console.log('║ Finding frontend calls to non-existent backend endpoints       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

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

// Extract frontend API calls
function extractFrontendCalls() {
  console.log('Step 1: Extracting all API calls from frontend...');
  console.log('─────────────────────────────────────────────────────────');
  
  const calls = new Set();
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
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(content)) !== null) {
          // Extract the URL - it might be in match[1] or match[2] depending on pattern
          const url = match[2] || match[1];
          
          // Only process relative URLs that look like API endpoints
          if (url && url.startsWith('/') && !url.startsWith('//')) {
            // Remove query parameters and fragments
            const cleanUrl = url.split('?')[0].split('#')[0];
            
            // Skip asset paths
            if (!cleanUrl.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot)$/)) {
              calls.add(cleanUrl);
            }
          }
        }
      }
    } catch (err) {
      // Silently skip unreadable files
    }
  }
  
  console.log(`Found ${calls.size} unique API endpoint patterns`);
  console.log('');
  
  return Array.from(calls).sort();
}

// Extract backend routes
function extractBackendRoutes() {
  console.log('Step 2: Extracting all backend route definitions...');
  console.log('─────────────────────────────────────────────────────────');
  
  const routes = new Set();
  const basePaths = new Map(); // Store base paths from route registrations
  
  // First, extract base paths from server.ts
  const serverFile = path.join(API_DIR, 'server.ts');
  if (fs.existsSync(serverFile)) {
    const content = fs.readFileSync(serverFile, 'utf8');
    
    // Look for app.use('/api/v1/something', someRouter) patterns
    const usePattern = /(?:app|apiV1)\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\)/g;
    let match;
    
    while ((match = usePattern.exec(content)) !== null) {
      const [, basePath, routerName] = match;
      basePaths.set(routerName, basePath);
    }
  }
  
  // Then extract routes from route files
  const routeFiles = findFiles(path.join(API_DIR, 'routes'), ['.ts']);
  
  for (const file of routeFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file, '.ts');
      
      // Try to determine base path for this router
      let basePath = '';
      
      // Check if router is exported and matches a base path
      const exportMatch = content.match(/export\s+(?:default\s+)?(\w+Router)/);
      if (exportMatch) {
        const routerName = exportMatch[1];
        basePath = basePaths.get(routerName) || '';
      }
      
      // If no base path found, try to infer from filename
      if (!basePath && fileName.includes('.routes')) {
        const resourceName = fileName.replace('.routes', '');
        basePath = `/${resourceName}`;
      }
      
      // Extract route definitions
      const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routePattern.exec(content)) !== null) {
        const [, , routePath] = match;
        
        // Combine base path with route path
        let fullPath = basePath + routePath;
        
        // Normalize path
        fullPath = fullPath.replace(/\/+/g, '/'); // Remove duplicate slashes
        if (fullPath !== '/' && fullPath.endsWith('/')) {
          fullPath = fullPath.slice(0, -1); // Remove trailing slash
        }
        
        routes.add(fullPath);
      }
    } catch (err) {
      // Silently skip unreadable files
    }
  }
  
  console.log(`Found ${routes.size} backend route definitions`);
  console.log('');
  
  return Array.from(routes).sort();
}

// Check if a frontend call matches a backend route
function matchesRoute(call, route) {
  // Exact match
  if (call === route) return true;
  
  // Convert route pattern with params to regex
  // e.g., /users/:id -> /users/[^/]+
  const pattern = route.replace(/:[a-zA-Z0-9_-]+/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  
  return regex.test(call);
}

// Main check function
function checkOrphanedCalls() {
  const frontendCalls = extractFrontendCalls();
  const backendRoutes = extractBackendRoutes();
  
  console.log('Step 3: Checking for orphaned calls...');
  console.log('─────────────────────────────────────────────────────────');
  console.log('');
  
  const orphans = [];
  const verified = [];
  
  for (const call of frontendCalls) {
    // Check against all backend routes
    const matched = backendRoutes.some(route => matchesRoute(call, route));
    
    if (matched) {
      verified.push(call);
    } else {
      // Additional check: might be external or full URL
      if (call.startsWith('http://') || call.startsWith('https://')) {
        verified.push(call); // External API
      } else {
        orphans.push(call);
        console.log(`⚠️  ORPHANED: ${call}`);
        console.log(`   No matching backend route found`);
        console.log('');
      }
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Frontend API calls verified: ${verified.length}`);
  console.log(`Orphaned calls found: ${orphans.length}`);
  console.log('');
  
  if (orphans.length === 0) {
    console.log('✅ All frontend API calls have corresponding backend endpoints!');
  } else {
    console.log(`⚠️  Found ${orphans.length} potential orphaned calls`);
    console.log('');
    console.log('Note: Some \'orphaned\' calls may be:');
    console.log('  - External API calls (not to your backend)');
    console.log('  - Proxy routes handled differently');
    console.log('  - False positives from dynamic route matching');
    console.log('');
    console.log('Review each orphaned call to determine if it needs:');
    console.log('  1. Backend endpoint implementation');
    console.log('  2. Frontend code update to use correct endpoint');
    console.log('  3. No action (external API, proxy, etc.)');
  }
  
  return orphans.length;
}

// Run the check
const orphanCount = checkOrphanedCalls();
process.exit(orphanCount > 0 ? 1 : 0);

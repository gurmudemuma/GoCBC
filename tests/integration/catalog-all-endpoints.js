#!/usr/bin/env node

/**
 * Complete Backend Endpoint Catalog
 * Extracts ALL actual backend routes with their HTTP methods
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const API_DIR = path.join(PROJECT_ROOT, 'api/src');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║ BACKEND ENDPOINT CATALOG                                       ║');
console.log('║ Complete list of all available backend API endpoints          ║');
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

// Extract base paths from server.ts
function extractBasePaths() {
  const basePaths = new Map();
  const serverFile = path.join(API_DIR, 'server.ts');
  
  if (!fs.existsSync(serverFile)) {
    console.log('⚠️  Warning: server.ts not found');
    return basePaths;
  }
  
  const content = fs.readFileSync(serverFile, 'utf8');
  
  // Look for apiV1.use('/path', routerName) patterns
  const patterns = [
    /apiV1\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\)/g,
    /app\.use\s*\(\s*['"`]\/api\/v1([^'"`]*)['"`]\s*,\s*(\w+)\)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      const [, basePath, routerName] = match;
      basePaths.set(routerName, basePath);
    }
  }
  
  return basePaths;
}

// Extract routes from route files
function extractRoutes() {
  console.log('Scanning route files...');
  console.log('─────────────────────────────────────────────────────────');
  
  const basePaths = extractBasePaths();
  const routes = [];
  const routeFiles = findFiles(path.join(API_DIR, 'routes'), ['.ts']);
  
  console.log(`Found ${routeFiles.length} route files`);
  console.log('');
  
  for (const file of routeFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file, '.ts');
      
      // Determine base path
      let basePath = '';
      
      // Check if router is exported and matches a base path
      const exportMatch = content.match(/export\s+(?:default\s+)?(\w+Router)/);
      if (exportMatch) {
        const routerName = exportMatch[1];
        basePath = basePaths.get(routerName) || '';
      }
      
      // If no base path found, infer from filename
      if (!basePath) {
        if (fileName.includes('.routes')) {
          const resourceName = fileName.replace('.routes', '');
          basePath = `/${resourceName}`;
        }
      }
      
      // Extract route definitions with HTTP methods
      const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routePattern.exec(content)) !== null) {
        const [, method, routePath] = match;
        
        // Combine base path with route path
        let fullPath = basePath + routePath;
        
        // Normalize path
        fullPath = fullPath.replace(/\/+/g, '/'); // Remove duplicate slashes
        if (fullPath !== '/' && fullPath.endsWith('/')) {
          fullPath = fullPath.slice(0, -1); // Remove trailing slash
        }
        
        routes.push({
          method: method.toUpperCase(),
          path: fullPath,
          file: path.relative(API_DIR, file),
        });
      }
    } catch (err) {
      console.log(`⚠️  Error processing ${file}: ${err.message}`);
    }
  }
  
  // Sort routes by path then method
  routes.sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return a.method.localeCompare(b.method);
  });
  
  return routes;
}

// Main function
function catalogEndpoints() {
  const routes = extractRoutes();
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║ COMPLETE ENDPOINT CATALOG                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total endpoints found: ${routes.length}`);
  console.log('');
  
  // Group by resource
  const byResource = new Map();
  
  for (const route of routes) {
    const resource = route.path.split('/')[1] || 'root';
    if (!byResource.has(resource)) {
      byResource.set(resource, []);
    }
    byResource.get(resource).push(route);
  }
  
  // Print grouped routes
  for (const [resource, resourceRoutes] of Array.from(byResource.entries()).sort()) {
    console.log(`\n╔════ ${resource.toUpperCase()} (${resourceRoutes.length} endpoints) ════`);
    for (const route of resourceRoutes) {
      console.log(`  ${route.method.padEnd(6)} ${route.path}`);
    }
  }
  
  // Save to JSON for further processing
  const outputFile = path.join(PROJECT_ROOT, 'tests/integration/backend-endpoints-catalog.json');
  fs.writeFileSync(outputFile, JSON.stringify(routes, null, 2));
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Catalog saved to: ${path.relative(PROJECT_ROOT, outputFile)}`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  return routes;
}

// Run
catalogEndpoints();

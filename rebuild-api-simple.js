#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Simple API Rebuild ===\n');

try {
  // Step 1: Change to API directory
  const apiDir = '/home/guda/GoCBC/api';
  process.chdir(apiDir);
  console.log('✓ Changed to:', apiDir);
  
  // Step 2: Clean dist
  console.log('\nCleaning dist directory...');
  execSync('rm -rf dist', { stdio: 'inherit' });
  console.log('✓ Cleaned dist/');
  
  // Step 3: Build
  console.log('\nBuilding TypeScript...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 4: Verify build output
  const exportersPath = path.join(apiDir, 'dist/routes/exporters.js');
  if (fs.existsSync(exportersPath)) {
    console.log('\n✓ Build successful!');
    
    // Check for the fix
    const content = fs.readFileSync(exportersPath, 'utf8');
    if (content.includes('UPPER(exporter_id)')) {
      console.log('✓ Case-insensitive fix is present in compiled code');
      
      // Show the line
      const lines = content.split('\n');
      const lineNum = lines.findIndex(l => l.includes('UPPER(exporter_id)'));
      console.log(`  Found at line ${lineNum + 1}: ${lines[lineNum].trim()}`);
    } else {
      console.log('✗ WARNING: Case-insensitive fix NOT found in compiled code!');
    }
  } else {
    console.log('\n✗ Build failed - exporters.js not found');
    process.exit(1);
  }
  
  // Step 5: Kill old processes
  console.log('\nKilling old API processes...');
  try {
    execSync('pkill -f "node.*api" || true', { stdio: 'inherit' });
    execSync('pkill -f "ts-node" || true', { stdio: 'inherit' });
  } catch (e) {
    // Ignore errors from pkill
  }
  
  console.log('\nWaiting 3 seconds...');
  execSync('sleep 3');
  
  // Step 6: Start fresh API
  console.log('\nStarting API...');
  const { spawn } = require('child_process');
  
  const apiProcess = spawn('node', ['dist/server.js'], {
    cwd: apiDir,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Save PID
  fs.writeFileSync('/tmp/cecbs-api.pid', apiProcess.pid.toString());
  console.log(`✓ API started with PID: ${apiProcess.pid}`);
  
  // Pipe output to log file
  const logStream = fs.createWriteStream('/tmp/cecbs-api.log', { flags: 'w' });
  apiProcess.stdout.pipe(logStream);
  apiProcess.stderr.pipe(logStream);
  
  apiProcess.unref();
  
  console.log('\nWaiting 5 seconds for API to start...');
  execSync('sleep 5');
  
  // Step 7: Test health
  console.log('\nTesting health endpoint...');
  try {
    const result = execSync('curl -s http://localhost:3001/health', { encoding: 'utf8' });
    console.log('Health response:', result);
    
    const health = JSON.parse(result);
    if (health.status === 'healthy') {
      console.log('\n✓✓✓ API IS RUNNING AND HEALTHY! ✓✓✓');
    }
  } catch (e) {
    console.log('✗ Health check failed:', e.message);
  }
  
  console.log('\n=== DONE ===');
  console.log('API logs: tail -f /tmp/cecbs-api.log');
  console.log('Test in browser: http://localhost:3000');
  
} catch (error) {
  console.error('\n✗ ERROR:', error.message);
  process.exit(1);
}

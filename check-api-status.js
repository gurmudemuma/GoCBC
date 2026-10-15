#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

console.log('=== API Status Check ===\n');

// Check PID file
try {
  const pid = fs.readFileSync('/tmp/cecbs-api.pid', 'utf8').trim();
  console.log(`PID file contains: ${pid}`);
  
  // Check if process is running
  try {
    process.kill(pid, 0); // Signal 0 just checks if process exists
    console.log(`✓ Process ${pid} is running`);
    
    // Get process details
    const psOutput = execSync(`ps -p ${pid} -o pid,cmd`, { encoding: 'utf8' });
    console.log('\nProcess details:');
    console.log(psOutput);
  } catch (e) {
    console.log(`✗ Process ${pid} is NOT running`);
  }
} catch (e) {
  console.log('✗ No PID file found');
}

// Test HTTP endpoints
console.log('\n=== Testing Endpoints ===\n');

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${description}:`);
        console.log(`  Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log(`  Response:`, JSON.stringify(json, null, 2).substring(0, 200));
          } catch (e) {
            console.log(`  Response: ${data.substring(0, 100)}`);
          }
        } else {
          console.log(`  Error: ${data.substring(0, 200)}`);
        }
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`${description}: ✗ ${e.message}`);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`${description}: ✗ Timeout`);
      resolve();
    });
  });
}

(async () => {
  await testEndpoint('/health', '1. Health');
  await testEndpoint('/api/v1/exporters/contracts', '2. Contracts (no auth)');
  
  console.log('\n=== Database Direct Test ===\n');
  try {
    const result = execSync(
      'docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM contracts WHERE UPPER(exporter_id) = \'EXP001\';"',
      { encoding: 'utf8' }
    );
    console.log(`Contracts in DB for EXP001: ${result.trim()}`);
  } catch (e) {
    console.log('✗ Database test failed:', e.message);
  }
  
  console.log('\n=== DONE ===');
})();

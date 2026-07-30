// Diagnostic script to identify why data is not showing up
const fetch = require('node-fetch');

async function diagnose() {
  console.log('=== CECBS Data Diagnosis ===\n');

  // 1. Check if API server is healthy
  console.log('1. Checking API server health...');
  try {
    const healthResponse = await fetch('http://localhost:3001/health');
    const health = await healthResponse.json();
    console.log('   ✅ API Server Status:', health.status);
    console.log('   📊 Services:', health.services);
    console.log('   - Database:', health.services.database ? '✅ Connected' : '❌ Not Connected');
    console.log('   - Blockchain:', health.services.blockchain ? '✅ Connected' : '❌ Not Connected');
    
    if (!health.services.blockchain) {
      console.log('\n   ⚠️  ISSUE FOUND: Blockchain is not connected!');
      console.log('   This is likely why no data is showing up.');
      console.log('   Check if all Docker containers are running: docker ps');
    }
  } catch (error) {
    console.error('   ❌ Cannot reach API server:', error.message);
    return;
  }

  // 2. Try to get a token (login)
  console.log('\n2. Attempting to login and get auth token...');
  let token = null;
  try {
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'bank_admin',
        password: 'password123'
      })
    });
    const loginResult = await loginResponse.json();
    if (loginResult.success && loginResult.token) {
      token = loginResult.token;
      console.log('   ✅ Successfully logged in as bank_admin');
    } else {
      console.log('   ❌ Login failed:', loginResult.error?.message);
      console.log('   Trying exporter account...');
      
      const exporterLogin = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ethiopianpremium',
          password: 'password123'
        })
      });
      const exporterResult = await exporterLogin.json();
      if (exporterResult.success && exporterResult.token) {
        token = exporterResult.token;
        console.log('   ✅ Successfully logged in as ethiopianpremium');
      }
    }
  } catch (error) {
    console.error('   ❌ Login error:', error.message);
  }

  if (!token) {
    console.log('\n   ⚠️  Cannot proceed without authentication token');
    return;
  }

  // 3. Check contracts
  console.log('\n3. Checking contracts...');
  try {
    const contractsResponse = await fetch('http://localhost:3001/api/v1/contracts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const contractsResult = await contractsResponse.json();
    if (contractsResult.success) {
      console.log(`   ✅ Found ${contractsResult.data?.length || 0} contracts`);
      if (contractsResult.data && contractsResult.data.length > 0) {
        console.log('   Sample contract statuses:');
        contractsResult.data.slice(0, 5).forEach(c => {
          console.log(`      - ${c.contractID || c.contractId}: ${c.contractStatus}`);
        });
      } else {
        console.log('   ⚠️  No contracts found in blockchain');
        console.log('   This could mean:');
        console.log('      - No contracts have been created yet');
        console.log('      - Blockchain data was cleared');
        console.log('      - Chaincode is not properly deployed');
      }
    } else {
      console.log('   ❌ Failed to fetch contracts:', contractsResult.error?.message);
    }
  } catch (error) {
    console.error('   ❌ Error fetching contracts:', error.message);
  }

  // 4. Check Letters of Credit
  console.log('\n4. Checking Letters of Credit...');
  try {
    const lcResponse = await fetch('http://localhost:3001/api/v1/banking/lc', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const lcResult = await lcResponse.json();
    if (lcResult.success) {
      console.log(`   ✅ Found ${lcResult.data?.length || 0} Letters of Credit`);
      if (lcResult.data && lcResult.data.length > 0) {
        console.log('   Sample LC statuses:');
        lcResult.data.slice(0, 5).forEach(lc => {
          console.log(`      - ${lc.lcId || lc.LCID}: ${lc.status || lc.Status}`);
        });
      } else {
        console.log('   ℹ️  No LCs found (this is normal if none have been issued yet)');
      }
    } else {
      console.log('   ❌ Failed to fetch LCs:', lcResult.error?.message);
    }
  } catch (error) {
    console.error('   ❌ Error fetching LCs:', error.message);
  }

  // 5. Check Forex Allocations
  console.log('\n5. Checking Forex Allocations...');
  try {
    const forexResponse = await fetch('http://localhost:3001/api/v1/banking/forex', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const forexResult = await forexResponse.json();
    if (forexResult.success) {
      console.log(`   ✅ Found ${forexResult.data?.length || 0} Forex Allocations`);
      if (forexResult.data && forexResult.data.length === 0) {
        console.log('   ℹ️  No forex allocations found (normal if none allocated yet)');
      }
    } else {
      console.log('   ❌ Failed to fetch forex:', forexResult.error?.message);
    }
  } catch (error) {
    console.error('   ❌ Error fetching forex:', error.message);
  }

  console.log('\n=== Diagnosis Complete ===\n');
  console.log('SUMMARY:');
  console.log('If blockchain is not connected, check:');
  console.log('  1. All Docker containers are running: docker ps');
  console.log('  2. Chaincode is deployed: ls -la chaincode/');
  console.log('  3. Network is initialized: docker-compose logs');
  console.log('\nIf blockchain is connected but no data:');
  console.log('  1. Create a test contract via the UI or API');
  console.log('  2. Register an exporter if needed');
  console.log('  3. Check chaincode logs: docker logs peer0.ecta.cecbs.et');
}

diagnose().catch(console.error);

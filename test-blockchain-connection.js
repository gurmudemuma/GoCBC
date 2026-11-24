#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('Testing Blockchain Connection...\n');

// Test 1: Check if channel exists
console.log('1. Checking if coffeechannel exists...');
try {
  const result = execSync('docker exec peer0.ecta.cecbs.et peer channel list', { encoding: 'utf8' });
  if (result.includes('coffeechannel')) {
    console.log('   ✓ Channel coffeechannel exists\n');
  } else {
    console.log('   ✗ Channel coffeechannel NOT found\n');
    process.exit(1);
  }
} catch (error) {
  console.log('   ✗ Failed to check channel:', error.message, '\n');
  process.exit(1);
}

// Test 2: Check if chaincode is installed
console.log('2. Checking if chaincode is installed...');
try {
  const result = execSync('docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled', { encoding: 'utf8' });
  if (result.includes('coffee')) {
    console.log('   ✓ Chaincode installed\n');
  } else {
    console.log('   ✗ Chaincode NOT installed\n');
  }
} catch (error) {
  console.log('   ✗ Failed to check chaincode:', error.message, '\n');
}

// Test 3: Check if chaincode is committed
console.log('3. Checking if chaincode is committed...');
try {
  const result = execSync('docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel', { encoding: 'utf8' });
  if (result.includes('coffee')) {
    console.log('   ✓ Chaincode committed\n');
  } else {
    console.log('   ✗ Chaincode NOT committed\n');
  }
} catch (error) {
  console.log('   ✗ Failed to check committed chaincode:', error.message, '\n');
}

// Test 4: Try a simple query
console.log('4. Testing chaincode query...');
try {
  const result = execSync(`docker exec -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 -e CORE_PEER_LOCALMSPID=ECTAMSP -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"Args":["QueryAllExporters"]}'`, { encoding: 'utf8' });
  console.log('   ✓ Query successful\n');
  console.log('   Response preview:', result.substring(0, 200), '...\n');
} catch (error) {
  console.log('   ✗ Query failed:', error.message, '\n');
}

console.log('Testing complete!');

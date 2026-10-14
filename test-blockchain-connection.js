#!/usr/bin/env node

/**
 * Test blockchain connection directly
 */

const path = require('path');
const fs = require('fs');

async function testConnection() {
  console.log('=== Testing Blockchain Connection ===\n');

  // Check if connection profile exists
  const ccpPath = path.resolve(__dirname, 'blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json');
  console.log('1. Checking connection profile...');
  console.log('   Path:', ccpPath);
  
  if (!fs.existsSync(ccpPath)) {
    console.log('   ❌ Connection profile NOT FOUND');
    console.log('\n   This is the problem! The blockchain network needs to be generated first.');
    console.log('   Run: cd blockchain && ./network.sh up createChannel -ca -s couchdb');
    return;
  }
  console.log('   ✅ Connection profile exists');

  // Read connection profile
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
  console.log('\n2. Connection profile details:');
  console.log('   Channel:', ccp.channels ? Object.keys(ccp.channels)[0] : 'N/A');
  console.log('   Peers:', ccp.peers ? Object.keys(ccp.peers).length : 0);
  console.log('   Orderers:', ccp.orderers ? Object.keys(ccp.orderers).length : 0);

  // Check if wallet exists
  const walletPath = path.resolve(__dirname, 'api/wallet');
  console.log('\n3. Checking wallet...');
  console.log('   Path:', walletPath);
  
  if (!fs.existsSync(walletPath)) {
    console.log('   ❌ Wallet directory NOT FOUND');
    console.log('   Need to enroll admin user first');
    return;
  }
  
  const walletFiles = fs.readdirSync(walletPath);
  console.log('   ✅ Wallet exists with', walletFiles.length, 'identities');
  console.log('   Identities:', walletFiles.join(', '));

  // Try to load Fabric SDK
  console.log('\n4. Testing Fabric SDK...');
  try {
    const { Gateway, Wallets } = require('fabric-network');
    console.log('   ✅ Fabric SDK loaded');

    // Try to connect
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('admin');
    
    if (!identity) {
      console.log('   ❌ Admin identity not found in wallet');
      console.log('   Need to enroll admin first');
      return;
    }
    console.log('   ✅ Admin identity found');

    // Try gateway connection
    const gateway = new Gateway();
    try {
      await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
      });
      console.log('   ✅ Connected to gateway');

      const network = await gateway.getNetwork('coffeechannel');
      console.log('   ✅ Connected to channel: coffeechannel');

      const contract = network.getContract('coffee');
      console.log('   ✅ Got contract: coffee');

      // Try a simple query
      console.log('\n5. Testing chaincode query...');
      const result = await contract.evaluateTransaction('QueryAllExporters');
      const exporters = JSON.parse(result.toString());
      console.log('   ✅ Query successful! Found', exporters.length, 'exporters on blockchain');

      gateway.disconnect();
      console.log('\n✅ ✅ ✅ BLOCKCHAIN CONNECTION WORKING! ✅ ✅ ✅');
      
    } catch (error) {
      console.log('   ❌ Connection failed:', error.message);
      if (error.message.includes('chaincode')) {
        console.log('\n   Chaincode issue - may not be deployed or initialized');
      } else if (error.message.includes('channel')) {
        console.log('\n   Channel issue - may not exist or not joined');
      } else if (error.message.includes('peer') || error.message.includes('UNAVAILABLE')) {
        console.log('\n   Peer connectivity issue - peers may not be running or reachable');
      }
      gateway.disconnect();
    }

  } catch (error) {
    console.log('   ❌ Fabric SDK error:', error.message);
  }
}

testConnection().catch(console.error);

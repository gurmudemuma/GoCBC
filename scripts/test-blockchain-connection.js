// Test Blockchain Connection
// Quick script to verify Fabric network connectivity

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function testConnection() {
  console.log('🔍 Testing Hyperledger Fabric Connection...\n');

  try {
    // Step 1: Check if wallet exists
    console.log('1️⃣ Checking wallet...');
    const walletPath = path.join(__dirname, '..', 'api', 'wallet');
    if (!fs.existsSync(walletPath)) {
      console.error('❌ Wallet directory not found:', walletPath);
      return;
    }
    console.log('✅ Wallet found');

    // Step 2: Load wallet
    console.log('\n2️⃣ Loading wallet...');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('admin');
    if (!identity) {
      console.error('❌ Admin identity not found in wallet');
      return;
    }
    console.log('✅ Admin identity loaded');

    // Step 3: Build connection profile
    console.log('\n3️⃣ Building connection profile...');
    const orgName = 'ecta';
    const mspId = 'ECTAMSP';
    const channelName = 'coffeechannel';
    
    const tlsCertPath = path.join(
      __dirname,
      '..',
      'blockchain',
      'organizations',
      'peerOrganizations',
      `${orgName}.cecbs.et`,
      'peers',
      `peer0.${orgName}.cecbs.et`,
      'tls',
      'ca.crt'
    );

    if (!fs.existsSync(tlsCertPath)) {
      console.error('❌ TLS certificate not found:', tlsCertPath);
      return;
    }
    console.log('✅ TLS certificate found');

    const ccp = {
      name: 'cecbs-network',
      version: '1.0.0',
      client: {
        organization: orgName,
        connection: {
          timeout: { peer: { endorser: '300' }, orderer: '300' }
        }
      },
      channels: {
        [channelName]: {
          orderers: ['orderer.cecbs.et'],
          peers: {
            [`peer0.${orgName}.cecbs.et`]: {
              endorsingPeer: true,
              chaincodeQuery: true,
              ledgerQuery: true,
              eventSource: true
            }
          }
        }
      },
      organizations: {
        [orgName]: {
          mspid: mspId,
          peers: [`peer0.${orgName}.cecbs.et`]
        }
      },
      peers: {
        [`peer0.${orgName}.cecbs.et`]: {
          url: `grpcs://localhost:7051`,
          tlsCACerts: { pem: fs.readFileSync(tlsCertPath).toString() },
          grpcOptions: {
            'ssl-target-name-override': `peer0.${orgName}.cecbs.et`,
            hostnameOverride: `peer0.${orgName}.cecbs.et`
          }
        }
      },
      orderers: {
        'orderer.cecbs.et': {
          url: 'grpcs://localhost:7050',
          tlsCACerts: {
            path: path.join(__dirname, '..', 'blockchain', 'organizations', 'ordererOrganizations', 'cecbs.et', 'orderers', 'orderer.cecbs.et', 'tls', 'ca.crt')
          },
          grpcOptions: {
            'ssl-target-name-override': 'orderer.cecbs.et'
          }
        }
      }
    };

    console.log('✅ Connection profile built');

    // Step 4: Connect to gateway
    console.log('\n4️⃣ Connecting to gateway...');
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });
    console.log('✅ Connected to gateway');

    // Step 5: Get network
    console.log('\n5️⃣ Getting network...');
    const network = await gateway.getNetwork(channelName);
    console.log('✅ Network retrieved:', channelName);

    // Step 6: Get contract
    console.log('\n6️⃣ Getting contract...');
    const contract = network.getContract('coffee');
    console.log('✅ Contract retrieved: coffee');

    // Step 7: Query blockchain
    console.log('\n7️⃣ Querying blockchain (QueryAllExporters)...');
    const result = await contract.evaluateTransaction('QueryAllExporters');
    const exporters = JSON.parse(result.toString());
    console.log(`✅ Query successful: ${exporters.length} exporters found`);
    
    if (exporters.length > 0) {
      console.log('\n📋 Sample exporter:');
      console.log(JSON.stringify(exporters[0], null, 2));
    }

    // Disconnect
    gateway.disconnect();
    console.log('\n✅ All tests passed! Blockchain is working correctly.');
    console.log(`\n📊 Total Exporters on Blockchain: ${exporters.length}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if Fabric network is running: docker ps');
    console.error('2. Check if chaincode is deployed: docker logs peer0.ecta.cecbs.et');
    console.error('3. Verify connection.json configuration');
    console.error('4. Check if admin identity is enrolled');
  }
}

testConnection();

// Script to register approved exporters on blockchain
// Run this when exporters exist in database but not on blockchain

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');

const dbPath = path.join(__dirname, 'cecbs.db');
const db = new sqlite3.Database(dbPath);

// Blockchain connection setup
async function setupFabricConnection() {
  const gateway = new Gateway();
  
  try {
    // Load wallet
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if admin identity exists
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.error('❌ Admin identity not found in wallet. Please ensure the API server has been started at least once.');
      return null;
    }
    
    // Build connection profile
    const ccp = buildConnectionProfile();
    
    // Connect to gateway
    const connectionOptions = {
      wallet: wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true },
      eventHandlerOptions: {
        commitTimeout: 300,
      },
    };
    
    await gateway.connect(ccp, connectionOptions);
    
    // Get network and contract
    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');
    
    console.log('✅ Connected to Fabric network\n');
    
    return { gateway, contract };
  } catch (error) {
    console.error('❌ Failed to connect to Fabric network:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure Fabric network is running');
    console.error('  2. Check that all peer containers are healthy: docker ps');
    console.error('  3. Verify the API server has connected to Fabric at least once');
    console.error('  4. Check logs: docker logs peer0.ecta.cecbs.et\n');
    return null;
  }
}

function buildConnectionProfile() {
  const mspId = 'ECTAMSP';
  const orgName = 'ecta';
  const channelName = 'coffeechannel';
  
  return {
    name: 'cecbs-network',
    version: '1.0.0',
    client: {
      organization: orgName,
      connection: {
        timeout: {
          peer: { endorser: '300' },
          orderer: '300',
        },
      },
    },
    channels: {
      [channelName]: {
        orderers: ['orderer.cecbs.et'],
        peers: {
          [`peer0.${orgName}.cecbs.et`]: {
            endorsingPeer: true,
            chaincodeQuery: true,
            ledgerQuery: true,
            eventSource: true,
          },
        },
      },
    },
    organizations: {
      [orgName]: {
        mspid: mspId,
        peers: [`peer0.${orgName}.cecbs.et`],
        certificateAuthorities: [],
      },
    },
    peers: {
      [`peer0.${orgName}.cecbs.et`]: {
        url: `grpcs://localhost:7051`,
        tlsCACerts: {
          path: path.join(
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
          ),
        },
        grpcOptions: {
          'ssl-target-name-override': `peer0.${orgName}.cecbs.et`,
          hostnameOverride: `peer0.${orgName}.cecbs.et`,
          'grpc.keepalive_time_ms': 120000,
          'grpc.keepalive_timeout_ms': 20000,
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.http2.min_time_between_pings_ms': 120000,
          'grpc.http2.max_pings_without_data': 0,
        },
      },
    },
    orderers: {
      'orderer.cecbs.et': {
        url: 'grpcs://localhost:7050',
        tlsCACerts: {
          path: path.join(
            __dirname,
            '..',
            'blockchain',
            'organizations',
            'ordererOrganizations',
            'cecbs.et',
            'orderers',
            'orderer.cecbs.et',
            'tls',
            'ca.crt'
          ),
        },
        grpcOptions: {
          'ssl-target-name-override': 'orderer.cecbs.et',
          hostnameOverride: 'orderer.cecbs.et',
          'grpc.keepalive_time_ms': 120000,
          'grpc.keepalive_timeout_ms': 20000,
        },
      },
    },
  };
}

async function checkExporterOnBlockchain(contract, exporterId) {
  try {
    const result = await contract.evaluateTransaction('ReadExporter', exporterId);
    return result.toString() ? JSON.parse(result.toString()) : null;
  } catch (error) {
    if (error.message.includes('does not exist')) {
      return null;
    }
    throw error;
  }
}

async function registerExporterOnBlockchain(contract, exporter) {
  try {
    const args = [
      exporter.exporter_id,
      exporter.company_name,
      exporter.ecta_license_number,
      exporter.exporter_type || 'private',
      exporter.capital_requirement || '0',
      exporter.professional_taster || '',
      exporter.taster_certificate || '',
      exporter.laboratory_certificate_number || '',
      exporter.license_expiry_date || '',
    ];
    
    console.log(`  📝 Registering ${exporter.exporter_id} on blockchain...`);
    
    const result = await contract.submitTransaction('RegisterExporter', ...args);
    
    console.log(`  ✅ Successfully registered ${exporter.exporter_id}`);
    return { success: true };
    
  } catch (error) {
    console.error(`  ❌ Failed to register ${exporter.exporter_id}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   REGISTER MISSING EXPORTERS ON BLOCKCHAIN                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Step 1: Get approved exporters from database
  console.log('📋 Step 1: Loading approved exporters from database...\n');
  
  const exporters = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM exporter_applications 
       WHERE status = 'approved' 
       AND exporter_id IS NOT NULL
       ORDER BY approved_at DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  console.log(`Found ${exporters.length} approved exporters in database:\n`);
  
  if (exporters.length === 0) {
    console.log('No exporters to process. Exiting.');
    db.close();
    return;
  }
  
  exporters.forEach((exp, index) => {
    console.log(`  ${index + 1}. ${exp.exporter_id} - ${exp.company_name}`);
  });
  
  console.log('\n' + '─'.repeat(70) + '\n');
  
  // Step 2: Connect to Fabric
  console.log('📡 Step 2: Connecting to Hyperledger Fabric network...\n');
  
  const fabricConnection = await setupFabricConnection();
  
  if (!fabricConnection) {
    console.log('\n❌ Cannot proceed without Fabric connection. Exiting.');
    db.close();
    return;
  }
  
  const { gateway, contract } = fabricConnection;
  
  // Step 3: Check each exporter and register if missing
  console.log('🔍 Step 3: Checking blockchain registration status...\n');
  
  const results = {
    alreadyRegistered: [],
    successfullyRegistered: [],
    failed: [],
  };
  
  for (const exporter of exporters) {
    console.log(`\nProcessing: ${exporter.exporter_id} (${exporter.company_name})`);
    
    // Check if already on blockchain
    const blockchainExporter = await checkExporterOnBlockchain(contract, exporter.exporter_id);
    
    if (blockchainExporter) {
      console.log(`  ℹ️  Already registered on blockchain`);
      results.alreadyRegistered.push(exporter.exporter_id);
    } else {
      console.log(`  ⚠️  NOT found on blockchain - registering now...`);
      const registerResult = await registerExporterOnBlockchain(contract, exporter);
      
      if (registerResult.success) {
        results.successfullyRegistered.push(exporter.exporter_id);
      } else {
        results.failed.push({
          exporterId: exporter.exporter_id,
          error: registerResult.error,
        });
      }
    }
  }
  
  // Step 4: Summary
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 REGISTRATION SUMMARY:\n');
  
  console.log(`✅ Already registered:        ${results.alreadyRegistered.length}`);
  if (results.alreadyRegistered.length > 0) {
    results.alreadyRegistered.forEach(id => console.log(`   - ${id}`));
  }
  
  console.log(`\n✨ Newly registered:          ${results.successfullyRegistered.length}`);
  if (results.successfullyRegistered.length > 0) {
    results.successfullyRegistered.forEach(id => console.log(`   - ${id}`));
  }
  
  console.log(`\n❌ Failed to register:        ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach(item => console.log(`   - ${item.exporterId}: ${item.error}`));
  }
  
  console.log('\n' + '═'.repeat(70));
  
  if (results.successfullyRegistered.length > 0) {
    console.log('\n✅ SUCCESS: Exporters have been synced to blockchain!');
    console.log('   You can now issue LCs for these exporters.');
  }
  
  if (results.failed.length > 0) {
    console.log('\n⚠️  Some exporters failed to register. Check the errors above.');
    console.log('   You may need to verify the blockchain network status.');
  }
  
  // Cleanup
  gateway.disconnect();
  db.close();
  
  console.log('\n✅ Script completed.\n');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  db.close();
  process.exit(1);
});

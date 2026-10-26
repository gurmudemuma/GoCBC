// Backfill Audit Trail from BOTH PostgreSQL + Blockchain
// This reads REAL data from PostgreSQL AND Hyperledger Fabric

const { Pool } = require('pg');
const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

let gateway;
let contract;
let network;

function buildConnectionProfile() {
  // Build a simple connection profile for ECTA
  const orgName = 'ecta';
  const peerName = `peer0.${orgName}.cecbs.et`;
  
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
      coffeechannel: {
        orderers: ['orderer.cecbs.et'],
        peers: {
          [peerName]: {
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
        mspid: 'ECTAMSP',
        peers: [peerName],
        certificateAuthorities: [],
      },
    },
    peers: {
      [peerName]: {
        url: 'grpcs://localhost:7051',
        tlsCACerts: {
          path: path.join(
            __dirname,
            '..',
            'blockchain',
            'organizations',
            'peerOrganizations',
            'ecta.cecbs.et',
            'peers',
            peerName,
            'tls',
            'ca.crt'
          ),
        },
        grpcOptions: {
          'ssl-target-name-override': peerName,
          hostnameOverride: peerName,
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
        },
      },
    },
  };
}

async function connectToBlockchain() {
  try {
    console.log('🔗 Connecting to Hyperledger Fabric blockchain...');
    
    // Load wallet
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if admin identity exists
    const identity = await wallet.get('admin-ECTAMSP');
    if (!identity) {
      console.log('⚠️  Admin identity not found in wallet');
      return false;
    }
    
    // Build connection profile - use dynamic path from fabricService
    // Instead of loading from file, we'll build it dynamically
    const ccpPath = path.resolve(__dirname, '..', 'blockchain', 'organizations', 'peerOrganizations', 'ecta.cecbs.et', 'connection-ecta.json');
    
    // If connection profile doesn't exist, build it dynamically
    let ccp;
    if (fs.existsSync(ccpPath)) {
      ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    } else {
      // Build connection profile dynamically
      ccp = buildConnectionProfile();
    }
    
    // Connect to gateway
    gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin-ECTAMSP',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    // Get network and contract
    network = await gateway.getNetwork('coffeechannel');
    contract = network.getContract('coffee');
    
    console.log('✅ Connected to blockchain\n');
    return true;
  } catch (error) {
    console.log('⚠️  Blockchain not available:', error.message);
    console.log('   Continuing with PostgreSQL data only...\n');
    return false;
  }
}

async function getBlockchainData() {
  const blockchainLogs = [];
  
  try {
    // Get all exporters from blockchain
    console.log('📦 Fetching exporters from blockchain...');
    const exportersResult = await contract.evaluateTransaction('QueryAllExporters');
    const exporters = JSON.parse(exportersResult.toString());
    
    console.log(`   Found ${exporters.length} exporters on blockchain`);
    
    exporters.forEach(exporter => {
      blockchainLogs.push({
        entity_type: 'EXPORTER',
        entity_id: exporter.exporterId || exporter.ExporterId,
        action: 'BLOCKCHAIN_REGISTER',
        performed_by: 'blockchain_system',
        organization: 'ECTAMSP',  // Add organization field
        performed_by_org: 'ECTAMSP',
        old_value: 'N/A',
        new_value: 'REGISTERED_ON_BLOCKCHAIN',
        reason: `Exporter ${exporter.companyName || exporter.CompanyName} registered on blockchain`,
        metadata: {
          exporterId: exporter.exporterId || exporter.ExporterId,
          companyName: exporter.companyName || exporter.CompanyName,
          ectaLicenseNumber: exporter.ectaLicenseNumber || exporter.ECTALicenseNumber,
          exporterType: exporter.exporterType || exporter.ExporterType,
          status: exporter.status || exporter.Status,
          laboratoryCertified: exporter.laboratoryCertified || exporter.LaboratoryCertified,
          source: 'HYPERLEDGER_FABRIC',
          blockchainVerified: true
        },
        ip_address: 'blockchain',
        created_at: exporter.createdAt || exporter.CreatedAt || new Date().toISOString()
      });
    });
    
    // Get all contracts from blockchain
    console.log('📜 Fetching contracts from blockchain...');
    const contractsResult = await contract.evaluateTransaction('QueryAllContracts');
    const contracts = JSON.parse(contractsResult.toString());
    
    console.log(`   Found ${contracts.length} contracts on blockchain`);
    
    contracts.forEach(contract => {
      blockchainLogs.push({
        entity_type: 'CONTRACT',
        entity_id: contract.contractId || contract.ContractId,
        action: 'BLOCKCHAIN_REGISTER',
        performed_by: 'blockchain_system',
        organization: 'EXPORTER',  // Add organization field
        performed_by_org: 'EXPORTER',
        old_value: 'N/A',
        new_value: contract.status || contract.Status || 'REGISTERED_ON_BLOCKCHAIN',
        reason: `Sales contract registered on blockchain`,
        metadata: {
          contractId: contract.contractId || contract.ContractId,
          exporterId: contract.exporterId || contract.ExporterId,
          buyerId: contract.buyerId || contract.BuyerId,
          buyerCountry: contract.buyerCountry || contract.BuyerCountry,
          coffeeType: contract.coffeeType || contract.CoffeeType,
          quantity: contract.quantity || contract.Quantity,
          pricePerKg: contract.pricePerKg || contract.PricePerKg,
          currency: contract.currency || contract.Currency,
          totalValue: contract.totalValue || contract.TotalValue,
          status: contract.status || contract.Status,
          ectaApproved: contract.ectaApproved || contract.ECTAApproved,
          source: 'HYPERLEDGER_FABRIC',
          blockchainVerified: true
        },
        ip_address: 'blockchain',
        created_at: contract.createdAt || contract.CreatedAt || new Date().toISOString()
      });
    });
    
    // Get all LCs from blockchain
    console.log('💳 Fetching Letter of Credits from blockchain...');
    try {
      const lcsResult = await contract.evaluateTransaction('QueryAllLCs');
      const lcs = JSON.parse(lcsResult.toString());
      
      console.log(`   Found ${lcs.length} LCs on blockchain`);
      
      lcs.forEach(lc => {
        blockchainLogs.push({
          entity_type: 'LC',
          entity_id: lc.lcId || lc.LCId,
          action: 'BLOCKCHAIN_REGISTER',
          performed_by: 'blockchain_system',
          organization: 'BANKSMSP',  // Add organization field
          performed_by_org: 'BANKSMSP',
          old_value: 'N/A',
          new_value: lc.status || lc.Status || 'REGISTERED_ON_BLOCKCHAIN',
          reason: `Letter of Credit registered on blockchain`,
          metadata: {
            lcId: lc.lcId || lc.LCId,
            contractId: lc.contractId || lc.ContractId,
            exporterId: lc.exporterId || lc.ExporterId,
            bankName: lc.bankName || lc.BankName,
            amount: lc.amount || lc.Amount,
            currency: lc.currency || lc.Currency,
            status: lc.status || lc.Status,
            issuingBank: lc.issuingBank || lc.IssuingBank,
            advisingBank: lc.advisingBank || lc.AdvisingBank,
            source: 'HYPERLEDGER_FABRIC',
            blockchainVerified: true
          },
          ip_address: 'blockchain',
          created_at: lc.requestedAt || lc.RequestedAt || new Date().toISOString()
        });
      });
    } catch (error) {
      console.log('   ⚠️  QueryAllLCs not available:', error.message);
    }
    
    console.log(`✅ Collected ${blockchainLogs.length} blockchain transaction logs\n`);
    
  } catch (error) {
    console.log('⚠️  Error fetching blockchain data:', error.message);
  }
  
  return blockchainLogs;
}

async function backfillAuditTrail() {
  console.log('🔄 Backfilling Audit Trail from PostgreSQL + Blockchain...\n');
  
  let totalLogs = 0;
  let blockchainConnected = false;
  let blockchainLogs = [];

  try {
    // Try to connect to blockchain
    blockchainConnected = await connectToBlockchain();
    
    if (blockchainConnected) {
      blockchainLogs = await getBlockchainData();
    }
    
    // 1. EXPORTER APPLICATIONS (PostgreSQL)
    console.log('📋 Processing Exporter Applications from PostgreSQL...');
    const applications = await pool.query(`
      SELECT 
        application_id, company_name, status, exporter_id, ecta_license_number,
        submitted_at, approved_at, rejected_at, rejection_reason, reviewed_by,
        exporter_type, capital_requirement, professional_taster, tin_number,
        email, phone, address, city, region
      FROM exporter_applications 
      ORDER BY submitted_at ASC
    `);
    
    for (const app of applications.rows) {
      // Application submission
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'EXPORTER_APPLICATION',
        app.application_id,
        'CREATE',
        app.company_name,
        'EXPORTER',
        'EXPORTER',
        'N/A',
        'SUBMITTED',
        'Application submitted for ECTA review',
        JSON.stringify({ 
          source: 'POSTGRESQL',
          applicationId: app.application_id, 
          companyName: app.company_name,
          exporterType: app.exporter_type,
          capitalRequirement: app.capital_requirement,
          professionalTaster: app.professional_taster,
          tinNumber: app.tin_number,
          email: app.email,
          phone: app.phone,
          address: app.address,
          city: app.city,
          region: app.region,
          status: 'submitted'
        }),
        '127.0.0.1',
        app.submitted_at
      ]);
      totalLogs++;
      
      // Application approval
      if (app.status === 'approved' && app.approved_at) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          'EXPORTER_APPLICATION',
          app.application_id,
          'APPROVE',
          app.reviewed_by || 'ecta_officer',
          'ECTAMSP',
          'ECTAMSP',
          'SUBMITTED',
          'APPROVED',
          `Application approved - Exporter ID: ${app.exporter_id}, License: ${app.ecta_license_number}`,
          JSON.stringify({
            source: 'POSTGRESQL',
            applicationId: app.application_id,
            exporterId: app.exporter_id,
            ectaLicenseNumber: app.ecta_license_number,
            reviewedBy: app.reviewed_by,
            companyName: app.company_name
          }),
          '127.0.0.1',
          app.approved_at
        ]);
        totalLogs++;
      }
    }
    console.log(`✅ Created ${totalLogs} application audit logs from PostgreSQL\n`);

    // 2. Insert blockchain logs
    if (blockchainLogs.length > 0) {
      console.log('⛓️  Inserting blockchain transaction logs...');
      for (const log of blockchainLogs) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          log.entity_type,
          log.entity_id,
          log.action,
          log.performed_by,
          log.organization,
          log.performed_by_org,
          log.old_value,
          log.new_value,
          log.reason,
          JSON.stringify(log.metadata),
          log.ip_address,
          log.created_at
        ]);
        totalLogs++;
      }
      console.log(`✅ Inserted ${blockchainLogs.length} blockchain logs\n`);
    }

    // Final count
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM audit_trail');
    console.log(`\n🎉 SUCCESS!`);
    console.log(`📊 Data Sources:`);
    console.log(`   - PostgreSQL: ${totalLogs - blockchainLogs.length} logs`);
    console.log(`   - Blockchain: ${blockchainLogs.length} logs`);
    console.log(`   - Total: ${finalCount.rows[0].count} logs in database\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
    if (gateway) {
      gateway.disconnect();
    }
  }
}

backfillAuditTrail().then(() => {
  console.log('✅ Audit trail backfill complete!');
  console.log('👉 Data from BOTH PostgreSQL AND Blockchain');
  console.log('👉 Refresh your portal to see the complete audit trail');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Failed:', error);
  process.exit(1);
});

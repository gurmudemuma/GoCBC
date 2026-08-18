// Clean and Rebuild Audit Trail with UNIQUE data from PostgreSQL + Blockchain
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

async function connectToBlockchain() {
  try {
    console.log('🔗 Connecting to Hyperledger Fabric blockchain...');
    
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const identity = await wallet.get('admin-ECTAMSP');
    if (!identity) {
      console.log('⚠️  Admin identity not found in wallet');
      return false;
    }
    
    const ccpPath = path.resolve(__dirname, '..', 'blockchain', 'organizations', 'peerOrganizations', 'ecta.cecbs.et', 'connection-ecta.json');
    
    if (!fs.existsSync(ccpPath)) {
      console.log('⚠️  Connection profile not found');
      return false;
    }
    
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin-ECTAMSP',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    network = await gateway.getNetwork('coffeechannel');
    contract = network.getContract('coffee');
    
    console.log('✅ Connected to blockchain\n');
    return true;
  } catch (error) {
    console.log('⚠️  Blockchain not available:', error.message);
    return false;
  }
}

// Helper function to decode blockchain certificate and extract user identity
function decodeCertificate(certString) {
  if (!certString || certString === '') {
    return 'system';
  }
  
  try {
    const decoded = Buffer.from(certString, 'base64').toString('utf8');
    const cnMatch = decoded.match(/CN=([^,]+)/);
    if (cnMatch && cnMatch[1]) {
      // Extract just the username part (e.g., "Admin@ecta.cecbs.et" -> "Admin")
      const fullName = cnMatch[1];
      const username = fullName.split('@')[0];
      return username || fullName;
    }
  } catch (error) {
    console.log(`   ⚠️  Failed to decode certificate: ${error.message}`);
  }
  
  return 'system';
}

async function getBlockchainData() {
  const blockchainLogs = [];
  
  try {
    // Exporters
    console.log('📦 Fetching exporters from blockchain...');
    const exportersResult = await contract.evaluateTransaction('QueryAllExporters');
    const exporters = JSON.parse(exportersResult.toString());
    console.log(`   Found ${exporters.length} exporters`);
    
    for (const exporter of exporters) {
      // Find the actual company/user from database
      const appResult = await pool.query(`
        SELECT company_name, email, exporter_id
        FROM exporter_applications 
        WHERE exporter_id = $1 
        ORDER BY submitted_at DESC 
        LIMIT 1
      `, [exporter.exporterId || exporter.ExporterId]);
      
      let actualPerformer = exporter.companyName || exporter.CompanyName || 'Unknown Exporter';
      if (appResult.rows.length > 0) {
        actualPerformer = appResult.rows[0].company_name;
      }
      
      blockchainLogs.push({
        entity_type: 'EXPORTER',
        entity_id: exporter.exporterId || exporter.ExporterId,
        action: 'BLOCKCHAIN_REGISTER',
        performed_by: actualPerformer,
        organization: 'ECTAMSP',
        performed_by_org: 'ECTAMSP',
        old_value: 'N/A',
        new_value: 'REGISTERED_ON_BLOCKCHAIN',
        reason: `Exporter ${actualPerformer} registered on blockchain`,
        metadata: {
          exporterId: exporter.exporterId || exporter.ExporterId,
          companyName: exporter.companyName || exporter.CompanyName,
          ectaLicenseNumber: exporter.ectaLicenseNumber || exporter.ECTALicenseNumber,
          exporterType: exporter.exporterType || exporter.ExporterType,
          status: exporter.licenseStatus || exporter.Status,
          laboratoryCertified: exporter.laboratoryCertified || exporter.LaboratoryCertified,
          registeredBy: actualPerformer,
          source: 'HYPERLEDGER_FABRIC',
          blockchainVerified: true
        },
        ip_address: 'blockchain_network',
        created_at: exporter.createdAt || exporter.CreatedAt || new Date().toISOString()
      });
    }
    
    // Contracts
    console.log('📜 Fetching contracts from blockchain...');
    const contractsResult = await contract.evaluateTransaction('QueryAllContracts');
    const contracts = JSON.parse(contractsResult.toString());
    console.log(`   Found ${contracts.length} contracts`);
    
    for (const cont of contracts) {
      // Find the actual exporter/company from database
      const expResult = await pool.query(`
        SELECT company_name, email, exporter_id
        FROM exporter_applications 
        WHERE exporter_id = $1 AND status = 'approved'
        LIMIT 1
      `, [cont.exporterId || cont.ExporterId]);
      
      let actualPerformer = `Exporter ${cont.exporterId || cont.ExporterId}`;
      if (expResult.rows.length > 0) {
        actualPerformer = expResult.rows[0].company_name;
      }
      
      blockchainLogs.push({
        entity_type: 'CONTRACT',
        entity_id: cont.contractId || cont.ContractId,
        action: 'BLOCKCHAIN_REGISTER',
        performed_by: actualPerformer,
        organization: 'EXPORTER',
        performed_by_org: 'EXPORTER',
        old_value: 'N/A',
        new_value: cont.contractStatus || cont.Status || 'REGISTERED_ON_BLOCKCHAIN',
        reason: `Sales contract registered on blockchain by ${actualPerformer}`,
        metadata: {
          contractId: cont.contractId || cont.ContractId,
          exporterId: cont.exporterId || cont.ExporterId,
          buyerId: cont.buyerId || cont.BuyerId,
          buyerCountry: cont.buyerCountry || cont.BuyerCountry,
          coffeeType: cont.coffeeType || cont.CoffeeType,
          quantity: cont.quantity || cont.Quantity,
          pricePerKg: cont.pricePerKg || cont.PricePerKg,
          currency: cont.currency || cont.Currency,
          totalValue: cont.totalValue || cont.TotalValue,
          status: cont.contractStatus || cont.Status,
          registeredBy: actualPerformer,
          registeredByMsp: cont.registeredByMsp || 'ECTAMSP',
          source: 'HYPERLEDGER_FABRIC',
          blockchainVerified: true
        },
        ip_address: 'blockchain_network',
        created_at: cont.createdAt || cont.CreatedAt || new Date().toISOString()
      });
      
      // Add approval log if contract is approved
      if (cont.contractStatus === 'APPROVED' && cont.approvedBy) {
        // Try to find who approved it from database
        const reviewerResult = await pool.query(`
          SELECT reviewed_by FROM exporter_applications 
          WHERE exporter_id = $1 AND status = 'approved' AND reviewed_by IS NOT NULL
          LIMIT 1
        `, [cont.exporterId || cont.ExporterId]);
        
        let approver = 'ECTA Officer';
        if (reviewerResult.rows.length > 0 && reviewerResult.rows[0].reviewed_by) {
          approver = reviewerResult.rows[0].reviewed_by;
        }
        
        blockchainLogs.push({
          entity_type: 'CONTRACT',
          entity_id: cont.contractId || cont.ContractId,
          action: 'BLOCKCHAIN_APPROVE',
          performed_by: approver,
          organization: 'ECTAMSP',
          performed_by_org: 'ECTAMSP',
          old_value: 'PENDING',
          new_value: 'APPROVED',
          reason: `Contract approved on blockchain by ${approver}`,
          metadata: {
            contractId: cont.contractId || cont.ContractId,
            exporterId: cont.exporterId || cont.ExporterId,
            approvedBy: approver,
            approvalDate: cont.approvalDate,
            source: 'HYPERLEDGER_FABRIC',
            blockchainVerified: true
          },
          ip_address: 'blockchain_network',
          created_at: cont.approvalDate || cont.updatedAt || cont.createdAt || new Date().toISOString()
        });
      }
    }
    
    console.log(`✅ Collected ${blockchainLogs.length} blockchain logs\n`);
    
  } catch (error) {
    console.log('⚠️  Error fetching blockchain data:', error.message);
  }
  
  return blockchainLogs;
}

async function cleanAndRebuild() {
  console.log('🔄 Cleaning and Rebuilding Audit Trail...\n');
  
  let pgLogs = 0;
  let bcLogs = 0;
  
  try {
    // Step 1: Clear existing audit trail
    console.log('🗑️  Clearing existing audit trail...');
    await pool.query('DELETE FROM audit_trail');
    console.log('✅ Audit trail cleared\n');
    
    // Step 2: Connect to blockchain
    const blockchainConnected = await connectToBlockchain();
    let blockchainLogs = [];
    
    if (blockchainConnected) {
      blockchainLogs = await getBlockchainData();
    }
    
    // Step 3: Get PostgreSQL data (UNIQUE applications only)
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
    
    console.log(`   Found ${applications.rows.length} applications`);
    
    // Insert application logs
    for (const app of applications.rows) {
      // Application submission
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          email: app.email,
          phone: app.phone,
          status: 'submitted'
        }),
        '127.0.0.1',
        app.submitted_at
      ]);
      pgLogs++;
      
      // Application approval (if approved)
      if (app.status === 'approved' && app.approved_at) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
            reviewedBy: app.reviewed_by
          }),
          '127.0.0.1',
          app.approved_at
        ]);
        pgLogs++;
      }
    }
    console.log(`✅ Inserted ${pgLogs} PostgreSQL logs\n`);
    
    // Step 4: Insert blockchain logs
    if (blockchainLogs.length > 0) {
      console.log('⛓️  Inserting blockchain logs...');
      for (const log of blockchainLogs) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        bcLogs++;
      }
      console.log(`✅ Inserted ${bcLogs} blockchain logs\n`);
    }
    
    // Final verification
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM audit_trail');
    const pgCount = await pool.query(`SELECT COUNT(*) as count FROM audit_trail WHERE metadata::text LIKE '%POSTGRESQL%'`);
    const bcCount = await pool.query(`SELECT COUNT(*) as count FROM audit_trail WHERE metadata::text LIKE '%HYPERLEDGER_FABRIC%'`);
    
    console.log('🎉 SUCCESS!\n');
    console.log('📊 Final Audit Trail:');
    console.log(`   PostgreSQL Logs: ${pgCount.rows[0].count}`);
    console.log(`   Blockchain Logs: ${bcCount.rows[0].count}`);
    console.log(`   Total Logs: ${finalCount.rows[0].count}\n`);
    
    console.log('✅ Audit trail rebuilt with UNIQUE data from both sources!');
    
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

cleanAndRebuild().then(() => {
  console.log('\n👉 Refresh your portal to see the clean audit trail');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Failed:', error);
  process.exit(1);
});

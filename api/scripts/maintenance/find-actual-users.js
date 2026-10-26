// Find actual user information from blockchain data
const { Wallets, Gateway } = require('fabric-network');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function findActualUsers() {
  let gateway;
  
  try {
    console.log('\n🔍 Finding Actual Users from Blockchain + Database...\n');
    
    // Connect to blockchain
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('admin-ECTAMSP');
    
    if (!identity) {
      console.log('❌ Admin identity not found');
      return;
    }
    
    const ccpPath = path.resolve(__dirname, '..', 'blockchain', 'organizations', 'peerOrganizations', 'ecta.cecbs.et', 'connection-ecta.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin-ECTAMSP',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');
    
    console.log('✅ Connected to blockchain\n');
    console.log('='.repeat(80));
    
    // Get exporters and match with database users
    console.log('\n📦 EXPORTERS - Finding Actual Users:\n');
    const exportersResult = await contract.evaluateTransaction('QueryAllExporters');
    const exporters = JSON.parse(exportersResult.toString());
    
    for (const exp of exporters) {
      console.log(`Exporter ID: ${exp.exporterId}`);
      console.log(`  Company: ${exp.companyName}`);
      console.log(`  License: ${exp.ectaLicenseNumber}`);
      
      // Try to find the user who created this exporter in the database
      const appResult = await pool.query(`
        SELECT company_name, email, status, exporter_id, submitted_at
        FROM exporter_applications 
        WHERE exporter_id = $1 
        ORDER BY submitted_at DESC 
        LIMIT 1
      `, [exp.exporterId]);
      
      if (appResult.rows.length > 0) {
        const app = appResult.rows[0];
        console.log(`  ✅ Found in DB: Application by "${app.company_name}"`);
        console.log(`     Email: ${app.email}`);
        console.log(`     Status: ${app.status}`);
        console.log(`     Submitted: ${app.submitted_at}`);
        console.log(`  👤 ACTUAL PERFORMER: ${app.company_name}`);
      } else {
        console.log(`  ⚠️  No matching application found in database`);
        console.log(`  👤 FALLBACK PERFORMER: ${exp.companyName} (from blockchain)`);
      }
      console.log();
    }
    
    // Get contracts and match with database
    console.log('='.repeat(80));
    console.log('\n📜 CONTRACTS - Finding Actual Users:\n');
    const contractsResult = await contract.evaluateTransaction('QueryAllContracts');
    const contracts = JSON.parse(contractsResult.toString());
    
    for (const con of contracts) {
      console.log(`Contract ID: ${con.contractId}`);
      console.log(`  Exporter ID: ${con.exporterId}`);
      console.log(`  Status: ${con.contractStatus}`);
      
      // Find the exporter who created this contract
      const expResult = await pool.query(`
        SELECT company_name, email, exporter_id
        FROM exporter_applications 
        WHERE exporter_id = $1 AND status = 'approved'
        LIMIT 1
      `, [con.exporterId]);
      
      if (expResult.rows.length > 0) {
        const exp = expResult.rows[0];
        console.log(`  ✅ Exporter found: "${exp.company_name}"`);
        console.log(`  👤 ACTUAL PERFORMER (registration): ${exp.company_name}`);
      } else {
        console.log(`  ⚠️  Exporter not found in database`);
        console.log(`  👤 FALLBACK PERFORMER: Exporter ${con.exporterId}`);
      }
      
      // If approved, find who approved it
      if (con.contractStatus === 'APPROVED') {
        console.log(`  ✅ Contract was approved`);
        console.log(`  👤 ACTUAL PERFORMER (approval): ECTA Officer (from approvedBy certificate)`);
      }
      console.log();
    }
    
    console.log('='.repeat(80));
    console.log('\n💡 SOLUTION:\n');
    console.log('For EXPORTERS:');
    console.log('  - Match exporterId with exporter_applications.exporter_id');
    console.log('  - Use company_name as performer\n');
    console.log('For CONTRACTS (registration):');
    console.log('  - Match contract.exporterId with exporter_applications.exporter_id');
    console.log('  - Use company_name as performer\n');
    console.log('For CONTRACTS (approval):');
    console.log('  - Use "ECTA Officer" or decode approvedBy certificate');
    console.log('  - Could also store reviewer name in database\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    if (gateway) {
      gateway.disconnect();
    }
  }
}

findActualUsers().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Update LC status to UTILIZED in blockchain
 */

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

async function updateLCStatus() {
  try {
    console.log('🔧 Updating LC status to UTILIZED...');
    
    // Load connection profile
    const ccpPath = path.resolve(__dirname, 'blockchain', 'organizations', 'peerOrganizations', 'ecx.cecbs.et', 'connection-ecx.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    // Create wallet
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if identity exists
    const identity = await wallet.get('ECXMSP_Admin');
    if (!identity) {
      console.log('❌ Identity ECXMSP_Admin not found in wallet');
      console.log('Creating identity...');
      
      // Get CA
      const caInfo = ccp.certificateAuthorities['ca.ecx.cecbs.et'];
      const caTLSCACerts = caInfo.tlsCACerts.pem;
      const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
      
      // Load admin credentials
      const adminCertPath = path.resolve(__dirname, 'blockchain', 'organizations', 'peerOrganizations', 'ecx.cecbs.et', 'users', 'Admin@ecx.cecbs.et', 'msp', 'signcerts', 'cert.pem');
      const adminKeyPath = path.resolve(__dirname, 'blockchain', 'organizations', 'peerOrganizations', 'ecx.cecbs.et', 'users', 'Admin@ecx.cecbs.et', 'msp', 'keystore');
      
      const cert = fs.readFileSync(adminCertPath).toString();
      const keyFiles = fs.readdirSync(adminKeyPath);
      const keyFile = keyFiles[0];
      const privateKey = fs.readFileSync(path.join(adminKeyPath, keyFile)).toString();
      
      const x509Identity = {
        credentials: {
          certificate: cert,
          privateKey: privateKey,
        },
        mspId: 'ECXMSP',
        type: 'X.509',
      };
      
      await wallet.put('ECXMSP_Admin', x509Identity);
      console.log('✅ Identity created');
    }
    
    // Connect to gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'ECXMSP_Admin',
      discovery: { enabled: true, asLocalhost: false },
    });
    
    // Get network and contract
    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');
    
    // Get current LC
    console.log('📖 Reading current LC...');
    const lcData = await contract.evaluateTransaction('ReadLC', 'LC1789460822330');
    const lc = JSON.parse(lcData.toString());
    console.log(`Current status: ${lc.status}`);
    
    // Update status
    console.log('✏️  Updating LC status to UTILIZED...');
    lc.status = 'UTILIZED';
    lc.lastUpdated = new Date().toISOString();
    
    await contract.submitTransaction('UpdateLC', 'LC1789460822330', JSON.stringify(lc));
    
    // Verify update
    const updatedData = await contract.evaluateTransaction('ReadLC', 'LC1789460822330');
    const updated = JSON.parse(updatedData.toString());
    console.log(`✅ LC status updated to: ${updated.status}`);
    
    await gateway.disconnect();
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

updateLCStatus();

#!/usr/bin/env node
// Fix Admin Wallet - Regenerate admin identity from certificates

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function fixAdminWallet() {
  console.log('🔧 Fixing Admin Wallet...\n');

  const orgName = 'ecta';
  const mspId = 'ECTAMSP';
  const walletPath = path.join(__dirname, '..', 'wallet');
  
  try {
    // Create wallet
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Read admin certificate and private key from the blockchain directory
    const certPath = path.join(
      __dirname,
      '..',
      'blockchain',
      'organizations',
      'peerOrganizations',
      `${orgName}.cecbs.et`,
      'users',
      `Admin@${orgName}.cecbs.et`,
      'msp',
      'signcerts',
      `Admin@${orgName}.cecbs.et-cert.pem`
    );
    
    const keyPath = path.join(
      __dirname,
      '..',
      'blockchain',
      'organizations',
      'peerOrganizations',
      `${orgName}.cecbs.et`,
      'users',
      `Admin@${orgName}.cecbs.et`,
      'msp',
      'keystore'
    );

    console.log(`Reading certificate from: ${certPath}`);
    console.log(`Reading private key from: ${keyPath}`);

    const certificate = fs.readFileSync(certPath, 'utf8');
    
    // Find the private key file (it has a random name)
    const keyFiles = fs.readdirSync(keyPath);
    if (keyFiles.length === 0) {
      throw new Error(`No private key found in ${keyPath}`);
    }
    const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');

    console.log('✅ Certificates read successfully\n');

    // Create identity
    const identity = {
      credentials: {
        certificate,
        privateKey,
      },
      mspId,
      type: 'X.509',
    };

    // Store in wallet
    const adminLabel = `admin-${mspId}`;
    await wallet.put(adminLabel, identity);

    console.log(`✅ Admin identity '${adminLabel}' regenerated successfully!`);
    console.log(`   Location: ${walletPath}/${adminLabel}.id\n`);
    
    // Verify
    const storedIdentity = await wallet.get(adminLabel);
    if (storedIdentity) {
      console.log('✅ Verification: Identity can be retrieved from wallet');
      console.log(`   MSP ID: ${storedIdentity.mspId}`);
      console.log(`   Type: ${storedIdentity.type}\n`);
    }

    console.log('🎉 Admin wallet fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing admin wallet:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAdminWallet();

/**
 * Run the customs declarations migration to fix null riskFactors
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

// Load connection profile
const ccpPath = path.resolve(__dirname, '../fabric-network/connection-profiles/connection-customs.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

async function main() {
    try {
        console.log('🔧 Starting customs declarations migration...');

        // Create a new file system based wallet for managing identities
        const walletPath = path.join(__dirname, '../fabric-network/wallets/customs');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if the admin identity exists in the wallet
        const identity = await wallet.get('admin');
        if (!identity) {
            console.error('❌ Admin identity does not exist in the wallet');
            console.log('Please run enrollment script first');
            return;
        }

        // Create a new gateway for connecting to the peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { enabled: true, asLocalhost: true }
        });

        // Get the network and contract
        const network = await gateway.getNetwork('coffeechannel');
        const contract = network.getContract('coffee');

        console.log('📋 Running migration function...');
        
        // Submit the migration transaction
        const result = await contract.submitTransaction('MigrateCustomsDeclarations');
        const migrationResult = result.toString();

        console.log('\n✅ Migration complete!');
        console.log(`   ${migrationResult}`);

        // Disconnect from the gateway
        await gateway.disconnect();

    } catch (error) {
        console.error(`❌ Failed to run migration: ${error}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main();

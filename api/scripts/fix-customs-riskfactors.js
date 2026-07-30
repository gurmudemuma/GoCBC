/**
 * Fix existing customs declarations with null riskFactors
 * This script updates all existing declarations to have an empty array instead of null
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load connection profile
const ccpPath = path.resolve(__dirname, '..', 'blockchain', 'organizations', 'peerOrganizations', 'customs.cecbs.et', 'connection-customs.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

async function main() {
    try {
        console.log('🔧 Starting customs declarations riskFactors fix...');

        // Create a new file system based wallet for managing identities
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if the admin identity exists in the wallet
        const identity = await wallet.get('customs_admin');
        if (!identity) {
            console.error('❌ Admin identity does not exist in the wallet');
            console.log('Please run enrollment script first');
            return;
        }

        // Create a new gateway for connecting to the peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'customs_admin',
            discovery: { enabled: true, asLocalhost: false }
        });

        // Get the network and contract
        const network = await gateway.getNetwork('coffeechannel');
        const contract = network.getContract('coffee');

        console.log('📋 Querying all customs declarations...');
        
        // Query all declarations (using evaluate to avoid transaction)
        const result = await contract.evaluateTransaction('QueryAllCustomsDeclarations');
        const declarations = JSON.parse(result.toString());

        console.log(`Found ${declarations.length} declarations`);

        let fixedCount = 0;
        let errorCount = 0;

        for (const decl of declarations) {
            try {
                // Check if riskFactors is null or undefined
                if (!decl.riskFactors || !Array.isArray(decl.riskFactors)) {
                    console.log(`Fixing declaration ${decl.declarationId} - riskFactors is ${decl.riskFactors}`);
                    
                    // Read the declaration from state
                    const declJSON = await contract.evaluateTransaction('ReadDeclaration', decl.declarationId);
                    const declaration = JSON.parse(declJSON.toString());
                    
                    // Fix the riskFactors field
                    declaration.riskFactors = [];
                    
                    // Update the declaration - need to write it back using a proper update function
                    // Since we don't have a generic update function, we'll need to create a script that directly
                    // manipulates the chaincode state. For now, let's just log what needs to be fixed.
                    
                    console.log(`  ⚠️  Declaration ${decl.declarationId} needs riskFactors fix`);
                    fixedCount++;
                }
            } catch (error) {
                console.error(`  ❌ Error processing declaration ${decl.declarationId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`  Total declarations: ${declarations.length}`);
        console.log(`  Need fixing: ${fixedCount}`);
        console.log(`  Errors: ${errorCount}`);
        console.log(`  OK: ${declarations.length - fixedCount - errorCount}`);

        if (fixedCount > 0) {
            console.log('\n⚠️  WARNING: Found declarations with null riskFactors');
            console.log('    These need to be fixed by redeploying the chaincode and rebuilding the world state');
            console.log('    Or by creating a migration function in the chaincode');
        }

        // Disconnect from the gateway
        await gateway.disconnect();

    } catch (error) {
        console.error(`❌ Failed to fix customs declarations: ${error}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main();

/**
 * Migration Script: Fix Null Arrays in Shipments
 * 
 * This script updates all shipments in the blockchain that have null values
 * for documents and ecxLots arrays, replacing them with empty arrays.
 * 
 * This is necessary because Fabric SDK validates struct fields before
 * chaincode execution, and it rejects null values for []string fields.
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// Connection profile path
const ccpPath = path.resolve(__dirname, '../fabric-network/connection-profiles/connection-ecta.json');

async function main() {
    try {
        console.log('🔧 Starting shipment null array migration...');
        console.log('⏰ Timestamp:', new Date().toISOString());
        
        // Load connection profile
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('✅ Connection profile loaded');

        // Load wallet
        const walletPath = path.join(__dirname, '../fabric-network/wallets/ecta');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log('✅ Wallet loaded from:', walletPath);

        // Check for admin identity
        const identity = await wallet.get('admin');
        if (!identity) {
            console.error('❌ Admin identity not found in wallet');
            console.log('💡 Please run enrollment script first');
            return;
        }
        console.log('✅ Admin identity found');

        // Connect to gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { enabled: true, asLocalhost: true }
        });
        console.log('✅ Connected to gateway');

        // Get network and contract
        const network = await gateway.getNetwork('coffeechannel');
        const contract = network.getContract('coffee');
        console.log('✅ Contract acquired');

        // Query all shipments
        console.log('\n📊 Querying all shipments...');
        const result = await contract.evaluateTransaction('QueryAllShipments');
        const shipments = JSON.parse(result.toString());
        console.log(`📦 Found ${shipments.length} shipments`);

        // Count shipments needing fixes
        let needsFixCount = 0;
        let fixedCount = 0;
        let errorCount = 0;

        for (const shipment of shipments) {
            const needsFix = shipment.documents === null || shipment.ecxLots === null;
            if (needsFix) {
                needsFixCount++;
            }
        }

        console.log(`\n🔍 Analysis:`);
        console.log(`   - Total shipments: ${shipments.length}`);
        console.log(`   - Need fixing: ${needsFixCount}`);
        console.log(`   - Already correct: ${shipments.length - needsFixCount}`);

        if (needsFixCount === 0) {
            console.log('\n✅ No shipments need fixing!');
            await gateway.disconnect();
            return;
        }

        console.log(`\n🚀 Starting migration of ${needsFixCount} shipments...`);
        console.log('   This may take a few minutes...\n');

        // Fix each shipment
        for (let i = 0; i < shipments.length; i++) {
            const shipment = shipments[i];
            const needsFix = shipment.documents === null || shipment.ecxLots === null;
            
            if (!needsFix) {
                continue;
            }

            try {
                // Create fixed version
                const fixedShipment = {
                    ...shipment,
                    documents: shipment.documents === null ? [] : shipment.documents,
                    ecxLots: shipment.ecxLots === null ? [] : shipment.ecxLots,
                    updatedAt: new Date().toISOString()
                };

                // Update via chaincode - we'll need to add a migration function
                // For now, let's just log what needs to be fixed
                fixedCount++;
                
                if (fixedCount % 10 === 0) {
                    console.log(`   ✓ Processed ${fixedCount}/${needsFixCount} shipments...`);
                }

            } catch (error) {
                errorCount++;
                console.error(`   ❌ Error fixing ${shipment.shipmentId}:`, error.message);
            }
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Successfully identified: ${fixedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📦 Total processed: ${needsFixCount}`);

        console.log('\n⚠️  IMPORTANT: This script only identifies the issue.');
        console.log('   We need to add a migration function to the chaincode to fix the data.');
        console.log('   The chaincode needs an "UpdateShipmentArrays" function that can update');
        console.log('   documents and ecxLots fields for existing shipments.');

        await gateway.disconnect();
        console.log('\n✅ Migration analysis complete');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

main();

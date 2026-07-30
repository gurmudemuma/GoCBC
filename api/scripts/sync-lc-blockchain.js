/**
 * Force Approve LC on Blockchain
 * Use when LC is stuck in REQUESTED status
 */

const path = require('path');

// Import fabric service
const fabricServicePath = path.join(__dirname, 'dist', 'services', 'fabricService.js');
const { FabricService } = require(fabricServicePath);

async function syncLC(lcId) {
    const fabricService = FabricService.getInstance();

    try {
        // Get LC from blockchain
        console.log(`\n📋 Reading LC ${lcId} from blockchain...`);
        const blockchainResult = await fabricService.queryChaincode('ReadLC', [lcId]);
        
        if (!blockchainResult.success) {
            console.log(`❌ LC not found on blockchain`);
            process.exit(1);
        }

        const blockchainLC = blockchainResult.data;
        console.log(`Current Blockchain Status: ${blockchainLC.status}`);
        console.log(`Exporter: ${blockchainLC.exporterId}`);
        console.log(`Issuing Bank: ${blockchainLC.issuingBank}`);
        console.log(`Advising Bank: ${blockchainLC.advisingBank}`);

        if (blockchainLC.status === 'APPROVED') {
            console.log(`\n✅ LC is already APPROVED - ready to issue!`);
            process.exit(0);
        }

        if (blockchainLC.status === 'ISSUED') {
            console.log(`\n✅ LC is already ISSUED!`);
            process.exit(0);
        }

        if (blockchainLC.status === 'REQUESTED') {
            console.log(`\n🔄 Approving LC on blockchain...`);
            
            const result = await fabricService.invokeChaincode('ApproveLC', [
                lcId,
                blockchainLC.issuingBank || '',
                blockchainLC.advisingBank || '',
                blockchainLC.exporterId
            ]);

            if (result.success) {
                console.log(`✅ Successfully approved LC on blockchain!`);
                
                // Verify
                const verifyResult = await fabricService.queryChaincode('ReadLC', [lcId]);
                if (verifyResult.success) {
                    console.log(`\n✅ New Status: ${verifyResult.data.status}`);
                    console.log(`\n🎉 SUCCESS! LC is now ready to be issued.`);
                }
            } else {
                console.log(`❌ Failed to approve LC on blockchain:`, result.error);
                process.exit(1);
            }
        } else {
            console.log(`\n⚠️ LC is in ${blockchainLC.status} status - cannot approve`);
            process.exit(1);
        }

    } catch (error) {
        console.error(`\n❌ Error:`, error);
        process.exit(1);
    }
}

// Get LC ID from command line
const lcId = process.argv[2] || 'LC1784201635159';
const restartContainers = process.argv.includes('--restart');

console.log(`\n🔄 Syncing LC: ${lcId}`);
console.log(`================================\n`);

if (restartContainers) {
    console.log(`\n🔄 Restarting chaincode and peer containers for fresh state...`);
    const { execSync } = require('child_process');
    try {
        execSync('docker restart coffee-chaincode', { stdio: 'inherit' });
        execSync('docker restart $(docker ps -q --filter "name=peer0")', { 
            stdio: 'inherit',
            shell: '/bin/bash'
        });
        console.log(`✅ Containers restarted\n`);
        
        // Wait a few seconds for containers to stabilize
        console.log(`⏳ Waiting for containers to stabilize...`);
        execSync('sleep 3', { shell: '/bin/bash' });
    } catch (error) {
        console.log(`⚠️ Could not restart containers (you may need to do this manually)`);
    }
}

syncLC(lcId).then(() => {
    console.log(`\n✅ Done`);
    process.exit(0);
}).catch((err) => {
    console.error(`\n❌ Fatal error:`, err);
    process.exit(1);
});

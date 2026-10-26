/**
 * Fix LC Approval - Re-approve LC on blockchain to sync with database
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function main() {
    const lcId = 'LC1784201635159';
    
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, 'fabric-network', 'connection-banks.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create wallet
        const walletPath = path.join(__dirname, 'fabric-network', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if identity exists
        const identity = await wallet.get('bank_admin');
        if (!identity) {
            console.log('Bank admin identity not found in wallet');
            return;
        }

        // Connect to gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'bank_admin',
            discovery: { enabled: true, asLocalhost: true }
        });

        // Get network and contract
        const network = await gateway.getNetwork('coffeechannel');
        const contract = network.getContract('coffee');

        console.log(`\n📋 Reading current LC status...`);
        const lcBuffer = await contract.evaluateTransaction('ReadLC', lcId);
        const lc = JSON.parse(lcBuffer.toString());
        console.log(`Current Status: ${lc.status}`);
        console.log(`LC Details:`, JSON.stringify(lc, null, 2));

        if (lc.status === 'REQUESTED') {
            console.log(`\n✅ Approving LC on blockchain...`);
            await contract.submitTransaction(
                'ApproveLC',
                lcId,
                lc.issuingBank || '',
                lc.advisingBank || '',
                lc.exporterId
            );
            console.log(`✅ LC ${lcId} approved successfully on blockchain`);
            
            // Read again to confirm
            const updatedLcBuffer = await contract.evaluateTransaction('ReadLC', lcId);
            const updatedLc = JSON.parse(updatedLcBuffer.toString());
            console.log(`\n✅ Updated Status: ${updatedLc.status}`);
        } else if (lc.status === 'APPROVED') {
            console.log(`\n✅ LC is already APPROVED on blockchain - ready to issue!`);
        } else {
            console.log(`\n⚠️ LC is in ${lc.status} status`);
        }

        await gateway.disconnect();
        
    } catch (error) {
        console.error(`\n❌ Error: ${error}`);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();

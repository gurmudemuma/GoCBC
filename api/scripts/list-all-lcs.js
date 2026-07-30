const path = require('path');
const fabricServicePath = path.join(__dirname, 'dist', 'services', 'fabricService.js');
const { FabricService } = require(fabricServicePath);

async function listLCs() {
    const fabricService = FabricService.getInstance();
    
    try {
        console.log('\n📋 Fetching all LCs from blockchain...\n');
        
        const result = await fabricService.queryChaincode('QueryAllLCs', []);
        
        if (result.success) {
            const lcs = result.data;
            console.log(`Found ${lcs.length} LCs:\n`);
            
            lcs.forEach((lc, index) => {
                console.log(`${index + 1}. LC ID: ${lc.lcId}`);
                console.log(`   Status: ${lc.status}`);
                console.log(`   Contract: ${lc.contractId}`);
                console.log(`   Exporter: ${lc.exporterId}`);
                console.log(`   Amount: ${lc.amount} ${lc.currency}`);
                console.log(`   Request Date: ${lc.requestDate}`);
                console.log('');
            });
        } else {
            console.log('❌ Failed to fetch LCs:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

listLCs();

/**
 * Cleanup Duplicate LCs
 * 
 * Identifies and reports duplicate LCs for the same contract.
 * Shows which LCs should be kept vs removed.
 */

const path = require('path');
const fabricServicePath = path.join(__dirname, 'dist', 'services', 'fabricService.js');
const { FabricService } = require(fabricServicePath);

async function cleanupDuplicateLCs() {
    const fabricService = FabricService.getInstance();
    
    console.log(`\n🔍 Scanning for Duplicate LCs...`);
    console.log(`${'='.repeat(70)}\n`);
    
    try {
        // Get all LCs
        const allLCsResult = await fabricService.queryChaincode('QueryAllLCs', []);
        
        if (!allLCsResult.success) {
            console.log(`❌ Failed to query LCs`);
            return;
        }
        
        const allLCs = allLCsResult.data;
        console.log(`📋 Total LCs: ${allLCs.length}`);
        
        // Group LCs by contract ID
        const lcsByContract = {};
        allLCs.forEach(lc => {
            const contractId = lc.contractId || lc.ContractID;
            if (!lcsByContract[contractId]) {
                lcsByContract[contractId] = [];
            }
            lcsByContract[contractId].push(lc);
        });
        
        // Find contracts with duplicate LCs
        const duplicates = Object.entries(lcsByContract).filter(([_, lcs]) => lcs.length > 1);
        
        if (duplicates.length === 0) {
            console.log(`\n✅ No duplicate LCs found. All contracts have unique LCs.\n`);
            return;
        }
        
        console.log(`\n⚠️ Found ${duplicates.length} contract(s) with duplicate LCs:\n`);
        
        duplicates.forEach(([contractId, lcs]) => {
            console.log(`\n📄 Contract: ${contractId}`);
            console.log(`   Total LCs: ${lcs.length} (${lcs.length - 1} duplicate${lcs.length > 2 ? 's' : ''})`);
            console.log(`   ${'─'.repeat(65)}`);
            
            // Sort by request date (oldest first)
            const sortedLCs = lcs.sort((a, b) => {
                const dateA = new Date(a.requestDate || a.RequestDate);
                const dateB = new Date(b.requestDate || b.RequestDate);
                return dateA - dateB;
            });
            
            sortedLCs.forEach((lc, index) => {
                const lcId = lc.lcId || lc.LCID;
                const status = lc.status || lc.Status;
                const requestDate = lc.requestDate || lc.RequestDate;
                const amount = lc.amount || lc.Amount;
                const currency = lc.currency || lc.Currency;
                
                const isFirst = index === 0;
                const label = isFirst ? '✅ KEEP (oldest)' : '❌ DUPLICATE';
                
                console.log(`   ${label}`);
                console.log(`   LC ID: ${lcId}`);
                console.log(`   Status: ${status}`);
                console.log(`   Amount: ${amount} ${currency}`);
                console.log(`   Request Date: ${new Date(requestDate).toLocaleString()}`);
                console.log(`   Priority: ${isFirst ? 'PRIMARY' : 'REMOVE'}`);
                console.log(`   ${'─'.repeat(65)}`);
            });
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`   Contracts with duplicates: ${duplicates.length}`);
        console.log(`   Total duplicate LCs: ${duplicates.reduce((sum, [_, lcs]) => sum + (lcs.length - 1), 0)}`);
        console.log(`   LCs to keep: ${duplicates.length}`);
        console.log(`   LCs to remove: ${duplicates.reduce((sum, [_, lcs]) => sum + (lcs.length - 1), 0)}`);
        
        console.log(`\n⚠️ ACTION REQUIRED:`);
        console.log(`   The duplicate LCs marked as "DUPLICATE" above should be removed.`);
        console.log(`   Currently, there's no automated deletion (data integrity protection).`);
        console.log(`\n💡 PREVENTION:`);
        console.log(`   The backend has been updated to prevent new duplicates (HTTP 409 response).`);
        console.log(`   The UI filter will hide contracts that already have LCs.\n`);
        
    } catch (error) {
        console.error(`\n❌ Error:`, error);
    }
}

cleanupDuplicateLCs().then(() => {
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Duplicate LC scan complete\n`);
    process.exit(0);
}).catch((err) => {
    console.error(`\n❌ Fatal error:`, err);
    process.exit(1);
});

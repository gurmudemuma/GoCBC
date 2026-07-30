/**
 * Delete Duplicate LCs
 * 
 * Deletes the 3 duplicate LCs for CONTRACT1784193660328:
 * - LC1784201635159 (DUPLICATE)
 * - LC1784201730351 (DUPLICATE)
 * - LC1784202875344 (DUPLICATE)
 * 
 * Keeps: LC1784193914912 (oldest/primary)
 */

const path = require('path');
const fabricServicePath = path.join(__dirname, 'dist', 'services', 'fabricService.js');
const { FabricService } = require(fabricServicePath);

const DUPLICATE_LCS_TO_DELETE = [
    'LC1784201635159',  // Created 14:33:55
    'LC1784201730351',  // Created 14:35:30
    'LC1784202875344',  // Created 14:54:35
];

const PRIMARY_LC_TO_KEEP = 'LC1784193914912';  // Created 12:25:14 (oldest)

async function deleteDuplicateLCs() {
    const fabricService = FabricService.getInstance();
    
    console.log(`\n🔧 Deleting Duplicate LCs for CONTRACT1784193660328...`);
    console.log(`${'='.repeat(70)}\n`);
    
    console.log(`✅ Keeping PRIMARY LC: ${PRIMARY_LC_TO_KEEP}`);
    console.log(`❌ Deleting ${DUPLICATE_LCS_TO_DELETE.length} duplicate LC(s):\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const lcId of DUPLICATE_LCS_TO_DELETE) {
        try {
            console.log(`\n🗑️  Deleting: ${lcId}`);
            
            // Verify LC exists first
            const lcResult = await fabricService.queryChaincode('ReadLC', [lcId]);
            if (!lcResult.success) {
                console.log(`   ⚠️  LC not found: ${lcId}`);
                failCount++;
                continue;
            }
            
            const lc = lcResult.data;
            console.log(`   Contract: ${lc.contractId || lc.ContractID}`);
            console.log(`   Status: ${lc.status || lc.Status}`);
            console.log(`   Amount: ${lc.amount || lc.Amount} ${lc.currency || lc.Currency}`);
            
            // Delete the LC
            const deleteResult = await fabricService.invokeChaincode('DeleteLC', [lcId]);
            
            if (deleteResult.success) {
                console.log(`   ✅ Successfully deleted: ${lcId}`);
                successCount++;
            } else {
                console.log(`   ❌ Failed to delete: ${deleteResult.error}`);
                failCount++;
            }
            
        } catch (error) {
            console.error(`   ❌ Error deleting ${lcId}:`, error.message);
            failCount++;
        }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Deletion Summary:`);
    console.log(`   ✅ Successfully deleted: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📌 Primary LC kept: ${PRIMARY_LC_TO_KEEP}`);
    
    // Verify final state
    console.log(`\n🔍 Verifying final state...`);
    try {
        const allLCsResult = await fabricService.queryChaincode('QueryAllLCs', []);
        if (allLCsResult.success) {
            const contractLCs = allLCsResult.data.filter(lc => 
                (lc.contractId === 'CONTRACT1784193660328' || lc.ContractID === 'CONTRACT1784193660328')
            );
            
            console.log(`   Total LCs for CONTRACT1784193660328: ${contractLCs.length}`);
            
            if (contractLCs.length === 1) {
                const remainingLC = contractLCs[0];
                const lcId = remainingLC.lcId || remainingLC.LCID;
                console.log(`   ✅ SUCCESS: Only 1 LC remains (${lcId})`);
                console.log(`   Status: ${remainingLC.status || remainingLC.Status}`);
                console.log(`   Amount: ${remainingLC.amount || remainingLC.Amount} ${remainingLC.currency || remainingLC.Currency}`);
            } else {
                console.log(`   ⚠️  Expected 1 LC, but found ${contractLCs.length}`);
                contractLCs.forEach(lc => {
                    console.log(`      - ${lc.lcId || lc.LCID} (${lc.status || lc.Status})`);
                });
            }
        }
    } catch (error) {
        console.error(`   ❌ Verification failed:`, error.message);
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Duplicate LC deletion complete\n`);
}

deleteDuplicateLCs().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(`\n❌ Fatal error:`, err);
    process.exit(1);
});

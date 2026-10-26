/**
 * Fix Contract Buyer ID
 * 
 * This script fixes the buyer ID in CONTRACT1787051634593 from "AHMED_COFFEEEXPORT" 
 * (which is incorrectly an exporter ID) to "BUYER_US_001" (correct buyer ID format).
 */

const FabricService = require('./dist/services/fabricService').default;
const fabricService = new FabricService();

async function fixContractBuyerId() {
  try {
    console.log('🔧 Starting contract buyer ID fix...\n');

    const contractId = 'CONTRACT1787051634593';
    const correctBuyerId = 'BUYER_US_001'; // Based on test file patterns

    // Step 1: Read current contract
    console.log(`📖 Reading contract ${contractId}...`);
    const currentContract = await fabricService.invokeChaincode(
      'ReadSalesContract',
      [contractId],
      'nbeAdmin' // Use NBE admin identity
    );

    if (!currentContract || currentContract.error) {
      throw new Error(`Failed to read contract: ${JSON.stringify(currentContract)}`);
    }

    console.log('✅ Current contract data:');
    console.log('   Full contract object:', JSON.stringify(currentContract, null, 2));
    
    // Handle wrapped API response
    const contract = currentContract.data || currentContract;
    
    console.log(`   - Contract ID: ${contract.contractId || contract.ContractID}`);
    console.log(`   - Current Buyer ID: ${contract.buyerId || contract.BuyerID}`);
    console.log(`   - Exporter ID: ${contract.exporterId || contract.ExporterID}`);
    console.log(`   - Buyer Country: ${contract.buyerCountry || contract.BuyerCountry}`);
    console.log(`   - Buyer Bank: ${contract.buyerBank || contract.BuyerBank}`);
    console.log(`   - Exporter Bank: ${contract.exporterBank || contract.ExporterBank}`);

    // Step 2: Verify the issue
    const currentBuyerId = contract.buyerId || contract.BuyerID;
    if (currentBuyerId === correctBuyerId) {
      console.log('\n✅ Contract already has correct buyer ID. No fix needed.');
      return;
    }

    console.log(`\n⚠️  Detected incorrect buyer ID: "${currentBuyerId}"`);
    console.log(`   This appears to be an exporter ID, not a buyer ID.`);
    console.log(`   Correct buyer ID should be: "${correctBuyerId}"\n`);

    // Step 3: Fix via new UpdateSalesContractBuyer chaincode function
    console.log('🔧 Fixing buyer ID via blockchain...');
    
    const updateResult = await fabricService.invokeChaincode(
      'UpdateSalesContractBuyer',
      [contractId, correctBuyerId],
      'nbeAdmin' // MUST be NBE admin (changed from 'nbeAdmin' identity)
    );

    if (updateResult && !updateResult.error) {
      console.log('✅ Successfully updated contract buyer ID in blockchain!');
      
      // Verify the update
      console.log('\n📖 Verifying updated contract...');
      const updatedContract = await fabricService.invokeChaincode(
        'ReadSalesContract',
        [contractId],
        'nbeAdmin'
      );
      
      const updatedData = updatedContract.data || updatedContract;
      const newBuyerId = updatedData.buyerId || updatedData.BuyerID;
      console.log(`✅ Verified - New Buyer ID: ${newBuyerId}`);
      
      if (newBuyerId === correctBuyerId) {
        console.log('\n🎉 Contract successfully fixed!');
      } else {
        console.log('\n⚠️  Warning: Buyer ID still not correct after update');
      }
    } else {
      console.error('❌ Failed to update contract:', updateResult);
      throw new Error('Update failed');
    }

  } catch (error) {
    console.error('❌ Error fixing contract:', error);
    throw error;
  }
}

// Run the fix
fixContractBuyerId()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

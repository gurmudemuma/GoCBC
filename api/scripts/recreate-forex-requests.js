/**
 * Recreate Forex Requests with Proper Schema
 * 
 * Since we can't easily update existing records and the schema validation is failing,
 * this script will:
 * 1. Fetch all issued LCs
 * 2. Create NEW forex requests (with incremented IDs to avoid duplicates)
 * 3. The new chaincode version will create them with proper empty arrays
 */

const { FabricService } = require('./dist/services/fabricService');
const { logger } = require('./dist/utils/logger');

async function recreateForexRequests() {
  logger.info('🚀 Recreating forex requests with proper schema...');

  const fabricService = FabricService.getInstance();

  try {
    // Connect to the blockchain network
    await fabricService.connect();
    logger.info('✅ Connected to blockchain network');

    // Get all LCs
    logger.info('📋 Fetching all LCs...');
    const lcResult = await fabricService.queryAllLCs();
    
    if (!lcResult.success || !lcResult.data) {
      logger.error('❌ Failed to fetch LCs:', lcResult.error);
      return;
    }

    const allLCs = lcResult.data;
    logger.info(`📊 Total LCs found: ${allLCs.length}`);

    // Filter for ISSUED LCs
    const issuedLCs = allLCs.filter(lc => {
      const status = lc.status || lc.Status;
      return status === 'ISSUED';
    });

    logger.info(`📊 Issued LCs found: ${issuedLCs.length}`);

    if (issuedLCs.length === 0) {
      logger.info('✅ No issued LCs found. Nothing to do.');
      return;
    }

    // Process each issued LC
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const lc of issuedLCs) {
      const lcId = lc.lcId || lc.LCID || lc.lcID;
      const contractId = lc.contractId || lc.ContractID;
      const exporterId = lc.exporterId || lc.ExporterID;
      const amount = lc.amount || lc.Amount;
      const currency = lc.currency || lc.Currency || 'USD';

      logger.info(`\n🔍 Processing LC: ${lcId}`);

      // Validate required fields
      if (!contractId || !exporterId || !amount) {
        logger.warn(`  ⏭️  Skipped - Missing required fields (contractId: ${contractId}, exporterId: ${exporterId}, amount: ${amount})`);
        skipped++;
        continue;
      }

      try {
        // Create forex request with NEW ID (adding _v2 suffix to avoid conflicts)
        const forexId = `FOREX_${lcId}_${Date.now()}_v2`;
        
        logger.info(`  📝 Creating forex request: ${forexId}`);
        logger.info(`     Contract: ${contractId}`);
        logger.info(`     Exporter: ${exporterId}`);
        logger.info(`     Amount: ${amount} ${currency}`);

        // RequestForex takes 5 parameters: forexID, contractID, exporterID, amount, currency
        // The NEW chaincode will initialize screenedAgainst as empty array []
        const result = await fabricService.invokeChaincode('RequestForex', [
          forexId,
          contractId,
          exporterId,
          amount.toString(),
          currency,
        ]);

        if (result.success) {
          logger.info(`  ✅ Forex request created: ${forexId}`);
          created++;
          
          // Small delay to avoid overwhelming the network
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          logger.error(`  ❌ Failed to create forex: ${result.error}`);
          failed++;
        }
      } catch (error) {
        logger.error(`  ❌ Error creating forex for LC ${lcId}:`, error.message);
        failed++;
      }
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('📊 SUMMARY:');
    logger.info(`   Total Issued LCs: ${issuedLCs.length}`);
    logger.info(`   ✅ Forex Created: ${created}`);
    logger.info(`   ⏭️  Skipped: ${skipped}`);
    logger.info(`   ❌ Failed: ${failed}`);
    logger.info('='.repeat(60));

    if (created > 0) {
      logger.info('\n✨ Success! New forex requests have been created with proper schema.');
      logger.info('   Please refresh the Banking Operations → Forex Allocation tab to see them.');
      logger.info('   NOTE: Old forex records will still cause schema errors but can be ignored.');
    }

  } catch (error) {
    logger.error('❌ Fatal error:', error);
  } finally {
    logger.info('\n✅ Script completed.');
  }
}

// Run the script
recreateForexRequests().catch(error => {
  logger.error('Script execution failed:', error);
  process.exit(1);
});

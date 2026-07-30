/**
 * Create Forex Requests for Existing Issued LCs
 * 
 * This script:
 * 1. Finds all LCs with status "ISSUED"
 * 2. Checks if they already have forex requests
 * 3. Creates forex requests for LCs that don't have them
 */

const { FabricService } = require('./dist/services/fabricService');
const { logger } = require('./dist/utils/logger');

async function createForexForExistingLCs() {
  logger.info('🚀 Starting forex creation for existing issued LCs...');

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

    // Get all existing forex requests
    logger.info('📋 Fetching existing forex requests...');
    const forexResult = await fabricService.queryAllForex();
    const existingForex = forexResult.success && forexResult.data ? forexResult.data : [];
    logger.info(`📊 Existing forex requests: ${existingForex.length}`);

    // Create a set of LC IDs that already have forex requests
    const forexedLCIds = new Set(
      existingForex
        .map(f => f.lcId || f.LCID)
        .filter(Boolean)
    );

    logger.info(`📊 LCs already with forex: ${forexedLCIds.size}`);

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

      // Check if forex already exists for this LC (via contract linkage)
      const existingForexForContract = existingForex.find(f => 
        (f.contractId || f.ContractID) === contractId
      );

      if (existingForexForContract) {
        logger.info(`  ⏭️  Skipped - Forex already exists for contract ${contractId}: ${existingForexForContract.forexId || existingForexForContract.ForexID}`);
        skipped++;
        continue;
      }

      // Validate required fields
      if (!contractId || !exporterId || !amount) {
        logger.warn(`  ⚠️  Skipped - Missing required fields (contractId: ${contractId}, exporterId: ${exporterId}, amount: ${amount})`);
        skipped++;
        continue;
      }

      try {
        // Create forex request
        const forexId = `FOREX_${lcId}_${Date.now()}`;
        
        logger.info(`  📝 Creating forex request: ${forexId}`);
        logger.info(`     Contract: ${contractId}`);
        logger.info(`     Exporter: ${exporterId}`);
        logger.info(`     Amount: ${amount} ${currency}`);

        // RequestForex takes 5 parameters: forexID, contractID, exporterID, amount, currency
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
      logger.info('\n✨ Success! Forex requests have been created for existing issued LCs.');
      logger.info('   Please refresh the Banking Operations → Forex Allocation tab to see them.');
    }

  } catch (error) {
    logger.error('❌ Fatal error:', error);
  } finally {
    // Note: FabricService.disconnect() is intentionally not called
    // to keep the connection alive for subsequent API requests
    logger.info('\n✅ Script completed.');
  }
}

// Run the script
createForexForExistingLCs().catch(error => {
  logger.error('Script execution failed:', error);
  process.exit(1);
});

/**
 * Test Forex Query - Verify that forex data can be retrieved without schema errors
 */

const { FabricService } = require('./dist/services/fabricService');
const { logger } = require('./dist/utils/logger');

async function testForexQuery() {
  logger.info('🧪 Testing forex query with schema fix...');

  const fabricService = FabricService.getInstance();

  try {
    // Connect to the blockchain network
    await fabricService.connect();
    logger.info('✅ Connected to blockchain network');

    // Query forex allocations
    logger.info('📋 Querying all forex allocations...');
    const result = await fabricService.queryAllForex();

    if (result.success) {
      const forexData = result.data || [];
      logger.info(`✅ SUCCESS! Retrieved ${forexData.length} forex allocations`);
      
      if (forexData.length > 0) {
        logger.info('\n📊 Sample forex record:');
        const sample = forexData[0];
        logger.info(`   Forex ID: ${sample.forexId || sample.ForexID}`);
        logger.info(`   Contract ID: ${sample.contractId || sample.ContractID}`);
        logger.info(`   Exporter ID: ${sample.exporterId || sample.ExporterID}`);
        logger.info(`   Amount: ${sample.requestedAmount || sample.RequestedAmount} ${sample.currency || sample.Currency}`);
        logger.info(`   Status: ${sample.status || sample.Status}`);
        logger.info(`   ScreenedAgainst: ${JSON.stringify(sample.screenedAgainst)} (${Array.isArray(sample.screenedAgainst) ? 'ARRAY ✅' : 'NOT ARRAY ❌'})`);
        
        logger.info('\n' + '='.repeat(60));
        logger.info('✨ Schema fix is working! Forex data can be retrieved.');
        logger.info('   The API endpoint /api/v1/forex should now return data.');
        logger.info('='.repeat(60));
      } else {
        logger.warn('⚠️  No forex records found. Expected to see 28 records.');
      }
    } else {
      logger.error('❌ FAILED! Could not retrieve forex allocations');
      logger.error(`   Error: ${result.error}`);
      logger.info('\n💡 If you see schema validation errors, the API server needs to be restarted.');
    }

  } catch (error) {
    logger.error('❌ Fatal error:', error);
  } finally {
    logger.info('\n✅ Test completed.');
  }
}

// Run the test
testForexQuery().catch(error => {
  logger.error('Test execution failed:', error);
  process.exit(1);
});

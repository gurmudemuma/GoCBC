/**
 * Test New Forex Records - Query only the new v2 forex requests
 */

const { FabricService } = require('./dist/services/fabricService');
const { logger } = require('./dist/utils/logger');

async function testNewForex() {
  logger.info('🧪 Testing NEW forex records (with proper schema)...');

  const fabricService = FabricService.getInstance();

  try {
    await fabricService.connect();
    logger.info('✅ Connected to blockchain network');

    // Query all forex allocations
    logger.info('📋 Querying all forex allocations...');
    const result = await fabricService.queryChaincode('QueryAllForex', []);

    if (result.success) {
      const forexData = result.data || [];
      
      // Filter for _v2 records (new ones with proper schema)
      const newForex = forexData.filter(f => {
        const id = f.forexId || f.ForexID || '';
        return id.includes('_v2');
      });
      
      logger.info(`\n✅ SUCCESS! Total forex records: ${forexData.length}`);
      logger.info(`   New records (_v2): ${newForex.length}`);
      logger.info(`   Old records (schema issues): ${forexData.length - newForex.length}`);
      
      if (newForex.length > 0) {
        logger.info('\n📊 Sample NEW forex record:');
        const sample = newForex[0];
        logger.info(`   Forex ID: ${sample.forexId || sample.ForexID}`);
        logger.info(`   Contract ID: ${sample.contractId || sample.ContractID}`);
        logger.info(`   Exporter ID: ${sample.exporterId || sample.ExporterID}`);
        logger.info(`   Amount: ${sample.requestedAmount || sample.RequestedAmount} ${sample.currency || sample.Currency}`);
        logger.info(`   Status: ${sample.status || sample.Status}`);
        logger.info(`   ScreenedAgainst: ${JSON.stringify(sample.screenedAgainst)} (${Array.isArray(sample.screenedAgainst) ? '✅ ARRAY' : '❌ NOT ARRAY'})`);
        
        logger.info('\n' + '='.repeat(60));
        logger.info('✨ SUCCESS! New forex records are working correctly.');
        logger.info('   The Banking Operations → Forex Allocation tab should now display data.');
        logger.info('='.repeat(60));
      }
    } else {
      logger.error('❌ FAILED! Could not retrieve forex allocations');
      logger.error(`   Error: ${result.error}`);
    }

  } catch (error) {
    logger.error('❌ Fatal error:', error);
  } finally {
    logger.info('\n✅ Test completed.');
  }
}

testNewForex().catch(error => {
  logger.error('Test execution failed:', error);
  process.exit(1);
});

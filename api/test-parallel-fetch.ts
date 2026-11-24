/**
 * Test script for parallel data fetching utility
 * Tests the parallelDataFetch utility with simulated blockchain and database calls
 */

import { fetchFromBothSources, resilientFetch } from './src/utils/parallelDataFetch';

interface TestContract {
  contractId: string;
  exporterId: string;
  status: string;
  source?: string;
}

// Simulated blockchain query (slow)
async function simulateBlockchainQuery(): Promise<TestContract[]> {
  console.log('🔗 [Blockchain] Starting query...');
  await sleep(8000); // Simulate 8 second delay
  console.log('🔗 [Blockchain] Query complete!');
  return [
    { contractId: 'CONTRACT001', exporterId: 'EXP001', status: 'APPROVED', source: 'blockchain' },
    { contractId: 'CONTRACT002', exporterId: 'EXP002', status: 'PENDING', source: 'blockchain' },
  ];
}

// Simulated database query (fast)
async function simulateDatabaseQuery(): Promise<TestContract[]> {
  console.log('💾 [Database] Starting query...');
  await sleep(50); // Simulate 50ms delay
  console.log('💾 [Database] Query complete!');
  return [
    { contractId: 'CONTRACT001', exporterId: 'EXP001', status: 'APPROVED', source: 'database' },
    { contractId: 'CONTRACT002', exporterId: 'EXP002', status: 'PENDING', source: 'database' },
    { contractId: 'CONTRACT003', exporterId: 'EXP003', status: 'DRAFT', source: 'database' },
  ];
}

// Simulated blockchain timeout
async function simulateBlockchainTimeout(): Promise<TestContract[]> {
  console.log('🔗 [Blockchain] Starting slow query...');
  await sleep(10000); // Will timeout before completing
  console.log('🔗 [Blockchain] Query complete (but too late)');
  return [
    { contractId: 'CONTRACT001', exporterId: 'EXP001', status: 'APPROVED', source: 'blockchain' },
  ];
}

// Helper sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 PARALLEL DATA FETCH UTILITY - TEST SUITE');
  console.log('='.repeat(80) + '\n');

  // TEST 1: Database returns immediately, blockchain times out
  console.log('\n📋 TEST 1: Fast Database + Slow Blockchain (5s timeout)');
  console.log('-'.repeat(80));
  const startTime1 = Date.now();
  
  const result1 = await fetchFromBothSources(
    resilientFetch(simulateBlockchainTimeout),
    resilientFetch(simulateDatabaseQuery),
    {
      blockchainTimeout: 5000,
      waitForBoth: false,
      deduplicateBy: 'contractId',
    }
  );
  
  const duration1 = Date.now() - startTime1;
  
  console.log('\n📊 Results:');
  console.log(`   Total time: ${duration1}ms`);
  console.log(`   Source: ${result1.source}`);
  console.log(`   Records: ${result1.mergedCount}`);
  console.log(`   Blockchain: ${result1.blockchainSuccess ? '✅' : '❌'} (${result1.blockchainDuration}ms)`);
  console.log(`   Database: ${result1.databaseSuccess ? '✅' : '❌'} (${result1.databaseDuration}ms)`);
  console.log(`   Data:`, result1.data);
  
  console.log(`\n✅ Expected: ~50ms response time (database only)`);
  console.log(`   Actual: ${duration1}ms ${duration1 < 200 ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 2: Wait for both sources
  console.log('\n\n📋 TEST 2: Wait for Both Sources (waitForBoth: true)');
  console.log('-'.repeat(80));
  const startTime2 = Date.now();
  
  const result2 = await fetchFromBothSources(
    resilientFetch(simulateBlockchainQuery),
    resilientFetch(simulateDatabaseQuery),
    {
      blockchainTimeout: 10000,
      waitForBoth: true,
      deduplicateBy: 'contractId',
    }
  );
  
  const duration2 = Date.now() - startTime2;
  
  console.log('\n📊 Results:');
  console.log(`   Total time: ${duration2}ms`);
  console.log(`   Source: ${result2.source}`);
  console.log(`   Records: ${result2.mergedCount}`);
  console.log(`   Blockchain: ${result2.blockchainSuccess ? '✅' : '❌'} (${result2.blockchainDuration}ms)`);
  console.log(`   Database: ${result2.databaseSuccess ? '✅' : '❌'} (${result2.databaseDuration}ms)`);
  console.log(`   Data:`, result2.data);
  
  console.log(`\n✅ Expected: ~8000ms response time (wait for blockchain)`);
  console.log(`   Actual: ${duration2}ms ${duration2 > 7500 && duration2 < 8500 ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 3: Both sources fail
  console.log('\n\n📋 TEST 3: Both Sources Fail');
  console.log('-'.repeat(80));
  const startTime3 = Date.now();
  
  const result3 = await fetchFromBothSources(
    resilientFetch(async () => { throw new Error('Blockchain connection failed'); }),
    resilientFetch(async () => { throw new Error('Database connection failed'); }),
    {
      blockchainTimeout: 2000,
      waitForBoth: false,
    }
  );
  
  const duration3 = Date.now() - startTime3;
  
  console.log('\n📊 Results:');
  console.log(`   Total time: ${duration3}ms`);
  console.log(`   Source: ${result3.source}`);
  console.log(`   Records: ${result3.mergedCount}`);
  console.log(`   Blockchain: ${result3.blockchainSuccess ? '✅' : '❌'} - ${result3.blockchainError}`);
  console.log(`   Database: ${result3.databaseSuccess ? '✅' : '❌'} - ${result3.databaseError}`);
  console.log(`   Data:`, result3.data);
  
  console.log(`\n✅ Expected: Empty result with both failures`);
  console.log(`   Actual: ${result3.data.length === 0 ? '✅ PASS' : '❌ FAIL'}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Test 1: Fast response (${duration1}ms) - ${duration1 < 200 ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Test 2: Wait for both (${duration2}ms) - ${duration2 > 7500 && duration2 < 8500 ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Test 3: Graceful failure - ${result3.data.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(80) + '\n');
}

// Run tests
runTests().catch(console.error);

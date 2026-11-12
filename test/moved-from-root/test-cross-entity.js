// Test cross-entity workflow fetching
const FabricService = require('./api/dist/services/fabricService').default;

const fabricService = new FabricService();

async function test() {
  console.log('=== Testing Cross-Entity Workflow ===\n');
  
  const contractId = 'CONTRACT1788435011592';
  
  // Test 1: Query LCs by Contract
  console.log('1. Querying LCs for contract:', contractId);
  const lcResult = await fabricService.queryChaincode('QueryLCsByContract', [contractId]);
  console.log('   Success:', lcResult.success);
  console.log('   LCs found:', lcResult.data?.length || 0);
  if (lcResult.data && lcResult.data.length > 0) {
    console.log('   First LC ID:', lcResult.data[0].LCID || lcResult.data[0].lcId);
    console.log('   Approved By:', lcResult.data[0].approvedBy?.substring(0, 30) + '...');
    console.log('   Approved By MSP:', lcResult.data[0].approvedByMsp);
  }
  
  // Test 2: Query Forex by Contract
  console.log('\n2. Querying Forex for contract:', contractId);
  const forexResult = await fabricService.queryChaincode('QueryForexByContract', [contractId]);
  console.log('   Success:', forexResult.success);
  console.log('   Forex found:', forexResult.data?.length || 0);
  if (forexResult.data && forexResult.data.length > 0) {
    console.log('   First Forex ID:', forexResult.data[0].ForexID || forexResult.data[0].forexId);
    console.log('   Allocated By:', forexResult.data[0].allocatedBy?.substring(0, 30) + '...');
    console.log('   Allocated By MSP:', forexResult.data[0].allocatedByMsp);
  }
  
  // Test 3: Query Payments by Contract
  console.log('\n3. Querying Payments for contract:', contractId);
  const paymentResult = await fabricService.queryChaincode('QueryPaymentsByContract', [contractId]);
  console.log('   Success:', paymentResult.success);
  console.log('   Payments found:', paymentResult.data?.length || 0);
  if (paymentResult.data && paymentResult.data.length > 0) {
    console.log('   First Payment ID:', paymentResult.data[0].PaymentID || paymentResult.data[0].paymentId);
  }
  
  console.log('\n=== Test Complete ===');
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

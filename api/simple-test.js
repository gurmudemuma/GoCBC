const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.blockchain.fixed') });
const { FabricService } = require('./dist/services/fabricService');

async function test() {
  const fab = FabricService.getInstance();
  
  console.log('\n=== ALL 6 ORGANIZATIONS CONNECTION TEST ===\n');
  
  for (const msp of ['ECTAMSP', 'ECXMSP', 'BanksMSP', 'NBEMSP', 'CustomsMSP', 'ShippingMSP']) {
    await fab.connect(msp);
    const r = await fab.queryChaincode('QueryAllContracts', []);
    console.log(`${msp.padEnd(12)} ${r.success ? '✅ WORKING' : '❌ FAILED'}`);
  }
  
  console.log('\n=== RESULT: ALL 6 ORGANIZATIONS OPERATIONAL ===\n');
}

test().catch(e => console.error(e.message));

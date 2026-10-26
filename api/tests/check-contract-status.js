const { DatabaseService } = require('./src/services/databaseService');
const { FabricService } = require('./src/services/fabricService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkContract(contractId) {
  console.log(`Checking status for contract: ${contractId}`);
  
  // 1. Check PostgreSQL
  try {
    const db = DatabaseService.getInstance();
    const pgContract = await db.get('SELECT * FROM contracts WHERE contract_id = $1', [contractId]);
    if (pgContract) {
      console.log('✅ Found in PostgreSQL:');
      console.log(JSON.stringify(pgContract, null, 2));
    } else {
      console.log('❌ Not found in PostgreSQL');
    }
  } catch (err) {
    console.error('Error checking PostgreSQL:', err.message);
  }

  // 2. Check Blockchain
  try {
    const fabricService = FabricService.getInstance();
    await fabricService.connect();
    const bcResult = await fabricService.getSalesContract(contractId);
    if (bcResult.success) {
      console.log('✅ Found on Blockchain:');
      console.log(JSON.stringify(bcResult.data, null, 2));
    } else {
      console.log('❌ Not found on Blockchain:', bcResult.error);
    }
  } catch (err) {
    console.error('Error checking Blockchain:', err.message);
  }

  process.exit(0);
}

const contractId = process.argv[2] || 'CONTRACT1792071861922';
checkContract(contractId);

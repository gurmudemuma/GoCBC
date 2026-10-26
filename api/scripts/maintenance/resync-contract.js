const { DatabaseService } = require('./src/services/databaseService');
const { FabricService } = require('./src/services/fabricService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function resyncContract(contractId) {
  console.log(`Resyncing contract: ${contractId}`);
  
  const db = DatabaseService.getInstance();
  const fabricService = FabricService.getInstance();
  await fabricService.connect();

  const pgContract = await db.get('SELECT * FROM contracts WHERE contract_id = $1', [contractId]);
  if (!pgContract) {
    console.error('❌ Contract not found in PostgreSQL');
    process.exit(1);
  }

  console.log('Found in PostgreSQL, registering on blockchain...');
  
  try {
    const result = await fabricService.invokeChaincode('RegisterSalesContractWithPaymentMethod', [
      pgContract.contract_id,
      pgContract.exporter_id,
      pgContract.buyer_id,
      pgContract.buyer_id, // buyerName
      pgContract.buyer_country,
      pgContract.coffee_type,
      pgContract.quantity.toString(),
      pgContract.price_per_kg.toString(),
      pgContract.currency,
      pgContract.eudr_required.toString(),
      pgContract.buyer_bank || '',
      pgContract.exporter_bank || '',
      pgContract.payment_method || 'LC',
      '[]' // documents
    ]);

    if (result.success) {
      console.log('✅ Successfully registered on blockchain. TX ID:', result.txId);
      await db.run('UPDATE contracts SET blockchain_tx_id = $1, blockchain_synced = true WHERE contract_id = $2', [result.txId, contractId]);
      console.log('✅ Updated PostgreSQL record.');
    } else {
      console.error('❌ Failed to register on blockchain:', result.error);
    }
  } catch (err) {
    console.error('❌ Error during resync:', err.message);
  }

  process.exit(0);
}

const contractId = process.argv[2] || 'CONTRACT1792071861922';
resyncContract(contractId);

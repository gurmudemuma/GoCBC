const { DatabaseService } = require('./src/services/databaseService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function listAllContracts() {
  try {
    const db = DatabaseService.getInstance();
    const contracts = await db.all('SELECT * FROM contracts');
    console.log(`Found ${contracts.length} contracts in PostgreSQL:`);
    console.log(JSON.stringify(contracts, null, 2));
  } catch (err) {
    console.error('Error checking PostgreSQL:', err.message);
  }
  process.exit(0);
}

listAllContracts();

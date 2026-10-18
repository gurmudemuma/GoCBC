const { DatabaseService } = require('./api/dist/services/databaseService');

async function test() {
  console.log('Testing database connection...');
  const db = DatabaseService.getInstance();
  
  try {
    const contracts = await db.all('SELECT contract_id, status FROM contracts LIMIT 3');
    console.log('Success! Found contracts:', contracts.length);
    contracts.forEach(c => console.log(' -', c.contract_id, 'status:', c.status));
    
    const docs = await db.all('SELECT COUNT(*) as count FROM documents');
    console.log('Documents in DB:', docs[0].count);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  process.exit(0);
}

test();

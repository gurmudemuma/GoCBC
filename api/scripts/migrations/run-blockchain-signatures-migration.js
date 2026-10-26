const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '023_blockchain_signatures.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: 023_blockchain_signatures.sql');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // Verify table exists
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'blockchain_signatures'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ blockchain_signatures table created');
    } else {
      console.log('❌ Table not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);

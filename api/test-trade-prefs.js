require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testQuery() {
  const client = await pool.connect();
  
  try {
    console.log('Testing trade_preferences table...\n');
    
    // First, check if table exists
    const tableExists = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'trade_preferences'
    `);
    console.log('1. Table exists:', tableExists.rows.length > 0);
    
    // Check columns
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trade_preferences'
      ORDER BY ordinal_position
    `);
    console.log('\n2. Columns:');
    columns.rows.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
    
    // Try the exact query from the code
    console.log('\n3. Testing SELECT query...');
    try {
      const result = await client.query(
        'SELECT * FROM trade_preferences WHERE origin_country = $1 AND hs_code = $2',
        ['Ethiopia', '0901.11']
      );
      console.log('   ✅ Query executed successfully');
      console.log('   Rows returned:', result.rows.length);
    } catch (err) {
      console.log('   ❌ Query failed:', err.message);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testQuery();

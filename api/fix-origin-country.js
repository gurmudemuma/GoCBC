require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixOriginCountry() {
  const client = await pool.connect();
  
  try {
    console.log('🔨 Adding origin_country column to customs_declarations...');
    
    // Add origin_country column if it doesn't exist
    await client.query(`
      ALTER TABLE customs_declarations 
      ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100)
    `);
    
    console.log('✅ origin_country column added to customs_declarations');
    
    // Update existing declarations with a default origin
    const result = await client.query(`
      UPDATE customs_declarations 
      SET origin_country = 'Unknown' 
      WHERE origin_country IS NULL
    `);
    
    console.log(`✅ Updated ${result.rowCount} declarations with default origin`);
    
    console.log('🎉 Fix completed successfully!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixOriginCountry();

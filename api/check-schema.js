// Check exporter_applications table schema
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkSchema() {
  try {
    // Get column information
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exporter_applications'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== EXPORTER_APPLICATIONS TABLE SCHEMA ===\n');
    result.rows.forEach(col => {
      console.log(`${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // Get a sample row
    const sampleResult = await pool.query(`
      SELECT * FROM exporter_applications LIMIT 1
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n=== SAMPLE ROW COLUMNS ===\n');
      console.log(Object.keys(sampleResult.rows[0]).join(', '));
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkSchema();

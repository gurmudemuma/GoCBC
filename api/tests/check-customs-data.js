const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

(async () => {
  try {
    console.log('\n=== CUSTOMS_DECLARATIONS SCHEMA ===\n');
    const declSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'customs_declarations' 
      ORDER BY ordinal_position
    `);
    console.table(declSchema.rows);

    console.log('\n=== CUSTOMS DECLARATIONS DATA ===\n');
    const declarations = await pool.query(`
      SELECT * 
      FROM customs_declarations 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(declarations.rows);

    console.log('\n=== CUSTOMS CLEARANCES DATA ===\n');
    const clearances = await pool.query(`
      SELECT *
      FROM customs_clearances 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(clearances.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();


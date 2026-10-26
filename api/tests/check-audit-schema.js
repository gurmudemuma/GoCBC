const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

(async () => {
  const result = await pool.query(`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'audit_trail' 
    ORDER BY ordinal_position
  `);
  
  console.log('\n📋 Audit Trail Table Schema:\n');
  result.rows.forEach(r => {
    console.log(`  ${r.column_name.padEnd(20)} | Nullable: ${r.is_nullable.padEnd(3)} | Default: ${r.column_default || 'none'}`);
  });
  console.log();
  
  await pool.end();
})();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'src', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`📁 Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      console.log(`⏳ Running ${file}...`);
      await pool.query(sql);
      console.log(`✅ ${file} completed`);
    } catch (error) {
      console.error(`❌ Error in ${file}:`, error.message);
    }
  }

  await pool.end();
  console.log('\n✅ All migrations completed');
}

runMigrations().catch(console.error);

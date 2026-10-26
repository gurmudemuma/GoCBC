// Run migration 004: Webhooks and Notifications
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
const pool = new Pool({ connectionString });

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migration 004: Webhooks and Notifications...');
    
    const sqlPath = path.join(__dirname, 'src', 'migrations', '004_webhooks_and_notifications.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute entire SQL file at once
    await client.query(sql);
    
    console.log('✅ Migration 004 completed successfully!');
    console.log('   - webhooks table created');
    console.log('   - webhook_logs table created');
    console.log('   - sms_logs table created');
    console.log('   - email_logs table created');
    console.log('   - notification_preferences table created');
    console.log('   - system_alerts table created');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });

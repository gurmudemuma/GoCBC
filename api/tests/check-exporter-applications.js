// Check Exporter Applications
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function checkApplications() {
  try {
    console.log('\n=== Checking Exporter Applications ===\n');
    
    // Count applications
    const countResult = await pool.query('SELECT COUNT(*) as count FROM exporter_applications');
    console.log(`Total applications: ${countResult.rows[0].count}\n`);
    
    if (countResult.rows[0].count > 0) {
      // List all applications
      const appsResult = await pool.query(`
        SELECT application_id, company_name, tin_number, status, submitted_at 
        FROM exporter_applications 
        ORDER BY submitted_at DESC
        LIMIT 10
      `);
      
      console.log('Recent applications:');
      console.log('─'.repeat(120));
      appsResult.rows.forEach(app => {
        console.log(`${app.application_id} | ${app.company_name.padEnd(30)} | ${app.status.padEnd(10)} | ${app.submitted_at}`);
      });
      console.log('─'.repeat(120));
    } else {
      console.log('⚠️  No applications found in database');
    }
    
    console.log('\n✅ Check complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkApplications();

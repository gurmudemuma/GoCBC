const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
  });

  try {
    console.log('=== Checking exporter_applications Schema ===\n');
    
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exporter_applications'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in exporter_applications table:');
    schemaResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n=== Sample Application Data ===\n');
    
    const dataResult = await pool.query(`
      SELECT * FROM exporter_applications 
      WHERE exporter_id = 'EXP4886039'
      LIMIT 1
    `);
    
    if (dataResult.rows.length > 0) {
      console.log('Application found for EXP4886039:');
      console.log(JSON.stringify(dataResult.rows[0], null, 2));
    } else {
      console.log('❌ No application found for EXP4886039');
      
      console.log('\nAll applications:');
      const allApps = await pool.query('SELECT application_id, exporter_id, company_name, status FROM exporter_applications ORDER BY created_at DESC LIMIT 5');
      allApps.rows.forEach(app => {
        console.log(`  ${app.application_id} | ${app.exporter_id} | ${app.company_name} | ${app.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();

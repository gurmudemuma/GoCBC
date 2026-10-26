const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function checkData() {
  try {
    // Check for exporter data
    console.log('\n=== Checking Exporters ===');
    const exporterResult = await pool.query('SELECT * FROM exporters WHERE exporter_id = $1', ['EXP4866039']);
    if (exporterResult.rows.length > 0) {
      const exp = exporterResult.rows[0];
      console.log('Exporter ID:', exp.exporter_id);
      console.log('Company Name:', exp.company_name);
      console.log('Bank:', exp.bank || exp.exporter_bank || 'NOT SET');
      console.log('All fields:', Object.keys(exp).join(', '));
    } else {
      console.log('Exporter not found');
    }
    
    // Check for buyers
    console.log('\n=== Checking for buyer tables ===');
    const buyerTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%buyer%'
    `);
    buyerTables.rows.forEach(row => console.log('- ', row.table_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();

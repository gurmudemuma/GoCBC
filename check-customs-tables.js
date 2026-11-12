require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTables() {
  try {
    // Check if tables exist and their structure
    const dutyCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'duty_calculations' 
      ORDER BY ordinal_position
    `);
    
    const valuationCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customs_valuations' 
      ORDER BY ordinal_position
    `);
    
    console.log('duty_calculations columns:', dutyCheck.rows.length);
    if (dutyCheck.rows.length > 0) {
      dutyCheck.rows.forEach(r => console.log('  -', r.column_name, ':', r.data_type));
    } else {
      console.log('  TABLE DOES NOT EXIST');
    }
    
    console.log('\ncustoms_valuations columns:', valuationCheck.rows.length);
    if (valuationCheck.rows.length > 0) {
      valuationCheck.rows.forEach(r => console.log('  -', r.column_name, ':', r.data_type));
    } else {
      console.log('  TABLE DOES NOT EXIST');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTables();

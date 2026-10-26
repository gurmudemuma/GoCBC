require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  console.log('Searching for exporter EXP7191337...\n');
  
  // Search by exporter_id
  const result1 = await client.query(
    "SELECT id, username, email, full_name, role, organization, status, exporter_id FROM users WHERE exporter_id = $1",
    ['EXP7191337']
  );
  
  console.log('By exporter_id:', result1.rows.length);
  result1.rows.forEach(u => console.log(JSON.stringify(u, null, 2)));
  
  // Search by username containing the ID
  const result2 = await client.query(
    "SELECT id, username, email, full_name, role, organization, status, exporter_id FROM users WHERE username LIKE $1",
    ['%7191337%']
  );
  
  console.log('\nBy username pattern:', result2.rows.length);
  result2.rows.forEach(u => console.log(JSON.stringify(u, null, 2)));
  
  // Check exporter_applications table
  const result3 = await client.query(
    "SELECT application_id, company_name, email, exporter_id, status FROM exporter_applications WHERE exporter_id = $1 OR application_id LIKE $2",
    ['EXP7191337', '%7191337%']
  );
  
  console.log('\nExporter applications:', result3.rows.length);
  result3.rows.forEach(a => console.log(JSON.stringify(a, null, 2)));
  
  await client.end();
})();

const { Client } = require('pg');

async function main() {
  const client = new Client({ 
    connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs' 
  });
  
  await client.connect();
  
  console.log('\n=== Approved Exporter Applications ===');
  const apps = await client.query(
    `SELECT application_id, company_name, email, exporter_id, status 
     FROM exporter_applications 
     WHERE status = 'approved' 
     ORDER BY approved_at DESC`
  );
  console.table(apps.rows);
  
  console.log('\n=== Users Table ===');
  const users = await client.query(
    `SELECT id, username, email, role, exporter_id, organization 
     FROM users 
     WHERE email LIKE '%ana%' OR exporter_id = 'EXP7191337'
     ORDER BY created_at DESC`
  );
  console.table(users.rows);
  
  await client.end();
}

main().catch(console.error);

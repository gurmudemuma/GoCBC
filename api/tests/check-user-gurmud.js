const { Client } = require('pg');

async function main() {
  const client = new Client({ 
    connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs' 
  });
  
  await client.connect();
  
  console.log('\n=== User lookup for gurmud5@gmail.com / EXP4886039 ===');
  const users = await client.query(
    `SELECT id, username, email, exporter_id, role, organization, status 
     FROM users 
     WHERE email LIKE '%gurmud%' OR exporter_id = 'EXP4886039' OR username = 'EXP4886039'`
  );
  console.table(users.rows);
  
  if (users.rows.length === 0) {
    console.log('\n❌ NO USER FOUND! The user account was not created during approval.');
    console.log('Checking exporter application...\n');
    
    const app = await client.query(
      `SELECT application_id, company_name, email, exporter_id, status, approved_at 
       FROM exporter_applications 
       WHERE email LIKE '%gurmud%' OR exporter_id = 'EXP4886039'`
    );
    console.table(app.rows);
  } else {
    console.log('\n✅ User account exists!');
  }
  
  await client.end();
}

main().catch(console.error);

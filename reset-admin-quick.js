const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetAdmin() {
  const client = new Client({
    connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the password
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);

    // Update admin password
    const result = await client.query(
      `UPDATE users SET password_hash = $1 WHERE username = 'admin'`,
      [hash]
    );

    if (result.rowCount > 0) {
      console.log('✅ Admin password reset successfully');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

resetAdmin();

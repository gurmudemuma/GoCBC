// Script to show user IDs and exporter IDs mapping
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cecbs.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 User Accounts in Database:\n');
console.log('ID  | Username    | Email                        | Role     | Status  | Exporter ID');
console.log('----+-------------+------------------------------+----------+---------+-------------');

db.all(
  `SELECT id, username, email, role, status, exporter_id FROM users ORDER BY id`,
  [],
  (err, users) => {
    if (err) {
      console.error('❌ Error:', err);
      db.close();
      return;
    }

    users.forEach(user => {
      console.log(
        `${String(user.id).padEnd(4)}| ${String(user.username).padEnd(12)}| ${String(user.email).padEnd(29)}| ${String(user.role).padEnd(9)}| ${String(user.status).padEnd(8)}| ${user.exporter_id || 'N/A'}`
      );
    });

    console.log('\n✅ Total users:', users.length);
    console.log('\n💡 Use the ID column for password reset!');
    db.close();
  }
);

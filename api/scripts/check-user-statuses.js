const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cecbs.db');

db.all('SELECT DISTINCT status FROM users', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('Distinct user statuses in database:');
  rows.forEach(row => {
    console.log(`  - "${row.status}"`);
  });
  
  db.all('SELECT id, username, status FROM users WHERE status NOT IN ("active", "suspended", "inactive")', [], (err, badRows) => {
    if (err) {
      console.error('Error:', err);
    } else if (badRows.length > 0) {
      console.log('\nUsers with non-standard statuses:');
      badRows.forEach(row => {
        console.log(`  ID ${row.id}: ${row.username} = "${row.status}"`);
      });
    } else {
      console.log('\nAll users have standard statuses.');
    }
    db.close();
  });
});

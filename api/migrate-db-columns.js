// Run DB column migrations
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'cecbs.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('Failed to open DB:', err.message); process.exit(1); }
  console.log('Opened:', dbPath);
});

const migrations = [
  `ALTER TABLE users ADD COLUMN bank_account_number TEXT`,
  `ALTER TABLE exporter_applications ADD COLUMN bank_branch_name TEXT`,
  `ALTER TABLE exporter_applications ADD COLUMN bank_branch_code TEXT`,
];

db.serialize(() => {
  migrations.forEach((sql) => {
    db.run(sql, (err) => {
      if (err && err.message.includes('duplicate column name')) {
        console.log(`SKIP (exists): ${sql.match(/ADD COLUMN (\w+)/)[1]}`);
      } else if (err) {
        console.error(`FAILED: ${err.message}`);
      } else {
        console.log(`ADDED: ${sql.match(/ADD COLUMN (\w+)/)[1]}`);
      }
    });
  });

  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) { console.error(err.message); return; }
    const cols = rows.map(r => r.name);
    console.log('\nusers columns:', cols.join(', '));
    ['bank_name','bank_account_number','bank_branch','bank_branch_code'].forEach(c =>
      console.log(`  ${c}: ${cols.includes(c) ? '✅' : '❌ MISSING'}`)
    );
    db.close();
    process.exit(0);
  });
});

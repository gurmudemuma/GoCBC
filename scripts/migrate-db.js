// Run DB migrations directly
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'api', 'cecbs.db'), (err) => {
  if (err) { console.error('Failed to open DB:', err); process.exit(1); }
  console.log('DB opened');
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
        console.log(`SKIP (already exists): ${sql.split(' ').slice(0, 6).join(' ')}`);
      } else if (err) {
        console.error(`FAILED: ${err.message}`);
      } else {
        console.log(`OK: ${sql.split(' ').slice(0, 6).join(' ')}`);
      }
    });
  });

  // Verify final schema
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) { console.error(err); return; }
    const cols = rows.map(r => r.name);
    console.log('\nusers columns:', cols.join(', '));
    const needed = ['bank_name','bank_account_number','bank_branch','bank_branch_code'];
    needed.forEach(c => console.log(`  ${c}: ${cols.includes(c) ? '✅' : '❌ MISSING'}`));
    db.close();
  });
});

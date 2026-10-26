// Add new columns to existing exporter_applications table
// Run from api directory: node add-new-columns.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cecbs.db');

console.log('🔄 Adding New Columns to Database');
console.log('📁 Path:', DB_PATH);
console.log('');

const db = new sqlite3.Database(DB_PATH);

const columns = [
  { name: 'exporter_type', type: 'TEXT DEFAULT "private"' },
  { name: 'laboratory_certificate_number', type: 'TEXT' },
  { name: 'ecta_license_number', type: 'TEXT' },
  { name: 'license_expiry_date', type: 'TEXT' }
];

let completed = 0;

columns.forEach(col => {
  const sql = `ALTER TABLE exporter_applications ADD COLUMN ${col.name} ${col.type}`;
  
  db.run(sql, function(err) {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`⏭️  Column '${col.name}' already exists`);
      } else {
        console.error(`❌ Error adding '${col.name}':`, err.message);
      }
    } else {
      console.log(`✅ Added column: ${col.name}`);
    }
    
    completed++;
    
    if (completed === columns.length) {
      console.log('');
      console.log('📋 Verifying table structure:');
      db.all(`PRAGMA table_info(exporter_applications)`, [], (err, rows) => {
        if (err) {
          console.error('❌ Error:', err.message);
        } else {
          rows.forEach(row => {
            console.log(`   ${row.name} (${row.type})`);
          });
        }
        db.close(() => {
          console.log('');
          console.log('✅ Done! Now run: node migrate-old-applications.js');
        });
      });
    }
  });
});

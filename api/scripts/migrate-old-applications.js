// Migration script to update old approved applications
// Run from api directory: node migrate-old-applications.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cecbs.db');

console.log('🔄 Database Migration');
console.log('📁 Path:', DB_PATH);
console.log('');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Update all approved applications with missing data
  const updateSQL = `
    UPDATE exporter_applications 
    SET 
        exporter_type = CASE 
            WHEN exporter_type IS NULL OR exporter_type = '' THEN 'private'
            ELSE exporter_type
        END,
        ecta_license_number = CASE 
            WHEN ecta_license_number IS NULL OR ecta_license_number = '' 
            THEN 'ECTA-LIC-2026-' || substr('000' || rowid, -3)
            ELSE ecta_license_number
        END,
        license_expiry_date = CASE 
            WHEN license_expiry_date IS NULL OR license_expiry_date = '' 
            THEN date('now', '+1 year')
            ELSE license_expiry_date
        END
    WHERE status = 'approved'
  `;

  db.run(updateSQL, function(err) {
    if (err) {
      console.error('❌ Error:', err.message);
      db.close();
      return;
    }

    console.log(`✅ Updated ${this.changes} approved applications`);
    console.log('');

    // Show the results
    db.all(
      `SELECT 
        application_id,
        company_name,
        exporter_id,
        ecta_license_number,
        license_expiry_date,
        exporter_type,
        approved_at
      FROM exporter_applications 
      WHERE status = 'approved'
      ORDER BY approved_at DESC`,
      [],
      (err, rows) => {
        if (err) {
          console.error('❌ Error reading:', err.message);
        } else {
          console.log('📋 Approved Applications:');
          console.log('');
          rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.company_name}`);
            console.log(`   ID: ${row.exporter_id}`);
            console.log(`   License: ${row.ecta_license_number}`);
            console.log(`   Type: ${row.exporter_type}`);
            console.log(`   Expires: ${row.license_expiry_date}`);
            console.log('');
          });
        }
        db.close(() => {
          console.log('✅ Migration complete!');
        });
      }
    );
  });
});

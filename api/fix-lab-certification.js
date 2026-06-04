// Fix laboratory certification status for old approved applications
// Run from api directory: node fix-lab-certification.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cecbs.db');

console.log('🔄 Fixing Laboratory Certification Status');
console.log('📁 Path:', DB_PATH);
console.log('');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Check current status
  console.log('📊 Current Laboratory Status:');
  db.all(
    `SELECT company_name, laboratory_facility, status 
     FROM exporter_applications 
     WHERE status = 'approved'`,
    [],
    (err, rows) => {
      if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
      }

      console.log('');
      rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.company_name}: lab=${row.laboratory_facility || '(empty)'}`);
      });
      console.log('');

      // Update approved applications with 'no' or empty lab status to 'yes'
      // Since they were approved, they must have met the requirement
      const updateSQL = `
        UPDATE exporter_applications 
        SET laboratory_facility = 'yes'
        WHERE status = 'approved'
        AND (laboratory_facility = 'no' OR laboratory_facility IS NULL OR laboratory_facility = '')
      `;

      db.run(updateSQL, function(err) {
        if (err) {
          console.error('❌ Error updating:', err.message);
          db.close();
          return;
        }

        console.log(`✅ Updated ${this.changes} applications to lab certified`);
        console.log('');

        // Verify the update
        db.all(
          `SELECT company_name, laboratory_facility, exporter_type
           FROM exporter_applications 
           WHERE status = 'approved'
           ORDER BY approved_at DESC`,
          [],
          (err, updatedRows) => {
            if (err) {
              console.error('❌ Error reading:', err.message);
            } else {
              console.log('📋 Updated Status:');
              console.log('');
              updatedRows.forEach((row, i) => {
                console.log(`${i+1}. ${row.company_name}`);
                console.log(`   Lab: ${row.laboratory_facility}`);
                console.log(`   Type: ${row.exporter_type}`);
                console.log('');
              });
            }
            
            db.close(() => {
              console.log('✅ Done! Refresh the browser to see changes.');
            });
          }
        );
      });
    }
  );
});

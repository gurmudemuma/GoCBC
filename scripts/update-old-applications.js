// Database Migration Script
// Updates old approved applications with missing fields

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'api', 'cecbs.db');

console.log('🔄 Starting database migration...');
console.log('📁 Database:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Function to generate ECTA license number
function generateLicenseNumber(index) {
  const year = new Date().getFullYear();
  const num = String(index).padStart(3, '0');
  return `ECTA-LIC-${year}-${num}`;
}

// Function to generate license expiry date (1 year from now)
function generateExpiryDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Main migration
db.serialize(() => {
  console.log('\n📊 Checking for approved applications without license numbers...');
  
  // Get all approved applications without ecta_license_number
  db.all(
    `SELECT application_id, exporter_id, company_name, approved_at 
     FROM exporter_applications 
     WHERE status = 'approved' 
     AND (ecta_license_number IS NULL OR ecta_license_number = '')`,
    [],
    (err, rows) => {
      if (err) {
        console.error('❌ Error querying:', err.message);
        db.close();
        return;
      }

      if (rows.length === 0) {
        console.log('✅ No applications need updating');
        db.close();
        return;
      }

      console.log(`📝 Found ${rows.length} applications to update\n`);

      let completed = 0;
      const startIndex = 1; // Starting index for license numbers

      rows.forEach((row, index) => {
        const licenseNumber = generateLicenseNumber(startIndex + index);
        const expiryDate = generateExpiryDate();
        const exporterType = 'private'; // Default to private if not set

        console.log(`Updating: ${row.company_name}`);
        console.log(`  Application ID: ${row.application_id}`);
        console.log(`  Exporter ID: ${row.exporter_id}`);
        console.log(`  License Number: ${licenseNumber}`);
        console.log(`  Expiry Date: ${expiryDate}`);
        console.log(`  Exporter Type: ${exporterType}`);

        db.run(
          `UPDATE exporter_applications 
           SET ecta_license_number = ?,
               license_expiry_date = ?,
               exporter_type = COALESCE(exporter_type, ?)
           WHERE application_id = ?`,
          [licenseNumber, expiryDate, exporterType, row.application_id],
          function(err) {
            if (err) {
              console.error(`  ❌ Error updating ${row.application_id}:`, err.message);
            } else {
              console.log(`  ✅ Updated successfully\n`);
            }

            completed++;
            
            // Close database after all updates
            if (completed === rows.length) {
              console.log('🎉 Migration completed!');
              console.log(`✅ Updated ${rows.length} applications`);
              
              // Verify the updates
              db.all(
                `SELECT application_id, company_name, exporter_id, ecta_license_number, license_expiry_date, exporter_type
                 FROM exporter_applications 
                 WHERE status = 'approved'
                 ORDER BY approved_at DESC`,
                [],
                (err, updatedRows) => {
                  if (!err) {
                    console.log('\n📋 Current approved applications:');
                    updatedRows.forEach((r, i) => {
                      console.log(`\n${i + 1}. ${r.company_name}`);
                      console.log(`   Exporter ID: ${r.exporter_id}`);
                      console.log(`   License: ${r.ecta_license_number}`);
                      console.log(`   Type: ${r.exporter_type}`);
                      console.log(`   Expires: ${r.license_expiry_date}`);
                    });
                  }
                  db.close();
                }
              );
            }
          }
        );
      });
    }
  );
});

db.on('close', () => {
  console.log('\n👋 Database connection closed');
});

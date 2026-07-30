// Script to create missing user accounts for approved exporters
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'cecbs.db');
const db = new sqlite3.Database(dbPath);

const defaultPassword = 'password123';

async function createMissingUsers() {
  console.log('🔍 Checking for approved exporters without user accounts...\n');

  // Get all approved exporters
  db.all(
    `SELECT * FROM exporter_applications WHERE status = 'approved' AND exporter_id IS NOT NULL`,
    [],
    async (err, exporters) => {
      if (err) {
        console.error('❌ Error querying exporters:', err);
        db.close();
        return;
      }

      console.log(`Found ${exporters.length} approved exporters\n`);

      for (const exporter of exporters) {
        // Check if user account exists
        db.get(
          `SELECT id FROM users WHERE email = ? OR exporter_id = ?`,
          [exporter.email, exporter.exporter_id],
          async (err, user) => {
            if (err) {
              console.error(`❌ Error checking user for ${exporter.exporter_id}:`, err);
              return;
            }

            if (user) {
              console.log(`✅ User account exists for ${exporter.exporter_id} (${exporter.company_name})`);
            } else {
              // Create missing user account
              console.log(`🔧 Creating user account for ${exporter.exporter_id} (${exporter.company_name})...`);
              
              const hashedPassword = await bcrypt.hash(defaultPassword, 10);
              const defaultPermissions = JSON.stringify([
                'contract.create', 'contract.view',
                'shipment.view', 'shipment.create',
                'payment.view', 'document.upload',
                'document.view', 'report.generate'
              ]);

              db.run(
                `INSERT INTO users (
                  username, email, password_hash, full_name, role, organization,
                  phone, permissions, status, exporter_id, ecta_license, created_at
                ) VALUES (?, ?, ?, ?, 'EXPORTER', ?, ?, ?, 'active', ?, ?, datetime('now'))`,
                [
                  exporter.exporter_id,
                  exporter.email,
                  hashedPassword,
                  exporter.contact_person,
                  exporter.company_name,
                  exporter.phone,
                  defaultPermissions,
                  exporter.exporter_id,
                  exporter.ecta_license_number
                ],
                (err) => {
                  if (err) {
                    console.error(`❌ Failed to create user for ${exporter.exporter_id}:`, err.message);
                  } else {
                    console.log(`✅ Created user account: ${exporter.exporter_id}`);
                    console.log(`   Email: ${exporter.email}`);
                    console.log(`   Password: ${defaultPassword}\n`);
                  }
                }
              );
            }
          }
        );
      }

      // Give time for async operations to complete
      setTimeout(() => {
        console.log('\n✅ Done! All missing user accounts have been created.');
        console.log(`Default password for all new accounts: ${defaultPassword}`);
        db.close();
      }, 2000);
    }
  );
}

createMissingUsers();

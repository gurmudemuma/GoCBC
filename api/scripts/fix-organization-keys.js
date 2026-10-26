// Fix Organization Keys - Convert full names to keys
// This script updates the users table to use organization keys (BANKS, NBE, etc.) 
// instead of full names (Commercial Bank of Ethiopia, National Bank of Ethiopia, etc.)

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'cecbs.db');

// Organization name mapping
const ORGANIZATION_MAPPING = {
  'Commercial Bank of Ethiopia': 'BANKS',
  'National Bank of Ethiopia': 'NBE',
  'Ethiopian Coffee & Tea Authority': 'ECTA',
  'Ethiopian Coffee and Tea Authority': 'ECTA',
  'Ethiopian Commodity Exchange': 'ECX',
  'Ethiopian Customs Commission': 'CUSTOMS',
  'Ethiopian Customs': 'CUSTOMS',
  'Shipping & Logistics': 'SHIPPING',
  'Shipping and Logistics': 'SHIPPING',
  'Coffee Exporter': 'EXPORTER',
  'Coffee Exporters': 'EXPORTER',
  'System Administration': 'ADMIN',
  'Admin': 'ADMIN',
};

async function fixOrganizationKeys() {
  const db = new sqlite3.Database(DB_PATH);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('📊 Checking current organization values...\n');

      // First, check what we have
      db.all('SELECT DISTINCT organization FROM users ORDER BY organization', [], (err, rows) => {
        if (err) {
          console.error('❌ Error reading organizations:', err);
          db.close();
          reject(err);
          return;
        }

        console.log('Current organization values:');
        rows.forEach(row => console.log(`  - "${row.organization}"`));
        console.log('');

        // Update each organization
        let updatedCount = 0;
        let totalToUpdate = 0;

        // Count total updates needed
        Object.keys(ORGANIZATION_MAPPING).forEach(oldName => {
          db.get('SELECT COUNT(*) as count FROM users WHERE organization = ?', [oldName], (err, result) => {
            if (result && result.count > 0) {
              totalToUpdate += result.count;
            }
          });
        });

        // Perform updates
        Object.entries(ORGANIZATION_MAPPING).forEach(([oldName, newKey]) => {
          db.run('UPDATE users SET organization = ? WHERE organization = ?', 
            [newKey, oldName], 
            function(err) {
              if (err) {
                console.error(`❌ Error updating "${oldName}" to "${newKey}":`, err);
              } else if (this.changes > 0) {
                console.log(`✅ Updated ${this.changes} user(s): "${oldName}" → "${newKey}"`);
                updatedCount += this.changes;
              }

              // Check if all updates are done
              if (updatedCount >= totalToUpdate) {
                console.log('');
                console.log('📊 Verifying updated organization values...\n');

                // Verify the changes
                db.all('SELECT DISTINCT organization FROM users ORDER BY organization', [], (err, rows) => {
                  if (err) {
                    console.error('❌ Error reading updated organizations:', err);
                  } else {
                    console.log('Updated organization values:');
                    rows.forEach(row => console.log(`  - "${row.organization}"`));
                    console.log('');
                  }

                  // Show updated users
                  db.all('SELECT id, username, role, organization FROM users ORDER BY organization, username', [], (err, users) => {
                    if (err) {
                      console.error('❌ Error reading users:', err);
                    } else {
                      console.log('All users with updated organizations:');
                      console.table(users);
                    }

                    db.close();
                    console.log('\n✅ Organization keys fixed successfully!');
                    console.log('\n⚠️  IMPORTANT: Users need to log out and log back in for changes to take effect.');
                    resolve();
                  });
                });
              }
            }
          );
        });

        // If no updates needed
        setTimeout(() => {
          if (totalToUpdate === 0) {
            console.log('ℹ️  No updates needed - all organizations are already using correct keys');
            db.close();
            resolve();
          }
        }, 100);
      });
    });
  });
}

// Run the fix
console.log('🔧 Starting Organization Key Fix...\n');
fixOrganizationKeys()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

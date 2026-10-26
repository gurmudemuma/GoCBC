// Script to sync approved exporters from database to blockchain
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cecbs.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Syncing approved exporters to blockchain...\n');

// Get all approved exporters with exporter IDs
db.all(
  `SELECT * FROM exporter_applications 
   WHERE status = 'approved' 
   AND exporter_id IS NOT NULL
   ORDER BY approved_at DESC`,
  [],
  (err, exporters) => {
    if (err) {
      console.error('❌ Error querying exporters:', err);
      db.close();
      return;
    }

    console.log(`Found ${exporters.length} approved exporters in database\n`);
    
    if (exporters.length === 0) {
      console.log('No exporters to sync.');
      db.close();
      return;
    }

    console.log('📋 Approved Exporters:');
    console.log('─'.repeat(100));
    console.log('Exporter ID  | Company Name                    | License Number      | Approved Date');
    console.log('─'.repeat(100));
    
    exporters.forEach(exp => {
      console.log(
        `${String(exp.exporter_id || 'N/A').padEnd(13)}| ` +
        `${String(exp.company_name).substring(0, 32).padEnd(32)}| ` +
        `${String(exp.ecta_license_number || 'N/A').padEnd(20)}| ` +
        `${exp.approved_at ? new Date(exp.approved_at).toLocaleDateString() : 'N/A'}`
      );
    });

    console.log('─'.repeat(100));
    console.log(`\n📌 To register these exporters on blockchain:`);
    console.log(`   1. Ensure Fabric network is running`);
    console.log(`   2. Start the API server: npm start`);
    console.log(`   3. Use the ECTA Portal to re-approve any exporter that shows errors`);
    console.log(`   4. Or use the API endpoint: POST /api/v1/exporters/exporter-applications/:id/approve\n`);
    
    console.log(`⚠️  Exporters that fail LC issuance need to be re-registered on blockchain`);
    console.log(`   The approval endpoint (already fixed) will register them properly.\n`);

    db.close();
  }
);

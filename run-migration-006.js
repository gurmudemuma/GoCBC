const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env from api directory
try {
  require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });
} catch(e) {
  console.log('Using DATABASE_URL from environment');
}

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
const url = new URL(dbUrl);

const pool = new Pool({
  host: url.hostname,
  port: url.port,
  database: url.pathname.slice(1),
  user: url.username,
  password: url.password
});

console.log('🔄 Running multi-party approval migration...');
console.log(`📍 Database: ${url.hostname}:${url.port}/${url.pathname.slice(1)}`);

const path = require('path');
const sql = fs.readFileSync(path.join(__dirname, 'api', 'src', 'migrations', '006_multi_party_approvals.sql'), 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Multi-party approval migration applied successfully');
    console.log('');
    console.log('Created:');
    console.log('  - approval_requirements table');
    console.log('  - approval_workflow_state table');
    console.log('  - Updated document_signatures table');
    console.log('  - Approval workflow triggers');
    console.log('  - document_approval_status view');
    console.log('');
    console.log('Default approval rules added for:');
    console.log('  - LC Documents (Commercial Invoice, Bill of Lading, etc.)');
    console.log('  - Contract Documents');
    console.log('  - Customs Documents');
    console.log('  - Shipment Documents');
    pool.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    pool.end();
    process.exit(1);
  });

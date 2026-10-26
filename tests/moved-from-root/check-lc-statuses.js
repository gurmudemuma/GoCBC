// Quick script to check LC statuses in database
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cecbs',
  user: process.env.DB_USER || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123'
});

async function checkLCStatuses() {
  try {
    console.log('\n=== Checking LC Statuses ===\n');
    
    // Get all LCs with their statuses
    const result = await pool.query(`
      SELECT 
        lc_id,
        status,
        exporter_name,
        amount,
        currency,
        (SELECT COUNT(*) FROM documents WHERE lc_id = lc_requests.lc_id) as doc_count,
        created_at
      FROM lc_requests
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No LCs found in database!');
      console.log('\nYou need to create test data first.');
      console.log('Run: cd api && node create-test-data-exp4886039.js');
    } else {
      console.log(`Found ${result.rows.length} LCs:\n`);
      
      // Group by status
      const byStatus = {};
      result.rows.forEach(lc => {
        if (!byStatus[lc.status]) {
          byStatus[lc.status] = [];
        }
        byStatus[lc.status].push(lc);
      });
      
      // Display grouped
      Object.keys(byStatus).forEach(status => {
        console.log(`\n📊 Status: ${status} (${byStatus[status].length} LCs)`);
        byStatus[status].forEach(lc => {
          console.log(`   - ${lc.lc_id}: ${lc.exporter_name} - $${lc.amount} ${lc.currency} (${lc.doc_count} docs)`);
        });
      });
      
      // Check for specific statuses needed
      console.log('\n\n=== Status Check for Banks Portal ===\n');
      
      const forexAllocated = byStatus['FOREX_ALLOCATED'] || [];
      const utilized = byStatus['UTILIZED'] || [];
      const paymentReleased = byStatus['PAYMENT_RELEASED'] || [];
      
      console.log(`✅ FOREX_ALLOCATED (Tab 2): ${forexAllocated.length} LCs`);
      console.log(`✅ UTILIZED (Tab 3): ${utilized.length} LCs`);
      console.log(`✅ PAYMENT_RELEASED (Tab 5): ${paymentReleased.length} LCs`);
      
      if (utilized.length === 0) {
        console.log('\n⚠️  WARNING: No LCs in UTILIZED status!');
        console.log('Tab 3 (Payment Release) will show "No data" until you:');
        console.log('1. Go to Tab 2 (Document Examination)');
        console.log('2. Examine and approve all 12 documents for a FOREX_ALLOCATED LC');
        console.log('3. The LC status will change to UTILIZED');
        console.log('4. Then it will appear in Tab 3');
      }
      
      if (forexAllocated.length === 0) {
        console.log('\n⚠️  WARNING: No LCs in FOREX_ALLOCATED status!');
        console.log('You need to allocate forex for an ISSUED LC first.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLCStatuses();

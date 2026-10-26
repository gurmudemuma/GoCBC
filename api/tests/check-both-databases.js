const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkBothDatabases() {
  console.log('\n=== CHECKING BOTH DATABASES FOR EXP4886039 ===\n');
  
  const exporterId = 'EXP4886039';
  
  try {
    // 1. CHECK POSTGRESQL
    console.log('📊 POSTGRESQL DATABASE:');
    console.log('------------------------');
    
    // Check user
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [exporterId]);
    console.log(`✓ User: ${user.rows.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    if (user.rows.length > 0) {
      console.log(`  - Username: ${user.rows[0].username}`);
      console.log(`  - Email: ${user.rows[0].email}`);
      console.log(`  - Role: ${user.rows[0].role}`);
    }
    
    // Check contracts
    const contracts = await pool.query('SELECT * FROM export_contracts WHERE exporter_id = $1', [exporterId]);
    console.log(`✓ Export Contracts: ${contracts.rows.length}`);
    
    // Check shipments
    const shipments = await pool.query(`
      SELECT s.* FROM shipments s 
      JOIN export_contracts ec ON s.contract_id = ec.id 
      WHERE ec.exporter_id = $1
    `, [exporterId]);
    console.log(`✓ Shipments: ${shipments.rows.length}`);
    
    const delivered = shipments.rows.filter(s => s.status === 'DELIVERED');
    console.log(`  - Delivered: ${delivered.length}`);
    
    // Check post-delivery tracking
    if (delivered.length > 0) {
      const tracking = await pool.query(`
        SELECT * FROM post_delivery_tracking 
        WHERE exporter_id = $1
      `, [exporterId]);
      console.log(`✓ Post-Delivery Tracking: ${tracking.rows.length}`);
    }
    
    console.log('\n🔗 API ENDPOINTS (via backend):');
    console.log('-------------------------------');
    
    // 2. LOGIN TO GET TOKEN
    try {
      const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
        username: 'bankAdmin',
        password: 'Bank@2024'
      });
      
      const token = loginResponse.data.token;
      console.log('✓ Authenticated as bank_admin');
      
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // 3. CHECK API ENDPOINTS
      
      // Contracts endpoint
      try {
        const contractsRes = await axios.get('http://localhost:3001/api/v1/contracts', { headers });
        console.log(`✓ /contracts: ${contractsRes.data.length || 0} contracts`);
        
        // Check for EXP4886039
        const exp4886039Contracts = (contractsRes.data || []).filter(c => c.exporterId === exporterId);
        console.log(`  - For EXP4886039: ${exp4886039Contracts.length}`);
      } catch (err) {
        console.log(`✗ /contracts: ${err.message}`);
      }
      
      // LCs endpoint
      try {
        const lcsRes = await axios.get('http://localhost:3001/api/v1/banking/lc', { headers });
        console.log(`✓ /banking/lc: ${lcsRes.data.length || 0} LCs`);
        
        // Check for EXP4886039
        const exp4886039LCs = (lcsRes.data || []).filter(lc => 
          lc.beneficiary === exporterId || lc.exporterId === exporterId
        );
        console.log(`  - For EXP4886039: ${exp4886039LCs.length}`);
      } catch (err) {
        console.log(`✗ /banking/lc: ${err.message}`);
      }
      
      // Shipments endpoint
      try {
        const shipmentsRes = await axios.get('http://localhost:3001/api/v1/shipments', { headers });
        console.log(`✓ /shipments: ${shipmentsRes.data.length || 0} shipments`);
        
        const deliveredRes = await axios.get('http://localhost:3001/api/v1/shipments?status=DELIVERED', { headers });
        console.log(`  - Delivered: ${deliveredRes.data.length || 0}`);
      } catch (err) {
        console.log(`✗ /shipments: ${err.message}`);
      }
      
      // Post-delivery endpoint
      try {
        const postDeliveryRes = await axios.get('http://localhost:3001/api/v1/post-delivery/summary', { headers });
        console.log(`✓ /post-delivery/summary: ${postDeliveryRes.data.length || 0} records`);
      } catch (err) {
        console.log(`✗ /post-delivery/summary: ${err.message}`);
      }
      
    } catch (loginErr) {
      console.log(`✗ Login failed: ${loginErr.message}`);
      console.log('  Cannot check API endpoints without authentication');
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`EXP4886039 user exists: ${user.rows.length > 0 ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Has contracts: ${contracts.rows.length > 0 ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Has shipments: ${shipments.rows.length > 0 ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Has delivered shipments: ${delivered.length > 0 ? 'YES ✓' : 'NO ✗'}`);
    
    if (delivered.length === 0) {
      console.log('\n⚠️  WARNING: No delivered shipments found!');
      console.log('   Banks Portal Tab 8 (LC Settlements) requires delivered shipments.');
      console.log('   Run: node api/create-test-data-exp4886039.js');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkBothDatabases();

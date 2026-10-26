/**
 * Sync Customs Clearance Data to Blockchain
 * Ensures clearance, declaration, and document data exists in both PostgreSQL and Blockchain
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

const BLOCKCHAIN_API = 'http://localhost:3001/api/v1';

async function syncClearanceToBlockchain() {
  try {
    console.log('🔄 Starting Customs Clearance → Blockchain Sync...\n');

    // 1. Get clearance and declaration data from PostgreSQL
    const result = await pool.query(`
      SELECT 
        cc.*,
        cd.declaration_number,
        cd.customs_value_usd,
        cd.quantity,
        cd.currency,
        cd.hs_code,
        cd.destination,
        cd.port_of_exit,
        cd.declaration_type,
        cd.eudr_compliant,
        cd.customs_officer,
        cd.inspection_required
      FROM customs_clearances cc
      LEFT JOIN customs_declarations cd ON cc.shipment_id = cd.shipment_id
      WHERE cc.shipment_id = $1
      LIMIT 1
    `, ['SHIP1787204371672']);

    if (result.rows.length === 0) {
      console.log('❌ No clearance data found in PostgreSQL');
      return;
    }

    const clearance = result.rows[0];
    console.log('✅ PostgreSQL Data Retrieved:');
    console.log('  Shipment ID:', clearance.shipment_id);
    console.log('  Clearance Number:', clearance.clearance_number);
    console.log('  Declaration Value:', `$${parseFloat(clearance.customs_value_usd).toLocaleString()}`);
    console.log('  Quantity:', `${parseFloat(clearance.quantity).toLocaleString()} kg`);
    console.log('  Duty Amount:', `${parseFloat(clearance.duty_amount).toLocaleString()} ETB`);
    console.log('  Tax Amount:', `${parseFloat(clearance.tax_amount).toLocaleString()} ETB`);
    console.log('  Status:', clearance.status);
    console.log('  Cleared By:', clearance.cleared_by);
    console.log('  Cleared Date:', clearance.cleared_date);

    // 2. Login to get auth token
    console.log('\n🔐 Authenticating...');
    const loginResponse = await fetch(`${BLOCKCHAIN_API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'customsAdmin',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error?.message);
      return;
    }

    const token = loginData.data.token;
    console.log('✅ Authenticated as customsAdmin');

    // 3. Check if shipment exists in blockchain
    console.log('\n📦 Checking blockchain for shipment...');
    const shipmentResponse = await fetch(`${BLOCKCHAIN_API}/blockchain/shipment/${clearance.shipment_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const shipmentData = await shipmentResponse.json();
    
    if (!shipmentData.success) {
      console.log('⚠️  Shipment not found in blockchain, will create/update via customs clearance');
    } else {
      console.log('✅ Shipment exists in blockchain');
      console.log('  Current Status:', shipmentData.data?.status);
    }

    // 4. Update blockchain with customs clearance data
    console.log('\n💾 Syncing clearance data to blockchain...');
    
    const blockchainPayload = {
      shipmentId: clearance.shipment_id,
      clearanceNumber: clearance.clearance_number,
      declarationNumber: clearance.declaration_number,
      status: clearance.status,
      clearedBy: clearance.cleared_by,
      clearedDate: clearance.cleared_date,
      customsValueUSD: parseFloat(clearance.customs_value_usd),
      quantity: parseFloat(clearance.quantity),
      currency: clearance.currency || 'USD',
      dutyAmount: parseFloat(clearance.duty_amount),
      taxAmount: parseFloat(clearance.tax_amount),
      totalFees: parseFloat(clearance.duty_amount) + parseFloat(clearance.tax_amount),
      hsCode: clearance.hs_code,
      destination: clearance.destination,
      portOfExit: clearance.port_of_exit,
      declarationType: clearance.declaration_type,
      eudrCompliant: clearance.eudr_compliant,
      inspectionRequired: clearance.inspection_required,
      remarks: clearance.remarks,
      timestamp: new Date().toISOString()
    };

    const updateResponse = await fetch(`${BLOCKCHAIN_API}/blockchain/customs/clearance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(blockchainPayload)
    });

    const updateData = await updateResponse.json();

    if (updateData.success) {
      console.log('✅ Successfully synced to blockchain!');
      console.log('  Transaction ID:', updateData.data?.transactionId || updateData.data?.txId || 'N/A');
      
      // 5. Verify the data is now in blockchain
      console.log('\n🔍 Verifying blockchain data...');
      const verifyResponse = await fetch(`${BLOCKCHAIN_API}/blockchain/shipment/${clearance.shipment_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const verifyData = await verifyResponse.json();
      
      if (verifyData.success && verifyData.data) {
        console.log('✅ Verification successful!');
        console.log('  Blockchain Status:', verifyData.data.status);
        console.log('  Blockchain Clearance:', verifyData.data.clearanceNumber || 'Set');
        console.log('  Blockchain Value:', verifyData.data.customsValueUSD || verifyData.data.declaredValue);
      } else {
        console.log('⚠️  Could not verify - may need manual check');
      }
    } else {
      console.error('❌ Failed to sync to blockchain:', updateData.error?.message);
    }

    console.log('\n✅ Sync process completed!');
    console.log('\n📊 Summary:');
    console.log('  PostgreSQL: ✅ Has complete data');
    console.log('  Blockchain: ' + (updateData.success ? '✅ Synced successfully' : '❌ Sync failed'));

  } catch (error) {
    console.error('❌ Error during sync:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the sync
syncClearanceToBlockchain();

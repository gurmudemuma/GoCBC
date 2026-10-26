const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkExporter() {
  const exporterId = 'EXP4886039';
  console.log(`\n=== Checking data for ${exporterId} ===\n`);

  try {
    // Check user
    const user = await pool.query('SELECT * FROM users WHERE exporter_id = $1 OR username = $1', [exporterId]);
    console.log(`Users: ${user.rows.length}`);
    user.rows.forEach(u => console.log('  -', u.username, u.email, u.role));

    // Check contracts
    const contracts = await pool.query('SELECT * FROM export_contracts WHERE exporter_id = $1', [exporterId]);
    console.log(`\nContracts: ${contracts.rows.length}`);
    contracts.rows.forEach(c => console.log('  -', c.contract_id, c.contract_value, c.status));

    // Check LCs
    const lcs = await pool.query('SELECT * FROM letters_of_credit WHERE exporter_id = $1 OR beneficiary = $1', [exporterId]);
    console.log(`\nLetter of Credits: ${lcs.rows.length}`);
    lcs.rows.forEach(lc => console.log('  -', lc.lc_id, lc.amount, lc.status));

    // Check shipments via contracts
    if (contracts.rows.length > 0) {
      const contractIds = contracts.rows.map(c => c.contract_id);
      const shipments = await pool.query('SELECT * FROM shipments WHERE contract_id = ANY($1)', [contractIds]);
      console.log(`\nShipments: ${shipments.rows.length}`);
      shipments.rows.forEach(s => console.log('  -', s.shipment_id, s.status));

      // Check delivered
      const delivered = shipments.rows.filter(s => s.status === 'DELIVERED');
      console.log(`\nDelivered Shipments: ${delivered.length}`);
      delivered.forEach(s => console.log('  -', s.shipment_id));

      // Check post-delivery workflow
      if (delivered.length > 0) {
        const shipmentIds = delivered.map(s => s.shipment_id);
        const workflows = await pool.query('SELECT * FROM post_delivery_workflow WHERE shipment_id = ANY($1)', [shipmentIds]);
        console.log(`\nPost-Delivery Workflows: ${workflows.rows.length}`);
        workflows.rows.forEach(w => {
          console.log(`  - ${w.shipment_id}:`);
          console.log(`    Payment: ${w.payment_received ? '✅' : '⏳'}`);
          console.log(`    Forex: ${w.forex_repatriated ? '✅' : '⏳'}`);
          console.log(`    LC Settled: ${w.lc_settled ? '✅' : '⏳'}`);
          console.log(`    Progress: ${w.completion_percentage || 0}%`);
        });
      }
    }

    console.log('\n=== Summary ===');
    console.log(`EXP4886039 has:`);
    console.log(`- ${contracts.rows.length} contracts`);
    console.log(`- ${lcs.rows.length} LCs`);
    if (contracts.rows.length > 0) {
      const contractIds = contracts.rows.map(c => c.contract_id);
      const shipments = await pool.query('SELECT * FROM shipments WHERE contract_id = ANY($1)', [contractIds]);
      const delivered = shipments.rows.filter(s => s.status === 'DELIVERED');
      console.log(`- ${shipments.rows.length} shipments (${delivered.length} delivered)`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkExporter();

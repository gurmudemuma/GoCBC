const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function createTestData() {
  const exporterId = 'EXP4886039';
  console.log(`\n=== Creating test data for ${exporterId} ===\n`);

  try {
    await pool.query('BEGIN');

    // 1. Create export contract
    const contractResult = await pool.query(`
      INSERT INTO export_contracts (
        contract_number, exporter_id, buyer_id, total_quantity_kg, 
        price_per_kg, total_value_usd, payment_terms, delivery_terms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, contract_number
    `, [
      'CONTRACT-' + Date.now(),
      exporterId,
      'BUYER001',
      10000, // 10 tons
      5.50,  // $5.50/kg
      55000, // $55,000 total
      'LC at sight',
      'FOB',
      'ACTIVE'
    ]);
    
    const contractId = contractResult.rows[0].id;
    const contractNumber = contractResult.rows[0].contract_number;
    console.log(`✅ Created contract: ${contractNumber} (ID: ${contractId})`);

    // 2. Create shipment (DELIVERED status)
    const shipmentResult = await pool.query(`
      INSERT INTO shipments (
        shipment_number, contract_id, shipping_line, vessel_name,
        port_of_loading, port_of_discharge, status, actual_arrival
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP - INTERVAL '5 days')
      RETURNING id, shipment_number
    `, [
      'SHIP-' + Date.now(),
      contractId,
      'Maersk Line',
      'MV CECBS Express',
      'Port of Djibouti',
      'Port of Hamburg',
      'DELIVERED'
    ]);
    
    const shipmentId = shipmentResult.rows[0].shipment_number;
    console.log(`✅ Created DELIVERED shipment: ${shipmentId}`);

    // 3. Create post_delivery_tracking record (partially complete)
    await pool.query(`
      INSERT INTO post_delivery_tracking (
        shipment_id, contract_id, exporter_id, delivery_date,
        payment_received, forex_repatriated, lc_used, lc_settled,
        overall_status, completion_percentage
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '5 days', 
        false, false, true, false, 'IN_PROGRESS', 0)
    `, [shipmentId, contractNumber, exporterId]);
    
    console.log(`✅ Created post_delivery_tracking record`);

    // 4. Create payment record (pending)
    await pool.query(`
      INSERT INTO payments (
        payment_id, contract_id, exporter_id, amount, currency, 
        payment_method, payment_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7)
    `, [
      'PAY-' + Date.now(),
      contractNumber,
      exporterId,
      55000,
      'USD',
      'LC',
      'PENDING'
    ]);
    
    console.log(`✅ Created payment record (PENDING)`);

    await pool.query('COMMIT');
    
    console.log(`\n=== Summary ===`);
    console.log(`Created complete test workflow for ${exporterId}:`);
    console.log(`- 1 export contract ($55,000)`);
    console.log(`- 1 DELIVERED shipment`);
    console.log(`- 1 post-delivery tracking (0% complete)`);
    console.log(`- 1 pending payment`);
    console.log(`\nReady to test Banks Portal Tab 8 (LC Settlements)!\n`);

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

createTestData();

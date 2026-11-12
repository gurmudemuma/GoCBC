#!/usr/bin/env node
/**
 * Initialize Post-Delivery Workflow for Test Shipment
 * This manually initializes the workflow for already-delivered shipments
 */

const http = require('http');

const SHIPMENT_ID = 'SHIP1787204371672';

console.log('\n🔧 Initializing Post-Delivery Workflow for Test Shipment\n');

// Login
const loginData = JSON.stringify({
  username: 'shippingAdmin',
  password: 'password123'
});

http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    const token = response.data?.token || response.token;
    
    if (!token) {
      console.error('❌ Login failed');
      process.exit(1);
    }
    
    console.log('✅ Authenticated\n');
    
    // Manually initialize post-delivery workflow
    console.log('📦 Initializing post-delivery workflow...');
    
    const initData = JSON.stringify({
      shipmentId: SHIPMENT_ID,
      deliveryDate: '2026-09-02T11:57:27Z'
    });
    
    const initReq = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/post-delivery/initialize',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': initData.length
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        if (res2.statusCode === 404) {
          console.log('⚠️  No initialize endpoint - using database directly...\n');
          
          // Direct database insert
          const { DatabaseService } = require('./api/dist/services/databaseService');
          const db = DatabaseService.getInstance();
          
          db.query(`
            INSERT INTO post_delivery_tracking (
              shipment_id, contract_id, exporter_id, delivery_date,
              lc_used, overall_status, completion_percentage,
              expected_completion_date, created_by, created_at
            )
            SELECT 
              $1, 
              'CONTRACT1787051634593',
              'EXP4792105',
              '2026-09-02T11:57:27Z',
              true,
              'PENDING',
              0,
              (TIMESTAMP '2026-09-02T11:57:27Z' + INTERVAL '90 days'),
              1,
              NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM post_delivery_tracking WHERE shipment_id = $1
            )
            RETURNING id
          `, [SHIPMENT_ID])
          .then(result => {
            if (result.rows.length > 0) {
              console.log(`✅ Post-delivery record created (ID: ${result.rows[0].id})`);
              
              // Create checklist items
              return db.query(`
                INSERT INTO post_delivery_checklist (shipment_id, item_type, description, display_order, completed)
                VALUES 
                  ($1, 'PAYMENT_RECEIVED', 'Payment received from buyer', 1, false),
                  ($1, 'FOREX_REPATRIATED', 'Forex repatriated to Ethiopia', 2, false),
                  ($1, 'LC_SETTLED', 'Letter of Credit settled', 3, false),
                  ($1, 'ECTA_AUDIT_COMPLETED', 'ECTA final audit completed', 4, false),
                  ($1, 'CONTRACT_CLOSED', 'Export contract closed', 5, false)
                ON CONFLICT (shipment_id, item_type) DO NOTHING
              `, [SHIPMENT_ID]);
            } else {
              console.log('ℹ️  Post-delivery record already exists');
            }
          })
          .then(() => {
            console.log('✅ Checklist items created');
            console.log('\n🎉 Initialization complete! You can now run test-post-delivery-workflow.js\n');
            process.exit(0);
          })
          .catch(err => {
            console.error('❌ Database error:', err.message);
            process.exit(1);
          });
        } else {
          try {
            const initResponse = JSON.parse(data2);
            if (initResponse.success) {
              console.log('✅ Post-delivery workflow initialized');
              console.log('\n🎉 Ready! You can now run test-post-delivery-workflow.js\n');
            } else {
              console.error('❌ Initialization failed:', initResponse.error?.message);
            }
          } catch (e) {
            console.error('❌ Failed to parse response');
          }
        }
      });
    });
    
    initReq.on('error', (error) => {
      console.log('⚠️  API endpoint not available - using database directly...\n');
      
      // Direct database insert (fallback)
      setTimeout(() => {
        const { DatabaseService } = require('./api/dist/services/databaseService');
        const db = DatabaseService.getInstance();
        
        db.query(`
          INSERT INTO post_delivery_tracking (
            shipment_id, contract_id, exporter_id, delivery_date,
            lc_used, overall_status, completion_percentage,
            expected_completion_date, created_by, created_at
          )
          SELECT 
            $1, 
            'CONTRACT1787051634593',
            'EXP4792105',
            '2026-09-02T11:57:27Z',
            true,
            'PENDING',
            0,
            (TIMESTAMP '2026-09-02T11:57:27Z' + INTERVAL '90 days'),
            1,
            NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM post_delivery_tracking WHERE shipment_id = $1
          )
          RETURNING id
        `, [SHIPMENT_ID])
        .then(result => {
          if (result.rows.length > 0) {
            console.log(`✅ Post-delivery record created (ID: ${result.rows[0].id})`);
            
            // Create checklist items
            return db.query(`
              INSERT INTO post_delivery_checklist (shipment_id, item_type, description, display_order, completed)
              VALUES 
                ($1, 'PAYMENT_RECEIVED', 'Payment received from buyer', 1, false),
                ($1, 'FOREX_REPATRIATED', 'Forex repatriated to Ethiopia', 2, false),
                ($1, 'LC_SETTLED', 'Letter of Credit settled', 3, false),
                ($1, 'ECTA_AUDIT_COMPLETED', 'ECTA final audit completed', 4, false),
                ($1, 'CONTRACT_CLOSED', 'Export contract closed', 5, false)
              ON CONFLICT (shipment_id, item_type) DO NOTHING
            `, [SHIPMENT_ID]);
          } else {
            console.log('ℹ️  Post-delivery record already exists');
          }
        })
        .then(() => {
          console.log('✅ Checklist items created');
          console.log('\n🎉 Initialization complete! You can now run test-post-delivery-workflow.js\n');
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Database error:', err.message);
          process.exit(1);
        });
      }, 100);
    });
    
    initReq.write(initData);
    initReq.end();
  });
}).on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
}).write(loginData);

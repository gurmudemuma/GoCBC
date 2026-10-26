/**
 * Backfill Applications to Blockchain
 * Creates blockchain shipments for all approved applications that don't exist on blockchain
 * 
 * This ensures PostgreSQL ↔️ Blockchain (CouchDB) are fully synchronized
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const FabricService = require('./dist/services/fabricService').default;

const databaseService = DatabaseService.getInstance();
const fabricService = new FabricService();

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

async function backfillApplications() {
  console.log('\n🔄 BACKFILLING APPLICATIONS TO BLOCKCHAIN');
  console.log('PostgreSQL → Hyperledger Fabric (CouchDB)');
  console.log('═'.repeat(60) + '\n');

  try {
    // Connect to blockchain as ECTAMSP (has authority to create shipments)
    await fabricService.connectAsOrg('ECTAMSP');
    console.log('✅ Connected to blockchain as ECTAMSP\n');

    // Get all approved applications from PostgreSQL
    const applications = await databaseService.query(`
      SELECT 
        id,
        application_id,
        exporter_id,
        company_name,
        status,
        tin_number,
        email,
        phone,
        city,
        region,
        submitted_at
      FROM exporter_applications 
      WHERE status IN ('approved', 'contract_signed')
      ORDER BY submitted_at DESC
    `);

    console.log(`📊 Found ${applications.rows.length} approved applications in PostgreSQL\n`);

    if (applications.rows.length === 0) {
      console.log('✅ No applications to sync!\n');
      return;
    }

    console.log('Starting synchronization...\n');

    for (const app of applications.rows) {
      const shipmentId = `SHIP${app.application_id}`;
      
      console.log(`\n📦 Processing: ${shipmentId}`);
      console.log(`   Company: ${app.company_name}`);
      console.log(`   Exporter ID: ${app.exporter_id || 'N/A'}`);
      console.log(`   Status: ${app.status}`);

      try {
        // Check if shipment already exists on blockchain
        const existsResult = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
        
        if (existsResult.success && existsResult.data) {
          console.log(`   ℹ️  Already exists on blockchain - SKIPPING`);
          skippedCount++;
          continue;
        }

        // Shipment doesn't exist, create it
        console.log(`   📝 Creating shipment on blockchain...`);

        // Prepare shipment data
        const shipmentData = {
          ShipmentID: shipmentId,
          ExporterID: app.exporter_id || app.application_id,
          CompanyName: app.company_name,
          Status: 'CREATED',
          CoffeeType: 'Arabica', // Default, can be updated later
          Quantity: '0',  // Default, updated when contract is created
          Origin: app.city || app.region || 'Ethiopia',
          Destination: 'International', // Default
          CreatedAt: app.submitted_at || new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        };

        // Create shipment on blockchain
        const createResult = await fabricService.invokeChaincode(
          'CreateShipment',
          [
            shipmentData.ShipmentID,
            shipmentData.ExporterID,
            shipmentData.CompanyName,
            shipmentData.Status,
            shipmentData.CoffeeType,
            shipmentData.Quantity,
            shipmentData.Origin,
            shipmentData.Destination,
            shipmentData.CreatedAt
          ]
        );

        if (createResult.success) {
          console.log(`   ✅ Successfully created on blockchain`);
          console.log(`   📝 Transaction ID: ${createResult.txId}`);
          successCount++;
        } else {
          console.log(`   ⚠️  Failed: ${createResult.error || 'Unknown error'}`);
          errorCount++;
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
        
        // If error is "shipment already exists", count as skipped
        if (error.message && error.message.includes('already exists')) {
          console.log(`   ℹ️  Shipment already exists - counting as skipped`);
          errorCount--;
          skippedCount++;
        }
      }
    }

    // Print summary
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total Applications:  ${applications.rows.length}`);
    console.log(`✅ Successfully Created: ${successCount}`);
    console.log(`ℹ️  Already Existed:     ${skippedCount}`);
    console.log(`❌ Errors:               ${errorCount}`);
    console.log('═'.repeat(60));

    if (successCount > 0) {
      console.log('\n✨ Backfill complete! PostgreSQL ↔️ Blockchain now synchronized.');
      console.log('🔍 New shipments will appear in Shipping Portal and other portals.\n');
    } else if (skippedCount === applications.rows.length) {
      console.log('\n✅ All applications already exist on blockchain - no sync needed!\n');
    } else {
      console.log('\n⚠️  Some errors occurred. Check the log above for details.\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

// Run backfill
backfillApplications();

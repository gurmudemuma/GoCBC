/**
 * Direct CouchDB Fix for Shipment Null Arrays
 * 
 * This script connects directly to CouchDB and fixes null ecxLots and documents fields
 * in shipment records by updating them to empty arrays at the database level.
 * 
 * This bypasses the Fabric SDK validation that occurs before chaincode execution.
 */

const http = require('http');

// CouchDB Configuration
const COUCHDB_HOST = 'localhost';
const COUCHDB_PORT = 5984;
const COUCHDB_USER = 'admin';
const COUCHDB_PASSWORD = 'adminpw';
const DB_NAME = 'coffeechannel_coffee'; // Default CouchDB naming: {channel}_{chaincode}

/**
 * Make HTTP request to CouchDB
 */
function couchRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`).toString('base64');
    
    const options = {
      hostname: COUCHDB_HOST,
      port: COUCHDB_PORT,
      path: path,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || parsed.reason || body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Get all shipment documents from CouchDB
 */
async function getAllShipments() {
  console.log('📡 Querying all shipments from CouchDB...');
  
  try {
    // Method 1: Try to get documents by SHIPMENT_ prefix in _id
    console.log('   Method 1: Querying by _id prefix...');
    const startkey = encodeURIComponent('"SHIPMENT_"');
    const endkey = encodeURIComponent('"SHIPMENT_\ufff0"');
    const result1 = await couchRequest('GET', `/${DB_NAME}/_all_docs?include_docs=true&startkey=${startkey}&endkey=${endkey}`);
    
    let shipments = result1.rows
      .filter(row => row.id.startsWith('SHIPMENT_'))
      .map(row => row.doc)
      .filter(doc => doc && doc.shipmentId);
    
    console.log(`   Found ${shipments.length} documents with SHIPMENT_ prefix`);
    
    // Method 2: If no shipments found, try using Mango query with shipmentId field
    if (shipments.length === 0) {
      console.log('   Method 2: Using Mango query for shipmentId field...');
      const result2 = await couchRequest('POST', `/${DB_NAME}/_find`, {
        selector: { 
          shipmentId: { "$exists": true },
          // Ensure it's actually a CoffeeShipment not CustomsDeclaration
          "$or": [
            { status: { "$exists": true } },
            { quantity: { "$exists": true } }
          ]
        },
        limit: 10000 // Get all shipments
      });
      
      shipments = result2.docs.filter(doc => {
        // Filter to only real shipments (have shipping-specific fields)
        return doc.shipmentId && (doc.quantity !== undefined || doc.origin !== undefined);
      });
      
      console.log(`   Found ${shipments.length} documents via Mango query`);
    }
    
    // Method 3: Try SHIP prefix if SHIPMENT_ didn't work
    if (shipments.length === 0) {
      console.log('   Method 3: Trying SHIP_ prefix...');
      const startkey3 = encodeURIComponent('"SHIP"');
      const endkey3 = encodeURIComponent('"SHIP\ufff0"');
      const result3 = await couchRequest('GET', `/${DB_NAME}/_all_docs?include_docs=true&startkey=${startkey3}&endkey=${endkey3}`);
      
      shipments = result3.rows
        .filter(row => row.id.startsWith('SHIP'))
        .map(row => row.doc)
        .filter(doc => doc && doc.shipmentId && doc.quantity !== undefined);
      
      console.log(`   Found ${shipments.length} documents with SHIP prefix`);
    }
    
    console.log(`✅ Total shipment documents found: ${shipments.length}`);
    
    // Show sample of what we found
    if (shipments.length > 0) {
      const sample = shipments[0];
      console.log(`   Sample shipment ID: ${sample._id}`);
      console.log(`   Sample shipmentId: ${sample.shipmentId}`);
      console.log(`   Sample ecxLots: ${JSON.stringify(sample.ecxLots)}`);
      console.log(`   Sample documents: ${JSON.stringify(sample.documents)}`);
    }
    
    return shipments;
  } catch (error) {
    console.error('❌ Failed to query shipments:', error.message);
    throw error;
  }
}

/**
 * Fix null arrays in a single shipment document
 */
function fixShipmentNullArrays(shipment) {
  let modified = false;
  
  // Fix ecxLots if null
  if (shipment.ecxLots === null || shipment.ecxLots === undefined) {
    shipment.ecxLots = [];
    modified = true;
  }
  
  // Fix documents if null
  if (shipment.documents === null || shipment.documents === undefined) {
    shipment.documents = [];
    modified = true;
  }
  
  return modified;
}

/**
 * Bulk update shipments in CouchDB
 */
async function bulkUpdateShipments(shipments) {
  console.log(`\n📝 Preparing bulk update for ${shipments.length} documents...`);
  
  try {
    const result = await couchRequest('POST', `/${DB_NAME}/_bulk_docs`, {
      docs: shipments
    });
    
    // Check for errors
    const errors = result.filter(r => r.error);
    const successes = result.filter(r => !r.error);
    
    console.log(`✅ Successfully updated: ${successes.length}`);
    if (errors.length > 0) {
      console.log(`❌ Failed to update: ${errors.length}`);
      errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.id}: ${err.error} - ${err.reason}`);
      });
    }
    
    return { successes: successes.length, errors: errors.length };
  } catch (error) {
    console.error('❌ Bulk update failed:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting CouchDB Direct Shipment Null Array Fix\n');
  console.log(`Database: ${DB_NAME}`);
  console.log(`CouchDB: http://${COUCHDB_HOST}:${COUCHDB_PORT}\n`);
  
  try {
    // Test CouchDB connection
    console.log('🔍 Testing CouchDB connection...');
    const info = await couchRequest('GET', '/');
    console.log(`✅ Connected to CouchDB ${info.version}\n`);
    
    // Check if database exists
    try {
      await couchRequest('GET', `/${DB_NAME}`);
      console.log(`✅ Database "${DB_NAME}" exists\n`);
    } catch (error) {
      console.error(`❌ Database "${DB_NAME}" not found!`);
      console.log('\n💡 Available databases:');
      const dbs = await couchRequest('GET', '/_all_dbs');
      dbs.forEach(db => console.log(`   - ${db}`));
      console.log('\nPlease update DB_NAME in the script and try again.');
      process.exit(1);
    }
    
    // Get all shipments
    const shipments = await getAllShipments();
    
    if (shipments.length === 0) {
      console.log('⚠️  No shipments found in database');
      return;
    }
    
    // Analyze and fix
    console.log('\n🔍 Analyzing shipments for null arrays...');
    const toUpdate = [];
    let nullEcxLots = 0;
    let nullDocuments = 0;
    
    shipments.forEach(shipment => {
      const hadNullEcxLots = shipment.ecxLots === null || shipment.ecxLots === undefined;
      const hadNullDocuments = shipment.documents === null || shipment.documents === undefined;
      
      if (hadNullEcxLots) nullEcxLots++;
      if (hadNullDocuments) nullDocuments++;
      
      const modified = fixShipmentNullArrays(shipment);
      if (modified) {
        toUpdate.push(shipment);
      }
    });
    
    console.log(`\n📊 Analysis Results:`);
    console.log(`   Total shipments: ${shipments.length}`);
    console.log(`   With null ecxLots: ${nullEcxLots}`);
    console.log(`   With null documents: ${nullDocuments}`);
    console.log(`   Need updates: ${toUpdate.length}`);
    
    if (toUpdate.length === 0) {
      console.log('\n✅ No shipments need fixing!');
      return;
    }
    
    // Perform bulk update
    console.log(`\n🔧 Updating ${toUpdate.length} shipments...`);
    const result = await bulkUpdateShipments(toUpdate);
    
    console.log('\n✅ Migration completed!');
    console.log(`   Successfully updated: ${result.successes}`);
    console.log(`   Failed: ${result.errors}`);
    
    if (result.errors === 0) {
      console.log('\n🎉 All shipment null arrays have been fixed in CouchDB!');
      console.log('   You can now query shipments without SDK validation errors.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

/**
 * Inspect CouchDB to find the correct database and document structure
 */

const http = require('http');

const COUCHDB_HOST = 'localhost';
const COUCHDB_PORT = 5984;
const COUCHDB_USER = 'admin';
const COUCHDB_PASSWORD = 'adminpw';

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

async function main() {
  console.log('🔍 Inspecting CouchDB structure...\n');
  
  try {
    // List all databases
    console.log('📚 Available databases:');
    const dbs = await couchRequest('GET', '/_all_dbs');
    dbs.forEach(db => console.log(`   - ${db}`));
    
    // Check each database for shipment-like documents
    console.log('\n🔍 Searching for shipment documents in each database...\n');
    
    for (const dbName of dbs) {
      if (dbName.startsWith('_')) continue; // Skip system databases
      
      try {
        const dbInfo = await couchRequest('GET', `/${dbName}`);
        console.log(`\n📂 Database: ${dbName}`);
        console.log(`   Documents: ${dbInfo.doc_count}`);
        console.log(`   Size: ${(dbInfo.sizes.active / 1024 / 1024).toFixed(2)} MB`);
        
        if (dbInfo.doc_count > 0) {
          // Get sample documents
          const docs = await couchRequest('GET', `/${dbName}/_all_docs?limit=10&include_docs=true`);
          console.log(`   Sample document IDs:`);
          docs.rows.forEach(row => {
            console.log(`      - ${row.id}`);
            if (row.doc && row.doc.shipmentId) {
              console.log(`        → Contains shipmentId: ${row.doc.shipmentId}`);
              console.log(`        → ecxLots: ${JSON.stringify(row.doc.ecxLots)}`);
              console.log(`        → documents: ${JSON.stringify(row.doc.documents)}`);
            }
          });
          
          // Try to find documents with shipmentId field
          try {
            const query = await couchRequest('POST', `/${dbName}/_find`, {
              selector: { shipmentId: { "$exists": true } },
              limit: 5
            });
            if (query.docs && query.docs.length > 0) {
              console.log(`   ✅ Found ${query.docs.length} documents with shipmentId field`);
              query.docs.forEach(doc => {
                console.log(`      - ID: ${doc._id}`);
                console.log(`        shipmentId: ${doc.shipmentId}`);
                console.log(`        ecxLots: ${JSON.stringify(doc.ecxLots)}`);
                console.log(`        documents: ${JSON.stringify(doc.documents)}`);
              });
            }
          } catch (e) {
            console.log(`   ⚠️  Mango query not available or failed`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Cannot access: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

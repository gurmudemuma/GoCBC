/**
 * Find all document types in CouchDB by analyzing _id prefixes
 */

const http = require('http');

const COUCHDB_HOST = 'localhost';
const COUCHDB_PORT = 5984;
const COUCHDB_USER = 'admin';
const COUCHDB_PASSWORD = 'adminpw';
const DB_NAME = 'coffeechannel_coffee';

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
  console.log('🔍 Analyzing all document types in CouchDB...\n');
  
  try {
    // Get all document IDs
    console.log(`Querying all documents from ${DB_NAME}...`);
    const result = await couchRequest('GET', `/${DB_NAME}/_all_docs`);
    
    console.log(`Total documents: ${result.rows.length}\n`);
    
    // Group by prefix
    const prefixCount = {};
    const samples = {};
    
    result.rows.forEach(row => {
      const id = row.id;
      const prefix = id.split('_')[0] || id.substring(0, 10);
      
      prefixCount[prefix] = (prefixCount[prefix] || 0) + 1;
      
      if (!samples[prefix]) {
        samples[prefix] = [];
      }
      if (samples[prefix].length < 3) {
        samples[prefix].push(id);
      }
    });
    
    // Sort by count
    const sorted = Object.entries(prefixCount).sort((a, b) => b[1] - a[1]);
    
    console.log('📊 Document types by prefix:\n');
    for (const [prefix, count] of sorted) {
      console.log(`${prefix.padEnd(20)} : ${count.toString().padStart(4)} documents`);
      samples[prefix].forEach(sample => {
        console.log(`  └─ ${sample}`);
      });
      console.log();
    }
    
    // Now let's look at actual shipment documents
    console.log('\n🔍 Looking for documents with shipping-related fields...\n');
    
    for (const [prefix, count] of sorted.slice(0, 10)) { // Check top 10 prefixes
      try {
        const sampleId = samples[prefix][0];
        const doc = await couchRequest('GET', `/${DB_NAME}/${encodeURIComponent(sampleId)}`);
        
        console.log(`📄 Sample from ${prefix}: ${sampleId}`);
        console.log(`   Fields: ${Object.keys(doc).slice(0, 15).join(', ')}`);
        
        // Check for shipment indicators
        if (doc.quantity !== undefined || doc.origin !== undefined || doc.vesselName !== undefined) {
          console.log(`   ⭐ LOOKS LIKE A SHIPMENT!`);
          console.log(`   ecxLots: ${JSON.stringify(doc.ecxLots)}`);
          console.log(`   documents: ${JSON.stringify(doc.documents)}`);
          console.log(`   quantity: ${doc.quantity}`);
          console.log(`   origin: ${doc.origin}`);
        }
        console.log();
      } catch (e) {
        console.log(`   ⚠️  Could not fetch sample: ${e.message}\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

/**
 * Check actual SHIP documents for null arrays
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
  console.log('🔍 Checking SHIP documents for null arrays...\n');
  
  try {
    // Get documents starting with SHIP (including SHIP1783...)
    const startkey = encodeURIComponent('"SHIP"');
    const endkey = encodeURIComponent('"SHIP\ufff0"');
    const result = await couchRequest('GET', `/${DB_NAME}/_all_docs?include_docs=true&startkey=${startkey}&endkey=${endkey}`);
    
    console.log(`Total SHIP documents: ${result.rows.length}\n`);
    
    let nullEcxLots = 0;
    let nullDocuments = 0;
    const samplesWithNull = [];
    
    result.rows.forEach(row => {
      const doc = row.doc;
      const hasNullEcxLots = doc.ecxLots === null;
      const hasNullDocuments = doc.documents === null;
      
      if (hasNullEcxLots) nullEcxLots++;
      if (hasNullDocuments) nullDocuments++;
      
      if ((hasNullEcxLots || hasNullDocuments) && samplesWithNull.length < 10) {
        samplesWithNull.push({
          _id: doc._id,
          shipmentId: doc.shipmentId,
          ecxLots: doc.ecxLots,
          documents: doc.documents,
          quantity: doc.quantity,
          origin: doc.origin
        });
      }
    });
    
    console.log(`📊 Analysis:`);
    console.log(`   Total SHIP documents: ${result.rows.length}`);
    console.log(`   With null ecxLots: ${nullEcxLots}`);
    console.log(`   With null documents: ${nullDocuments}`);
    
    if (samplesWithNull.length > 0) {
      console.log(`\n📄 Sample documents with null arrays:`);
      samplesWithNull.forEach(doc => {
        console.log(`\n   ID: ${doc._id}`);
        console.log(`   shipmentId: ${doc.shipmentId}`);
        console.log(`   ecxLots: ${JSON.stringify(doc.ecxLots)}`);
        console.log(`   documents: ${JSON.stringify(doc.documents)}`);
        console.log(`   quantity: ${doc.quantity}`);
        console.log(`   origin: ${doc.origin}`);
      });
    } else {
      console.log(`\n✅ No null arrays found in SHIP documents!`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

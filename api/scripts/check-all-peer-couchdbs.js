/**
 * Check all peer CouchDB instances for shipments with null arrays
 */

const http = require('http');

const COUCHDB_USER = 'admin';
const COUCHDB_PASSWORD = 'adminpw';
const DB_NAME = 'coffeechannel_coffee';

const PEERS = [
  { name: 'ECTA', port: 5984 },
  { name: 'ECX', port: 6984 },
  { name: 'Banks', port: 7984 },
  { name: 'NBE', port: 8984 },
  { name: 'Customs', port: 9984 },
  { name: 'Shipping', port: 10984 },
];

function couchRequest(port, method, path, data = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`).toString('base64');
    
    const options = {
      hostname: 'localhost',
      port: port,
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

async function checkPeerForNullArrays(peer) {
  try {
    // Get documents starting with SHIP (including SHIP1783...)
    const startkey = encodeURIComponent('"SHIP"');
    const endkey = encodeURIComponent('"SHIP\ufff0"');
    const result = await couchRequest(peer.port, 'GET', `/${DB_NAME}/_all_docs?include_docs=true&startkey=${startkey}&endkey=${endkey}`);
    
    let nullEcxLots = 0;
    let nullDocuments = 0;
    const samplesWithNull = [];
    
    result.rows.forEach(row => {
      const doc = row.doc;
      const hasNullEcxLots = doc.ecxLots === null;
      const hasNullDocuments = doc.documents === null;
      
      if (hasNullEcxLots) nullEcxLots++;
      if (hasNullDocuments) nullDocuments++;
      
      if ((hasNullEcxLots || hasNullDocuments) && samplesWithNull.length < 3) {
        samplesWithNull.push({
          _id: doc._id,
          shipmentId: doc.shipmentId,
          ecxLots: doc.ecxLots,
          documents: doc.documents
        });
      }
    });
    
    return {
      success: true,
      total: result.rows.length,
      nullEcxLots,
      nullDocuments,
      samples: samplesWithNull
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 Checking ALL peer CouchDB instances for shipments with null arrays\n');
  console.log('=' .repeat(80));
  
  let totalNullFound = 0;
  const peersWithNulls = [];
  
  for (const peer of PEERS) {
    console.log(`\n📂 ${peer.name} Peer (port ${peer.port})`);
    console.log('-'.repeat(80));
    
    const result = await checkPeerForNullArrays(peer);
    
    if (!result.success) {
      console.log(`   ❌ Error: ${result.error}`);
      continue;
    }
    
    console.log(`   Total SHIP documents: ${result.total}`);
    console.log(`   With null ecxLots: ${result.nullEcxLots}`);
    console.log(`   With null documents: ${result.nullDocuments}`);
    
    if (result.nullEcxLots > 0 || result.nullDocuments > 0) {
      console.log(`   ⚠️  FOUND NULL VALUES IN THIS PEER!`);
      totalNullFound += result.nullEcxLots + result.nullDocuments;
      peersWithNulls.push(peer.name);
      
      if (result.samples.length > 0) {
        console.log(`\n   Sample documents with nulls:`);
        result.samples.forEach(doc => {
          console.log(`      - ${doc._id}`);
          console.log(`        ecxLots: ${JSON.stringify(doc.ecxLots)}`);
          console.log(`        documents: ${JSON.stringify(doc.documents)}`);
        });
      }
    } else {
      console.log(`   ✅ No null arrays found`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Peers checked: ${PEERS.length}`);
  console.log(`   Peers with null values: ${peersWithNulls.length}`);
  
  if (peersWithNulls.length > 0) {
    console.log(`   Affected peers: ${peersWithNulls.join(', ')}`);
    console.log(`\n🔧 ACTION REQUIRED: Fix null values in the affected peer databases`);
  } else {
    console.log(`   ✅ ALL PEERS CLEAN! No null values found in any peer.`);
    console.log(`\n💡 If the API error persists, it might be:`);
    console.log(`      1. SDK caching old metadata`);
    console.log(`      2. Response coming from a different source`);
    console.log(`      3. Need to restart SDK connection`);
  }
}

main().catch(console.error);

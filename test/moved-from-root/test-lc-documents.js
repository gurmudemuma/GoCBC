const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/banking/lc',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token-bypass'
  }
};

// Note: This will fail auth, but we can see the endpoint is called
const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.success) {
        console.log(`✅ Total LCs: ${json.data.length}`);
        const withDocs = json.data.filter(lc => lc.documents && lc.documents.length > 0);
        console.log(`✅ LCs with documents: ${withDocs.length}`);
        if (withDocs.length > 0) {
          withDocs.forEach(lc => {
            console.log(`\n  LC: ${lc.lcId}`);
            console.log(`  Status: ${lc.status}`);
            console.log(`  Documents: ${lc.documents.length}`);
            lc.documents.forEach(d => {
              console.log(`    - ${d.documentType} (${d.status})`);
            });
          });
        }
      } else {
        console.log('❌ Error:', json.error);
      }
    } catch (e) {
      console.log('Response:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();

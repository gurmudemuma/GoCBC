const http = require('http');
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'localhost', port: 3001, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const ID = process.argv[2] || 'SHIP1786102768';
const LIST_MODE = process.argv[2] === 'list';
const MAX_STEPS = parseInt(process.argv[3] || '8', 10);

async function getStatus(token) {
  const s = await req('GET', `/api/v1/shipments/${ID}`, null, token);
  const rec = s.body?.data || s.body;
  return rec?.status || '(unknown)';
}

(async () => {
  const login = await req('POST', '/api/v1/auth/login', { username: 'admin', password: 'admin123' });
  const token = login.body?.data?.token || login.body?.token;
  if (!token) { console.log('Login failed', login.status); return; }

  if (LIST_MODE) {
    const res = await req('GET', '/api/v1/shipments', null, token);
    const recs = res.body?.data || [];
    const byStatus = {};
    for (const r of recs) (byStatus[r.status] = byStatus[r.status] || []).push(r.shipmentId || r.shipmentID || r.id);
    const chain = ['CREATED','CUSTOMS_CLEARED','LAND_TRANSPORT','PORT_ARRIVED','CONTAINER_STUFFED','VESSEL_LOADED','DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED','LOADED'];
    console.log('Status distribution:');
    for (const s of chain) {
      if (byStatus[s]) console.log(`  ${s.padEnd(20)} (${String(byStatus[s].length).padStart(2)}): ${byStatus[s].join(', ')}`);
    }
    for (const s of Object.keys(byStatus)) if (!chain.includes(s)) console.log(`  ${s.padEnd(20)} (${byStatus[s].length}): ${byStatus[s].join(', ')}`);
    return;
  }

  console.log(`Driving ${ID}`);
  console.log(`start status: ${await getStatus(token)}`);

  const steps = [
    ['land-transport/start', { transportCompany: 'Ethio Freight Co', truckPlate: 'AA-123-45', driverName: 'Kebede T', sealNumber: 'SEAL-9001' }],
    ['port/arrive', { notes: 'Arrived Djibouti' }],
    ['container/stuff', { containerNumber: 'MSKU7654321', containerType: 'REEFER', sealNumber: 'SEAL-9002', stuffedBy: 'Port Authority', location: 'Djibouti Port' }],
    ['vessel/load', { notes: 'Loaded on MSC vessel' }],
    ['vessel/depart', { notes: 'Departed Djibouti' }],
    ['in-transit/update', { trackingNumber: 'TRK-1786102768' }],
    ['destination/arrive', { notes: 'Arrived Hamburg' }],
    ['delivery/complete', { deliveryNotes: 'Delivered to buyer' }],
  ];

  for (const [path, body] of steps.slice(0, MAX_STEPS)) {
    const r = await req('POST', `/api/v1/shipments/${ID}/${path}`, body, token);
    const ok = r.status === 200 && (r.body?.success !== false);
    const st = await getStatus(token);
    console.log(`${ok ? 'OK ' : 'ERR'} ${path.padEnd(24)} -> http ${r.status} | now status: ${st}`);
    if (!ok) { console.log('   detail:', JSON.stringify(r.body).slice(0, 400)); }
  }

  console.log(`\nfinal status: ${await getStatus(token)}`);
})();

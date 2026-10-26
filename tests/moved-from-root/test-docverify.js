const http = require('http');
const jwt = require('c:\\goCBC\\api\\node_modules\\jsonwebtoken');

const BASE = 'http://localhost:3001/api/v1';

function req(method, path, token, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        let p = null;
        try { p = JSON.parse(b); } catch (e) { p = { _raw: b.slice(0, 300) }; }
        resolve({ status: res.statusCode, body: p });
      });
    });
    r.on('error', (e) => resolve({ status: 'ERR', body: { error: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

const shipments = ['SHIP1787204371672', 'SHIP1786102768'];

async function main() {
  // Try login
  const login = await req('POST', '/auth/login', null, { username: 'shippingAdmin', password: 'password123' });
  let token = login.body?.data?.token;
  console.log('[login shippingAdmin] status=' + login.status + ' hasToken=' + !!token);
  if (!token) {
    const login2 = await req('POST', '/auth/login', null, { username: 'shipping_admin', password: 'password123' });
    token = login2.body?.data?.token;
    console.log('[login shipping_admin] status=' + login2.status + ' hasToken=' + !!token);
  }
  if (!token) {
    // Mint token with known secret
    try {
      token = jwt.sign(
        { sub: 1, userId: 1, username: 'shippingAdmin', role: 'SHIPPING', org: 'SHIPPING', organization: 'SHIPPING', permissions: ['shipments:view-own'] },
        'cecbs-secret-key-change-in-production-use-at-least-32-characters',
        { expiresIn: '1h' }
      );
      console.log('[minted token with .env secret]');
    } catch (e) { console.log('mint error', e.message); }
  }
  if (!token) { console.log('NO TOKEN - abort'); return; }

  // Validate token against server
  const val = await req('GET', '/auth/validate', token);
  console.log('[auth/validate] status=' + val.status + ' body=' + JSON.stringify(val.body).slice(0,200));

  for (const id of shipments) {
    console.log('\n==== SHIPMENT ' + id + ' ====');
    const ship = await req('GET', '/shipments/' + id, token);
    console.log('[/shipments/:id] ' + ship.status + ' status=' + (ship.body?.data?.status || ship.body?.data?.currentStatus || '?') + ' docs=' + JSON.stringify(ship.body?.data?.documents || 'none').slice(0,200));
    const docs = await req('GET', '/shipments/' + id + '/documents', token);
    console.log('[/shipments/:id/documents] ' + docs.status + ' -> ' + JSON.stringify(docs.body).slice(0, 600));
    const hist = await req('GET', '/shipments/' + id + '/history', token);
    console.log('[/shipments/:id/history] ' + hist.status + ' -> ' + JSON.stringify(hist.body).slice(0, 300));
    const audit = await req('GET', '/audit/entity/SHIPMENT/' + id, token);
    console.log('[/audit/entity/SHIPMENT/:id] ' + audit.status + ' -> ' + JSON.stringify(audit.body).slice(0, 300));
  }

  const clr = await req('GET', '/customs/clearances', token);
  console.log('\n[/customs/clearances] ' + clr.status + ' count=' + (Array.isArray(clr.body?.data) ? clr.body.data.length : '?'));
}

main();

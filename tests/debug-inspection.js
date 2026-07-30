const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function debug() {
  const login = await axios.post(`${API}/auth/login`, {
    username: 'ecta_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  const ready = await axios.get(`${API}/customs/permit-ready`, { headers });
  const inspection = ready.data.data[0];
  
  console.log('Inspection data:');
  console.log(JSON.stringify(inspection, null, 2));
}

debug().catch(console.error);

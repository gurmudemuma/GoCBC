// Quick script to fix laboratory certification status for exporters
// Run with: node fix-lab-certification.js

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1';

// Login as admin to get token
async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'ecta_admin',
      password: 'password123'
    });
    console.log('Login response:', response.data);
    return response.data.data?.token || response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Update exporter laboratory certification
async function updateLabCertification(token, exporterId, certified) {
  try {
    const response = await axios.put(
      `${API_URL}/exporters/${exporterId}/laboratory`,
      { certified },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✓ Updated ${exporterId}: laboratoryCertified = ${certified}`);
    return response.data;
  } catch (error) {
    console.error(`✗ Failed to update ${exporterId}:`, error.response?.data || error.message);
  }
}

async function main() {
  console.log('Fixing laboratory certification status...\n');
  
  const token = await login();
  console.log('✓ Logged in successfully\n');
  
  // Update EXP6896621 to certified = true
  // This exporter has professionalTaster and tasterCertificate, so should be certified
  await updateLabCertification(token, 'EXP6896621', true);
  
  console.log('\n✓ Laboratory certification status updated successfully!');
  console.log('\nYou can verify by downloading the compliance report again.');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

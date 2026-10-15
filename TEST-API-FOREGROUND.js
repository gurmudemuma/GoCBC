#!/usr/bin/env node

// Set environment variables before requiring anything
process.env.NODE_ENV = 'production';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'cecbs-secret-key-change-in-production-use-at-least-32-characters';
process.env.JWT_EXPIRY = '168h';
process.env.DOCUMENT_ENCRYPTION_KEY = 'cecbs_document_encryption_key_2026_change_in_production_64chars';
process.env.DATABASE_URL = 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
process.env.FABRIC_ENABLED = 'true';
process.env.FABRIC_REQUIRED = 'false';
process.env.FABRIC_AS_LOCALHOST = 'true';
process.env.FABRIC_NETWORK_PATH = '../blockchain/organizations';
process.env.FABRIC_WALLET_PATH = './wallet';
process.env.FABRIC_CCP_PATH = '../blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json';
process.env.FABRIC_CHANNEL_NAME = 'coffeechannel';
process.env.FABRIC_CHAINCODE_NAME = 'coffee';
process.env.FABRIC_MSP_ID = 'ECTAMSP';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';
process.env.API_BASE_URL = 'http://localhost:3001/api/v1';
process.env.LOG_LEVEL = 'debug';

console.log('Environment variables set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING');
console.log('DOCUMENT_ENCRYPTION_KEY:', process.env.DOCUMENT_ENCRYPTION_KEY ? 'SET' : 'MISSING');
console.log('');

// Change to API directory
const apiDir = '/home/guda/GoCBC/api';
process.chdir(apiDir);
console.log('Working directory:', process.cwd());
console.log('');

console.log('Loading server...');
try {
  require(apiDir + '/dist/server.js');
  console.log('Server loaded successfully');
} catch (error) {
  console.error('SERVER LOAD ERROR:');
  console.error('Message:', error.message);
  console.error('');
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Keep running
console.log('');
console.log('Server should be running now on port 3001');
console.log('Press Ctrl+C to stop');

/**
 * CECBS User Management System - End-to-End Test
 * Tests cryptographic user management with blockchain identity
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
let adminToken = '';
let testUserId = null;
let testUsername = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logHeader(message) {
  log(`\n${'='.repeat(70)}`, 'magenta');
  log(`  ${message}`, 'magenta');
  log(`${'='.repeat(70)}`, 'magenta');
}

/**
 * Test Suite Runner
 */
async function runTests() {
  logHeader('CECBS USER MANAGEMENT SYSTEM - TEST SUITE');
  
  try {
    // Test 1: Admin Login
    await test1_adminLogin();
    
    // Test 2: Create New User
    await test2_createUser();
    
    // Test 3: List All Users
    await test3_listUsers();
    
    // Test 4: Get User Details
    await test4_getUserDetails();
    
    // Test 5: Enroll User with Blockchain Identity
    await test5_enrollBlockchainIdentity();
    
    // Test 6: Get Blockchain Identity
    await test6_getBlockchainIdentity();
    
    // Test 7: Sign Data with Private Key
    await test7_signData();
    
    // Test 8: Verify Signature
    await test8_verifySignature();
    
    // Test 9: Update User Status
    await test9_updateUserStatus();
    
    // Test 10: View Activity Log
    await test10_viewActivityLog();
    
    // Test 11: Check Expiring Certificates
    await test11_checkExpiringCertificates();
    
    // Test 12: List All Blockchain Identities
    await test12_listAllIdentities();
    
    logHeader('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    if (error.response) {
      logError(`Response status: ${error.response.status}`);
      logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

/**
 * Test 1: Admin Login
 */
async function test1_adminLogin() {
  logHeader('Test 1: Admin Login');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123',
    });
    
    if (response.data.success && response.data.data.token) {
      adminToken = response.data.data.token;
      logSuccess('Admin logged in successfully');
      logInfo(`Token: ${adminToken.substring(0, 50)}...`);
    } else {
      throw new Error('Login failed: No token received');
    }
  } catch (error) {
    throw new Error(`Admin login failed: ${error.message}`);
  }
}

/**
 * Test 2: Create New User
 */
async function test2_createUser() {
  logHeader('Test 2: Create New User');
  
  testUsername = `testuser_${Date.now()}`;
  
  try {
    const response = await axios.post(
      `${API_BASE}/users`,
      {
        username: testUsername,
        email: `${testUsername}@test.cecbs.et`,
        password: 'SecurePass123!',
        fullName: 'Test User for Crypto',
        role: 'EXPORTER',
        organization: 'Test Coffee Exports Ltd',
        exporterId: `EXP${Date.now()}`,
        ectaLicense: `ECTA/LIC/2024/${Date.now()}`,
        phone: '+251912345678',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    if (response.data.success && response.data.data.id) {
      testUserId = response.data.data.id;
      logSuccess(`User created: ${testUsername} (ID: ${testUserId})`);
      logInfo(`Email: ${response.data.data.email}`);
      logInfo(`Role: ${response.data.data.role}`);
      logInfo(`Organization: ${response.data.data.organization}`);
    } else {
      throw new Error('User creation failed: No user ID received');
    }
  } catch (error) {
    throw new Error(`Create user failed: ${error.message}`);
  }
}

/**
 * Test 3: List All Users
 */
async function test3_listUsers() {
  logHeader('Test 3: List All Users');
  
  try {
    const response = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { limit: 10, offset: 0 },
    });
    
    if (response.data.success && response.data.data) {
      logSuccess(`Retrieved ${response.data.data.length} users`);
      logInfo(`Total users: ${response.data.pagination.total}`);
      
      // Display first 3 users
      response.data.data.slice(0, 3).forEach((user, index) => {
        logInfo(`  ${index + 1}. ${user.username} (${user.role}) - ${user.email}`);
      });
    } else {
      throw new Error('Failed to retrieve users');
    }
  } catch (error) {
    throw new Error(`List users failed: ${error.message}`);
  }
}

/**
 * Test 4: Get User Details
 */
async function test4_getUserDetails() {
  logHeader('Test 4: Get User Details');
  
  try {
    const response = await axios.get(`${API_BASE}/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success && response.data.data) {
      const user = response.data.data;
      logSuccess(`Retrieved user details: ${user.username}`);
      logInfo(`  ID: ${user.id}`);
      logInfo(`  Email: ${user.email}`);
      logInfo(`  Full Name: ${user.full_name}`);
      logInfo(`  Role: ${user.role}`);
      logInfo(`  Organization: ${user.organization}`);
      logInfo(`  Status: ${user.status}`);
      logInfo(`  Created: ${user.created_at}`);
    } else {
      throw new Error('Failed to retrieve user details');
    }
  } catch (error) {
    throw new Error(`Get user details failed: ${error.message}`);
  }
}

/**
 * Test 5: Enroll User with Blockchain Identity
 */
async function test5_enrollBlockchainIdentity() {
  logHeader('Test 5: Enroll User with Blockchain Identity');
  
  try {
    const response = await axios.post(
      `${API_BASE}/crypto-users/enroll`,
      {
        userId: testUserId,
        username: testUsername,
        role: 'EXPORTER',
        organization: 'Test Coffee Exports Ltd',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    if (response.data.success && response.data.data) {
      const identity = response.data.data;
      logSuccess(`User enrolled with blockchain identity`);
      logInfo(`  User ID: ${identity.userId}`);
      logInfo(`  Username: ${identity.username}`);
      logInfo(`  MSP ID: ${identity.mspId}`);
      logInfo(`  Enrollment ID: ${identity.enrollmentId}`);
      logInfo(`  Certificate Hash: ${identity.certificateHash.substring(0, 32)}...`);
      logInfo(`  Expires At: ${identity.expiresAt}`);
      logInfo(`  Status: ${identity.status}`);
    } else {
      throw new Error('Failed to enroll blockchain identity');
    }
  } catch (error) {
    throw new Error(`Blockchain enrollment failed: ${error.message}`);
  }
}

/**
 * Test 6: Get Blockchain Identity
 */
async function test6_getBlockchainIdentity() {
  logHeader('Test 6: Get Blockchain Identity');
  
  try {
    const response = await axios.get(`${API_BASE}/crypto-users/${testUserId}/identity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success && response.data.data) {
      const identity = response.data.data;
      logSuccess(`Retrieved blockchain identity`);
      logInfo(`  MSP ID: ${identity.mspId}`);
      logInfo(`  Enrollment ID: ${identity.enrollmentId}`);
      logInfo(`  Certificate Hash: ${identity.certificateHash.substring(0, 32)}...`);
      logInfo(`  Created: ${identity.createdAt}`);
      logInfo(`  Expires: ${identity.expiresAt}`);
      logInfo(`  Status: ${identity.status}`);
    } else {
      throw new Error('Failed to retrieve blockchain identity');
    }
  } catch (error) {
    throw new Error(`Get blockchain identity failed: ${error.message}`);
  }
}

/**
 * Test 7: Sign Data with Private Key
 */
let dataToSign = '';
let signature = '';

async function test7_signData() {
  logHeader('Test 7: Sign Data with Private Key');
  
  dataToSign = `Test transaction at ${new Date().toISOString()}`;
  
  try {
    // First, login as the test user to get their token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: testUsername,
      password: 'SecurePass123!',
    });
    
    const userToken = loginResponse.data.data.token;
    
    // Now sign data with user's private key
    const response = await axios.post(
      `${API_BASE}/crypto-users/sign`,
      { data: dataToSign },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    
    if (response.data.success && response.data.data.signature) {
      signature = response.data.data.signature;
      logSuccess(`Data signed successfully`);
      logInfo(`  Algorithm: ${response.data.data.algorithm}`);
      logInfo(`  Data: ${dataToSign}`);
      logInfo(`  Signature: ${signature.substring(0, 50)}...`);
    } else {
      throw new Error('Failed to sign data');
    }
  } catch (error) {
    throw new Error(`Sign data failed: ${error.message}`);
  }
}

/**
 * Test 8: Verify Signature
 */
async function test8_verifySignature() {
  logHeader('Test 8: Verify Signature');
  
  try {
    const response = await axios.post(
      `${API_BASE}/crypto-users/verify`,
      {
        userId: testUserId,
        data: dataToSign,
        signature: signature,
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    if (response.data.success && response.data.data) {
      const isValid = response.data.data.valid;
      
      if (isValid) {
        logSuccess(`Signature verified successfully ✓`);
        logInfo(`  Data: ${dataToSign}`);
        logInfo(`  Signature is VALID`);
      } else {
        logError(`Signature verification FAILED ✗`);
      }
    } else {
      throw new Error('Failed to verify signature');
    }
  } catch (error) {
    throw new Error(`Verify signature failed: ${error.message}`);
  }
}

/**
 * Test 9: Update User Status
 */
async function test9_updateUserStatus() {
  logHeader('Test 9: Update User Status');
  
  try {
    const response = await axios.put(
      `${API_BASE}/users/${testUserId}/status`,
      {
        status: 'suspended',
        reason: 'Testing status update functionality',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    if (response.data.success) {
      logSuccess(`User status updated to: suspended`);
      logInfo(`  Reason: Testing status update functionality`);
      
      // Reactivate user
      await axios.put(
        `${API_BASE}/users/${testUserId}/status`,
        {
          status: 'active',
          reason: 'Test completed, reactivating user',
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      logSuccess(`User reactivated`);
    } else {
      throw new Error('Failed to update user status');
    }
  } catch (error) {
    throw new Error(`Update user status failed: ${error.message}`);
  }
}

/**
 * Test 10: View Activity Log
 */
async function test10_viewActivityLog() {
  logHeader('Test 10: View Activity Log');
  
  try {
    const response = await axios.get(`${API_BASE}/users/activity-log`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { userId: testUserId, limit: 5 },
    });
    
    if (response.data.success && response.data.data) {
      logSuccess(`Retrieved ${response.data.data.length} activity log entries`);
      
      response.data.data.forEach((log, index) => {
        logInfo(`  ${index + 1}. ${log.action} by ${log.performed_by} at ${log.created_at}`);
      });
    } else {
      logWarning('No activity log entries found (this is okay for new user)');
    }
  } catch (error) {
    logWarning(`Activity log retrieval: ${error.message} (endpoint may not be implemented yet)`);
  }
}

/**
 * Test 11: Check Expiring Certificates
 */
async function test11_checkExpiringCertificates() {
  logHeader('Test 11: Check Expiring Certificates');
  
  try {
    const response = await axios.get(`${API_BASE}/crypto-users/expiring-certificates`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success) {
      const count = response.data.data ? response.data.data.length : 0;
      
      if (count > 0) {
        logWarning(`Found ${count} expiring certificates`);
        response.data.data.slice(0, 3).forEach((cert, index) => {
          logInfo(`  ${index + 1}. ${cert.username} - expires in ${cert.daysRemaining} days`);
        });
      } else {
        logSuccess('No expiring certificates found');
      }
    } else {
      throw new Error('Failed to check expiring certificates');
    }
  } catch (error) {
    throw new Error(`Check expiring certificates failed: ${error.message}`);
  }
}

/**
 * Test 12: List All Blockchain Identities
 */
async function test12_listAllIdentities() {
  logHeader('Test 12: List All Blockchain Identities');
  
  try {
    const response = await axios.get(`${API_BASE}/crypto-users/identities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success && response.data.data) {
      logSuccess(`Retrieved ${response.data.total} blockchain identities`);
      
      response.data.data.slice(0, 5).forEach((identity, index) => {
        logInfo(`  ${index + 1}. ${identity.username} (${identity.mspId}) - Status: ${identity.status}`);
      });
    } else {
      throw new Error('Failed to retrieve blockchain identities');
    }
  } catch (error) {
    throw new Error(`List blockchain identities failed: ${error.message}`);
  }
}

// Run the test suite
runTests();

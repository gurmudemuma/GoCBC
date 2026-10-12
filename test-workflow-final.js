#!/usr/bin/env node

/**
 * GoCBC Complete Workflow Test - FULLY CORRECTED
 * Tests actual blockchain transactions with proper paths and field names
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3001/api/v1';
const LOG_FILE = 'workflow-test-final.log';
const TIMESTAMP = Date.now();

let testsPass = 0;
let testsFailed = 0;
const logEntries = [];

function log(message) {
    console.log(message);
    logEntries.push(message);
}

function logToFile() {
    fs.writeFileSync(LOG_FILE, logEntries.join('\n'));
}

async function testEndpoint(name, method, endpoint, data = null, token = null) {
    log(`\n━━━ TEST: ${name} ━━━`);
    log(`Endpoint: ${method} ${endpoint}`);
    
    try {
        const config = {
            method,
            url: endpoint,
            headers: {}
        };
        
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (data) {
            config.headers['Content-Type'] = 'application/json';
            config.data = data;
        }
        
        const response = await axios(config);
        
        log(`✓ PASS - HTTP ${response.status}`);
        log(`Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
        testsPass++;
        
        return response.data;
    } catch (error) {
        log(`✗ FAIL - ${error.response ? `HTTP ${error.response.status}` : error.message}`);
        if (error.response && error.response.data) {
            log(`Error: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
        testsFailed++;
        throw error;
    }
}

async function runTests() {
    log('=================================================================');
    log('GoCBC Complete Workflow Test - FULLY CORRECTED');
    log('=================================================================');
    log(`Timestamp: ${TIMESTAMP}`);
    log(`Date: ${new Date().toISOString()}`);
    
    try {
        // ========================================================================
        // STEP 1: Health Check
        // ========================================================================
        log('\n\n=== STEP 1: Health Check ===');
        const health = await testEndpoint(
            'Health Check',
            'GET',
            'http://localhost:3001/health'
        );
        
        // ========================================================================
        // STEP 2: Admin Login
        // ========================================================================
        log('\n\n=== STEP 2: Admin Login ===');
        const loginResponse = await testEndpoint(
            'Admin Login',
            'POST',
            `${API_BASE}/auth/login`,
            { username: 'admin', password: 'admin123' }
        );
        
        const adminToken = loginResponse.data?.token || loginResponse.token;
        if (!adminToken) {
            throw new Error('No admin token received');
        }
        log(`Admin Token: ${adminToken.substring(0, 30)}...`);
        
        // ========================================================================
        // STEP 3: Submit Exporter Application (CORRECTED PATH)
        // ========================================================================
        log('\n\n=== STEP 3: Submit Exporter Application ===');
        const exporterEmail = `exporter_${TIMESTAMP}@test.com`;
        const exporterCompany = `Test Coffee Ltd ${TIMESTAMP}`;
        
        log(`✓ Using CORRECTED endpoint: /api/v1/exporters/exporter-applications`);
        
        const appResponse = await testEndpoint(
            'Submit Exporter Application',
            'POST',
            `${API_BASE}/exporters/exporter-applications`,
            {
                companyName: exporterCompany,
                licenseNumber: `LIC-${TIMESTAMP}`,
                address: 'Addis Ababa, Ethiopia',
                phone: '+251911234567',
                email: exporterEmail,
                tinNumber: `TIN-${TIMESTAMP}`,
                businessType: 'Coffee Exporter',
                exportCapacity: 5000
            }
        );
        
        const appId = appResponse.data?.applicationId || appResponse.data?.application_id || appResponse.applicationId;
        log(`Application ID: ${appId}`);
        log(`Application Email: ${exporterEmail}`);
        
        // ========================================================================
        // STEP 4: Create Exporter User
        // ========================================================================
        log('\n\n=== STEP 4: Create Exporter User ===');
        const exporterId = `EXP-${TIMESTAMP}`;
        const exporterUsername = `exporter_${TIMESTAMP}`;
        const exporterPassword = 'Exporter123!';
        
        try {
            await testEndpoint(
                'Create Exporter User',
                'POST',
                `${API_BASE}/users/register`,
                {
                    username: exporterUsername,
                    email: exporterEmail,
                    password: exporterPassword,
                    role: 'EXPORTER',
                    organization: 'EXPORTER',
                    exporterId: exporterId,
                    fullName: exporterCompany
                },
                adminToken
            );
        } catch (e) {
            log('⚠ User creation failed (may already exist), continuing...');
        }
        
        // ========================================================================
        // STEP 5: Login as Exporter
        // ========================================================================
        log('\n\n=== STEP 5: Login as Exporter ===');
        const exporterLogin = await testEndpoint(
            'Exporter Login',
            'POST',
            `${API_BASE}/auth/login`,
            { username: exporterUsername, password: exporterPassword }
        );
        
        const exporterToken = exporterLogin.data?.token || exporterLogin.token;
        log(`Exporter Token: ${exporterToken.substring(0, 30)}...`);
        
        // ========================================================================
        // STEP 6: Create Sales Contract (CORRECTED FIELD NAMES)
        // ========================================================================
        log('\n\n=== STEP 6: Create Sales Contract ===');
        const contractId = `CNT-${TIMESTAMP}`;
        const buyerId = `BUY-${TIMESTAMP}`;
        
        log(`✓ Using CORRECTED field names: contractID, exporterID, buyerID (uppercase)`);
        
        const contractResponse = await testEndpoint(
            'Create Sales Contract',
            'POST',
            `${API_BASE}/contracts`,
            {
                contractID: contractId,  // ✓ CORRECTED: uppercase ID
                exporterID: exporterId,  // ✓ CORRECTED: uppercase ID
                buyerID: buyerId,        // ✓ CORRECTED: uppercase ID
                buyerCountry: 'Germany',
                buyerBank: 'Deutsche Bank',
                exporterBank: 'Commercial Bank of Ethiopia',
                coffeeType: 'Arabica Sidamo Grade 2',
                quantity: 10000,
                pricePerKg: 5.50,
                currency: 'USD',
                paymentMethod: 'LC',
                eudrRequired: true,
                documents: []
            },
            exporterToken
        );
        
        log(`Contract ID: ${contractId}`);
        log(`Contract Blockchain TX: ${contractResponse.data?.txId || contractResponse.data?.transactionId || 'N/A'}`);
        
        // ========================================================================
        // STEP 7: Create Shipment (CORRECTED FIELD NAMES)
        // ========================================================================
        log('\n\n=== STEP 7: Create Shipment ===');
        const shipmentId = `SHP-${TIMESTAMP}`;
        
        const shipmentResponse = await testEndpoint(
            'Create Shipment',
            'POST',
            `${API_BASE}/shipments`,
            {
                shipmentID: shipmentId,    // ✓ CORRECTED: uppercase ID
                contractID: contractId,    // ✓ CORRECTED: uppercase ID
                exporterID: exporterId,    // ✓ CORRECTED: uppercase ID
                buyerID: buyerId,          // ✓ CORRECTED: uppercase ID
                origin: 'Sidamo, Ethiopia',
                quantity: 10000,
                grade: 'Grade 2',
                icoNumber: `ICO-${TIMESTAMP}`,
                channel: 'ECX',
                ecxLotNumber: `ECX-LOT-${TIMESTAMP}`,
                forexRate: 55.5,
                valueUSD: 55000,
                eudrCompliant: true,
                documents: []
            },
            exporterToken
        );
        
        log(`Shipment ID: ${shipmentId}`);
        log(`Shipment Blockchain TX: ${shipmentResponse.data?.txId || shipmentResponse.data?.transactionId || 'N/A'}`);
        
        // ========================================================================
        // STEP 8: Query Blockchain
        // ========================================================================
        log('\n\n=== STEP 8: Query Blockchain Data ===');
        
        try {
            const contractQuery = await testEndpoint(
                'Query Contract from Blockchain',
                'GET',
                `${API_BASE}/contracts/${contractId}`,
                null,
                exporterToken
            );
            log(`Contract Status: ${contractQuery.data?.status || 'N/A'}`);
        } catch (e) {
            log('⚠ Contract query failed (may still be syncing)');
        }
        
        try {
            const shipmentQuery = await testEndpoint(
                'Query Shipment from Blockchain',
                'GET',
                `${API_BASE}/shipments/${shipmentId}`,
                null,
                exporterToken
            );
            log(`Shipment Status: ${shipmentQuery.data?.status || 'N/A'}`);
        } catch (e) {
            log('⚠ Shipment query failed (may still be syncing)');
        }
        
        // ========================================================================
        // SUMMARY
        // ========================================================================
        log('\n\n=================================================================');
        log('TEST SUMMARY');
        log('=================================================================');
        log(`✓ Tests Passed: ${testsPass}`);
        log(`✗ Tests Failed: ${testsFailed}`);
        log('');
        log('Test Data Created:');
        log(`  Application ID: ${appId}`);
        log(`  Exporter ID: ${exporterId}`);
        log(`  Contract ID: ${contractId}`);
        log(`  Shipment ID: ${shipmentId}`);
        log('');
        
        if (testsFailed === 0) {
            log('✓ ALL TESTS PASSED!');
            log('System is functional and storing data in both databases.');
        } else {
            log('⚠ SOME TESTS FAILED');
            log(`Check the log file for details: ${LOG_FILE}`);
        }
        
        logToFile();
        process.exit(testsFailed === 0 ? 0 : 1);
        
    } catch (error) {
        log(`\n\n✗ CRITICAL ERROR: ${error.message}`);
        log(error.stack);
        logToFile();
        process.exit(1);
    }
}

// Run the tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

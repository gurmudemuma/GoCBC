#!/usr/bin/env node

// Register Exporter via API's Fabric Service
// This uses the properly configured Fabric connection in the API

const path = require('path');

// Set up paths
process.env.FABRIC_WALLET_PATH = path.join(__dirname, 'api', 'wallet');
process.env.FABRIC_NETWORK_PATH = path.join(__dirname, 'blockchain', 'organizations');
process.env.FABRIC_CCP_PATH = path.join(__dirname, 'blockchain', 'organizations', 'peerOrganizations', 'ecta.cecbs.et', 'connection-ecta.json');
process.env.FABRIC_CHANNEL_NAME = 'coffeechannel';
process.env.FABRIC_CHAINCODE_NAME = 'coffee';
process.env.FABRIC_MSP_ID = 'ECTAMSP';
process.env.FABRIC_ENABLED = 'true';
process.env.FABRIC_AS_LOCALHOST = 'true';

// Import the Fabric service
const FabricService = require('./api/dist/services/fabricService').FabricService;

async function registerExporter() {
    console.log('==========================================');
    console.log('Registering Exporter via API Fabric Service');
    console.log('==========================================\n');

    try {
        const fabricService = FabricService.getInstance();
        
        // Connect to Fabric
        console.log('[1/3] Connecting to Fabric network as ECTAMSP...');
        await fabricService.connect('ECTAMSP');
        console.log('✅ Connected to Fabric\n');

        // Register exporter
        console.log('[2/3] Registering exporter EXP001...');
        const result = await fabricService.registerExporter(
            'EXP001',
            'Test Coffee Exporter Ltd',
            'ECTA-2024-001',
            'company',
            '5000000',
            'yes',
            'TASTER-CERT-001',
            'LAB-CERT-001',
            '2027-12-31',
            'ecta_admin'
        );

        if (result.success) {
            console.log('✅ Exporter registered successfully!');
            console.log('Transaction ID:', result.txId);
        } else {
            console.log('⚠️ Registration failed:', result.error);
        }

        // Verify registration
        console.log('\n[3/3] Verifying registration...');
        const verifyResult = await fabricService.getExporter('EXP001');
        
        if (verifyResult.success) {
            console.log('✅ Exporter verified on blockchain:');
            console.log(JSON.stringify(verifyResult.data, null, 2));
        } else {
            console.log('⚠️ Verification failed:', verifyResult.error);
        }

        // Disconnect
        await fabricService.disconnect();
        
        console.log('\n==========================================');
        console.log('Registration process complete!');
        console.log('==========================================');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

registerExporter();

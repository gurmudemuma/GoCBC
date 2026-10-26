/**
 * Run Shipment Migration
 * Executes the MigrateShipmentNullArrays chaincode function
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// Build connection profile dynamically (same as API)
function buildConnectionProfile() {
    return {
        name: 'cecbs-network',
        version: '1.0.0',
        client: {
            organization: 'ecta',
            connection: {
                timeout: {
                    peer: { endorser: '300' },
                    orderer: '300'
                }
            }
        },
        organizations: {
            ecta: {
                mspid: 'ECTAMSP',
                peers: ['peer0.ecta.cecbs.et'],
                certificateAuthorities: ['ca.ecta.cecbs.et']
            }
        },
        peers: {
            'peer0.ecta.cecbs.et': {
                url: 'grpcs://localhost:7051',
                tlsCACerts: {
                    path: path.resolve(__dirname, '../blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt')
                },
                grpcOptions: {
                    'ssl-target-name-override': 'peer0.ecta.cecbs.et',
                    'hostnameOverride': 'peer0.ecta.cecbs.et'
                }
            }
        },
        certificateAuthorities: {
            'ca.ecta.cecbs.et': {
                url: 'https://localhost:7054',
                caName: 'ca-ecta',
                tlsCACerts: {
                    path: path.resolve(__dirname, '../blockchain/organizations/peerOrganizations/ecta.cecbs.et/ca/ca.ecta.cecbs.et-cert.pem')
                }
            }
        }
    };
}

async function importAdminIdentity(wallet) {
    try {
        // Check if admin already exists
        const adminExists = await wallet.get('admin-ECTAMSP');
        if (adminExists) {
            console.log('✅ Admin identity already exists in wallet');
            return;
        }

        console.log('📝 Importing admin identity from cryptogen certificates...');
        
        const credPath = path.join(
            __dirname,
            '..',
            'blockchain',
            'organizations',
            'peerOrganizations',
            'ecta.cecbs.et',
            'users',
            'Admin@ecta.cecbs.et',
            'msp'
        );

        const certPath = path.join(credPath, 'signcerts', 'cert.pem');
        const keyDir = path.join(credPath, 'keystore');
        const keyFiles = fs.readdirSync(keyDir);
        const keyPath = path.join(keyDir, keyFiles[0]);

        const certificate = fs.readFileSync(certPath, 'utf8');
        const privateKey = fs.readFileSync(keyPath, 'utf8');

        const x509Identity = {
            credentials: {
                certificate,
                privateKey
            },
            mspId: 'ECTAMSP',
            type: 'X.509'
        };

        await wallet.put('admin-ECTAMSP', x509Identity);
        console.log('✅ Admin identity imported successfully');
        
    } catch (error) {
        throw new Error(`Failed to import admin identity: ${error.message}`);
    }
}

async function main() {
    try {
        console.log('🚀 Starting Shipment Null Array Migration');
        console.log('⏰ Timestamp:', new Date().toISOString());
        console.log('');

        // Build connection profile
        const ccp = buildConnectionProfile();
        console.log('✅ Connection profile built');

        // Load wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log('✅ Wallet loaded');

        // Import admin identity if needed
        await importAdminIdentity(wallet);

        // Connect to gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin-ECTAMSP',
            discovery: { enabled: true, asLocalhost: true }
        });
        console.log('✅ Connected to Fabric gateway');

        // Get contract
        const network = await gateway.getNetwork('coffeechannel');
        const contract = network.getContract('coffee');
        console.log('✅ Contract acquired: coffee');
        console.log('');

        console.log('📝 Executing migration transaction...');
        console.log('   Function: MigrateShipmentNullArrays');
        console.log('   This may take several minutes for 850+ shipments...');
        console.log('');

        // Execute migration
        const startTime = Date.now();
        const result = await contract.submitTransaction('MigrateShipmentNullArrays');
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        const summary = result.toString();
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('⏱️  Duration:', duration, 'seconds');
        console.log('📊 Result:', summary);
        console.log('');

        await gateway.disconnect();
        console.log('✅ Disconnected from gateway');
        console.log('');
        console.log('🎉 Migration complete! You can now refresh the browser.');
        
    } catch (error) {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        console.error('');
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

main();

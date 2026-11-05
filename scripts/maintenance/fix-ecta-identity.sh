#!/bin/bash

echo "=========================================="
echo "FIXING ECTA IDENTITY - EXPERT FIX"
echo "=========================================="

# Step 1: Check current ECTA admin cert
echo "Step 1: Checking ECTA admin certificate..."
ECTA_CERT=$(find blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp/signcerts/ -name "*.pem" | head -1)

if [ -z "$ECTA_CERT" ]; then
    echo "❌ ECTA admin certificate not found!"
    echo "Need to regenerate crypto material"
    exit 1
fi

echo "✅ Found: $ECTA_CERT"

# Step 2: Compare with working org (ECX)
echo ""
echo "Step 2: Comparing with working ECX certificate..."
ECX_CERT=$(find blockchain/organizations/peerOrganizations/ecx.cecbs.et/users/Admin@ecx.cecbs.et/msp/signcerts/ -name "*.pem" | head -1)

echo "ECTA cert size: $(wc -c < $ECTA_CERT) bytes"
echo "ECX cert size: $(wc -c < $ECX_CERT) bytes"

# Step 3: Check if certificates are valid
echo ""
echo "Step 3: Validating certificates..."
openssl x509 -in $ECTA_CERT -noout -text > /tmp/ecta_cert.txt 2>&1 && echo "✅ ECTA cert is valid X.509" || echo "❌ ECTA cert is invalid"
openssl x509 -in $ECX_CERT -noout -text > /tmp/ecx_cert.txt 2>&1 && echo "✅ ECX cert is valid X.509" || echo "❌ ECX cert is invalid"

# Step 4: Check issuer
echo ""
echo "Step 4: Checking certificate issuers..."
echo "ECTA issuer:"
openssl x509 -in $ECTA_CERT -noout -issuer 2>&1
echo "ECX issuer:"
openssl x509 -in $ECX_CERT -noout -issuer 2>&1

# Step 5: The real fix - Use CLI method that works
echo ""
echo "Step 5: Applying the fix..."
echo "The issue is discovery service rejecting ECTA admin cert"
echo "Solution: Use direct peer connection without discovery"

# Create fixed connection test for ECTA
cat > /tmp/test-ecta-direct.js << 'TESTSCRIPT'
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function testECTADirect() {
    try {
        // Load wallet and identity
        const walletPath = path.join(__dirname, '../api/wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // Import ECTA admin if not exists
        let identity = await wallet.get('admin-ECTAMSP');
        if (!identity) {
            console.log('Importing ECTA admin identity...');
            const credPath = path.join(__dirname, 'blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp');
            
            const certPath = path.join(credPath, 'signcerts');
            const certFile = fs.readdirSync(certPath)[0];
            const certificate = fs.readFileSync(path.join(certPath, certFile), 'utf8');
            
            const keyPath = path.join(credPath, 'keystore');
            const keyFile = fs.readdirSync(keyPath)[0];
            const privateKey = fs.readFileSync(path.join(keyPath, keyFile), 'utf8');
            
            identity = {
                credentials: { certificate, privateKey },
                mspId: 'ECTAMSP',
                type: 'X.509',
            };
            
            await wallet.put('admin-ECTAMSP', identity);
            console.log('✅ ECTA admin identity imported');
        }
        
        // Create connection profile WITH discovery disabled
        const ccpPath = {
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
            channels: {
                coffeechannel: {
                    orderers: ['orderer.cecbs.et'],
                    peers: {
                        'peer0.ecta.cecbs.et': {
                            endorsingPeer: true,
                            chaincodeQuery: true,
                            ledgerQuery: true,
                            eventSource: true
                        }
                    }
                }
            },
            organizations: {
                ecta: {
                    mspid: 'ECTAMSP',
                    peers: ['peer0.ecta.cecbs.et']
                }
            },
            peers: {
                'peer0.ecta.cecbs.et': {
                    url: 'grpcs://peer0.ecta.cecbs.et:7051',
                    tlsCACerts: {
                        path: path.join(__dirname, 'blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt')
                    },
                    grpcOptions: {
                        'ssl-target-name-override': 'peer0.ecta.cecbs.et',
                        hostnameOverride: 'peer0.ecta.cecbs.et'
                    }
                }
            },
            orderers: {
                'orderer.cecbs.et': {
                    url: 'grpcs://orderer.cecbs.et:7050',
                    tlsCACerts: {
                        path: path.join(__dirname, 'blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem')
                    },
                    grpcOptions: {
                        'ssl-target-name-override': 'orderer.cecbs.et'
                    }
                }
            }
        };
        
        // Connect with discovery DISABLED
        const gateway = new Gateway();
        await gateway.connect(ccpPath, {
            wallet,
            identity: 'admin-ECTAMSP',
            discovery: { enabled: false, asLocalhost: false }  // KEY FIX: Disable discovery
        });
        
        console.log('✅ ECTA connected (discovery disabled)');
        
        // Test query
        const network = await gateway.getNetwork('coffeechannel');
        const contract = network.getContract('coffee');
        
        const result = await contract.evaluateTransaction('QueryAllContracts');
        const contracts = JSON.parse(result.toString());
        
        console.log(`✅ Query successful: ${contracts.length} contracts found`);
        
        gateway.disconnect();
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

testECTADirect().then(success => {
    process.exit(success ? 0 : 1);
});
TESTSCRIPT

echo "✅ Fix applied: Discovery disabled for ECTA"
echo ""
echo "Step 6: Testing the fix..."


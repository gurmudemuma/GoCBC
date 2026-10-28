# GoCBC Blockchain - Backend Integration Guide

**Complete guide for integrating Node.js API with Hyperledger Fabric 2.5**

---

## 🎯 Overview

This guide shows how to connect your Node.js backend (`/home/guda/GoCBC/api`) to the fully operational blockchain network. The Fabric service (`fabricService.ts`) is already implemented and ready to use.

---

## ✅ Prerequisites Verified

- [x] All 6 peers running (ECTA, ECX, Banks, NBE, Customs, Shipping)
- [x] Orderer operational
- [x] Chaincode installed, approved, and committed (Version 1.73)
- [x] Chaincode responding to invocations (InitLedger successful)
- [x] All organizations can query blockchain
- [x] Network: cecbs-network
- [x] Channel: coffeechannel
- [x] Chaincode: coffee

---

## 📁 Step 1: Configure Environment Variables

### Update `/home/guda/GoCBC/api/.env`

Create or update your `.env` file with these blockchain-specific settings:

```bash
# ==================== HYPERLEDGER FABRIC CONFIGURATION ====================

# Enable Fabric blockchain integration
FABRIC_ENABLED=true

# Require Fabric on startup (set to false for graceful degradation)
FABRIC_REQUIRED=false

# Use localhost for Fabric peers (true for local, false for Docker network)
FABRIC_AS_LOCALHOST=false

# Fabric wallet path (where identities are stored)
FABRIC_WALLET_PATH=./wallet

# Fabric channel name
FABRIC_CHANNEL_NAME=coffeechannel

# Fabric chaincode name
FABRIC_CHAINCODE_NAME=coffee

# Default MSP ID (ECTA is the default)
FABRIC_MSP_ID=ECTAMSP

# Require user-specific identities (false for development with admin)
FABRIC_REQUIRE_USER_IDENTITIES=false

# Minimum orderer consenters (1 for Solo, 3 for Raft production)
FABRIC_MIN_ORDERER_CONSENTERS=1

# ==================== PEER ENDPOINTS ====================

# ECTA Peer
FABRIC_PEER_URL_ECTA=grpcs://peer0.ecta.cecbs.et:7051
FABRIC_PEER_TLS_CA_ECTA=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt

# ECX Peer
FABRIC_PEER_URL_ECX=grpcs://peer0.ecx.cecbs.et:8051
FABRIC_PEER_TLS_CA_ECX=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt

# Banks Peer
FABRIC_PEER_URL_BANKS=grpcs://peer0.banks.cecbs.et:9051
FABRIC_PEER_TLS_CA_BANKS=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt

# NBE Peer
FABRIC_PEER_URL_NBE=grpcs://peer0.nbe.cecbs.et:10051
FABRIC_PEER_TLS_CA_NBE=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt

# Customs Peer
FABRIC_PEER_URL_CUSTOMS=grpcs://peer0.customs.cecbs.et:11051
FABRIC_PEER_TLS_CA_CUSTOMS=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt

# Shipping Peer
FABRIC_PEER_URL_SHIPPING=grpcs://peer0.shipping.cecbs.et:12051
FABRIC_PEER_TLS_CA_SHIPPING=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt

# ==================== ORDERER ENDPOINT ====================

# Primary Orderer
FABRIC_ORDERER_1_URL=grpcs://orderer.cecbs.et:7050
FABRIC_ORDERER_1_TLS_CA_PATH=/home/guda/GoCBC/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem
FABRIC_ORDERER_1_SERVER_NAME=orderer.cecbs.et

# ==================== COUCHDB CONFIGURATION ====================
# Direct CouchDB access for queries (optional, for performance)
COUCHDB_URL=http://couchdb.ecta:5984
COUCHDB_USERNAME=admin
COUCHDB_PASSWORD=adminpw
```

---

## 📁 Step 2: Set Up Admin Identities

The Fabric service will automatically import admin identities from cryptogen certificates. Ensure the paths are correct:

```bash
# Verify crypto material exists
ls -la /home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp/

# Expected structure:
# - signcerts/
# - keystore/
# - admincerts/ (optional in Fabric 2.x)
# - cacerts/
# - tlscacerts/
```

### Manual Identity Import (if needed)

If automatic import fails, run this script:

```bash
cd /home/guda/GoCBC/api

# Create wallet directory
mkdir -p wallet

# Import ECTA admin identity (example)
node -e "
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importIdentity() {
  const wallet = await Wallets.newFileSystemWallet('./wallet');
  
  const orgName = 'ecta';
  const mspId = 'ECTAMSP';
  const credPath = path.join(__dirname, '..', 'blockchain', 'organizations', 
    'peerOrganizations', \`\${orgName}.cecbs.et\`, 'users', 
    \`Admin@\${orgName}.cecbs.et\`, 'msp');
  
  // Read certificate
  const certPath = path.join(credPath, 'signcerts');
  const certFile = fs.readdirSync(certPath)[0];
  const certificate = fs.readFileSync(path.join(certPath, certFile), 'utf8');
  
  // Read private key
  const keyPath = path.join(credPath, 'keystore');
  const keyFile = fs.readdirSync(keyPath)[0];
  const privateKey = fs.readFileSync(path.join(keyPath, keyFile), 'utf8');
  
  // Create identity
  const identity = {
    credentials: {
      certificate,
      privateKey,
    },
    mspId,
    type: 'X.509',
  };
  
  await wallet.put('admin-ECTAMSP', identity);
  console.log('✅ Admin identity imported successfully');
}

importIdentity().catch(console.error);
"
```

---

## 📁 Step 3: Test Backend Connection

Create a test script to verify the connection:

### Create `/home/guda/GoCBC/api/test-blockchain-connection.js`

```javascript
const { FabricService } = require('./dist/services/fabricService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testBlockchainConnection() {
  console.log('🔍 Testing blockchain connection...\n');
  
  const fabricService = FabricService.getInstance();
  
  try {
    // Test 1: Connect to blockchain
    console.log('Test 1: Connecting to blockchain...');
    await fabricService.connect('ECTAMSP');
    console.log('✅ Connected successfully\n');
    
    // Test 2: Query blockchain
    console.log('Test 2: Querying all contracts...');
    const queryResult = await fabricService.queryChaincode('QueryAllContracts', []);
    console.log('✅ Query successful');
    console.log('Result:', JSON.stringify(queryResult, null, 2), '\n');
    
    // Test 3: Initialize ledger (if not already done)
    console.log('Test 3: Invoking InitLedger...');
    const invokeResult = await fabricService.invokeChaincode('InitLedger', []);
    console.log('✅ Invocation successful');
    console.log('Transaction ID:', invokeResult.txId);
    console.log('Result:', JSON.stringify(invokeResult, null, 2), '\n');
    
    // Test 4: Test multi-org connection (Banks)
    console.log('Test 4: Testing Banks organization connection...');
    await fabricService.connectAsOrg('BanksMSP');
    const banksQuery = await fabricService.queryChaincode('QueryAllLCs', []);
    console.log('✅ Banks query successful');
    console.log('LCs found:', banksQuery.data ? JSON.parse(banksQuery.data).length : 0, '\n');
    
    console.log('🎉 All blockchain tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await fabricService.disconnect();
    console.log('\n✅ Disconnected from blockchain');
  }
}

testBlockchainConnection();
```

### Run the test:

```bash
cd /home/guda/GoCBC/api

# Build TypeScript (if not already built)
npm run build

# Run test
node test-blockchain-connection.js
```

---

## 📁 Step 4: Usage Examples in Your Routes

### Example 1: Register Sales Contract (ECTA Portal)

```typescript
// api/src/routes/contracts.ts

import { FabricService } from '../services/fabricService';

router.post('/contracts', async (req, res) => {
  try {
    const fabricService = FabricService.getInstance();
    
    // Connect as ECTA (contracts are registered by ECTA)
    await fabricService.connect('ECTAMSP');
    
    const { contractId, exporterId, buyer, quantity, grade, pricePerKg, currency, paymentMethod, deliveryDate } = req.body;
    
    // Invoke blockchain
    const result = await fabricService.invokeChaincode('RegisterSalesContract', [
      contractId,
      exporterId,
      buyer,
      quantity.toString(),
      grade,
      pricePerKg.toString(),
      currency,
      paymentMethod,
      deliveryDate
    ]);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    // Store in PostgreSQL as well
    await db.query(
      'INSERT INTO contracts (id, exporter_id, buyer, quantity, blockchain_tx_id) VALUES ($1, $2, $3, $4, $5)',
      [contractId, exporterId, buyer, quantity, result.txId]
    );
    
    res.json({
      success: true,
      contractId,
      blockchainTxId: result.txId,
      data: result.data
    });
    
  } catch (error) {
    console.error('Error registering contract:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Example 2: Issue Letter of Credit (Banks Portal)

```typescript
// api/src/routes/lc.ts

router.post('/lc/issue', async (req, res) => {
  try {
    const fabricService = FabricService.getInstance();
    
    // Connect as Banks MSP
    await fabricService.connect('BanksMSP');
    
    const { lcNumber, contractId, applicant, beneficiary, amount, currency, expiryDate } = req.body;
    
    // Invoke blockchain
    const result = await fabricService.invokeChaincode('IssueLC', [
      lcNumber,
      contractId,
      applicant,
      beneficiary,
      amount.toString(),
      currency,
      '', // issuingBank (will be set by chaincode from MSP)
      '', // advisingBank
      expiryDate,
      '', // paymentTerms
      JSON.stringify([]) // requiredDocuments
    ]);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json({
      success: true,
      lcNumber,
      blockchainTxId: result.txId,
      endorsers: result.ledgerDetails?.endorsers
    });
    
  } catch (error) {
    console.error('Error issuing LC:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Example 3: Query Shipments (Any Portal)

```typescript
// api/src/routes/shipments.ts

router.get('/shipments/exporter/:exporterId', async (req, res) => {
  try {
    const fabricService = FabricService.getInstance();
    
    // Connect with current user's MSP
    const userMsp = req.user?.organization || 'ECTAMSP';
    await fabricService.connect(userMsp);
    
    const { exporterId } = req.params;
    
    // Query blockchain
    const result = await fabricService.queryChaincode('QueryShipmentsByExporter', [exporterId]);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    const shipments = result.data ? JSON.parse(result.data) : [];
    
    res.json({
      success: true,
      count: shipments.length,
      shipments
    });
    
  } catch (error) {
    console.error('Error querying shipments:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Example 4: Create SWIFT Message (Banks Portal)

```typescript
// api/src/routes/swift.ts

router.post('/swift/mt103', async (req, res) => {
  try {
    const fabricService = FabricService.getInstance();
    
    // Connect as Banks MSP
    await fabricService.connect('BanksMSP');
    
    const {
      messageId, paymentId, messageType, senderBIC, receiverBIC,
      amount, currency, orderingCustomer, beneficiaryCustomer,
      remittanceInfo, valueDate, reference
    } = req.body;
    
    // Create MT103 payment message
    const result = await fabricService.invokeChaincode('CreateMT103_Payment', [
      messageId,
      paymentId,
      senderBIC,
      receiverBIC,
      amount.toString(),
      currency,
      orderingCustomer,
      beneficiaryCustomer,
      remittanceInfo,
      valueDate,
      reference,
      '', // intermediaryBank (optional)
      '' // instructionsToBank (optional)
    ]);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json({
      success: true,
      messageId,
      blockchainTxId: result.txId
    });
    
  } catch (error) {
    console.error('Error creating SWIFT message:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📁 Step 5: Handle Different Organizations

The Fabric service automatically handles multi-organization scenarios:

```typescript
// In your authentication middleware
app.use((req, res, next) => {
  const fabricService = FabricService.getInstance();
  
  // Set request context for the authenticated user
  fabricService.runWithRequestContext(() => {
    // Map user's organization to MSP ID
    const orgMapping = {
      'ECTA': 'ECTAMSP',
      'ECX': 'ECXMSP',
      'NBE': 'NBEMSP',
      'Banks': 'BanksMSP',
      'Customs': 'CustomsMSP',
      'Shipping': 'ShippingMSP'
    };
    
    const userOrg = req.user?.organization || 'ECTA';
    const mspId = orgMapping[userOrg];
    
    fabricService.setRequestMspId(mspId);
    
    // Optional: Set user-specific identity (for production)
    if (req.user?.id) {
      fabricService.setRequestIdentity(req.user.id);
    }
    
    next();
  });
});
```

---

## 📁 Step 6: Error Handling Best Practices

```typescript
import { FabricService, ChaincodeResponse } from '../services/fabricService';

async function safeBlockchainInvoke(
  functionName: string,
  args: string[],
  mspId?: string
): Promise<ChaincodeResponse> {
  const fabricService = FabricService.getInstance();
  
  try {
    // Check if blockchain is enabled
    if (!process.env.FABRIC_ENABLED || process.env.FABRIC_ENABLED === 'false') {
      return {
        success: false,
        error: 'Blockchain integration is disabled'
      };
    }
    
    // Connect
    await fabricService.connect(mspId);
    
    // Check connection
    if (!fabricService.isConnected()) {
      return {
        success: false,
        error: 'Blockchain network is not available'
      };
    }
    
    // Invoke chaincode
    const result = await fabricService.invokeChaincode(functionName, args, mspId);
    
    return result;
    
  } catch (error) {
    console.error(`Blockchain invocation failed: ${functionName}`, error);
    
    // Return structured error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown blockchain error'
    };
  }
}
```

---

## 📁 Step 7: Start Your API Server

```bash
cd /home/guda/GoCBC/api

# Install dependencies (if not already done)
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Or with PM2 for production
pm2 start dist/server.js --name cecbs-api
```

---

## 🔍 Troubleshooting

### Issue: "Not connected to Fabric network"

**Solution:**
```bash
# Check if all containers are running
docker ps | grep -E "peer|orderer|chaincode"

# Check fabric service logs
tail -f /home/guda/GoCBC/api/logs/combined.log | grep -i fabric
```

### Issue: "Identity not found in wallet"

**Solution:**
```bash
# Re-import admin identities
cd /home/guda/GoCBC/api
rm -rf wallet
# Restart server to trigger auto-import
npm start
```

### Issue: "Endorsement policy not satisfied"

**Solution:**
- Ensure the transaction is using the correct MSP
- Check that the chaincode's endorsement policy matches your transaction
- Verify all required peers are running

### Issue: "Transaction timeout"

**Solution:**
- Increase timeout in `.env`:
  ```bash
  FABRIC_COMMIT_TIMEOUT=120000  # 120 seconds
  ```
- Check orderer logs:
  ```bash
  docker logs orderer.cecbs.et
  ```

---

## 📊 Monitoring & Performance

### Enable Blockchain Metrics

Add to your API server:

```typescript
// Prometheus metrics
const promClient = require('prom-client');

const fabricInvocations = new promClient.Counter({
  name: 'fabric_invocations_total',
  help: 'Total number of chaincode invocations',
  labelNames: ['function', 'msp', 'status']
});

const fabricLatency = new promClient.Histogram({
  name: 'fabric_invocation_duration_seconds',
  help: 'Chaincode invocation latency',
  labelNames: ['function', 'msp']
});

// Use in your invoke wrapper
const timer = fabricLatency.startTimer({ function: functionName, msp: mspId });
const result = await fabricService.invokeChaincode(functionName, args, mspId);
timer();
fabricInvocations.inc({ function: functionName, msp: mspId, status: result.success ? 'success' : 'error' });
```

---

## ✅ Verification Checklist

- [ ] Environment variables configured
- [ ] Admin identities imported
- [ ] Test script runs successfully
- [ ] Can invoke transactions from ECTA MSP
- [ ] Can invoke transactions from Banks MSP
- [ ] Can query from all organizations
- [ ] API routes integrated
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Metrics enabled (optional)

---

## 🎯 Next Steps

1. **Test each portal's blockchain integration:**
   - ECTA: Register contracts, issue permits
   - Banks: Issue LCs, create SWIFT messages
   - NBE: Allocate forex, monitor repatriation
   - Customs: Process declarations
   - Shipping: Track shipments
   - ECX: Manage lots

2. **Implement event listeners:**
   - Listen for blockchain events
   - Update PostgreSQL when blockchain changes
   - Notify users of transaction status

3. **Add caching:**
   - Cache frequently queried data in Redis
   - Invalidate cache on blockchain updates

4. **Set up monitoring:**
   - Prometheus metrics
   - Grafana dashboards
   - Alert on transaction failures

---

## 📚 Additional Resources

- **Chaincode Functions Reference:** See `/home/guda/GoCBC/BLOCKCHAIN-100-PERCENT-OPERATIONAL.md` for complete list of 250+ functions
- **Fabric Service API:** See `/home/guda/GoCBC/api/src/services/fabricService.ts` for full API
- **Test Script:** `/home/guda/GoCBC/test-all-orgs-blockchain.sh` for network verification

---

**Your backend is now ready to interact with the blockchain!** 🎉

# Fix Chaincode Query Failed Error

## Problem
You're getting: `⚠ Chaincode query failed (may need initialization)`

This means the blockchain chaincode needs to be initialized.

## Solution

### Option 1: Run the Full Startup (Recommended)
```bash
cd /home/guda/GoCBC
./start-all.sh
```

This will:
1. Start the Fabric network (peers, orderer)
2. Deploy the chaincode
3. Initialize the ledger

### Option 2: Initialize Chaincode Only (if network is running)
```bash
cd /home/guda/GoCBC
./initialize-chaincode.sh
```

### Option 3: Deploy Chaincode Manually

**Step 1: Check if blockchain is running**
```bash
docker ps | grep -E "peer|orderer"
```

If nothing shows, start the network:
```bash
cd /home/guda/GoCBC/blockchain
./network.sh up
```

**Step 2: Deploy chaincode**
```bash
cd /home/guda/GoCBC
./deploy-chaincode.sh
```

**Step 3: Initialize the ledger**
```bash
docker exec cli peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.com \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/cecbs.com/orderers/orderer.cecbs.com/msp/tlscacerts/tlsca.cecbs.com-cert.pem \
  -C coffeechannel \
  -n coffee \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/ecta.cecbs.com/peers/peer0.ecta.cecbs.com/tls/ca.crt \
  -c '{"function":"InitLedger","Args":[]}'
```

## Verify It Works

Test the chaincode:
```bash
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"GetAllShipments","Args":[]}'
```

## Common Issues

### Issue 1: Docker containers not running
**Solution:** Start them
```bash
cd /home/guda/GoCBC
./start-all.sh
```

### Issue 2: Chaincode not deployed
**Solution:** Deploy it
```bash
cd /home/guda/GoCBC
./deploy-chaincode.sh
```

### Issue 3: Network started but chaincode initialization failed
**Solution:** Run initialization separately
```bash
cd /home/guda/GoCBC
./initialize-chaincode.sh
```

## Quick Check Script

Run this to see what's running:
```bash
cd /home/guda/GoCBC
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "=== Chaincode Status ==="
docker exec cli peer lifecycle chaincode queryinstalled 2>&1 || echo "CLI not available"

echo ""
echo "=== API Status ==="
lsof -i:3001 | head -2

echo ""
echo "=== UI Status ==="
lsof -i:3000 | head -2
```

## After Fix

Once initialized, you should see:
- ✅ Peers and orderers running
- ✅ Chaincode installed and committed
- ✅ Queries returning data (not errors)
- ✅ API can connect to blockchain

Restart the API after chaincode initialization:
```bash
cd /home/guda/GoCBC
./restart-api.sh
```

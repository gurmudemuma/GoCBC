# Start Blockchain Network - Fix "Not Connected" Error

## Problem
API is showing: `Error: Not connected to Fabric network`

This means the Hyperledger Fabric blockchain network is not running.

## Solution
Start the blockchain network using Docker.

## Quick Start (Recommended)

### Step 1: Start Docker Desktop
```
1. Open Docker Desktop
2. Wait for it to fully start
3. Ensure Docker is running (green icon in system tray)
```

### Step 2: Start Blockchain Network
```bash
cd c:\CEX
docker-compose -f docker-compose-fabric.yml up -d
```

This will start:
- Orderer node
- 6 Peer nodes (ECTA, ECX, NBE, Banks, Customs, Shipping)
- Certificate Authorities
- CouchDB databases

### Step 3: Wait for Network to Start
```bash
# Check if containers are running
docker ps

# Should see containers like:
# - orderer.cecbs.et
# - peer0.ecta.cecbs.et
# - peer0.ecx.cecbs.et
# - peer0.nbe.cecbs.et
# - peer0.banks.cecbs.et
# - peer0.customs.cecbs.et
# - peer0.shipping.cecbs.et
```

### Step 4: Create Channel (First Time Only)
```bash
cd c:\CEX\scripts
./create-channel-docker.sh
```

### Step 5: Deploy Chaincode (First Time Only)
```bash
cd c:\CEX\scripts
./deploy-chaincode-docker.sh
```

### Step 6: Restart API Server
```bash
cd c:\CEX\api
# Stop current server (Ctrl+C)
npm run dev
```

The API will now connect to the blockchain network automatically.

## Verify Connection

### Check API Logs
After restarting API, you should see:
```
info: Connecting to Hyperledger Fabric network...
info: ✅ Successfully connected to Hyperledger Fabric network
```

### Test API Endpoint
```bash
# In browser or Postman
GET http://localhost:3001/api/v1/blockchain/info
```

Should return network information.

## Troubleshooting

### Issue: Docker containers not starting

**Check Docker:**
```bash
docker --version
docker-compose --version
```

**Check logs:**
```bash
docker-compose -f docker-compose-fabric.yml logs
```

### Issue: Port conflicts

**Check if ports are in use:**
```bash
# Windows
netstat -ano | findstr :7050
netstat -ano | findstr :7051

# If ports are in use, stop conflicting services
```

### Issue: Chaincode not deployed

**Check chaincode:**
```bash
docker ps | grep dev-peer
```

Should see chaincode containers running.

### Issue: API still can't connect

**Check wallet:**
```bash
dir c:\CEX\api\wallet
```

Should contain admin identity.

**Reimport admin identity:**
```bash
cd c:\CEX\api
# Delete wallet
rmdir /s wallet
# Restart API (will auto-import)
npm run dev
```

## Full Network Restart

If things are not working, do a full restart:

### Step 1: Stop Everything
```bash
cd c:\CEX
docker-compose -f docker-compose-fabric.yml down -v
```

### Step 2: Clean Up
```bash
# Remove chaincode containers
docker rm -f $(docker ps -aq --filter "name=dev-peer")

# Remove chaincode images
docker rmi -f $(docker images -q --filter "reference=dev-peer*")

# Clean volumes
docker volume prune -f
```

### Step 3: Start Fresh
```bash
# Start network
docker-compose -f docker-compose-fabric.yml up -d

# Wait 30 seconds
timeout /t 30

# Create channel
cd scripts
./create-channel-docker.sh

# Deploy chaincode
./deploy-chaincode-docker.sh

# Restart API
cd ../api
npm run dev
```

## Alternative: Use Existing Scripts

### Option 1: Use start.sh
```bash
cd c:\CEX\scripts
./start.sh
```

### Option 2: Use PowerShell script
```powershell
cd c:\CEX\scripts
.\deploy-v1.2-docker.ps1
```

## Check Network Status

### View all containers:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### View logs:
```bash
# Orderer logs
docker logs orderer.cecbs.et

# Peer logs
docker logs peer0.ecta.cecbs.et

# Chaincode logs
docker logs $(docker ps -q --filter "name=dev-peer0.ecta")
```

### Check network connectivity:
```bash
# From inside API container
docker exec -it api-container ping peer0.ecta.cecbs.et
```

## Expected Result

After starting the network:

1. ✅ Docker containers running
2. ✅ Channel created
3. ✅ Chaincode deployed
4. ✅ API connects successfully
5. ✅ Portals load data from blockchain
6. ✅ No "Not connected" errors

## Network Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Orderer                            │
│              orderer.cecbs.et:7050                  │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ ECTA Peer    │ │ ECX Peer   │ │ NBE Peer   │
│ :7051        │ │ :8051      │ │ :10051     │
└──────────────┘ └────────────┘ └────────────┘
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ Banks Peer   │ │Customs Peer│ │Shipping Pr │
│ :9051        │ │ :11051     │ │ :12051     │
└──────────────┘ └────────────┘ └────────────┘
                        │
                ┌───────▼────────┐
                │   API Server   │
                │   :3001        │
                └────────────────┘
```

## Important Notes

1. **Docker must be running** before starting the network
2. **First time setup** requires creating channel and deploying chaincode
3. **API auto-connects** on startup if network is running
4. **Wallet is auto-created** if it doesn't exist
5. **Admin identity** is imported automatically

## Production Deployment

For production, use:
```bash
cd c:\CEX\scripts
./deploy-chaincode-production.sh
```

This includes:
- TLS enabled
- Multi-peer endorsement
- Production-grade configuration
- Proper security settings

---

**Status**: Ready to Start  
**Action Required**: Start Docker and run docker-compose command

# GoCBC Startup Guide

## Quick Start (Recommended)

### Step 1: Run the Main Startup Script
This will start the blockchain network, initialize the database, and clear ports:

```bash
cd /home/guda/GoCBC
./start-all.sh
```

**What it does:**
- ✅ Checks system prerequisites
- ✅ Kills any processes on ports 3000 and 3001
- ✅ Starts Hyperledger Fabric blockchain network
- ✅ Creates and joins channel
- ✅ Deploys chaincode
- ✅ Initializes PostgreSQL database
- ✅ **STOPS here and waits for manual API/UI startup**

### Step 2: Start API Server (Terminal 1)

```bash
cd /home/guda/GoCBC/api
npm run dev
```

**Expected Output:**
```
✅ Successfully connected to Hyperledger Fabric network as ECTAMSP
✅ WebSocket server initialized
🚀 CECBS API Gateway started on port 3001
```

### Step 3: Start UI Server (Terminal 2)

```bash
cd /home/guda/GoCBC/ui
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
✓ Ready in 2s
```

### Step 4: Access the Application

Open your browser and navigate to:
- **UI:** http://localhost:3000
- **API:** http://localhost:3001
- **API Health:** http://localhost:3001/health
- **API Docs:** http://localhost:3001/api-docs

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

## Quick Restart (If Servers Crash)

If you need to restart just the API and UI servers (blockchain is still running):

```bash
./restart-servers.sh
```

Then manually start API and UI again in separate terminals.

---

## Troubleshooting

### Port Already in Use Error

**Error Message:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3001
```

**Solution:**
```bash
# Option 1: Use the restart script
./restart-servers.sh

# Option 2: Manual cleanup
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9
pkill -9 -f "ts-node.*server.ts"
```

### API Cannot Connect to Blockchain

**Symptoms:**
- API starts but shows connection errors
- "Failed to connect to Hyperledger Fabric network"

**Solution:**
```bash
# Check if blockchain containers are running
docker ps | grep peer0

# Restart blockchain if needed
cd /home/guda/GoCBC
docker-compose -f docker-compose-fabric.yml restart
```

### UI Shows "Failed to proxy" Error

**Symptoms:**
- UI loads but shows connection errors
- "Failed to proxy http://127.0.0.1:3001"

**Solution:**
- Ensure API is running on port 3001
- Check API logs for errors
- Restart API server

---

## Advanced Options

### Start with Specific Flags

```bash
# Skip prerequisites check (faster restart)
./start-all.sh --skip-prerequisites

# Skip blockchain startup (if already running)
./start-all.sh --skip-blockchain

# Skip npm install (dependencies already installed)
./start-all.sh --skip-build

# Verbose output for debugging
./start-all.sh --verbose
```

### Stop Everything

```bash
# Stop API and UI (Ctrl+C in their terminals)

# Stop blockchain network
cd /home/guda/GoCBC
docker-compose -f docker-compose-fabric.yml down

# Stop and remove all data (WARNING: This deletes blockchain data)
docker-compose -f docker-compose-fabric.yml down -v
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Port 3000)                   │
│                   Next.js Frontend UI                    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  API Server (Port 3001)                  │
│            Express.js + TypeScript Backend               │
└──────────┬─────────────────────────┬────────────────────┘
           │                         │
           │ PostgreSQL              │ Fabric SDK
           ▼                         ▼
┌──────────────────┐    ┌────────────────────────────────┐
│   PostgreSQL     │    │   Hyperledger Fabric Network   │
│   (Port 5432)    │    │  - 6 Peer Organizations        │
│                  │    │  - 1 Orderer                    │
│  Mirror Database │    │  - Blockchain Ledger           │
└──────────────────┘    └────────────────────────────────┘
```

---

## Monitoring Logs

### API Logs (Terminal 1)
Watch for these indicators:
- ✅ `Successfully connected to Hyperledger Fabric network`
- ✅ `API Gateway started on port 3001`
- ✅ `Blockchain sync service started`

### UI Logs (Terminal 2)
Watch for these indicators:
- ✅ `Ready in Xs`
- ✅ `Local: http://localhost:3000`
- ✅ `Compiled successfully`

### Blockchain Logs
```bash
# View all logs
docker-compose -f docker-compose-fabric.yml logs -f

# View specific peer
docker logs -f peer0.ecta.cecbs.et

# View orderer
docker logs -f orderer.cecbs.et
```

---

## Performance Tips

1. **First Startup:** Takes 2-3 minutes (includes blockchain initialization)
2. **Subsequent Restarts:** Takes 30-60 seconds (blockchain already running)
3. **API Startup:** 5-10 seconds
4. **UI Startup:** 3-5 seconds

Keep terminals open to monitor real-time logs and catch errors quickly.

---

## Support

For issues or questions, check:
1. API logs in Terminal 1
2. UI logs in Terminal 2
3. Blockchain logs: `docker-compose -f docker-compose-fabric.yml logs`
4. Database connection: `psql -U cecbs_user -d cecbs_db -h localhost`

---

## Summary of Changes

### What Changed in start-all.sh
- ✅ Enhanced port cleanup (kills ts-node, npm, node processes)
- ✅ Aggressive port freeing with sudo fuser fallback
- ✅ Skips automatic API and UI startup
- ✅ Shows manual startup instructions at the end
- ✅ Cleaner, more reliable port cleanup

### Benefits
- ✅ **No more port conflicts** - Guaranteed clean ports
- ✅ **Better control** - Start/stop API and UI independently
- ✅ **Easier debugging** - See real-time logs in separate terminals
- ✅ **Faster iterations** - Restart only what you need

---

**Last Updated:** November 2, 2026

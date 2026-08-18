# CECBS Management Scripts Guide

## Quick Reference

### 🚀 Starting Services

```bash
# Start everything (blockchain + API + UI)
bash start-all.sh

# Start only API
bash start-api.sh

# Start only UI
bash start-ui.sh
```

### 🛑 Stopping Services

```bash
# Stop everything
bash stop-all.sh

# Stop only API
bash stop-api.sh

# Stop only UI
bash stop-ui.sh

# Kill all processes and free ports (force)
bash kill-ports.sh
```

### 🔄 Restarting Services

```bash
# Restart both API and UI
bash restart-all.sh

# Restart only API
bash restart-api.sh

# Restart only UI
bash restart-ui.sh
```

### 📋 Monitoring

```bash
# Check system status
bash status.sh

# View API logs (live)
bash logs-api.sh

# View UI logs (live)
bash logs-ui.sh

# View last 50 lines of API log
tail -50 logs/api.log

# View last 50 lines of UI log
tail -50 logs/ui.log
```

---

## Detailed Script Descriptions

### `start-all.sh`
**Purpose:** Complete system startup  
**What it does:**
- Checks prerequisites (Docker, Node.js, Go)
- Starts Fabric network (all peers, orderer, PostgreSQL, Redis)
- Creates channel and joins all 6 peers
- Deploys and commits chaincode
- Starts API server (port 3001)
- Starts UI server (port 3000)
- Runs health checks

**Options:**
```bash
bash start-all.sh              # Full start with chaincode deployment
bash start-all.sh --skip-build # Skip building chaincode/TypeScript
bash start-all.sh --dev        # Development mode (terminal stays attached)
```

### `start-api.sh`
**Purpose:** Start only the API server  
**What it does:**
- Installs dependencies if needed
- Kills any existing API process
- Starts API in background
- Saves PID to `/tmp/cecbs-api.pid`
- Logs to `logs/api.log`

**When to use:**
- After making changes to API code
- When API crashed but blockchain is still running
- For faster iteration during API development

### `start-ui.sh`
**Purpose:** Start only the UI server  
**What it does:**
- Installs dependencies if needed
- Kills any existing UI process
- Starts UI in background (Next.js dev server)
- Saves PID to `/tmp/cecbs-ui.pid`
- Logs to `logs/ui.log`

**When to use:**
- After making changes to UI code
- When UI crashed but API is still running
- For faster iteration during UI development

### `stop-all.sh`
**Purpose:** Graceful shutdown of entire system  
**What it does:**
- Stops API and UI processes
- Stops all Docker containers
- Removes Docker volumes
- Cleans up log files and PID files

**When to use:**
- Before system shutdown
- Before `start-all.sh` to ensure clean state
- When you need to free all resources

### `stop-api.sh`
**Purpose:** Stop only API server  
**Keeps:** Blockchain network and UI running

### `stop-ui.sh`
**Purpose:** Stop only UI server  
**Keeps:** Blockchain network and API running

### `kill-ports.sh`
**Purpose:** Force kill all processes on CECBS ports  
**What it does:**
- Kills processes on ports 3000, 3001, 3002
- Kills all Node.js processes (next, ts-node, server.ts)
- Removes PID files
- Frees all ports

**When to use:**
- When processes are stuck and won't stop normally
- When ports are in use but status shows nothing running
- Before `restart-all.sh` for a clean restart
- When you get "Port already in use" errors

### `restart-all.sh`
**Purpose:** Clean restart of API and UI  
**What it does:**
1. Runs `kill-ports.sh` to free all ports
2. Waits 3 seconds for ports to release
3. Starts API
4. Starts UI

**When to use:**
- After making code changes to both API and UI
- When services are behaving strangely
- To ensure clean state without restarting blockchain

### `restart-api.sh`
**Purpose:** Quick API restart  
**Equivalent to:** `bash stop-api.sh && bash start-api.sh`

### `restart-ui.sh`
**Purpose:** Quick UI restart  
**Equivalent to:** `bash stop-ui.sh && bash start-ui.sh`

### `status.sh`
**Purpose:** System health check  
**Shows:**
- Which ports are in use
- PID file status
- HTTP health check results (API /health endpoint)
- Docker container status
- Quick command reference

**When to use:**
- To check if services are running
- To find which ports are being used
- To get process IDs for debugging
- Before starting services to see current state

### `logs-api.sh`
**Purpose:** Live API logs  
**Shows:** Real-time output from API server  
**Exit:** Press Ctrl+C

### `logs-ui.sh`
**Purpose:** Live UI logs  
**Shows:** Real-time output from Next.js dev server  
**Exit:** Press Ctrl+C

---

## Common Scenarios

### Scenario 1: Fresh Start
```bash
bash stop-all.sh    # Clean slate
bash start-all.sh   # Full start
```

### Scenario 2: Port Already in Use Error
```bash
bash kill-ports.sh  # Force free ports
bash start-all.sh   # Try again
```

### Scenario 3: Changed API Code
```bash
bash restart-api.sh  # Restart only API
# OR
bash stop-api.sh
# Make changes
bash start-api.sh
```

### Scenario 4: Changed UI Code
```bash
bash restart-ui.sh   # Restart only UI
# OR
bash stop-ui.sh
# Make changes
bash start-ui.sh
```

### Scenario 5: Services Not Responding
```bash
bash status.sh       # Check what's running
bash logs-api.sh     # Check API errors
bash logs-ui.sh      # Check UI errors
bash kill-ports.sh   # Force kill
bash restart-all.sh  # Clean restart
```

### Scenario 6: Database Schema Changes
```bash
bash stop-all.sh                # Stop everything
docker volume rm cecbs_pgdata   # Remove DB volume
bash start-all.sh               # Recreate DB with new schema
```

### Scenario 7: Chaincode Changes
```bash
# Edit chaincode
bash stop-all.sh                # Stop everything
bash start-all.sh               # Rebuild and redeploy
```

### Scenario 8: Just Check Status
```bash
bash status.sh                  # Overview
docker ps                       # Docker containers
bash logs-api.sh                # Live API logs
```

---

## Port Reference

| Port | Service | Protocol |
|------|---------|----------|
| 3000 | UI (Next.js) | HTTP |
| 3001 | API (Express) | HTTP/WS |
| 3002 | UI Fallback | HTTP |
| 5432 | PostgreSQL | TCP |
| 6379 | Redis | TCP |
| 7050 | Orderer | gRPC |
| 7051 | Peer ECTA | gRPC |
| 8051 | Peer ECX | gRPC |
| 9051 | Peer Banks | gRPC |
| 10051 | Peer NBE | gRPC |
| 11051 | Peer Customs | gRPC |
| 12051 | Peer Shipping | gRPC |
| 9999 | Coffee Chaincode | gRPC |

---

## File Locations

### Logs
- API: `logs/api.log`
- UI: `logs/ui.log`

### PID Files
- API: `/tmp/cecbs-api.pid`
- UI: `/tmp/cecbs-ui.pid`

### Configuration
- API: `api/.env`
- UI: `ui/.env.local`

---

## Troubleshooting

### "Port already in use"
```bash
bash kill-ports.sh
```

### "Cannot connect to database"
```bash
docker ps | grep postgres  # Check if running
bash logs-api.sh           # Check API logs
```

### "Chaincode not found"
```bash
bash stop-all.sh
bash start-all.sh  # Redeploy chaincode
```

### "API returns 500 errors"
```bash
bash logs-api.sh   # Check error details
# Fix code
bash restart-api.sh
```

### "UI shows 404 for chunks"
Normal Next.js dev mode warning - ignore it. If persistent:
```bash
bash restart-ui.sh
# OR
cd ui && rm -rf .next && cd .. && bash restart-ui.sh
```

### "Services won't stop"
```bash
bash kill-ports.sh  # Force kill
bash stop-all.sh    # Clean up Docker
```

---

## Best Practices

1. **Always check status first:** `bash status.sh`
2. **View logs when debugging:** `bash logs-api.sh` or `bash logs-ui.sh`
3. **Use kill-ports.sh when stuck:** Force clean before restart
4. **Restart only what changed:** Don't restart blockchain for API/UI changes
5. **Clean start for schema changes:** `bash stop-all.sh && bash start-all.sh`
6. **Check health after restart:** `bash status.sh` or `curl localhost:3001/health`

---

## Quick Command Cheat Sheet

```bash
# Daily development
bash start-all.sh          # Morning: start everything
bash restart-api.sh        # After API changes
bash restart-ui.sh         # After UI changes
bash status.sh             # Check health
bash logs-api.sh           # Debug API
bash stop-all.sh           # End of day

# When things go wrong
bash kill-ports.sh         # Free stuck ports
bash restart-all.sh        # Clean restart
bash status.sh             # Diagnose issues

# Monitoring
tail -f logs/api.log       # Watch API logs
tail -f logs/ui.log        # Watch UI logs
docker ps                  # Check containers
docker logs cecbs-postgres # Check DB logs
```

---

For more help, check the main README.md or contact devops@cecbs.et

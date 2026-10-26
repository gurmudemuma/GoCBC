# GoCBC System Startup Guide

Complete guide for starting and managing the Ethiopian Coffee Export Consortium Blockchain System (CECBS).

---

## Quick Start

### Start Everything (Recommended)

```bash
bash start-all.sh
```

This single command will:
1. ✅ Check all prerequisites
2. ✅ Install dependencies (API + UI)
3. ✅ Build TypeScript (API) and Next.js (UI)
4. ✅ Start Docker containers (Blockchain + PostgreSQL)
5. ✅ Run database migrations (including status alignment fixes)
6. ✅ Deploy chaincode to blockchain
7. ✅ Start API server (port 3001)
8. ✅ Start UI server (port 3000)

### Stop Everything

```bash
bash stop-all.sh
```

---

## Script Options

### start-all.sh Options

```bash
# Development mode (uses ts-node-dev for hot reload)
bash start-all.sh --dev

# Skip Docker startup (if already running)
bash start-all.sh --skip-docker

# Skip chaincode deployment
bash start-all.sh --skip-chaincode

# Skip npm install and build
bash start-all.sh --skip-build

# Clean start (removes volumes and rebuilds everything)
bash start-all.sh --clean

# Combine multiple options
bash start-all.sh --dev --skip-docker
```

---

## What Gets Started

### 1. Docker Containers (8 services)

- **Blockchain Network**
  - Orderer (port 7050)
  - ECTA Peer (port 7051)
  - ECX Peer (port 8051)
  - Banks Peer (port 9051)
  - NBE Peer (port 10051)
  - Customs Peer (port 11051)
  - Shipping Peer (port 12051)
  - Exporters Peer (port 13051)

- **Databases**
  - PostgreSQL (port 5432)
  - CouchDB instances (one per peer)

- **Supporting Services**
  - Redis (port 6379)
  - Kafka (if enabled)

### 2. Database Migrations

All migrations in `api/src/migrations/` are applied, including:

- **Migration 043**: Status alignment fixes
  - Adds `logistics_status` column to shipments
  - Adds `payment_tracking_status` column to payments
  - Creates indexes for performance

### 3. Chaincode Deployment

- Deploys `coffee` chaincode to all peers
- Version management handled automatically
- Only deploys if not already present

### 4. API Server

- **Port**: 3001
- **Health Check**: http://localhost:3001/health
- **Mode**: Production (or dev with `--dev` flag)
- **Logs**: `logs/api.log`

### 5. UI Server

- **Port**: 3000
- **URL**: http://localhost:3000
- **Mode**: Production (or dev with `--dev` flag)
- **Logs**: `logs/ui.log`

---

## Access Points

After startup, access the system at:

| Service | URL | Purpose |
|---------|-----|---------|
| **Web UI** | http://localhost:3000 | Main application interface |
| **API** | http://localhost:3001 | REST API endpoint |
| **API Health** | http://localhost:3001/health | Health check |
| **PostgreSQL** | localhost:5432 | Database (user: cecbs, db: cecbs) |

---

## Verification Steps

After running `start-all.sh`, verify everything is working:

### 1. Check Docker Containers

```bash
docker ps
```

You should see 15+ containers running (peers, orderer, databases)

### 2. Check API Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-23T..."
}
```

### 3. Check UI

Open browser: http://localhost:3000

You should see the login page.

### 4. Check Database

```bash
docker exec -it cecbs-postgres psql -U cecbs -d cecbs -c "\dt"
```

You should see all tables including `shipments`, `payments`, etc.

### 5. Verify Migration 043

```bash
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT column_name FROM information_schema.columns WHERE table_name='shipments' AND column_name LIKE '%status%';"
```

Expected output should include:
- `status`
- `logistics_status` ← NEW

---

## Troubleshooting

### Issue: Docker containers won't start

```bash
# Check Docker daemon
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Try starting again
bash start-all.sh
```

### Issue: Port already in use

```bash
# Find process using port 3001 (API)
sudo lsof -i :3001

# Kill process
kill -9 <PID>

# Or use the stop script first
bash stop-all.sh
bash start-all.sh
```

### Issue: API won't start

```bash
# Check logs
cat logs/api.log

# Common fixes:
cd api
npm install
npm run build
npm start
```

### Issue: Migration fails

```bash
# Run migration manually
docker exec -i cecbs-postgres psql -U cecbs -d cecbs < api/src/migrations/043_fix_status_enums.sql

# Check if already applied
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\d shipments" | grep logistics_status
```

### Issue: Chaincode deployment fails

```bash
# Check peer logs
docker logs peer0.ecta.cecbs.et

# Redeploy manually
bash deploy-chaincode.sh
```

---

## Manual Start (Component by Component)

If you prefer to start components individually:

### 1. Start Docker

```bash
docker-compose -f docker-compose-fabric.yml up -d
```

### 2. Wait for Services

```bash
# Wait ~30 seconds for all containers to initialize
sleep 30
```

### 3. Run Migrations

```bash
docker exec -i cecbs-postgres psql -U cecbs -d cecbs < api/src/migrations/043_fix_status_enums.sql
```

### 4. Deploy Chaincode

```bash
bash deploy-chaincode.sh
```

### 5. Start API

```bash
cd api
npm run build
npm start &
cd ..
```

### 6. Start UI

```bash
cd ui
npm run build
npm start &
cd ..
```

---

## Development Mode

For development with hot reload:

```bash
bash start-all.sh --dev
```

This will:
- Use `ts-node-dev` for API (TypeScript hot reload)
- Use `npm run dev` for UI (Next.js hot reload)
- Skip production builds

---

## Clean Restart

To completely reset and restart:

```bash
bash start-all.sh --clean
```

⚠️ **Warning**: This will:
- Remove all Docker volumes (data will be lost)
- Delete node_modules
- Delete build artifacts
- Reinstall and rebuild everything

---

## Logs

### View Real-Time Logs

```bash
# API logs
tail -f logs/api.log

# UI logs
tail -f logs/ui.log

# Docker logs (all services)
docker-compose -f docker-compose-fabric.yml logs -f

# Specific service
docker logs -f peer0.ecta.cecbs.et
```

### Log Files

- `logs/api.log` - API server output
- `logs/ui.log` - UI server output
- `logs/api.pid` - API process ID
- `logs/ui.pid` - UI process ID

---

## System Requirements

### Minimum

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 20 GB free space
- **OS**: Ubuntu 20.04+ / macOS / Windows (WSL2)

### Recommended

- **CPU**: 8 cores
- **RAM**: 16 GB
- **Disk**: 50 GB free space SSD
- **Network**: Stable internet connection

---

## Environment Variables

The script uses environment variables from:

- `api/.env` - API configuration
- `ui/.env.local` - UI configuration

### Key Variables

```bash
# API (.env)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
FABRIC_ENABLED=true
JWT_SECRET=your-secret-key

# UI (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## What Gets Deployed

### Database Schema

After migration 043:

**Shipments Table**
- `status` - Workflow status (DRAFT → REGISTERED → COMPLETED)
- `logistics_status` - Tracking status (PENDING → DELIVERED) **← NEW**

**Payments Table**
- `status` - Processing status (RECEIVED → SPLIT → RELEASED)
- `payment_tracking_status` - Document tracking **← NEW**

### API Endpoints

New endpoints available after startup:

```
PUT /api/v1/shipments/:id/logistics-status
PUT /api/v1/payments/:id/tracking-status
```

### Blockchain Chaincode

- **Name**: coffee
- **Channel**: coffeechannel
- **Functions**: RegisterShipment, UpdateStatus, RecordPayment, etc.

---

## Success Indicators

System is ready when you see:

```
✓ GoCBC System Started Successfully!

Services Running:
  • Blockchain Network: ✓ Running (8 organizations)
  • PostgreSQL Database: ✓ Running (port 5432)
  • API Server: ✓ Running (http://localhost:3001)
  • UI Server: ✓ Running (http://localhost:3000)
```

---

## Next Steps

1. **Access the system**: Open http://localhost:3000
2. **Login**: Use credentials from database
3. **Test workflows**: Create contract → shipment → payment
4. **Monitor**: Check logs and blockchain transactions

---

## Support

For issues:

1. Check logs: `logs/api.log`, `logs/ui.log`
2. Verify Docker: `docker ps`
3. Check database: `docker exec -it cecbs-postgres psql -U cecbs -d cecbs`
4. Review STATUS-ALIGNMENT-GUIDE.md for workflow details

---

**Last Updated**: October 23, 2026  
**Script Version**: 2.0  
**System Status**: ✅ Production Ready

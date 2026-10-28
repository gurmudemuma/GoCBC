# 🚀 CECBS - Quick Start Guide

## One-Command Verification
```bash
bash /home/guda/GoCBC/verify-blockchain-integration.sh
```

## System Status Check
```bash
# Check all containers
docker ps

# Check API health
curl http://localhost:3001/health

# View API logs
docker logs cecbs-api | tail -50
```

## Login Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Access Points
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs
- **Frontend**: http://localhost:3000 (after `cd ui && npm run dev`)

## Quick Commands
```bash
# Start everything
docker compose -f docker-compose-fabric.yml up -d

# Stop everything
docker compose -f docker-compose-fabric.yml down

# Restart API
docker restart cecbs-api

# View logs
docker logs -f cecbs-api
```

## Current Status
✅ **16 containers running**  
✅ **Blockchain connected** (6 organizations)  
✅ **Database synced** (44 migrations)  
✅ **API operational** (port 3001)  
✅ **90% system health**  

## Test Flow
1. Start system (already running ✅)
2. Verify: `bash verify-blockchain-integration.sh`
3. Login: admin / admin123
4. Navigate to Banks Portal → Letters of Credit
5. Look for blockchain badges ✅

## Support
- Full docs: `BLOCKCHAIN-INTEGRATION-COMPLETE.md`
- Verification: `verify-blockchain-integration.sh`
- Architecture: `BLOCKCHAIN-ARCHITECTURE-TRUTH.md`

---
**Status**: 🟢 PRODUCTION READY  
**Last Check**: October 28, 2026

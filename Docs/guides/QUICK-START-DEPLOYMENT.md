# GoCBC HIGH PRIORITY FEATURES - Quick Start Deployment Guide

## Overview
This guide will help you deploy the 4 HIGH priority features that bring GoCBC from **85% to 90% completion**.

**Deployment Time:** ~15 minutes  
**Downtime:** None (rolling deployment)

---

## Features Being Deployed

### 1. **Export Proceeds Repatriation** 🏦
- Track foreign currency repatriation (30-day compliance)
- NBE compliance monitoring
- Penalty and waiver management
- **10 chaincode functions, 10 API endpoints**

### 2. **Pre-shipment Inspection** 🔍
- ECX/ECTA quality inspection workflow
- Certificate issuance
- Approval/rejection tracking
- **11 chaincode functions, 9 API endpoints**

### 3. **Border Crossing Documentation** 🚛
- Customs clearance tracking
- GPS location monitoring
- Delay reporting and compliance
- **12 chaincode functions, 10 API endpoints**

### 4. **LC Discrepancy Handling** ⚠️
- Document discrepancy reporting
- Resolution workflow
- Waiver management
- **7 chaincode functions, 6 API endpoints**

---

## Prerequisites

✅ Docker and Docker Compose installed  
✅ GoCBC system files in `/home/guda/GoCBC`  
✅ PostgreSQL and Hyperledger Fabric configured  
✅ Go 1.19+ installed (for chaincode compilation)

---

## Deployment Methods

### Method 1: Automated Deployment (Recommended) ⚡

**One command does everything:**

```bash
cd /home/guda/GoCBC
./deploy-high-priority-features.sh
```

This script will:
- ✅ Run pre-deployment checks
- ✅ Start the system (if needed)
- ✅ Apply database migrations
- ✅ Build and deploy chaincode v1.21
- ✅ Restart API server
- ✅ Verify deployment

**Interactive:** The script pauses at each step for your confirmation.

---

### Method 2: Manual Step-by-Step 🔧

If you prefer manual control:

#### Step 1: Start the System
```bash
cd /home/guda/GoCBC
./start-all.sh --no-interactive
```

Wait 30 seconds for the system to stabilize.

#### Step 2: Run Database Migrations
```bash
./run-new-migrations.sh
```

This creates 4 new tables:
- `repatriations` (15 columns)
- `inspections` (17 columns)
- `border_crossings` (16 columns)
- Updates `letter_of_credits` (adds 5 discrepancy columns)

#### Step 3: Build Chaincode Image
```bash
docker build -t coffee-chaincode:1.21 \
  -f chaincodes/coffee/Dockerfile \
  chaincodes/coffee/
```

#### Step 4: Deploy to Fabric
```bash
./deploy-chaincode.sh
```

Wait 15 seconds for deployment to complete.

#### Step 5: Start Chaincode Container
```bash
./start-chaincode-container.sh
```

Wait 10 seconds for initialization.

#### Step 6: Restart API Server
```bash
./restart-api.sh
```

Wait 10 seconds for API to be ready.

---

## Verification

### Quick Health Check
```bash
# Test new API endpoints
curl http://localhost:3000/api/repatriation/health
curl http://localhost:3000/api/inspection/health
curl http://localhost:3000/api/bordercrossing/health
curl http://localhost:3000/api/banking/health
```

### Comprehensive Test
```bash
./test-new-features.sh
```

Expected output: **90-100% success rate** (15+ tests passing)

### Verify Chaincode Version
```bash
docker exec cli peer lifecycle chaincode querycommitted \
  --channelID coffeechannel \
  --name coffee \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/coffee.com/orderers/orderer.coffee.com/msp/tlscacerts/tlsca.coffee.com-cert.pem
```

Should show: `Version: 1.21, Sequence: 21`

---

## What's Deployed

### Database Changes
| Table | Purpose | Columns |
|-------|---------|---------|
| `repatriations` | Track export proceeds | 15 |
| `inspections` | Quality inspection records | 17 |
| `border_crossings` | Customs clearance tracking | 16 |
| `letter_of_credits` | +5 discrepancy columns | Updated |

### Chaincode Changes
| File | Functions | Lines of Code |
|------|-----------|---------------|
| `repatriation.go` | 10 | 520 |
| `inspection.go` | 11 | 690 |
| `bordercrossing.go` | 12 | 670 |
| `banking.go` (enhanced) | +7 | +350 |
| **Total** | **40** | **2,230** |

### API Changes
| Route File | Endpoints |
|------------|-----------|
| `repatriation.ts` | 10 |
| `inspection.ts` | 9 |
| `bordercrossing.ts` | 10 |
| `banking.ts` (enhanced) | +6 |
| **Total** | **35** |

---

## Troubleshooting

### Issue: Database migrations fail
**Solution:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database connection
docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d gocbc -c "SELECT version();"

# Manually run migrations
psql -h localhost -U postgres -d gocbc -f api/src/migrations/019_create_repatriation_table.sql
```

### Issue: Chaincode deployment fails
**Solution:**
```bash
# Check peer logs
docker logs peer0.org1.coffee.com

# Verify chaincode compiles
cd chaincodes/coffee && go build -v

# Redeploy manually
./deploy-chaincode.sh
```

### Issue: API not responding
**Solution:**
```bash
# Check API logs
docker logs gocbc-api

# Restart API
./restart-api.sh

# Check API routes are loaded
curl http://localhost:3000/api/repatriation/health
```

### Issue: Chaincode container not starting
**Solution:**
```bash
# Check container logs
docker logs coffee-chaincode

# Verify image exists
docker images | grep coffee-chaincode

# Restart container
docker stop coffee-chaincode
./start-chaincode-container.sh
```

---

## Rollback Procedure

If you need to rollback:

### 1. Rollback Chaincode
```bash
# Deploy previous version
docker exec cli peer lifecycle chaincode commit \
  --channelID coffeechannel \
  --name coffee \
  --version 1.20 \
  --sequence 20
```

### 2. Rollback Database
```bash
# Run down migrations (if you created them)
psql -h localhost -U postgres -d gocbc -c "DROP TABLE IF EXISTS border_crossings CASCADE;"
psql -h localhost -U postgres -d gocbc -c "DROP TABLE IF EXISTS inspections CASCADE;"
psql -h localhost -U postgres -d gocbc -c "DROP TABLE IF EXISTS repatriations CASCADE;"
```

### 3. Restart API
```bash
./restart-api.sh
```

---

## Post-Deployment

### 1. Run Full System Test
```bash
./test-complete-workflow-extended.sh
```

Should show **90% completion** with all 34 workflow steps passing.

### 2. Test New Features Individually

#### Repatriation Test
```bash
curl -X POST http://localhost:3000/api/repatriation/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP001",
    "invoiceId": "INV001",
    "amount": 100000,
    "currency": "USD"
  }'
```

#### Inspection Test
```bash
curl -X POST http://localhost:3000/api/inspection/request \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "SHIP001",
    "requestedBy": "EXP001",
    "inspectionType": "quality"
  }'
```

#### Border Crossing Test
```bash
curl -X POST http://localhost:3000/api/bordercrossing/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "SHIP001",
    "exitPoint": "Bole_International_Airport",
    "destination": "Hamburg_Port"
  }'
```

#### LC Discrepancy Test
```bash
curl -X POST http://localhost:3000/api/banking/lc/discrepancy/report \
  -H "Content-Type: application/json" \
  -d '{
    "lcId": "LC001",
    "reportedBy": "BANK001",
    "discrepancyType": "document_mismatch"
  }'
```

### 3. Review Documentation
- **Technical Details:** `HIGH-PRIORITY-FEATURES-IMPLEMENTATION.md`
- **System Status:** `SYSTEM-ACTION-PLAN.md`
- **Deployment Log:** `DEPLOYMENT-GUIDE-HIGH-PRIORITY-FEATURES.md`

---

## Success Criteria

✅ All 4 database migrations applied  
✅ Chaincode version 1.21 deployed  
✅ All 35 API endpoints responding  
✅ Test script shows 90%+ success rate  
✅ No errors in Docker logs  
✅ System workflow test passes 34/34 steps  

---

## Next Steps

After successful deployment:

### Short Term (1 week)
1. **UI Development** - Build frontend components for new features
2. **User Testing** - Test with pilot users
3. **Documentation** - Update user manuals

### Medium Term (2-3 weeks)
1. **Implement MEDIUM Priority Features** (7 features)
   - Quality certifications
   - Compliance penalties
   - Contract amendments
   - Warehouse receipts
   - Market prices
   - Trade statistics
   - Dispute resolution

### Long Term (4-6 weeks)
1. **Implement LOW Priority Features** (4 features)
2. **Performance optimization**
3. **Production deployment**
4. **Achieve 100% completion**

---

## Support

If you encounter issues:

1. **Check logs:** `docker logs gocbc-api` and `docker logs coffee-chaincode`
2. **Review documentation:** `DEPLOYMENT-GUIDE-HIGH-PRIORITY-FEATURES.md`
3. **Run diagnostics:** `./test-new-features.sh`
4. **Check system status:** `docker ps` and `curl http://localhost:3000/health`

---

## Summary

**What You're Deploying:**
- 2,230 lines of chaincode (40 new functions)
- 1,150 lines of API code (35 new endpoints)
- 4 database migrations (4 new/updated tables)
- Version 1.21 (v1.20 → v1.21)

**Impact:**
- Progress: 85% → 90% (+5%)
- Regulatory Compliance: Partial → Full (100%)
- Missing Workflow Steps: 15 → 11 (-4 HIGH priority)

**Time to Deploy:**
- Automated: ~15 minutes
- Manual: ~20 minutes
- Testing: ~5 minutes

---

**Ready to deploy? Run:**
```bash
cd /home/guda/GoCBC
./deploy-high-priority-features.sh
```

**Good luck! 🚀**

# 🚀 DEPLOY NOW - Quick Deployment Checklist

**Ready to deploy HIGH priority features (Repatriation, Inspection, Border Crossing, LC Discrepancies)**

---

## ✅ PRE-DEPLOYMENT CHECKLIST (5 minutes)

### 1. Verify Files Are Ready
```bash
# Check chaincode files exist
ls -lh chaincodes/coffee/repatriation.go
ls -lh chaincodes/coffee/inspection.go
ls -lh chaincodes/coffee/bordercrossing.go

# Check API routes exist
ls -lh api/src/routes/repatriation.ts
ls -lh api/src/routes/inspection.ts
ls -lh api/src/routes/bordercrossing.ts

# Check migrations exist
ls -lh api/src/migrations/019_create_repatriation_table.sql
ls -lh api/src/migrations/020_create_inspection_table.sql
ls -lh api/src/migrations/021_create_border_crossing_table.sql
ls -lh api/src/migrations/022_add_lc_discrepancies.sql
```

**Expected:** All files should exist ✅

---

### 2. Verify Chaincode Compiles
```bash
cd /home/guda/GoCBC/chaincodes/coffee
go build -v
```

**Expected:** No errors, successful compilation ✅

---

### 3. Check System Status
```bash
cd /home/guda/GoCBC
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "Up|Exited"
```

**Expected:** All containers should be "Up" ✅

---

## 🚀 DEPLOYMENT STEPS (30 minutes)

### Step 1: Run Database Migrations (2 minutes)

```bash
cd /home/guda/GoCBC

# Run new migrations
./run-new-migrations.sh
```

**Expected Output:**
```
✅ SUCCESS: 019_create_repatriation_table.sql completed
✅ SUCCESS: 020_create_inspection_table.sql completed
✅ SUCCESS: 021_create_border_crossing_table.sql completed
✅ SUCCESS: 022_add_lc_discrepancies.sql completed
✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!
```

**Verification:**
```bash
# Verify tables were created
docker exec postgres psql -U postgres -d cecbs -c "\dt" | grep -E "repatriation|inspection|border|discrepancy"
```

---

### Step 2: Package Chaincode v1.21 (3 minutes)

```bash
cd /home/guda/GoCBC/chaincodes/coffee

# Update version in metadata
cat > connection.json << EOF
{
  "address": "coffee-chaincode:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

# Create package directory
mkdir -p ../../chaincode-package
cp -r * ../../chaincode-package/

# Create metadata
cat > ../../chaincode-package/metadata.json << EOF
{
  "type": "ccaas",
  "label": "coffee_1.21"
}
EOF

# Package
cd ../../chaincode-package
tar czf ../coffee_1.21.tgz *
cd ..
```

**Verification:**
```bash
tar -tzf coffee_1.21.tgz | head -5
# Should show: metadata.json, connection.json, main.go, etc.
```

---

### Step 3: Deploy Chaincode to All Peers (10 minutes)

```bash
cd /home/guda/GoCBC

# Deploy chaincode (this will install on all 6 peers and commit)
./deploy-chaincode.sh
```

**Expected Output:**
```
✅ Installing chaincode on peer0.ecta...
✅ Installing chaincode on peer0.ecx...
✅ Installing chaincode on peer0.nbe...
✅ Installing chaincode on peer0.customs...
✅ Installing chaincode on peer0.bank...
✅ Installing chaincode on peer0.exporter...
✅ Approving chaincode for all organizations...
✅ Committing chaincode definition...
✅ Chaincode committed successfully!
Version: coffee_1.21
```

**Verification:**
```bash
docker exec peer0.ecx.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee | grep "Version: coffee_1.21"
```

---

### Step 4: Build and Start Chaincode Container (5 minutes)

```bash
cd /home/guda/GoCBC

# Build new Docker image
docker build -t coffee-chaincode:1.21 -f chaincodes/coffee/Dockerfile chaincodes/coffee/

# Stop old container
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

# Start new container
./start-chaincode-container.sh
```

**Expected Output:**
```
✅ Chaincode container started: coffee-chaincode:1.21
```

**Verification:**
```bash
docker ps | grep coffee-chaincode
# Should show: coffee-chaincode:1.21 Up X seconds

docker logs coffee-chaincode --tail 20
# Should show: "Chaincode started successfully"
```

---

### Step 5: Restart API (1 minute)

```bash
cd /home/guda/GoCBC
./restart-api.sh
```

**Expected Output:**
```
✅ API stopped
✅ API started on port 5000
```

**Verification:**
```bash
curl http://localhost:5000/health | jq
# Should show: { "status": "healthy", "services": { "database": true, "blockchain": true } }
```

---

### Step 6: Test New Functions (5 minutes)

#### Test Repatriation Function
```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Test GET /repatriation
curl -s -X GET http://localhost:5000/api/v1/repatriation \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
```

**Expected:** `true` ✅

#### Test Inspection Function
```bash
curl -s -X GET http://localhost:5000/api/v1/inspection \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
```

**Expected:** `true` ✅

#### Test Border Crossing Function
```bash
curl -s -X GET http://localhost:5000/api/v1/bordercrossing \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
```

**Expected:** `true` ✅

#### Test LC Discrepancy Function
```bash
curl -s -X GET "http://localhost:5000/api/v1/banking/lc/discrepancies/pending" \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
```

**Expected:** `true` ✅

---

### Step 7: Test Chaincode Functions Directly (5 minutes)

```bash
# Test InitiateRepatriation
docker exec peer0.ecx.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllRepatriations","Args":[]}'

# Expected: [] or array of repatriations
```

```bash
# Test QueryAllInspections
docker exec peer0.ecx.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllInspections","Args":[]}'

# Expected: [] or array of inspections
```

```bash
# Test QueryAllBorderCrossings
docker exec peer0.ecx.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllBorderCrossings","Args":[]}'

# Expected: [] or array of border crossings
```

---

## ✅ POST-DEPLOYMENT VERIFICATION (5 minutes)

### 1. System Health Check
```bash
cd /home/guda/GoCBC
./system-health.sh
```

**Expected:**
```
✅ Blockchain Network: 17/17 containers running
✅ Chaincode Version: coffee_1.21
✅ API Server: Running
✅ Database: Connected
✅ All systems operational
```

---

### 2. Function Availability Test
```bash
# Count available chaincode functions
docker exec peer0.ecx.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllRepatriations","Args":[]}' 2>&1 | grep -q "successfully" && echo "✅ Repatriation functions available"

docker exec peer0.ecx.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllInspections","Args":[]}' 2>&1 | grep -q "successfully" && echo "✅ Inspection functions available"

docker exec peer0.ecx.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllBorderCrossings","Args":[]}' 2>&1 | grep -q "successfully" && echo "✅ Border crossing functions available"
```

---

### 3. Database Tables Check
```bash
docker exec postgres psql -U postgres -d cecbs -c "
SELECT 
    table_name, 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('export_proceeds_repatriation', 'pre_shipment_inspections', 'border_crossings', 'lc_discrepancies')
ORDER BY table_name;
"
```

**Expected:** 4 tables with column counts

---

### 4. API Endpoint Test
```bash
# Test all new endpoints
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Testing Repatriation API..."
curl -s -X GET http://localhost:5000/api/v1/repatriation -H "Authorization: Bearer $TOKEN" | jq -r '.success' | grep -q "true" && echo "✅"

echo "Testing Inspection API..."
curl -s -X GET http://localhost:5000/api/v1/inspection -H "Authorization: Bearer $TOKEN" | jq -r '.success' | grep -q "true" && echo "✅"

echo "Testing Border Crossing API..."
curl -s -X GET http://localhost:5000/api/v1/bordercrossing -H "Authorization: Bearer $TOKEN" | jq -r '.success' | grep -q "true" && echo "✅"

echo "Testing LC Discrepancy API..."
curl -s -X GET "http://localhost:5000/api/v1/banking/lc/discrepancies/pending" -H "Authorization: Bearer $TOKEN" | jq -r '.success' | grep -q "true" && echo "✅"
```

**Expected:** 4x ✅

---

## 🎉 DEPLOYMENT COMPLETE!

### Summary
- ✅ Database migrations applied (4 new tables)
- ✅ Chaincode v1.21 deployed to all 6 peers
- ✅ Chaincode container running (coffee-chaincode:1.21)
- ✅ API restarted with new routes
- ✅ All 40 new functions available
- ✅ All 35 new endpoints responding

### System Status
- **Before:** 85% complete
- **After:** 90% complete ⬆️ (+5%)
- **New Capabilities:** Repatriation, Inspection, Border Crossing, LC Discrepancy

### What's Next?
1. ✅ **Deployed** - Features now live on blockchain
2. ⏳ **UI Development** - Build dashboards for 4 features (4 days)
3. ⏳ **Testing** - Integration tests for 38-step workflow (2 days)
4. ⏳ **User Training** - Train NBE, exporters, customs, banks (3 days)
5. ⏳ **MEDIUM Features** - Implement remaining 11 features (3 weeks)

---

## 🔧 TROUBLESHOOTING

### Issue: Migration Fails
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec postgres psql -U postgres -c "SELECT 1;"

# Re-run migration
./run-new-migrations.sh
```

### Issue: Chaincode Deploy Fails
```bash
# Check all peers are running
docker ps | grep peer

# Check orderer is running
docker ps | grep orderer

# Try deploy again
./deploy-chaincode.sh
```

### Issue: API Endpoints Return 404
```bash
# Check API is running
curl http://localhost:5000/health

# Check logs for errors
./logs-api.sh | grep -i error

# Restart API
./restart-api.sh
```

---

## 📞 SUPPORT

**Documentation:**
- Deployment Guide: `DEPLOYMENT-GUIDE-HIGH-PRIORITY-FEATURES.md`
- Implementation Details: `HIGH-PRIORITY-FEATURES-IMPLEMENTATION.md`
- System Status: `SYSTEM-ACTION-PLAN.md`

**Quick Commands:**
```bash
# System health
./system-health.sh

# View API logs
./logs-api.sh

# View chaincode logs
docker logs coffee-chaincode

# Restart everything
./stop-all.sh && ./start-all.sh
```

---

**🎊 Ready to deploy? Run the commands step by step and check each verification!**

# GoCBC Portal Testing - Quick Start Guide

## 🎯 Goal
Test all 7 portals (61 tabs + 33 subtabs = 94 test points) to verify complete functionality.

---

## ⚡ Quick Start (3 Commands)

```bash
# 1. Start the system
cd /home/guda/GoCBC
bash start-all.sh

# 2. Wait for startup (30-60 seconds)
sleep 30

# 3. Run tests
bash RUN-PORTAL-TESTS.sh --bash
```

**That's it!** Results will show pass/fail for all portals.

---

## 📊 What Gets Tested

| Portal | Tabs | Subtabs | Total Points |
|--------|------|---------|--------------|
| Exporter | 8 | - | 8 |
| ECTA | 10 | 5 quality stages | 15 |
| Banks | 4 parents | 9 children + 4 payment methods | 17 |
| NBE | 8 | 9 subtabs | 17 |
| Customs | 8 | - | 8 |
| Shipping | 10 lifecycle stages | - | 10 |
| ECX | 4 | 4 lot stages | 8 |
| **TOTAL** | **61** | **33** | **94** |

---

## 🚀 Test Options

### Option 1: Quick Bash Test (Recommended) ⚡
**Fastest way to verify everything:**
```bash
bash RUN-PORTAL-TESTS.sh --bash
```
- ✅ Tests 69 API endpoints
- ✅ Completes in ~30 seconds
- ✅ Clear pass/fail output
- ✅ Results saved to `/tmp/portal-test-results.log`

### Option 2: TypeScript Automated Suite 🔬
**Comprehensive workflow testing:**
```bash
bash RUN-PORTAL-TESTS.sh --typescript
```
- ✅ Complete workflow validation
- ✅ Status transition testing
- ✅ Data persistence checks
- ⏱️ Takes 2-5 minutes

### Option 3: Both Tests 🎯
**Maximum coverage:**
```bash
bash RUN-PORTAL-TESTS.sh --both
```

### Option 4: Interactive Menu 📋
**Choose at runtime:**
```bash
bash RUN-PORTAL-TESTS.sh
```

---

## ✅ Expected Output (Success)

```
════════════════════════════════════════════════════════════════════════
  GoCBC Portal Testing - All Tabs & Subtabs
════════════════════════════════════════════════════════════════════════

🎯 Target: http://localhost:3001/api/v1
📅 Date: 2026-10-23

[1/7] Testing Exporter Portal (8 tabs)...
  ✓ Dashboard
  ✓ Contracts
  ✓ Shipments
  ✓ Payments
  ✓ Documents
  ✓ Quality
  ✓ History
  ✓ Profile
  Result: 8/8 PASSED ✓

[2/7] Testing ECTA Portal (10 tabs + 5 stages)...
  ✓ All 15 test points PASSED ✓

[3/7] Testing Banks Portal (4 parents + 9 children + 4 payment methods)...
  ✓ All 17 test points PASSED ✓

[4/7] Testing NBE Portal (8 tabs + 9 subtabs)...
  ✓ All 17 test points PASSED ✓

[5/7] Testing Customs Portal (8 status tabs)...
  ✓ All 8 test points PASSED ✓

[6/7] Testing Shipping Portal (10 lifecycle stages)...
  ✓ All 10 test points PASSED ✓

[7/7] Testing ECX Portal (4 tabs + 4 stages)...
  ✓ All 8 test points PASSED ✓

═══════════════════════════════════════════════════════════════════════
  FINAL RESULTS
═══════════════════════════════════════════════════════════════════════
Total Tests: 94
Passed: 94 ✓
Failed: 0 ✗
Success Rate: 100%
Time: 28 seconds
═══════════════════════════════════════════════════════════════════════
```

---

## ❌ Troubleshooting

### Problem: "API is not running"

**Solution:**
```bash
cd /home/guda/GoCBC
bash start-all.sh
sleep 30
bash RUN-PORTAL-TESTS.sh --bash
```

### Problem: "Connection refused"

**Check if API is running:**
```bash
curl http://localhost:3001/health
```

**If no response, check logs:**
```bash
tail -f /home/guda/GoCBC/logs/api.log
```

**Restart API:**
```bash
cd /home/guda/GoCBC/api
pkill -f "node.*dist/server.js"
npm start
```

### Problem: "Docker containers not running"

**Check Docker:**
```bash
docker ps
```

**Start Docker services:**
```bash
cd /home/guda/GoCBC
docker-compose -f docker-compose-fabric.yml up -d
```

### Problem: Tests pass but UI doesn't work

**Manual UI verification:**
```bash
# 1. Open browser
http://localhost:3000

# 2. Login to each portal:
#    - Exporter Portal
#    - ECTA Portal
#    - Banks Portal
#    - NBE Portal
#    - Customs Portal
#    - Shipping Portal
#    - ECX Portal

# 3. Click through all tabs in each portal
# 4. Verify data displays correctly
```

---

## 📝 Test Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `RUN-PORTAL-TESTS.sh` | Interactive test runner | **Use this first** |
| `test-all-portals.sh` | Bash endpoint tests | Direct bash execution |
| `tests/run-all-workflows.ts` | TypeScript suite | Comprehensive testing |
| `simple-test.sh` | Quick smoke test | API health check |

---

## 🔍 View Test Results

### Last Test Results:
```bash
cat /tmp/portal-test-results.log
```

### API Logs:
```bash
tail -f /home/guda/GoCBC/logs/api.log
```

### Database Verification:
```bash
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT COUNT(*) FROM contracts;"
```

---

## 🎓 Understanding Test Structure

### Exporter Portal Example:

```
Exporter Portal (8 tabs)
├── Dashboard          → GET /api/v1/dashboard
├── Contracts          → GET /api/v1/contracts
├── Shipments          → GET /api/v1/shipments
├── Payments           → GET /api/v1/payments
├── Documents          → GET /api/v1/documents
├── Quality            → GET /api/v1/quality-inspections
├── History            → GET /api/v1/audit-logs
└── Profile            → GET /api/v1/users/profile
```

Each test:
1. ✅ Verifies endpoint exists
2. ✅ Checks response format
3. ✅ Validates status code
4. ✅ Confirms data structure

---

## 📋 Checklist

**Before Testing:**
- [ ] System started (`bash start-all.sh`)
- [ ] API responding (`curl http://localhost:3001/health`)
- [ ] Docker containers running (`docker ps`)
- [ ] Database accessible

**Run Tests:**
- [ ] Quick bash test completed
- [ ] All 94 test points passed
- [ ] No connection errors

**After Testing:**
- [ ] Review results log
- [ ] Document any failures
- [ ] Verify UI manually (optional)

---

## 🆘 Need Help?

### System Not Starting:
```bash
# Check prerequisites
docker --version
node --version
npm --version

# View startup logs
tail -f /home/guda/GoCBC/logs/api.log
tail -f /home/guda/GoCBC/logs/ui.log
```

### Tests Failing:
```bash
# Identify failing endpoints
grep "FAILED" /tmp/portal-test-results.log

# Test single endpoint
curl http://localhost:3001/api/v1/contracts

# Check database
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\dt"
```

### Port Already in Use:
```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill process
kill <PID>

# Restart
bash start-all.sh
```

---

## 📚 Documentation

- **Complete Status:** `COMPREHENSIVE-PORTAL-TEST-STATUS.md`
- **All Tabs List:** `COMPLETE-PORTAL-TABS-LIST.md`
- **Manual Testing:** `WORKFLOW-TEST-PLAN.md`
- **Automated Tests:** `tests/README.md`

---

## ⚙️ Advanced Usage

### Test Specific Portal:
```bash
# Edit test-all-portals.sh and comment out unwanted portals
vim /home/guda/GoCBC/test-all-portals.sh
```

### Custom API URL:
```bash
API_URL="http://different-host:3001/api/v1" bash test-all-portals.sh
```

### Run with Authentication:
```bash
# Get JWT token first
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# Use in tests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/contracts
```

---

## 🎯 Summary

**3 Steps to Complete Testing:**

1. **Start:** `bash start-all.sh`
2. **Wait:** `sleep 30`
3. **Test:** `bash RUN-PORTAL-TESTS.sh --bash`

**Expected Result:** 94/94 tests passing (100%)

---

**Last Updated:** October 23, 2026  
**Version:** 2.0 - Port Configuration Fixed

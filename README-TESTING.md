# GoCBC Testing Documentation - Start Here

## 🎯 Quick Start - Run Tests in 3 Steps

```bash
# 1. Start API (Terminal 1)
cd /home/guda/GoCBC/api && npm run dev

# 2. Run step-by-step test (Terminal 2)
cd /home/guda/GoCBC/api
node tests/step-by-step-workflow-test.js

# 3. Watch workflow execute with detailed explanations
```

---

## 📚 Documentation Guide

### New to the System? Start Here:
1. **[QUICK-TEST-REFERENCE.md](QUICK-TEST-REFERENCE.md)** ⭐ **START HERE**
   - Quick overview of testing
   - 8 steps at a glance
   - Success indicators to watch for
   - Common issues and fixes

2. **[STEP-BY-STEP-TESTING-GUIDE.md](STEP-BY-STEP-TESTING-GUIDE.md)** ⭐ **DETAILED GUIDE**
   - Complete explanation of each step
   - What happens in detail
   - How triggers work
   - Database and blockchain verification
   - Troubleshooting guide

### Want to Understand What Was Fixed?
3. **[WORKFLOW-PARAMETER-FIXES-COMPLETE.md](WORKFLOW-PARAMETER-FIXES-COMPLETE.md)**
   - All 10 fixes explained
   - Before/after code comparisons
   - Why each fix was needed

4. **[FINAL-STATUS-ALL-FIXES-COMPLETE.md](FINAL-STATUS-ALL-FIXES-COMPLETE.md)**
   - Complete fix summary
   - Round 1 and Round 2 fixes
   - Files modified
   - Verification results

### Ready to Test?
5. **[COMPLETE-WORKFLOW-TESTING-READY.md](COMPLETE-WORKFLOW-TESTING-READY.md)**
   - Testing readiness checklist
   - How to run tests
   - Expected results
   - Next steps

6. **[api/RUN-TESTS.md](api/RUN-TESTS.md)**
   - Quick test commands
   - Parameter validation
   - Manual testing with curl

---

## 🎬 The Complete Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│         Ethiopian Coffee Export - 8 Steps                        │
└─────────────────────────────────────────────────────────────────┘

1. Register Contract     → Exporter submits contract
2. Approve Contract      → ECTA approves
3. Issue LC              → Bank issues Letter of Credit
   🔥 Auto-trigger: Forex request created
4. Allocate Forex        → NBE allocates with 40% retention
   💰 $10,000 → $4,000 retained + $6,000 released
5. Create Shipment       → Exporter registers shipment
   🔥 Auto-trigger: Quality task created
6. Approve Quality       → ECTA inspects and approves
   🔥 Auto-trigger: Customs declaration created
7. Clear Customs         → Customs clears for export
8. Record Payment        → Bank records payment with 40% retention
   💰 $10,000 → $4,000 retained + $6,000 to exporter

✅ WORKFLOW COMPLETE - Coffee exported with full compliance!
```

---

## 🔥 Three Automatic Triggers

| Step | Trigger | What Gets Created | Code Location |
|------|---------|-------------------|---------------|
| 3 | LC Issuance | Forex Request | `LCService.triggerForexAutoRequest()` |
| 5 | Shipment Creation | Quality Inspection | `ShipmentService.createQualityInspectionTaskInternal()` |
| 6 | Quality Approval | Customs Declaration | `ShipmentService.triggerCustomsDeclaration()` |

---

## 💰 40% NBE Retention (Enforced Twice)

### Enforcement Point 1: Forex Allocation (Step 4)
- **Service:** `ForexService.allocateForex()`
- **Input:** $10,000 forex request
- **Output:** $4,000 retained (40%), $6,000 released (60%)
- **Database:** `forex_allocations` table

### Enforcement Point 2: Payment Recording (Step 8)
- **Service:** `PaymentService.recordPayment()`
- **Input:** $10,000 payment received
- **Output:** $4,000 retained (40%), $6,000 to exporter (60%)
- **Database:** `payments` table

**Formula:** `retentionAmount = totalAmount * 0.40`

---

## 📁 Test Files

### Main Test (Use This!)
```
/home/guda/GoCBC/api/tests/step-by-step-workflow-test.js
```
**Features:**
- Detailed output for each step
- Shows triggers firing (🔥)
- Shows retention calculations (💰)
- Database verification after each step
- Explains what's happening

### Alternative Test
```
/home/guda/GoCBC/api/tests/integration/workflow-integration-test.js
```
**Features:**
- Faster execution
- Less detailed output
- Good for CI/CD

---

## ✅ What Success Looks Like

```
TEST SUMMARY
═══════════════════════════════════════════

📊 Results:
   Total Steps: 8
   Passed: 8 ✅
   Failed: 0 ✅
   Duration: ~15s

✅ Step 1: Register Contract
✅ Step 2: Approve Contract
✅ Step 3: Issue LC
✅ Step 4: Allocate Forex (40%)
✅ Step 5: Create Shipment
✅ Step 6: Approve Quality
✅ Step 7: Clear Customs
✅ Step 8: Record Payment (40%)

📋 Step Details:
   ✅ Step 1: Register Contract
   ✅ Step 2: Approve Contract
   ✅ Step 3: Issue LC
   ✅ Step 4: Allocate Forex (40%)
   ✅ Step 5: Create Shipment
   ✅ Step 6: Approve Quality
   ✅ Step 7: Clear Customs
   ✅ Step 8: Record Payment (40%)

✅ ALL TESTS PASSED - COMPLETE WORKFLOW FUNCTIONAL!
```

---

## 🔍 What to Watch For

### Success Indicators
- ✅ Green checkmarks
- 📊 Data created/updated
- 🔥 Automatic triggers
- 💰 Retention calculations
- Database verifications

### Key Messages
```
🔥 WORKFLOW TRIGGER: Forex request automatically created!
🔥 Quality inspection task created: INS-xxx
🔥 Customs declaration created: DECL-xxx

💰 RETENTION BREAKDOWN:
   Total Amount:    $10000 USD
   Retention (40%): $4000 USD
   Release (60%):   $6000 USD

✅ ✓ 40% retention calculation CORRECT
```

---

## 🐛 Troubleshooting

### API Server Won't Start
```bash
# Check if port 3001 is already in use
lsof -i :3001

# Kill existing process if needed
kill -9 <PID>

# Start server
npm run dev
```

### Database Connection Failed
```bash
# Check PostgreSQL status
pg_isready

# Start PostgreSQL if needed
sudo systemctl start postgresql

# Test connection
psql -d gocbc -c "SELECT 1"
```

### Test Fails at Specific Step
1. Check API server logs for errors
2. Look for ❌ error messages in test output
3. Verify database tables exist
4. Check blockchain network is running
5. Review step documentation for requirements

### Trigger Doesn't Fire
1. Check API logs for "🔥 WORKFLOW TRIGGER" messages
2. Verify service method is being called
3. Check database for auto-created records
4. Review trigger code in services

---

## 📊 Database Verification

After test completes, check records:

```sql
-- View all workflow entities
SELECT 'Contract' as type, contract_id as id, status 
FROM contracts WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'LC', lc_id, status 
FROM letters_of_credit WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'Forex', forex_id, status 
FROM forex_allocations WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'Shipment', shipment_id, status 
FROM shipments WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'Quality', inspection_id, status 
FROM quality_inspections 
WHERE shipment_id IN (SELECT shipment_id FROM shipments WHERE contract_id LIKE 'TEST-%')
UNION ALL
SELECT 'Customs', declaration_id, status 
FROM customs_declarations 
WHERE shipment_id IN (SELECT shipment_id FROM shipments WHERE contract_id LIKE 'TEST-%')
UNION ALL
SELECT 'Payment', payment_id, status 
FROM payments WHERE contract_id LIKE 'TEST-%';

-- Verify 40% retention
SELECT 
  'Forex' as stage,
  retention_amount,
  release_amount,
  retention_amount + release_amount as total
FROM forex_allocations WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 
  'Payment',
  retention_amount,
  release_amount,
  retention_amount + release_amount
FROM payments WHERE contract_id LIKE 'TEST-%';
```

---

## 🎓 Learning Path

**New to the system?**
1. Read `QUICK-TEST-REFERENCE.md` (5 min)
2. Run the test and watch output (5 min)
3. Read `STEP-BY-STEP-TESTING-GUIDE.md` (15 min)
4. Run test again with better understanding (5 min)

**Need technical details?**
1. Read `WORKFLOW-PARAMETER-FIXES-COMPLETE.md`
2. Review service code in `/api/src/services/`
3. Check route code in `/api/src/routes/`

**Deploying to production?**
1. Run all tests successfully
2. Review `FINAL-STATUS-ALL-FIXES-COMPLETE.md`
3. Complete production readiness checklist
4. Perform load testing
5. Security review

---

## 📞 Support

**Documentation:**
- All `.md` files in `/home/guda/GoCBC/`
- Test files in `/home/guda/GoCBC/api/tests/`
- Service code in `/home/guda/GoCBC/api/src/services/`

**Key Files:**
- `QUICK-TEST-REFERENCE.md` - Start here ⭐
- `STEP-BY-STEP-TESTING-GUIDE.md` - Detailed guide ⭐
- `step-by-step-workflow-test.js` - Main test file ⭐

---

## 🚀 Ready to Go!

Everything is set up. Just run:

```bash
cd /home/guda/GoCBC/api
node tests/step-by-step-workflow-test.js
```

You'll see:
- Each of the 8 steps execute
- Automatic triggers fire (🔥)
- 40% retention calculated (💰)
- Database verified after each step
- Complete workflow from contract to payment

**The test explains everything as it runs!**

---

## 📈 Next Steps After Testing

1. ✅ Verify all 8 steps pass
2. ✅ Confirm 3 triggers fire
3. ✅ Check 2 retention calculations
4. ⏳ Perform user acceptance testing (UAT)
5. ⏳ Load testing
6. ⏳ Security review
7. ⏳ Production deployment

---

**Status: 🎯 READY FOR TESTING**

All code fixed. All tests ready. Documentation complete.

**Let's test the workflow! 🚀**

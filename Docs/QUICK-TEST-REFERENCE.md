# GoCBC Workflow Testing - Quick Reference Card

## 🚀 Quick Start (3 Steps)

```bash
# 1. Start API Server
cd /home/guda/GoCBC/api && npm run dev

# 2. Open new terminal and run test
cd /home/guda/GoCBC/api
node tests/step-by-step-workflow-test.js

# 3. Watch the magic happen! ✨
```

---

## 📋 What You'll See

### Each Step Shows:
```
═══════════════════════════════════════════
STEP X: [STEP NAME]
═══════════════════════════════════════════

▶ [Action being performed]
  ℹ️  [Context information]
  
  ✅ [Success message]
  📊 [Data created/updated]
  🔥 [Automatic trigger fired]
  💰 [Retention calculation]
```

### Example Output for Step 4 (Forex):
```
STEP 4: ALLOCATE FOREX WITH 40% NBE RETENTION

▶ National Bank of Ethiopia allocating forex...
  ℹ️  Amount: $10,000 USD
  ℹ️  NBE Retention Policy: 40%
  
  ✅ Forex allocated successfully
  📊 Forex ID: FOREX-1234567890
  
  💰 RETENTION BREAKDOWN:
     Total Amount:    $10000 USD
     Retention (40%): $4000 USD
     Release (60%):   $6000 USD
     Exchange Rate:   115.5 ETB/USD
  
  ✅ ✓ 40% retention calculation CORRECT
  ✅ ✓ 60% release calculation CORRECT
  ✅ Database: Status = "ALLOCATED"
  ✅ Database: Retention = $4000, Release = $6000
```

---

## 🎯 The 8 Steps at a Glance

| # | Step | Who | Key Action | Auto-Trigger |
|---|------|-----|------------|--------------|
| 1 | Register Contract | Exporter | Submit details | - |
| 2 | Approve Contract | ECTA | Review & approve | - |
| 3 | Issue LC | Bank | Issue LC | 🔥 Forex request |
| 4 | Allocate Forex | NBE | Allocate + 40% retention | - |
| 5 | Create Shipment | Exporter | Create shipment | 🔥 Quality task |
| 6 | Approve Quality | ECTA | Inspect & approve | 🔥 Customs declaration |
| 7 | Clear Customs | Customs | Review & clear | - |
| 8 | Record Payment | Bank | Record + 40% retention | - |

---

## 🔥 Three Automatic Triggers to Watch For

### Trigger 1: LC → Forex
```
STEP 3 completes:
✅ LC issued successfully
🔥 WORKFLOW TRIGGER: Forex request automatically created!
📊 Forex ID: FOREX-xxx
```

### Trigger 2: Shipment → Quality
```
STEP 5 completes:
✅ Shipment created successfully
🔥 WORKFLOW TRIGGER: Quality inspection task should be auto-created!
🔥 Quality inspection task created: INS-xxx
```

### Trigger 3: Quality → Customs
```
STEP 6 completes:
✅ Quality inspection approved
🔥 WORKFLOW TRIGGER: Customs declaration should be auto-created!
🔥 Customs declaration created: DECL-xxx
```

---

## 💰 40% NBE Retention Verification

### At Step 4 (Forex Allocation):
```
Look for:
✅ ✓ 40% retention calculation CORRECT
✅ Database: Retention = $4000, Release = $6000

Formula: $10,000 × 40% = $4,000 retained
         $10,000 × 60% = $6,000 released
```

### At Step 8 (Payment Recording):
```
Look for:
✅ ✓ 40% retention calculation CORRECT
✅ Database: Retention = $4000, Release = $6000

Formula: $10,000 × 40% = $4,000 retained
         $10,000 × 60% = $6,000 released to exporter
```

---

## ✅ Success Indicators

### All Steps Pass:
```
TEST SUMMARY
═══════════════════════════════════

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

✅ ALL TESTS PASSED - COMPLETE WORKFLOW FUNCTIONAL!
```

---

## ❌ Common Issues & Quick Fixes

### Issue: API Server Not Running
```
Error: connect ECONNREFUSED 127.0.0.1:3001

Fix:
cd /home/guda/GoCBC/api && npm run dev
```

### Issue: Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432

Fix:
1. Start PostgreSQL: sudo systemctl start postgresql
2. Or check DB settings in .env file
```

### Issue: Trigger Didn't Fire
```
❌ Quality inspection task NOT created!

Troubleshoot:
1. Check API server logs for errors
2. Look for "🔥 WORKFLOW TRIGGER" in logs
3. Verify service methods are being called
4. Check database for auto-created records
```

### Issue: Retention Calculation Wrong
```
✗ Retention mismatch: Expected $4000, Got $3500

Troubleshoot:
1. Check retentionRate parameter (should be 40)
2. Verify ForexService/PaymentService code
3. Check database retention_rate column
```

---

## 🔍 Manual Verification Queries

After test completes, check database:

```sql
-- View complete workflow
SELECT 'Contract' as entity, contract_id as id, status FROM contracts WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'LC', lc_id, status FROM letters_of_credit WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'Forex', forex_id, status FROM forex_allocations WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'Shipment', shipment_id, status FROM shipments WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 'Quality', inspection_id, status FROM quality_inspections WHERE shipment_id IN (SELECT shipment_id FROM shipments WHERE contract_id LIKE 'TEST-%')
UNION ALL
SELECT 'Customs', declaration_id, status FROM customs_declarations WHERE shipment_id IN (SELECT shipment_id FROM shipments WHERE contract_id LIKE 'TEST-%')
UNION ALL
SELECT 'Payment', payment_id, status FROM payments WHERE contract_id LIKE 'TEST-%';

-- Check 40% retention
SELECT 
  'Forex' as stage,
  forex_id as id,
  retention_rate,
  retention_amount,
  release_amount
FROM forex_allocations 
WHERE contract_id LIKE 'TEST-%'
UNION ALL
SELECT 
  'Payment',
  payment_id,
  retention_rate,
  retention_amount,
  release_amount
FROM payments 
WHERE contract_id LIKE 'TEST-%';
```

---

## 📊 Expected Test Data

| Entity | ID Pattern | Count |
|--------|------------|-------|
| Contract | TEST-CONTRACT-xxx | 1 |
| LC | TEST-LC-xxx | 1 |
| Forex | FOREX-xxx (auto) | 1 |
| Shipment | TEST-SHIPMENT-xxx | 1 |
| Inspection | INS-xxx (auto) | 1 |
| Declaration | DECL-xxx (auto) | 1 |
| Payment | TEST-PAY-xxx | 1 |

Total: 7 main records + audit logs + blockchain transactions

---

## 🎯 What Success Looks Like

```
╔═══════════════════════════════════════════════════════╗
║                                                        ║
║       ✅ ALL TESTS PASSED                             ║
║                                                        ║
║  • 8/8 steps completed successfully                   ║
║  • 3/3 automatic triggers fired                       ║
║  • 2/2 retention calculations correct                 ║
║  • All database records created                       ║
║  • All blockchain transactions confirmed              ║
║                                                        ║
║  Exporter receives: $6,000 USD (60%)                  ║
║  NBE retains: $4,000 USD (40%)                        ║
║                                                        ║
║       🎯 WORKFLOW FULLY OPERATIONAL                   ║
║                                                        ║
╚═══════════════════════════════════════════════════════╝
```

---

## 📚 Additional Resources

- **Detailed Guide:** `STEP-BY-STEP-TESTING-GUIDE.md`
- **Visual Workflow:** See artifact "GoCBC Workflow - Visual Step-by-Step Guide"
- **Fix Documentation:** `WORKFLOW-PARAMETER-FIXES-COMPLETE.md`
- **API Docs:** Check `/api/docs` endpoint when server is running

---

## 🆘 Need Help?

1. **Check logs:** Look for ✅ and ❌ indicators in test output
2. **Review documentation:** Read `STEP-BY-STEP-TESTING-GUIDE.md`
3. **Verify services:** Ensure API, database, blockchain are running
4. **Check code:** Review service files for trigger implementations
5. **Database queries:** Use SQL queries above to verify records

---

**Ready to test? Just run:**
```bash
cd /home/guda/GoCBC/api && node tests/step-by-step-workflow-test.js
```

**Good luck! 🚀**

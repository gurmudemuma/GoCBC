# 🚀 Banks Portal - Testing Execution Guide

**Quick Reference for Complete Testing**  
**Date:** September 1, 2026  
**Status:** Ready to Execute

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Verify System is Running
```bash
# Check API
curl http://localhost:3001/health

# Check UI
curl http://localhost:3000
```

**Expected:** Both should respond successfully

### Step 2: Login to Banks Portal
1. Open browser: http://localhost:3000
2. Login: `bank_admin` / `Bank@2024`
3. Verify redirect to Banks Portal

### Step 3: Quick Tab 8 Check
1. Click through tabs 0-7 (verify they load)
2. Click "LC Settlements" (Tab 8)
3. Verify tab loads without console errors
4. Check if "💰 LC Settlement Tracking" heading appears

✅ **If all 3 steps pass** → Continue to full testing  
❌ **If any step fails** → Check system logs and restart

---

## 📋 Testing Options

### Option A: Automated Testing (Recommended)
**Duration:** 15-20 minutes  
**Coverage:** 36+ test cases  
**Effort:** Low

```bash
cd c:\goCBC
npx playwright test tests/banks-portal-automated.test.js --reporter=list
```

**Pros:** Fast, comprehensive, repeatable  
**Cons:** May need Playwright installation first

### Option B: Manual Testing
**Duration:** 60-90 minutes  
**Coverage:** Comprehensive with edge cases  
**Effort:** High

```bash
# Open the manual test script
start tests\banks-portal-manual-test-script.md
```

**Pros:** Thorough, catches UX issues  
**Cons:** Time-consuming, requires attention to detail

### Option C: Interactive Test Runner
**Duration:** Variable  
**Coverage:** Your choice  
**Effort:** Medium

```bash
# Double-click or run:
tests\run-banks-portal-tests.bat
```

**Pros:** User-friendly, flexible  
**Cons:** Still requires some manual work

### Option D: Quick Validation Only
**Duration:** 2 minutes  
**Coverage:** Basic integration check  
**Effort:** Minimal

```bash
node tests\validate-banks-portal-integration.js
```

**Pros:** Super fast  
**Cons:** Limited coverage

---

## 🎯 Recommended Testing Sequence

### 1. Pre-Flight Checks (5 min)
```bash
# Validate integration
node tests\validate-banks-portal-integration.js

# Check TypeScript
cd ui && npm run type-check

# Verify system health
curl http://localhost:3001/health
```

### 2. Smoke Test (10 min)
**Manual Steps:**
1. Login as bank_admin
2. Navigate through all 9 tabs
3. Focus on Tab 8:
   - Verify it loads
   - Check for delivered shipments
   - Verify PostDeliveryWorkflowPanel appears
   - Check console for errors (F12)

### 3. Core Functionality Test (30 min)
**Focus on Tab 8:**
1. ✅ KPI cards display correctly
2. ✅ Delivered shipments list properly
3. ✅ Click "Record Payment" button
4. ✅ Fill payment form and submit
5. ✅ Verify progress bar updates
6. ✅ Click "Record LC Settlement" button
7. ✅ Fill settlement form and submit
8. ✅ Verify workflow completes

### 4. Integration Test (20 min)
**Complete LC Lifecycle:**
1. Tab 0: Create LC
2. Tab 3: Approve documents
3. Tab 4: Release payment
4. (Shipping Portal): Mark shipment DELIVERED
5. Tab 8: Verify shipment appears
6. Tab 8: Record payment
7. (NBE Portal): Record forex repatriation
8. Tab 8: Record LC settlement
9. (ECTA Portal): Complete audit
10. Tab 8: Verify 100% completion

### 5. Automated Test Suite (15 min)
```bash
npx playwright test tests/banks-portal-automated.test.js
```

Review results and screenshots for any failures.

---

## 🔍 Critical Test Cases (Must Pass)

### Test Case 1: Tab 8 Exists ✅
**How to Test:**
1. Login as bank_admin
2. Count tabs visible
3. Verify "LC Settlements" tab present
4. Click tab, verify it loads

**Expected:** Tab 8 loads without errors

### Test Case 2: PostDeliveryWorkflowPanel Renders ✅
**How to Test:**
1. Navigate to Tab 8
2. Look for workflow panel in shipment cards
3. Verify 5 workflow steps visible
4. Check progress bar present

**Expected:** Workflow panel displays for each delivered shipment

### Test Case 3: Record Payment Works ✅
**How to Test:**
1. Click "Record Payment" button
2. Fill form:
   - Amount: 95000
   - Currency: USD
   - SWIFT: TEST123
   - Date: Today
3. Submit form
4. Verify success message
5. Check progress bar updates

**Expected:** Payment recorded, step 1 marked complete

### Test Case 4: Record LC Settlement Works ✅
**How to Test:**
1. Ensure payment recorded first
2. Click "Record LC Settlement" button
3. Fill form:
   - LC Number: (auto-filled)
   - Settlement Date: Today
   - Notes: "Test settlement"
4. Submit form
5. Verify success message
6. Check progress bar = 60%

**Expected:** Settlement recorded, step 3 marked complete

### Test Case 5: Role Permissions Enforced ✅
**How to Test:**
1. Login as bank_admin
2. Navigate to Tab 8
3. Verify "Record Payment" button visible
4. Verify "Record LC Settlement" button visible
5. Verify "Record Forex" button NOT visible (NBE only)
6. Verify "Complete Audit" button NOT visible (ECTA only)

**Expected:** Only Bank-appropriate buttons shown

### Test Case 6: Progress Calculation Correct ✅
**How to Test:**
1. New shipment: Progress = 0%
2. After payment: Progress = 20%
3. After forex: Progress = 40%
4. After LC settlement: Progress = 60%
5. After audit: Progress = 80%
6. After close: Progress = 100%

**Expected:** Progress = (completed_steps / 5) × 100

### Test Case 7: No Console Errors ✅
**How to Test:**
1. Open DevTools (F12)
2. Navigate to Tab 8
3. Click around, perform actions
4. Check console for errors

**Expected:** No red errors (warnings ok)

### Test Case 8: Data Persists ✅
**How to Test:**
1. Record payment on Tab 8
2. Switch to Tab 0
3. Switch back to Tab 8
4. Verify payment still marked complete

**Expected:** Workflow state preserved

---

## 📊 Database Verification Queries

### After Recording Payment
```sql
SELECT * FROM post_delivery_workflow WHERE shipment_id = 'SHIP1786102768';
```

**Expected Results:**
- `payment_received` = true
- `payment_amount` = 95000
- `payment_date` = today's date
- `blockchain_payment_hash` = present

### After Recording LC Settlement
```sql
SELECT * FROM post_delivery_workflow WHERE shipment_id = 'SHIP1786102768';
```

**Expected Results:**
- `lc_settled` = true
- `lc_settlement_date` = today's date
- `blockchain_lc_hash` = present
- `overall_status` = 'IN_PROGRESS' or 'COMPLETED'

### Check Audit Trail
```sql
SELECT action, performed_by, timestamp 
FROM audit_trail 
WHERE entity_id = 'SHIP1786102768' 
  AND action LIKE '%post_delivery%'
ORDER BY timestamp DESC;
```

**Expected:** Entries for payment and settlement actions

---

## 🔗 Blockchain Verification

### Query Shipment
```bash
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"queryShipment","Args":["SHIP1786102768"]}'
```

**Expected JSON:**
```json
{
  "shipmentID": "SHIP1786102768",
  "status": "DELIVERED",
  "paymentReceived": true,
  "paymentAmount": 95000,
  "lcSettled": true,
  "lcSettlementDate": "2026-09-01T..."
}
```

---

## 🐛 Common Issues and Solutions

### Issue 1: Tab 8 Not Visible
**Symptoms:** Only 8 tabs (0-7) visible, no "LC Settlements"

**Solutions:**
1. Clear browser cache
2. Hard refresh (Ctrl+F5)
3. Check user role: Must be BANKS or ADMIN
4. Verify file: `ui/src/components/portals/BanksPortal.tsx`

### Issue 2: "No delivered shipments" Message
**Symptoms:** Tab 8 shows "No delivered shipments requiring LC settlement"

**Solutions:**
1. Create delivered shipment:
   ```bash
   node tests/test-complete-workflow.js
   ```
2. Or manually mark shipment as DELIVERED in Shipping Portal
3. Verify database:
   ```sql
   SELECT * FROM shipments WHERE status = 'DELIVERED';
   ```

### Issue 3: "Record Payment" Button Not Working
**Symptoms:** Button disabled or not responding

**Solutions:**
1. Check if shipment already has payment recorded
2. Verify API is running: `curl http://localhost:3001/health`
3. Check browser console for errors
4. Verify user has BANK role

### Issue 4: Progress Bar Not Updating
**Symptoms:** Progress stays at 0% after actions

**Solutions:**
1. Refresh page
2. Check API response in Network tab (F12)
3. Verify database was updated
4. Check `onRefresh` callback is working

### Issue 5: Console Errors
**Symptoms:** Red errors in browser console

**Solutions:**
1. Note the specific error message
2. Check if API endpoint exists
3. Verify data format matches expected types
4. Check import statements are correct

---

## ✅ Test Results Template

### Quick Status Check
- [ ] System running and healthy
- [ ] Login successful (bank_admin)
- [ ] All 9 tabs visible
- [ ] Tab 8 loads without errors
- [ ] PostDeliveryWorkflowPanel renders
- [ ] Can record payment
- [ ] Can record LC settlement
- [ ] Progress bar works
- [ ] No console errors

### Detailed Results
**Tab 8 Core Functionality:**
- [ ] KPI cards display: ___/4 visible
- [ ] Delivered shipments: _____ count
- [ ] Workflow panels: _____ rendered
- [ ] Record Payment: ✅ / ❌
- [ ] Record LC Settlement: ✅ / ❌
- [ ] Progress calculation: ✅ / ❌
- [ ] Role permissions: ✅ / ❌

**Integration Tests:**
- [ ] Tab navigation: ✅ / ❌
- [ ] Data persistence: ✅ / ❌
- [ ] Cross-portal workflow: ✅ / ❌
- [ ] Blockchain sync: ✅ / ❌
- [ ] Audit trail: ✅ / ❌

**Performance:**
- Tab load time: _____ seconds (target: <3s)
- Memory usage: _____ MB
- API response time: _____ ms

**Overall Status:**
- Total Tests: _____
- Passed: _____
- Failed: _____
- Pass Rate: _____%

**Production Ready?** [ ] Yes [ ] No [ ] With conditions

**Notes:**
_________________________________________________________
_________________________________________________________

---

## 📞 Getting Help

### If Tests Fail
1. **Check system logs:**
   - API: `api/api_debug.log`
   - UI: Browser console (F12)
   - Blockchain: Docker logs

2. **Verify database state:**
   ```sql
   SELECT * FROM post_delivery_workflow;
   SELECT * FROM shipments WHERE status = 'DELIVERED';
   ```

3. **Check documentation:**
   - `BANKS-PORTAL-TESTING-COMPLETE.md`
   - `POST-DELIVERY-WORKFLOW-INTEGRATION-COMPLETE.md`
   - `tests/banks-portal-manual-test-script.md`

4. **Review integration:**
   ```bash
   node tests/validate-banks-portal-integration.js
   ```

### If System Won't Start
1. **Stop all processes:**
   ```bash
   docker-compose down
   ```

2. **Restart:**
   ```bash
   START-SYSTEM.bat
   ```

3. **Check health:**
   ```bash
   curl http://localhost:3001/health
   ```

---

## 🎉 Success Criteria

### Minimum Viable (MVP)
- ✅ Tab 8 loads without errors
- ✅ PostDeliveryWorkflowPanel displays
- ✅ Can record payment
- ✅ Can record LC settlement
- ✅ Progress bar updates

### Production Ready
All MVP criteria PLUS:
- ✅ KPI cards accurate
- ✅ Role permissions enforced
- ✅ Blockchain integration works
- ✅ Audit trail logging
- ✅ Error handling graceful
- ✅ Performance acceptable (<3s load)
- ✅ No memory leaks
- ✅ Cross-browser compatible
- ✅ Mobile responsive

### Enterprise Grade
All Production Ready criteria PLUS:
- ✅ >95% automated test pass rate
- ✅ Comprehensive manual testing complete
- ✅ Security audit passed
- ✅ Accessibility compliance (WCAG AA)
- ✅ Load testing passed
- ✅ Disaster recovery tested
- ✅ Documentation complete

---

## 📝 Final Checklist

Before marking as **COMPLETE**:

### Code Quality
- [x] TypeScript compiles: `cd ui && npm run type-check`
- [x] No linting errors
- [x] Code reviewed
- [x] Tests written

### Functionality
- [ ] All 8 critical test cases passed
- [ ] Manual testing complete
- [ ] Automated tests run successfully
- [ ] Integration tests passed

### Documentation
- [x] User guide created
- [x] Test plan documented
- [x] API endpoints documented
- [x] Database schema documented

### Deployment
- [ ] Environment variables checked
- [ ] Database migrations applied
- [ ] Monitoring configured
- [ ] Backup tested

---

## 🚀 Ready to Test!

**You now have:**
1. ✅ Automated test suite (Playwright)
2. ✅ Manual test script (comprehensive)
3. ✅ Interactive test runner (bat file)
4. ✅ Integration validator (quick check)
5. ✅ Complete documentation
6. ✅ Database queries
7. ✅ Blockchain verification commands
8. ✅ Troubleshooting guide

**Choose your path:**
- **Fast track:** Run automated tests (15 min)
- **Thorough:** Manual testing (90 min)
- **Balanced:** Interactive runner (30-60 min)
- **Quick check:** Validation script (2 min)

**Execute now:**
```bash
# Option 1: Automated
npx playwright test tests/banks-portal-automated.test.js

# Option 2: Interactive
tests\run-banks-portal-tests.bat

# Option 3: Manual
start tests\banks-portal-manual-test-script.md

# Option 4: Quick
node tests\validate-banks-portal-integration.js
```

---

**Good luck with testing! 🎯**

**Status:** ✅ All testing resources ready  
**Last Updated:** September 1, 2026  
**Version:** 1.0.0

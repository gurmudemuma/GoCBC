# Deployment Checklist - Workflow Fixes

**Date:** 2026-09-03  
**Status:** ✅ ALL CORRECTIONS IMPLEMENTED

---

## ✅ Implementation Status

### 1. API Changes
- [✅] New endpoint added: `GET /api/v1/documents/:documentId/verify-signatures`
- [✅] FabricService and CryptoUserService imported
- [✅] Database query fixed (username join)
- [✅] Blockchain signature verification logic implemented
- [✅] X.509 certificate retrieval added
- [✅] API builds successfully (no TypeScript errors)

### 2. UI Changes
- [✅] BlockchainSignatureVerification.tsx component created (16KB, 460+ lines)
- [✅] Component integrated into ExporterPortal contract detail dialog
- [✅] Token key fixed in DocumentManagementPanel (4 instances)
- [✅] Workflow guidance alert added to Shipments tab
- [✅] "Create Shipment" button disabled without forex
- [✅] Helpful tooltips and warning messages added
- [✅] "Request LC" navigation button added
- [✅] Warning alert in Create Shipment dialog
- [✅] Info icon imported
- [✅] UI builds successfully (57 pages generated)

### 3. Documentation
- [✅] CREATE-SHIPMENT-FLOW.md created
- [✅] WORKFLOW-FIXES-COMPLETE.md created
- [✅] DEPLOYMENT-CHECKLIST.md created (this file)

---

## 🚀 Deployment Steps

### Step 1: Restart API Server
```bash
# Stop current API server (Ctrl+C if running in terminal)
# Or kill the process

# Start API server
cd api
npm start
```

**Expected Output:**
```
info: ✅ PostgreSQL connected
info: 🚀 CECBS API Server running on port 3001
```

### Step 2: Restart UI Server (if needed)
```bash
# If UI server is running separately, restart it
cd ui
npm run dev
# Or for production: npm start
```

**Expected Output:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 3: Clear Browser Cache
```
1. Open browser (Chrome/Firefox/Edge)
2. Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
3. Select "Cached images and files"
4. Click "Clear data"
5. OR just hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### Step 4: Test Login
```
1. Go to http://localhost:3000
2. Login as exporter (e.g., username: testexporter, password: password123)
3. Verify no 401 authentication errors in console
4. Verify navigation works correctly
```

---

## 🧪 Testing Checklist

### Test 1: Blockchain Signature Verification
- [ ] Login as exporter
- [ ] Go to Shipments tab
- [ ] Click "View Details" on a PENDING contract
- [ ] Scroll to "Blockchain-Verified Digital Signatures"
- [ ] Verify signatures are displayed
- [ ] Expand an accordion
- [ ] Verify X.509 certificate details are shown:
  - [ ] Common Name (CN)
  - [ ] Organization (O)
  - [ ] Organizational Unit (OU)
  - [ ] Country (C)
  - [ ] Serial Number
  - [ ] Issuer
  - [ ] Valid From/Until dates
  - [ ] SHA-256 Fingerprint
- [ ] Verify transaction ID is displayed
- [ ] Verify verification status (VERIFIED ✅)
- [ ] Click refresh button - should reload data

**Expected Result:** All signatures show blockchain verification with full certificate details

---

### Test 2: Workflow Guidance
- [ ] Login as exporter
- [ ] Go to Shipments tab
- [ ] Verify info alert at top explains 3-step workflow
- [ ] Find a PENDING contract without forex
- [ ] Verify "Create Shipment" button is DISABLED (grayed out)
- [ ] Hover over disabled button
- [ ] Verify tooltip says: "Request Letter of Credit first..."
- [ ] Click the disabled button
- [ ] Verify warning dialog appears explaining next steps
- [ ] Click bank icon button next to View Details
- [ ] Verify it navigates to "My Contracts" tab OR shows info message
- [ ] Verify info message explains how to request LC

**Expected Result:** Clear guidance at every step, no confusion

---

### Test 3: Create Shipment Without Forex (Should Fail Gracefully)
- [ ] Login as exporter
- [ ] Click "Register New Shipment" button (top right of Shipments tab)
- [ ] Verify dialog opens
- [ ] Verify warning alert: "⚠️ No Contracts with Forex Allocation Available"
- [ ] Verify contract dropdown shows contracts
- [ ] Find a contract with ⏳ (awaiting forex allocation)
- [ ] Verify it says "(awaiting forex allocation)"
- [ ] Try to select it
- [ ] Verify it's disabled (can't select)

**Expected Result:** Cannot create shipment without forex, clear explanation why

---

### Test 4: Complete Workflow (Request LC → Create Shipment)
- [ ] Login as exporter
- [ ] Go to "My Contracts" tab
- [ ] Find an approved contract (status: APPROVED)
- [ ] Click "Request LC" button (bank icon in Actions column)
- [ ] Fill out LC request form:
  - [ ] Beneficiary: Your company name
  - [ ] Amount: Auto-filled from contract
  - [ ] Advising Bank: Select your bank
  - [ ] Validity: 90 days (default)
  - [ ] Shipping terms: Fill as needed
- [ ] Click "Submit LC Request"
- [ ] Verify success message
- [ ] Verify LC appears in "Forex & Banking" tab with status REQUESTED

**Now switch to Bank:**
- [ ] Logout exporter
- [ ] Login as bank officer (e.g., username: bankAdmin, password: password123)
- [ ] Go to Banks Portal
- [ ] Navigate to "Letter of Credit" tab
- [ ] Find the LC request (status: REQUESTED)
- [ ] Click "Approve Request" button
- [ ] Verify status changes to APPROVED
- [ ] Click "Issue LC" button
- [ ] Fill MT700 details if prompted
- [ ] Click "Issue"
- [ ] Verify status changes to ISSUED
- [ ] Verify forex is automatically allocated
- [ ] Check "Forex Allocations" section
- [ ] Verify forex record exists with status: ALLOCATED

**Back to Exporter:**
- [ ] Logout bank officer
- [ ] Login as exporter again
- [ ] Go to Shipments tab
- [ ] Find the same contract (now has forex)
- [ ] Verify "Create Shipment" button is ENABLED (purple color)
- [ ] Verify no ⏳ icon, instead ✅ icon
- [ ] Hover over button
- [ ] Verify tooltip says: "Create shipment from this approved contract (LC issued & forex allocated)"
- [ ] Click "Create Shipment"
- [ ] Verify dialog opens
- [ ] Verify contract dropdown shows ✅ before contract ID
- [ ] Verify green success alert: "✅ Forex Allocated for this Contract"
- [ ] Verify forex details shown (amount, rate, retention)
- [ ] Select the contract
- [ ] Fill shipment details:
  - [ ] Quantity (must be ≤ contract quantity)
  - [ ] Origin region
  - [ ] Grade
  - [ ] ICO Number (auto-filled)
  - [ ] ECX Lot Number (auto-filled or manual)
  - [ ] Channel (ECX/Direct Export/Union)
  - [ ] Bond Reference (if Direct Export)
  - [ ] EUDR compliance checkbox
- [ ] Click "Create Shipment"
- [ ] Verify success message
- [ ] Verify shipment appears in Shipments table
- [ ] Verify status: CREATED (or similar)
- [ ] Verify contract no longer shows in PENDING rows

**Expected Result:** Complete workflow works smoothly with forex

---

### Test 5: Authentication (No 401 Errors)
- [ ] Login as exporter
- [ ] Open browser console (F12)
- [ ] Go to Console tab
- [ ] Clear console
- [ ] Navigate to Shipments tab
- [ ] Click "View Details" on a contract
- [ ] Look at console - verify NO 401 errors
- [ ] Verify documents load successfully
- [ ] Verify blockchain signatures load
- [ ] Check Network tab
- [ ] Find request to `/api/v1/documents/entity/...`
- [ ] Verify status: 200 OK (not 401)
- [ ] Find request to `/api/v1/documents/.../verify-signatures`
- [ ] Verify status: 200 OK (not 401)

**Expected Result:** All API calls succeed, no authentication errors

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized Errors
**Symptoms:** API returns 401, documents don't load, "Authentication required" message

**Solution:**
1. Clear browser localStorage:
   ```javascript
   // Open browser console (F12)
   localStorage.clear();
   location.reload();
   ```
2. Login again
3. If still fails, check API logs for authentication issues
4. Verify JWT_SECRET is set in API .env file

---

### Issue: "Create Shipment" Button Still Shows as Enabled Without Forex
**Symptoms:** Button is clickable even though no forex allocated

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Verify UI build was successful
3. Check browser console for JavaScript errors
4. Verify `forexStatuses` array is being populated:
   ```javascript
   // In browser console
   console.log(window.__NEXT_DATA__)
   ```

---

### Issue: Blockchain Signatures Show "NOT FOUND ON BLOCKCHAIN"
**Symptoms:** All signatures show as not verified

**Solution:**
1. Check if Hyperledger Fabric network is running:
   ```bash
   docker ps | grep peer
   docker ps | grep orderer
   ```
2. Verify chaincode is deployed:
   ```bash
   docker logs peer0.ecta.cecbs.et 2>&1 | grep coffee
   ```
3. Check API logs for blockchain connection errors
4. Verify signatures were actually written to blockchain:
   - Check `document_signatures` table for `blockchain_tx_id`
   - If null, signatures were never written to blockchain
   - Need to re-sign documents or run migration

---

### Issue: Database Query Errors
**Symptoms:** API logs show SQL errors about missing columns

**Solution:**
1. Verify PostgreSQL is running
2. Check database schema matches code
3. Run migrations if needed:
   ```bash
   cd api
   node dist/migrations/run-migrations.js
   ```

---

## 📊 Success Metrics

After deployment, verify:

- [ ] **Zero 401 errors** in browser console
- [ ] **Blockchain signatures display** with verification status
- [ ] **X.509 certificates show** complete details
- [ ] **Workflow guidance** is clear and helpful
- [ ] **Create Shipment button** behaves correctly (disabled without forex, enabled with forex)
- [ ] **Complete workflow** works end-to-end (LC request → forex allocation → shipment creation)
- [ ] **No user confusion** about next steps
- [ ] **All tests pass** as per checklist above

---

## 📝 Post-Deployment Tasks

### Immediate (Within 1 hour)
- [ ] Monitor API logs for errors
- [ ] Monitor browser console for JavaScript errors
- [ ] Test with real user account
- [ ] Verify all features work in production

### Short-term (Within 1 day)
- [ ] Gather user feedback
- [ ] Document any issues discovered
- [ ] Create user training materials if needed
- [ ] Update user guides with new workflow

### Long-term (Within 1 week)
- [ ] Analyze usage patterns
- [ ] Optimize performance if needed
- [ ] Consider additional improvements based on feedback
- [ ] Plan next iteration

---

## 🎯 Rollback Plan (If Needed)

If critical issues are discovered:

### Step 1: Identify the Issue
- Check API logs: `cd api && npm run logs`
- Check browser console errors
- Document the specific problem

### Step 2: Quick Fixes
- If authentication issue: Clear localStorage, restart API
- If UI issue: Hard refresh browser, clear cache
- If blockchain issue: Restart Fabric network

### Step 3: Rollback Code (Last Resort)
```bash
# Revert API changes
cd api
git checkout HEAD~1 src/routes/documents.ts
npm run build

# Revert UI changes
cd ui
rm src/components/documents/BlockchainSignatureVerification.tsx
git checkout HEAD~1 src/components/portals/ExporterPortal.tsx
git checkout HEAD~1 src/components/documents/DocumentManagementPanel.tsx
npm run build
```

### Step 4: Restart Services
```bash
# Restart API
cd api
npm start

# Restart UI (if needed)
cd ui
npm run dev
```

---

## ✅ Sign-Off

**Implemented by:** Kiro AI Assistant  
**Date:** 2026-09-03  
**Version:** 1.0  

**Changes Verified:**
- [✅] API builds without errors
- [✅] UI builds without errors  
- [✅] New files created successfully
- [✅] Existing files modified correctly
- [✅] Documentation complete

**Ready for Deployment:** ✅ YES

**Approved by:** ________________  
**Date:** ________________

---

**Next Review:** 2026-09-10 (1 week after deployment)


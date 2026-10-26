# 🧪 Blockchain Verification - Testing Guide

## Quick Testing Checklist

Use this guide to verify blockchain verification is working in all 7 implemented portals.

---

## 🔴 PRE-TESTING REQUIREMENTS

### 1. Hard Refresh Browser
**CRITICAL**: After build deployment, users MUST hard refresh:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`
- **Alternative**: Clear browser cache

### 2. System Running
Ensure all services are running:
```bash
# Check backend API
curl http://localhost:3001/health

# Check blockchain network
docker ps | grep peer

# Check UI
curl http://localhost:3000
```

### 3. Test User Accounts
Ensure you have login credentials for:
- ✅ Exporter user
- ✅ Bank user
- ✅ ECTA user
- ✅ NBE user
- ✅ Customs user
- ✅ Shipping user

---

## ✅ PORTAL-BY-PORTAL TESTING

### Test #1: ExporterPortal - LC Verification

**Steps:**
1. Login as **Exporter** user
2. Navigate to **"LC & Payments"** tab
3. Click **"View Details"** on any LC
4. In the dialog, click **"🔐 Blockchain Verification"** tab
5. **Verify section displays:**
   - ✅ Green alert: "Hyperledger Fabric Blockchain..."
   - ✅ Summary card with signature counts
   - ✅ Signature accordions (expand one)
   - ✅ Blockchain TX ID visible (monospace font)
   - ✅ X.509 certificate table with CN, O, C, Serial, etc.
   - ✅ Status badge (VERIFIED/PENDING/MISMATCH)
   - ✅ Signer details (name, email, MSP ID)
6. Click **"🔄 Refresh Verification"** - should reload without error

**Expected Result:** ✅ All elements display correctly, no console errors

**Screenshot Areas:**
- Summary card
- Expanded signature with certificate
- Status badges

---

### Test #2: ExporterPortal - Contract Verification

**Steps:**
1. Still logged in as **Exporter**
2. Navigate to **"Contracts"** tab
3. Click **"View Details"** on any contract
4. **Scroll to bottom** of dialog (before Close button)
5. **Verify "🔐 Blockchain Verification" section displays:**
   - ✅ Green alert box
   - ✅ Summary card
   - ✅ Signature accordions
   - ✅ TX IDs, certificates, status badges
6. Expand a signature accordion
7. Verify certificate details table shows all fields

**Expected Result:** ✅ Section appears at bottom, all data displays

---

### Test #3: BanksPortal - LC Verification

**Steps:**
1. **Logout** from Exporter portal
2. Login as **Bank** user
3. Navigate to **"Letters of Credit"** tab
4. Click **"View Details"** on any LC
5. **Scroll to bottom** of LC Details dialog
6. **Verify "🔐 Blockchain Verification" section:**
   - ✅ Section appears before DialogActions (Close button)
   - ✅ Green alert + summary card + signatures
7. Test refresh button

**Expected Result:** ✅ Blockchain section displays correctly in Banks portal

---

### Test #4: ECTAPortal - Contract Verification

**Steps:**
1. **Logout** from Banks portal
2. Login as **ECTA** user
3. Navigate to **"Contracts"** tab
4. Click **"View Details"** on any contract
5. **Scroll to bottom** of contract details dialog
6. **Verify "🔐 Blockchain Verification" section:**
   - ✅ Paper section with blue background (#f0f9ff)
   - ✅ Alert + verification component
7. Expand signature, verify certificate fields

**Expected Result:** ✅ Section displays in ECTA portal style

---

### Test #5: NBEPortal - Contract Verification

**Steps:**
1. **Logout** from ECTA portal
2. Login as **NBE** user
3. Navigate to **"Contracts"** tab
4. Click **"View Details"** on any contract
5. **Scroll to bottom** of contract details dialog
6. **Verify "🔐 Blockchain Verification" section:**
   - ✅ Box section with verification component
   - ✅ All signature data displays
7. Check TX IDs are clickable/copyable (select text)

**Expected Result:** ✅ Section displays correctly in NBE portal

---

### Test #6: CustomsPortal - Declaration Verification

**Steps:**
1. **Logout** from NBE portal
2. Login as **Customs** user
3. Navigate to **"Declarations"** tab
4. Click **"View Details"** on any customs declaration
5. **Scroll to bottom** of declaration details dialog
6. **Verify "🔐 Blockchain Verification" section:**
   - ✅ Paper section appears after documents section
   - ✅ Alert mentions "customs declaration"
   - ✅ entityType="CUSTOMS_DECLARATION" is used
7. Verify signatures related to customs clearance

**Expected Result:** ✅ Declaration signatures display with blockchain proof

---

### Test #7: ShippingPortal - Shipment Verification

**Steps:**
1. **Logout** from Customs portal
2. Login as **Shipping** user
3. Navigate to **"Shipments"** tab
4. Click **"Track Shipment"** on any shipment
5. In tracking details dialog, **scroll down** past IoT sensor info
6. **Verify "🔐 Blockchain Verification" section:**
   - ✅ Box section appears before DialogActions
   - ✅ Alert mentions "Bill of Lading"
   - ✅ entityType="SHIPMENT" is used
7. Verify shipping-related signatures (shipping company, port authority, etc.)

**Expected Result:** ✅ Shipment blockchain verification displays correctly

---

## 🎨 VISUAL VERIFICATION CHECKLIST

For each portal tested, verify these visual elements:

### Layout:
- [ ] Section appears at bottom of dialog (before action buttons)
- [ ] Green alert box is visible and readable
- [ ] Summary card displays with proper spacing
- [ ] Accordions expand/collapse smoothly
- [ ] No layout overflow or text cutoff
- [ ] Responsive on smaller screens (optional)

### Content:
- [ ] Section title: "🔐 Blockchain Verification" with lock emoji
- [ ] Alert text mentions "Hyperledger Fabric Blockchain"
- [ ] Summary shows: Total, Verified, Failed, Pending counts
- [ ] Refresh button present and labeled "🔄 Refresh Verification"
- [ ] If no signatures: Shows "No signatures found" message
- [ ] If signatures exist: Accordions display with signer names

### Signature Details (when expanded):
- [ ] Signer name and organization visible
- [ ] Status badge shows correct color:
  - ✅ Green for VERIFIED
  - ⚠️ Yellow for NO_BLOCKCHAIN_TX
  - ❌ Red for MISMATCH
  - ⚪ Gray for BLOCKCHAIN_UNAVAILABLE
- [ ] Blockchain TX ID displayed in monospace font
- [ ] X.509 Certificate table shows all rows:
  - Common Name (CN)
  - Organization (O)
  - Organizational Unit (OU)
  - Country (C)
  - Serial Number
  - Issuer
  - Valid From / Valid Until
  - Fingerprint (SHA-256)
- [ ] Signer details show username, email, MSP ID

### Interactions:
- [ ] Accordions expand when clicked
- [ ] Refresh button reloads verification without closing dialog
- [ ] No JavaScript errors in browser console (F12)
- [ ] Loading states show briefly when refreshing
- [ ] TX IDs are selectable (can copy with mouse)

---

## ❌ COMMON ISSUES & SOLUTIONS

### Issue #1: Section Not Appearing
**Symptoms:** No blockchain verification section visible
**Causes:**
1. Browser cache - SOLUTION: Hard refresh (`Ctrl+Shift+R`)
2. Old build - SOLUTION: Verify build timestamp
3. Component import missing - SOLUTION: Check console for errors

### Issue #2: "No signatures found" Always Shows
**Symptoms:** Even entities with signatures show "no signatures found"
**Causes:**
1. Entity ID incorrect - SOLUTION: Check entityId prop
2. Backend not returning signatures - SOLUTION: Check API response in Network tab
3. entityType mismatch - SOLUTION: Verify entityType prop matches database

### Issue #3: Signatures Load Forever
**Symptoms:** Spinner/loading state never completes
**Causes:**
1. Blockchain network down - SOLUTION: Check `docker ps` for peer containers
2. API endpoint error - SOLUTION: Check browser Network tab for 500 errors
3. Database connection issue - SOLUTION: Check backend logs

### Issue #4: Certificate Fields Empty
**Symptoms:** X.509 table shows "N/A" for all fields
**Causes:**
1. Certificate not stored - SOLUTION: Normal for older records, re-sign entity
2. Certificate format issue - SOLUTION: Check certificate string in database
3. Parsing error - SOLUTION: Check browser console for certificate parse errors

### Issue #5: Status Always Shows PENDING
**Symptoms:** All signatures show yellow "NO_BLOCKCHAIN_TX"
**Causes:**
1. Blockchain TX not recorded - SOLUTION: Normal for new signatures, wait 30 seconds
2. Blockchain sync delay - SOLUTION: Check chaincode logs
3. Backend not querying blockchain - SOLUTION: Verify blockchain query function

---

## 🔍 DEBUGGING STEPS

### 1. Check Browser Console (F12)
Look for errors related to:
- Component rendering
- API calls failing
- Certificate parsing errors
- Blockchain query timeouts

### 2. Check Network Tab (F12 → Network)
Monitor API calls:
- `/api/signatures?entityType=X&entityId=Y` - Should return 200
- Response should contain signature array
- Check response time (should be < 2 seconds)

### 3. Check Backend Logs
```bash
# API logs
cd c:/goCBC/api
npm run dev  # Watch for signature query logs
```

Look for:
- Signature fetch queries
- Blockchain query attempts
- Certificate decode operations

### 4. Check Blockchain Network
```bash
# Verify peers are running
docker ps | grep peer

# Check peer logs
docker logs peer0.ecta.cecbs.et

# Query chaincode directly
docker exec -it peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"Args":["QuerySignature","SIG123"]}'
```

---

## 📊 TEST RESULTS TEMPLATE

Use this template to document your testing:

```
# Blockchain Verification - Test Results
**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Build Version:** [Git commit or build number]

## Portal Testing Results

| Portal | Entity Type | Section Visible | Data Complete | Status | Notes |
|--------|-------------|-----------------|---------------|--------|-------|
| ExporterPortal | LC | ✅ Yes | ✅ Yes | PASS | All signatures verified |
| ExporterPortal | CONTRACT | ✅ Yes | ✅ Yes | PASS | TX IDs visible |
| BanksPortal | LC | ✅ Yes | ⚠️ Partial | WARN | 1 signature pending |
| ECTAPortal | CONTRACT | ✅ Yes | ✅ Yes | PASS | |
| NBEPortal | CONTRACT | ✅ Yes | ✅ Yes | PASS | |
| CustomsPortal | DECLARATION | ✅ Yes | ✅ Yes | PASS | |
| ShippingPortal | SHIPMENT | ✅ Yes | ✅ Yes | PASS | |

## Issues Found

1. [Issue description]
   - **Severity:** High/Medium/Low
   - **Portal:** [Portal name]
   - **Steps to reproduce:** [Steps]
   - **Expected:** [What should happen]
   - **Actual:** [What actually happens]
   - **Screenshot:** [Link or attachment]

## Overall Assessment

- **Portals Tested:** 7/7
- **Passed:** X
- **Issues:** Y
- **Status:** ✅ READY FOR PRODUCTION / ⚠️ NEEDS FIXES / ❌ NOT READY

**Recommendation:** [Deploy / Fix issues first / Further testing needed]
```

---

## 🎯 ACCEPTANCE CRITERIA

The blockchain verification implementation is considered **successful** if:

### Functional:
- ✅ All 7 portals display blockchain verification section
- ✅ Sections appear in correct location (bottom of dialog)
- ✅ Signature data loads without errors
- ✅ TX IDs, certificates, and status badges display correctly
- ✅ Refresh button reloads data successfully
- ✅ "No signatures found" message shows for entities without signatures

### Visual:
- ✅ Layout matches portal design style
- ✅ Alert box is green and prominent
- ✅ Status badges show correct colors
- ✅ Text is readable and properly formatted
- ✅ No UI overflow or broken layouts

### Performance:
- ✅ Verification loads in < 3 seconds
- ✅ No memory leaks or performance degradation
- ✅ Refresh completes in < 2 seconds

### User Experience:
- ✅ Users understand what they're seeing
- ✅ Trust is increased (users feel confident)
- ✅ No confusion about blockchain proof
- ✅ Feature doesn't disrupt existing workflow

---

## ✅ FINAL SIGN-OFF

After completing all tests:

```
[X] All 7 portals tested
[X] All acceptance criteria met
[X] No critical issues found
[X] Documentation reviewed
[X] Screenshots captured
[X] Test results documented

**Signed:** ___________________
**Date:** ___________________
**Status:** APPROVED FOR PRODUCTION
```

---

**Happy Testing! 🚀**

If you encounter any issues not covered in this guide, document them and escalate to the development team.

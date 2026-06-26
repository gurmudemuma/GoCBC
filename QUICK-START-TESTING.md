# Quick Start Testing Guide - CBE Payment Methods

## Prerequisites

### System Requirements
- ✅ Blockchain network running (all peers, orderer)
- ✅ API server running on port 3001
- ✅ UI development server running on port 3000
- ✅ Database initialized with test data

### Test User Accounts
- **Banks User:** Login credentials for Banks organization
- **ECTA User:** For exporter registration
- **NBE User:** For contract approval

---

## Testing Workflow

### Step 1: Prepare Test Data (5 minutes)

#### 1.1 Register Exporter (ECTA Portal)
```
Login as: ECTA
Navigate to: Exporters Tab
Action: Register New Exporter
Fields:
  - Exporter ID: EXP_TEST001
  - Company Name: Test Coffee Exporter Ltd.
  - ECTA License: LIC2024001
  - Capital: 5000000 (5M ETB)
  - Lab Certified: Yes
  - Taster: John Doe
  - Certificate: CERT2024001
```

#### 1.2 Create Sales Contract (NBE Portal)
```
Login as: NBE
Navigate to: Contracts Tab
Action: Register New Contract
Fields:
  - Contract ID: CONTRACT_TEST001
  - Exporter: EXP_TEST001
  - Buyer: Germany Coffee Importers GmbH
  - Country: Germany
  - Buyer Bank: Deutsche Bank AG
  - Exporter Bank: Commercial Bank of Ethiopia
  - Coffee Type: Arabica Grade 1
  - Quantity: 10000 kg
  - Price: $5.50/kg
  - Total: $55,000
  - Currency: USD
```

#### 1.3 Approve Contract (NBE Portal)
```
Same NBE login
Navigate to: Pending Contracts
Action: Approve Contract (CONTRACT_TEST001)
```

---

### Step 2: Test Documentary Collection (10 minutes)

#### 2.1 Login and Navigate
```
Login as: Banks User
Navigate to: Banks Portal
Click Tab: "Payment Processing" (Tab 3)
```

#### 2.2 Initiate Collection
```
Click Button: "Documentary Collection (CAD)"
Wait for: Form dialog to open
Verify: Contract data auto-filled
```

#### 2.3 Fill CAD Form
```
Fields (auto-filled):
  ✅ Drawer: EXP_TEST001
  ✅ Drawee: Germany Coffee Importers GmbH
  ✅ Drawee Address: Germany
  ✅ Remitting Bank: Commercial Bank of Ethiopia

Fields (manual entry):
  - Payment Term: SIGHT
  - Collecting Bank: Deutsche Bank AG
  - Collecting Bank BIC: DEUTDEFF
  - Remitting Bank BIC: CBETETAA
  - Instructions: Present documents directly to drawee. Protest if unpaid.
```

#### 2.4 Submit and Verify
```
Action: Click "Send Collection"
Expected: Success notification appears
Check: Collection appears in Documentary Collections table
Verify Data:
  - Collection ID generated
  - Status: SENT
  - Payment Term: SIGHT (green chip)
  - Amount: $55,000
```

---

### Step 3: Test Advance Payment (10 minutes)

#### 3.1 Create New Contract
```
Repeat Step 1.2 with:
  - Contract ID: CONTRACT_TEST002
  - Total: $75,000
Then approve it (Step 1.3)
```

#### 3.2 Record Advance Payment
```
Navigate to: Tab 3 (Payment Processing)
Click Button: "Record Advance Payment"
Wait for: Form dialog to open
```

#### 3.3 Fill Advance Form
```
Fields (auto-filled):
  ✅ Amount: 75000

Fields (manual entry):
  - Credit Advice: CA2024-001
  - Paying Bank: Deutsche Bank AG
  - Paying Bank BIC: DEUTDEFF
  - SWIFT Reference: MT103-2024-001
  - Beneficiary Account: 1000123456789
```

#### 3.4 Submit and Verify
```
Action: Click "Record Payment & Issue Permit"
Expected: Success notification
Check: Record appears in Advance Payments table
Verify Data:
  - Payment ID generated
  - Status: RECEIVED
  - SWIFT Ref: MT103-2024-001
  - Amount: $75,000
```

---

### Step 4: Test Consignment (10 minutes)

#### 4.1 Issue Consignment Permit
```
Navigate to: Tab 3 (Payment Processing)
Click Button: "Consignment Permit"
Wait for: Form dialog to open
```

#### 4.2 Fill Consignment Form
```
Fields (manual entry):
  - Commodity Type: FRUITS
  - Estimated Value: 25000
  - Description: Fresh Ethiopian Oranges - Premium Grade
  - Buyer/Agent: European Fruit Distributors Ltd.
  - Buyer Address: Rotterdam, Netherlands
```

#### 4.3 Submit and Verify
```
Action: Click "Issue Consignment Permit"
Expected: Success notification
Check: Record appears in Consignments table
Verify Data:
  - Consignment ID generated
  - Status: PERMIT_ISSUED
  - Commodity: FRUITS (blue chip)
  - Permit Amount: $25,000
  - Outstanding: $25,000 (red text)
```

---

### Step 5: Verify Export Permits Table (5 minutes)

#### 5.1 Check All Permits
```
Scroll down to: Export Permits table
Expected: See all permits from tests above
```

#### 5.2 Verify Permit Data
```
Should contain:
1. Permit from Documentary Collection
   - Payment Method: CAD (purple chip)
   - Status: ISSUED
   - Outstanding: Yes (red chip)

2. Permit from Advance Payment
   - Payment Method: ADVANCE (green chip)
   - Status: ISSUED
   - Outstanding: Yes (red chip)

3. Permit from Consignment
   - Payment Method: CONSIGNMENT (orange chip)
   - Status: ISSUED
   - Outstanding: Yes (red chip)
```

---

### Step 6: Verify Summary Statistics (2 minutes)

#### 6.1 Check Summary Panel
```
Scroll to bottom: Payment Methods Summary
Verify Counts:
  - Documentary Collections: 1
  - Advance Payments: 1
  - Consignments: 1
  - Total Permits: 3+
```

---

## Expected Results Checklist

### UI Elements
- [ ] All 3 action buttons visible and enabled
- [ ] No warning alerts (contracts available)
- [ ] All 4 tables render correctly
- [ ] Empty states show for unused methods
- [ ] Summary statistics display correctly

### Forms
- [ ] CAD form opens and closes
- [ ] Advance form opens and closes
- [ ] Consignment form opens and closes
- [ ] Auto-fill works from contract data
- [ ] Manual fields accept input
- [ ] Submit buttons trigger API calls

### Data Display
- [ ] Documentary Collection appears in table
- [ ] Advance Payment appears in table
- [ ] Consignment appears in table
- [ ] Export Permits show all methods
- [ ] Status chips show correct colors
- [ ] Payment method chips show correct colors

### Notifications
- [ ] Success notifications appear
- [ ] Notifications contain correct IDs
- [ ] Notifications dismissible
- [ ] Error handling works (test by disconnecting API)

---

## Troubleshooting

### Issue: Buttons Disabled
**Symptom:** All action buttons grayed out
**Cause:** No NBE-approved contracts
**Fix:** 
1. Check NBE Portal for pending contracts
2. Approve at least one contract
3. Refresh Banks Portal
4. Verify contract status is "NBE_APPROVED"

### Issue: Form Won't Open
**Symptom:** Clicking button does nothing
**Cause:** No contracts loaded or dialog state issue
**Fix:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify contracts array has data
4. Reload page

### Issue: API Error on Submit
**Symptom:** Error notification after submit
**Cause:** API server down or blockchain not responding
**Fix:**
1. Check API server is running: `http://localhost:3001/api/v1/health`
2. Check blockchain network: `docker ps | grep peer`
3. Review API logs for errors
4. Verify exporter exists on blockchain

### Issue: Empty Tables
**Symptom:** All tables show empty state messages
**Cause:** No data created yet or API connection issue
**Fix:**
1. Complete test workflows above
2. Check browser Network tab for API responses
3. Verify API returns success: true
4. Check data arrays in state (React DevTools)

### Issue: Auto-fill Not Working
**Symptom:** Form fields empty when opening
**Cause:** Contract data structure mismatch
**Fix:**
1. Check browser console for errors
2. Verify contract object structure
3. Review PaymentMethodForms.tsx useEffect
4. Check field names match contract properties

---

## API Testing (Alternative)

### Using cURL or Postman

#### Get Auth Token
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"banks","password":"password"}'
```

#### Send Documentary Collection
```bash
curl -X POST http://localhost:3001/api/v1/collections/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionId": "CAD001",
    "contractId": "CONTRACT_TEST001",
    "exporterId": "EXP_TEST001",
    "permitId": "PERMIT001",
    "drawerName": "Test Exporter",
    "draweeName": "Test Importer",
    "draweeAddress": "Germany",
    "paymentTerm": "SIGHT",
    "amount": 55000,
    "currency": "USD",
    "collectingBank": "Deutsche Bank",
    "collectingBankBIC": "DEUTDEFF",
    "remittingBank": "CBE",
    "remittingBankBIC": "CBETETAA",
    "instructions": "Present documents",
    "documents": ["BL", "Invoice", "Packing List"]
  }'
```

#### Query Collections
```bash
curl http://localhost:3001/api/v1/collections \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Performance Benchmarks

### Expected Load Times
- Login: < 2 seconds
- Tab switch: < 500ms
- Form open: < 300ms
- API call: < 2 seconds (blockchain transaction)
- Data reload: < 1 second
- Table render: < 500ms

### Large Dataset Performance
- 100 records: Should load smoothly
- 500 records: May need pagination
- 1000+ records: Implement virtual scrolling

---

## Browser Console Checks

### Success Indicators
```javascript
// Check contracts loaded
console.log('[BANKS] ✅ Approved contracts available:', count);

// Check API responses
Network tab: Status 200 for all API calls

// Check state
React DevTools: 
  - contracts array populated
  - documentaryCollections array populated
  - advancePayments array populated
  - consignments array populated
```

### Error Indicators
```javascript
// Failed API calls
console.error('Failed to load banking data:', error);

// Missing data
console.warn('Could not load ...');

// Blockchain errors
'Peer endorsements do not match'
'Exporter does not exist'
```

---

## Post-Testing Verification

### Blockchain Verification
```bash
# Query blockchain directly
docker exec peer0.banks.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"Args":["QueryAllCollections"]}'
```

### Database Verification
```sql
-- Check if data persisted (if using DB)
SELECT * FROM documentary_collections;
SELECT * FROM advance_payments;
SELECT * FROM consignments;
SELECT * FROM export_permits;
```

---

## Success Criteria

### ✅ Test Passes If:
1. All 3 payment method forms submit successfully
2. All records appear in respective tables
3. Export permits table shows all 3 permits
4. Summary statistics show correct counts
5. Status chips display appropriate colors
6. No JavaScript errors in console
7. Notifications appear on each action
8. Data persists after page reload

### ❌ Test Fails If:
1. Forms don't open
2. Submit buttons don't work
3. API returns errors
4. Tables remain empty
5. JavaScript errors occur
6. Data doesn't persist
7. Blockchain transactions fail

---

## Next Steps After Testing

### If Tests Pass ✅
1. Test with multiple contracts
2. Test error scenarios (invalid data)
3. Test network disconnection handling
4. Test concurrent operations
5. User acceptance testing (UAT)
6. Security testing
7. Performance testing
8. Production deployment

### If Tests Fail ❌
1. Review error messages
2. Check system logs
3. Verify prerequisites
4. Re-check implementation
5. Debug with browser tools
6. Contact development team

---

**Estimated Testing Time:** 45 minutes
**Difficulty Level:** Intermediate
**Prerequisites:** System running, test user accounts
**Expected Outcome:** All 4 payment methods functional ✅

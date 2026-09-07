# LC Workflow Testing Checklist

## Test the Realistic Exporter-Initiated LC Workflow

---

## Prerequisites

- [ ] System is running (`START-SYSTEM.bat` or `start-all.ps1`)
- [ ] Blockchain network is up
- [ ] API server is running on port 3001
- [ ] UI is running on port 3000
- [ ] Test user accounts exist:
  - Exporter: `EXP2026001` or similar
  - Bank: Bank user with BANKS role
- [ ] At least one approved contract exists (status: `APPROVED` or `NBE_APPROVED`)

---

## Test Steps

### Part 1: Exporter Requests LC ✅

1. **Login as Exporter**
   - [ ] Navigate to `http://localhost:3000`
   - [ ] Login with exporter credentials
   - [ ] Verify you land on Exporter Portal

2. **Navigate to Contracts**
   - [ ] Click on "My Contracts" tab
   - [ ] Verify you see a list of your contracts
   - [ ] Find a contract with status `APPROVED` or `NBE_APPROVED`

3. **Check LC Request Button**
   - [ ] Verify the approved contract has a **bank icon button** (purple) in Actions column
   - [ ] Hover over button → tooltip says "Request Letter of Credit"
   - [ ] Verify contracts with existing LCs don't show the button

4. **Open LC Request Dialog**
   - [ ] Click the "Request LC" button
   - [ ] Verify LC Request Dialog opens
   - [ ] Check dialog shows:
     - Purple header with bank icon
     - Title: "Request Letter of Credit"
     - Contract ID shown
     - Info alert about LC process

5. **Review Contract Summary**
   - [ ] Verify contract details are shown:
     - Buyer name and country
     - Coffee type
     - Quantity
     - Total value and currency
   - [ ] All values match the contract

6. **Fill LC Request Form**
   - [ ] **Advising Bank**: Should be pre-filled with your bank name
   - [ ] **Beneficiary Name**: Should be pre-filled with your company name
   - [ ] **LC Amount**: Should be pre-filled with contract total value
   - [ ] **Currency**: Should match contract currency
   - [ ] **LC Validity (Days)**: Default 90 days - can modify
   - [ ] **Latest Shipment (Days)**: Default 60 days - can modify
   - [ ] **Transport Mode**: Select SEA or AIR
   - [ ] **Port of Loading**: Default "Djibouti Port" - can modify
   - [ ] **Port of Discharge**: Enter destination port
   - [ ] **Payment Terms**: Select from dropdown (Sight LC, Usance LC 30/60/90 days)
   - [ ] **Allow Partial Shipment**: Toggle on/off
   - [ ] **Allow Transhipment**: Toggle on/off (default ON)
   - [ ] **Special Instructions**: Optional text area

7. **Submit LC Request**
   - [ ] Verify "Submit LC Request" button is enabled when required fields filled
   - [ ] Click "Submit LC Request"
   - [ ] Verify loading state shows "Submitting..."
   - [ ] Wait for response

8. **Verify Success**
   - [ ] Success dialog appears with:
     - Title: "🏦 LC Request Submitted Successfully"
     - Message: "Letter of Credit {LC-ID} has been requested"
     - Details showing next steps:
       1. Bank reviews (1-2 days)
       2. Bank approves and issues LC (MT700)
       3. Buyer's bank confirms
       4. Bank allocates forex
       5. Proceed with shipment
   - [ ] LC Request Dialog closes
   - [ ] Click OK on success dialog

9. **Verify in Forex & Banking Tab**
   - [ ] Click on "Forex & Banking" tab
   - [ ] Scroll to LC section
   - [ ] Verify new LC appears in list
   - [ ] Check LC details:
     - LC ID format: `LC-{contractId}-{timestamp}`
     - Status: `REQUESTED`
     - Amount matches request
     - Currency matches request
     - Expiry date calculated correctly

10. **Check Dashboard KPIs**
    - [ ] Return to Dashboard tab
    - [ ] Verify "LC Requested" count increased by 1
    - [ ] All KPIs update correctly

---

### Part 2: Bank Reviews and Approves LC ✅

11. **Logout from Exporter**
    - [ ] Click user menu → Logout
    - [ ] Verify you're at login page

12. **Login as Bank User**
    - [ ] Enter bank user credentials
    - [ ] Verify you land on Banks Portal

13. **Navigate to LC Tab**
    - [ ] Click on "Letter of Credit" tab (Tab 0)
    - [ ] Verify you see list of LCs

14. **Find the Requested LC**
    - [ ] Look for LC with status `REQUESTED`
    - [ ] Verify it's the one you just created
    - [ ] Check details match:
      - Contract ID
      - Exporter ID
      - Amount and currency
      - Expiry date

15. **Approve the LC**
    - [ ] Click "Approve Request" button
    - [ ] Wait for confirmation
    - [ ] Verify success message
    - [ ] Check LC status changed to `APPROVED`

16. **Issue the LC**
    - [ ] Click "Issue LC" button
    - [ ] Wait for confirmation
    - [ ] Verify success message about MT700 SWIFT
    - [ ] Check LC status changed to `ISSUED`

17. **Verify Forex Auto-Creation**
    - [ ] Click on "Forex Allocation" tab (Tab 1)
    - [ ] Look for forex entry linked to this LC
    - [ ] Verify forex status is `REQUESTED`
    - [ ] Amount matches LC amount

18. **Allocate Forex**
    - [ ] Find the forex allocation
    - [ ] Click "Allocate Forex" button
    - [ ] Enter exchange rate (e.g., 115.5 ETB/USD)
    - [ ] Verify 40/60 split calculation shows correctly
    - [ ] Click "Confirm Allocation"
    - [ ] Verify forex status becomes `ALLOCATED`

---

### Part 3: Exporter Sees LC Status Update ✅

19. **Logout from Bank**
    - [ ] Click user menu → Logout

20. **Login as Exporter Again**
    - [ ] Login with same exporter credentials
    - [ ] Navigate to "Forex & Banking" tab

21. **Verify LC Status**
    - [ ] Find your LC in the list
    - [ ] Verify status is now `ISSUED` or `FOREX_ALLOCATED`
    - [ ] Click on LC to view details
    - [ ] Verify all information is correct

22. **Check Forex Allocation**
    - [ ] Scroll to Forex section
    - [ ] Verify forex shows `ALLOCATED` status
    - [ ] Check allocation details:
      - 40% USD retained
      - 60% converted to ETB
      - Exchange rate shown
    - [ ] Verify total matches LC amount

23. **Next Steps Alert**
    - [ ] Check if alert appears about forex allocation
    - [ ] Verify message instructs you to proceed with shipment
    - [ ] Optional: Try creating shipment with this contract

---

## Edge Cases & Error Handling

### Test Duplicate LC Prevention
- [ ] Try to request another LC for the same contract
- [ ] Verify "Request LC" button is hidden/disabled
- [ ] If button somehow accessible, API should reject with duplicate error

### Test Incomplete Form Submission
- [ ] Open LC request dialog
- [ ] Leave required fields empty (advising bank, beneficiary)
- [ ] Try to submit
- [ ] Verify "Submit" button is disabled
- [ ] Fill required fields
- [ ] Verify button becomes enabled

### Test Contract Without Approval
- [ ] Find a contract with status `REGISTERED` or `PENDING`
- [ ] Verify no "Request LC" button appears
- [ ] Only approved contracts should allow LC requests

### Test API Errors
- [ ] Stop the API server
- [ ] Try to submit LC request
- [ ] Verify error message appears
- [ ] Check message mentions API server connectivity
- [ ] Restart API and try again

### Test Blockchain Sync Issues
- [ ] Submit LC request
- [ ] Immediately reload page before blockchain syncs
- [ ] Verify LC appears after page loads (may take 2-3 seconds)

---

## Verification Queries (Optional)

### Check Blockchain State
```bash
# Check LC exists on blockchain
docker exec -it cli peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"Args":["ReadLC","LC-CONTRACT1234-1234567890"]}'
```

### Check API Logs
```bash
# View API logs for LC request
tail -f api/api_debug.log | grep "LC"
```

### Check Database
```bash
# If using Postgres for audit trail
psql -d cecbs -c "SELECT * FROM audit_logs WHERE entity_type='LC' ORDER BY timestamp DESC LIMIT 5;"
```

---

## Expected Results Summary

| Action | Expected Result |
|--------|-----------------|
| Exporter views approved contract | "Request LC" button visible |
| Exporter clicks button | LC Request Dialog opens with pre-filled data |
| Exporter submits form | Success message with LC ID, dialog closes |
| Exporter checks Forex & Banking tab | New LC appears with status REQUESTED |
| Bank views LC list | Requested LC appears in table |
| Bank approves LC | Status changes to APPROVED |
| Bank issues LC | Status changes to ISSUED, MT700 message sent |
| System auto-creates forex | Forex entry appears with REQUESTED status |
| Bank allocates forex | Forex status becomes ALLOCATED |
| Exporter views updated LC | Sees ISSUED/FOREX_ALLOCATED status |
| Exporter views forex | Sees ALLOCATED with 40/60 breakdown |

---

## Performance Metrics

- [ ] LC request submission: < 3 seconds
- [ ] Bank approval: < 2 seconds
- [ ] LC issuance: < 3 seconds
- [ ] Forex allocation: < 2 seconds
- [ ] Page reload after LC creation: < 5 seconds
- [ ] No UI freezing or lag
- [ ] No console errors (check browser DevTools)

---

## Accessibility Checks

- [ ] All buttons have tooltips
- [ ] Form labels are clear
- [ ] Error messages are descriptive
- [ ] Success messages are informative
- [ ] Dialog can be closed with ESC key
- [ ] Tab navigation works through form fields

---

## Browser Compatibility

Test on:
- [ ] Chrome/Edge (recommended)
- [ ] Firefox
- [ ] Safari (if on Mac)

---

## Known Limitations

1. **Blockchain Sync Delay**: LCs may take 2-3 seconds to appear after creation (blockchain consensus)
2. **Single LC per Contract**: Each contract can only have one LC
3. **No LC Amendment**: Once created, LC cannot be modified (would need new feature)
4. **No LC Cancellation**: Cannot cancel an LC after submission (would need bank approval flow)

---

## Troubleshooting

**LC Request Button Not Showing:**
- Check contract status is APPROVED or NBE_APPROVED
- Verify no existing LC for that contract
- Check if lcStatuses array loaded correctly (F12 console)

**LC Request Fails with "Exporter Not Registered":**
- Exporter must be registered on blockchain first
- Check: `docker exec -it cli peer chaincode query -C coffeechannel -n coffee -c '{"Args":["ReadExporter","EXP2026001"]}'`
- Re-register if needed

**LC Doesn't Appear After Creation:**
- Wait 3-5 seconds for blockchain sync
- Manually reload page
- Check API logs for errors
- Verify blockchain network is healthy

**Forex Not Auto-Created After LC Issuance:**
- Check API logs for forex creation
- Manually create forex if needed via Bank Portal
- This is a known issue if blockchain is slow to sync

---

## Test Complete ✅

**All tests passed?**
- [ ] Yes - LC workflow is working correctly
- [ ] No - Document issues below

**Issues Found:**
```
[Document any issues here]
```

**Test Completed By:** _____________
**Date:** _____________
**System Version:** _____________

---

**Status:** Ready for UAT
**Next Step:** Deploy to staging/production environment

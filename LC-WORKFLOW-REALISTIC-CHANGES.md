# LC Workflow - Realistic Implementation (Exporter-Initiated)

## Summary of Changes

Changed the Letter of Credit (LC) request workflow from **bank-initiated** to **exporter-initiated**, which aligns with real-world trade finance practices.

---

## Previous Workflow (Bank-Initiated) ❌

```
Contract Approved → Bank creates LC → Bank approves → Bank issues → Exporter ships
```

**Problems:**
- Unrealistic: In real trade finance, exporters request LCs from banks
- Banks don't proactively create LCs for contracts
- Exporters were passive participants

---

## New Workflow (Exporter-Initiated) ✅

```
Contract Approved → Exporter requests LC → Bank reviews & approves → Bank issues → Forex allocated → Exporter ships
```

**Realistic Flow:**
1. **Exporter** sees approved contract and clicks "Request LC" button
2. **Exporter** fills out LC request form with shipping terms
3. **Bank** receives LC request and reviews it
4. **Bank** approves the LC request  
5. **Bank** issues LC (sends MT700 SWIFT message)
6. **Bank** allocates forex per NBE policy
7. **Exporter** prepares shipment and submits documents
8. **Bank** examines documents and releases payment

---

## Files Modified

### 1. **ExporterPortal.tsx** ✅

**Added:**
- `lcRequestDialogOpen` state
- `selectedContractForLC` state
- `isRequestingLC` state
- `lcRequestForm` state with fields:
  - Advising bank (exporter's bank)
  - Beneficiary name
  - LC amount and currency
  - Validity period
  - Shipping terms (transport mode, ports)
  - Payment terms
  - Partial shipment / transhipment options

- `handleRequestLC()` function:
  - Generates LC ID
  - Calculates expiry dates
  - Calls `POST /banking/lc/request` API
  - Shows success message with next steps
  - Reloads data to show new LC request

**Updated:**
- Contract columns to add **"Request LC" button**:
  - Shows for contracts with status `APPROVED` or `NBE_APPROVED`
  - Only shows if no existing LC for that contract
  - Opens LC request dialog with pre-filled data
  
- Added **LC Request Dialog**:
  - Contract summary section
  - LC details form
  - Shipping terms section
  - Special instructions field
  - Submit button that calls `handleRequestLC()`

### 2. **BanksPortal.tsx** ✅

**Updated:**
- Success message when LC is created:
  ```typescript
  'Letter of Credit Request Received'
  'LC has been requested by exporter and is awaiting bank review'
  'Next Steps:
   1. Review the LC request details
   2. Click "Approve Request" to approve
   3. After approval, click "Issue LC" to send MT700 SWIFT
   4. Bank then allocates forex
   
   Note: In the updated workflow, exporters initiate LC requests, and banks review and approve them.'
  ```

**Bank Role:**
- Review incoming LC requests from exporters
- Approve LC requests (validates exporter, contract, compliance)
- Issue LC (sends MT700 SWIFT message)
- Allocate forex per NBE regulations
- Examine documents after shipment
- Release payment

---

## API Routes (No Changes Needed)

The existing API route `POST /banking/lc/request` already accepts requests from any authenticated user:

```typescript
// api/src/routes/banking.ts:54
router.post('/lc/request', [...validation], async (req, res) => {
  const { lcID, contractID, exporterID, bankName, amount, currency, expiryDate } = req.body;
  
  // Auto-maps contract data
  // Checks for duplicates
  // Calls RequestLC chaincode
  
  const result = await fabricService.requestLC(...);
  // Returns success with LC status REQUESTED
});
```

**No backend changes required** - the API is already role-agnostic and works for both exporters and banks.

---

## Chaincode (No Changes Needed)

The chaincode function `RequestLC` already handles LC creation correctly:

```go
// chaincodes/coffee/banking.go:78
func (c *CoffeeContract) RequestLC(ctx contractapi.TransactionContextInterface,
    lcID, contractID, exporterID, bankName, amountStr, currency, expiryDate string) error {
    
    // Creates LC with status "REQUESTED"
    // Stores on blockchain
    // Returns success
}
```

**No chaincode changes required** - it's already designed to accept LC requests from any party.

---

## User Experience

### Exporter Portal:
1. Exporter navigates to "My Contracts" tab
2. Sees list of contracts with statuses
3. For approved contracts, sees **Request LC** button (bank icon)
4. Clicks button → opens LC Request Dialog
5. Reviews contract summary
6. Fills in LC details (or accepts pre-filled values):
   - Advising bank (their bank)
   - Beneficiary name (their company)
   - LC amount (auto-filled from contract)
   - Validity period (default 90 days)
   - Shipping terms
7. Clicks "Submit LC Request"
8. Sees success message with next steps
9. Can track LC status in "Forex & Banking" tab

### Bank Portal:
1. Bank navigates to "Letter of Credit" tab
2. Sees incoming LC requests with status "REQUESTED"
3. Reviews LC details (contract, exporter, amount, terms)
4. Clicks "Approve Request" → status becomes "APPROVED"
5. Clicks "Issue LC" → sends MT700 SWIFT message, status becomes "ISSUED"
6. System auto-creates forex allocation request
7. Bank allocates forex → status becomes "FOREX_ALLOCATED"
8. Exporter prepares shipment
9. Exporter submits documents
10. Bank examines documents → status becomes "UTILIZED"
11. Bank releases payment → status becomes "PAYMENT_RELEASED"

---

## State Transitions

| Step | Status | Initiated By | Action |
|------|--------|--------------|--------|
| 1 | REQUESTED | Exporter | Submits LC request |
| 2 | APPROVED | Bank | Reviews and approves LC |
| 3 | ISSUED | Bank | Issues LC (MT700 SWIFT) |
| 4 | FOREX_ALLOCATED | Bank | Allocates forex per NBE policy |
| 5 | UTILIZED | Bank | Examines shipping documents |
| 6 | PAYMENT_RELEASED | Bank | Releases payment to exporter |
| 7 | SETTLED | System | Payment received and settled |

---

## Benefits of This Approach

✅ **Realistic**: Matches real-world trade finance practices
✅ **Compliant**: Follows UCP 600 (Uniform Customs & Practice for Documentary Credits)
✅ **Secure**: Banks review and approve all LC requests
✅ **Traceable**: Full audit trail from request to settlement
✅ **Efficient**: Exporters initiate when ready, banks respond promptly
✅ **Transparent**: Both parties can track status in real-time

---

## Testing the New Workflow

1. Login as Exporter (e.g., EXP2026001)
2. Navigate to "My Contracts" tab
3. Find an approved contract (status: APPROVED or NBE_APPROVED)
4. Click the bank icon (Request LC) in the Actions column
5. Review the LC Request Dialog
6. Fill in any missing details
7. Click "Submit LC Request"
8. Verify success message
9. Switch to "Forex & Banking" tab
10. Confirm new LC appears with status "REQUESTED"

11. Logout and login as Bank user
12. Navigate to "Letter of Credit" tab
13. Find the newly requested LC
14. Click "Approve Request"
15. Click "Issue LC"
16. Navigate to "Forex Allocation" tab
17. Allocate forex for the issued LC

---

## Next Steps (Optional Enhancements)

- Add LC request rejection flow (bank can reject with reason)
- Add LC amendment flow (exporter can request changes)
- Add email notifications when LC status changes
- Add LC expiry warnings/alerts
- Add LC document checklist validation
- Add automatic LC renewal options

---

## Rollback (If Needed)

If you need to revert to bank-initiated workflow:

1. Remove LC request button from ExporterPortal contract columns
2. Remove LC Request Dialog from ExporterPortal
3. Remove `handleRequestLC()` function
4. Remove LC request form states
5. Restore original Banks Portal messaging

However, the current implementation is more realistic and should be kept.

---

**Status:** ✅ **IMPLEMENTED AND READY FOR TESTING**

**Date:** 2026-09-03
**Implementation:** Complete
**Testing:** Ready

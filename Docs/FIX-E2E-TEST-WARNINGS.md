# E2E Test Warnings - Analysis & Solutions

## Current Warnings List

### Stage 2: Exporter Rejection
**Warning:** `Rejection workflow: continuing despite response format`
**Analysis:** Need to check if API returns `.success` or `.data` field
**Solution:** Check both response formats

### Stage 4: LC Amendment  
**Warning:** `LC amendment: endpoint exists but may need specific amendment workflow`
**Analysis:** Endpoint works but we're not checking all response formats
**Solution:** Enhance response validation

### Stage 4: LC Document Examination
**Warning:** `LC document examination: endpoint exists but may need documents to be uploaded first`
**Analysis:** Documents need to be uploaded to LC before examination
**Solution:** Upload documents to LC first, then examine

### Stage 5: Forex Repatriation
**Warning:** `Forex repatriation: endpoint exists but may need payment to be completed first`
**Status:** **EXPECTED BEHAVIOR** - Repatriation requires completed payment
**Solution:** Move after payment settlement OR accept as expected

### Stage 6: SWIFT Send/Rejection
**Warning:** `SWIFT send endpoint may not exist` / `SWIFT rejection endpoint may not exist`
**Analysis:** These are optional workflow endpoints
**Solution:** Check API routes to confirm if implemented

### Stage 7: Document Verify/Reject
**Warning:** `Document verification: may need specific document workflow`
**Analysis:** Using generic /sign endpoint with signatureType
**Solution:** Verify correct endpoint paths

### Stage 8: Document Signing
**Warning:** `Document signing: may need blockchain connectivity`
**Analysis:** Signing endpoint exists, check if it's working correctly
**Solution:** Validate signature was actually created

### Stage 9: Second Inspection Creation
**Warning:** `Second inspection creation failed`
**Analysis:** May be using wrong fields or workflow
**Solution:** Check required fields for inspection creation

### Stage 10: Second Customs Declaration
**Warning:** `Second customs declaration failed`
**Analysis:** May be duplicate detection or field validation
**Solution:** Check required fields and duplicate handling

---

## Priority Fixes

### HIGH PRIORITY (Actual Failures)
1. ✅ Stage 2: Exporter rejection response format
2. Stage 9: Second inspection creation  
3. Stage 10: Second customs declaration

### MEDIUM PRIORITY (Workflow Completeness)
4. Stage 4: LC document examination (upload docs to LC first)
5. Stage 4: LC amendment response validation
6. Stage 7: Document verify/reject workflow
7. Stage 8: Document signing validation

### LOW PRIORITY (Optional Features)
8. Stage 6: SWIFT send endpoint (may not be implemented)
9. Stage 6: SWIFT rejection endpoint (may not be implemented)
10. Stage 5: Forex repatriation (expected to need payment first)

---

## Implementation Plan

### Fix 1: Exporter Rejection (DONE)
- Check both `.success` and `.data` response fields
- Display actual error if both fail

### Fix 2: Second Inspection Creation
Check required fields for inspection rejection workflow

### Fix 3: Second Customs Declaration  
Check duplicate declaration handling

### Fix 4: LC Document Examination
Upload documents to LC before attempting examination

### Fix 5: Document Signing Validation
Verify signatures were actually created in blockchain


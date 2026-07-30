# Banks Portal - Backend API Coverage Status

**Last Updated**: $(date)

## Overview
This document tracks which backend API endpoints are being called by BanksPortal and their implementation status.

---

## ✅ PHASE 1: Currently Implemented & Working

### Contracts
- ✅ `GET /api/v1/contracts` - Load NBE-approved contracts
  - **Frontend**: Filters for `NBE_APPROVED` and `APPROVED` status
  - **Usage**: Base data for LC/Forex requests
  - **Status**: Working

### Letters of Credit (LC)
- ✅ `GET /api/v1/banking/lc` - Load all LCs
  - **Frontend**: Maps to `letterOfCredits` state
  - **Filters**:
    - `DOCUMENTS_SUBMITTED` → `lcsForExamination[]`
    - `DOCUMENTS_VERIFIED` → `lcsForPaymentRelease[]`
  - **Status**: Working

- ✅ `POST /api/v1/banking/lc/request` - Request new LC
  - **Frontend**: Used in LC creation dialog
  - **Status**: Working

- ✅ `POST /api/v1/banking/lc/:lcID/approve` - Approve LC request
  - **Frontend**: Used in LC approval actions
  - **Supports**: Bulk approval
  - **Status**: Working

- ✅ `POST /api/v1/banking/lc/:lcID/issue` - Issue approved LC
  - **Frontend**: Triggers LC issuance
  - **Status**: Working

- ✅ `POST /api/v1/banking/lc/:lcID/examine-documents` - Document examination
  - **Frontend**: Tab 3 (Document Examination)
  - **Required for**: Phase 1 completion
  - **Status**: Endpoint exists, UI integration needed

- ✅ `POST /api/v1/banking/lc/:lcID/release-payment` - Release payment
  - **Frontend**: Tab 4 (Payment Release)
  - **Required for**: Phase 1 completion
  - **Status**: Endpoint exists, UI integration needed

### Forex Allocations
- ✅ `GET /api/v1/forex` - Load all forex allocations
  - **Frontend**: Maps to `forexAllocations` state, passed to UnifiedPaymentWorkflow
  - **Status**: Working

- ✅ `POST /api/v1/forex/allocate` - Request forex allocation
  - **Frontend**: Used in Forex request dialog
  - **Status**: Working

- ✅ `POST /api/v1/forex/:forexID/approve` - Approve forex request
  - **Frontend**: Used in Forex approval actions
  - **Status**: Working

### Export Permits
- ✅ `GET /api/v1/permits` - Load all export permits
  - **Frontend**: Maps to `exportPermits` state
  - **Status**: Working

- ✅ `POST /api/v1/permits/issue` - Issue export permit
  - **Frontend**: Used in permit issuance dialog
  - **Status**: Working

### Consignments
- ✅ `GET /api/v1/banking/consignment/outstanding` - Load outstanding consignments
  - **Frontend**: Maps to `consignments` state
  - **Usage**: Tab 0 (Payment Methods → Consignment)
  - **Status**: Working

- ✅ `POST /api/v1/banking/consignment/register` - Register consignment
  - **Frontend**: Used in consignment registration
  - **Status**: Endpoint exists

- ✅ `PUT /api/v1/banking/consignment/:consignmentID/status` - Update consignment status
  - **Frontend**: Status transitions
  - **Status**: Endpoint exists

- ✅ `POST /api/v1/banking/consignment/:consignmentID/payment` - Record payment
  - **Frontend**: Payment recording
  - **Status**: Endpoint exists

- ✅ `GET /api/v1/banking/consignment/:consignmentID` - Get consignment details
  - **Frontend**: View details dialog
  - **Status**: Endpoint exists

### SWIFT Messages
- ✅ `GET /api/v1/swift/statistics` - Load SWIFT stats
  - **Frontend**: Tab 2 (SWIFT Messages) KPI cards
  - **Status**: Working

---

## ⚠️ PHASE 1: Missing Endpoints (High Priority)

### LC Amendments
- ❌ `POST /api/v1/banking/lc/:lcID/amend` - Request LC amendment
  - **Required for**: LC Amendment workflow
  - **Fields**: amendmentReason, newAmount, newExpiryDate, newTerms
  - **Priority**: HIGH
  - **Chaincode**: Needs `AmendLC` function

### Forex Details & Rejection
- ❌ `GET /api/v1/forex/:forexID` - Get forex details
  - **Required for**: Detailed forex view dialog
  - **Shows**: Retention breakdown, utilization status
  - **Priority**: MEDIUM

- ❌ `POST /api/v1/forex/:forexID/reject` - Reject forex request
  - **Required for**: Forex rejection workflow
  - **Fields**: rejectionReason
  - **Priority**: MEDIUM

---

## 🔶 PHASE 2: Extended Payment Methods (Not Yet Implemented)

### Documentary Collection (CAD)
- ❌ `GET /api/v1/banking/cad` - Get all collections
  - **Frontend**: Called but endpoint doesn't exist
  - **Workaround**: Returns empty array
  - **Priority**: PHASE 2

- ❌ `POST /api/v1/banking/cad` - Register collection
  - **Frontend**: CAD registration dialog
  - **Priority**: PHASE 2

- ❌ `PUT /api/v1/banking/cad/:collectionID/status` - Update status
  - **Frontend**: Status transitions
  - **Priority**: PHASE 2

- ❌ `POST /api/v1/banking/cad/:collectionID/payment` - Record payment
  - **Frontend**: Payment recording
  - **Priority**: PHASE 2

- ❌ `GET /api/v1/banking/cad/:collectionID` - Get details
  - **Frontend**: View details
  - **Priority**: PHASE 2

### Advance Payments
- ❌ `GET /api/v1/banking/payment/by-method/ADVANCE` - Get advance payments
  - **Frontend**: Called but endpoint doesn't exist
  - **Workaround**: Returns empty array
  - **Priority**: PHASE 2

- ❌ `POST /api/v1/banking/payment/:paymentID/receive-advance` - Record advance receipt
  - **Frontend**: Advance payment recording
  - **Priority**: PHASE 2

- ❌ `POST /api/v1/banking/payment/:paymentID/receive-balance` - Record balance receipt
  - **Frontend**: Balance payment recording
  - **Priority**: PHASE 2

---

## 🔷 PHASE 3: Advanced Features (Future)

### Payment Settlement
- ❌ `POST /api/v1/banking/payment/:paymentID/settle` - Settle payment
  - **Frontend**: Settlement dialog with retention calculation
  - **Priority**: PHASE 3

### Payment Status Management
- ❌ `PUT /api/v1/banking/payment/:paymentID/status` - Update payment status
  - **Frontend**: Manual status updates
  - **Priority**: PHASE 3

---

## Data Flow Summary

### Current Working Flow
```
1. Load Contracts (NBE-approved) → contracts[]
2. Load LCs → letterOfCredits[]
   ├─ Filter: DOCUMENTS_SUBMITTED → lcsForExamination[]
   └─ Filter: DOCUMENTS_VERIFIED → lcsForPaymentRelease[]
3. Load Forex → forexAllocations[]
4. Load Permits → exportPermits[]
5. Load Consignments → consignments[]
6. Load SWIFT Stats → swiftStats{}
7. CAD & Advance: Empty arrays (Phase 2)
```

### Tab Data Mapping
- **Tab 0 (Payment Methods)**: 
  - LC: `letterOfCredits[]`
  - CAD: `documentaryCollections[]` (empty - Phase 2)
  - Advance: `advancePayments[]` (empty - Phase 2)
  - Consignment: `consignments[]` ✅

- **Tab 1 (Forex Allocations)**: `forexAllocations[]` ✅

- **Tab 2 (SWIFT Messages)**: `swiftStats` ✅

- **Tab 3 (Document Examination)**: `lcsForExamination[]` ✅ (filtered from LCs)

- **Tab 4 (Payment Release)**: `lcsForPaymentRelease[]` ✅ (filtered from LCs)

---

## Recommendations

### Immediate (Before Production)
1. ✅ Verify `/banking/lc/:lcID/examine-documents` integration
2. ✅ Verify `/banking/lc/:lcID/release-payment` integration
3. ❌ Implement `/banking/lc/:lcID/amend` endpoint
4. ❌ Implement `/forex/:forexID` GET endpoint
5. ❌ Implement `/forex/:forexID/reject` endpoint

### Phase 2 (Extended Payment Methods)
1. Implement full CAD endpoint suite
2. Implement advance payment endpoints
3. Add payment method filtering/querying

### Phase 3 (Advanced Features)
1. Payment settlement with retention calculation
2. Manual status management
3. Advanced analytics and reporting

---

## Frontend Error Handling

The frontend gracefully handles missing endpoints:
- Uses `try-catch` blocks for all API calls
- Logs warnings instead of errors for Phase 2 features
- Sets empty arrays as defaults
- Shows informative console messages about missing features

Example:
```javascript
console.log('[BANKS] Documentary Collections: endpoint not yet implemented (Phase 2)');
setDocumentaryCollections([]);
```

---

## Testing Checklist

### Phase 1 (Core LC Workflow)
- [x] Load contracts
- [x] Create LC request
- [x] Approve LC
- [x] Issue LC
- [x] Load LCs for examination (filtered)
- [x] Load LCs for payment release (filtered)
- [ ] Examine documents (endpoint exists, test UI integration)
- [ ] Release payment (endpoint exists, test UI integration)
- [ ] Request LC amendment (endpoint missing)
- [x] Request forex allocation
- [x] Approve forex
- [ ] Reject forex (endpoint missing)
- [ ] View forex details (endpoint missing)

### Phase 2 (Extended Payment Methods)
- [ ] CAD registration
- [ ] CAD status updates
- [ ] Advance payment recording
- [ ] Consignment operations (partially done)

### Phase 3 (Advanced Features)
- [ ] Payment settlement
- [ ] Manual status updates
- [ ] Bulk operations
- [ ] Analytics and reporting

---

## Next Steps

1. **Complete Phase 1**: 
   - Test document examination UI
   - Test payment release UI
   - Implement missing LC amendment endpoint
   - Implement missing Forex endpoints

2. **Begin Phase 2**:
   - Design CAD chaincode functions
   - Implement CAD API endpoints
   - Implement Advance Payment endpoints
   - Update frontend to use new endpoints

3. **Documentation**:
   - Keep this status document updated
   - Document any new endpoints added
   - Update API specs/Swagger docs

# API Endpoint Audit for Testing

**Date:** 2026-11-10  
**Purpose:** Map all existing API endpoints with required fields before implementing tests

---

## 🏦 BANKING ROUTES (`/api/v1/banking/`)

### LC Operations

#### 1. **POST /lc/request** - Request LC
- **Auth:** EXPORTER, ECTA, ECTA_ADMIN, ADMIN
- **Required Fields:**
  - `contractId`
  - `lcNumber`
  - `amount`
  - `currency`
  - `expiryDate`
  - `terms`
  - `beneficiary`
  - `applicant`

#### 2. **POST /lc/:lcID/approve** - Approve LC
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcID` (param)

#### 3. **POST /lc/:lcID/reject** - Reject LC
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcID` (param)
  - `rejectionReason`

#### 4. **POST /lc/issue** - Issue LC
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcNumber`
  - `contractId`
  - (other LC details)

#### 5. **POST /lc/:lcID/issue** - Issue specific LC
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcID` (param)

#### 6. **POST /lc/:lcID/amend** - Amend LC ✅
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcID` (param)
  - `amendmentReason` (required)
  - `newAmount` (optional)
  - `newExpiryDate` (optional)
  - `newTerms` (optional)
- **Chaincode:** `AmendLC`

### LC Discrepancies

#### 7. **POST /lc/:lcId/discrepancy/report** - Report discrepancy ✅
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcId` (param)
  - `discrepancyId` (string)
  - `discrepancyType` (string)
  - `severity` ('MINOR' | 'MAJOR' | 'CRITICAL')
  - `affectedDocument` (string)
  - `description` (string)
  - `affectedClauses` (optional)
  - `recommendedAction` (optional)
- **Chaincode:** `ReportLCDiscrepancy`

#### 8. **POST /lc/:lcId/discrepancy/:discrepancyId/resolve** - Resolve discrepancy ✅
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcId` (param)
  - `discrepancyId` (param)
  - `resolution` (string)
  - `resolvedBy` (string)
- **Chaincode:** `ResolveLCDiscrepancy`

#### 9. **POST /lc/:lcId/discrepancy/:discrepancyId/waive** - Waive discrepancy ✅
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcId` (param)
  - `discrepancyId` (param)
  - `waiverReason` (string, min 10 chars)
  - `waivedBy` (string)
- **Chaincode:** `WaiveLCDiscrepancy`

#### 10. **POST /lc/:lcId/documents/reject** - Reject documents ✅
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcId` (param)
  - `rejectionReason` (string, 10-500 chars)
  - `rejectedBy` (string)
- **Chaincode:** `RejectLCDocuments`

#### 11. **GET /lc/:lcId/discrepancies** - Get LC discrepancies ✅
- **Auth:** Required
- **Returns:** Array of discrepancies

#### 12. **GET /lc/discrepancies/pending** - Get pending discrepancies ✅
- **Auth:** Required
- **Returns:** Array of LCs with unresolved discrepancies

### Document Examination & Payment

#### 13. **POST /lc/:lcID/examine-documents** - Examine documents
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcID` (param)
  - `compliant` (boolean)
  - `discrepancies` (string, optional)
  - `examinationDate` (optional)

#### 14. **POST /lc/:lcID/release-payment** - Release payment
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `lcID` (param)
  - `amount`
  - `currency`
  - `swiftReference`

### Payment Operations

#### 15. **POST /payment/initiate** - Initiate payment
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `contractId`
  - `paymentMethod` ('LC' | 'CAD' | 'TT_ADVANCE' | 'TT_POST' | 'ADVANCE')
  - `amount`
  - `currency`

#### 16. **POST /payment/:paymentID/settle** - Settle payment with retention ✅
- **Auth:** BANKS, BANK_ADMIN
- **Required Fields:**
  - `paymentID` (param)
  - `exchangeRate` (required)
  - `retentionRate` (required) - NBE policy: typically 40%
  - `payingBank` (required)
  - `payingBankBIC` (required)
  - `swiftReference` (optional)
  - `nbeApprovalRef` (optional)

#### 17. **POST /payment/:paymentID/submit-documents**
- **Auth:** BANKS, BANK_ADMIN

#### 18. **POST /payment/:paymentID/verify-documents**
- **Auth:** BANKS, BANK_ADMIN

#### 19. **POST /payment/:paymentID/release-documents**
- **Auth:** BANKS, BANK_ADMIN

### CAD (Cash Against Documents)

#### 20. **POST /cad** - Register documentary collection
- **Auth:** BANKS, BANK_ADMIN

#### 21. **PUT /cad/:collectionID/status** - Update CAD status
- **Auth:** BANKS, BANK_ADMIN

#### 22. **POST /cad/:collectionID/payment** - Record CAD payment
- **Auth:** BANKS, BANK_ADMIN

### Consignment

#### 23. **POST /consignment/register** - Register consignment
- **Auth:** BANKS, BANK_ADMIN

#### 24. **PUT /consignment/:consignmentID/status** - Update consignment
- **Auth:** BANKS, BANK_ADMIN

#### 25. **POST /consignment/:consignmentID/payment** - Record consignment payment
- **Auth:** BANKS, BANK_ADMIN

### Query Endpoints

#### 26. **GET /lc** - Get all LCs ✅
- **Auth:** Required
- **Query params:** status, contractId, etc.

#### 27. **GET /lc/:lcID** - Get specific LC ✅
- **Auth:** Required

#### 28. **GET /forex** - Get forex allocations ✅
- **Auth:** Required

#### 29. **GET /payments** - Get payments ✅
- **Auth:** Required

---

## 🏛️ NBE ROUTES (`/api/v1/nbe/`)

### Forex Management

#### 30. **GET /forex** - Get all forex allocations ✅
- **Auth:** Required
- **Query params:** `status`

#### 31. **POST /forex/:forexId/approve** - Approve forex ✅
- **Auth:** NBE
- **Required Fields:**
  - `forexId` (param)
  - Approval details

#### 32. **POST /forex/:forexId/repatriation** - Record repatriation ✅
- **Auth:** NBE
- **Required Fields:**
  - `forexId` (param)
  - `repatriationAmount`
  - `repatriationDate`
  - `swiftReference`
  - Additional repatriation details

#### 33. **GET /lc-monitoring** - Monitor LCs ✅
- **Auth:** Required
- **Returns:** LC monitoring data for NBE oversight

---

## 🚢 SHIPPING ROUTES (`/api/v1/shipping/`)

Need to investigate shipping.ts for:
- Bill of Lading operations
- Booking management
- Container operations
- Port operations

---

## 🛃 CUSTOMS ROUTES (`/api/v1/customs/`)

Need to investigate customs.ts for:
- Declaration amendments
- Duty calculation
- Valuation
- Clearance operations

---

## 👥 USER MANAGEMENT ROUTES (`/api/v1/users/` or `/api/v1/auth/`)

Need to investigate for:
- User registration
- Profile management
- Password operations
- RBAC verification

---

## 📋 FINDINGS - What Exists vs. What's Needed for Tests

### ✅ READY TO TEST (Endpoints Exist)

#### Banking - LC Amendments:
- **POST /banking/lc/:lcID/amend** ✅
  - Fields: `amendmentReason` (required), `newAmount`, `newExpiryDate`, `newTerms`
  - Test #45-49 can be implemented

#### Banking - LC Discrepancies:
- **POST /banking/lc/:lcId/discrepancy/report** ✅
- **POST /banking/lc/:lcId/discrepancy/:discrepancyId/resolve** ✅
- **POST /banking/lc/:lcId/discrepancy/:discrepancyId/waive** ✅
- **POST /banking/lc/:lcId/documents/reject** ✅
- **GET /banking/lc/:lcId/discrepancies** ✅
- **GET /banking/lc/discrepancies/pending** ✅
  - Test #50-52 can be implemented

#### NBE - Forex & Repatriation:
- **GET /nbe/forex** ✅
- **POST /nbe/forex/:forexId/approve** ✅
- **POST /nbe/forex/:forexId/repatriation** ✅
- **GET /nbe/lc-monitoring** ✅
  - Test #59-71 can be implemented (partial - need retention endpoints)

#### Banking - Payment Settlement:
- **POST /banking/payment/:paymentID/settle** ✅
  - Has `retentionRate` field (40% NBE policy)
  - Test #63-66 can be implemented

---

### ❓ NEED INVESTIGATION (Endpoints May Not Exist)

#### Banking - Advanced LC Operations:
- **LC Transfer to second beneficiary** - ❓ Need to search
- **Standby LC** - ❓ Need to search
- **Deferred Payment** - ❓ Need to search
- **Acceptance Financing** - ❓ Need to search
- **Payment at Sight** - ❓ Exists as part of LC flow
- **Forex Rate Application** - ✅ Part of settlement

#### Shipping - Complete Workflow:
- **Bill of Lading (various types)** - ❓ Need to check shipping.ts
- **Booking amendments** - ❓
- **Container operations** - ❓
- **Port operations** - ❓
- **Freight calculations** - ❓

#### Customs - Extended Features:
- **Declaration amendments** - ❓
- **Duty calculation** - ❓
- **Customs valuation** - ❓
- **Inspection failures** - ❓

#### User Management:
- **User registration** - ✅ Likely exists
- **Profile management** - ❓
- **Password reset** - ❓
- **RBAC verification** - ✅ Already implemented in middleware

---

## 🎯 NEXT STEPS

1. **Investigate Missing Endpoints:**
   - Check `/api/src/routes/shipping.ts` for Bill of Lading and container ops
   - Check `/api/src/routes/customs.ts` for amendment and duty calculation
   - Check `/api/src/routes/users.ts` or `/api/src/routes/auth.ts` for user management
   - Check `/api/src/routes/retention.ts` if exists

2. **Verify Chaincode Functions:**
   - Check if chaincode supports: LC transfer, Standby LC, Deferred payment
   - Verify acceptance financing exists

3. **Create Test Scenarios:**
   - **HIGH PRIORITY:** Tests for endpoints that definitely exist (amendments, discrepancies, forex)
   - **MEDIUM PRIORITY:** Tests for endpoints that likely exist but need field verification
   - **LOW PRIORITY:** Tests for endpoints that may need to be created first

4. **Field Validation:**
   - For each endpoint, verify:
     - Required vs optional fields
     - Field types and validation rules
     - Success/error response structures
     - Status code expectations

---

## 📝 RECOMMENDATION

**Don't write tests for endpoints that don't exist yet.**

Instead:
1. **Phase 1:** Write tests for confirmed endpoints (amendments, discrepancies, basic forex)
2. **Phase 2:** Investigate and document missing endpoints
3. **Phase 3:** Either create missing endpoints OR adjust test plan to focus on what exists
4. **Phase 4:** Implement tests for newly created endpoints

This ensures we're testing reality, not aspirations.

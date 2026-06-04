# Chaincode v1.4 Implementation Plan - Complete Workflow

**Target Version:** 1.4  
**Status:** Implementation in Progress  
**Date:** June 3, 2026

---

## Overview

This document outlines the implementation of all missing critical functions for chaincode v1.4, which will complete the end-to-end coffee export workflow.

---

## New Data Structures

### 1. LetterOfCredit
```go
type LetterOfCredit struct {
    LCID              string
    ContractID        string
    ExporterID        string
    BankName          string
    IssuingBank       string
    Amount            float64
    Currency          string
    Status            string // REQUESTED, APPROVED, ISSUED, UTILIZED
    ExpiryDate        string
    RequestDate       time.Time
    ApprovalDate      string
    IssueDate         string
    Documents         []string
}
```

### 2. ForexAllocation
```go
type ForexAllocation struct {
    ForexID           string
    ContractID        string
    ExporterID        string
    LCID              string
    RequestedAmount   float64
    AllocatedAmount   float64
    Currency          string
    ExchangeRate      float64
    Status            string // REQUESTED, APPROVED, ALLOCATED, UTILIZED
    RequestDate       time.Time
    ApprovalDate      string
    NBEOfficer        string
}
```

### 3. CustomsDeclaration
```go
type CustomsDeclaration struct {
    DeclarationID     string
    ContractID        string
    ExporterID        string
    LCID              string
    ForexID           string
    Quantity          float64
    TotalValue        float64
    Destination       string
    Status            string // SUBMITTED, UNDER_REVIEW, CLEARED, HELD, REJECTED
    SubmissionDate    time.Time
    ClearanceDate     string
    ClearanceNumber   string
    CustomsOfficer    string
    Documents         []string
}
```

### 4. PaymentSettlement
```go
type PaymentSettlement struct {
    PaymentID         string
    ContractID        string
    ExporterID        string
    LCID              string
    Amount            float64
    Currency          string
    ExchangeRate      float64
    AmountBirr        float64
    Status            string // PENDING, DOCUMENTS_SUBMITTED, VERIFIED, PAID
    PaymentDate       string
    ReceivingBank     string
}
```

### 5. ECXLot
```go
type ECXLot struct {
    LotID             string
    ExporterID        string
    CoffeeType        string
    Quantity          float64
    QualityGrade      string
    QualityScore      float64
    PricePerKg        float64
    Status            string // REGISTERED, TRADING, SOLD
}
```

---

## New Functions to Implement

### Banking Functions (8 functions)
1. `RequestLC()` - Exporter requests Letter of Credit
2. `ApproveLC()` - Bank approves LC
3. `IssueLC()` - Bank issues LC
4. `ReadLC()` - Get LC details
5. `UpdateLCStatus()` - Update LC status
6. `QueryLCsByExporter()` - List exporters LCs
7. `QueryLCsByStatus()` - Filter LCs by status
8. `LCExists()` - Check if LC exists

### NBE Forex Functions (7 functions)
9. `RequestForex()` - Request forex allocation
10. `AllocateForex()` - NBE allocates forex
11. `UtilizeForex()` - Mark forex as utilized
12. `ReadForex()` - Get forex details
13. `QueryForexByExporter()` - List exporter forex
14. `QueryForexByStatus()` - Filter by status
15. `ForexExists()` - Check if forex exists

### Customs Functions (8 functions)
16. `SubmitDeclaration()` - Submit customs declaration
17. `ReviewDeclaration()` - Customs reviews
18. `ClearDeclaration()` - Customs clears for export
19. `RejectDeclaration()` - Customs rejects
20. `ReadDeclaration()` - Get declaration details
21. `QueryDeclarationsByExporter()` - List declarations
22. `QueryDeclarationsByStatus()` - Filter by status
23. `DeclarationExists()` - Check existence

### Payment Functions (6 functions)
24. `InitiatePayment()` - Start payment process
25. `SubmitPaymentDocuments()` - Submit shipping docs
26. `VerifyPaymentDocuments()` - Bank verifies
27. `SettlePayment()` - Record payment received
28. `ReadPayment()` - Get payment details
29. `QueryPaymentsByExporter()` - List payments

### ECX Functions (6 functions)
30. `RegisterLot()` - Register coffee lot
31. `UpdateLotPrice()` - Update price
32. `UpdateLotStatus()` - Update status (SOLD, etc.)
33. `ReadLot()` - Get lot details
34. `QueryLotsByExporter()` - List exporter lots
35. `QueryLotsByStatus()` - Filter by status

---

## Implementation Priority

### Phase 1: Critical Functions (Week 1)
**Banking (4 core functions):**
- RequestLC()
- ApproveLC()
- ReadLC()
- QueryLCsByExporter()

**NBE (4 core functions):**
- RequestForex()
- AllocateForex()
- ReadForex()
- QueryForexByExporter()

**Customs (4 core functions):**
- SubmitDeclaration()
- ClearDeclaration()
- ReadDeclaration()
- QueryDeclarationsByExporter()

**Payment (3 core functions):**
- InitiatePayment()
- SettlePayment()
- ReadPayment()

**Total: 15 critical functions**

### Phase 2: Supporting Functions (Week 2)
- Status update functions
- Query/filter functions
- Existence checkers
- ECX lot management

**Total: 20 supporting functions**

---

## Workflow Integration

### Complete Workflow Sequence:
```
1. RegisterExporter (ECTA) ✅ Existing
2. UpdateExporterLaboratory (ECTA) ✅ Existing
3. RegisterLot (ECX) ⭐ NEW
4. RegisterSalesContract (Exporter) ✅ Existing
5. RequestLC (Exporter → Bank) ⭐ NEW
6. ApproveLC (Bank) ⭐ NEW
7. RequestForex (Bank → NBE) ⭐ NEW
8. AllocateForex (NBE) ⭐ NEW
9. SubmitDeclaration (Exporter → Customs) ⭐ NEW
10. ClearDeclaration (Customs) ⭐ NEW
11. CreateShipment (Exporter) ✅ Existing
12. UpdateShipmentStatus (Shipping) ✅ Existing
13. InitiatePayment (Exporter) ⭐ NEW
14. SettlePayment (Bank) ⭐ NEW
```

---

## State Machine Validation

### LC Status Flow:
```
REQUESTED → APPROVED → ISSUED → UTILIZED → EXPIRED
```

### Forex Status Flow:
```
REQUESTED → APPROVED → ALLOCATED → UTILIZED
```

### Declaration Status Flow:
```
SUBMITTED → UNDER_REVIEW → CLEARED
          ↓
        HELD / REJECTED
```

### Payment Status Flow:
```
PENDING → DOCUMENTS_SUBMITTED → VERIFIED → PAID
```

---

## Access Control Matrix

| Function | ECTA | ECX | Banks | NBE | Customs | Shipping | Exporter |
|----------|------|-----|-------|-----|---------|----------|----------|
| RequestLC | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ApproveLC | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| RequestForex | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| AllocateForex | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| SubmitDeclaration | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ClearDeclaration | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| RegisterLot | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| SettlePayment | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Testing Strategy

### Unit Tests:
- Test each function independently
- Validate state transitions
- Test error conditions

### Integration Tests:
- Test complete workflow A→Z
- Test multi-org interactions
- Test concurrent operations

### Scenarios:
1. Happy Path: Complete export from registration to payment
2. LC Rejection: Handle rejected LC
3. Customs Hold: Handle held goods
4. Forex Shortage: Handle insufficient forex

---

## Deployment Strategy

### Version 1.4 Deployment:
1. Build new chaincode with all functions
2. Package as coffee_1.4.tar.gz
3. Install on all 6 peers
4. Approve with sequence 5
5. Commit to channel
6. Test with sample transactions

### Backward Compatibility:
- All existing v1.3 functions remain unchanged
- New functions additive only
- No breaking changes to data structures

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All 15 critical functions implemented
- ✅ All 5 new data types defined
- ✅ Unit tests passing
- ✅ Chaincode compiles without errors
- ✅ Successfully deployed to test environment

### Phase 2 Complete When:
- ✅ All 35 total functions implemented
- ✅ Integration tests passing
- ✅ Complete workflow tested end-to-end
- ✅ Portal UIs connected to new functions
- ✅ Documentation updated

---

## Timeline

| Phase | Tasks | Duration | Status |
|-------|-------|----------|--------|
| Planning | Analysis & Design | 1 day | ✅ Complete |
| Phase 1 | Critical Functions | 3-4 days | 🔄 Starting |
| Phase 2 | Supporting Functions | 2-3 days | ⏳ Pending |
| Testing | Unit + Integration | 2 days | ⏳ Pending |
| Deployment | Build & Deploy v1.4 | 1 day | ⏳ Pending |
| **Total** | | **8-10 days** | |

---

## Next Steps

1. ✅ Create data structure definitions
2. 🔄 Implement 15 critical functions
3. ⏳ Write unit tests
4. ⏳ Build and test locally
5. ⏳ Deploy to blockchain
6. ⏳ Update API backend
7. ⏳ Update portal UIs

---

**Status:** Ready to begin implementation  
**Estimated Completion:** June 11-13, 2026  
**Risk Level:** Low (additive changes only)

# Ethiopian Coffee Export Contract Approval Workflow

## Overview
This document describes the correct workflow for sales contract approval in the CECBS system, following Ethiopian coffee export regulations.

## Workflow Steps

### 1. Contract Registration (Exporter)
- **Actor**: Coffee Exporter
- **Action**: Registers sales contract with buyer details
- **Chaincode Function**: `RegisterSalesContract()` or `RegisterSalesContractWithPaymentMethod()`
- **API Endpoint**: `POST /api/v1/contracts`
- **Result**: Contract status = `REGISTERED`

### 2. Export Compliance Approval (ECTA)
- **Actor**: ECTA (Ethiopian Coffee & Tea Authority)
- **Role**: Reviews and approves export compliance, quality standards, and export licenses
- **Action**: Approves contract for export
- **Chaincode Function**: `ApproveSalesContract()`
- **Required MSP**: `ECTAMSP`
- **API Endpoint**: `POST /api/v1/contracts/:contractID/approve`
- **Result**: Contract status = `APPROVED`

### 3. Foreign Exchange Allocation (NBE)
- **Actor**: NBE (National Bank of Ethiopia)
- **Role**: Allocates foreign exchange for approved export contracts
- **Action**: Allocates forex with retention policy
- **Chaincode Function**: `AllocateForex()`
- **Required MSP**: `NBEMSP` or `BanksMSP`
- **API Endpoint**: `POST /api/v1/forex/allocate`
- **Result**: Forex allocated, contract can proceed to LC issuance and shipment

## Important Notes

### ECTA's Role
- **Primary responsibility**: Export compliance and quality control
- **Authority**: Can approve or reject sales contracts
- **Validation**: Ensures contracts meet minimum FOB price requirements (e.g., $5.00/kg)
- **Documentation**: Issues export permits and quality certificates

### NBE's Role
- **Primary responsibility**: Foreign exchange management
- **Authority**: Allocates forex for ECTA-approved contracts
- **Policy enforcement**: Implements retention policies (e.g., 40% USD, 60% ETB)
- **Regulation**: Sets exchange rates and forex allocation limits

## Chaincode Changes (v1.32)

### Modified Function: ApproveSalesContract
```go
// OLD (Incorrect):
if mspID != "NBEMSP" {
    return fmt.Errorf("only NBE can approve sales contracts, got: %s", mspID)
}

// NEW (Correct):
if mspID != "ECTAMSP" {
    return fmt.Errorf("only ECTA can approve sales contracts, got: %s", mspID)
}
```

### Separate Function for Forex: AllocateForex
```go
func (c *CoffeeContract) AllocateForex(
    ctx contractapi.TransactionContextInterface,
    forexID, lcID, amountStr, exchangeRateStr, 
    retentionRateStr, officer, approvalRef, expiryDate string
) error {
    // Only NBE or Banks can allocate forex
    if mspID != "NBEMSP" && mspID != "BanksMSP" {
        return fmt.Errorf("only NBE or Banks can allocate forex")
    }
    // ... allocation logic
}
```

## API Changes

### Updated Endpoint: `/api/v1/contracts/:contractID/approve`
- **Old behavior**: Required NBE authentication, called `ApproveSalesContract`
- **New behavior**: Requires ECTA authentication, calls `ApproveSalesContract`
- **Authorization**: `userOrg === 'ECTAMSP'` or `userRole === 'ECTA'`

### Deprecated Endpoint: `/api/v1/contracts/:contractID/nbe-approve`
- **Status**: Deprecated
- **Reason**: NBE should use forex allocation endpoints, not contract approval
- **Migration**: Use forex allocation endpoints instead

## UI Updates Needed

### ECTA Portal
- ✅ Keep contract approval functionality
- ✅ Button should call: `POST /api/v1/contracts/:contractID/approve`
- ✅ Shows contracts with status `REGISTERED`
- ✅ After approval, status changes to `APPROVED`

### NBE Portal
- ❌ Remove or disable contract approval button
- ✅ Add forex allocation functionality
- ✅ Shows contracts with status `APPROVED` (by ECTA)
- ✅ Allocates forex using `AllocateForex` function
- ✅ Tracks forex allocations separately from contract approvals

## Status Flow

```
REGISTERED (Exporter creates contract)
    ↓
APPROVED (ECTA approves for export compliance)
    ↓
[Forex Allocated] (NBE allocates forex - separate entity)
    ↓
[LC Issued] (Bank issues Letter of Credit)
    ↓
[Shipment Ready] (Exporter proceeds with export)
```

## Testing

### Test ECTA Approval
```bash
# Login as ECTA user
# Navigate to contract list
# Click "Approve" on a REGISTERED contract
# Should succeed and change status to APPROVED
```

### Test NBE Forex Allocation
```bash
# Login as NBE user
# Navigate to forex allocation page
# Select an APPROVED contract
# Allocate forex with retention policy
# Should create forex allocation record
```

## References
- Chaincode v1.32 (Sequence 5)
- Ethiopian NBE Directive FXD/01/2024
- ECTA Export Regulations
- Minimum FOB Price Policy: $5.00/kg for commercial grades

## Migration Notes
- Existing contracts approved by "NBE" before this change should be treated as ECTA-approved
- NBE should focus on forex allocation moving forward
- Update user training materials to reflect correct workflow
- Update UI labels and help text to clarify roles

---
**Last Updated**: 2026-07-13  
**Chaincode Version**: 1.32  
**Document Status**: Active

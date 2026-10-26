# NBE Role in Coffee Export - Actual Implementation Guide

**Date**: July 13, 2026  
**Source**: National Bank of Ethiopia Official Directives (FXD/01/2024, July 2024 Reforms)

---

## Executive Summary

Recent NBE reforms (2024-2025) have **DECENTRALIZED** most operational approvals to commercial banks. NBE now focuses on **policy-setting and monitoring**, not individual transaction approvals.

---

## NBE's ACTUAL Responsibilities

### 1. **Exchange Rate Management** ✅
- **Sets daily reference exchange rates** for all currencies
- Publishes rates showing average from previous business day
- **Spread limit**: 2% between buying and selling rates (guideline, not strict)
- **Implementation**: `SetExchangeRate()` chaincode function

### 2. **Forex Retention Policy** ✅
**Current Policy (Post-July 2024)**:
- Exporters retain **50%** in Foreign Exchange Retention Account
- Must surrender **50%** to transacting bank within 30 days
- **Service exporters**: Can retain 100%

**Old Policy (Pre-2024)**: Was 70% surrender, 30% retention

**Implementation**: 
- `retentionRate` parameter in `AllocateForex()` (typically 50.0)
- Banks enforce the 50/50 split

### 3. **FEMoUS System Monitoring** ✅
- **Foreign Exchange Management System** (FEMoUS)
- Automates permit applications, delinquency tracking, forex reporting
- **Real-time monitoring** of all forex transactions
- **Implementation**: Blockchain provides audit trail

### 4. **Regulatory Directives** ✅
- Issues Foreign Exchange Directives (FXD)
- Sets policies for banks to follow
- Updates regulations (not case-by-case approvals)

---

## What NBE Does NOT Do (Post-2024 Reforms)

### ❌ Individual LC Approvals
**OLD**: NBE approved each Letter of Credit  
**NEW** (2025): **Banks authorize LCs** for:
- Institutions with foreign currency accounts
- Retention account holders
- **No prior NBE approval required**

**Impact on Implementation**:
- Remove NBE approval step from LC workflow
- Banks issue LCs directly
- NBE monitors via FEMoUS

### ❌ Individual Forex Allocation Approvals
**OLD**: NBE approved each forex allocation request  
**NEW**: **Policy-based automatic allocation**
- If exporter has LC and meets criteria → Bank allocates
- NBE sets the policy, banks execute

**Impact on Implementation**:
- `AllocateForex()` can be called by BANK (not just NBE)
- NBE sets retention rate policy (50%)
- Banks allocate within policy limits

### ❌ Export Permit Approvals
**NEW** (2025): Banks issue export permits
- No NBE pre-approval
- Banks verify compliance with NBE policies

---

## Correct Workflow Implementation

### **Coffee Export Workflow** (Post-2024 Reforms)

```
1. EXPORTER → Registers, gets ECX certificate
   
2. EXPORTER → Applies for LC at BANK
   ↓
3. BANK → Issues LC (no NBE approval needed)
   Status: LC_ISSUED
   
4. EXPORTER → Requests forex allocation from BANK
   ↓
5. BANK → Allocates forex (following NBE 50/50 policy)
   Status: FOREX_ALLOCATED
   50% to retention account
   50% must be surrendered within 30 days
   
6. EXPORTER → Ships coffee, gets documents
   ↓
7. BANK → Processes payment
   - Uses retention account funds (50%)
   - Converts surrendered 50% at NBE rate
   
8. BANK → Reports to NBE via FEMoUS
   
9. NBE → Monitors compliance (no approval needed)
```

### **NBE Touchpoints** (Monitoring Only)

1. **Daily**: Publishes exchange rates
2. **Real-time**: FEMoUS monitors all transactions
3. **Monthly**: Reviews bank compliance reports
4. **As-needed**: Issues policy directives

---

## Required Code Changes

### 1. **Remove NBE Approval Requirements**

**WRONG** (Current):
```typescript
// POST /api/v1/forex/allocate — NBE allocates forex
await fabricService.connectAsOrg('NBEMSP'); // ❌ WRONG
```

**CORRECT**:
```typescript
// POST /api/v1/forex/allocate — Bank allocates forex per NBE policy
// Uses bank's credentials (CBEMSP, etc.)
// No NBE approval required
```

### 2. **Update AllocateForex Access Control**

**WRONG** (Current chaincode):
```go
// Only NBE can allocate forex
if mspID != "NBEMSP" {
    return fmt.Errorf("unauthorized: only NBE can allocate")
}
```

**CORRECT**:
```go
// Banks allocate forex following NBE policy
if mspID != "NBEMSP" && !isBankMSP(mspID) {
    return fmt.Errorf("unauthorized: only NBE or Banks can allocate")
}
```

### 3. **Update Retention Rate**

**WRONG**:
```go
retentionRate := 70.0 // Old policy
```

**CORRECT**:
```go
retentionRate := 50.0 // Current NBE policy (July 2024)
```

### 4. **Add Exchange Rate Reference**

```go
// Banks must use NBE published rate
exchangeRate := getCurrentNBERate(currency)
// Apply within 2% spread limit
```

### 5. **LC Workflow Change**

Remove NBE approval step:
```
EXPORTER → Requests LC
BANK → Issues LC (using bank's authority)
// No NBE involvement
```

---

## Implementation Priority

### **HIGH PRIORITY** (Blocking Production)
1. ✅ Remove NBE-only restriction on `AllocateForex`
2. ✅ Allow banks to allocate forex
3. ✅ Update retention rate to 50%
4. ✅ Remove NBE approval steps from UI

### **MEDIUM PRIORITY**
1. ✅ Add automatic NBE rate lookup
2. ✅ Enforce 2% spread limit
3. ✅ Add FEMoUS-style monitoring dashboard

### **LOW PRIORITY** (Enhancement)
1. Policy compliance checks
2. Historical rate comparison
3. Surrender tracking (30-day deadline)

---

## References

- [NBE FX Directive Amendment (2025)](https://nbe.gov.et/nbe_news/notice-on-fx-directive-amendement-and-rationalization-of-fees-and-charges-on-letters-of-credit/)
- [NBE Forex Relaxation Directive (2024)](https://nbe.gov.et/nbe_news/public-notice-notice-on-relaxation-of-foreign-exchange-directives-fxd-01-2024/)
- [EY Ethiopia FX Reforms Analysis](https://www.ey.com/en_gl/technical/tax-alerts/ethiopia-makes-major-changes-to-foreign-exchange-regime)
- [Trade.gov Ethiopia Finance Directive](https://www.trade.gov/market-intelligence/ethiopia-finance-launches-new-forex-directive)

---

**Content rephrased for compliance with licensing restrictions**

# Remaining Blockchain-First Implementation Guide

**Date:** September 18, 2026  
**Current Coverage:** 27/46 endpoints (59% across ALL routes, 96% for critical business routes)  
**Status:** Action plan for remaining 19 endpoints

---

## Overview

After implementing blockchain-first pattern across all critical business routes (documents, customs, banking, forex, payments, shipments, contracts), there are **19 additional endpoints** across 4 route files that could be converted to blockchain-first pattern.

### Current State
- **Critical Business Routes:** 26/27 endpoints (96%) ✅
- **All Routes Including System/Admin:** 27/46 endpoints (59%)

### Remaining Endpoints by Priority

| Route File | Endpoints | Priority | Reason |
|------------|-----------|----------|---------|
| **quality.ts** | 6 | HIGH | Business-critical quality inspections |
| **lc-amendments.ts** | 1 | MEDIUM | LC discrepancy tracking |
| **auth.ts** | 2 | LOW | Authentication (typically doesn't need blockchain) |
| **users.ts** | 9 | LOW | User management (administrative) |

---

## HIGH PRIORITY: Quality Inspections (6 endpoints)

**File:** `api/src/routes/quality.ts`

### Chaincode Functions Available
- `RequestInspection` - Exporter requests quality inspection
- `PerformInspection` - ECTA inspector records results
- `ApproveInspection` - ECTA officer approves inspection
- `RejectInspection` - ECTA officer rejects inspection

### Endpoints to Fix

#### 1. POST `/inspections` (Request Inspection)
**Current:** DB-first  
**Target:** Call `RequestInspection` chaincode BEFORE DB insert

```typescript
// ✅ BLOCKCHAIN-FIRST pattern
const blockchainResult = await fabricService.invokeChaincode(
  'RequestInspection',
  [inspectionID, shipmentID, contractID, exporterID, scheduledDate]
);
const blockchain_tx_id = blockchainResult?.txId || null;

// Then DB insert with blockchain_tx_id
await postgresDb.run(
  `INSERT INTO quality_inspections (..., blockchain_tx_id) VALUES (..., $n)`,
  [...values, blockchain_tx_id]
);
```

#### 2. POST `/inspections/:inspectionID/perform` (Perform Inspection)
**Current:** DB-first  
**Target:** Call `PerformInspection` chaincode BEFORE DB update

```typescript
const blockchainResult = await fabricService.invokeChaincode(
  'PerformInspection',
  [
    inspectionID, inspectorID, inspectorName,
    String(sampleSize), String(moistureContent), String(defectCount),
    beanSize, color, odor,
    String(fragrance), String(flavor), String(aftertaste),
    String(acidity), String(body), String(balance),
    String(uniformity), String(cleanCup), String(sweetness), String(overall)
  ]
);
const blockchain_tx_id = blockchainResult?.txId || null;

// Then DB update
await postgresDb.run(
  `UPDATE quality_inspections SET status = $1, ..., blockchain_tx_id = $2 WHERE inspection_id = $3`,
  ['INSPECTED', ..., blockchain_tx_id, inspectionID]
);
```

#### 3. POST `/inspections/:inspectionID/approve` (Approve Inspection)
**Current:** DB-first  
**Target:** Call `ApproveInspection` chaincode BEFORE DB update

```typescript
const blockchainResult = await fabricService.invokeChaincode(
  'ApproveInspection',
  [inspectionID, approvedBy, certificateNo]
);
const blockchain_tx_id = blockchainResult?.txId || null;

// Then DB update
await postgresDb.run(
  `UPDATE quality_inspections SET status = $1, approved_by = $2, certificate_no = $3, blockchain_tx_id = $4 WHERE inspection_id = $5`,
  ['APPROVED', approvedBy, certificateNo, blockchain_tx_id, inspectionID]
);
```

#### 4. POST `/inspections/:inspectionID/reject` (Reject Inspection)
**Current:** DB-first  
**Target:** Call `RejectInspection` chaincode BEFORE DB update

```typescript
const blockchainResult = await fabricService.invokeChaincode(
  'RejectInspection',
  [inspectionID, rejectedBy, rejectionReason]
);
const blockchain_tx_id = blockchainResult?.txId || null;

// Then DB update
await postgresDb.run(
  `UPDATE quality_inspections SET status = $1, rejected_by = $2, rejection_reason = $3, blockchain_tx_id = $4 WHERE inspection_id = $5`,
  ['REJECTED', rejectedBy, rejectionReason, blockchain_tx_id, inspectionID]
);
```

#### 5. POST `/inspections/:inspectionID/issue-permit` (Issue Export Permit)
**Current:** DB-first  
**Target:** Use `IssueExportPermit` chaincode (from permit.go)

```typescript
const blockchainResult = await fabricService.invokeChaincode(
  'IssueExportPermit',
  [permitID, shipmentID, contractID, exporterID, inspectionID, validUntil, remarks]
);
const blockchain_tx_id = blockchainResult?.txId || null;

// Then DB update
```

#### 6. POST `/inspections/:inspectionID/complete` (Complete Inspection)
**Current:** DB-first  
**Target:** Update status on blockchain first

```typescript
// Use PerformInspection or create CompleteQualityInspection chaincode function
```

### Database Schema Updates Needed
```sql
ALTER TABLE quality_inspections ADD COLUMN blockchain_tx_id TEXT;
CREATE INDEX idx_quality_inspections_blockchain_tx ON quality_inspections(blockchain_tx_id);
```

---

## MEDIUM PRIORITY: LC Amendments (1 endpoint)

**File:** `api/src/routes/lc-amendments.ts`

### Endpoint to Fix

#### POST `/:lcId/discrepancies` (Record LC Discrepancy)
**Current:** DB-first  
**Target:** Use `auditService.log` or create `RecordLCDiscrepancy` chaincode

```typescript
// Option 1: Using audit service (recommended for simpler tracking)
await auditService.log({
  entityType: 'LC_DISCREPANCY',
  entityId: discrepancyId,
  action: 'RECORD',
  performedBy: user.username,
  organization: 'BanksMSP',
  performedByOrg: 'BanksMSP',
  oldValue: '',
  newValue: 'PENDING',
  reason: `Discrepancy recorded: ${description}`,
  metadata: { lcId, discrepancyType, amount, description },
  ipAddress: req.ip
});

// Then DB insert
await postgresDb.run(
  `INSERT INTO lc_discrepancies (...) VALUES (...)`,
  [...]
);
```

### Chaincode Function (if needed)
Check if `RecordLCDiscrepancy` exists in banking.go, otherwise use audit service pattern.

---

## LOW PRIORITY: Authentication (2 endpoints)

**File:** `api/src/routes/auth.ts`

### Endpoints
1. POST `/refresh` (Refresh JWT token)
2. POST `/applicant/login` (Applicant login)

### Recommendation: **SKIP**
**Reason:** Authentication and session management typically don't require blockchain validation:
- Token refresh is a stateless operation
- Login attempts don't need immutable audit (database logging sufficient)
- High frequency operations (blockchain would add latency)
- Blockchain audit logs handle authentication events separately

**If blockchain tracking is desired:**
- Use `auditService.log` for login attempts
- Track authentication events in blockchain_audit_logs table
- Pattern already exists in auth.ts for successful logins

---

## LOW PRIORITY: User Management (9 endpoints)

**File:** `api/src/routes/users.ts`

### Endpoints
1. POST `/` (Create user)
2. PUT `/:userId` (Update user)
3. PUT `/:userId/password` (Update password)
4. PUT `/:userId/status` (Update status)
5. POST `/reset-password-by-identifier` (Reset password)
6. POST `/:userId/reset-password` (Reset password)
7. POST `/bulk-reset-passwords` (Bulk reset)
8. DELETE `/:userId` (Delete user)
9. PUT `/:userId/permissions` (Update permissions)

### Recommendation: **SELECTIVE**
Most user management operations are administrative and don't require blockchain consensus.

**Consider blockchain for:**
- ✅ User creation (POST `/`) - Creates system actors
- ✅ Permission updates (PUT `/:userId/permissions`) - Security-sensitive
- ✅ Status updates (PUT `/:userId/status`) - Activation/deactivation
- ❌ Password operations - Privacy-sensitive, don't store on blockchain
- ❌ Bulk operations - Administrative convenience, not business logic

### Pattern for User Creation
```typescript
// Record user registration on blockchain
await auditService.log({
  entityType: 'USER_ACCOUNT',
  entityId: userId,
  action: 'CREATE',
  performedBy: adminUser.username,
  organization: 'ECTAMSP', // or relevant MSP
  performedByOrg: adminUser.org,
  oldValue: '',
  newValue: 'ACTIVE',
  reason: `User account created: ${username}`,
  metadata: { username, role, email, organization },
  ipAddress: req.ip
});

// Then DB insert
await postgresDb.run(
  `INSERT INTO users (...) VALUES (...)`,
  [...]
);
```

---

## Implementation Priority Order

### Phase 1: Complete Business-Critical (DONE ✅)
- ✅ Documents (5/5)
- ✅ Customs (5/5)
- ✅ Banking (3/3)
- ✅ Forex (2/2)
- ✅ Payments (2/2)
- ✅ Shipments (3/3)
- ✅ Contracts (1/1)
- ✅ Exporters (5/6, 1 commented duplicate)

### Phase 2: Quality Operations (RECOMMENDED NEXT)
1. Fix quality.ts (6 endpoints) - High business value
2. Fix lc-amendments.ts (1 endpoint) - Medium business value

### Phase 3: User Management (OPTIONAL)
1. User creation, status, permissions (3 endpoints) - Security value
2. Skip password operations and bulk operations

### Phase 4: Authentication (SKIP)
- Authentication endpoints don't need blockchain validation
- Current audit logging is sufficient

---

## Expected Final Coverage

| Scenario | Endpoints | Coverage |
|----------|-----------|----------|
| **Current (Critical Only)** | 26/27 | 96% |
| **After Quality + LC** | 34/46 | 74% |
| **After User Management** | 37/46 | 80% |
| **Theoretical Maximum** | 44/46 | 96% |

**Note:** Auth endpoints (2) intentionally excluded from blockchain-first pattern.

---

## Testing After Implementation

### 1. Quality Inspection Test
```bash
curl -X POST http://localhost:3001/api/v1/quality/inspections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inspectionID": "INSP-TEST-001",
    "shipmentID": "SHP-001",
    "contractID": "CONTRACT-001",
    "exporterID": "EXP-001",
    "scheduledDate": "2026-09-20"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "inspectionID": "INSP-TEST-001",
    "blockchain_tx_id": "a1b2c3d4e5f6...",
    "status": "PENDING"
  }
}
```

### 2. Run Coverage Test
```bash
node test-blockchain-first-coverage.js
```

**Expected:** 74% coverage after quality.ts fixes

### 3. Check Blockchain Logs
```bash
grep "blockchain_tx_id" logs/api.log | tail -20
```

---

## Database Migration Script

```sql
-- Quality inspections
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT;
CREATE INDEX IF NOT EXISTS idx_quality_inspections_blockchain_tx 
  ON quality_inspections(blockchain_tx_id);

-- LC amendments/discrepancies
ALTER TABLE lc_discrepancies ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT;
CREATE INDEX IF NOT EXISTS idx_lc_discrepancies_blockchain_tx 
  ON lc_discrepancies(blockchain_tx_id);

-- Users (optional)
ALTER TABLE users ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_blockchain_tx 
  ON users(blockchain_tx_id);
```

---

## Chaincode Reference

### Quality Module (quality.go)
- `RequestInspection` - Line 103
- `PerformInspection` - Line 184
- `ApproveInspection` - Line 378
- `RejectInspection` - Line 600
- `ReadInspection` - Line 669
- `QueryInspectionsByShipment` - Line 690
- `QueryInspectionsByExporter` - Line 698

### Permit Module (permit.go)
- `IssueExportPermit` - Used by quality inspection completion
- `RevokePermit` - For rejections

### Banking Module (banking.go)
- Check for `RecordLCDiscrepancy` or use audit service

---

## Conclusion

**Current Achievement:** 96% coverage for critical business operations ✅

**Recommended Next Steps:**
1. Implement quality.ts fixes (6 endpoints) - **High business value**
2. Implement lc-amendments.ts fix (1 endpoint) - **Medium value**
3. Consider user management (3 selected endpoints) - **Security value**
4. Skip authentication endpoints - **Not applicable**

**Total Time Estimate:**
- Quality.ts: 2-3 hours
- LC amendments: 30 minutes
- User management: 1-2 hours
- **Total: 4-6 hours**

**Priority Justification:**
The current 96% coverage for critical business operations (documents, customs, banking, forex, payments, shipments) ensures all revenue-generating and compliance-critical operations are blockchain-validated. Quality inspections are the only remaining high-value business process not yet blockchain-first.

---

**Document Version:** 1.0  
**Created:** September 18, 2026  
**Status:** Action Plan for Remaining Implementation

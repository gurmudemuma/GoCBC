# Chaincode Business Logic Migration Plan

## Objective
Ensure ALL business logic executes in chaincode (blockchain) with multi-organizational consensus, not in API layer.

---

## Current Status Analysis

### ✅ Already in Chaincode (255 functions)
The chaincode already has comprehensive coverage:

| Module | Functions | Coverage |
|--------|-----------|----------|
| main.go | 46 | Exporters, Contracts, Shipments, Traceability |
| banking.go | 18 | Letter of Credit, LC Amendments, Discrepancies |
| forex.go | 22 | Forex allocation, confirmations, settlements |
| documents.go | 6 | Document hashing, verification |
| customs.go | 20 | Customs declarations, clearances, inspections |
| payment.go | 22 | Payment initiation, verification, settlement |
| quality.go | 13 | Quality inspections, lab tests, grading |
| permit.go | 11 | Export permits, CBE permits, utilization |
| ecx.go | 9 | ECX lot registration, grading, assignment |
| phytosanitary.go | ~15 | Phytosanitary certificates |
| insurance.go | ~15 | Insurance certificates, claims |
| swift.go | ~10 | SWIFT messages, MT700, MT760 |
| consignment.go | ~15 | Consignment tracking |
| advance.go | ~15 | Advance payments |
| collection.go | ~8 | Collections |
| **TOTAL** | **255+** | **Comprehensive** |

### ❌ Gaps: Direct DB Writes (bypassing blockchain)

#### 1. **Documents** (7 direct writes)
- `POST /documents/upload` - Inserts into `documents` table
- `POST /documents/:id/verify` - Inserts into `document_verifications`
- **FIX**: Call `RegisterDocumentHash` and `VerifyDocumentHash` chaincode functions

#### 2. **Exporters** (4 direct writes)  
- `POST /exporters/apply` - Inserts into `exporter_applications`
- `PUT /exporters/:id/reject` - Updates `exporter_applications.status`
- **FIX**: Call `RegisterExporter` chaincode (already exists) - just need to use it FIRST

#### 3. **Customs** (2 direct writes)
- `POST /customs/declarations` - Inserts into `customs_declarations`
- `POST /customs/clearances` - Inserts into `customs_clearances`
- **FIX**: Call `SubmitCustomsDeclaration` and `IssueClearance` (already exist)

#### 4. **Audit Logs** (scattered)
- Multiple routes insert into `audit_log` / `audit_trail` tables
- **FIX**: Create `RecordAuditLog` chaincode function

#### 5. **User Management** (6 direct writes)
- User registration, status updates, activity logs
- **DECISION**: Keep in API (not business logic, admin function)

---

## Architecture Pattern

### Current (Wrong) ✗
```
API Request → Validate → Write to DB → Call Blockchain (after the fact)
                          ↑ WRONG: State change before consensus
```

### Target (Correct) ✓
```
API Request → Validate → Call Blockchain → On Success → Update DB cache
                          ↑ RIGHT: Consensus FIRST, DB is read cache
```

---

## Implementation Plan

### Phase 1: Critical Business Logic (ALL transactions)

#### 1.1 Exporter Applications
**File**: `api/src/routes/exporters.ts`

**Current** (Line ~177):
```typescript
// ❌ WRONG: Direct DB insert
await db.query(
  `INSERT INTO exporter_applications (...) VALUES (...)`,
  [...]
);
```

**Fixed**:
```typescript
// ✅ RIGHT: Blockchain first
const blockchainResult = await fabricService.invokeChaincode('RegisterExporter', [
  exporterId, companyName, licenseNumber, address, phone, email, ...
]);

if (!blockchainResult.success) {
  throw new Error('Blockchain validation failed');
}

// Store TX ID and blockchain signature
await signatureService.recordSignature(
  'exporter_application',
  applicationId,
  blockchainResult.txId,
  blockchainResult.mspId,
  'ECTAMSP'
);

// THEN cache in DB for fast queries
await db.query(`INSERT INTO exporter_applications ...`);
```

#### 1.2 Document Upload & Verification
**File**: `api/src/routes/documents.ts`

**Current** (Line ~81, ~132):
```typescript
// ❌ WRONG: Direct DB insert
await db.query(`INSERT INTO documents (...) VALUES (...)`, [...]);
await db.query(`INSERT INTO document_verifications (...) VALUES (...)`, [...]);
```

**Fixed**:
```typescript
// ✅ RIGHT: Hash to blockchain
const docHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

const blockchainResult = await fabricService.invokeChaincode('RegisterDocumentHash', [
  documentId, docHash, documentType, lcId, shipmentId, uploadedBy
]);

// Verification
const verifyResult = await fabricService.invokeChaincode('VerifyDocumentHash', [
  documentId, docHash, verifiedBy, verificationStatus
]);

// Cache in DB
await db.query(`INSERT INTO documents ...`);
```

#### 1.3 Customs Declarations
**File**: `api/src/routes/customs.ts`

**Current** (Line ~479):
```typescript
// ❌ WRONG: Direct DB insert
await db.query(`INSERT INTO customs_declarations (...) VALUES (...)`, [...]);
```

**Fixed**:
```typescript
// ✅ RIGHT: Blockchain first
const blockchainResult = await fabricService.invokeChaincode('SubmitCustomsDeclaration', [
  declarationId, shipmentId, hsCode, customsValue, dutyAmount, taxAmount, ...
]);

await signatureService.recordSignature(
  'customs_declaration',
  declarationId,
  blockchainResult.txId,
  blockchainResult.mspId,
  'CustomsMSP'
);

// Cache in DB
await db.query(`INSERT INTO customs_declarations ...`);
```

### Phase 2: Add Missing Chaincode Functions

#### 2.1 Audit Logging
**New File**: `chaincodes/coffee/audit.go`

```go
package main

import (
    "encoding/json"
    "fmt"
    "time"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type AuditLog struct {
    LogID      string    `json:"logId"`
    UserID     string    `json:"userId"`
    Action     string    `json:"action"`
    EntityType string    `json:"entityType"`
    EntityID   string    `json:"entityId"`
    Details    string    `json:"details"`
    IPAddress  string    `json:"ipAddress"`
    Timestamp  time.Time `json:"timestamp"`
    MSPID      string    `json:"mspId"`
    CreatedBy  string    `json:"createdBy"`
}

func (c *CoffeeContract) RecordAuditLog(ctx contractapi.TransactionContextInterface,
    logID, userID, action, entityType, entityID, details, ipAddress string) error {
    
    // Get MSP identity
    mspID, err := ctx.GetClientIdentity().GetMSPID()
    if err != nil {
        return fmt.Errorf("failed to get MSP ID: %w", err)
    }

    creator, err := ctx.GetClientIdentity().GetID()
    if err != nil {
        return fmt.Errorf("failed to get creator: %w", err)
    }

    auditLog := AuditLog{
        LogID:      logID,
        UserID:     userID,
        Action:     action,
        EntityType: entityType,
        EntityID:   entityID,
        Details:    details,
        IPAddress:  ipAddress,
        Timestamp:  time.Now(),
        MSPID:      mspID,
        CreatedBy:  creator,
    }

    auditLogJSON, err := json.Marshal(auditLog)
    if err != nil {
        return fmt.Errorf("failed to marshal audit log: %w", err)
    }

    // Store with composite key for queries
    key := fmt.Sprintf("AUDIT_%s", logID)
    return ctx.GetStub().PutState(key, auditLogJSON)
}

func (c *CoffeeContract) QueryAuditLogsByEntity(ctx contractapi.TransactionContextInterface,
    entityType, entityID string) ([]*AuditLog, error) {
    
    // Query by entity
    queryString := fmt.Sprintf(`{
        "selector": {
            "entityType": "%s",
            "entityId": "%s"
        },
        "sort": [{"timestamp": "desc"}]
    }`, entityType, entityID)

    return c.queryAuditLogs(ctx, queryString)
}

func (c *CoffeeContract) queryAuditLogs(ctx contractapi.TransactionContextInterface,
    queryString string) ([]*AuditLog, error) {
    
    resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
    if err != nil {
        return nil, fmt.Errorf("failed to query audit logs: %w", err)
    }
    defer resultsIterator.Close()

    var logs []*AuditLog
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        var log AuditLog
        err = json.Unmarshal(queryResponse.Value, &log)
        if err != nil {
            return nil, err
        }
        logs = append(logs, &log)
    }

    return logs, nil
}
```

### Phase 3: Update All API Routes

**Pattern for all routes**:

```typescript
// BEFORE: Direct DB write
async function handleAction(req, res) {
  // Validation
  const { param1, param2 } = req.body;
  
  // ❌ WRONG
  const result = await db.query('INSERT INTO table ...', [param1, param2]);
  
  res.json({ success: true, id: result.rows[0].id });
}

// AFTER: Blockchain first
async function handleAction(req, res) {
  // Validation
  const { param1, param2 } = req.body;
  
  // ✅ RIGHT: Blockchain consensus FIRST
  const blockchainResult = await fabricService.invokeChaincode('ActionName', [
    param1, param2, ...
  ]);
  
  if (!blockchainResult.success) {
    return res.status(400).json({ 
      error: 'Blockchain validation failed', 
      details: blockchainResult.error 
    });
  }
  
  // Record signature
  await signatureService.recordSignature(
    'entity_type',
    entityId,
    blockchainResult.txId,
    blockchainResult.mspId,
    requiredMsp
  );
  
  // Cache in DB for fast queries
  const result = await db.query('INSERT INTO table ...', [param1, param2]);
  
  res.json({ 
    success: true, 
    id: result.rows[0].id,
    blockchainTxId: blockchainResult.txId 
  });
}
```

---

## Routes Requiring Updates

### High Priority (Critical Business Logic)
1. ✅ `api/src/routes/exporters.ts` - Lines 177, 551, 557
2. ✅ `api/src/routes/documents.ts` - Lines 81, 132, 308
3. ✅ `api/src/routes/customs.ts` - Lines 479, 766
4. ⚠️ `api/src/routes/contracts.ts` - Lines 986, 1169 (audit trail)
5. ⚠️ `api/src/routes/shipments.ts` - Line 2227 (status history)

### Medium Priority (Audit & Tracing)
6. ⚠️ All routes - Audit log inserts (create chaincode function)

### Low Priority (Admin Functions)
7. 🔵 `api/src/routes/users.ts` - Keep in API (not business logic)
8. 🔵 `api/src/routes/auth.ts` - Keep in API (authentication)

---

## Benefits

### 1. True Decentralization
- All state changes validated by 6 consortium members
- No single party can manipulate data
- Immutable audit trail

### 2. Regulatory Compliance
- EUDR traceability requirements
- Coffee export regulations
- Banking compliance (LC regulations)

### 3. Trust & Transparency
- Every transaction has multi-party consensus
- Complete blockchain history
- Cryptographic proof of all actions

### 4. Data Integrity
- Blockchain is source of truth
- Database is read cache
- Automatic reconciliation possible

---

## Testing Strategy

### 1. Function Coverage Test
```bash
node test-all-chaincode-functions.js
```

### 2. End-to-End Workflow Test
```bash
node test-complete-workflow-blockchain.js
```

### 3. Consensus Verification
```bash
node verify-6-peer-consensus.js
```

### 4. Performance Test
```bash
node benchmark-blockchain-throughput.js
```

---

## Deployment Checklist

- [ ] Add audit.go to chaincode
- [ ] Rebuild chaincode (v1.94)
- [ ] Deploy to all 6 peers
- [ ] Update API routes (exporters, documents, customs)
- [ ] Test each route with blockchain calls
- [ ] Verify 6/6 peer endorsements
- [ ] Run complete workflow test
- [ ] Update documentation
- [ ] Train users on blockchain features

---

## Next Steps

1. **Immediate**: Create `audit.go` chaincode module
2. **Today**: Update exporters.ts, documents.ts, customs.ts
3. **This Week**: Rebuild and deploy chaincode v1.94
4. **Testing**: Full system test with blockchain validation
5. **Production**: Roll out with monitoring

---

## Success Metrics

- ✅ 100% of business transactions go through blockchain FIRST
- ✅ 6/6 consortium peer endorsements on every transaction
- ✅ Zero direct DB writes for business logic
- ✅ Complete audit trail with TX IDs
- ✅ Blockchain stats visible in all portals

**This will transform the system into a TRUE blockchain consortium platform.** 🎯

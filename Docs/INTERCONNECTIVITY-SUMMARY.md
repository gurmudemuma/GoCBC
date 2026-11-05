# GoCBC Interconnectivity Quick Reference

## System Component Map

```
┌────────────────────────────────────────────────────────────────┐
│                      SYSTEM LAYERS                              │
└────────────────────────────────────────────────────────────────┘

Layer 1: FRONTEND (React)
  ├─ 7 Portals (ECTA, Banks, NBE, Customs, Shipping, Quality, ECX)
  ├─ 61 Tabs total
  └─ HTTP/REST → API (Port 3001)

Layer 2: API (Node.js/TypeScript)
  ├─ 52 Routes (HTTP endpoints)
  ├─ 30+ Services (Business logic)
  ├─ 7 Middleware (Auth, RBAC, Validation)
  ├─ 9 Utilities
  ├─ → Fabric SDK → Blockchain
  └─ → pg library → PostgreSQL

Layer 3: BLOCKCHAIN (Hyperledger Fabric)
  ├─ Chaincode: 23 Go files (~650KB)
  ├─ Channel: coffeechannel
  ├─ 6 Peers (ECTA, Banks, NBE, Customs, Shipping, ECX)
  ├─ 1 Orderer
  ├─ 6 CouchDB instances (state database)
  └─ Endorsement: 4 of 6 peers

Layer 4: DATABASE (PostgreSQL)
  ├─ 51 tables
  ├─ Mirror of blockchain data
  └─ Fast query cache
```

## Key File Interconnections

### Critical Path: Forex Allocation

```
Frontend
  ui/src/pages/NBEPortal/ForexAllocationsTab.tsx
    ↓ forexService.allocateForex()
    
API Route
  api/src/routes/forex.ts
    ↓ POST /api/v1/forex/allocate
    ↓ Middleware: auth → rbac → validation
    
Service Layer
  api/src/services/forexService.ts
    ↓ allocateForex()
    ↓ fabricService.submitTransaction()
    
Blockchain Client
  api/src/services/fabricService.ts
    ↓ submitTransaction('AllocateForex', args)
    ↓ Send to 6 peers for endorsement
    
Chaincode
  chaincodes/coffee/forex.go
    ↓ AllocateForex(ctx, forexJSON)
    ↓ Validate LC status
    ↓ Update forex state
    ↓ Write to CouchDB
    
Database Mirror
  api/src/services/blockchainSyncService.ts
    ↓ syncForexAllocation()
    ↓ UPDATE forex_allocations
    
PostgreSQL
  forex_allocations table updated
```

## Component Dependencies

### Blockchain Integration Stack

```
fabricService.ts (CORE - 2,900 lines)
  │
  ├─→ fabricWalletStorage.ts (Identity management)
  ├─→ certificateManager.ts (X.509 certificates)
  ├─→ logger.ts (Structured logging)
  │
  └─→ Used by ALL business services:
      ├─ contractService.ts
      ├─ forexService.ts
      ├─ lcService.ts
      ├─ paymentService.ts
      ├─ shipmentService.ts
      ├─ qualityService.ts
      └─ customsService.ts
```

### Data Sync Stack

```
blockchainSyncService.ts
  │
  ├─→ fabricService.ts (Read blockchain)
  ├─→ databaseService.ts (Write PostgreSQL)
  │
  └─→ Syncs:
      ├─ exporters
      ├─ contracts
      ├─ letters_of_credit
      ├─ forex_allocations
      ├─ payments
      ├─ shipments
      ├─ quality_inspections
      └─ customs_declarations
```

## Chaincode Module Map

```
main.go (127KB)
  ├─ RegisterExporter()
  ├─ ApproveExporter()
  ├─ UpdateExporterProfile()
  └─ CreateAuditLog() [Used by ALL modules]

banking.go (72KB)
  ├─ RequestLC()
  ├─ ApproveLC()
  ├─ IssueLC()
  ├─ AmendLC()
  ├─ ExamineLCDocuments()
  └─ RejectLCDocuments()

forex.go (54KB)
  ├─ RequestForex()
  ├─ AllocateForex()
  └─ SetRetentionPolicy()

payment.go (63KB)
  ├─ InitiatePayment()
  ├─ SubmitPaymentDocuments()
  ├─ VerifyPaymentDocuments()
  └─ SettlePayment()

customs.go, quality.go, swift.go, etc. (14 more files)
```

## API Route Organization

```
Core Business (13 routes)
  ├─ exporters.ts
  ├─ contracts.ts
  ├─ banking.ts
  ├─ forex.ts
  ├─ payments.ts
  ├─ shipments.ts
  ├─ quality.ts
  ├─ customs.ts
  ├─ swift.ts
  ├─ repatriation.ts
  ├─ certificates.ts
  ├─ permits.ts
  └─ documents.ts

Supporting (39 routes)
  ├─ auth.ts (JWT authentication)
  ├─ users.ts
  ├─ audit.ts
  ├─ analytics.ts
  ├─ monitoring.ts
  ├─ notifications.ts
  └─ ... (33 more)
```

## Critical Integration Points

1. **Blockchain ↔ PostgreSQL**
   - Write: Blockchain first → Mirror to PostgreSQL
   - Read: PostgreSQL (fast) + Blockchain verification
   - Sync: Every 5 minutes + on transaction

2. **Multi-Peer Endorsement**
   - Policy: 4 of 6 peers required
   - Critical transactions: Forex, Payment, LC, Contract
   - Timeout: 30 seconds for endorsement

3. **RBAC (Role-Based Access)**
   - 6 roles: ECTA, BANKS, NBE, CUSTOMS, SHIPPING, QUALITY
   - Enforced at: Middleware layer (rbac.ts)
   - Validated at: Route handler level

4. **Document Management**
   - Upload: POST /documents/upload → /api/uploads/
   - Metadata: Stored in blockchain
   - Signatures: Multi-party signing on blockchain
   - Retrieval: Metadata from blockchain + file from disk

## File Count Summary

| Component | Files | Total Size |
|-----------|-------|------------|
| Chaincode (Go) | 23 | ~650KB |
| API Routes | 52 | ~500KB |
| API Services | 30+ | ~800KB |
| API Middleware | 7 | ~50KB |
| API Utils | 9 | ~100KB |
| Frontend | ~100 | ~2MB |
| **TOTAL** | **220+** | **~4MB code** |

## Architecture Health Score

**Overall: 8.5/10** 🌟

- Structure: 9/10 ⭐⭐⭐⭐⭐
- Code Quality: 8/10 ⭐⭐⭐⭐
- Security: 8/10 ⭐⭐⭐⭐
- Performance: 7/10 ⭐⭐⭐
- Testing: 7/10 ⭐⭐⭐
- Documentation: 8/10 ⭐⭐⭐⭐
- Maintainability: 9/10 ⭐⭐⭐⭐⭐

## Verdict: PRODUCTION READY ✅

The codebase demonstrates excellent architectural design with:
- ✅ Clear layering and separation of concerns
- ✅ Comprehensive business logic
- ✅ Proper blockchain integration
- ✅ Security fundamentals
- ✅ Complete E2E workflow support

---

**For detailed analysis, see:** `CODEBASE-ARCHITECTURE-ANALYSIS.md`

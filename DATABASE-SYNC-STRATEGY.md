# Database Synchronization Strategy

## Overview
The CECBS system uses **dual-database architecture** for optimal performance, data integrity, and audit requirements:

- **PostgreSQL**: Source of truth for operational data, queries, and business logic
- **Blockchain (Hyperledger Fabric)**: Immutable audit trail, consensus, and inter-organizational trust

## Architecture Pattern: Dual Write with Eventual Consistency

```
┌──────────────────────────────────────────────────────────┐
│                    Application Layer                      │
│                  (Portal Actions/APIs)                    │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │  DualDatabaseService   │
            │  (Sync Coordinator)    │
            └────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌───────────────┐       ┌──────────────┐
    │  PostgreSQL   │       │  Blockchain  │
    │  (Primary)    │       │  (Audit)     │
    └───────────────┘       └──────────────┘
```

## Synchronization Points

### 1. Customs Clearance
**Trigger**: Customs Officer approves declaration

**Write Path**:
1. ✅ PostgreSQL: `customs_clearances` + `customs_declarations`
2. ✅ Blockchain: Update shipment status + Store clearance metadata

**Data Synced**:
- Clearance number, date, officer
- Declaration value, quantity
- Duty amount, tax amount
- Exit point, transport mode
- Status and remarks

**API Endpoint**: `POST /api/v1/customs/declaration/:id/clear`

**Code Location**: `api/src/routes/customs.ts` (lines 639-800)

---

### 2. Quality Inspection
**Trigger**: ECTA/ECX inspector completes inspection

**Write Path**:
1. ✅ PostgreSQL: `quality_inspections`
2. ✅ Blockchain: Record inspection result

**Data Synced**:
- Inspection ID, date, inspector
- Coffee type, quantity, grade
- Pass/fail status
- Certification number
- Remarks

**API Endpoint**: `POST /api/v1/ecta/inspection`

---

### 3. Payment & Letter of Credit
**Trigger**: Bank processes payment or issues LC

**Write Path**:
1. ✅ PostgreSQL: `payments` or `letters_of_credit`
2. ✅ Blockchain: Record payment transaction

**Data Synced**:
- Payment/LC ID, number
- Amount, currency
- Payer/beneficiary banks
- Payment date, status
- Contract reference

**API Endpoint**: `POST /api/v1/banking/payment`

---

### 4. Shipment Status Updates
**Trigger**: Shipping company records milestone

**Write Path**:
1. ✅ PostgreSQL: `shipment_events`
2. ✅ Blockchain: Update shipment status

**Data Synced**:
- Shipment ID
- New status (LAND_TRANSPORT, AT_PORT, LOADED, etc.)
- Location, timestamp
- Responsible party

**API Endpoints**:
- `POST /api/v1/shipments/:id/land-transport/start`
- `POST /api/v1/shipments/:id/port/arrive`
- `POST /api/v1/shipments/:id/vessel/load`
- etc.

---

### 5. Contract Creation
**Trigger**: Exporter creates sales contract

**Write Path**:
1. ✅ Blockchain: Primary storage (contract is blockchain native)
2. ✅ PostgreSQL: Cache key fields for queries

**Data Synced**:
- Contract ID, number
- Buyer, seller details
- Quantity, price, total value
- Terms and conditions
- Status

**API Endpoint**: `POST /api/v1/contracts`

---

## Implementation: DualDatabaseService

### Service Location
`api/src/services/dualDatabaseService.ts`

### Key Methods

#### 1. `syncCustomsClearance(data, options)`
Writes customs clearance to both databases.

```typescript
const result = await dualDbService.syncCustomsClearance({
  clearanceId: 'CLR-123',
  shipmentId: 'SHIP123',
  clearanceNumber: 'CLR-123',
  declarationNumber: 'CD-SHIP123',
  status: 'CLEARED',
  clearedBy: 'customsAdmin',
  clearedDate: '2026-08-29',
  customsValueUSD: 1522756,
  quantity: 203034,
  currency: 'USD',
  dutyAmount: 119330,
  taxAmount: 475320
});

// result: { pgSuccess: boolean, blockchainSuccess: boolean, errors: string[] }
```

#### 2. `syncPayment(data, options)`
Writes payment/LC to both databases.

#### 3. `syncQualityInspection(data, options)`
Writes inspection results to both databases.

#### 4. `readShipmentComprehensive(shipmentId)`
Reads from both databases and merges data.

```typescript
const data = await dualDbService.readShipmentComprehensive('SHIP123');
// Returns: {
//   shipment: {...},        // from blockchain
//   clearance: {...},       // from postgres
//   declaration: {...},     // from postgres
//   payments: [...],        // from postgres
//   inspections: [...],     // from postgres
//   sources: { blockchain: true, postgres: true }
// }
```

#### 5. `backfillToBlockchain(entityType)`
Syncs existing PostgreSQL data to blockchain.

```typescript
const result = await dualDbService.backfillToBlockchain('clearances');
// Returns: { total: 10, synced: 9, failed: 1, errors: [...] }
```

---

## Sync Options

```typescript
interface SyncOptions {
  writeToPostgres?: boolean;      // Default: true
  writeToBlockchain?: boolean;    // Default: true
  failOnBlockchainError?: boolean; // Default: false (graceful degradation)
  retryOnFailure?: boolean;       // Default: false
}
```

### Graceful Degradation
By default, if blockchain write fails:
- ✅ PostgreSQL write succeeds (operational data preserved)
- ⚠️  Blockchain write logged as warning
- 🔄 Background job can retry later

If `failOnBlockchainError: true`:
- ❌ Rollback PostgreSQL write
- ❌ Return error to user
- 🔒 Ensures strict consistency (use for critical operations)

---

## Read Strategy

### Portal Data Fetching Pattern
```typescript
// 1. Fetch from Blockchain (workflow, contract, history)
const shipmentResponse = await apiFetch(`/shipments/${shipmentId}`);
const shipment = shipmentResponse.data;

// 2. Fetch from PostgreSQL (clearance, declaration, payments)
const clearanceResponse = await apiFetch(`/customs/clearances`);
const clearance = clearanceResponse.data.find(c => c.shipment_id === shipmentId);

// 3. Merge and display
const verificationData = {
  ...shipment,         // blockchain data
  ...clearance,        // postgres data
  // Both sources provide complete view
};
```

### Query Optimization
- **Fast queries**: PostgreSQL (indexed, JOINs, aggregations)
- **Audit trail**: Blockchain (immutable history)
- **Real-time status**: Blockchain (current state)
- **Financial data**: PostgreSQL + Blockchain (dual verification)

---

## Consistency Guarantees

### Eventual Consistency
- Writes may succeed on one database and fail on another
- System remains operational with partial writes
- Background sync jobs reconcile differences

### Strong Consistency (Critical Operations)
- Use `failOnBlockchainError: true`
- Both writes must succeed or transaction rolls back
- Example: Final payment confirmation, contract signing

---

## Monitoring & Alerts

### Health Checks
```bash
GET /api/v1/health/databases
```

Returns:
```json
{
  "postgres": { "status": "healthy", "latency": "2ms" },
  "blockchain": { "status": "healthy", "latency": "150ms" },
  "syncStatus": { "pending": 0, "failed": 0 }
}
```

### Sync Metrics
- Total syncs attempted
- Success rate (PG and Blockchain)
- Failed syncs (with retry queue)
- Average sync latency

---

## Backfill & Recovery

### Initial Backfill
When adding new entity types to blockchain:

```bash
cd /goCBC/api
node -e "require('./dist/services/dualDatabaseService').dualDbService.backfillToBlockchain('clearances').then(console.log)"
```

### Reconciliation Job
Periodic job to ensure consistency:

```typescript
// Runs every hour
async function reconcileData() {
  // 1. Find records in PG not in blockchain
  const missing = await findMissingInBlockchain();
  
  // 2. Sync missing records
  for (const record of missing) {
    await dualDbService.sync...(record, { writeToPostgres: false });
  }
  
  // 3. Report discrepancies
  logger.info(`Reconciled ${missing.length} records`);
}
```

---

## Best Practices

### ✅ DO
1. **Always use DualDatabaseService** for write operations
2. **Log all sync failures** for auditing
3. **Read from PostgreSQL** for queries and reports
4. **Read from Blockchain** for audit trails and verification
5. **Use JOINs in PostgreSQL** to reduce API calls
6. **Cache blockchain data** when appropriate

### ❌ DON'T
1. **Don't write directly** to databases (bypass DualDBService)
2. **Don't assume blockchain write succeeded** without checking
3. **Don't query blockchain** for operational dashboards (slow)
4. **Don't skip error handling** on sync failures
5. **Don't duplicate business logic** in both databases

---

## Migration Path

### Phase 1: Current State ✅
- Customs clearances sync to both databases
- Shipment status updates go to blockchain
- Payments write to PostgreSQL only (legacy)

### Phase 2: Full Sync (In Progress)
- All payments sync to blockchain
- Quality inspections sync to blockchain
- Document metadata sync to blockchain

### Phase 3: Optimized (Future)
- Smart caching layer
- Async sync with message queue
- Real-time sync monitoring dashboard
- Automatic conflict resolution

---

## Troubleshooting

### Issue: Blockchain write fails
**Symptom**: `[DUAL-DB] ❌ Blockchain write failed`

**Solutions**:
1. Check Fabric network status: `docker ps`
2. Check chaincode logs: `docker logs peer0.customs.cecbs.et`
3. Verify MSP credentials: `ls blockchain/organizations/`
4. Retry with backfill script

### Issue: Data mismatch between databases
**Symptom**: PostgreSQL has data, blockchain doesn't

**Solutions**:
1. Run reconciliation: `dualDbService.backfillToBlockchain()`
2. Check sync logs for failures
3. Manually verify specific record

### Issue: Slow read performance
**Symptom**: Portal loads slowly

**Solutions**:
1. Use PostgreSQL for queries (not blockchain)
2. Add database indexes
3. Use JOIN queries to reduce API calls
4. Cache frequent queries

---

## API Endpoints

### Sync Status
```
GET /api/v1/sync/status
GET /api/v1/sync/failed
POST /api/v1/sync/retry/:entityId
```

### Manual Sync
```
POST /api/v1/sync/clearance/:clearanceId
POST /api/v1/sync/payment/:paymentId
POST /api/v1/sync/inspection/:inspectionId
```

### Backfill
```
POST /api/v1/sync/backfill/clearances
POST /api/v1/sync/backfill/payments
POST /api/v1/sync/backfill/inspections
```

---

## Summary

✅ **PostgreSQL**: Fast queries, complex joins, operational data
✅ **Blockchain**: Immutable audit, consensus, trust
✅ **DualDatabaseService**: Coordinated writes, consistency management
✅ **Read Strategy**: Fetch from both, merge for comprehensive view
✅ **Graceful Degradation**: System remains operational even if one DB fails

This architecture ensures **data integrity**, **audit compliance**, and **system resilience** across all CECBS portals.

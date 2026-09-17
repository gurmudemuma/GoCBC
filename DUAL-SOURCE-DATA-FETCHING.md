# Dual-Source Data Fetching - CouchDB + PostgreSQL

## Problem Solved

The Banks Portal dashboard was showing **all zeros** because data exists in **TWO places**:
1. **CouchDB** - Blockchain state database (source of truth)
2. **PostgreSQL** - Application database (may or may not be synchronized)

The previous API endpoints only queried **ONE source**, causing data to appear missing when it existed in the other source.

## Solution: Dual-Source Data Service

Created a new service that:
1. **Fetches from BOTH** CouchDB and PostgreSQL in parallel
2. **Merges** the results intelligently
3. **Deduplicates** by matching IDs across both sources
4. **Prefers blockchain data** (CouchDB) as the source of truth

---

## Implementation

### 1. New Service: `dualSourceDataService.ts`

**Location:** `api/src/services/dualSourceDataService.ts`

**Features:**
- Fetches Letters of Credit from BOTH sources
- Fetches Advance Payments from BOTH sources
- Fetches Consignment Payments from BOTH sources
- Fetches Documentary Collections from BOTH sources
- Merges and deduplicates data intelligently
- Returns metadata about source counts

**Method:** `getBankPortalStats()`
```typescript
const stats = await dualSourceService.getBankPortalStats();

// Returns:
{
  lc: {
    couchdbCount: 5,
    postgresCount: 3,
    totalCount: 6,  // After deduplication
    source: 'both'
  },
  documentaryCollection: { ... },
  advancePayment: { ... },
  consignment: { ... }
}
```

### 2. New API Endpoint: `/api/v1/stats`

**Location:** `api/src/routes/stats.ts`

**Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/stats/bank-portal` | Get all bank portal stats from BOTH sources |
| `GET /api/v1/stats/lc` | Get Letters of Credit with merged data |
| `GET /api/v1/stats/advance-payments` | Get Advance Payments with merged data |
| `GET /api/v1/stats/consignments` | Get Consignments with merged data |
| `GET /api/v1/stats/documentary-collections` | Get CAD transactions with merged data |

### 3. Integration in Server

**Location:** `api/src/server.ts`

```typescript
import statsRoutes from './routes/stats';
...
apiV1.use('/stats', authMiddleware, statsRoutes);
```

---

## Usage in Banks Portal

### Before (Single Source - showing zeros):
```typescript
const lcResponse = await apiFetch('/banking/lc');  // Only checks CouchDB
// If data is in PostgreSQL only → shows 0
```

### After (Dual Source - shows real counts):
```typescript
const statsResponse = await apiFetch('/stats/bank-portal');

// Returns:
{
  success: true,
  data: {
    lc: {
      couchdbCount: 5,    // From blockchain
      postgresCount: 3,   // From database
      totalCount: 6,      // Merged & deduplicated
      source: 'both'
    },
    documentaryCollection: {
      couchdbCount: 2,
      postgresCount: 0,
      totalCount: 2,
      source: 'couchdb'
    },
    advancePayment: {
      couchdbCount: 0,
      postgresCount: 4,
      totalCount: 4,
      source: 'postgres'
    },
    consignment: {
      couchdbCount: 1,
      postgresCount: 1,
      totalCount: 1,     // Same record in both (deduplicated)
      source: 'both'
    },
    summary: {
      totalLCs: 6,
      totalCADs: 2,
      totalAdvancePayments: 4,
      totalConsignments: 1,
      grandTotal: 13
    }
  }
}
```

---

## Merge Logic

### Deduplication Strategy
1. **Blockchain wins**: If same ID exists in both sources, prefer CouchDB data
2. **Fill gaps**: If ID only in PostgreSQL, include it
3. **Merge metadata**: Combine non-conflicting fields from both sources

### Key Matching
```typescript
CouchDB Key          →  PostgreSQL Key
-------------------------------------------
lcID                 →  lc_id
paymentID            →  payment_id
consignmentID        →  consignment_id
collectionID         →  collection_id
```

### Case Normalization
```typescript
// PostgreSQL snake_case → camelCase
{
  lc_id: "LC-001",           // PostgreSQL
  exporter_id: "EXP-001",
  created_at: "2025-01-08"
}

// Becomes:
{
  lcId: "LC-001",            // Normalized
  exporterId: "EXP-001",
  createdAt: "2025-01-08",
  _source: 'postgres'
}
```

---

## Data Sources Explained

### CouchDB (Blockchain State)
- **Location**: Hyperledger Fabric peer CouchDB
- **Contains**: Chaincode state data (current state of all blockchain assets)
- **Pros**: 
  - Source of truth
  - Immutable history via blockchain
  - Cryptographically signed
- **Cons**:
  - Slower queries
  - No complex joins
  - Requires Fabric Gateway connection

### PostgreSQL (Application Database)
- **Location**: PostgreSQL server (`DATABASE_URL` from `.env`)
- **Contains**: Cached/synchronized blockchain data + off-chain data
- **Pros**:
  - Fast queries
  - Complex joins and aggregations
  - No blockchain dependency
- **Cons**:
  - May be out of sync with blockchain
  - No cryptographic proof
  - Dependent on sync processes

---

## Why Dual-Source is Necessary

### Scenario 1: Data Only in Blockchain
```
CouchDB: 5 LCs
PostgreSQL: 0 LCs
→ Without dual-source: Dashboard shows 0
→ With dual-source: Dashboard shows 5 (from CouchDB)
```

### Scenario 2: Data Only in PostgreSQL
```
CouchDB: 0 Advance Payments (not implemented in chaincode yet)
PostgreSQL: 4 Advance Payments (from API direct writes)
→ Without dual-source: Dashboard shows 0
→ With dual-source: Dashboard shows 4 (from PostgreSQL)
```

### Scenario 3: Data in BOTH (Duplicates)
```
CouchDB: LC-001 (status: ISSUED)
PostgreSQL: LC-001 (status: APPROVED, older)
→ Without dual-source: Shows 2 LCs (duplicate)
→ With dual-source: Shows 1 LC (deduplicated, prefers CouchDB)
```

### Scenario 4: Data Partially Synced
```
CouchDB: LC-001, LC-002, LC-003
PostgreSQL: LC-001, LC-004
→ Without dual-source: Shows either 3 or 2 (missing data)
→ With dual-source: Shows 4 (merged: LC-001, LC-002, LC-003, LC-004)
```

---

## Testing

### 1. Check Current Data
```bash
# Check CouchDB (via chaincode)
curl http://localhost:5000/api/v1/stats/lc

# Example response:
{
  "success": true,
  "meta": {
    "couchdbCount": 5,
    "postgresCount": 2,
    "totalCount": 6,
    "source": "both"
  },
  "data": [ ... merged LC data ... ]
}
```

### 2. Check Bank Portal Stats
```bash
curl http://localhost:5000/api/v1/stats/bank-portal \
  -H "Authorization: Bearer YOUR_TOKEN"

# Returns counts for all 4 payment methods
```

### 3. UI Integration
Update `BanksPortal.tsx` to use new endpoint:
```typescript
// Change from:
const lcResponse = await apiFetch('/banking/lc');
const lcs = lcResponse.data || [];

// To:
const statsResponse = await apiFetch('/stats/bank-portal');
const lcCount = statsResponse.data.lc.totalCount;
const cadCount = statsResponse.data.documentaryCollection.totalCount;
const advanceCount = statsResponse.data.advancePayment.totalCount;
const consignmentCount = statsResponse.data.consignment.totalCount;
```

---

## Benefits

### 1. Accurate Counts
Dashboard shows **real** data from both sources, not zeros.

### 2. Resilience
If blockchain is down, PostgreSQL data still shows.  
If PostgreSQL is empty, blockchain data still shows.

### 3. Transparency
Metadata shows WHERE data came from:
- `"source": "couchdb"` - Only in blockchain
- `"source": "postgres"` - Only in database
- `"source": "both"` - In both (preferred)

### 4. Debugging
Developers can see sync issues:
```json
{
  "couchdbCount": 10,
  "postgresCount": 3,
  "totalCount": 11,
  "source": "both"
}
```
→ **Problem**: PostgreSQL is 7 records behind!

### 5. Future-Proof
As more data is added to either source, the dual-source service automatically merges it.

---

## Performance Considerations

### Parallel Fetching
Queries to CouchDB and PostgreSQL run **in parallel**, not sequentially:
```typescript
const [couchdbResult, postgresResult] = await Promise.all([
  fabricService.queryChaincode('QueryAllLCs', []),
  dbService.all('SELECT * FROM letters_of_credit')
]);
// Both queries run simultaneously
```

### Caching (Future Enhancement)
Consider caching results for 30 seconds to reduce load:
```typescript
const CACHE_TTL = 30000; // 30 seconds
const cachedStats = cache.get('bank-portal-stats');
if (cachedStats) return cachedStats;
```

### Lazy Loading (Future Enhancement)
Load data on-demand instead of all at once:
```typescript
// Load counts only first (fast)
const counts = await dualSourceService.getCounts();

// Load full data when user clicks (slower)
const fullData = await dualSourceService.getLettersOfCredit();
```

---

## Migration Path

### Phase 1: ✅ DONE - Dual-Source Service Created
- Created `dualSourceDataService.ts`
- Created `/stats` API endpoints
- API builds successfully

### Phase 2: Update UI to Use New Endpoint
- Modify `BanksPortal.tsx` to call `/api/v1/stats/bank-portal`
- Update dashboard cards to show counts from dual-source
- Add badges showing data source (CouchDB/PostgreSQL/Both)

### Phase 3: Synchronization Monitoring
- Add alerts when CouchDB and PostgreSQL counts diverge significantly
- Create admin dashboard showing sync status
- Implement auto-sync background job

### Phase 4: Gradual Migration
- As blockchain deployment (v1.79) completes, CouchDB will become primary
- PostgreSQL will transition to read replica / cache role
- Eventually deprecate PostgreSQL-only data in favor of blockchain-first

---

## Files Created

1. `api/src/services/dualSourceDataService.ts` - Core dual-source logic
2. `api/src/routes/stats.ts` - API endpoints
3. `DUAL-SOURCE-DATA-FETCHING.md` - This documentation

## Files Modified

1. `api/src/server.ts` - Added stats route registration

---

## Next Steps

1. **Update BanksPortal.tsx** to call `/api/v1/stats/bank-portal`
2. **Test** with real data in both CouchDB and PostgreSQL
3. **Deploy** API changes to production
4. **Monitor** source counts to ensure synchronization
5. **Document** any sync discrepancies for debugging

---

**Status:** ✅ Implementation COMPLETE - Ready for UI integration and testing

# Dual-Database Architecture Pattern

## Overview

The CECBS system uses a **dual-database architecture** where:
1. **Hyperledger Fabric Blockchain** - Source of truth for immutable transaction data
2. **PostgreSQL** - Relational data store for enrichment and fast lookups

This architecture ensures:
- ✅ **Data Integrity**: Blockchain provides immutability and audit trail
- ✅ **Performance**: PostgreSQL enables fast queries with JOINs
- ✅ **Enrichment**: Relational data (buyer names, countries) enhance blockchain data
- ✅ **Resilience**: Fallback to PostgreSQL when blockchain times out

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                      API ENDPOINT                            │
│                                                              │
│  1. Query Blockchain (Hyperledger Fabric)                   │
│     ↓                                                        │
│  2. Enrich with PostgreSQL (JOINs with buyers table)        │
│     ↓                                                        │
│  3. Return Enriched Data to Frontend                        │
│                                                              │
│  Fallback: If blockchain fails → Query PostgreSQL directly  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Write Operations (Blockchain-First)
```javascript
// Step 1: Write to blockchain
await fabricService.submitTransaction('RegisterContract', [contractData]);

// Step 2: Sync to PostgreSQL (via sync script or auto-sync)
await syncContractToPostgres(contractData);

// Step 3: Enrich PostgreSQL with relational data
await enrichContractWithBuyer(contractId);
```

### 2. Read Operations (Blockchain + PostgreSQL Enrichment)
```javascript
// Step 1: Query blockchain
const contracts = await fabricService.getAllContracts();

// Step 2: Enrich with PostgreSQL buyer data
const enriched = await dataEnrichmentService.enrichContracts(contracts);

// Step 3: Return enriched data
return enriched;
```

---

## Implementation

### Data Enrichment Service

All API endpoints use the centralized `dataEnrichmentService.ts`:

```typescript
import dataEnrichmentService from '../services/dataEnrichmentService';

// Enrich contracts
const contracts = await fabricService.getAllContracts();
const enrichedContracts = await dataEnrichmentService.enrichContracts(contracts);

// Enrich LCs
const lcs = await fabricService.getAllLCs();
const enrichedLCs = await dataEnrichmentService.enrichLCs(lcs);

// Enrich shipments
const shipments = await fabricService.getAllShipments();
const enrichedShipments = await dataEnrichmentService.enrichShipments(shipments);

// Enrich forex
const forex = await fabricService.queryAllForex();
const enrichedForex = await dataEnrichmentService.enrichForexAllocations(forex);
```

### Endpoints Using Dual-Database Pattern

| Endpoint | Blockchain Query | PostgreSQL Enrichment | Fallback |
|----------|------------------|----------------------|----------|
| `/api/v1/contracts` | ✅ QueryAllContracts | ✅ Buyer names/countries | ✅ Full PostgreSQL query |
| `/api/v1/banking/lc` | ✅ CouchDB direct | ✅ Buyer data via JOIN | ✅ PostgreSQL `letters_of_credit` |
| `/api/v1/shipments` | ✅ QueryAllShipments | ✅ Contract + buyer data | ⚠️ Not yet implemented |
| `/api/v1/forex` | ✅ QueryAllForex | ✅ LC + contract buyer data | ⚠️ Not yet implemented |
| `/api/v1/payments` | ✅ QueryAllPayments | ✅ Shipment + buyer data | ⚠️ Not yet implemented |

---

## Database Schema

### PostgreSQL Tables

#### `buyers` - Master buyer registry
```sql
CREATE TABLE buyers (
    buyer_id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `sales_contracts` - Contracts synced from blockchain
```sql
CREATE TABLE sales_contracts (
    contract_id VARCHAR(100) PRIMARY KEY,
    exporter_id VARCHAR(50),
    buyer_id VARCHAR(50),
    buyer_name VARCHAR(255),         -- ✅ Enriched from buyers table
    buyer_country VARCHAR(100),       -- ✅ Enriched from buyers table
    coffee_type VARCHAR(50),
    quantity DECIMAL(15,2),
    price_per_kg DECIMAL(10,2),
    total_value DECIMAL(15,2),
    currency VARCHAR(10),
    contract_status VARCHAR(50),
    registration_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (buyer_id) REFERENCES buyers(buyer_id)
);
```

#### `letters_of_credit` - LCs synced from blockchain
```sql
CREATE TABLE letters_of_credit (
    lc_id VARCHAR(100) PRIMARY KEY,
    contract_id VARCHAR(100),
    exporter_id VARCHAR(50),
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    status VARCHAR(50),
    issue_date TIMESTAMP,
    expiry_date TIMESTAMP,
    issuing_bank VARCHAR(255),
    advising_bank VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (contract_id) REFERENCES sales_contracts(contract_id)
);
```

#### `shipments` - Shipments synced from blockchain
```sql
CREATE TABLE shipments (
    shipment_id VARCHAR(100) PRIMARY KEY,
    contract_id VARCHAR(100),
    exporter_id VARCHAR(50),
    quantity DECIMAL(15,2),
    status VARCHAR(50),
    shipping_date TIMESTAMP,
    delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (contract_id) REFERENCES sales_contracts(contract_id)
);
```

---

## Data Synchronization

### Automated Sync Script

Run `api/sync-all-data-to-postgres.js` to sync ALL blockchain data:

```bash
cd api
node sync-all-data-to-postgres.js
```

This script:
1. ✅ Fetches ALL contracts from blockchain (CouchDB)
2. ✅ Syncs to PostgreSQL `sales_contracts` table
3. ✅ Enriches with buyer names from `buyers` table
4. ✅ Fetches ALL LCs and syncs to `letters_of_credit`
5. ✅ Fetches ALL shipments and syncs to `shipments`
6. ✅ Reports sync statistics

### Manual Sync Commands

```bash
# Sync all contracts
node api/sync-all-contracts-to-postgres.js

# Sync all data (contracts + LCs + shipments)
node api/sync-all-data-to-postgres.js
```

---

## Enrichment Queries

### Contracts with Buyer Names
```sql
SELECT 
    sc.contract_id,
    sc.exporter_id,
    b.company_name as buyer_name,
    b.country as buyer_country,
    sc.total_value,
    sc.currency
FROM sales_contracts sc
LEFT JOIN buyers b ON sc.buyer_id = b.buyer_id;
```

### LCs with Buyer Data
```sql
SELECT 
    lc.lc_id,
    lc.contract_id,
    sc.buyer_name,
    sc.buyer_country,
    lc.amount,
    lc.status
FROM letters_of_credit lc
LEFT JOIN sales_contracts sc ON lc.contract_id = sc.contract_id;
```

### Shipments with Buyer Data
```sql
SELECT 
    s.shipment_id,
    s.contract_id,
    sc.buyer_name,
    sc.buyer_country,
    s.quantity,
    s.status
FROM shipments s
LEFT JOIN sales_contracts sc ON s.contract_id = sc.contract_id;
```

---

## Frontend Integration

### API Response Structure

All enriched endpoints return:
```json
{
  "success": true,
  "data": [
    {
      "contractId": "CONTRACT_123",
      "exporterId": "EXP001",
      "buyerId": "JOB_BEL",
      "buyerName": "Belgian Coffee Traders N.V.",  // ✅ From PostgreSQL
      "buyerCountry": "Belgium",                    // ✅ From PostgreSQL
      "totalValue": 5000000,
      "currency": "USD"
    }
  ],
  "source": "blockchain",
  "enriched": true,  // ✅ Flag indicating PostgreSQL enrichment
  "timestamp": "2026-09-16T10:30:00.000Z"
}
```

### UI Display

```typescript
// Banks Portal - LC Management Table
{lcs.map(lc => (
  <TableRow key={lc.lcId}>
    <TableCell>{lc.contractId}</TableCell>
    <TableCell>{lc.exporterId}</TableCell>
    <TableCell>{lc.buyerName || '—'}</TableCell>  {/* ✅ Now shows name */}
    <TableCell>{formatCurrency(lc.amount, lc.currency)}</TableCell>
    <TableCell>{lc.status}</TableCell>
  </TableRow>
))}
```

---

## Performance Considerations

### Blockchain Query Times
- ✅ CouchDB Direct: ~500ms - 2s
- ⚠️ Fabric SDK: 30-60s (timeout issues)
- 🔧 Solution: Use CouchDB direct for reads, Fabric SDK for writes

### PostgreSQL Query Times
- ✅ Simple SELECT: <50ms
- ✅ JOIN with buyers: <100ms
- ✅ Enrichment of 100 records: <200ms

### Best Practices
1. **Query blockchain first** (source of truth)
2. **Enrich with PostgreSQL** (fast JOINs)
3. **Fallback to PostgreSQL** if blockchain times out
4. **Cache frequently accessed data** in PostgreSQL
5. **Run sync scripts regularly** (cron job every hour)

---

## Troubleshooting

### Issue: Buyer column showing "—"
**Cause**: PostgreSQL not synced with blockchain data

**Solution**:
```bash
cd api
node sync-all-data-to-postgres.js
```

### Issue: Blockchain query timeout (30-60s)
**Cause**: Fabric SDK peer timeout

**Solution**: Use CouchDB direct query (already implemented in `/banking/lc`)

### Issue: Buyer names not updating
**Cause**: Sync script not run after new contracts

**Solution**: Set up automated sync (cron job or PostFileSave hook)

---

## Future Enhancements

### 1. Automated Sync Job
Create a cron job to sync blockchain → PostgreSQL every hour:
```bash
0 * * * * cd /path/to/goCBC/api && node sync-all-data-to-postgres.js >> /var/log/cecbs-sync.log 2>&1
```

### 2. Real-Time Sync
Add PostFileSave hook to sync immediately after blockchain writes:
```json
{
  "version": "v1",
  "hooks": [{
    "name": "Auto-Sync to PostgreSQL",
    "trigger": "PostToolUse",
    "matcher": "submitTransaction",
    "action": { "type": "command", "command": "node api/sync-all-data-to-postgres.js" }
  }]
}
```

### 3. Admin UI Sync Button
Add manual sync button in AdminPortal:
```typescript
<Button onClick={() => fetch('/api/v1/admin/sync-blockchain')}>
  🔄 Sync Blockchain to PostgreSQL
</Button>
```

---

## Summary

✅ **Blockchain** = Immutable source of truth  
✅ **PostgreSQL** = Fast relational enrichment  
✅ **dataEnrichmentService** = Centralized enrichment logic  
✅ **Sync Scripts** = Keep databases in sync  
✅ **Fallback Pattern** = Resilient to blockchain timeouts  

This architecture ensures **data integrity + performance + user experience** across the entire CECBS system.

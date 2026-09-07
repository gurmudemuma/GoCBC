# 🗄️ CECBS Data Architecture Guide
## Three-Tier Storage Strategy: PostgreSQL + Hyperledger Fabric + CouchDB

*Last Updated: September 1, 2026*

---

## Architecture Overview

The Ethiopian Coffee Export Consortium Blockchain System (CECBS) uses a **hybrid three-tier data architecture** that combines the strengths of different database technologies:

```
┌────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                           │
│              (Node.js/TypeScript Backend API)                  │
└────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   POSTGRESQL     │  │  HYPERLEDGER     │  │    COUCHDB       │
│   (Off-Chain)    │  │     FABRIC       │  │ (Fabric State DB)│
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ • User accounts  │  │ • Blockchain     │  │ • World state    │
│ • Metadata       │  │   ledger         │  │ • Rich queries   │
│ • Fast queries   │  │ • Immutable      │  │ • JSON indexes   │
│ • Relationships  │  │   transactions   │  │ • Quick lookups  │
│ • Aggregations   │  │ • Consensus      │  │                  │
│ • Full-text      │  │ • Audit trail    │  │ (One per peer)   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
   Port: 5432           Peers: 7051+          Port: 5984
```

---

## 1. PostgreSQL (Off-Chain Relational Database)

### Purpose
Fast, queryable, relational data that doesn't require blockchain immutability.

### What's Stored

#### User Management
```sql
-- users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100) NOT NULL,
    organization VARCHAR(255),
    blockchain_identity TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Exporter Applications (Metadata)
```sql
-- exporter_applications table
CREATE TABLE exporter_applications (
    application_id VARCHAR(50) PRIMARY KEY,
    exporter_id VARCHAR(50) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    tin_number VARCHAR(50),
    ecta_license_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    
    -- ECTA Review
    ecta_reviewed_at TIMESTAMP,
    ecta_reviewed_by VARCHAR(255),
    license_status VARCHAR(50),
    
    -- ECX Inspection
    ecx_inspected_at TIMESTAMP,
    ecx_inspector VARCHAR(255),
    quality_grade VARCHAR(50),
    ecx_inspection_result VARCHAR(50),
    
    -- Approval
    approved_at TIMESTAMP,
    approved_by VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Customs Clearances (Fast Access)
```sql
-- customs_clearances table
CREATE TABLE customs_clearances (
    clearance_id SERIAL PRIMARY KEY,
    clearance_number VARCHAR(50) UNIQUE NOT NULL,
    shipment_id VARCHAR(50) NOT NULL,
    declaration_id VARCHAR(50),
    
    -- Clearance Info
    status VARCHAR(50) DEFAULT 'PENDING',
    cleared_date TIMESTAMP,
    cleared_by VARCHAR(255),
    
    -- Financial (from declaration via JOIN)
    duty_amount DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    
    -- From declaration (via JOIN)
    customs_value_usd DECIMAL(15,2),
    quantity DECIMAL(15,2),
    hs_code VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Audit Trail (Queryable Log)
```sql
-- audit_trail table
CREATE TABLE audit_trail (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    
    -- Who & When
    performed_by VARCHAR(255),
    performed_by_org VARCHAR(255),
    performed_at TIMESTAMP DEFAULT NOW(),
    
    -- What Changed
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    
    -- Source
    source VARCHAR(50) DEFAULT 'API',  -- 'API' or 'HYPERLEDGER_FABRIC'
    blockchain_tx_id VARCHAR(100),
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_trail(performed_at DESC);
CREATE INDEX idx_audit_user ON audit_trail(performed_by);
```

### Why PostgreSQL?

✅ **Fast Complex Queries**: JOIN operations across multiple tables  
✅ **Full-Text Search**: Find users, applications, clearances quickly  
✅ **Aggregations**: COUNT, SUM, AVG for analytics dashboards  
✅ **Relationships**: Foreign keys ensure data integrity  
✅ **ACID Transactions**: Consistent state for financial data  
✅ **Mature Ecosystem**: Excellent tools, ORMs, backups  

### Use Cases
- User login and authentication
- Dashboard KPI calculations
- Search and filter operations
- Report generation
- Email/notification metadata
- Session management

---

## 2. Hyperledger Fabric (Blockchain Ledger)

### Purpose
Immutable, distributed, consensus-driven record of all critical business transactions.

### What's Stored

#### Shipments (Core Business Logic)
```go
type Shipment struct {
    ShipmentID    string    `json:"shipmentId"`
    ContractID    string    `json:"contractId"`
    ExporterID    string    `json:"exporterId"`
    
    // Coffee Details
    Quantity      float64   `json:"quantity"`
    Grade         string    `json:"grade"`
    Origin        string    `json:"origin"`
    CoffeeType    string    `json:"coffeeType"`
    
    // Lifecycle Status
    Status        string    `json:"status"`  // CUSTOMS_CLEARED, LAND_TRANSPORT, etc.
    
    // Transport Details
    TransportMode       string `json:"transportMode"`  // SEA or AIR
    ShippingLine        string `json:"shippingLine"`
    VesselName          string `json:"vesselName"`
    VoyageNumber        string `json:"voyageNumber"`
    ContainerNumber     string `json:"containerNumber"`
    
    // Blockchain Metadata
    CreatedAt     time.Time `json:"createdAt"`
    UpdatedAt     time.Time `json:"updatedAt"`
}
```

#### Contracts (Sales Agreements)
```go
type Contract struct {
    ContractID      string    `json:"contractId"`
    ExporterID      string    `json:"exporterId"`
    BuyerID         string    `json:"buyerId"`
    BuyerName       string    `json:"buyerName"`
    BuyerCountry    string    `json:"buyerCountry"`
    
    // Commercial Terms
    CoffeeType      string    `json:"coffeeType"`
    Quantity        float64   `json:"quantity"`
    PricePerKg      float64   `json:"pricePerKg"`
    TotalValue      float64   `json:"totalValue"`
    Currency        string    `json:"currency"`
    
    // Status & Approval
    Status          string    `json:"status"`
    ContractDate    string    `json:"contractDate"`
    ApprovedBy      string    `json:"approvedBy"`
    ApprovedAt      time.Time `json:"approvedAt"`
}
```

#### Letters of Credit
```go
type LetterOfCredit struct {
    LCID              string    `json:"lcId"`
    ContractID        string    `json:"contractId"`
    ExporterID        string    `json:"exporterId"`
    
    // Banking
    IssuingBank       string    `json:"issuingBank"`
    AdvisingBank      string    `json:"advisingBank"`
    LCNumber          string    `json:"lcNumber"`
    SwiftReference    string    `json:"swiftReference"`
    
    // Terms
    Amount            float64   `json:"amount"`
    Currency          string    `json:"currency"`
    ExpiryDate        string    `json:"expiryDate"`
    Status            string    `json:"status"`
    
    // Blockchain Audit
    CreatedAt         time.Time `json:"createdAt"`
    UpdatedAt         time.Time `json:"updatedAt"`
}
```

#### Audit Logs (Cryptographic Signatures)
```go
type AuditLog struct {
    LogID          string               `json:"logId"`
    ActionType     string               `json:"actionType"`
    EntityType     string               `json:"entityType"`
    EntityID       string               `json:"entityId"`
    
    // Cryptographic Proof
    Signature      TransactionSignature `json:"signature"`
    
    // Changes
    StatusBefore   string               `json:"statusBefore"`
    StatusAfter    string               `json:"statusAfter"`
    Changes        []FieldChange        `json:"changes"`
    
    // Compliance
    ComplianceData ComplianceMetadata   `json:"complianceData"`
    CreatedAt      time.Time            `json:"createdAt"`
}

type TransactionSignature struct {
    TransactionID     string    `json:"transactionId"`
    Timestamp         time.Time `json:"timestamp"`
    FunctionName      string    `json:"functionName"`
    Caller            Identity  `json:"caller"`
    DataHash          string    `json:"dataHash"`  // SHA-256
    PreviousStateHash string    `json:"previousStateHash"`
    NewStateHash      string    `json:"newStateHash"`
}
```

### Why Hyperledger Fabric?

✅ **Immutability**: Records can never be altered or deleted  
✅ **Consensus**: All organizations must agree on state changes  
✅ **Cryptographic Proof**: SHA-256 hashes + X.509 certificates  
✅ **Multi-Party Trust**: No single organization controls the data  
✅ **Audit Trail**: Complete history of every transaction  
✅ **Smart Contracts**: Business logic enforced by chaincode  
✅ **Privacy**: Channel-based segregation of data  

### Use Cases
- Recording shipment status transitions
- Immutable contract registration
- Letter of Credit lifecycle
- Payment records
- Quality inspection results
- Customs declarations
- Compliance verification

---

## 3. CouchDB (Fabric's World State Database)

### Purpose
CouchDB is **not a separate system** - it's **Hyperledger Fabric's state database**. Each Fabric peer uses CouchDB to store the current state of blockchain data.

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│          HYPERLEDGER FABRIC PEER ARCHITECTURE           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────┐       │
│  │         PEER NODE (e.g., peer0.ecta)       │       │
│  ├────────────────────────────────────────────┤       │
│  │                                            │       │
│  │  ┌──────────────────────────────────┐     │       │
│  │  │      CHAINCODE CONTAINER         │     │       │
│  │  │   (Coffee Smart Contract Go)     │     │       │
│  │  └──────────────────────────────────┘     │       │
│  │                   │                        │       │
│  │                   ▼                        │       │
│  │  ┌──────────────────────────────────┐     │       │
│  │  │        LEDGER                    │     │       │
│  │  ├──────────────────────────────────┤     │       │
│  │  │                                  │     │       │
│  │  │  1. BLOCKCHAIN (Blocks)          │     │       │
│  │  │     - Immutable transaction log  │     │       │
│  │  │     - Block files on disk        │     │       │
│  │  │                                  │     │       │
│  │  │  2. WORLD STATE (Current State)  │     │       │
│  │  │     ↓                            │     │       │
│  │  │  ┌─────────────────────────┐    │     │       │
│  │  │  │      COUCHDB            │    │     │       │
│  │  │  ├─────────────────────────┤    │     │       │
│  │  │  │ • Key-Value store       │    │     │       │
│  │  │  │ • JSON documents        │    │     │       │
│  │  │  │ • Rich queries          │    │     │       │
│  │  │  │ • Mango query language  │    │     │       │
│  │  │  └─────────────────────────┘    │     │       │
│  │  └──────────────────────────────────┘     │       │
│  │                                            │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### What CouchDB Contains

CouchDB stores the **current state** (world state) of all blockchain assets as JSON documents:

#### Example: Shipment Document
```json
{
  "_id": "SHIPMENT_SHIP1786102768",
  "_rev": "5-9c65296036141e575d32ba9c034dd3eb",
  "shipmentId": "SHIP1786102768",
  "contractId": "CONTRACT-02768434",
  "exporterId": "EXP-BUNAKOO",
  "quantity": 20000,
  "grade": "Grade A",
  "origin": "Yirgacheffe",
  "coffeeType": "Arabica Washed",
  "status": "LAND_TRANSPORT",
  "transportMode": "SEA",
  "shippingLine": "Maersk Line",
  "vesselName": "MSC ATHENS",
  "landTransportCompany": "DHL Supply Chain Ethiopia",
  "truckPlateNumber": "3-87654",
  "driverName": "Mulugeta Bekele",
  "createdAt": "2026-08-20T10:00:00Z",
  "updatedAt": "2026-09-01T08:00:00Z"
}
```

#### Example: Contract Document
```json
{
  "_id": "CONTRACT_CONTRACT-02768434",
  "_rev": "2-7c1f1e32f4c51b0c15d74a22a6de4037",
  "contractId": "CONTRACT-02768434",
  "exporterId": "EXP-BUNAKOO",
  "buyerId": "BUYER-TOLAWAQ",
  "buyerName": "TOLAWAQ Trading GmbH",
  "buyerCountry": "Germany",
  "coffeeType": "Arabica Yirgacheffe",
  "quantity": 20000,
  "pricePerKg": 2.25,
  "totalValue": 45000,
  "currency": "USD",
  "status": "APPROVED",
  "contractDate": "2026-07-25T00:00:00Z",
  "approvedBy": "ECTA-Officer-123",
  "approvedAt": "2026-07-27T14:30:00Z"
}
```

### CouchDB Features Used

#### 1. **Key-Value Storage**
Fast retrieval by key:
```javascript
// Chaincode automatically stores to CouchDB
await ctx.stub.putState("SHIPMENT_" + shipmentID, JSON.stringify(shipment));

// Retrieval
const shipmentBytes = await ctx.stub.getState("SHIPMENT_" + shipmentID);
const shipment = JSON.parse(shipmentBytes.toString());
```

#### 2. **Rich Queries (Mango)**
Complex JSON queries without writing chaincode:
```javascript
// Find all shipments in LAND_TRANSPORT status
const query = {
  selector: {
    status: "LAND_TRANSPORT",
    transportMode: "SEA"
  },
  sort: [{ updatedAt: "desc" }],
  limit: 100
};

const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
```

#### 3. **Indexes**
Speed up queries with JSON indexes:
```json
{
  "index": {
    "fields": ["status", "updatedAt"]
  },
  "ddoc": "indexStatusDoc",
  "name": "indexStatus",
  "type": "json"
}
```

#### 4. **Pagination**
Handle large result sets:
```javascript
const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(
  JSON.stringify(query),
  pageSize,
  bookmark
);
```

### Why CouchDB (Not LevelDB)?

Hyperledger Fabric supports two state databases:

| Feature | **CouchDB** ✅ | LevelDB |
|---------|---------------|---------|
| **Rich Queries** | Yes (JSON queries) | No (key-only) |
| **Data Format** | JSON documents | Key-value bytes |
| **Indexes** | Yes (Mango) | No |
| **Query Language** | Mango Query | Key range only |
| **Use Case** | Complex business logic | Simple key-value |
| **Performance** | Good for queries | Faster writes |

**CECBS uses CouchDB because**:
- Need to query shipments by status, exporter, date
- JSON structure matches TypeScript/JavaScript
- Complex business queries (e.g., "find all shipments for exporter X in status Y")
- Better for consortium where multiple orgs query data

---

## Data Flow: How the Three Tiers Work Together

### Example: Shipment Status Update

```
┌────────────────────────────────────────────────────────────┐
│  USER ACTION: Shipping Officer clicks "Start Land Transport" │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 1: API Validates Request                             │
│  • Check user permissions (from PostgreSQL)                │
│  • Validate input data                                     │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 2: Call Blockchain                                   │
│  POST /api/v1/shipments/SHIP123/land-transport             │
│  ↓                                                          │
│  fabricService.invokeChaincode(                            │
│    'StartLandTransport',                                   │
│    [shipmentID, company, truck, driver, seal]              │
│  )                                                          │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 3: Hyperledger Fabric Processes                      │
│                                                            │
│  A. Chaincode Execution (Coffee Smart Contract)           │
│     • Validate status = CUSTOMS_CLEARED                    │
│     • Update shipment.status = LAND_TRANSPORT              │
│     • Add transport details                                │
│     • Create cryptographic signature                       │
│                                                            │
│  B. Endorsement                                            │
│     • Shipping peer endorses                               │
│     • ECTA peer endorses                                   │
│     • Banks peer endorses                                  │
│                                                            │
│  C. Ordering                                               │
│     • Transaction sent to orderer                          │
│     • Block created                                        │
│                                                            │
│  D. Commit                                                 │
│     • Block appended to blockchain (immutable)             │
│     • World state updated in CouchDB                       │
│                                                            │
│     CouchDB now contains:                                  │
│     {                                                      │
│       "_id": "SHIPMENT_SHIP123",                           │
│       "status": "LAND_TRANSPORT",  ← Updated!             │
│       "landTransportCompany": "DHL",                       │
│       "truckPlateNumber": "3-87654",                       │
│       "updatedAt": "2026-09-01T08:00:00Z"                  │
│     }                                                      │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 4: Sync to PostgreSQL                                │
│  • Listen for blockchain event                             │
│  • Update audit_trail table:                               │
│                                                            │
│    INSERT INTO audit_trail (                               │
│      entity_type, entity_id, action,                       │
│      performed_by, old_value, new_value,                   │
│      source, blockchain_tx_id                              │
│    ) VALUES (                                              │
│      'SHIPMENT', 'SHIP123', 'START_LAND_TRANSPORT',        │
│      'shipping_officer@shipping.et',                       │
│      'CUSTOMS_CLEARED', 'LAND_TRANSPORT',                  │
│      'HYPERLEDGER_FABRIC', 'tx_7f3a9c2e...'                │
│    );                                                      │
│                                                            │
│  • PostgreSQL now has queryable audit record               │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 5: Return Response to Frontend                       │
│  {                                                         │
│    "success": true,                                        │
│    "message": "Land transport started",                    │
│    "data": {                                               │
│      "shipmentId": "SHIP123",                              │
│      "status": "LAND_TRANSPORT",                           │
│      "transactionId": "tx_7f3a9c2e...",                    │
│      "timestamp": "2026-09-01T08:00:00Z"                   │
│    }                                                       │
│  }                                                         │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 6: UI Updates                                        │
│  • Show success notification                               │
│  • Refresh shipments table                                 │
│  • Update KPI cards                                        │
└────────────────────────────────────────────────────────────┘
```

---

## Query Patterns: When to Use Which Database

### PostgreSQL Queries

```typescript
// ✅ User authentication
const user = await db.get(
  'SELECT * FROM users WHERE username = $1',
  [username]
);

// ✅ Dashboard KPIs (aggregations)
const stats = await db.get(`
  SELECT 
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
    COUNT(*) FILTER (WHERE status = 'CLEARED') as cleared,
    AVG(EXTRACT(EPOCH FROM (cleared_date - created_at))/3600) as avg_hours
  FROM customs_clearances
  WHERE created_at >= NOW() - INTERVAL '30 days'
`);

// ✅ Search with filters
const applications = await db.all(`
  SELECT * FROM exporter_applications
  WHERE company_name ILIKE $1
    AND status = $2
    AND created_at >= $3
  ORDER BY created_at DESC
  LIMIT 50
`, [`%${searchTerm}%`, 'PENDING', startDate]);

// ✅ Audit trail queries
const auditLogs = await db.all(`
  SELECT 
    at.*,
    u.full_name as performed_by_name
  FROM audit_trail at
  LEFT JOIN users u ON at.performed_by = u.username
  WHERE at.entity_type = $1 
    AND at.entity_id = $2
  ORDER BY at.performed_at DESC
`, ['SHIPMENT', shipmentId]);
```

### Blockchain/CouchDB Queries

```typescript
// ✅ Get current shipment state
const shipment = await fabricService.query(
  'ReadShipment',
  [shipmentId]
);

// ✅ Rich query (uses CouchDB Mango)
const shipmentsInTransit = await fabricService.query(
  'QueryShipments',
  [JSON.stringify({
    selector: {
      status: { $in: ['LAND_TRANSPORT', 'IN_TRANSIT'] },
      transportMode: 'SEA'
    },
    sort: [{ updatedAt: 'desc' }]
  })]
);

// ✅ Get complete blockchain history
const history = await fabricService.query(
  'GetShipmentHistory',
  [shipmentId]
);
// Returns: Array of all state changes with block numbers, timestamps, actors

// ✅ Immutable audit verification
const auditLog = await fabricService.query(
  'GetAuditLog',
  [logId]
);
// Returns: Cryptographic signature, hashes, certificates
```

---

## Decision Matrix: Where to Store What?

| Data Type | PostgreSQL | Blockchain | CouchDB | Reason |
|-----------|-----------|------------|---------|--------|
| **User accounts** | ✅ | ❌ | ❌ | Mutable, needs fast auth queries |
| **Passwords** | ✅ | ❌ | ❌ | Sensitive, needs bcrypt |
| **Shipment status** | ❌ | ✅ | ✅* | Immutable, multi-party trust |
| **Contracts** | ❌ | ✅ | ✅* | Immutable, legally binding |
| **LCs** | ❌ | ✅ | ✅* | Immutable, financial compliance |
| **Customs clearances** | ✅ | ✅ | ✅* | Both (fast queries + immutability) |
| **Audit logs** | ✅ | ✅ | ✅* | Both (queryable + cryptographic) |
| **Email logs** | ✅ | ❌ | ❌ | Not business-critical |
| **Session data** | ✅ | ❌ | ❌ | Temporary |
| **Analytics cache** | ✅ | ❌ | ❌ | Computed, can be regenerated |

*CouchDB contains data **because** it's stored on blockchain (world state)

---

## Configuration

### PostgreSQL Connection
```typescript
// api/src/services/databaseService.ts
const connectionString = process.env.DATABASE_URL || 
  'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

const pgPool = new Pool({ connectionString });
```

### Hyperledger Fabric Connection
```typescript
// api/src/services/fabricService.ts
const connectionProfile = {
  peers: {
    'peer0.ecta.cecbs.et': {
      url: 'grpcs://localhost:7051',
      tlsCACerts: { path: './organizations/peerOrganizations/ecta.cecbs.et/tlsca/tlsca.cecbs.et-cert.pem' }
    }
  },
  certificateAuthorities: {
    'ca.ecta.cecbs.et': {
      url: 'https://localhost:7054'
    }
  }
};
```

### CouchDB (Fabric State Database)
```yaml
# docker-compose-fabric.yml
services:
  couchdb.peer0.ecta:
    image: couchdb:3.3.2
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=adminpw
    ports:
      - 5984:5984
    volumes:
      - couchdb.peer0.ecta:/opt/couchdb/data
      
  peer0.ecta.cecbs.et:
    environment:
      - CORE_LEDGER_STATE_STATEDATABASE=CouchDB
      - CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb.peer0.ecta:5984
      - CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin
      - CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=adminpw
```

---

## Best Practices

### 1. Data Consistency
```typescript
// Always write to blockchain first, then PostgreSQL
async function updateShipmentStatus(shipmentId: string, newStatus: string) {
  // 1. Write to blockchain (source of truth)
  const txId = await fabricService.invoke(
    'UpdateShipmentStatus',
    [shipmentId, newStatus]
  );
  
  // 2. Sync to PostgreSQL for fast queries
  await db.run(`
    INSERT INTO audit_trail (
      entity_type, entity_id, action, new_value,
      source, blockchain_tx_id
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, ['SHIPMENT', shipmentId, 'STATUS_UPDATE', newStatus, 
      'HYPERLEDGER_FABRIC', txId]);
  
  return { success: true, transactionId: txId };
}
```

### 2. Query Optimization
```typescript
// Fast dashboard: use PostgreSQL aggregations
async function getDashboardStats() {
  return await db.get(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'CUSTOMS_CLEARED') as ready_for_transport,
      COUNT(*) FILTER (WHERE status IN ('LAND_TRANSPORT', 'IN_TRANSIT')) as in_progress,
      COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered
    FROM shipment_cache
    WHERE updated_at >= NOW() - INTERVAL '90 days'
  `);
}

// Detailed verification: use blockchain
async function getShipmentWithProof(shipmentId: string) {
  const shipment = await fabricService.query('ReadShipment', [shipmentId]);
  const history = await fabricService.query('GetShipmentHistory', [shipmentId]);
  return { shipment, history };
}
```

### 3. Error Handling
```typescript
try {
  // Blockchain operations can fail (endorsement, ordering, commit)
  await fabricService.invoke('StartLandTransport', [...args]);
} catch (error) {
  if (error.message.includes('MVCC_READ_CONFLICT')) {
    // Concurrent update - retry
    logger.warn('MVCC conflict, retrying...');
    await sleep(1000);
    return updateShipmentStatus(shipmentId, newStatus);
  }
  throw error;
}
```

---

## Summary

| Database | Purpose | Data Examples | Access Pattern |
|----------|---------|---------------|----------------|
| **PostgreSQL** | Fast queryable metadata | Users, auth, aggregations | Direct SQL |
| **Hyperledger Fabric** | Immutable business records | Shipments, contracts, LCs | Chaincode invocation |
| **CouchDB** | Fabric world state | Current state of blockchain assets | Automatic (via Fabric) |

**Key Insight**: CouchDB is not a separate database you manage - it's **part of Hyperledger Fabric**. Each Fabric peer has its own CouchDB instance that stores the world state. You interact with CouchDB indirectly through Fabric chaincode and queries.

---

*For questions about the data architecture, contact the CECBS development team.*

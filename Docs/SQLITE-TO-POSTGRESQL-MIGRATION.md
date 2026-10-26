# 🔄 SQLite to PostgreSQL Migration Guide
## Complete Migration Strategy for CECBS

*Last Updated: September 1, 2026*

---

## Current State Analysis

Your CECBS system currently has **mixed database usage**:

- ✅ **PostgreSQL**: Already used in `databaseService.ts` (primary production database)
- ❌ **SQLite**: Legacy code in scripts and some utility functions
- ✅ **Hyperledger Fabric + CouchDB**: Blockchain consortium features

### SQLite Usage Found

1. **Scripts** (Migration/Admin tools):
   - `scripts/update-old-applications.js`
   - `scripts/migrate-db.js`
   - `scripts/check-admin-role.js`
   - `scripts/add-admin-user.js`
   - `api/scripts/add-bank-columns.js`
   - `api/scripts/add-new-columns.js`

2. **Services**:
   - All services already use `DatabaseService.getInstance()` which is PostgreSQL ✅
   - No SQLite in production code ✅

3. **Tests**:
   - `tests/validate-full-integration.js` - mentions SQLite in output message

**GOOD NEWS**: Your main application code already uses PostgreSQL! Only utility scripts need updating.

---

## Migration Strategy

### Option 1: Quick Fix - Update Scripts Only (Recommended)

Since your production code already uses PostgreSQL, you only need to update the utility scripts.

#### Step 1: Install PostgreSQL Client for Scripts

```bash
cd scripts
npm install pg
```

#### Step 2: Create Script Database Helper

**File: `scripts/db-helper.js`**

```javascript
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

const pool = new Pool({ connectionString });

async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function get(text, params = []) {
  const result = await query(text, params);
  return result.rows[0];
}

async function all(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

async function run(text, params = []) {
  return await query(text, params);
}

async function close() {
  await pool.end();
}

module.exports = { query, get, all, run, close, pool };
```

#### Step 3: Update Scripts

**Before (SQLite):**
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./api/cecbs.db');

db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
  if (err) console.error(err);
  console.log(row);
});
```

**After (PostgreSQL):**
```javascript
const db = require('./db-helper');

async function run() {
  try {
    const row = await db.get(
      'SELECT * FROM users WHERE username = $1', 
      [username]
    );
    console.log(row);
  } catch (error) {
    console.error(error);
  } finally {
    await db.close();
  }
}

run();
```

---

## Updated Scripts

### 1. Add Admin User Script

**File: `scripts/add-admin-user-pg.js`**

```javascript
#!/usr/bin/env node
/**
 * Add Admin User - PostgreSQL Version
 * Run: node scripts/add-admin-user-pg.js
 */

const bcrypt = require('bcrypt');
const db = require('./db-helper');

async function addAdminUser() {
  console.log('📁 Connecting to PostgreSQL...');
  console.log('🔄 Creating admin user...\n');

  try {
    // Check if admin already exists
    const existing = await db.get(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (existing) {
      console.log('⚠️  Admin user already exists!');
      console.log('   Username:', existing.username);
      console.log('   Email:', existing.email);
      console.log('   Role:', existing.role);
      console.log('\n💡 If you need to reset password, delete this user first.');
      await db.close();
      return;
    }

    // Create new admin
    const password = 'admin123'; // Change this!
    const passwordHash = await bcrypt.hash(password, 10);

    await db.run(`
      INSERT INTO users (
        username, password_hash, full_name, email, phone,
        role, organization, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      'admin',
      passwordHash,
      'System Administrator',
      'admin@cecbs.et',
      '+251-911-000-000',
      'ADMIN',
      'CECBS',
      true
    ]);

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

    // List all users
    const users = await db.all(
      'SELECT id, username, email, role, organization, is_active FROM users ORDER BY id'
    );

    console.log('📊 Current users in database:');
    console.table(users);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

addAdminUser().catch(console.error);
```

### 2. Check Admin Role Script

**File: `scripts/check-admin-role-pg.js`**

```javascript
#!/usr/bin/env node
const db = require('./db-helper');

async function checkAdmin() {
  console.log('🔄 Checking admin user...\n');

  try {
    const admin = await db.get(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (!admin) {
      console.log('❌ No admin user found!');
      console.log('💡 Run: node scripts/add-admin-user-pg.js');
      await db.close();
      return;
    }

    console.log('✅ Admin user found:');
    console.log('   ID:', admin.id);
    console.log('   Username:', admin.username);
    console.log('   Full Name:', admin.full_name);
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Organization:', admin.organization);
    console.log('   Status:', admin.is_active ? 'Active' : 'Inactive');
    console.log('   Created:', admin.created_at);

    // Check permissions
    const auditCount = await db.get(
      'SELECT COUNT(*) as count FROM audit_trail WHERE performed_by = $1',
      [admin.username]
    );

    console.log('\n📊 Admin activity:');
    console.log('   Audit entries:', auditCount.count);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.close();
  }
}

checkAdmin().catch(console.error);
```

### 3. Database Migration Script

**File: `scripts/migrate-db-pg.js`**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const db = require('./db-helper');

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  const migrationsDir = path.join(__dirname, '..', 'api', 'src', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('❌ Migrations directory not found:', migrationsDir);
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📁 Found ${files.length} migration files\n`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`⚙️  Running: ${file}`);

    try {
      // Split by semicolon and run each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        await db.run(statement);
      }

      console.log(`   ✅ Success\n`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`   ⏭️  Already applied\n`);
      } else {
        console.error(`   ❌ Error: ${error.message}\n`);
        throw error;
      }
    }
  }

  console.log('✅ All migrations completed!\n');
  await db.close();
}

runMigrations().catch(console.error);
```

### 4. Update Applications Script

**File: `scripts/update-old-applications-pg.js`**

```javascript
#!/usr/bin/env node
const db = require('./db-helper');

async function updateApplications() {
  console.log('🔄 Starting database update...\n');

  try {
    // Find applications missing fields
    const oldApps = await db.all(`
      SELECT application_id, exporter_id, company_name, status
      FROM exporter_applications
      WHERE ecta_reviewed_at IS NULL
        AND status = 'APPROVED'
    `);

    console.log(`📋 Found ${oldApps.length} applications to update\n`);

    for (const app of oldApps) {
      console.log(`⚙️  Updating: ${app.application_id}`);

      await db.run(`
        UPDATE exporter_applications
        SET 
          ecta_reviewed_at = NOW() - INTERVAL '7 days',
          ecta_reviewed_by = 'System Migration',
          license_status = 'ACTIVE',
          ecx_inspected_at = NOW() - INTERVAL '5 days',
          ecx_inspector = 'Migration Script',
          quality_grade = 'Grade A',
          ecx_inspection_result = 'PASSED',
          approved_at = NOW() - INTERVAL '3 days',
          approved_by = 'System'
        WHERE application_id = $1
      `, [app.application_id]);

      console.log(`   ✅ Updated\n`);
    }

    console.log('✅ All applications updated!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

updateApplications().catch(console.error);
```

---

## Remove SQLite Dependencies

### Update package.json

**Remove:**
```json
{
  "dependencies": {
    "sqlite3": "^5.1.x",
    "better-sqlite3": "^x.x.x"
  }
}
```

**Keep:**
```json
{
  "dependencies": {
    "pg": "^8.11.3"
  }
}
```

### Remove SQLite Files

```bash
# Remove SQLite database files
rm api/cecbs.db
rm api/cecbs.db.backup*
rm api/*.db

# Remove old SQLite scripts
rm scripts/migrate-db.js
rm scripts/check-admin-role.js
rm scripts/add-admin-user.js
rm scripts/update-old-applications.js
rm api/scripts/add-bank-columns.js
rm api/scripts/add-new-columns.js

# Remove SQLite npm package
cd api
npm uninstall sqlite3 better-sqlite3
```

---

## Verify PostgreSQL Configuration

### 1. Check Environment Variables

**File: `api/.env`**

```env
# PostgreSQL Database
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs

# Blockchain
BLOCKCHAIN_ENABLED=true
FABRIC_NETWORK_PATH=/path/to/fabric/network

# Application
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key
```

### 2. Verify databaseService.ts

**File: `api/src/services/databaseService.ts`**

Your current implementation already uses PostgreSQL correctly! ✅

```typescript
import { Pool, PoolClient, QueryResult } from 'pg';

export class DatabaseService {
  private static instance: DatabaseService;
  private pgPool: Pool | null = null;

  private constructor() {
    this.connect();
  }

  private connect(): void {
    const connectionString = process.env.DATABASE_URL || 
      'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
    
    this.pgPool = new Pool({ connectionString });
    
    this.pgPool.on('connect', () => {
      logger.info(`✅ PostgreSQL connected`);
    });
  }

  // ... rest of methods use pgPool ✅
}
```

---

## Consortium Blockchain Features to Maximize

Now that we're using only PostgreSQL for off-chain data, let's maximize blockchain features:

### 1. **Multi-Organization Consensus**

Ensure all critical operations require endorsement from multiple organizations:

```yaml
# configtx.yaml - Endorsement Policy
Policies:
  Endorsement:
    Type: Signature
    Rule: "AND('ECTAMSP.member', 'BanksMSP.member', 'NBEMSP.member')"
```

**What this means:**
- ✅ ECTA, Banks, and NBE must all agree before a transaction is committed
- ✅ No single organization can unilaterally modify data
- ✅ True consortium governance

### 2. **Immutable Audit Trail**

Store ALL critical business events on blockchain:

```go
// Chaincode: Every status change creates immutable log
func (c *CoffeeContract) UpdateShipmentStatus(...) {
  // 1. Update state
  shipment.Status = newStatus
  
  // 2. Create cryptographic audit log
  c.CreateAuditLog(ctx, "STATUS_UPDATE", "SHIPMENT", shipmentID,
    oldStatus, newStatus, changes, reason, compliance)
  
  // 3. Emit blockchain event
  ctx.GetStub().SetEvent("ShipmentStatusChanged", eventJSON)
}
```

**Benefits:**
- ✅ Cannot delete or modify history
- ✅ Cryptographically signed by X.509 certificates
- ✅ SHA-256 hashes prove data integrity

### 3. **Channel-Based Privacy**

Use Fabric channels for data segregation:

```
coffeechannel (Main Channel)
├─ ECTA Peer ✅
├─ Banks Peer ✅
├─ NBE Peer ✅
├─ Customs Peer ✅
├─ Shipping Peer ✅
├─ ECX Peer ✅
└─ Orderer ✅

privatechannel (Financial Data)
├─ Banks Peer ✅
├─ NBE Peer ✅
└─ Orderer ✅
```

### 4. **Smart Contract Business Logic**

Move ALL business rules to chaincode:

```go
// Enforce business rules on blockchain
func (c *CoffeeContract) StartLandTransport(...) {
  // Rule 1: Must be customs cleared
  if shipment.Status != "CUSTOMS_CLEARED" {
    return fmt.Errorf("cannot start transport: not cleared")
  }
  
  // Rule 2: Must have required documents
  if len(shipment.Documents) < 7 {
    return fmt.Errorf("missing required documents")
  }
  
  // Rule 3: EUDR compliance check
  if shipment.Destination == "EU" && !shipment.EudrCompliant {
    return fmt.Errorf("EUDR compliance required for EU exports")
  }
  
  // All checks passed - update state
  shipment.Status = "LAND_TRANSPORT"
  // ... save to blockchain
}
```

### 5. **Private Data Collections**

Store sensitive data in private collections:

```yaml
# collections_config.json
[
  {
    "name": "financialData",
    "policy": "OR('BanksMSP.member', 'NBEMSP.member')",
    "requiredPeerCount": 1,
    "maxPeerCount": 2,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": true
  }
]
```

**Use for:**
- Letter of Credit amounts
- Forex allocations
- Payment details
- Pricing information

### 6. **Event-Driven Architecture**

Subscribe to blockchain events in real-time:

```typescript
// api/src/services/fabricService.ts
async function subscribeToBlockchainEvents() {
  const network = await gateway.getNetwork('coffeechannel');
  const contract = network.getContract('coffee');
  
  // Listen for all events
  await contract.addContractListener(async (event) => {
    const eventName = event.eventName;
    const payload = JSON.parse(event.payload.toString());
    
    switch(eventName) {
      case 'ShipmentStatusChanged':
        await syncShipmentToPostgres(payload);
        await sendNotifications(payload);
        break;
        
      case 'LCIssued':
        await updateDashboardKPIs();
        await notifyExporter(payload.exporterId);
        break;
        
      case 'AuditLogCreated':
        await cacheAuditLog(payload);
        break;
    }
  });
}
```

---

## Final Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  CECBS CONSORTIUM SYSTEM                     │
└──────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌──────────────────┐ ┌─────────────────────────────────┐
│   POSTGRESQL     │ │   HYPERLEDGER FABRIC            │
│   (Off-Chain)    │ │   + COUCHDB (State DB)          │
├──────────────────┤ ├─────────────────────────────────┤
│ ❌ No SQLite     │ │ ✅ Multi-Org Consensus          │
│ ✅ Fast queries  │ │ ✅ Immutable ledger             │
│ ✅ User accounts │ │ ✅ Cryptographic signatures     │
│ ✅ Metadata      │ │ ✅ Smart contracts              │
│ ✅ Cache         │ │ ✅ Private data collections     │
│ ✅ Analytics     │ │ ✅ Event-driven sync            │
└──────────────────┘ │ ✅ Channel-based privacy        │
                     │ ✅ Audit trail                  │
                     └─────────────────────────────────┘
```

**Clear Separation:**
- **PostgreSQL**: Non-critical, queryable, mutable data
- **Blockchain**: Critical, immutable, consensus-driven data
- **No SQLite**: Completely removed from the system

---

## Migration Checklist

- [ ] Install `pg` package in scripts: `cd scripts && npm install pg`
- [ ] Create `scripts/db-helper.js`
- [ ] Update all scripts to use PostgreSQL
- [ ] Test each script:
  - [ ] `node scripts/add-admin-user-pg.js`
  - [ ] `node scripts/check-admin-role-pg.js`
  - [ ] `node scripts/migrate-db-pg.js`
  - [ ] `node scripts/update-old-applications-pg.js`
- [ ] Remove SQLite packages: `npm uninstall sqlite3 better-sqlite3`
- [ ] Delete old SQLite scripts
- [ ] Delete `.db` files
- [ ] Update documentation
- [ ] Test full system startup
- [ ] Verify blockchain features working
- [ ] Run integration tests

---

## Testing

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Run migrations
node scripts/migrate-db-pg.js

# 3. Create admin user
node scripts/add-admin-user-pg.js

# 4. Start Fabric network
./start-fabric.sh

# 5. Start API
cd api && npm start

# 6. Start UI
cd ui && npm run dev

# 7. Test login with admin/admin123
# 8. Create test shipment
# 9. Verify blockchain transaction recorded
# 10. Check PostgreSQL audit_trail synchronized
```

---

## Support

For issues during migration:
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Check Fabric peers running: `docker ps | grep peer`
3. Check CouchDB running: `docker ps | grep couchdb`
4. Review logs: `docker logs <container-name>`

---

*Migration Guide Complete - Your CECBS system will be a true consortium blockchain powered by Hyperledger Fabric with PostgreSQL as the only off-chain database.*

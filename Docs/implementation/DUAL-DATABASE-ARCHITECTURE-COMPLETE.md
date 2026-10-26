# Dual-Database Architecture: Complete Implementation Guide

## Overview
The CECBS system uses a **dual-database architecture** where:
- **Blockchain (Hyperledger Fabric + CouchDB)**: Source of truth for immutable records
- **PostgreSQL**: Relational database for fast queries, reporting, and application state

## Current Architecture

### ✅ What Works Correctly

1. **Blockchain as Source of Truth**
   - All critical business transactions go to blockchain FIRST
   - Chaincode functions create audit logs via `CreateAuditLog()`
   - Cryptographic signatures, MSP identity capture, immutable records

2. **API Fetches from Both Sources**
   - `/api/v1/audit/entity/:entityType/:entityId` fetches from:
     - Blockchain audit logs (`QueryAuditLogsByEntity` chaincode)
     - PostgreSQL audit_trail table
     - PostgreSQL application data (exporter_applications, etc.)
   - Merges and deduplicates results

3. **UI Timeline Component**
   - Fetches complete workflow (6 entity types)
   - Shows blockchain-verified data with cryptographic signatures
   - Displays expected vs actual actors

### ⚠️ Gaps in Current Implementation

1. **Blockchain Operations Don't Sync to PostgreSQL**
   - When API calls chaincode functions (RequestLC, AllocateForex, etc.), blockchain creates audit logs
   - These logs are NOT automatically copied to PostgreSQL `audit_trail` table
   - Result: PostgreSQL is incomplete, only has blockchain data when explicitly queried

2. **Some Routes Bypass AuditService**
   - `contracts.ts`, `documents.ts` manually INSERT into `audit_trail`
   - Should use `AuditService.log()` which writes blockchain FIRST, then PostgreSQL

3. **No Automatic Sync Mechanism**
   - No background job to backfill PostgreSQL from blockchain
   - No event listener to sync new blockchain transactions

---

## Complete Solution: Expert-Level Dual-Database Sync

### Solution 1: API Routes Use AuditService (Immediate Fix)

**Problem**: When API creates blockchain records, it doesn't log to PostgreSQL

**Solution**: After successful blockchain operations, call `AuditService.log()`

#### Example: Banking Routes

```typescript
// api/src/routes/banking.ts

import { AuditService } from '../services/auditService';
const auditService = AuditService.getInstance();

// After successful LC request
router.post('/lc/request', authMiddleware, requireRole(['EXPORTER']), async (req, res) => {
  try {
    // ... existing blockchain call ...
    const result = await fabricService.requestLC(...);
    
    if (result.success) {
      // ✅ LOG TO AUDIT SERVICE (writes blockchain + PostgreSQL)
      await auditService.log({
        entityType: 'LC',
        entityId: lcId,
        action: 'REQUEST',
        performedBy: req.user.username,
        organization: 'ECTAMSP',
        performedByOrg: 'ECTAMSP',
        oldValue: '',
        newValue: 'REQUESTED',
        reason: 'LC requested by exporter',
        metadata: {
          contractId: req.body.contractId,
          exporterId: req.body.exporterId,
          amount: req.body.amount
        },
        ipAddress: req.ip
      });
    }
    
    res.json(result);
  } catch (error) {
    // handle error
  }
});
```

**Apply to ALL blockchain operations:**
- LC request, approve, issue
- Forex request, allocate
- Contract register, approve
- Shipment create, update
- Payment initiate, settle

---

### Solution 2: Blockchain Event Listener (Advanced)

**Problem**: Manual logging in every route is error-prone

**Solution**: Listen to blockchain events and auto-sync to PostgreSQL

```typescript
// api/src/services/blockchainEventSync.ts

import { Gateway, Network, Contract } from 'fabric-network';
import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { logger } from '../utils/logger';

export class BlockchainEventSync {
  private static instance: BlockchainEventSync;
  private fabric: FabricService;
  private db: DatabaseService;
  private isListening: boolean = false;

  private constructor() {
    this.fabric = FabricService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): BlockchainEventSync {
    if (!BlockchainEventSync.instance) {
      BlockchainEventSync.instance = new BlockchainEventSync();
    }
    return BlockchainEventSync.instance;
  }

  /**
   * Start listening to blockchain events and sync to PostgreSQL
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      logger.info('[SYNC] Already listening to blockchain events');
      return;
    }

    try {
      logger.info('[SYNC] Starting blockchain event listener...');
      
      // Get network connection
      const network = await this.fabric.getNetwork();
      if (!network) {
        throw new Error('Network not available');
      }

      // Listen to all audit log events
      const listener = async (event: any) => {
        try {
          logger.info(`[SYNC] Received blockchain event: ${event.eventName}`);
          
          // Check if this is an audit log creation event
          if (event.eventName === 'AuditLogCreated' || event.payload) {
            const payload = JSON.parse(event.payload.toString());
            
            // Sync to PostgreSQL
            await this.syncAuditLogToPostgres(payload);
          }
        } catch (err) {
          logger.error('[SYNC] Error processing blockchain event:', err);
        }
      };

      // Register listener
      await network.addBlockListener(listener);
      
      this.isListening = true;
      logger.info('[SYNC] ✅ Blockchain event listener started');
    } catch (error) {
      logger.error('[SYNC] Failed to start event listener:', error);
      throw error;
    }
  }

  /**
   * Sync a single audit log entry to PostgreSQL
   */
  private async syncAuditLogToPostgres(auditLog: any): Promise<void> {
    try {
      // Check if already exists
      const existing = await this.db.get(
        `SELECT id FROM audit_trail WHERE metadata->>'blockchainTxId' = $1`,
        [auditLog.signature?.transactionId]
      );

      if (existing) {
        logger.debug(`[SYNC] Audit log ${auditLog.logId} already in PostgreSQL`);
        return;
      }

      // Insert into PostgreSQL
      await this.db.run(
        `INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          auditLog.entityType,
          auditLog.entityId,
          auditLog.actionType,
          auditLog.signature?.caller?.commonName || 'System',
          auditLog.signature?.caller?.mspId || 'UNKNOWN',
          auditLog.signature?.caller?.mspId || 'UNKNOWN',
          auditLog.statusBefore || '',
          auditLog.statusAfter || '',
          auditLog.reason || '',
          JSON.stringify({
            source: 'HYPERLEDGER_FABRIC',
            blockchainVerified: true,
            blockchainTxId: auditLog.signature?.transactionId,
            timestamp: auditLog.createdAt,
            signature: auditLog.signature,
            complianceData: auditLog.complianceData,
            syncedAt: new Date().toISOString()
          }),
          'blockchain-sync'
        ]
      );

      logger.info(`[SYNC] ✅ Synced audit log ${auditLog.logId} to PostgreSQL`);
    } catch (error) {
      logger.error(`[SYNC] Failed to sync audit log:`, error);
    }
  }

  /**
   * Backfill PostgreSQL with existing blockchain audit logs
   */
  async backfillFromBlockchain(entityType?: string, entityId?: string): Promise<{
    synced: number;
    skipped: number;
    errors: number;
  }> {
    const stats = { synced: 0, skipped: 0, errors: 0 };

    try {
      logger.info(`[SYNC] Starting backfill from blockchain...`);

      // If specific entity provided, backfill just that
      if (entityType && entityId) {
        const result = await this.fabric.queryChaincode('QueryAuditLogsByEntity', [
          entityType,
          entityId
        ]);

        if (result.success && result.data) {
          const logs = Array.isArray(result.data) ? result.data : [result.data];
          
          for (const log of logs) {
            try {
              await this.syncAuditLogToPostgres(log);
              stats.synced++;
            } catch (err) {
              stats.errors++;
            }
          }
        }

        logger.info(`[SYNC] Backfill complete: ${stats.synced} synced, ${stats.errors} errors`);
        return stats;
      }

      // Otherwise, would need to query all entities (expensive - implement pagination)
      logger.warn('[SYNC] Full backfill requires entity type and ID filters');
      return stats;
    } catch (error) {
      logger.error('[SYNC] Backfill failed:', error);
      throw error;
    }
  }

  /**
   * Stop listening to blockchain events
   */
  async stopListening(): Promise<void> {
    this.isListening = false;
    logger.info('[SYNC] Blockchain event listener stopped');
  }
}

export default BlockchainEventSync.getInstance();
```

**Usage in server.ts:**

```typescript
// api/src/server.ts

import blockchainEventSync from './services/blockchainEventSync';

async function startServer() {
  // ... existing code ...
  
  // Start blockchain event sync
  try {
    await blockchainEventSync.startListening();
    logger.info('✅ Blockchain event sync started');
  } catch (error) {
    logger.warn('⚠️ Could not start blockchain event sync:', error);
  }
  
  // ... rest of server start ...
}
```

---

### Solution 3: On-Demand Sync (Pragmatic Approach)

**Problem**: Real-time sync is complex, event listening may be unreliable

**Solution**: Sync to PostgreSQL when audit logs are fetched

```typescript
// api/src/routes/audit.ts

router.get('/entity/:entityType/:entityId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    // Fetch from blockchain
    const auditResponse = await fabricService.queryChaincode('QueryAuditLogsByEntity', [
      entityType,
      entityId
    ]);
    
    if (auditResponse.success && auditResponse.data) {
      const blockchainLogs = Array.isArray(auditResponse.data) 
        ? auditResponse.data 
        : [auditResponse.data];
      
      // ✅ SYNC TO POSTGRESQL (cache for future queries)
      for (const log of blockchainLogs) {
        try {
          // Check if already exists
          const existing = await dbService.get(
            `SELECT id FROM audit_trail WHERE metadata->>'blockchainTxId' = $1`,
            [log.signature?.transactionId]
          );
          
          if (!existing) {
            // Insert into PostgreSQL
            await dbService.run(
              `INSERT INTO audit_trail (
                entity_type, entity_id, action, performed_by, organization, performed_by_org,
                old_value, new_value, reason, metadata, ip_address, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                log.entityType,
                log.entityId,
                log.actionType,
                log.signature?.caller?.commonName || 'System',
                log.signature?.caller?.mspId || 'UNKNOWN',
                log.signature?.caller?.mspId || 'UNKNOWN',
                log.statusBefore || '',
                log.statusAfter || '',
                log.reason || '',
                JSON.stringify({
                  source: 'HYPERLEDGER_FABRIC',
                  blockchainVerified: true,
                  blockchainTxId: log.signature?.transactionId,
                  signature: log.signature,
                  complianceData: log.complianceData,
                  syncedAt: new Date().toISOString()
                }),
                'blockchain-sync',
                log.createdAt || new Date().toISOString()
              ]
            );
            
            logger.debug(`[SYNC] Cached blockchain audit log to PostgreSQL: ${log.logId}`);
          }
        } catch (syncErr) {
          logger.warn(`[SYNC] Could not cache audit log:`, syncErr);
          // Don't fail the request if sync fails
        }
      }
      
      // Return logs...
    }
  } catch (error) {
    // handle error
  }
});
```

---

## Recommended Implementation Strategy

### Phase 1: Immediate (Current Sprint)
✅ **Solution 3: On-Demand Sync**
- Low risk, easy to implement
- Caches blockchain logs to PostgreSQL when fetched
- No new services required

### Phase 2: Short-Term (Next Sprint)
✅ **Solution 1: Update API Routes**
- Add `auditService.log()` calls after blockchain operations
- Ensures future operations are properly logged
- Fixes missing audit logs going forward

### Phase 3: Long-Term (Future Enhancement)
✅ **Solution 2: Event Listener**
- Implement blockchain event sync service
- Real-time sync for production systems
- Requires Fabric event hub configuration

---

## Testing Checklist

After implementing sync solutions:

- [ ] Create new exporter application → Verify audit log in both DB and blockchain
- [ ] Register contract → Verify REGISTER action appears in timeline
- [ ] Request LC → Verify audit log synced to PostgreSQL
- [ ] Approve LC → Verify BanksMSP actor captured
- [ ] Allocate forex → Verify NBEMSP actor captured
- [ ] View LC timeline → Verify all 6 workflow stages appear
- [ ] Check PostgreSQL `audit_trail` table → Verify blockchain logs are cached
- [ ] Run backfill script → Verify historical data syncs correctly

---

## Database Schema Considerations

Current `audit_trail` table should have:

```sql
CREATE TABLE audit_trail (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  performed_by VARCHAR(255) NOT NULL,
  organization VARCHAR(100),
  performed_by_org VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  metadata JSONB,  -- Contains: source, blockchainVerified, blockchainTxId, signature
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_blockchain_tx ((metadata->>'blockchainTxId')),
  INDEX idx_audit_created_at (created_at DESC)
);
```

---

## Conclusion

The current system correctly uses blockchain as source of truth and fetches from it. The gap is that PostgreSQL doesn't get automatically populated for caching/performance.

**Expert Recommendation**: Implement Solution 3 (On-Demand Sync) immediately for data consistency, then Solution 1 (API Routes) for future operations. Solution 2 (Event Listener) is optional for high-scale production.

This ensures:
- ✅ Blockchain remains source of truth
- ✅ PostgreSQL is kept in sync for fast queries
- ✅ Complete workflow audit trail visible in UI
- ✅ Both databases capture all workflow stages

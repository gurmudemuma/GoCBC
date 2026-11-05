# Remaining Tasks Implementation Guide

## Tasks 14-16: Code Standardization & Portal Dashboards

### Status: Documented & Ready for Implementation
**Completion:** 13/16 tasks complete (81%)
**Remaining:** 3 tasks (code quality improvements)

---

## Task 14: Replace Manual Role Checks with Middleware

### Overview
Replace 20+ manual role checks with `requireRole()` middleware for consistency, security, and maintainability.

### Current Situation
Manual role checks scattered across route handlers:
```typescript
// ❌ CURRENT PATTERN (Manual, repetitive, error-prone)
router.post('/approve', authMiddleware, async (req, res) => {
  const user = req.user;
  
  if (user.role !== 'ECTA') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only ECTA can approve' }
    });
  }
  
  // Business logic here...
});
```

### Target Pattern
```typescript
// ✅ TARGET PATTERN (Middleware, clean, consistent)
router.post('/approve', 
  authMiddleware, 
  requireRole('ECTA'),  // ← Role check as middleware
  async (req, res) => {
    // Business logic here - role already verified
    // No need for manual checks
  }
);
```

### Files to Update (20+ occurrences)

#### 1. `/api/src/routes/audit.ts` (4 checks)
**Line 83-86:** Admin-only access
```typescript
// Current
if (userRole === 'ADMIN') {
  // Admin logic
}

// Replace with
router.get('/endpoint', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  // Admin logic
});
```

**Line 254-256:** Non-admin filter
**Line 317-319:** Admin-only verify
**Line 1894-1896:** Admin/ECTA verify

#### 2. `/api/src/routes/contracts.ts` (3 checks)
**Line 1313-1316:** ECTA approval
```typescript
// Current
if (userOrg !== 'ECTAMSP' && userRole !== 'ECTA' && userRole !== 'ECTA_ADMIN') {
  return res.status(403).json({ error: 'Forbidden' });
}

// Replace with
router.post('/:contractID/approve', 
  authMiddleware, 
  requireRole('ECTA', 'ECTA_ADMIN'),
  async (req, res) => {
    // Approval logic
  }
);
```

**Line 1387-1390:** Sales contract approval
**Line 1794-1797:** Contract rejection

#### 3. `/api/src/routes/users.ts` (7+ checks)
**Line 1039-1042:** Password reset (Admin/ECTA only)
**Line 1086-1089:** ECTA exporter check
**Line 1186-1189:** Password reset
**Line 1275-1278:** ECTA exporter check
**Line 1375-1378:** Bulk reset (Admin only)
**Line 1675-1678:** Permissions update
**Line 1814-1817:** Activity log view

#### 4. `/api/src/routes/eudr.ts` (1 check)
**Line 138-141:** ECTA-only approve
```typescript
// Replace
router.post('/:statementId/approve', 
  authMiddleware,
  requireRole('ECTA'),
  async (req, res) => { ... }
);
```

#### 5. `/api/src/routes/phytosanitary.ts` (2 checks)
**Line 136-139:** ECTA-only approve
**Line 204-207:** ECTA-only issue

#### 6. `/api/src/routes/crypto-users.ts` (3 checks)
**Line 244-247:** Admin/ECTA view identities
**Line 510-513:** Admin/ECTA expiring certs

### Implementation Steps

#### Step 1: Import requireRole
Ensure each route file imports the middleware:
```typescript
import { authMiddleware, requireRole } from '../middleware/auth';
// OR
import { requireRole } from '../middleware/rbac';
```

#### Step 2: Replace Manual Checks
For each manual role check:
1. Identify the endpoint and roles required
2. Add `requireRole(roles...)` to middleware chain
3. Remove manual `if (user.role !== ...)` check
4. Remove error response code
5. Test endpoint with different roles

#### Step 3: Multi-Role Support
For endpoints allowing multiple roles:
```typescript
// Multiple roles (OR logic)
requireRole('ADMIN', 'ECTA', 'ECTA_ADMIN')

// Any authenticated user - just use authMiddleware
authMiddleware
```

#### Step 4: Testing
Test each modified endpoint:
```bash
# Test with correct role (should succeed)
curl -H "Authorization: Bearer $ECTA_TOKEN" /api/v1/contracts/123/approve

# Test with wrong role (should return 403)
curl -H "Authorization: Bearer $EXPORTER_TOKEN" /api/v1/contracts/123/approve
```

### Benefits
- ✅ **Consistency:** All role checks handled the same way
- ✅ **Security:** Centralized authorization logic
- ✅ **Maintainability:** Change role logic in one place
- ✅ **Testability:** Easier to test role-based access
- ✅ **Code Reduction:** ~200 lines of duplicate checks removed

### Estimated Effort
- **Analysis:** ✅ Complete
- **Implementation:** 4-6 hours
- **Testing:** 2-3 hours
- **Total:** 6-9 hours

---

## Task 15: Standardize Status Updates to Use StatusManager

### Overview
Ensure all status updates use `statusManager.updateEntityStatus()` for consistent audit trail and blockchain sync.

### Current Situation
Mix of patterns across codebase:
```typescript
// ❌ PATTERN 1: Direct SQL update (no audit)
await db.run(
  'UPDATE contracts SET status = $1 WHERE contract_id = $2',
  ['APPROVED', contractId]
);

// ❌ PATTERN 2: Manual blockchain + DB (duplicated logic)
await fabricService.submitTransaction('UpdateStatus', contractId, 'APPROVED');
await db.run('UPDATE contracts SET status = $1 WHERE contract_id = $2', ['APPROVED', contractId]);
await auditService.log({ ... }); // Manual audit

// ❌ PATTERN 3: DB update without blockchain sync
await db.run('UPDATE contracts SET status = $1, updated_at = NOW() WHERE contract_id = $2', 
  ['APPROVED', contractId]
);
```

### Target Pattern
```typescript
// ✅ STANDARD PATTERN (All-in-one)
await statusManager.updateEntityStatus({
  entityType: 'CONTRACT',
  entityId: contractId,
  newStatus: 'APPROVED',
  reason: 'Contract approved by ECTA',
  updatedBy: user.username
});

// This handles:
// 1. Database update
// 2. Blockchain sync
// 3. Audit trail
// 4. Status validation
// 5. Timestamp update
```

### StatusManager API
```typescript
interface StatusUpdateParams {
  entityType: 'CONTRACT' | 'SHIPMENT' | 'LC' | 'FOREX' | 'PAYMENT' | 'CUSTOMS_DECLARATION';
  entityId: string;
  newStatus: string;
  reason: string;
  updatedBy: string;
  metadata?: any;
}

await statusManager.updateEntityStatus(params);
```

### Files to Audit

#### Priority 1: Core Workflow Files
1. **`/api/src/routes/contracts.ts`**
   - Contract approval/rejection
   - Status transitions
   
2. **`/api/src/routes/shipments.ts`**
   - Shipment status updates
   - Delivery confirmations
   
3. **`/api/src/routes/banking.ts`**
   - LC status updates
   - Payment confirmations
   
4. **`/api/src/routes/forex.ts`**
   - Forex allocation status
   - Utilization tracking

#### Priority 2: Supporting Files
5. **`/api/src/routes/quality.ts`**
   - Inspection status
   - Approval/rejection
   
6. **`/api/src/routes/customs.ts`**
   - Declaration status
   - Clearance status
   
7. **`/api/src/routes/payments.ts`**
   - Payment status
   - Settlement tracking

### Implementation Steps

#### Step 1: Identify Direct SQL Updates
```bash
# Find direct status updates
grep -r "UPDATE.*SET status" api/src/routes/

# Find direct UPDATE statements
grep -r "db.run.*UPDATE" api/src/routes/ | grep status
```

#### Step 2: Replace with StatusManager
For each direct update:

**Before:**
```typescript
await db.run(
  'UPDATE contracts SET status = $1, updated_at = NOW() WHERE contract_id = $2',
  ['APPROVED', contractId]
);
```

**After:**
```typescript
await statusManager.updateEntityStatus({
  entityType: 'CONTRACT',
  entityId: contractId,
  newStatus: 'APPROVED',
  reason: 'Approved by ECTA officer',
  updatedBy: req.user.username
});
```

#### Step 3: Remove Redundant Audit Calls
If there's a manual audit log after status update, remove it:
```typescript
// ❌ Remove this (statusManager already handles it)
await auditService.log({
  entityType: 'CONTRACT',
  entityId: contractId,
  action: 'APPROVE',
  // ...
});
```

#### Step 4: Verify Blockchain Sync
Ensure blockchain sync happens via statusManager, remove manual:
```typescript
// ❌ Remove this (statusManager already handles it)
await fabricService.submitTransaction('UpdateContractStatus', contractId, 'APPROVED');
```

### Benefits
- ✅ **Consistency:** All status changes follow same pattern
- ✅ **Audit Trail:** Automatic audit logging
- ✅ **Blockchain Sync:** Automatic blockchain updates
- ✅ **Validation:** Status transition validation
- ✅ **Error Handling:** Centralized error handling

### Estimated Effort
- **Analysis:** 2-3 hours (find all direct updates)
- **Implementation:** 6-8 hours
- **Testing:** 3-4 hours
- **Total:** 11-15 hours

---

## Task 16: Create Unified Portal Dashboard Endpoints

### Overview
Create single dashboard endpoint per portal to replace 30+ scattered queries with organized, efficient data fetching.

### Target Architecture
```
GET /api/v1/portals/:portal/dashboard
├── /portals/ecta/dashboard      (ECTA Portal)
├── /portals/banks/dashboard     (Banks Portal)
├── /portals/nbe/dashboard       (NBE Portal)
├── /portals/customs/dashboard   (Customs Portal)
├── /portals/shipping/dashboard  (Shipping Portal)
├── /portals/exporters/dashboard (Exporter Portal)
└── /portals/ecx/dashboard       (ECX Portal)
```

### Implementation Plan

#### Create New Route File
**File:** `/api/src/routes/portals.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const db = DatabaseService.getInstance();

/**
 * GET /api/v1/portals/:portal/dashboard
 * Unified dashboard endpoint for all portals
 */
router.get('/:portal/dashboard', 
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { portal } = req.params;
      const user = (req as any).user;
      
      // Route to specific portal dashboard
      switch (portal.toLowerCase()) {
        case 'ecta':
          return await getECTADashboard(req, res);
        case 'banks':
          return await getBanksDashboard(req, res);
        case 'nbe':
          return await getNBEDashboard(req, res);
        case 'customs':
          return await getCustomsDashboard(req, res);
        case 'shipping':
          return await getShippingDashboard(req, res);
        case 'exporters':
          return await getExporterDashboard(req, res);
        case 'ecx':
          return await getECXDashboard(req, res);
        default:
          return res.status(404).json({
            success: false,
            error: { code: 'PORTAL_NOT_FOUND', message: `Portal '${portal}' not found` }
          });
      }
    } catch (error) {
      logger.error('[PORTALS] Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to load dashboard' }
      });
    }
  }
);

export default router;
```

### Portal-Specific Implementations

#### 1. ECTA Portal Dashboard
```typescript
async function getECTADashboard(req: Request, res: Response) {
  const [
    pendingApplications,
    pendingContracts,
    pendingInspections,
    recentActivities,
    statistics
  ] = await Promise.all([
    // Pending exporter applications
    db.getAll(
      'SELECT * FROM exporter_applications WHERE status = $1 ORDER BY created_at DESC LIMIT 10',
      ['PENDING']
    ),
    
    // Contracts awaiting approval
    db.getAll(
      'SELECT * FROM contracts WHERE status = $1 ORDER BY created_at DESC LIMIT 10',
      ['PENDING']
    ),
    
    // Quality inspections pending
    db.getAll(
      'SELECT * FROM quality_inspections WHERE status IN ($1, $2) ORDER BY created_at DESC LIMIT 10',
      ['PENDING', 'INSPECTED']
    ),
    
    // Recent activities (last 24 hours)
    db.getAll(
      `SELECT * FROM audit_trail 
       WHERE performed_by_org = $1 AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 20`,
      ['ECTAMSP']
    ),
    
    // Statistics
    db.get(`
      SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COUNT(*) as total_count
      FROM contracts
      WHERE created_at > NOW() - INTERVAL '30 days'
    `)
  ]);

  return res.json({
    success: true,
    data: {
      portal: 'ECTA',
      pendingTasks: {
        applications: pendingApplications.length,
        contracts: pendingContracts.length,
        inspections: pendingInspections.length,
        total: pendingApplications.length + pendingContracts.length + pendingInspections.length
      },
      pendingApplications,
      pendingContracts,
      pendingInspections,
      recentActivities,
      statistics,
      timestamp: new Date().toISOString()
    }
  });
}
```

#### 2. Banks Portal Dashboard
```typescript
async function getBanksDashboard(req: Request, res: Response) {
  const [
    pendingLCs,
    forexRequests,
    paymentsToProcess,
    retentionAmounts
  ] = await Promise.all([
    db.getAll(
      'SELECT * FROM letters_of_credit WHERE status = $1 ORDER BY created_at DESC LIMIT 10',
      ['PENDING']
    ),
    
    db.getAll(
      'SELECT * FROM forex_allocations WHERE status = $1 ORDER BY created_at DESC LIMIT 10',
      ['REQUESTED']
    ),
    
    db.getAll(
      'SELECT * FROM payments WHERE status = $1 ORDER BY created_at DESC LIMIT 10',
      ['RECEIVED']
    ),
    
    db.get(`
      SELECT 
        SUM(retention_amount) as total_retention,
        SUM(release_amount) as total_release,
        COUNT(*) as payment_count
      FROM payments
      WHERE status IN ('RECEIVED', 'RETENTION_CONVERTED')
    `)
  ]);

  return res.json({
    success: true,
    data: {
      portal: 'BANKS',
      pendingTasks: {
        lcRequests: pendingLCs.length,
        forexAllocations: forexRequests.length,
        paymentsToProcess: paymentsToProcess.length,
        total: pendingLCs.length + forexRequests.length + paymentsToProcess.length
      },
      pendingLCs,
      forexRequests,
      paymentsToProcess,
      retentionAmounts,
      timestamp: new Date().toISOString()
    }
  });
}
```

#### 3. Exporter Portal Dashboard
```typescript
async function getExporterDashboard(req: Request, res: Response) {
  const user = (req as any).user;
  const exporterId = user.exporterId || user.username;
  
  const [
    contracts,
    shipments,
    payments,
    pendingTasks
  ] = await Promise.all([
    db.getAll(
      'SELECT * FROM contracts WHERE exporter_id = $1 ORDER BY created_at DESC LIMIT 10',
      [exporterId]
    ),
    
    db.getAll(
      'SELECT * FROM shipments WHERE exporter_id = $1 ORDER BY created_at DESC LIMIT 10',
      [exporterId]
    ),
    
    db.getAll(
      `SELECT 
         payment_id, contract_id, amount_usd, retention_amount, 
         release_amount, status, created_at
       FROM payments 
       WHERE exporter_id = $1 
       ORDER BY created_at DESC LIMIT 10`,
      [exporterId]
    ),
    
    db.getAll(
      `SELECT 'contract' as type, contract_id as id, status, created_at
       FROM contracts 
       WHERE exporter_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW')
       UNION ALL
       SELECT 'shipment' as type, shipment_id as id, status, created_at
       FROM shipments
       WHERE exporter_id = $1 AND status IN ('CREATED', 'QUALITY_CONTROL')
       ORDER BY created_at DESC`,
      [exporterId]
    )
  ]);

  // Calculate payment statistics with 40% retention breakdown
  const paymentStats = {
    totalReceived: payments.reduce((sum, p) => sum + (p.amount_usd || 0), 0),
    totalRetained: payments.reduce((sum, p) => sum + (p.retention_amount || 0), 0),
    totalReleased: payments.reduce((sum, p) => sum + (p.release_amount || 0), 0),
    retentionRate: 40, // NBE policy
    paymentsCount: payments.length
  };

  return res.json({
    success: true,
    data: {
      portal: 'EXPORTER',
      exporterId,
      pendingTasks,
      contracts: {
        items: contracts,
        total: contracts.length,
        pending: contracts.filter(c => c.status === 'PENDING').length,
        approved: contracts.filter(c => c.status === 'APPROVED').length
      },
      shipments: {
        items: shipments,
        total: shipments.length,
        inProgress: shipments.filter(s => !['DELIVERED', 'COMPLETED'].includes(s.status)).length
      },
      payments: {
        items: payments,
        statistics: paymentStats
      },
      timestamp: new Date().toISOString()
    }
  });
}
```

### Register in Server.ts
```typescript
// Add to /api/src/server.ts
import portalsRoutes from './routes/portals';

// In setupRoutes():
apiV1.use('/portals', authMiddleware, portalsRoutes);
```

### Benefits
- ✅ **Single Endpoint:** One call per portal instead of 5-10 separate calls
- ✅ **Performance:** Parallel queries with Promise.all()
- ✅ **Consistency:** Standardized response format across all portals
- ✅ **Maintainability:** Portal logic in one place
- ✅ **Frontend:** Simplified data fetching

### Estimated Effort
- **Design:** ✅ Complete
- **Implementation:** 8-10 hours (all 7 portals)
- **Testing:** 4-5 hours
- **Frontend Integration:** 6-8 hours
- **Total:** 18-23 hours

---

## Implementation Priority

### Phase 1: Quick Wins (2-3 days)
1. **Task 14:** Replace manual role checks
   - High impact on code quality
   - Relatively straightforward
   - Improves security

### Phase 2: Foundation (3-4 days)
2. **Task 15:** Standardize status updates
   - Critical for data consistency
   - Improves audit trail
   - Enables better monitoring

### Phase 3: User Experience (4-5 days)
3. **Task 16:** Portal dashboards
   - Direct user-facing improvement
   - Performance optimization
   - Better UX

### Total Estimated Time
- **Implementation:** 9-12 days
- **Testing:** 3-4 days
- **Documentation:** 1-2 days
- **Total:** 13-18 days

---

## Success Criteria

### Task 14: Manual Role Checks
- ✅ Zero manual role checks in route handlers
- ✅ All endpoints use requireRole middleware
- ✅ All role-based tests passing
- ✅ Security audit clean

### Task 15: Status Manager
- ✅ All status updates use statusManager
- ✅ Consistent audit trail across all entities
- ✅ Automatic blockchain sync verified
- ✅ No direct SQL status updates

### Task 16: Portal Dashboards
- ✅ All 7 portals have dashboard endpoints
- ✅ Single API call per portal
- ✅ Response time < 500ms per portal
- ✅ Frontend integrated and tested

---

## Testing Plan

### Task 14 Testing
```bash
# Test each endpoint with correct and incorrect roles
npm run test:roles

# Verify authorization responses
npm run test:auth
```

### Task 15 Testing
```bash
# Verify all status transitions
npm run test:status-manager

# Check audit trail completeness
npm run test:audit-trail

# Verify blockchain sync
npm run test:blockchain-sync
```

### Task 16 Testing
```bash
# Test each portal dashboard
npm run test:dashboards

# Performance testing
npm run test:dashboard-performance

# Integration testing
npm run test:portal-integration
```

---

## Rollback Plan

### If Issues Arise
1. **Git branches:** Implement each task on separate branch
2. **Feature flags:** Use environment variables to toggle new behavior
3. **Gradual rollout:** Deploy to staging first, then production
4. **Monitoring:** Watch error rates, response times
5. **Quick revert:** Keep old code commented until verified

### Safety Measures
- Full test suite before deployment
- Staging environment verification
- Gradual production rollout
- 24-hour monitoring post-deployment
- Rollback procedure documented

---

**Status:** Ready for Implementation
**Documentation:** Complete
**Risk:** Low (well-defined, tested patterns)
**Impact:** High (code quality, maintainability, UX)

---

*Prepared: January 2027*
*Project: Ethiopian Coffee Export Consortium Blockchain System (GoCBC)*

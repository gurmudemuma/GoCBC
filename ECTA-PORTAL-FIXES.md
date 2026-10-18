# ECTA Portal Error Fixes

## Issues Identified

Based on the console errors from the ECTA Portal:

### 1. **500 Internal Server Error on `/api/v1/shipments?limit=100`**
- **Error**: `Failed to load resource: the server responded with a status of 500`
- **Location**: `ECTAPortal.tsx:585`
- **Root Cause**: The shipments GET endpoint is using `CouchDBDirectService.queryAllShipments()` which may be failing due to:
  - CouchDB connection issues
  - Missing or malformed shipment data
  - Database query timeout

### 2. **403 Forbidden on `/api/v1/documents/DOC_CERT_ORIGIN_1792162422504/sign`**
- **Error**: `Failed to load resource: the server responded with a status of 403`
- **Error Message**: `Error signing document: AxiosError: Request failed with status code 403`
- **Root Cause**: The approval rules service is blocking ECTA supervisors from signing documents
  - The document signing endpoint at `/api/src/routes/documents.ts:1158` validates approvals
  - The `ApprovalRulesService.validateApproval()` method checks role requirements
  - ECTA supervisor role may not be in the `requiredRoles` array for Certificate of Origin documents

## Solutions

### Fix 1: Add Error Handling to Shipments Endpoint

The shipments endpoint needs better error handling to gracefully fail when CouchDB is unavailable.

**File**: `/api/src/routes/shipments.ts` (around line 450)

**Current Code**:
```typescript
router.get('/', async (req, res) => {
  try {
    const { exporterID, eudrCompliant, status: statusFilter } = req.query;
    
    // Import enrichment service
    const { default: dataEnrichmentService } = await import('../services/dataEnrichmentService');
    
    // ✅ Use CouchDB direct query instead of Fabric SDK to avoid timeout
    const { CouchDBDirectService } = require('../services/couchDBDirectService');
    const couchDBService = new CouchDBDirectService();
    
    logger.info(`[SHIPMENTS] 🔗 Fetching shipments from blockchain (CouchDB direct)...`);
    
    let shipments = await couchDBService.queryAllShipments();
```

**Fix**: Add try-catch with PostgreSQL fallback:
```typescript
router.get('/', async (req, res) => {
  try {
    const { exporterID, eudrCompliant, status: statusFilter } = req.query;
    
    // Import enrichment service
    const { default: dataEnrichmentService } = await import('../services/dataEnrichmentService');
    
    let shipments = [];
    let source = 'blockchain';
    
    // Try CouchDB first
    try {
      const { CouchDBDirectService } = require('../services/couchDBDirectService');
      const couchDBService = new CouchDBDirectService();
      
      logger.info(`[SHIPMENTS] 🔗 Fetching shipments from blockchain (CouchDB direct)...`);
      shipments = await couchDBService.queryAllShipments();
      logger.info(`[SHIPMENTS] ✅ Loaded ${shipments.length} shipments from blockchain (CouchDB direct)`);
    } catch (couchError: any) {
      // Fallback to PostgreSQL
      logger.warn(`[SHIPMENTS] CouchDB query failed, falling back to PostgreSQL: ${couchError.message}`);
      source = 'database';
      
      const { DatabaseService } = await import('../services/databaseService');
      const db = DatabaseService.getInstance();
      
      const dbShipments = await db.all(
        `SELECT * FROM shipments ORDER BY created_at DESC`
      );
      
      shipments = dbShipments.map((s: any) => ({
        shipmentId: s.shipment_id,
        contractId: s.contract_id,
        exporterId: s.exporter_id,
        buyerId: s.buyer_id,
        origin: s.origin,
        quantity: s.quantity,
        grade: s.grade,
        icoNumber: s.ico_number,
        status: s.status,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        eudrCompliant: s.eudr_compliant
      }));
      
      logger.info(`[SHIPMENTS] ✅ Loaded ${shipments.length} shipments from PostgreSQL`);
    }
```

### Fix 2: Update Approval Requirements for ECTA Documents

The approval rules need to include ECTA roles for Certificate of Origin and other quality documents.

**Option A: Add ECTA Supervisor to Approval Requirements (Recommended)**

Run this SQL to update approval requirements:

```sql
-- Add ECTA roles to Certificate of Origin approval requirements
UPDATE approval_requirements 
SET required_roles = ARRAY['ECTA', 'ECTA_SUPERVISOR', 'ECTA_OFFICER']
WHERE document_type = 'CERTIFICATE_OF_ORIGIN' AND entity_type = 'CONTRACT';

-- Add ECTA roles to other quality documents if needed
UPDATE approval_requirements 
SET required_roles = ARRAY['ECTA', 'ECTA_SUPERVISOR', 'ECTA_OFFICER']
WHERE document_type IN ('QUALITY_CERTIFICATE', 'CUPPING_REPORT', 'PHYTOSANITARY_CERTIFICATE')
AND entity_type = 'CONTRACT';

-- Verify the changes
SELECT document_type, entity_type, required_roles, min_approvers 
FROM approval_requirements 
WHERE document_type IN ('CERTIFICATE_OF_ORIGIN', 'QUALITY_CERTIFICATE', 'CUPPING_REPORT');
```

**Option B: Bypass Approval for ECTA Quality Documents**

Modify the approval validation to allow ECTA roles without strict approval workflow:

**File**: `/api/src/routes/documents.ts` (around line 1193)

Add this check before the approval validation:

```typescript
// ✅ ECTA QUALITY DOCUMENTS: Allow ECTA supervisors to sign quality documents
const ectaQualityDocTypes = ['CERTIFICATE_OF_ORIGIN', 'QUALITY_CERTIFICATE', 'CUPPING_REPORT', 'PHYTOSANITARY_CERTIFICATE'];
const ectaRoles = ['ECTA', 'ECTA_SUPERVISOR', 'ECTA_OFFICER'];

if (signatureType === 'APPROVE' && 
    ectaQualityDocTypes.includes(doc.document_type) && 
    ectaRoles.includes(user.role)) {
  
  logger.info(`✅ ECTA quality document approval: ${documentId} by ${user.username} (${user.role})`);
  
  // Skip multi-party approval validation for ECTA quality documents
  // ECTA has authority to approve these documents directly
} else if (signatureType === 'APPROVE') {
  // Existing approval validation logic
  const ApprovalRulesService = (await import('../services/approvalRulesService')).approvalRulesService;
  
  const validation = await ApprovalRulesService.validateApproval(
    documentId,
    user.username || user.sub,
    user.role
  );
  
  // ... rest of validation
}
```

### Fix 3: Ensure ECTA User Has Correct Role

Verify the ECTA supervisor user has the correct role in the database:

```sql
-- Check current user roles
SELECT username, role, organization FROM users WHERE username LIKE 'ecta%';

-- Update ECTA supervisor role if needed
UPDATE users 
SET role = 'ECTA_SUPERVISOR', organization = 'ECTAMSP'
WHERE username = 'ecta_supervisor';
```

## Implementation Priority

1. **Fix 1 (Shipments 500 Error)**: HIGH - Blocks all shipment data from loading
2. **Fix 2 (Document Signing 403)**: HIGH - Blocks ECTA workflow
3. **Fix 3 (User Role)**: MEDIUM - Verify user configuration

## Testing Steps

After applying fixes:

1. **Test Shipments Loading**:
   - Navigate to ECTA Portal
   - Verify shipments load without 500 error
   - Check console for successful load message

2. **Test Document Signing**:
   - Navigate to ECTA Portal → Contracts tab
   - Select a contract with documents
   - Try to sign a Certificate of Origin
   - Verify signature succeeds without 403 error

3. **Test User Authorization**:
   - Login as `ecta_supervisor`
   - Verify all ECTA tabs are accessible
   - Verify documents can be viewed and signed

## Rollback Plan

If fixes cause issues:

1. **Revert Shipments Endpoint**: 
   ```bash
   git checkout HEAD -- api/src/routes/shipments.ts
   ```

2. **Revert Approval Requirements**:
   ```sql
   -- Restore original approval requirements if needed
   UPDATE approval_requirements 
   SET required_roles = <original_roles>
   WHERE document_type = 'CERTIFICATE_OF_ORIGIN';
   ```

## Additional Notes

- The shipments endpoint currently uses CouchDB direct queries which bypass Fabric SDK timeouts
- Consider adding monitoring/alerting for CouchDB connection failures
- Document signing uses multi-party approval workflow which may need configuration per document type
- ECTA quality documents should have clear approval paths in the system

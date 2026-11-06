# Frontend-Backend Integration Fix Plan

## Current Status
- **Backend endpoints**: 432
- **Frontend API calls**: 187
- **✅ Properly integrated**: 162 (86.6%)
- **❌ True orphans**: 25 (13.4%)

## Analysis of 25 Orphaned Frontend Calls

### Category 1: Missing Backend Endpoints (CREATE BACKEND) - 10 orphans

1. **`/analytics/blockchain`** - BlockchainMonitor.tsx
   - **Action**: Create endpoint in `analytics.ts`
   - **Purpose**: Blockchain network statistics for monitoring

2. **`/customs/risk-rules`** - RiskRulesManager.tsx
   - **Action**: Create GET endpoint in `customs.ts`
   - **Purpose**: Risk assessment rules management

3. **`/quality/inspections/by-shipment/${shipmentId}`** - CustomsPortal.tsx
   - **Action**: Create GET endpoint in `quality.ts`
   - **Purpose**: Get inspections filtered by shipment

4. **`/swift/messages/${messageId}/nbe-approve`** - swiftApi.ts
   - **Action**: Create POST endpoint in `swift.ts`
   - **Purpose**: NBE approval for SWIFT messages

5. **`/customs/inspections`** - customs/utils/dataLoader.ts
   - **Action**: CREATE - already exists as `/quality/inspections`
   - **Fix**: Update frontend to use `/quality/inspections`

6. **`/customs/border-crossings`** - customs/utils/dataLoader.ts
   - **Action**: Check if this should be `/bordercrossing` (already exists)
   - **Fix**: Update frontend to use correct endpoint

### Category 2: Incorrect Frontend URLs (FIX FRONTEND) - 12 orphans

7. **`/blockchain-signatures/entity/${entityType}/${entityId}`**
   - **Current backend**: `/blockchain-signatures/:entityType/:entityId`
   - **Fix**: Remove `/entity` prefix in frontend call

8. **`/bordercrossing/${borderCrossingId}/${endpoint}`** - Variable endpoint
   - **Check**: If endpoints like `/bordercrossing/:id/approve` exist
   - **Fix**: Update to use specific endpoints

9. **`/bordercrossing/${borderCrossingId}/inspect`**
   - **Check**: Backend has `/:id/inspect` or similar
   - **Fix**: Update frontend URL

10. **`/inspection/${inspectionId}/conduct`**
    - **Backend likely**: `/quality/inspections/:id/perform`
    - **Fix**: Update frontend to use `/quality/inspections/${inspectionId}/perform`

11. **`/insurance`** - GET all insurance
    - **Backend likely**: `/insurance` already exists
    - **Check**: Route file mapping

12. **`/phytosanitary`** - GET all phytosanitary
    - **Backend likely**: `/phytosanitary` already exists
    - **Check**: Route file mapping

13. **`/phytosanitary/shipment/${shipmentId}`**
    - **Check**: Backend pattern
    - **Fix**: Update frontend

14. **`/phytosanitary/${certificateId}/revoke`**
    - **Check**: Backend has `/:id/revoke`
    - **Fix**: Verify endpoint exists

15. **Portal data loaders** (9 calls in utils/dataLoader.ts files):
    - `/lcs` → Should be `/banking/lc` or `/lc`
    - `/swift-messages` → Should be `/swift/messages`
    - `/settlements` → Check correct endpoint
    - `/lc-discrepancies` → Should be `/lc/discrepancies/pending`
    - `/contracts${filter}` → Should be `/contracts` with query params
    - `/forex${filter}` → Should be `/forex` with query params
    - `/lcs${filter}` → Should be `/banking/lc` with query params
    - `/shipments${filter}` → Should be `/shipments` with query params
    - `/payments${filter}` → Should be `/payments` with query params
    - `/customs/declarations${filter}` → Should be `/customs/declarations` with query params
    - `/compliance-checks` → Check correct endpoint

### Category 3: Dead Code (REMOVE) - 3 orphans

These appear to be remnants of refactored features that should be removed if not used:

16. **`/settlements`** - If no backend implementation exists
17. **`/compliance-checks`** - If superseded by other compliance endpoints
18. Any data loader calls that are not actively used

## Immediate Actions

### Phase 1: Quick Wins - Fix Frontend URLs (30 mins)
1. Fix blockchain-signatures URL (remove `/entity`)
2. Update inspection calls to use `/quality/inspections/*`
3. Update data loader files to use correct query parameters instead of string concatenation
4. Fix `/customs/inspections` → `/quality/inspections`
5. Fix `/customs/border-crossings` → `/bordercrossing`

### Phase 2: Create Missing Backend Endpoints (1 hour)
1. Add `/analytics/blockchain` endpoint
2. Add `/customs/risk-rules` GET endpoint
3. Add `/quality/inspections/by-shipment/:shipmentId` endpoint
4. Add `/swift/messages/:messageId/nbe-approve` endpoint
5. Verify `/insurance` and `/phytosanitary` GET all endpoints exist

### Phase 3: Verify and Test (30 mins)
1. Run integration test again
2. Verify all 25 orphans are resolved
3. Test portal tabs that use fixed endpoints

## Expected Outcome
- **Before**: 162/187 integrated (86.6%)
- **After**: 187/187 integrated (100%)
- **Orphans**: 0

## Files to Modify

### Frontend Files (URL fixes):
- `ui/src/components/blockchain/EntityBlockchainVerification.tsx`
- `ui/src/components/portals/CustomsPortal.tsx`
- `ui/src/components/portals/banks/utils/dataLoader.ts`
- `ui/src/components/portals/customs/utils/dataLoader.ts`
- `ui/src/components/portals/exporter/utils/dataLoader.ts`
- `ui/src/components/portals/nbe/utils/dataLoader.ts`
- `ui/src/services/swiftApi.ts`

### Backend Files (new endpoints):
- `api/src/routes/analytics.ts`
- `api/src/routes/customs.ts`
- `api/src/routes/quality.ts`
- `api/src/routes/swift.ts`

## Priority Order
1. **HIGH**: Fix data loader URLs (affects all portals)
2. **HIGH**: Create missing backend endpoints for new features
3. **MEDIUM**: Fix individual component URLs
4. **LOW**: Remove dead code if confirmed unused

# Fix Exporter API 500 Errors

## Issues Identified

1. **Contracts endpoint returning 500**: `/api/v1/contracts`
2. **Customs declarations endpoint returning 500**: `/api/v1/customs/declarations`
3. **Forex endpoint returning 500**: `/api/v1/forex`
4. **Payments endpoint returning 500**: `/api/v1/payments`
5. **Document upload failing with blockchain endorsement error**

## Root Causes

### Primary Issue: Blockchain Queries Failing
The API endpoints are calling blockchain (Fabric) methods like:
- `fabricService.queryContracts()`
- `fabricService.queryForexAllocations()`
- `fabricService.queryCustomsDeclarations()`
- `fabricService.queryPayments()`

These are likely failing because:
1. Chaincode container may not be running or not properly connected
2. No data exists on the blockchain yet
3. The blockchain network may not be fully initialized

### Secondary Issue: Lack of Graceful Degradation
The endpoints return 500 errors instead of returning empty arrays when blockchain queries fail.

## Solutions

### Option 1: Quick Fix - Return Empty Data on Blockchain Failure (Recommended for Development)

Modify each endpoint to catch blockchain errors and return empty data:

```typescript
router.get('/contracts', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId || 'EXP2026001';
    
    try {
      const result = await fabricService.queryContracts({ exporterId });
      
      if (result.success) {
        // Process and return data
        const normalizedContracts = (result.data || []).map(...);
        return res.json({
          success: true,
          data: normalizedContracts,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (blockchainError) {
      logger.warn('Blockchain query failed, returning empty data:', blockchainError);
    }
    
    // Fallback: return empty array if blockchain fails
    return res.json({
      success: true,
      data: [],
      source: 'fallback',
      message: 'Blockchain unavailable, showing empty data',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Error retrieving contracts:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      timestamp: new Date().toISOString(),
    });
  }
});
```

### Option 2: Dual-Source Approach (Better for Production)

Query both PostgreSQL and blockchain, preferring blockchain but falling back to database:

```typescript
router.get('/contracts', authMiddleware, async (req, res) => {
  try {
    const exporterId = (req as any).user?.exporterId;
    
    // Try blockchain first
    try {
      const blockchainResult = await fabricService.queryContracts({ exporterId });
      if (blockchainResult.success && blockchainResult.data) {
        return res.json({
          success: true,
          data: normalizedContracts,
          source: 'blockchain',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (blockchainError) {
      logger.warn('Blockchain unavailable, falling back to database');
    }
    
    // Fallback to database
    const dbContracts = await postgresDb.all(
      'SELECT * FROM contracts WHERE exporter_id = $1',
      [exporterId]
    );
    
    return res.json({
      success: true,
      data: dbContracts,
      source: 'database',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Error retrieving contracts:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      timestamp: new Date().toISOString(),
    });
  }
});
```

### Option 3: Fix the Blockchain Connection

1. Check if chaincode is running:
```bash
docker ps --filter "name=coffee-chaincode"
```

2. Check chaincode logs:
```bash
docker logs coffee-chaincode
```

3. Restart chaincode if needed:
```bash
docker restart coffee-chaincode
```

4. Verify channel membership:
```bash
docker exec peer0.ecta.cecbs.et peer channel list
```

## Document Upload Fix

The document upload error shows:
```
Endorsement has failed
No valid responses from any peers
```

This means the chaincode's `UploadDocument` function is not being endorsed by peers. Fixes:

1. **Check peer connectivity** - Ensure all peers are running
2. **Verify endorsement policy** - May need responses from multiple organizations
3. **Add retry logic** - Retry failed endorsements
4. **Graceful degradation** - Store document metadata in PostgreSQL if blockchain fails

## Performance Fix: Excessive Re-rendering

The logs show "Calculating dashboard metrics" hundreds of times. This is a React infinite re-render issue.

Fix in `ExporterPortal.tsx`:
```typescript
// Add dependencies to useMemo/useCallback
const dashboardMetrics = useMemo(() => {
  // calculation logic
}, [contracts, lcs, forex, shipments, payments]); // Add all dependencies

// Or wrap in useRef to prevent recalculation
const metricsRef = useRef(null);
if (!metricsRef.current) {
  metricsRef.current = calculateMetrics(...);
}
```

## Implementation Steps

1. Apply Option 1 (graceful degradation) to all failing endpoints
2. Fix the re-rendering issue in ExporterPortal.tsx
3. Verify chaincode is running and accessible
4. Test with exporter login to confirm no 500 errors

## Expected Outcome

- Exporter portal loads without 500 errors
- Empty data is shown instead of errors (until data is created)
- UI remains responsive without excessive re-renders
- Document upload either works or shows helpful error message

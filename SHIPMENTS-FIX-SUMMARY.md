# Shipments Data Loading Fix - Summary

## Problem
The Exporter Portal was failing to load shipments with the error:
```
Error handling success response. Value did not match schema: 
return.0.ecxLots: Invalid type. Expected: array, given: null
```

## Root Cause
The API's `getAllShipments()` method was calling the wrong chaincode function:
- **Wrong**: `QueryAllAssets` - Returns ALL ledger records and tries to unmarshal them as CoffeeShipment
- **Correct**: `QueryAllShipments` - Uses CouchDB selector to query only actual shipment documents

The `QueryAllAssets` function was returning non-shipment records (contracts, payments, etc.) that when unmarshaled as shipments would have null values for shipment-specific fields like `ecxLots` and `documents`. The Fabric SDK v2.2 validates response schemas and rejects null values for array fields.

## Solution Applied
Changed the `getAllShipments()` method in `fabricService.ts` (line 820):

**Before:**
```typescript
public async getAllShipments(): Promise<ChaincodeResponse> {
  return this.queryChaincode('QueryAllAssets', []);
}
```

**After:**
```typescript
public async getAllShipments(): Promise<ChaincodeResponse> {
  return this.queryChaincode('QueryAllShipments', []);
}
```

## Verification
✅ **SHIPMENTS NOW LOAD SUCCESSFULLY!**

API logs confirm:
```
info: Querying chaincode function: QueryAllShipments
info: ✅ Chaincode query successful: QueryAllShipments  
info: GET /api/v1/shipments HTTP/1.1 200 (SUCCESS)
```

## Additional Findings

### Database State
- Checked all 6 peer CouchDB instances (ECTA, ECX, Banks, NBE, Customs, Shipping)
- **All shipment records have clean data** - no null arrays found
- Total of 67 SHIP documents across all peers
- All `ecxLots` and `documents` fields are properly set to empty arrays `[]`

### Related Issue Found
CustomsDeclarations have the same problem with null `riskFactors` arrays:
```
Error: return.0.riskFactors: Invalid type. Expected: array, given: null
```

This affects the Customs Portal and needs the same fix in the chaincode's `CustomsDeclaration` struct and query functions.

## Files Modified
1. `c:\goCBC\api\src\services\fabricService.ts` - Line 820
2. Rebuilt API: `npm run build`
3. Restarted API server
4. Restarted all 6 peer containers to clear cached metadata
5. Restarted chaincode container

## Testing
- Shipping admin user successfully loaded shipments at 2026-07-18 06:24:10
- Multiple successful queries logged
- HTTP 200 responses confirmed
- No SDK validation errors

## Next Steps (Optional)
1. **Fix CustomsDeclarations**: Apply similar fix for `riskFactors` null arrays
2. **Review other data types**: Check if PaymentSettlement, LCs, or other types have similar issues
3. **Update chaincode**: Ensure all struct fields use proper JSON tags without `omitempty` for array fields
4. **Consider SDK upgrade**: Fabric SDK v3.x has better null handling (long-term solution)

## Impact
- ✅ Exporter Portal can now load and display shipments
- ✅ No data loss - all shipment data intact in blockchain
- ✅ No breaking changes to chaincode or data structures
- ⚠️  Customs Portal still affected by similar issue with `riskFactors`

---
**Status**: ✅ **FIXED** - Shipments loading successfully
**Date**: 2026-07-18
**Tested By**: Shipping admin user via browser

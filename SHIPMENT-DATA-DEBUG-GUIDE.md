# Shipment Data Debugging Guide

## Current Issue
The Shipments DataGrid table shows:
- Quantity: `0 kg` instead of actual values
- Buyer: `PRIVATE` or buyerId instead of buyer name
- Grade: `Unspecified` or blank

## Root Cause Analysis

### Data Flow
1. **Blockchain (Hyperledger Fabric)**
   - Chaincode `CoffeeShipment` struct returns complete data
   - JSON tags use camelCase: `quantity`, `buyerId`, `grade`, `status`
   - `QueryShipmentsByExporter` returns full structs

2. **API Middleware** (`/api/v1/shipments`)
   - Fetches from blockchain via `fabricService.getAllShipments()`
   - Returns data as-is with null array fixes

3. **UI** (`ExporterPortal.tsx`)
   - Calls `apiFetch('/shipments')` 
   - Filters shipments by `exporterId`
   - Maps blockchain fields to UI format (lines 674-720)
   - DataGrid renders from mapped data (lines 1471-1665)

## Debug Steps Added

### 1. Raw API Data Logging
**Location:** Lines 635-650 in `ExporterPortal.tsx`

```typescript
console.log('[EXPORTER] ========== RAW SHIPMENTS FROM BLOCKCHAIN ==========');
console.log('[EXPORTER] Total shipments from API:', shipmentsResult.data.length);
console.log('[EXPORTER] First shipment RAW:', JSON.stringify(shipmentsResult.data[0], null, 2));
```

**What to Check:**
- Open browser DevTools Console
- Find the `[EXPORTER] First shipment RAW:` log
- **This will show the EXACT JSON from blockchain**
- Check if `quantity`, `grade`, `buyerId` fields exist and have values

### 2. Filtered Shipments Logging
**Location:** Lines 671-677 in `ExporterPortal.tsx`

```typescript
console.log('[EXPORTER] ========== FIRST MY SHIPMENT RAW DATA ==========');
console.log(JSON.stringify(myShipments[0], null, 2));
```

**What to Check:**
- This shows the first shipment after filtering by `exporterId`
- Verify that your shipments still have the quantity/grade/buyer data

### 3. Field Mapping Logging
**Location:** Lines 687-696 in `ExporterPortal.tsx`

```typescript
console.log(`[SHIPMENT MAPPING] Processing ${shipmentId}:`, {
  rawQuantity,
  parsedQuantity: quantity,
  rawGrade: s.grade || s.Grade,
  rawBuyerId: s.buyerId || s.buyerID || s.BuyerID,
  rawStatus: s.status || s.Status,
  allFields: Object.keys(s),
});
```

**What to Check:**
- Shows how each field is extracted during mapping
- `allFields` lists ALL available keys in the shipment object
- `rawQuantity` shows the value before parsing
- `parsedQuantity` shows the value after Number() conversion

## Expected Blockchain Data Structure

Based on `chaincodes/coffee/main.go` (lines 20-80):

```json
{
  "shipmentId": "SHIPMENT1784637069979",
  "contractId": "CONTRACT1784193660328",
  "exporterId": "EXP8277584",
  "buyerId": "BUYER001",
  "origin": "Yirgacheffe, Gedeo Zone",
  "quantity": 30000,
  "grade": "Grade 1",
  "icoNumber": "ET-8277-1784637069979",
  "ecxLotNumber": "ECX-2026-1784637069979",
  "channel": "Direct Export",
  "status": "CREATED",
  "forexRate": 115.5,
  "valueUsd": 61700,
  "eudrCompliant": true,
  "transportMode": "SEA",
  "documents": [],
  "ecxLots": []
}
```

## Possible Causes

### Cause 1: Old Shipments with quantity = 0
- If blockchain shipments were created with `quantity: 0`, that's the actual data
- **Solution:** Check blockchain data, may need to recreate test shipments

### Cause 2: Field Name Mismatch
- Blockchain returns `quantity` but UI looks for `Quantity`
- **Status:** ✅ FIXED - UI now checks both camelCase and PascalCase

### Cause 3: String vs Number Type
- Blockchain returns `"30000"` as string, UI expects number
- **Status:** ✅ FIXED - Lines 685-686 parse string to number

### Cause 4: Buyer Name Resolution
- `buyerId` from blockchain needs to be looked up in contracts
- **Status:** ✅ IMPLEMENTED - Line 1597 looks up contract.buyerName

### Cause 5: Default Values Overriding Data
- Default values like `'Grade 1-2'` override actual data
- **Status:** ✅ FIXED - Defaults only applied when field is undefined

## How to Test

### 1. Check Console Logs
```bash
# Open Browser DevTools (F12)
# Go to Console tab
# Look for these logs:

[EXPORTER] ========== RAW SHIPMENTS FROM BLOCKCHAIN ==========
[EXPORTER] First shipment RAW: { ... full JSON ... }
[EXPORTER] ========== FIRST MY SHIPMENT RAW DATA ==========
{ ... filtered shipment JSON ... }
[SHIPMENT MAPPING] Processing SHIPMENT1234...: {
  rawQuantity: 30000,
  parsedQuantity: 30000,
  rawGrade: "Grade 1",
  allFields: ["shipmentId", "contractId", "quantity", "grade", ...]
}
```

### 2. Verify Blockchain Data
```bash
# Check if shipments actually have quantity values
cd c:\goCBC
node -e "
const axios = require('axios');
(async () => {
  const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
    username: 'EXP8277584',
    password: 'password123'
  });
  const token = login.data.data.token;
  
  const shipments = await axios.get('http://localhost:3001/api/v1/shipments?exporterID=EXP8277584', {
    headers: { 'Authorization': \`Bearer \${token}\` }
  });
  
  console.log('First shipment:', JSON.stringify(shipments.data.data[0], null, 2));
})();
"
```

### 3. Create New Test Shipment
```bash
# Create a shipment with known values
cd c:\goCBC
node test-shipment-workflow.js
```

This will create a shipment with:
- quantity: 30000 kg
- grade: "Grade 1"
- buyerId: "BUYER001"

Then check if it shows correctly in the UI.

## DataGrid Column Configuration

### Quantity Column (Line 1600)
```typescript
{ 
  field: 'quantity', 
  headerName: 'Quantity (kg)', 
  width: 130,
  type: 'number',
  valueFormatter: (params) => {
    const num = Number(params.value) || 0;
    return num > 0 ? num.toLocaleString() : '0';
  },
}
```
- Directly accesses `row.quantity` (no complex valueGetter)
- Formats as locale string with thousands separator
- Shows '0' if value is falsy

### Buyer Column (Line 1589)
```typescript
{ 
  field: 'buyerId', 
  headerName: 'Buyer', 
  width: 180,
  valueGetter: (params) => {
    // Look up contract to get buyer name
    const contract = contracts.find(c => c.contractId === params.row.contractId);
    if (contract?.buyerName) {
      return contract.buyerName;
    }
    // Fall back to buyerId
    return params.row.buyerId || '-';
  },
}
```
- Looks up buyer name from contracts array
- Falls back to buyerId if contract not found
- Shows '-' if buyerId is also missing

### Grade Column (Line 1609)
```typescript
{ 
  field: 'grade', 
  headerName: 'Grade', 
  width: 150,
  renderCell: (params) => (
    <Chip 
      label={params.value || 'Grade 1-2'} 
      size="small" 
      variant="outlined"
      color="secondary"
    />
  ),
}
```
- Directly accesses `row.grade` from mapped data
- Shows 'Grade 1-2' only if params.value is undefined
- Mapped value already has fallback (line 700): `grade: s.grade || s.Grade || ... || 'Grade 1-2'`

## Next Steps

1. **Check browser console** for the raw JSON logs
2. **Expand the Object entries** in console to see field values
3. **Verify blockchain data** has actual values (not all zeros)
4. **If blockchain data is correct** but UI still shows 0:
   - Check if DataGrid is receiving the mapped data correctly
   - Verify React state update completed
5. **If blockchain data has quantity = 0**:
   - Old test data was created with wrong values
   - Need to create new shipments with correct data
   - Or update existing shipments in blockchain

## Files Modified

- `c:\goCBC\ui\src\components\portals\ExporterPortal.tsx`
  - Lines 635-650: Raw API data logging
  - Lines 671-677: Filtered shipment logging
  - Lines 674-720: Enhanced field mapping with logging
  - Lines 1471-1665: Simplified DataGrid columns

## Authentication for Testing

- **Username:** EXP8277584
- **Password:** password123
- **Contract ID:** CONTRACT1784193660328
- **Expected Shipments:** 8 shipments (per console logs)

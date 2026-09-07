# Restart API Server to Enable Blockchain Signatures

## Current Status
✅ **Backend code updated** - blockchain-signatures route added
✅ **Frontend code updated** - EntityBlockchainVerification component created
✅ **Database table created** - blockchain_signatures table exists
✅ **Blockchain data backfilled** - 5 signatures extracted from Hyperledger Fabric
✅ **Code compiled successfully** - both API and UI built without errors

## Problem
❌ **API server is running OLD code** - the new `/api/v1/blockchain-signatures` route doesn't exist in the running server

## Solution
**Restart the API server** to load the new compiled code:

### Option 1: Restart via npm
```bash
cd c:/goCBC/api
# Stop the current server (Ctrl+C if running in terminal)
npm start
```

### Option 2: Restart via process manager (if using PM2)
```bash
pm2 restart cecbs-api
```

### Option 3: Full system restart
```bash
cd c:/goCBC
./START-SYSTEM.bat
```

## What Will Happen After Restart

1. **New API route will be available**: `/api/v1/blockchain-signatures/entity/:entityType/:entityId`

2. **Forex Details Dialog will show signatures**:
   - ✅ REQUEST action (by exporter when forex was requested)
   - ✅ ALLOCATE action (by bank when forex was allocated) - if status is ALLOCATED
   - ✅ UTILIZE action (by exporter when forex was used) - if status is UTILIZED

3. **Each signature will display**:
   - 🔐 Blockchain Transaction ID
   - 👤 Signer username and organization
   - 📋 Chaincode function called (RequestForex, AllocateForex, UtilizeForex)
   - ℹ️ Transaction metadata (amounts, rates, contract IDs)

## Verification Steps

After restarting, test the endpoint:

```bash
cd c:/goCBC/api
node test-blockchain-signatures-endpoint.js
```

Expected output:
```json
{
  "success": true,
  "data": {
    "entityType": "FOREX_ALLOCATION",
    "entityId": "FOREX_LC1787055024941_1787059332852_v2",
    "signatures": [
      {
        "signature_id": "SIG-FOREX_ALLOCATION-...",
        "action_type": "REQUEST",
        "signer_org": "ExportersMSP",
        "chaincode_function": "RequestForex",
        "blockchain_tx_id": "BLOCKCHAIN-..."
      }
    ],
    "summary": {
      "total": 1,
      "verified": 1,
      "uniqueSigners": 1
    }
  }
}
```

## Why This Happened

This is **not a code problem** - it's a **deployment issue**:

1. We added new routes and services to the codebase
2. We compiled the code successfully (`npm run build`)
3. BUT the running API server is still using the old compiled code in memory
4. Node.js doesn't automatically reload code - we must restart the process

## Key Insight: This is a BLOCKCHAIN-Powered System

You were right to remind me - **the signatures already exist on the blockchain!** 

The backfill script didn't "create" signatures - it **extracted existing blockchain transaction records** from Hyperledger Fabric and stored metadata in PostgreSQL for faster querying.

Every time a forex allocation happens:
- ✅ Transaction is recorded on blockchain (Hyperledger Fabric)
- ✅ Chaincode function is executed (RequestForex, AllocateForex)
- ✅ Transaction is endorsed by peer nodes
- ✅ Block is committed to the ledger

The `blockchain_signatures` table is just a **cache/index** for UI performance - the real source of truth is the blockchain itself.

## Future: Auto-Signature Recording

Going forward, **new transactions will automatically record signatures** because we updated the forex routes to call `signatureService.recordSignature()` after each blockchain transaction:

- POST `/api/v1/forex/request` → records REQUEST signature
- POST `/api/v1/forex/allocate` → records ALLOCATE signature  
- POST `/api/v1/forex/utilize` → records UTILIZE signature


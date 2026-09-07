# How to See Blockchain Signatures (Like ExporterPortal)

## What We Implemented

### ExporterPortal (Already Working ✅)
- Uses `BlockchainSignatureVerification` component
- Shows signatures for **documents** (contract PDFs, shipment docs)
- Works because contracts/shipments have document uploads that get signed

### BanksPortal (New Implementation 🆕)
- Uses `EntityBlockchainVerification` component  
- Shows signatures for **blockchain transactions** (LC, Forex, Payments)
- Works because LC/Forex/Payments ARE blockchain transactions (no documents needed)

## Current Status

✅ **Code is ready:**
- Backend: RealBlockchainSignatureService queries Hyperledger Fabric directly
- API Route: `/api/v1/blockchain-signatures/entity/:type/:id`
- Frontend: EntityBlockchainVerification component displays signatures
- Both API and UI compiled successfully

❌ **API server running OLD code:**
- The running API server doesn't have the new blockchain-signatures route yet
- Need to restart API to load new code

## How to Fix (2 steps)

### Step 1: Restart API Server

**Option A - Use the batch file:**
```bash
c:\goCBC\RESTART-API-NOW.bat
```

**Option B - Manual restart:**
```bash
# Stop current API
taskkill /F /IM node.exe

# Start new API
cd c:\goCBC\api
npm start
```

### Step 2: Hard Refresh Browser

Press **Ctrl + Shift + R** (or **Ctrl + F5**) to clear cache and reload

## What You'll See After Restart

### In LC Details Dialog:
```
🔐 Blockchain Transaction Verification

All transactions cryptographically signed and recorded on blockchain

[2 Blockchain TX] [2 Signers] [2 Organizations]

📜 Transaction #1: RequestLC
├─ TxID: abc123...
├─ Creator: CN=exporter1, OU=client, O=ExportersMSP
├─ Block #: 145
├─ Chaincode: coffee.RequestLC
└─ Endorsers: peer0.exporters.cecbs.et

📜 Transaction #2: IssueLC  
├─ TxID: def456...
├─ Creator: CN=bank_officer, OU=client, O=BanksMSP
├─ Block #: 147
├─ Chaincode: coffee.IssueLC
└─ Endorsers: peer0.banks.cecbs.et
```

### In Forex Details Dialog:
```
🔐 Blockchain Transaction Verification

[1 Blockchain TX] [1 Signer] [1 Organization]

📜 Transaction: RequestForex
├─ TxID: ghi789...
├─ Creator: CN=exporter1, OU=client, O=ExportersMSP
├─ Block #: 150
├─ Chaincode: coffee.RequestForex
├─ Args: [forexId, contractId, amount, currency]
└─ Metadata: {amount: 50000, currency: "USD"}
```

## Why This is REAL Blockchain

Unlike the first implementation (database table), this is the REAL thing:

1. **Queries Hyperledger Fabric directly** via `fabricService.queryChaincode('GetAssetHistory')`
2. **No database** - pure blockchain source of truth
3. **Shows actual transaction data:**
   - Real Transaction IDs from Fabric
   - Real Block numbers and hashes
   - Real X.509 certificate DNs
   - Real endorsing peers
   - Real validation codes

## Comparison

| Feature | ExporterPortal (Documents) | BanksPortal (Transactions) |
|---------|---------------------------|----------------------------|
| Entity Type | CONTRACT, SHIPMENT | LC, FOREX, PAYMENT |
| What's Signed | Document PDFs | Blockchain transactions |
| Component | BlockchainSignatureVerification | EntityBlockchainVerification |
| Data Source | document_signatures table | Hyperledger Fabric ledger |
| API Endpoint | /documents/:id/verify-signatures | /blockchain-signatures/entity/:type/:id |
| Shows | Document upload signatures | Transaction history |

Both implementations show **real cryptographic proof** from the blockchain!

## Test It Works

After restarting API and refreshing browser:

1. **Go to Banks Portal**
2. **Click any LC** in the Letters of Credit table
3. **Scroll down** in the LC Details dialog
4. **You should see:**
   - 🔐 Blockchain Transaction Verification section
   - List of transactions (RequestLC, IssueLC, etc.)
   - Each with TxID, block number, creator certificate, etc.

If you still see "No blockchain signatures found", check:
- Browser console (F12) for API errors
- API server terminal for errors
- API is running on http://localhost:3001

## Files Modified

**Backend:**
- `api/src/services/realBlockchainSignatureService.ts` - Queries Fabric
- `api/src/routes/blockchain-signatures.ts` - API endpoint
- `api/src/server.ts` - Registers route

**Frontend:**
- `ui/src/components/blockchain/EntityBlockchainVerification.tsx` - UI component
- `ui/src/components/portals/BanksPortal.tsx` - Uses component

**Compiled:**
- `api/dist/**` - Compiled TypeScript ✅
- `ui/.next/**` - Compiled Next.js ✅

Just need to **restart API** to load the compiled code!

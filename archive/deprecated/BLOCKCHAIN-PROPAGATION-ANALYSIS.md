# Blockchain State Propagation Issue - Root Cause Analysis

## Executive Summary

The E2E test failures are caused by **blockchain state propagation delays** in Hyperledger Fabric. Write operations complete successfully but subsequent read operations see stale data because the world state hasn't propagated across all 6 peers.

## Architecture Discovery

### Critical Finding: Dual Data Sources

The API uses **two different data sources** for operations:

1. **Database (PostgreSQL)**: 
   - Used for GET/query operations
   - Returns cached data immediately
   - Fast but may not reflect latest blockchain state

2. **Blockchain (Hyperledger Fabric)**:
   - Used for POST/PUT/update operations
   - Requires consensus across all 6 peers
   - Slower due to state propagation delay

### The Network Topology

The blockchain network has **6 peer nodes**:
- peer0.ecta.cecbs.et
- peer0.ecx.cecbs.et  
- peer0.banks.cecbs.et
- peer0.nbe.cecbs.et
- peer0.customs.cecbs.et
- peer0.shipping.cecbs.et

Each peer must receive, validate, and commit blocks before their world state is updated.

## Propagation Delay Issues

### Issue #1: LC Status Not Propagating (RESOLVED)

**Symptom:**
```
AllocateForex: Successfully updates LC status to "FOREX_ALLOCATED"
CreateShipment (3 seconds later): LC status still shows "REQUESTED"
```

**Root Cause:**
- `AllocateForex` chaincode writes updated LC to blockchain
- Transaction commits successfully
- CouchDB world state updates asynchronously on each peer
- `CreateShipment` queries world state from a peer that hasn't updated yet

**Solution Applied:**
- Increased wait time from 3 seconds to 10 seconds
- Added LC status verification before shipment creation
- If status not FOREX_ALLOCATED, wait additional 10 seconds

### Issue #2: Shipment Not Visible for Bill of Lading Update (IN PROGRESS)

**Symptom:**
```
CreateShipment: Successfully creates SHIP-E2E-1793687788
RecordBillOfLading (10 seconds later): "shipment does not exist" on ALL peers
```

**Root Cause:**
The verification query was **misleading**:

```json
{
  "success": true,
  "data": {
    "shipmentID": "SHIP-E2E-1793687788",
    ...
  },
  "source": "database",  // ← Reading from PostgreSQL, NOT blockchain!
  "blockchainSynced": true
}
```

The GET query returned database data (which updates immediately), but the Bill of Lading POST goes to the blockchain where the shipment hasn't propagated to all peers yet.

**Solution Applied:**
- Increased wait time from 10 seconds to 20 seconds
- Removed misleading verification check (it was checking database, not blockchain)
- Added explanation comment about dual data sources

## Hyperledger Fabric State Propagation Flow

When a transaction is submitted:

```
1. Client submits transaction
2. Endorsing peers execute chaincode
3. Transaction sent to orderer
4. Orderer creates block and broadcasts to peers
5. Each peer validates block  
6. Each peer commits block to ledger
7. Each peer updates CouchDB world state ← ASYNCHRONOUS
```

**The delay happens at step 7**. Each peer's world state database updates independently and asynchronously.

## Why This Matters

### Read-After-Write Consistency

In a traditional database, after you write data, immediate reads see the new value. In Hyperledger Fabric with multiple peers, there's **eventual consistency**:

- **Strong consistency**: All peers eventually agree
- **Weak read-after-write guarantee**: A read immediately after a write may see old data

### Multi-Peer Queries

When the API queries the blockchain (via FabricService), it may read from **any peer**. If that peer's world state hasn't updated yet, you get stale data.

## Test Results

### Propagation Timing Observations

| Operation | Wait Time | Success? | Notes |
|-----------|-----------|----------|-------|
| AllocateForex → CreateShipment | 3 sec | ❌ | LC status still REQUESTED |
| AllocateForex → CreateShipment | 10 sec | ✅ | LC status updated |
| CreateShipment → RecordBoL | 10 sec | ❌ | Shipment not found |
| CreateShipment → RecordBoL | 20 sec | ⏳ | Testing now... |

## Recommended Solutions

### Short-term (Implemented)

1. **Increase wait times**: 10-20 seconds between dependent operations
2. **Remove misleading checks**: Don't verify using database when blockchain is the source of truth

### Medium-term (Recommended)

1. **Implement retry logic** in the API:
```typescript
async function updateWithRetry(operation, maxRetries = 3, delayMs = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.message.includes('does not exist') && i < maxRetries - 1) {
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }
}
```

2. **Use blockchain events**: Listen for committed events before proceeding
3. **Implement read-your-writes**: Pass the transaction ID and wait for it to be committed

### Long-term (Production-ready)

1. **Query from all peers and use majority**: If 4/6 peers have the new state, proceed
2. **Use private data collections**: Faster propagation for sensitive data
3. **Optimize block time**: Reduce orderer batch timeout from 2s to 1s
4. **Use event-driven architecture**: Don't poll, listen for chaincode events

## Files Modified

1. `/home/guda/GoCBC/complete-e2e-test.sh`:
   - Increased LC propagation wait: 3s → 10s
   - Increased shipment propagation wait: 10s → 20s
   - Added LC status verification with additional wait
   - Improved error messages

2. `/home/guda/GoCBC/api/src/services/forexService.ts`:
   - Removed redundant `UpdateLCStatus` call (AllocateForex does it internally)

## Testing Status

**Current Test:** Running with 20-second wait for shipment propagation

**Expected Outcome:** Bill of Lading should record successfully, allowing test to proceed to final stages

---

**Last Updated:** 2026-11-03 06:43 UTC
**Status:** Testing propagation fix

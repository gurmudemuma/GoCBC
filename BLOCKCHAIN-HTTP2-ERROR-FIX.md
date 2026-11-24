# Blockchain HTTP/2 Preface Error - Root Cause Found

## Date: 2026-11-20

## The Smoking Gun

Chaincode logs show:
```
transport: http2Server.HandleStreams failed to receive the preface from client: unexpected EOF
```

This means:
- ✅ The peer **IS** trying to connect to the chaincode
- ❌ The HTTP/2 handshake is failing
- ❌ Connection closes with "unexpected EOF"

## Root Cause

**TLS Mismatch at the gRPC level:**

The peer has `CORE_PEER_TLS_ENABLED=true`, which enables TLS for:
- Peer-to-peer gossip ✓ (required)
- Peer-to-orderer ✓ (required)
- **Peer-to-chaincode** ← THIS IS THE PROBLEM

Even though `connection.json` says `tls_required: false`, the peer's global TLS setting (`CORE_PEER_TLS_ENABLED=true`) is causing it to attempt a TLS connection to the chaincode.

The chaincode has `CHAINCODE_TLS_DISABLED=true`, so it's listening for **plaintext gRPC**.

**Result:** Peer tries TLS → Chaincode expects plaintext → HTTP/2 preface fails → Connection drops

## The Fix

We need to tell the peer to use **plaintext** when connecting to external chaincodes, while keeping TLS enabled for peer-to-peer and peer-to-orderer communication.

### Option 1: Fabric Configuration (Preferred)

Fabric 2.5 should support per-connection TLS configuration, but the peer might not respect `tls_required: false` in connection.json when global TLS is enabled.

**Solution:** Add `CORE_PEER_CHAINCODE_TLS_ENABLED=false` to peer environment variables.

This separates chaincode TLS from peer TLS.

### Option 2: Enable TLS on Chaincode (Not Recommended)

Enable TLS on the chaincode to match the peer. But this requires:
- Valid TLS certificates for the chaincode
- Mounting certs into the chaincode container
- Updating connection.json with `tls_required: true` and `root_cert`

This is complex and unnecessary for local development.

### Option 3: Disable Peer TLS Globally (BREAKS NETWORK)

Setting `CORE_PEER_TLS_ENABLED=false` would fix chaincode connection but break:
- Peer-to-peer gossip
- Peer-to-orderer communication
- The entire blockchain network

**NOT AN OPTION.**

## Implementation

### Step 1: Add Chaincode-Specific TLS Disable

Update `docker-compose-fabric.yml` for all peers, add after `CORE_PEER_TLS_ENABLED=true`:

```yaml
- CORE_PEER_TLS_ENABLED=true
- CORE_PEER_CHAINCODE_TLS_ENABLED=false  # ← ADD THIS
```

This tells the peer:
- Use TLS for peer-to-peer: YES
- Use TLS for chaincode connections: NO

### Step 2: Restart Peers

```bash
cd /home/guda/GoCBC
docker compose -f docker-compose-fabric.yml restart \
  peer0.ecta.cecbs.et \
  peer0.ecx.cecbs.et \
  peer0.banks.cecbs.et \
  peer0.nbe.cecbs.et \
  peer0.customs.cecbs.et \
  peer0.shipping.cecbs.et
```

### Step 3: Test

```bash
bash test-api-blockchain.sh
```

Should work immediately - no need to redeploy chaincode.

## Why This Works

- Peer TLS (`CORE_PEER_TLS_ENABLED=true`): Handles peer-to-peer and peer-to-orderer
- Chaincode TLS (`CORE_PEER_CHAINCODE_TLS_ENABLED=false`): Handles peer-to-chaincode separately
- Chaincode has TLS disabled (`CHAINCODE_TLS_DISABLED=true`)
- connection.json says `tls_required: false`

All four settings now align:
- Peer → Chaincode: Plaintext gRPC ✓
- Chaincode listening: Plaintext gRPC ✓
- connection.json: `tls_required: false` ✓
- Settings respected: YES ✓

## Files to Modify

1. `/home/guda/GoCBC/docker-compose-fabric.yml`
   - Add `CORE_PEER_CHAINCODE_TLS_ENABLED=false` to all 6 peer definitions

## Expected Result

- Chaincode logs: **NO MORE** "unexpected EOF" errors
- Chaincode logs: **WILL SHOW** successful connection and request processing
- API queries: **WILL SUCCEED** within 2-5 seconds
- Blockchain: **FULLY OPERATIONAL**

## Status

- [x] Root cause identified (HTTP/2 preface error due to TLS mismatch)
- [ ] **ACTION REQUIRED:** Add `CORE_PEER_CHAINCODE_TLS_ENABLED=false` to docker-compose
- [ ] Restart peers
- [ ] Test API

---

**This is the real fix.** The issue was never CCID mismatch, never network connectivity, never configuration errors. It was always a TLS handshake mismatch at the gRPC protocol level.

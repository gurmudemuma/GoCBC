# Certificate Issue Fix Guide

## Problem Summary

**Error**: `x509: certificate signed by unknown authority (possibly because of "x509: ECDSA verification failure")`

**Root Cause**: The channel's MSP configuration has a different CA certificate root than the certificates on disk. The channel was created with one set of certificates, but the Admin certificate is from a different generation.

**Impact**: 
- ❌ Document uploads fail with "Document rejected by blockchain network"
- ❌ All blockchain write operations from ECTAMSP fail
- ✅ Blockchain network is running
- ✅ Certificate chain is valid (verified with `openssl verify`)
- ✅ Peer is running correctly

## Why This Happens

Hyperledger Fabric channels store MSP definitions (including CA certificate roots) in the channel configuration ledger. When you:

1. Create a channel with certificates
2. Later regenerate those certificates
3. The channel still has the OLD certificate roots

Result: The peer rejects transactions signed with NEW certificates because they don't match the roots in the channel config.

---

## Solution Options

### Option 1: Recreate the Network (RECOMMENDED for Development)

**Pros**:
- ✅ Quick and clean (5-10 minutes)
- ✅ Fixes all certificate issues permanently
- ✅ No complex channel updates needed
- ✅ Fresh start with consistent state

**Cons**:
- ⚠️  Loses all blockchain data (contracts, LCs, shipments, etc.)
- ⚠️  Requires re-registering exporters
- ⚠️  Need to recreate test data

**Steps**:

```bash
cd /home/guda/GoCBC

# 1. Stop everything
./teardown.sh

# 2. Wait for cleanup
sleep 5

# 3. Start fresh
./start-all.sh

# 4. Verify blockchain is working
docker logs peer0.ecta.cecbs.et 2>&1 | tail -20

# 5. Test document upload
curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/path/to/test.pdf" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-TEST-123" \
  -F "fileName=test.pdf"
```

---

### Option 2: Update Channel MSP Configuration (Advanced)

**Pros**:
- ✅ Preserves all blockchain data
- ✅ No need to recreate test data

**Cons**:
- ❌ Complex process (20-30 steps)
- ❌ Easy to make mistakes
- ❌ Requires understanding of Fabric channel updates
- ❌ Must be done for ALL 6 organizations

**High-Level Steps** (not recommended unless you need to preserve data):

1. Fetch current channel config
2. Convert to JSON
3. Update ECTAMSP root certs
4. Convert back to protobuf
5. Compute config update
6. Sign with all org admins
7. Submit channel update transaction
8. Wait for propagation
9. Restart all peers

**Reference**: [Hyperledger Fabric Channel Update Documentation](https://hyperledger-fabric.readthedocs.io/en/release-2.5/channel_update_tutorial.html)

---

### Option 3: Use a Different Organization's Identity (Temporary Workaround)

**Pros**:
- ✅ Quick test to verify other orgs work
- ✅ No network changes needed

**Cons**:
- ❌ Doesn't fix the root problem
- ❌ Documents won't be signed by ECTAMSP
- ❌ May cause authorization issues

**Steps**:

Modify the API to use a different org (e.g., BanksMSP) for document uploads:

```typescript
// In api/src/routes/documents.ts
// Change the MSP for registration endpoint
const blockchainResult = await fabricService.registerDocumentHash(
  documentID,
  finalEntityId,
  finalEntityType,
  fileHash,
  ipfsCID || '',
  finalFileName,
  finalDocType,
  'BanksMSP' // Use BanksMSP instead of ECTAMSP
);
```

---

## Recommended Action Plan

### For Development/Testing: **Option 1 (Recreate)**

```bash
#!/bin/bash
echo "Recreating network with fresh certificates..."

cd /home/guda/GoCBC

# Backup any important data if needed
echo "Creating backup of current state..."
mkdir -p ~/GoCBC-backup-$(date +%Y%m%d-%H%M%S)
# (Optional: backup your database)

# Teardown
echo "Tearing down network..."
./teardown.sh

# Clean Docker volumes (optional - for complete clean slate)
docker volume prune -f

# Wait
sleep 10

# Start fresh
echo "Starting network with fresh certificates..."
./start-all.sh

# Wait for network to stabilize
sleep 30

# Verify
echo "Verifying network..."
docker ps | grep peer0

# Test
echo "Testing document upload..."
echo "%PDF-1.4" > /tmp/test-cert-fix.pdf
echo "1 0 obj<</Type/Catalog>>endobj" >> /tmp/test-cert-fix.pdf  
echo "%%EOF" >> /tmp/test-cert-fix.pdf

curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/tmp/test-cert-fix.pdf" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-TEST-FIXED" \
  -F "fileName=test.pdf" | jq '.'

rm -f /tmp/test-cert-fix.pdf

echo ""
echo "✅ If the above shows 'success: true', the issue is FIXED!"
echo ""
```

### For Production: **Option 2 (Channel Update)**

Contact your Fabric administrator or follow the detailed channel update procedure in the Fabric documentation.

---

## Verification After Fix

Run these commands to verify the fix worked:

```bash
# 1. Check peer logs for errors
docker logs peer0.ecta.cecbs.et 2>&1 | grep -i "error\|certificate" | tail -10

# Should see NO certificate errors after the fix

# 2. Test document upload
cd /home/guda/GoCBC
./test-document-upload.sh

# Should see HTTP 200 or 201, NOT 400

# 3. Check API logs
tail -50 /home/guda/GoCBC/api/api.log | grep -i "blockchain\|document"

# Should see successful blockchain registrations
```

---

## Prevention

To avoid this in the future:

1. **Never regenerate certificates** for an active network
2. If you must regenerate:
   - Stop the network completely
   - Regenerate ALL certificates
   - Delete all channel artifacts
   - Recreate channels from scratch
3. Use **certificate expiry monitoring** in production
4. Plan certificate rotation in advance

---

## Current Status

- **Network**: ✅ Running
- **Certificates**: ⚠️  Mismatch between channel config and filesystem
- **Document Uploads**: ❌ Failing with certificate errors
- **Other Operations**: ⚠️  Any ECTAMSP write operations will fail

---

## Quick Fix Command

```bash
cd /home/guda/GoCBC && ./teardown.sh && sleep 10 && ./start-all.sh
```

This will recreate the network and fix the certificate issue permanently.

---

## Need Help?

If you're unsure which option to choose:

- **Development/Testing environment** → Use Option 1 (Recreate)
- **Have critical data to preserve** → Use Option 2 (Channel Update) - seek expert help
- **Just want to test temporarily** → Use Option 3 (Different Org)


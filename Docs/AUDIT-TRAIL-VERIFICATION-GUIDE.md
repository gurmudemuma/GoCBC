# Audit Trail Verification Guide

## Overview

This guide explains how to verify the integrity of audit trails in the CECBS (Coffee Export Consortium Blockchain System). The verification process ensures that all audit records are:

1. **Cryptographically linked** in an unbreakable hash chain
2. **Validated by QSCC** (Query System Chaincode) against the Fabric ledger
3. **Independently maintained** per entity type (no cross-contamination)
4. **Endorsed by multiple organizations** as per the consensus policy

---

## Understanding the Architecture

### Per-Entity Hash Chains

Each entity maintains its **own independent hash chain**:

```
CONTRACT-001:
  Log #1 → Log #2 → Log #3 → Log #4
  
CONTRACT-002:
  Log #1 → Log #2
  
LC-001:
  Log #1 → Log #2 → Log #3
```

**Why not a global chain?**
- Different entities have different lifecycles
- Parallel operations don't create bottlenecks
- Easier to verify and debug
- Natural data partitioning

### Hash Chain Mechanics

```
Log #1 (Genesis):
  previousStateHash: ""
  dataHash: SHA-256(entity data)
  newStateHash: SHA-256(previousStateHash + dataHash + metadata)
  
Log #2:
  previousStateHash: <Log #1's newStateHash>  ← LINK TO PREVIOUS
  dataHash: SHA-256(entity data)
  newStateHash: SHA-256(previousStateHash + dataHash + metadata)
  
Log #3:
  previousStateHash: <Log #2's newStateHash>  ← LINK TO PREVIOUS
  dataHash: SHA-256(entity data)
  newStateHash: SHA-256(previousStateHash + dataHash + metadata)
```

**Tampering Detection**: If anyone modifies Log #2, its `newStateHash` changes, which breaks the link to Log #3's `previousStateHash`.

---

## Verification Methods

### Method 1: Manual API Verification

#### Step 1: Get Entity Audit Trail

```bash
curl -X GET \
  "http://localhost:3001/api/v1/audit/blockchain/CONTRACT/CON2654862" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

#### Step 2: Verify Hash Chain

For each log in the response:

```javascript
// First log (genesis)
if (log.position === 0) {
  assert(log.signature.previousStateHash === "" || log.signature.previousStateHash === null);
}

// Subsequent logs
if (log.position > 0) {
  const previousLog = auditLogs[log.position - 1];
  assert(log.signature.previousStateHash === previousLog.signature.newStateHash);
}
```

#### Step 3: Verify QSCC Validation

```javascript
// Each log must have:
assert(log.signature.transactionId !== "");
assert(log.signature.validationStatus === "VALID");
assert(log.signature.blockNumber !== null);
assert(log.signature.caller.mspId !== "");
assert(log.signature.endorsingPeers.length > 0);
```

### Method 2: Using Verification Endpoint

```bash
curl -X GET \
  "http://localhost:3001/api/v1/audit/verify/:entityType/:entityId" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "verified": true,
  "message": "Audit trail verified successfully",
  "totalLogs": 15,
  "verifiedLogs": 15,
  "failedLogs": 0,
  "details": [
    {
      "logId": "AUDIT_001",
      "verified": true,
      "transactionOnLedger": true,
      "blockValidationStatus": "VALID",
      "creatorSignatureValid": true,
      "endorsementSignaturesValid": true,
      "certificateTrustStatus": "TRUSTED_BY_CONFIGURED_MSP_ROOT",
      "chainVerified": true
    }
  ]
}
```

### Method 3: Automated Test Suite

Run the comprehensive verification tests:

```bash
# Test per-entity hash chains
cd /home/guda/GoCBC
node test-per-entity-hash-chains.js

# Test QSCC validation coverage
node test-qscc-validation-coverage.js
```

---

## Interpreting Verification Results

### ✅ Fully Verified Audit Log

A fully verified audit log has:

1. ✅ **Transaction on Ledger**: `transactionOnLedger: true`
2. ✅ **Block Validation**: `blockValidationStatus: "VALID"`
3. ✅ **Creator Signature**: `creatorSignatureValid: true`
4. ✅ **Endorsement Signatures**: `endorsementSignaturesValid: true`
5. ✅ **Certificate Trust**: `certificateTrustStatus: "TRUSTED_BY_CONFIGURED_MSP_ROOT"`
6. ✅ **Hash Chain**: `chainVerified: true`

### ⚠️ Partial Verification

**Scenario 1: Missing QSCC Details**
```json
{
  "transactionOnLedger": false,
  "blockValidationStatus": "UNVERIFIED"
}
```
**Meaning**: Transaction ID not found on ledger (may be old data migrated from database)

**Action**: Check if this is historical data from before blockchain-first implementation

---

**Scenario 2: Broken Hash Chain**
```json
{
  "chainVerified": false,
  "message": "Hash chain broken at log AUDIT_123"
}
```
**Meaning**: The hash linking is broken between logs

**Action**: 
1. Check if logs were imported out of order
2. Verify no database tampering
3. Re-verify from source blockchain

---

**Scenario 3: Invalid Endorsements**
```json
{
  "endorsementSignaturesValid": false,
  "endorsers": []
}
```
**Meaning**: Transaction lacks proper endorsements

**Action**: This is a critical error - investigate immediately

---

### ❌ Failed Verification

**Critical Failures**:
1. `blockValidationStatus: "INVALID"` - Transaction was rejected by Fabric
2. `creatorSignatureValid: false` - Creator signature doesn't match
3. `certificateTrustStatus: "UNTRUSTED"` - Certificate not from valid MSP

**Immediate Actions**:
1. Quarantine the affected audit logs
2. Trace back to the source transaction
3. Investigate potential tampering
4. Alert security team

---

## Common Verification Scenarios

### Scenario 1: Verify Contract Audit Trail

```bash
# Get contract audit trail with blockchain verification
curl -X GET \
  "http://localhost:3001/api/v1/blockchain-signatures/entity/CONTRACT/CON2654862" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data.transactions'
```

**What to check**:
- All transactions have `validationCode: "VALID"`
- Each transaction has endorsers from multiple organizations
- Creator MSP matches expected organization
- Block numbers are sequential

### Scenario 2: Verify LC Approval Chain

```bash
# Get LC audit trail
curl -X GET \
  "http://localhost:3001/api/v1/audit/blockchain/LETTER_OF_CREDIT/LC8527492" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

**What to check**:
- Approval actions have proper `actionType: "APPROVE"`
- Each approval has different `caller.mspId` (multi-org approval)
- Status transitions are logical: DRAFT → ISSUED → CONFIRMED
- Each log has unique transaction ID

### Scenario 3: Cross-Entity Verification

Verify that different entities maintain independent chains:

```javascript
// Get audit trails for different entities
const contract1 = await getAuditTrail('CONTRACT', 'CON001');
const contract2 = await getAuditTrail('CONTRACT', 'CON002');
const lc1 = await getAuditTrail('LETTER_OF_CREDIT', 'LC001');

// Extract all hashes
const hashes1 = extractHashes(contract1);
const hashes2 = extractHashes(contract2);
const hashesLC = extractHashes(lc1);

// Verify no overlaps
assert(noOverlap(hashes1, hashes2));
assert(noOverlap(hashes1, hashesLC));
assert(noOverlap(hashes2, hashesLC));
```

---

## Troubleshooting

### Issue 1: "Hash chain broken"

**Symptoms**:
```json
{
  "chainVerified": false,
  "message": "Hash chain broken at log AUDIT_CONTRACT_CON123_TX456"
}
```

**Diagnosis Steps**:

1. **Check log order**:
   ```sql
   SELECT log_id, created_at, 
          signature->>'previousStateHash' as prev_hash,
          signature->>'newStateHash' as new_hash
   FROM audit_trail
   WHERE entity_type = 'CONTRACT' AND entity_id = 'CON123'
   ORDER BY created_at;
   ```

2. **Verify on blockchain**:
   ```bash
   # Query chaincode directly
   peer chaincode query \
     -C coffeechannel \
     -n coffee \
     -c '{"Args":["QueryAuditLogsByEntity","CONTRACT","CON123"]}'
   ```

3. **Compare hashes**:
   - If blockchain hashes match but database doesn't → Database corrupted
   - If blockchain hashes broken → Investigate chaincode issue

**Resolution**:
- If database corrupted: Re-sync from blockchain
- If blockchain issue: Contact system administrator

---

### Issue 2: "Transaction not found on ledger"

**Symptoms**:
```json
{
  "transactionOnLedger": false,
  "blockValidationStatus": "UNVERIFIED"
}
```

**Diagnosis Steps**:

1. **Check transaction ID**:
   ```bash
   curl -X GET \
     "http://localhost:3001/api/v1/blockchain/ledger/transactions/TX_ID" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Query QSCC directly**:
   ```bash
   peer chaincode query \
     -C coffeechannel \
     -n qscc \
     -c '{"Args":["GetTransactionByID","coffeechannel","TX_ID"]}'
   ```

**Common Causes**:
- Historical data from before blockchain-first implementation
- Transaction ID typo/corruption
- Transaction from different channel
- Ledger not fully synced

**Resolution**:
- For historical data: Mark as "LEGACY" (acceptable)
- For recent data: Investigate why transaction didn't commit

---

### Issue 3: "Endorsement signatures invalid"

**Symptoms**:
```json
{
  "endorsementSignaturesValid": false,
  "endorsers": [
    {
      "mspId": "ECTAMSP",
      "signatureValid": false
    }
  ]
}
```

**Diagnosis Steps**:

1. **Check endorsement policy**:
   ```bash
   peer chaincode query \
     -C coffeechannel \
     -n coffee \
     -c '{"Args":["GetApprovalRequirement","CONTRACT"]}'
   ```

2. **Verify peer certificates**:
   ```bash
   openssl x509 -in crypto-config/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/server.crt -text
   ```

3. **Check MSP configuration**:
   ```bash
   peer channel getinfo -c coffeechannel
   ```

**Resolution**:
- If policy changed: Update expected endorsement requirements
- If certificate issue: Renew/replace certificates
- If MSP issue: Reconfigure MSP

---

## Best Practices

### 1. Regular Verification

**Schedule**: Run verification tests weekly

```bash
# Add to cron
0 2 * * 0 cd /home/guda/GoCBC && node test-per-entity-hash-chains.js >> /var/log/audit-verification.log 2>&1
```

### 2. Monitor QSCC Coverage

**Target**: 100% QSCC validation for new transactions

```sql
-- Check QSCC coverage by date
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_logs,
  SUM(CASE WHEN signature->>'validationStatus' = 'VALID' THEN 1 ELSE 0 END) as qscc_validated,
  ROUND(100.0 * SUM(CASE WHEN signature->>'validationStatus' = 'VALID' THEN 1 ELSE 0 END) / COUNT(*), 2) as coverage_pct
FROM audit_trail
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 3. Audit Trail Snapshots

**Monthly**: Export audit trail proofs for long-term storage

```bash
# Export all audit trails
curl -X GET \
  "http://localhost:3001/api/v1/audit/export?format=json&include_proofs=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o audit-snapshot-$(date +%Y%m%d).json
```

### 4. Cross-Reference with Blockchain

**Quarterly**: Perform full blockchain-database reconciliation

```javascript
// Verify every database audit log exists on blockchain
const dbLogs = await getAllAuditLogsFromDB();
for (const log of dbLogs) {
  const blockchainLog = await queryBlockchainLog(log.logId);
  if (!blockchainLog) {
    console.error(`Missing on blockchain: ${log.logId}`);
  }
}
```

---

## API Reference

### Verification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/audit/verify/:entityType/:entityId` | GET | Verify single entity |
| `/api/v1/audit/blockchain/:entityType/:entityId` | GET | Get blockchain audit trail |
| `/api/v1/blockchain-signatures/entity/:entityType/:entityId` | GET | Get transaction signatures |
| `/api/v1/blockchain/ledger/transactions/:txId` | GET | Get QSCC transaction details |

### Chaincode Functions

| Function | Purpose |
|----------|---------|
| `QueryAuditLogsByEntity` | Get all logs for an entity |
| `VerifyAuditTrail` | Verify hash chain integrity |
| `GetHistory` | Get state history from ledger |

### QSCC Functions

| Function | Purpose |
|----------|---------|
| `GetTransactionByID` | Get transaction by ID |
| `GetBlockByTxID` | Get block containing transaction |
| `GetBlockByNumber` | Get block by number |
| `GetChainInfo` | Get channel information |

---

## Security Considerations

### 1. Certificate Validation

All verification relies on valid X.509 certificates:
- ✅ Verify certificate chain to CA
- ✅ Check certificate expiration
- ✅ Confirm MSP membership
- ✅ Validate certificate revocation list (CRL)

### 2. Access Control

Audit trail queries require authentication:
- ✅ Use JWT tokens with proper claims
- ✅ Enforce RBAC (Role-Based Access Control)
- ✅ Log all verification requests
- ✅ Rate-limit verification endpoints

### 3. Data Privacy

Audit logs may contain sensitive data:
- ✅ Sanitize sensitive fields in logs
- ✅ Use field-level encryption for PII
- ✅ Implement data retention policies
- ✅ Comply with GDPR/privacy regulations

---

## Conclusion

The audit trail verification system provides:

1. **Cryptographic Proof**: Hash chains ensure immutability
2. **Blockchain Validation**: QSCC provides tamper-proof verification
3. **Multi-Org Consensus**: Endorsements prove agreement
4. **Complete Traceability**: Every action is tracked

**Remember**: Verification is not just about detecting tampering—it's about building trust in the system. Regular verification, monitoring, and adherence to best practices ensure the audit trail remains a reliable source of truth.

---

**For Support**:
- Technical Documentation: `/home/guda/GoCBC/Docs/`
- Issue Tracking: GitHub Issues
- Emergency: Contact system administrator

**Last Updated**: 2026-10-19

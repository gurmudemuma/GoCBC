# Audit Trail Deployment Checklist

**Version**: 2.0  
**Date**: June 25, 2026  
**Estimated Time**: 8-10 hours

---

## ☐ PHASE 1: BLOCKCHAIN DEPLOYMENT (2 hours)

### ☐ 1.1 Pre-Deployment Verification
```bash
# Verify package exists
ls -lh chaincodes/coffee/coffee-v2.0-ccaas.tar.gz

# Verify blockchain is running
docker ps | grep peer
docker ps | grep orderer

# Verify channel exists
peer channel list
```

### ☐ 1.2 Install Chaincode on All Peers
**Organizations**: ECTA, NBE, Banks, Customs, ECX, Shipping

For each org:
```bash
export CORE_PEER_ADDRESS=peer0.<org>.cecbs.et:<port>
export CORE_PEER_LOCALMSPID=<MSPID>
export CORE_PEER_TLS_ROOTCERT_FILE=/path/to/<org>/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/path/to/<org>/Admin/msp

peer lifecycle chaincode install chaincodes/coffee/coffee-v2.0-ccaas.tar.gz
```

**Extract Package ID** (save this):
```bash
peer lifecycle chaincode queryinstalled
# Copy the Package ID: coffee_2.0:xxxxx
```

### ☐ 1.3 Approve Chaincode on All Orgs
For each org:
```bash
peer lifecycle chaincode approveformyorg \
  --channelID coffeechannel \
  --name coffee \
  --version 2.0 \
  --package-id <PACKAGE_ID> \
  --sequence 2 \
  --tls --cafile $ORDERER_CA
```

### ☐ 1.4 Check Commit Readiness
```bash
peer lifecycle chaincode checkcommitreadiness \
  --channelID coffeechannel \
  --name coffee \
  --version 2.0 \
  --sequence 2 \
  --tls --cafile $ORDERER_CA
```

**Expected**: All orgs show `true`

### ☐ 1.5 Commit Chaincode
```bash
peer lifecycle chaincode commit \
  --channelID coffeechannel \
  --name coffee \
  --version 2.0 \
  --sequence 2 \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /path/to/ecta/tls/ca.crt \
  --peerAddresses peer0.nbe.cecbs.et:8051 \
  --tlsRootCertFiles /path/to/nbe/tls/ca.crt \
  [... all 6 orgs ...] \
  --tls --cafile $ORDERER_CA
```

### ☐ 1.6 Verify Deployment
```bash
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee

# Expected output: Version 2.0, Sequence 2
```

**Automated**: Use `./deploy-audit-trail.sh`

---

## ☐ PHASE 2: API SERVER (15 minutes)

### ☐ 2.1 Restart API Server
```bash
cd api

# Stop existing server
pkill -f "node.*server.js"

# Start new server
npm start

# Or with PM2
pm2 restart api
```

### ☐ 2.2 Verify API is Running
```bash
curl http://localhost:3001/health
# Expected: 200 OK
```

### ☐ 2.3 Test Audit Endpoints
```bash
# Test endpoint exists (should return 404 or error, not 500)
curl http://localhost:3001/api/audit/TEST_123

# Expected: "audit log TEST_123 does not exist" (not "cannot GET /api/audit")
```

---

## ☐ PHASE 3: FUNCTIONAL TESTING (1 hour)

### ☐ 3.1 Test Exporter Registration with Audit
```bash
curl -X POST http://localhost:3001/api/exporters/register \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "AUDIT_TEST_001",
    "companyName": "Audit Test Corporation",
    "ectaLicenseNumber": "ECTA2026TEST",
    "exporterType": "company",
    "capitalRequirement": 500000,
    "professionalTaster": "John Doe",
    "tasterCertificate": "TASTER001",
    "laboratoryCertificateNumber": "LAB001",
    "licenseExpiryDate": "2027-12-31"
  }'
```

**Expected**: Success response

### ☐ 3.2 Verify Audit Log Created
```bash
curl http://localhost:3001/api/audit/entity/EXPORTER/AUDIT_TEST_001
```

**Expected**: JSON array with audit log containing:
- `actionType`: "CREATE"
- `entityType`: "EXPORTER"
- `entityId`: "AUDIT_TEST_001"
- `signature.caller.mspId`: "ECTAMSP" (or similar)
- `signature.caller.certificateHash`: SHA-256 hash
- `statusBefore`: ""
- `statusAfter`: "ACTIVE"
- `changes`: Array with field changes
- `complianceData`: Compliance metadata

### ☐ 3.3 Test Contract Approval with Audit
```bash
# First register a contract
curl -X POST http://localhost:3001/api/contracts/register -H "Content-Type: application/json" -d '{...}'

# Then approve it
curl -X POST http://localhost:3001/api/contracts/approve/TEST_CONTRACT_001
```

### ☐ 3.4 Verify Audit Log for Contract
```bash
curl http://localhost:3001/api/audit/entity/CONTRACT/TEST_CONTRACT_001
```

**Expected**: Audit log with `actionType`: "APPROVE"

### ☐ 3.5 Test Exporter Suspension with Audit
```bash
curl -X POST http://localhost:3001/api/exporters/suspend \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "AUDIT_TEST_001",
    "reason": "Testing audit trail for suspension"
  }'
```

### ☐ 3.6 Verify Audit Log for Suspension
```bash
curl http://localhost:3001/api/audit/entity/EXPORTER/AUDIT_TEST_001
```

**Expected**: Two audit logs (CREATE + SUSPEND)

### ☐ 3.7 Test Audit Trail Integrity
```bash
curl http://localhost:3001/api/audit/verify/EXPORTER/AUDIT_TEST_001
```

**Expected**: 
```json
{
  "valid": true,
  "message": "Audit trail verified successfully"
}
```

### ☐ 3.8 Test Query by Actor (Certificate Hash)
```bash
# Get cert hash from previous audit log
CERT_HASH="<hash from audit log>"

curl http://localhost:3001/api/audit/actor/$CERT_HASH
```

**Expected**: All actions by that identity

### ☐ 3.9 Test Query by Time Range
```bash
curl "http://localhost:3001/api/audit/timerange?startTime=2026-06-25T00:00:00Z&endTime=2026-06-25T23:59:59Z"
```

**Expected**: All audit logs for today

### ☐ 3.10 Test Compliance Queries
```bash
# ECTA compliance logs
curl http://localhost:3001/api/audit/compliance/ecta/AUDIT_TEST_001

# NBE compliance logs
curl http://localhost:3001/api/audit/compliance/nbe/TEST_CONTRACT_001
```

---

## ☐ PHASE 4: UI INTEGRATION (2 hours)

### ☐ 4.1 Integrate into ExporterPortal
**File**: `ui/src/components/portals/ExporterPortal.tsx`

```typescript
// 1. Import component
import { AuditTrailViewer } from './AuditTrailViewer';

// 2. Add state
const [showAuditTrail, setShowAuditTrail] = useState(false);
const [auditEntityType, setAuditEntityType] = useState<string>('');
const [auditEntityId, setAuditEntityId] = useState<string>('');

// 3. Add button (in exporter actions section)
<Button
  variant="outlined"
  startIcon={<HistoryIcon />}
  onClick={() => {
    setAuditEntityType('EXPORTER');
    setAuditEntityId(selectedExporter.exporterId);
    setShowAuditTrail(true);
  }}
>
  View Audit Trail
</Button>

// 4. Render component
{showAuditTrail && (
  <AuditTrailViewer
    entityType={auditEntityType}
    entityId={auditEntityId}
    onClose={() => setShowAuditTrail(false)}
  />
)}
```

### ☐ 4.2 Test in Browser
```bash
cd ui
npm run dev
```

1. Navigate to Exporter Portal
2. Select an exporter
3. Click "View Audit Trail"
4. Verify audit logs display correctly
5. Test timeline, table, and crypto views
6. Test filters (action type, date range)
7. Test integrity verification

### ☐ 4.3 Integrate into ECTAPortal
**File**: `ui/src/components/portals/ECTAPortal.tsx`

Same pattern as ExporterPortal:
- Import AuditTrailViewer
- Add state
- Add button for each entity type (EXPORTER, INSPECTION)
- Render component

### ☐ 4.4 Integrate into NBEPortal
**File**: `ui/src/components/portals/NBEPortal.tsx`

Add for:
- Contracts (VIEW AUDIT for contract)
- Forex allocations
- L/C approvals

### ☐ 4.5 Integrate into BanksPortal
**File**: `ui/src/components/portals/BanksPortal.tsx`

Add for:
- L/C requests
- L/C approvals
- Export permits
- Payments

### ☐ 4.6 Integrate into CustomsPortal
**File**: `ui/src/components/portals/CustomsPortal.tsx`

Add for:
- Declarations
- Clearances

---

## ☐ PHASE 5: REMAINING AUDIT LOGGING (3 hours)

### ☐ 5.1 Add to RevokeExporterLicense
**File**: `chaincodes/coffee/main.go`

```go
// Add before final return
changes := []FieldChange{
    {FieldName: "licenseStatus", OldValue: previousStatus, NewValue: "REVOKED", DataType: "string"},
}

compliance := ComplianceMetadata{
    ECTACompliance: false,
    NBECompliance:  false,
    UCP600Check:    false,
    EUDRCompliance: false,
    ICOCompliance:  false,
    ComplianceNote: "License permanently revoked by ECTA: " + reason,
}

err = c.CreateAuditLog(ctx, "REVOKE", "EXPORTER", exporterID, previousStatus, "REVOKED", 
    changes, reason, compliance)
if err != nil {
    log.Printf("WARNING: Failed to create audit log: %v", err)
}
```

### ☐ 5.2 Add to SubmitPaymentDocuments
**File**: `chaincodes/coffee/payment.go`

```go
changes := []FieldChange{
    {FieldName: "status", OldValue: "PENDING", NewValue: "DOCUMENTS_SUBMITTED", DataType: "string"},
    {FieldName: "documents", OldValue: "[]", NewValue: fmt.Sprintf("%d documents", len(documents)), DataType: "array"},
}

compliance := ComplianceMetadata{
    ECTACompliance: true,
    NBECompliance:  true,
    UCP600Check:    true, // Documentary credit requires document submission
    EUDRCompliance: true,
    ICOCompliance:  true,
    ComplianceNote: "Payment documents submitted for bank verification",
}

err = c.CreateAuditLog(ctx, "SUBMIT", "PAYMENT", paymentID, "PENDING", "DOCUMENTS_SUBMITTED",
    changes, "Payment documents submitted by exporter", compliance)
if err != nil {
    log.Printf("WARNING: Failed to create audit log: %v", err)
}
```

### ☐ 5.3 Add to VerifyPaymentDocuments
**File**: `chaincodes/coffee/payment.go`

```go
changes := []FieldChange{
    {FieldName: "status", OldValue: "DOCUMENTS_SUBMITTED", NewValue: "VERIFIED", DataType: "string"},
    {FieldName: "verifiedBy", OldValue: "", NewValue: verifiedBy, DataType: "string"},
    {FieldName: "comments", OldValue: "", NewValue: comments, DataType: "string"},
}

compliance := ComplianceMetadata{
    ECTACompliance: true,
    NBECompliance:  true,
    UCP600Check:    true, // Document verification is UCP 600 requirement
    EUDRCompliance: true,
    ICOCompliance:  true,
    ComplianceNote: "Payment documents verified by bank, ready for settlement",
}

err = c.CreateAuditLog(ctx, "VERIFY", "PAYMENT", paymentID, "DOCUMENTS_SUBMITTED", "VERIFIED",
    changes, "Payment documents verified: " + comments, compliance)
if err != nil {
    log.Printf("WARNING: Failed to create audit log: %v", err)
}
```

### ☐ 5.4 Add to SettlePayment
**File**: `chaincodes/coffee/payment.go`

```go
changes := []FieldChange{
    {FieldName: "status", OldValue: previousStatus, NewValue: "SETTLED", DataType: "string"},
    {FieldName: "settlementDate", OldValue: "", NewValue: timestamp, DataType: "date"},
    {FieldName: "swiftReference", OldValue: "", NewValue: swiftReference, DataType: "string"},
    {FieldName: "exchangeRate", OldValue: "", NewValue: fmt.Sprintf("%.2f", exchangeRate), DataType: "number"},
}

compliance := ComplianceMetadata{
    ECTACompliance: true,
    NBECompliance:  true, // NBE forex regulations applied
    UCP600Check:    true,
    EUDRCompliance: true,
    ICOCompliance:  true,
    ComplianceNote: fmt.Sprintf("Payment settled with %.0f%% NBE retention", retentionRate),
}

err = c.CreateAuditLog(ctx, "SETTLE", "PAYMENT", paymentID, previousStatus, "SETTLED",
    changes, "Payment settled via SWIFT", compliance)
if err != nil {
    log.Printf("WARNING: Failed to create audit log: %v", err)
}
```

### ☐ 5.5 Add to PerformInspection
**File**: `chaincodes/coffee/quality.go`

```go
changes := []FieldChange{
    {FieldName: "status", OldValue: "PENDING", NewValue: "INSPECTED", DataType: "string"},
    {FieldName: "qualityGrade", OldValue: "", NewValue: qualityGrade, DataType: "string"},
    {FieldName: "totalScore", OldValue: "", NewValue: fmt.Sprintf("%.2f", totalScore), DataType: "number"},
}

compliance := ComplianceMetadata{
    ECTACompliance: true,
    NBECompliance:  true,
    UCP600Check:    false,
    EUDRCompliance: inspection.EUDRCompliant,
    ICOCompliance:  true, // ICO quality standards
    ComplianceNote: fmt.Sprintf("Quality inspection performed, grade: %s, score: %.2f", qualityGrade, totalScore),
}

err = c.CreateAuditLog(ctx, "INSPECT", "INSPECTION", inspectionID, "PENDING", "INSPECTED",
    changes, "Quality inspection performed by ECTA", compliance)
if err != nil {
    log.Printf("WARNING: Failed to create audit log: %v", err)
}
```

### ☐ 5.6 Add to ApproveInspection (quality.go)
### ☐ 5.7 Add to IssueExportPermit ECTA (quality.go)
### ☐ 5.8 Add to ClearDeclaration (customs.go)
### ☐ 5.9 Add to RevokeExportPermit (permit.go)

### ☐ 5.10 Recompile and Deploy
```bash
cd chaincodes/coffee
go build  # Verify no errors
tar czf coffee-v2.1-ccaas.tar.gz *.go go.mod go.sum connection.json

# Deploy v2.1 (same process as v2.0, sequence 3)
```

---

## ☐ PHASE 6: COMPREHENSIVE TESTING (2 hours)

### ☐ 6.1 End-to-End Workflow Test
Complete workflow with audit verification:

1. Register exporter → verify audit
2. Register contract → verify audit
3. Approve contract → verify audit
4. Request L/C → verify audit
5. Approve L/C → verify audit
6. Issue L/C → verify audit
7. Create shipment
8. Perform inspection → verify audit
9. Submit payment docs → verify audit
10. Verify payment docs → verify audit
11. Settle payment → verify audit
12. Suspend exporter → verify audit

### ☐ 6.2 Query Testing
- Query by entity (all 12 steps above)
- Query by actor (certificate hash)
- Query by time range (today)
- Query by action type (CREATE, APPROVE, etc.)
- Compliance queries (ECTA, NBE, UCP600)

### ☐ 6.3 Integrity Testing
- Verify audit trail for each entity
- Confirm hash chain is valid
- Attempt to tamper (should detect)

### ☐ 6.4 UI Testing
- Test in all 5 portals
- Test all view modes (timeline, table, crypto)
- Test all filters
- Test expand/collapse
- Test audit verification

### ☐ 6.5 Performance Testing
```bash
# Create 100 exporters rapidly
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/exporters/register -d "{...}" &
done
wait

# Query audit logs
time curl http://localhost:3001/api/audit/timerange?...

# Should complete in < 5 seconds
```

---

## ☐ PHASE 7: DOCUMENTATION & TRAINING (1 hour)

### ☐ 7.1 Update User Documentation
- How to view audit trails
- What information is captured
- How to interpret audit logs

### ☐ 7.2 Create Admin Guide
- How audit system works
- Compliance reporting
- Integrity verification
- Troubleshooting

### ☐ 7.3 Create Compliance Reports
- ECTA compliance report template
- NBE compliance report template
- UCP 600 compliance report template

---

## ✅ COMPLETION CRITERIA

### Minimum Viable (Must Have)
- ☐ Chaincode v2.0 deployed and committed
- ☐ API server running with audit endpoints
- ☐ Can register exporter and see audit log
- ☐ Audit trail integrity verification works
- ☐ UI component works in at least ExporterPortal

### Production Ready (Should Have)
- ☐ All 15 critical functions have audit logging
- ☐ UI integrated into all 5 portals
- ☐ All 10 workflow tests passing
- ☐ Performance acceptable (< 5s queries)
- ☐ Documentation complete

### Fully Featured (Nice to Have)
- ☐ PDF export of audit logs
- ☐ Email notifications for critical actions
- ☐ Compliance dashboard
- ☐ Anomaly detection
- ☐ Role-based audit log access

---

## 🔥 CRITICAL ISSUES TO WATCH

1. **Certificate Availability**: Ensure X.509 certificates are accessible in transaction context
2. **Hash Chain Integrity**: Monitor for broken hash chains (indicates tampering or bug)
3. **Performance**: Watch query performance with large audit log volumes
4. **Storage**: Audit logs grow indefinitely - plan retention policy
5. **Access Control**: Ensure sensitive audit logs restricted to authorized users

---

## 📞 SUPPORT

If issues arise:
1. Check `api/logs/error.log` for API errors
2. Check `docker logs <chaincode-container>` for chaincode errors
3. Check audit log exists: `peer chaincode query -C coffeechannel -n coffee -c '{"Args":["GetAuditLog","AUDIT_..."]}'`
4. Verify blockchain health: `peer channel list`, `docker ps`

---

**Estimated Total Time**: 8-10 hours
**Current Progress**: 40% code complete, 0% deployed
**Next Step**: Deploy chaincode (Phase 1)

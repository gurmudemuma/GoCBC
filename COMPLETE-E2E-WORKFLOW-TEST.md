# Complete End-to-End Workflow Test
## Ethiopian Coffee Export Consortium Blockchain System (CECBS)

This document provides a comprehensive test of the complete coffee export workflow from initial license application to final payment release.

## Test Workflow Overview

```
1. Exporter Application → 2. ECTA Approval → 3. Contract Creation → 
4. Quality Inspection → 5. ECX Registration → 6. Warehouse Release → 
7. Shipping Documentation → 8. LC Issuance → 9. Customs Clearance → 
10. NBE Forex Allocation → 11. Payment Processing → 12. Repatriation
```

## Prerequisites
- ✅ Blockchain network running (6 peers + orderer)
- ✅ Database seeded with test users
- ✅ API server running on http://localhost:3001
- ✅ UI server running on http://localhost:3000
- ✅ All organizations enrolled in blockchain

## Test Actors

| Actor | Username | Password | Role |
|-------|----------|----------|------|
| System Admin | admin | admin123 | ADMIN |
| ECTA Officer | ecta_admin | password123 | ECTA |
| ECX Officer | ecx_admin | password123 | ECX |
| NBE Officer | nbe_admin | password123 | NBE |
| Bank Officer | bank_admin | password123 | BANKS |
| Customs Officer | customs_admin | password123 | CUSTOMS |
| Shipping Agent | shipping_admin | password123 | SHIPPING |
| Coffee Exporter | exporter1 | password123 | EXPORTER |

## Test Scenarios

### Phase 1: Exporter License Application & Approval

#### Step 1.1: Exporter Applies for License
**Actor**: Public User (Applicant)
**Endpoint**: POST /api/v1/exporters/apply

**Actions**:
1. Navigate to public application page
2. Fill application form with company details:
   - Company Name: "Test Coffee Exporters PLC"
   - Business License: "BL-TEST-2024-001"
   - TIN: "0012345678"
   - Contact Person: "John Doe"
   - Email: "test@coffeexport.et"
   - Phone: "+251911234567"
   - Address: "Addis Ababa, Ethiopia"
3. Upload required documents:
   - Business License (PDF)
   - TIN Certificate (PDF)
   - Company Registration (PDF)
4. Submit application

**Expected Result**:
- Application ID generated
- Temporary credentials sent to email
- Status: "pending"
- Blockchain transaction recorded

**Verification**:
```bash
curl -X GET http://localhost:3001/api/v1/exporters/applications | jq
```

#### Step 1.2: ECTA Reviews Application
**Actor**: ecta_admin
**Endpoint**: GET /api/v1/exporters/applications

**Actions**:
1. Login as ECTA officer
2. View pending applications
3. Review application details and documents
4. Verify company information

**Expected Result**:
- Application visible in dashboard
- Documents viewable
- Review form available

#### Step 1.3: ECTA Approves Application
**Actor**: ecta_admin
**Endpoint**: POST /api/v1/exporters/applications/:id/approve

**Actions**:
1. Select application
2. Generate ECTA license number: "ECTA-2024-TEST-001"
3. Set expiry date: 1 year from now
4. Approve application

**Expected Result**:
- License number assigned
- Exporter user account created (exporter_id: EXP-TEST-001)
- Status changed to "approved"
- Blockchain transaction recorded
- Email notification sent to exporter
- Exporter can now login

**Verification**:
```bash
# Check exporter created
curl -X GET http://localhost:3001/api/v1/exporters/EXP-TEST-001 \
  -H "Authorization: Bearer $ECTA_TOKEN" | jq

# Check blockchain record
curl -X GET http://localhost:3001/api/v1/blockchain/exporters/EXP-TEST-001 | jq
```

---

### Phase 2: Contract Creation & Registration

#### Step 2.1: Exporter Creates Export Contract
**Actor**: exporter1 (or newly created exporter)
**Endpoint**: POST /api/v1/contracts

**Actions**:
1. Login as exporter
2. Navigate to "Create Contract"
3. Fill contract details:
   - Buyer Name: "Global Coffee Importers Inc."
   - Buyer Country: "USA"
   - Coffee Type: "Arabica Washed"
   - Quantity: 500 (bags)
   - Unit: "bags"
   - Price per Unit: $250 USD
   - Total Value: $125,000 USD
   - Delivery Terms: "FOB Djibouti"
   - Payment Terms: "LC at sight"
   - Expected Ship Date: 30 days from now
4. Upload sales contract document
5. Submit for approval

**Expected Result**:
- Contract ID generated (e.g., CNT-2024-001)
- Status: "draft" or "pending_ecx"
- Blockchain transaction initiated

**Verification**:
```bash
curl -X GET http://localhost:3001/api/v1/contracts \
  -H "Authorization: Bearer $EXPORTER_TOKEN" | jq
```

#### Step 2.2: ECX Registers Contract
**Actor**: ecx_admin
**Endpoint**: POST /api/v1/contracts/:id/register

**Actions**:
1. Login as ECX officer
2. View pending contracts
3. Verify contract details
4. Register contract in ECX system
5. Assign ECX contract number: "ECX-2024-TEST-001"

**Expected Result**:
- ECX contract number assigned
- Status: "registered"
- Blockchain record updated
- Contract visible to all parties

---

### Phase 3: Quality Inspection & Certification

#### Step 3.1: ECTA Schedules Quality Inspection
**Actor**: ecta_admin
**Endpoint**: POST /api/v1/quality/inspections

**Actions**:
1. Login as ECTA officer
2. Select contract CNT-2024-001
3. Schedule inspection:
   - Warehouse Location: "Dinsho Warehouse, Sidama"
   - Inspection Date: Tomorrow
   - Inspector: "Inspector John Smith"
   - Sample Size: 10 bags
4. Create inspection record

**Expected Result**:
- Inspection ID generated (INS-2024-001)
- Status: "scheduled"
- Notification sent to exporter

#### Step 3.2: ECTA Conducts Inspection
**Actor**: ecta_admin
**Endpoint**: PUT /api/v1/quality/inspections/:id/results

**Actions**:
1. Access inspection record
2. Enter quality results:
   - Grade: "Grade 1"
   - Screen Size: "15+"
   - Defects: "0.5%"
   - Moisture: "11.5%"
   - Cup Score: "85"
   - Passed: Yes
3. Upload inspection certificate
4. Submit results

**Expected Result**:
- Status: "passed"
- Certificate generated
- Blockchain record updated
- Quality certificate number: "QC-2024-001"

**Verification**:
```bash
curl -X GET http://localhost:3001/api/v1/quality/inspections/INS-2024-001 \
  -H "Authorization: Bearer $ECTA_TOKEN" | jq
```

---

### Phase 4: Warehouse Release

#### Step 4.1: ECX Issues Warehouse Release Order
**Actor**: ecx_admin
**Endpoint**: POST /api/v1/warehouse/release

**Actions**:
1. Login as ECX officer
2. Select contract with passed inspection
3. Issue release order:
   - Warehouse: "Dinsho Warehouse"
   - Release Quantity: 500 bags
   - Destination: "Djibouti Port"
4. Generate release document

**Expected Result**:
- Release order ID: WR-2024-001
- Status: "released"
- Blockchain transaction recorded
- Notification to exporter and shipping

---

### Phase 5: Shipping & Logistics

#### Step 5.1: Exporter Creates Shipment
**Actor**: exporter1
**Endpoint**: POST /api/v1/shipments

**Actions**:
1. Login as exporter
2. Create shipment for contract CNT-2024-001:
   - Container Number: "TCNU1234567"
   - Vessel Name: "MV Coffee Express"
   - Port of Loading: "Djibouti"
   - Port of Discharge: "New York"
   - Expected Departure: 5 days from now
   - Expected Arrival: 25 days from now
3. Submit shipment details

**Expected Result**:
- Shipment ID: SHP-2024-001
- Status: "preparing"
- Blockchain record created

#### Step 5.2: Shipping Agent Updates Shipment
**Actor**: shipping_admin
**Endpoint**: PUT /api/v1/shipments/:id

**Actions**:
1. Login as shipping agent
2. Access shipment SHP-2024-001
3. Upload shipping documents:
   - Bill of Lading
   - Packing List
   - Certificate of Origin
4. Update status to "shipped"
5. Add B/L number: "BL-2024-TEST-001"

**Expected Result**:
- Status: "in_transit"
- Documents recorded on blockchain
- Tracking information available

---

### Phase 6: Letter of Credit (LC) Issuance

#### Step 6.1: Exporter Requests LC
**Actor**: exporter1
**Endpoint**: POST /api/v1/lc/request

**Actions**:
1. Login as exporter
2. Request LC for contract CNT-2024-001:
   - Beneficiary Bank: "Commercial Bank of Ethiopia"
   - Issuing Bank: "Bank of America"
   - LC Amount: $125,000
   - LC Type: "Irrevocable, at sight"
   - Expiry Date: 60 days from now
3. Upload contract and proforma invoice
4. Submit LC request

**Expected Result**:
- LC Request ID: LC-REQ-2024-001
- Status: "pending_bank"
- Notification to bank

#### Step 6.2: Bank Issues LC
**Actor**: bank_admin
**Endpoint**: POST /api/v1/lc/:id/issue

**Actions**:
1. Login as bank officer
2. Review LC request
3. Verify exporter documents
4. Issue LC:
   - LC Number: "LC-2024-CBE-001"
   - Issue Date: Today
   - Expiry Date: 60 days
   - Terms: At sight
5. Upload LC document

**Expected Result**:
- Status: "issued"
- LC details recorded on blockchain
- Notification to exporter and NBE

**Verification**:
```bash
curl -X GET http://localhost:3001/api/v1/lc/LC-2024-CBE-001 \
  -H "Authorization: Bearer $BANK_TOKEN" | jq
```

---

### Phase 7: Customs Clearance

#### Step 7.1: Exporter Submits Customs Declaration
**Actor**: exporter1
**Endpoint**: POST /api/v1/customs/declarations

**Actions**:
1. Login as exporter
2. Submit customs declaration:
   - Shipment ID: SHP-2024-001
   - HS Code: "0901.11" (Coffee, not roasted)
   - Declared Value: $125,000
   - Export Duty: Calculated
3. Upload export permit and invoice
4. Submit declaration

**Expected Result**:
- Declaration ID: CUS-2024-001
- Status: "submitted"
- Duty calculated automatically

#### Step 7.2: Customs Officer Reviews & Clears
**Actor**: customs_admin
**Endpoint**: POST /api/v1/customs/declarations/:id/clear

**Actions**:
1. Login as customs officer
2. Review declaration CUS-2024-001
3. Verify documents:
   - Export permit
   - Quality certificate
   - Commercial invoice
   - Packing list
4. Inspect physical cargo (if required)
5. Clear for export

**Expected Result**:
- Status: "cleared"
- Clearance certificate number: CLR-2024-001
- Blockchain transaction recorded
- Cargo can proceed to port

---

### Phase 8: Forex Allocation (NBE)

#### Step 8.1: Exporter Applies for Forex
**Actor**: exporter1
**Endpoint**: POST /api/v1/forex/applications

**Actions**:
1. Login as exporter
2. Apply for forex retention:
   - Contract ID: CNT-2024-001
   - Export Value: $125,000
   - Requested Retention: 30% ($37,500)
   - Purpose: "Import of machinery"
3. Upload supporting documents
4. Submit application

**Expected Result**:
- Forex Application ID: FRX-2024-001
- Status: "pending_nbe"

#### Step 8.2: NBE Allocates Forex
**Actor**: nbe_admin
**Endpoint**: POST /api/v1/forex/applications/:id/allocate

**Actions**:
1. Login as NBE officer
2. Review forex application
3. Verify export completion
4. Allocate forex:
   - Approved Amount: $37,500 (30%)
   - Allocation Reference: NBE-FRX-2024-001
   - Valid Until: 180 days from now
5. Approve allocation

**Expected Result**:
- Status: "allocated"
- Forex retention credited to exporter's account
- Blockchain record updated

---

### Phase 9: Payment Processing

#### Step 9.1: Bank Receives Payment from Buyer
**Actor**: bank_admin
**Endpoint**: POST /api/v1/payments/incoming

**Actions**:
1. Login as bank officer
2. Record incoming payment:
   - LC Number: LC-2024-CBE-001
   - Amount Received: $125,000
   - Payment Date: Today
   - Swift Reference: "SWIFT-2024-001"
3. Verify documents against LC terms
4. Confirm payment receipt

**Expected Result**:
- Payment ID: PAY-2024-001
- Status: "received"
- Blockchain transaction recorded

#### Step 9.2: NBE Verifies Repatriation
**Actor**: nbe_admin
**Endpoint**: POST /api/v1/repatriation/verify

**Actions**:
1. Login as NBE officer
2. Verify repatriation compliance:
   - Export Value: $125,000
   - Repatriated Amount: $125,000
   - Repatriation Period: Within 120 days
   - Compliance: Yes
3. Approve repatriation

**Expected Result**:
- Status: "compliant"
- Repatriation recorded on blockchain

#### Step 9.3: Bank Releases Payment to Exporter
**Actor**: bank_admin
**Endpoint**: POST /api/v1/payments/:id/release

**Actions**:
1. Login as bank officer
2. Process payment release:
   - Deduct bank charges: $500
   - Net Amount: $124,500
   - Transfer to exporter account
3. Release payment

**Expected Result**:
- Status: "released"
- Exporter account credited
- Payment receipt generated
- Complete workflow recorded on blockchain

**Verification**:
```bash
# Check payment status
curl -X GET http://localhost:3001/api/v1/payments/PAY-2024-001 \
  -H "Authorization: Bearer $BANK_TOKEN" | jq

# Check complete contract status
curl -X GET http://localhost:3001/api/v1/contracts/CNT-2024-001/status \
  -H "Authorization: Bearer $EXPORTER_TOKEN" | jq

# Verify blockchain audit trail
curl -X GET http://localhost:3001/api/v1/blockchain/contracts/CNT-2024-001/history \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

---

## Final Verification Checklist

### ✅ Blockchain Verification
```bash
# 1. Verify all transactions recorded
curl -X GET http://localhost:3001/api/v1/blockchain/transactions?contract=CNT-2024-001 | jq

# 2. Check immutability
curl -X GET http://localhost:3001/api/v1/blockchain/contracts/CNT-2024-001/audit | jq

# 3. Verify multi-org endorsements
curl -X GET http://localhost:3001/api/v1/blockchain/endorsements/CNT-2024-001 | jq
```

### ✅ Database Consistency
```bash
# Check all records match
psql -U cecbs -d cecbs -c "
SELECT 
  c.id as contract_id,
  c.status as contract_status,
  qi.status as quality_status,
  s.status as shipment_status,
  lc.status as lc_status,
  cd.status as customs_status,
  p.status as payment_status
FROM contracts c
LEFT JOIN quality_inspections qi ON c.id = qi.contract_id
LEFT JOIN shipments s ON c.id = s.contract_id
LEFT JOIN letters_of_credit lc ON c.id = lc.contract_id
LEFT JOIN customs_declarations cd ON s.id = cd.shipment_id
LEFT JOIN payments p ON lc.id = p.lc_id
WHERE c.id = 'CNT-2024-001';
"
```

### ✅ Workflow Status
- [ ] Application approved
- [ ] Contract registered
- [ ] Quality inspection passed
- [ ] Warehouse released
- [ ] Shipment created
- [ ] LC issued
- [ ] Customs cleared
- [ ] Forex allocated
- [ ] Payment received
- [ ] Payment released
- [ ] Blockchain records complete

---

## Success Criteria

1. **All 12 workflow steps completed** without errors
2. **Every transaction recorded** on blockchain with valid hash
3. **Multi-organization endorsement** verified for critical transactions
4. **Audit trail complete** and immutable
5. **Payment successfully released** to exporter
6. **All documents** uploaded and accessible
7. **Notifications sent** to relevant parties at each step
8. **No data inconsistency** between database and blockchain
9. **Performance acceptable** (each transaction < 5 seconds)
10. **UI responsive** for all user roles

---

## Test Execution Commands

Run the automated test script:
```bash
cd /home/guda/GoCBC
./test-complete-workflow.sh
```

Or run individual test phases:
```bash
# Phase 1: Application
./tests/01-test-application.sh

# Phase 2: Contract
./tests/02-test-contract.sh

# ... and so on
```

---

## Expected Timeline
- **Total Test Duration**: ~30-45 minutes (manual)
- **Automated Test Duration**: ~5-10 minutes
- **Real-world Workflow**: 30-60 days

---

## Troubleshooting

If any step fails:
1. Check API logs: `tail -f logs/api.log`
2. Check blockchain logs: `docker logs peer0.ecta.cecbs.et`
3. Verify user permissions
4. Check network connectivity
5. Review error messages in UI console

---

## Report Generation

After test completion, generate report:
```bash
./scripts/generate-test-report.sh > TEST-REPORT-$(date +%Y%m%d).md
```

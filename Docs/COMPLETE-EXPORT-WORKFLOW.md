# Complete Coffee Export Workflow

## Overview
This guide explains the **complete end-to-end workflow** from contract approval to final payment settlement in the CECBS system.

---

## 📋 Workflow Stages

```
Contract Approved (ECTA) ✅
         ↓
1. Shipment Creation (Exporter)
         ↓
2. Quality Inspection (ECTA)
         ↓
3. Export Permit Issuance (ECTA)
         ↓
4. Shipment Preparation (Exporter)
         ↓
5. Customs Declaration (Exporter)
         ↓
6. Customs Clearance (ECC Customs)
         ↓
7. Payment Method Execution:
   ├─ LC (Letter of Credit) - Bank processes
   ├─ CAD (Cash Against Documents) - Bank processes
   ├─ TT Advance - Direct transfer
   └─ TT Post-Shipment - Direct transfer
         ↓
8. Shipping & Delivery
         ↓
9. Forex Settlement (NBE)
         ↓
10. Payment Completed ✅
```

---

## Stage 1: Contract Approved ✅ (CURRENT STATE)

### What Just Happened:
- ✅ Contract reviewed and approved by ECTA
- ✅ Contract documents digitally signed by ECTA officer
- ✅ Contract status: **APPROVED**
- ✅ Contract registered on blockchain
- ✅ Exporter notified

### Signed Documents:
- Contract document signed by ECTA (shows: ✓ Signed)
- X.509 certificate proves ECTA approval
- Blockchain transaction ID recorded
- Immutable audit trail created

---

## Stage 2: Create Shipment 📦

### Actor: **Exporter**
### Portal: **Exporter Portal**

### Steps:

**1. Navigate to Shipments Tab**
- Login to Exporter Portal
- Go to "Shipments" section
- Click "Create New Shipment"

**2. Fill Shipment Details:**
```yaml
Shipment Information:
  - Shipment ID: Auto-generated (SHIP-TIMESTAMP)
  - Contract: Select approved contract
  - Quantity: Amount being shipped (bags)
  - Origin: Coffee origin (e.g., Yirgacheffe, Sidamo)
  - Destination Port: Buyer's port
  - Estimated Departure: Date
  - Coffee Type: Arabica/Robusta
  - Grade: Quality grade
  - Processing Method: Washed/Natural/etc.
  
EUDR Compliance (for EU destinations):
  - EUDR Compliant: Yes/No
  - Geolocation Data: GPS coordinates
  - Due Diligence Statement: Upload document
  - Risk Assessment: Upload report
```

**3. Upload Shipment Documents:**
Required documents:
- Packing list
- Weight certificate
- Sample for quality inspection
- Origin certificate (if applicable)
- EUDR due diligence (for EU)

**4. Submit Shipment**
- System validates shipment data
- Links to approved contract
- Records on blockchain
- Assigns to quality inspection queue

### What Happens Next:
- ✅ Shipment created with status: **CREATED**
- ✅ ECTA quality department notified
- ✅ Inspection scheduled
- 📧 Email sent to ECTA quality inspector

---

## Stage 3: Quality Inspection 🔬

### Actor: **ECTA Quality Inspector**
### Portal: **ECTA Portal - Quality Tab**

### Steps:

**1. Review Inspection Request**
- ECTA logs into Quality tab
- Sees pending shipments for inspection
- Reviews shipment details

**2. Conduct Physical Inspection:**
```yaml
Inspection Points:
  - Visual examination of coffee beans
  - Moisture content test
  - Defect count (primary/secondary)
  - Screen size analysis
  - Cup tasting (if required)
  - Weight verification
  - Packaging condition
  - Sample testing
```

**3. Record Inspection Results:**
```yaml
Quality Metrics:
  - Grade: Grade 1, 2, 3, 4, 5, UG (Under Grade)
  - Total Score: 0-100 points
  - Defect Count: Number of defects
  - Moisture: Percentage
  - Screen Size: 14, 15, 16, 17, 18
  - Passed: Yes/No
```

**4. Approve or Reject:**

**If PASSED:**
- Click "Approve Inspection"
- System generates:
  - Quality Certificate (PDF)
  - Certificate Number: CERT-{TIMESTAMP}
  - Digitally signed by Quality Inspector
  - Contains: Grade, score, certificate number
- Certificate PDF shows: ✓ Signed (by Quality Inspector)
- Shipment status → **QUALITY_APPROVED**

**If FAILED:**
- Click "Reject Inspection"
- Provide rejection reason
- Exporter must fix issues and resubmit

### What Happens Next:
- ✅ Quality certificate issued and signed
- ✅ Shipment status: **QUALITY_APPROVED**
- ✅ Export permit generation triggered
- 📧 Exporter notified of approval

---

## Stage 4: Export Permit Issuance 📜

### Actor: **ECTA (Automatic or Manual)**
### Portal: **ECTA Portal**

### Steps:

**1. Generate Export Permit:**
```yaml
Permit Details:
  - Permit Number: PERMIT-ECTA-{YEAR}-{NUMBER}
  - Shipment ID: Reference
  - Exporter: Company name
  - Quantity: Amount approved
  - Destination: Country
  - Quality Grade: From inspection
  - Validity Period: Usually 30-60 days
  - Special Conditions: If any
```

**2. Sign Export Permit:**
- ECTA officer reviews permit
- Digitally signs permit document
- Permit PDF shows: ✓ Signed (by ECTA)
- Blockchain signature recorded

**3. Issue Permit:**
- Permit status: **ISSUED**
- Exporter can download signed permit
- Permit added to shipment documents

### What Happens Next:
- ✅ Export permit issued and signed
- ✅ Exporter can proceed to export
- ✅ Shipment status: **PERMIT_ISSUED**
- 📧 Exporter receives permit notification

---

## Stage 5: Customs Declaration 🛃

### Actor: **Exporter**
### Portal: **Exporter Portal**

### Steps:

**1. Create Customs Declaration:**
```yaml
Declaration Information:
  - Declaration Type: Standard, Simplified, EUDR-Enhanced
  - HS Code: 090111 (for coffee)
  - Shipment Reference: Link to shipment
  - Quantity: Kg or bags
  - Value (FOB): USD amount
  - Destination Country: Final destination
  - Port of Exit: Ethiopian port
  - Port of Entry: Destination port
  
Documents Required:
  - Export permit (signed by ECTA)
  - Quality certificate (signed by inspector)
  - Commercial invoice
  - Packing list
  - Bill of lading (if available)
  - EUDR declaration (for EU)
```

**2. Submit Declaration:**
- System validates all required documents
- Checks all documents are signed
- Submits to ECC Customs
- Declaration status: **SUBMITTED**

### What Happens Next:
- ✅ Customs declaration submitted
- ✅ ECC Customs officer assigned
- ✅ Declaration enters review queue
- 📧 Customs officer notified

---

## Stage 6: Customs Clearance ✅

### Actor: **ECC Customs Officer**
### Portal: **Customs Portal**

### Steps:

**1. Review Declaration:**
```yaml
Verification Points:
  - Document completeness
  - Signature validation (all docs signed?)
  - Value declaration accuracy
  - HS code correctness
  - Permit validity
  - Quality compliance
  - EUDR compliance (for EU)
  - Risk assessment
```

**2. Physical Inspection (if required):**
- Random selection or risk-based
- Physical examination of cargo
- Weight verification
- Documentation match

**3. Approve Clearance:**
- Click "Approve Declaration"
- System generates:
  - Customs clearance certificate
  - Exit authorization
  - Seal number (if applicable)
- Certificate signed by customs officer
- Shows: ✓ Signed (by Customs)

**4. Release Shipment:**
- Shipment status → **CLEARED**
- Exporter authorized to export
- Cargo can leave Ethiopian territory

### What Happens Next:
- ✅ Customs clearance granted
- ✅ Shipment status: **CLEARED**
- ✅ Exporter can ship goods
- ✅ Payment processing can begin

---

## Stage 7: Payment Processing 💰

### The payment method determines the next steps:

---

### Option A: Letter of Credit (LC) - Most Common ✅

**Actor: Bank (Exporter's Bank + Buyer's Bank)**
**Portal: Banks Portal**

#### LC Workflow:

**Step 1: LC Request (BEFORE shipping)**
- Buyer requests LC from their bank
- Buyer's bank issues LC
- LC transmitted to exporter's bank
- Exporter's bank notifies exporter

**Step 2: LC Review**
```yaml
Exporter Reviews LC Terms:
  - Amount: Matches contract?
  - Beneficiary: Exporter name correct?
  - Expiry date: Sufficient time?
  - Documents required: Can provide?
  - Payment terms: Sight or usance?
  - Confirmation: Confirmed or unconfirmed?
```

**Step 3: Ship Goods**
- Exporter ships coffee
- Obtains shipping documents:
  - Bill of Lading (B/L) - signed by shipping line
  - Commercial Invoice
  - Packing List
  - Certificate of Origin
  - Quality Certificate (signed by ECTA)
  - Export Permit (signed by ECTA)
  - Insurance Certificate

**Step 4: Present Documents to Bank**
```yaml
Document Examination by Bank:
  - All required documents present?
  - Documents match LC terms exactly?
  - Signatures verified (all signed)?
  - Dates within validity?
  - Amounts match?
  - Description matches?
```

**Step 5: Bank Processes LC**
- Bank officer reviews documents in **Banks Portal**
- Checks digital signatures on all documents
- Verifies blockchain records
- Approves or rejects document package

**If Approved:**
- Bank signs LC documents digitally
- Shows: ✓ Signed (by Bank Officer)
- Payment initiated via SWIFT
- Shipment status → **DOCUMENTS_SUBMITTED**

**Step 6: SWIFT Payment**
- Exporter's bank sends SWIFT message to buyer's bank
- MT 700: LC issuance
- MT 760: Bank guarantee
- Payment transferred

**Step 7: Forex Settlement (NBE)**
- Foreign currency received
- NBE processes forex conversion
- Retention applied (if any)
- Exporter receives ETB equivalent

---

### Option B: Cash Against Documents (CAD)

**Process:**
1. Exporter ships goods
2. Presents documents to bank
3. Bank sends documents to buyer's bank
4. Buyer pays bank to release documents
5. Bank transfers payment to exporter
6. NBE processes forex

**Risk:** Medium - No bank guarantee, relies on buyer payment

---

### Option C: Telegraphic Transfer (TT) - Advance

**Process:**
1. Buyer sends payment BEFORE shipment
2. Exporter receives funds
3. NBE converts forex
4. Exporter ships goods after payment confirmed

**Risk:** Low for exporter - Payment received first

---

### Option D: Telegraphic Transfer (TT) - Post-Shipment

**Process:**
1. Exporter ships goods first
2. Sends commercial invoice to buyer
3. Buyer initiates TT payment
4. Payment arrives after goods shipped
5. NBE processes forex

**Risk:** High for exporter - Relies on buyer trust

---

## Stage 8: Shipping & Delivery 🚢

### Actor: **Shipping Company / Freight Forwarder**
### Portal: **Shipping Portal**

### Steps:

**1. Cargo Booking:**
- Shipping line books cargo space
- Issues booking confirmation
- Assigns container number (if FCL)

**2. Port Operations:**
- Cargo delivered to port
- Container stuffing
- Customs inspection (if required)
- Loading on vessel

**3. Bill of Lading Issuance:**
- Shipping line issues B/L
- Original B/L sent to exporter
- B/L is key document for payment

**4. Transit:**
- Vessel departs
- AIS tracking updates
- Estimated arrival calculated

**5. Arrival:**
- Vessel arrives at destination
- Buyer clears customs
- Takes delivery of coffee

### Tracking in System:
```yaml
Shipment Status Updates:
  - CLEARED → SHIPPED → IN_TRANSIT → ARRIVED → DELIVERED
  
Real-time Tracking:
  - Current location
  - Vessel name
  - Estimated arrival
  - Port of loading/discharge
```

---

## Stage 9: Forex Settlement (NBE) 💱

### Actor: **National Bank of Ethiopia (NBE)**
### Portal: **NBE Portal**

### Steps:

**1. Forex Allocation:**
```yaml
NBE Reviews:
  - Export value (FOB)
  - Currency: USD, EUR, GBP, etc.
  - Current exchange rate
  - Retention requirement
  - Repatriation deadline
```

**2. Currency Conversion:**
```yaml
Example Calculation:
  Export Value: $100,000 USD
  NBE Rate: 115.50 ETB/USD
  Gross ETB: 11,550,000 ETB
  
  Retention (30%): 3,465,000 ETB
  Net to Exporter: 8,085,000 ETB
```

**3. Payment Authorization:**
- NBE officer reviews transaction
- Signs payment authorization
- Shows: ✓ Signed (by NBE Officer)
- Releases funds to exporter's account

**4. Compliance:**
- Export proceeds repatriated
- Forex regulations compliance checked
- Tax implications calculated
- Records maintained for audit

### What Happens Next:
- ✅ Forex converted
- ✅ Retention applied
- ✅ Exporter receives payment
- ✅ Transaction complete

---

## Stage 10: Payment Completed ✅

### Final Status:
```yaml
Contract Status: COMPLETED
Shipment Status: DELIVERED
Payment Status: SETTLED
Forex Status: CONVERTED

All Documents Signed:
  ✓ Contract (ECTA)
  ✓ Quality Certificate (Quality Inspector)
  ✓ Export Permit (ECTA)
  ✓ Customs Clearance (Customs Officer)
  ✓ LC Documents (Bank Officer)
  ✓ Payment Authorization (NBE Officer)
  ✓ Bill of Lading (Shipping Line)

Blockchain Records:
  ✓ Contract approval transaction
  ✓ Shipment creation transaction
  ✓ Quality approval transaction
  ✓ Customs clearance transaction
  ✓ Payment transaction
  ✓ All document signatures
```

---

## 📊 Summary Timeline

| Stage | Actor | Duration | Status |
|-------|-------|----------|--------|
| Contract Approval | ECTA | 1-3 days | ✅ **CURRENT** |
| Shipment Creation | Exporter | 1 day | ⏭️ **NEXT** |
| Quality Inspection | ECTA Quality | 1-2 days | Pending |
| Export Permit | ECTA | 1 day | Pending |
| Customs Declaration | Exporter | 1 day | Pending |
| Customs Clearance | ECC Customs | 1-3 days | Pending |
| Payment Processing | Bank/NBE | 3-7 days | Pending |
| Shipping | Shipping Line | 15-45 days | Pending |
| Forex Settlement | NBE | 1-2 days | Pending |
| **TOTAL** | - | **25-65 days** | - |

---

## 🎯 Your Next Action Items

### As **Exporter**:
1. ✅ Receive contract approval notification
2. ⏭️ **CREATE SHIPMENT** in Exporter Portal
3. ⏭️ Upload shipment documents
4. ⏭️ Submit for quality inspection
5. ⏭️ Wait for quality approval
6. ⏭️ Prepare goods for export
7. ⏭️ Submit customs declaration
8. ⏭️ Ship goods after clearance
9. ⏭️ Submit LC documents to bank
10. ⏭️ Receive payment

### As **ECTA Quality Inspector**:
1. ⏭️ Review pending inspections
2. ⏭️ Conduct quality inspection
3. ⏭️ Issue quality certificate (digitally signed)
4. ⏭️ Issue export permit (digitally signed)

### As **Bank Officer**:
1. ⏭️ Review LC request
2. ⏭️ Examine shipping documents
3. ⏭️ Verify all signatures (✓ Signed badges)
4. ⏭️ Approve/reject document package
5. ⏭️ Initiate SWIFT payment

### As **NBE Officer**:
1. ⏭️ Monitor export proceeds
2. ⏭️ Allocate forex
3. ⏭️ Process currency conversion
4. ⏭️ Release funds to exporter

---

## 🔍 Key Points

### Document Signatures are CRITICAL:
- Every stage requires signed documents
- Blockchain signatures prove authenticity
- Banks VERIFY signatures before payment
- Customs CHECK signatures before clearance
- NBE REVIEWS signatures before forex

### Workflow is Linear:
```
Cannot skip stages:
❌ Can't ship without quality approval
❌ Can't export without customs clearance
❌ Can't get paid without proper documents
❌ Can't get forex without NBE approval
```

### All Transactions on Blockchain:
- Immutable audit trail
- Complete transparency
- Multi-party verification
- Fraud prevention

---

## 📖 Related Documentation

- **CRYPTOGRAPHIC-DOCUMENT-SIGNING.md** - How signatures work
- **IDENTIFYING-SIGNED-DOCUMENTS.md** - How to verify signatures
- **PORTAL-SPECIFIC-GUIDES/** - Detailed portal instructions
- **API-DOCUMENTATION/** - Technical API details

---

## ✅ Quick Start Guide: What to Do NOW

**Current State:** Contract approved with signed documents ✅

**Your NEXT steps (in order):**

1. **Exporter logs into Exporter Portal**
2. **Goes to "Shipments" tab**
3. **Clicks "Create New Shipment"**
4. **Selects the approved contract**
5. **Fills in shipment details**
6. **Uploads required documents**
7. **Clicks "Submit Shipment"**

**Then the system takes over:**
- ECTA gets inspection notification
- Quality inspector reviews
- Certificate issued (signed)
- Export permit issued (signed)
- Workflow continues automatically!

---

**You're at the START of the export journey - shipment creation is NEXT!** 🚀

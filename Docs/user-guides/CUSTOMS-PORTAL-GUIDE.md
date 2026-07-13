# Customs Portal - Complete Guide

## 📋 EXECUTIVE SUMMARY

**Status:** ✅ FULLY OPERATIONAL  
**Purpose:** Customs officers process clearance declarations and monitor trade compliance  
**Users:** Ethiopian Customs officers  

### Quick Stats
- **Dashboard KPIs:** 6 live metrics from blockchain
- **Main Sections:** Declarations, Clearances, Analytics
- **Quick Actions:** Approve/Reject declarations, Issue clearance
- **Data Grids:** Real-time customs submissions
- **Processing Target:** 24-48 hours for clearance

### Core Functions
1. ✅ **Review Declarations** - Examine customs submissions
2. ✅ **Verify Documents** - Check supporting documents
3. ✅ **Issue Clearances** - Approve shipments for export
4. ✅ **Track Duty** - Monitor duty waivers and exemptions
5. ✅ **Analytics** - Trade statistics and compliance
6. ✅ **Audit Trail** - Complete blockchain audit logs

---

## 📊 DASHBOARD STATISTICS (Live Data)

| KPI | Data Source | Icon | Calculation |
|-----|-------------|------|-------------|
| **Pending Declarations** | `declarations.filter(d => d.status === 'SUBMITTED')` | 📋 | Count awaiting review |
| **Cleared Today** | `declarations.filter(d => d.status === 'CLEARED' && today)` | ✅ | Count cleared in last 24h |
| **Total Export Value** | `sum(declarations.customsValue)` | 💰 | Sum of all declared values |
| **Avg Processing Time** | `avg(clearanceDate - submissionDate)` | ⏱️ | Hours from submit to cleared |
| **Compliance Rate** | `(cleared / total) * 100` | 📊 | % of declarations cleared |
| **Red Flags** | `declarations.filter(d => d.hasIssues)` | ⚠️ | Count with compliance issues |

---

## 🎯 MAIN SECTIONS

### **Section 1: Pending Declarations**

**Purpose:** Process new customs clearance requests

#### **Data Grid Columns**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Declaration ID** | `declarationId` | Generated | DECL-2026-001234 |
| **Shipment ID** | `shipmentId` | From exporter | SHIP1783176028054 |
| **Exporter** | `exporterId` | Blockchain | EXP123456 |
| **HS Code** | `hsCode` | From declaration | 090111 (Green Coffee) |
| **Quantity** | `quantity` | From shipment | 20,000 kg |
| **Value** | `customsValue` | Declared FOB value | $150,000 USD |
| **Port of Exit** | `portOfExit` | Selected | Djibouti Port / Addis Airport |
| **Transport** | `transportMode` | NEW | 🚢 SEA / ✈️ AIR |
| **Submitted** | `submissionDate` | Timestamp | 2026-07-07 10:30 |
| **Status** | `status` | State | SUBMITTED, UNDER_REVIEW |
| **Actions** | - | - | 👁️ Review \| ✅ Clear \| ❌ Reject |

#### **Status Flow**
```
SUBMITTED → UNDER_REVIEW → CLEARED / REJECTED / HOLD
```

#### **Quick Actions**

**1. Review Declaration Button (👁️)**
- Opens declaration detail dialog
- **Sections:**
  
  **A. Shipment Information**
  ```tsx
  - Shipment ID: SHIP1783176028054
  - Exporter: Yirgacheffe Coffee Growers
  - Contract ID: CNT123456789
  - Buyer: German Coffee Importers GmbH
  - Destination: Hamburg, Germany
  ```
  
  **B. Commodity Details**
  ```tsx
  - HS Code: 090111 (Coffee, not roasted, not decaffeinated)
  - Coffee Type: Arabica Yirgacheffe Grade 2
  - Quantity: 20,000 kg
  - Customs Value: $150,000 FOB
  - Unit Price: $7.50/kg
  - Currency: USD
  ```
  
  **C. Transport Details (NEW)**
  ```tsx
  - Transport Mode: [🚢 Sea Freight] or [✈️ Air Freight]
  - Port of Exit: Djibouti Port / Addis Ababa Airport
  - Destination Port: Hamburg Port / Frankfurt Airport
  - Expected Departure: 2026-07-10
  
  [Priority Alert for Air Freight]
  ⚠️ Priority Processing: Air freight shipment requires
  expedited clearance. Target: 24 hours.
  ```
  
  **D. Compliance Checks**
  ```tsx
  - EUDR Compliant: ✅ Yes (for EU exports)
  - Quality Certificate: ✅ ECTA-CERT-123456
  - Export Permit: ✅ PERMIT-123456
  - ICO Number: ✅ ICO-ET-2026-1234
  - Origin Certificate: ✅ Available
  - Phytosanitary Certificate: ✅ Available
  ```
  
  **E. Financial Verification**
  ```tsx
  - Contract Value: $150,000
  - Customs Value: $150,000
  - Variance: 0% ✅
  - Forex Allocation: ✅ FX-2026-001234
  - L/C Reference: ✅ LC123456789 (if applicable)
  ```
  
  **F. Risk Assessment**
  ```tsx
  - Exporter History: Clean (0 violations in 12 months)
  - Value Consistency: ✅ Within normal range
  - Quantity Check: ✅ Matches contract
  - Document Completeness: ✅ 100%
  - Red Flags: None
  - Risk Level: LOW
  ```

- **Actions in Dialog:**
  - **View Documents:** Opens document viewer
  - **Download Declaration:** PDF export
  - **Request Inspection:** Trigger physical inspection
  - **Clear Declaration:** Issue clearance
  - **Reject Declaration:** With reason
  - **Put on Hold:** Request additional info

**2. Clear Declaration Button (✅)**
- Available when: Status = SUBMITTED or UNDER_REVIEW
- Confirmation dialog:
  ```
  Issue Customs Clearance?
  
  Declaration ID: DECL-2026-001234
  Shipment ID: SHIP1783176028054
  Exporter: Yirgacheffe Coffee Growers
  Value: $150,000 USD
  
  Clearance will allow exporter to book shipping.
  
  [Cancel] [Issue Clearance]
  ```
- Inputs:
  - **Clearance Number:** Auto-generated (CLR-2026-001234)
  - **Officer Name:** Auto-filled from login
  - **Customs Office:** Addis Ababa / Djibouti
  - **Duty Waiver Applied:** Yes/No (Coffee exports are duty-free)
  - **Remarks:** Optional notes
- Submit → Blockchain: `IssueCustomsClearance`
- Updates declaration status → CLEARED
- Shipment status → CUSTOMS_CLEARED
- **Notifications:**
  - Exporter receives clearance notification
  - Shipping portal shows shipment ready for booking
  - ECTA receives copy for quality tracking
- **Certificate Generated:**
  - Customs Clearance Certificate
  - PDF with QR code
  - Blockchain hash for verification

**3. Reject Declaration Button (❌)**
- Available when: Status = SUBMITTED or UNDER_REVIEW
- Opens rejection dialog
- Required fields:
  - **Rejection Reason:** Dropdown
    - Document Incomplete
    - Value Discrepancy
    - Compliance Issue
    - Quality Certificate Missing
    - Permit Expired
    - EUDR Non-Compliant
    - Other (specify)
  - **Details:** Text area (required)
  - **Required Actions:** What exporter must do to resubmit
- Submit → Blockchain: `RejectCustomsDeclaration`
- Updates status → REJECTED
- **Notifications:**
  - Exporter receives rejection with reasons
  - Exporter can resubmit after addressing issues

**4. Put on Hold Button (⏸️)**
- Available when: Status = SUBMITTED or UNDER_REVIEW
- Opens hold dialog
- Required fields:
  - **Hold Reason:** Dropdown
    - Awaiting Physical Inspection
    - Document Verification in Progress
    - Value Assessment Required
    - Compliance Review Pending
  - **Expected Resolution:** Date picker
  - **Additional Info Needed:** Text area
- Submit → Blockchain: `PutDeclarationOnHold`
- Updates status → HOLD
- Exporter receives notification with requirements

---

### **Section 2: Cleared Declarations**

**Purpose:** Monitor and track issued clearances

#### **Data Grid Columns**
| Column | Field | Display |
|--------|-------|---------|
| **Clearance Number** | `clearanceNumber` | CLR-2026-001234 |
| **Declaration ID** | `declarationId` | DECL-2026-001234 |
| **Shipment ID** | `shipmentId` | SHIP1783176028054 |
| **Exporter** | `exporterId` | EXP123456 |
| **Value** | `customsValue` | $150,000 |
| **Transport** | `transportMode` | 🚢 / ✈️ |
| **Cleared Date** | `clearanceDate` | 2026-07-07 15:45 |
| **Officer** | `clearanceOfficer` | Officer Name |
| **Shipping Status** | `shipmentStatus` | CUSTOMS_CLEARED, BOOKED, SHIPPED |
| **Actions** | - | 👁️ View \| 📄 Certificate |

#### **Quick Actions**

**1. View Clearance Button (👁️)**
- Shows complete clearance details
- Includes: Declaration info, clearance certificate, officer details
- Timeline: Submitted → Reviewed → Cleared → Shipped

**2. Download Certificate Button (📄)**
- Generates PDF clearance certificate
- Includes:
  - Clearance number
  - Shipment details
  - Customs office stamp (digital)
  - QR code for verification
  - Officer signature
  - Blockchain hash

---

### **Section 3: Analytics & Reports**

**Purpose:** Trade statistics and compliance monitoring

#### **Charts**

**1. Daily Clearance Volume (Line Chart)**
```tsx
Data: Count of declarations cleared per day (last 30 days)
X-axis: Dates
Y-axis: Count
Shows: Processing trends
```

**2. Export Value by Destination (Bar Chart)**
```tsx
Data: Sum of customs value per destination country
X-axis: Countries (Germany, USA, Japan, etc.)
Y-axis: USD value
Shows: Top export markets
```

**3. Processing Time Distribution (Histogram)**
```tsx
Data: Hours from submission to clearance
Buckets: <24h, 24-48h, 48-72h, >72h
Shows: Efficiency metrics
Target: 80% within 48h
```

**4. Compliance Rate by Exporter (Table)**
```tsx
Columns: Exporter, Total, Cleared, Rejected, Rate
Data: Aggregated by exporter
Sorting: By compliance rate
Highlights: Exporters with issues
```

**5. Transport Mode Breakdown (NEW)**
```tsx
Data: Count and value by SEA vs AIR
Pie Chart: % split
Table: Details with avg processing time
Shows: Sea freight: 85%, Air freight: 15%
```

**6. Duty Waiver Summary**
```tsx
Data: Count and total value of duty waivers applied
Info: Coffee exports are duty-free per Ethiopian policy
Shows: Total waived amount (informational)
```

#### **Reports**

**1. Monthly Export Report**
- Total clearances issued
- Total export value
- Top exporters
- Top destinations
- Avg processing time
- Compliance rate
- Export: PDF or Excel

**2. Exporter Performance Report**
- Selected exporter
- Total exports
- Clearances issued
- Rejections (if any)
- Avg processing time
- Compliance issues
- Export: PDF

**3. Commodity Report**
- Coffee types exported
- Quantities per type
- Avg price per type
- Destination breakdown
- Export: Excel

---

## 🔍 VERIFICATION WORKFLOWS

### **Workflow 1: Standard Clearance (Low Risk)**
```
1. Declaration submitted
2. Auto-check: Documents present
3. Auto-check: Value consistency
4. Auto-check: Compliance flags
5. Officer reviews (15 min)
6. Clearance issued
Total time: < 24 hours
```

### **Workflow 2: Enhanced Review (Medium Risk)**
```
1. Declaration submitted
2. Auto-check: Identifies discrepancy
3. Status: UNDER_REVIEW
4. Officer deep-dive (30-60 min):
   - Document verification
   - Value assessment
   - Compliance check
   - Exporter history review
5. Decision: Clear / Reject / Hold
Total time: 24-48 hours
```

### **Workflow 3: Physical Inspection (High Risk)**
```
1. Declaration submitted
2. Risk assessment: High
3. Status: HOLD (Inspection Required)
4. Officer assigns inspection team
5. Physical inspection at warehouse:
   - Verify quantity
   - Inspect quality
   - Check packaging
   - Sample testing (if needed)
6. Inspection report submitted
7. Officer reviews report
8. Decision: Clear / Reject
Total time: 2-5 days
```

### **Workflow 4: Air Freight Priority (NEW)**
```
1. Declaration submitted with transportMode = AIR
2. Auto-flag: PRIORITY PROCESSING
3. Assigned to dedicated officer
4. Expedited review (target: 12-24 hours)
5. All checks completed rapidly
6. Clearance issued within 24h
7. Notification to exporter and airline
Total time: < 24 hours (target)
```

---

## 📋 DOCUMENT VERIFICATION

### **Required Documents Checklist**
- [x] **Sales Contract:** Between exporter and buyer
- [x] **Quality Certificate:** ECTA inspection certificate
- [x] **Export Permit:** Government approval
- [x] **ICO Certificate:** International Coffee Organization
- [x] **Origin Certificate:** Ethiopian origin proof
- [x] **Phytosanitary Certificate:** Plant health certificate
- [x] **EUDR Compliance:** (For EU exports only)
- [x] **Packing List:** Shipment contents
- [x] **Proforma Invoice:** Commercial invoice

### **Document Verification Steps**
1. **Check Presence:** All required documents uploaded
2. **Verify Authenticity:** Cross-check certificate numbers
3. **Check Validity:** Not expired
4. **Match Details:** Shipment details match across docs
5. **Flag Discrepancies:** Report inconsistencies

---

## ⚠️ RISK ASSESSMENT CRITERIA

| Factor | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| **Exporter History** | Clean record | 1-2 issues/year | 3+ issues/year |
| **Value Variance** | <5% from contract | 5-15% variance | >15% variance |
| **Document Completeness** | 100% | 90-99% | <90% |
| **Destination** | Regular markets | New markets | High-risk countries |
| **Quantity** | <50 tons | 50-100 tons | >100 tons |
| **Processing** | Standard | Enhanced | Inspection required |

---

## 🔔 NOTIFICATIONS

### **Officer Receives**
```tsx
✅ New Declaration Submitted: DECL-2026-001234
   Exporter: Yirgacheffe Coffee | Value: $150K
   Priority: Air Freight - 24h target
   [Review Now]
```

### **Exporter Receives**
```tsx
✅ Customs Clearance Issued: CLR-2026-001234
   Shipment: SHIP1783176028054
   You can now book shipping.
   [Download Certificate]
```

---

## ✅ COMPLETION CHECKLIST

### **Core Functions**
- [x] Review pending declarations
- [x] Verify compliance documents
- [x] Issue clearances
- [x] Reject declarations with reasons
- [x] Put declarations on hold
- [x] Track cleared shipments
- [x] Generate reports

### **Data Display**
- [x] Pending declarations grid
- [x] Cleared declarations grid
- [x] Analytics charts
- [x] Real-time statistics

### **Quick Actions**
- [x] Review button with full details
- [x] Clear button with certificate generation
- [x] Reject button with reason selection
- [x] Hold button for inspections
- [x] Download certificate

### **AWB Integration (PENDING)**
- [ ] Display transport mode in declarations grid
- [ ] Show priority alert for air freight
- [ ] Track air freight clearance times separately
- [ ] Update reports with transport mode breakdown

---

**Last Updated:** July 7, 2026  
**Status:** ✅ OPERATIONAL | ⏳ AWB DISPLAY PENDING  
**Version:** 1.0

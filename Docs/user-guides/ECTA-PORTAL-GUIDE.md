# ECTA Portal - Complete Guide

## 📋 EXECUTIVE SUMMARY

**Status:** ✅ FULLY OPERATIONAL  
**Purpose:** Ethiopian Coffee & Tea Authority manages exporter registration and quality control  
**Users:** ECTA officials, quality inspectors  

### Quick Stats
- **Dashboard KPIs:** 7 live quality metrics
- **Main Sections:** Registration, Inspections, Quality Control, Analytics
- **Quick Actions:** Approve/Reject applications, Conduct inspections
- **Data Grids:** Applications, Exporters, Inspections, Shipments
- **Quality Standards:** Cup score, defects, moisture, grade classification

### Core Functions
1. ✅ **Exporter Registration** - Approve/reject exporter applications
2. ✅ **Quality Inspections** - Conduct coffee quality assessments
3. ✅ **Issue Certificates** - Generate quality certificates
4. ✅ **License Management** - Suspend/activate licenses
5. ✅ **Laboratory Certification** - Verify lab facilities
6. ✅ **Compliance Monitoring** - Track quality standards

---

## 📊 DASHBOARD STATISTICS (Live Data)

| KPI | Data Source | Icon | Calculation |
|-----|-------------|------|-------------|
| **Pending Applications** | `applications.filter(a => a.status === 'pending')` | 📋 | Count awaiting approval |
| **Active Exporters** | `approvedApplications.length` or `exporters.length` | ✅ | Count of approved exporters |
| **Pending Inspections** | `shipments.filter(s => s.status === 'CREATED')` | 🔬 | Count awaiting quality check |
| **Inspections Today** | `inspections.filter(i => isToday(i.date))` | 📊 | Count completed today |
| **Avg Cup Score** | `avg(inspections.cupScore)` | ☕ | Average quality score |
| **Pass Rate** | `(approved / total) * 100` | 📈 | % passing inspection |
| **Lab Certified** | `exporters.filter(e => e.laboratoryCertified)` | 🧪 | Count with certified labs |

---

## 🎯 MAIN SECTIONS

### **Section 1: Exporter Applications**

**Purpose:** Review and approve new exporter registrations

#### **Application Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Application ID** | `application_id` | Generated | APP-2026-001234 |
| **Company Name** | `company_name` | Form | Yirgacheffe Coffee Growers |
| **TIN Number** | `tin_number` | Form | TIN-1234567890 |
| **Business License** | `business_license_number` | Form | BL-2026-5678 |
| **Capital** | `capital_requirement` | Form | 50,000,000 ETB |
| **Taster** | `professional_taster` | Form | Name + Certificate |
| **Laboratory** | `laboratory_facility` | Form | YES/NO + Cert # |
| **Bank** | `bank_name` | Form | Commercial Bank of Ethiopia |
| **Status** | `status` | State | PENDING, APPROVED, REJECTED |
| **Submitted** | `submitted_at` | Timestamp | 2026-07-07 10:30 |
| **Actions** | - | - | 👁️ View \| ✅ Approve \| ❌ Reject |

#### **Application Requirements**

**Minimum Capital:**
- **Specialty Exporters:** 50,000,000 ETB
- **Commercial Exporters:** 100,000,000 ETB
- **Producer Exporters:** 25,000,000 ETB

**Required Staff:**
- Professional coffee taster with certification
- Quality control personnel
- Warehouse manager

**Required Facilities:**
- Coffee warehouse (min 500 sqm)
- Quality control laboratory (optional but recommended)
- Cupping room with equipment
- Moisture meters, scales, grading equipment

**Required Documents:**
- Business license
- TIN certificate
- Bank account details
- Professional taster certificate
- Laboratory certification (if applicable)
- Warehouse lease/ownership documents

#### **Quick Actions**

**1. View Application Button (👁️)**
- Opens comprehensive application detail dialog

  **A. Company Information**
  ```tsx
  Application ID: APP-2026-001234
  Company Name: Yirgacheffe Coffee Growers
  TIN Number: TIN-1234567890
  Business License: BL-2026-5678
  Registration Date: 2026-01-15
  Exporter Type: Specialty Exporter
  ```

  **B. Financial Requirements**
  ```tsx
  Capital Requirement: 50,000,000 ETB
  Minimum Required: 50,000,000 ETB
  Status: ✅ Meets requirement
  ```

  **C. Professional Staff**
  ```tsx
  Professional Taster: Alemayehu Tesfaye
  Taster Certificate: Q-GRADER-ET-2024-1234
  Certificate Issued: 2024-03-15
  Certificate Expiry: 2027-03-15
  Status: ✅ Valid
  ```

  **D. Facilities**
  ```tsx
  Laboratory Facility: YES
  Laboratory Certificate: LAB-CERT-2025-789
  Certificate Status: ✅ Valid
  Warehouse: 800 sqm (owned)
  Cupping Room: Equipped
  Quality Equipment: Complete
  ```

  **E. Banking Details**
  ```tsx
  Bank Name: Commercial Bank of Ethiopia
  Account Number: 1000123456789
  Branch: Addis Ababa Main Branch
  Branch Code: CBE-AAM-001
  Account Status: ✅ Verified
  ```

  **F. Contact Information**
  ```tsx
  Contact Person: Desta Bekele
  Email: desta@yirgacheffecoffee.com
  Phone: +251-911-234567
  Address: Bole Road, Addis Ababa
  City: Addis Ababa
  Region: Addis Ababa
  ```

  **G. Submitted Documents**
  ```tsx
  [Document List]
  ✅ Business License (PDF, 2.3 MB)
  ✅ TIN Certificate (PDF, 1.1 MB)
  ✅ Taster Certificate (PDF, 1.8 MB)
  ✅ Laboratory Certificate (PDF, 2.0 MB)
  ✅ Warehouse Documents (PDF, 3.5 MB)
  ✅ Bank Confirmation Letter (PDF, 0.8 MB)
  
  [View] [Download All]
  ```

  **H. Actions in Dialog**
  ```tsx
  [Download Application] [Approve Application] 
  [Reject Application] [Request More Info]
  ```

**2. Approve Application Button (✅)**
- Available when: Status = PENDING
- Opens approval dialog

  **Approval Form Fields:**
  ```tsx
  Application ID: APP-2026-001234 (read-only)
  Company: Yirgacheffe Coffee Growers (read-only)
  
  Exporter ID: [Auto-generate: EXP1234567]
  Format: EXP + 7 digits
  
  ECTA License Number: [Generate]
  Format: ECTA-LIC-YYYY-NNN
  Example: ECTA-LIC-2026-123
  
  License Issue Date: [Date picker - defaults to today]
  License Expiry Date: [Date picker - defaults to +3 years]
  
  Bank Information:
  - Bank Name: [Dropdown or auto-fill from application]
  - Account Number: [From application]
  - Branch: [Dropdown - BankBranchSelect component]
  - Branch Code: [Auto-filled from branch selection]
  
  Notes: [Text area - Optional approval notes]
  
  [Cancel] [Approve & Issue License]
  ```

- **Submit** → Actions:
  1. Create database record (approved status)
  2. Register exporter on blockchain: `RegisterExporter`
  3. Generate ECTA license certificate (PDF)
  4. Send notification to applicant
  5. Create user account for exporter portal
  6. Update application status → APPROVED

- **Success Notification:**
  ```
  ✅ Exporter Approved Successfully
  
  Exporter ID: EXP1234567
  License: ECTA-LIC-2026-123
  Company: Yirgacheffe Coffee Growers
  Valid Until: 2029-07-07
  
  Certificate generated and emailed to applicant.
  Exporter can now login and start operations.
  ```

**3. Reject Application Button (❌)**
- Available when: Status = PENDING
- Opens rejection dialog

  **Rejection Form:**
  ```tsx
  Application ID: APP-2026-001234
  Company: Yirgacheffe Coffee Growers
  
  Rejection Reason: [Dropdown - Required]
  - Insufficient Capital
  - Invalid Taster Certificate
  - No Laboratory Facility
  - Incomplete Documents
  - Failed Background Check
  - Warehouse Not Suitable
  - Other (specify below)
  
  Details: [Text area - Required]
  Provide specific details about rejection reason
  and what applicant needs to do to reapply.
  
  Required Actions for Resubmission: [Text area]
  List specific actions applicant must take.
  
  [Cancel] [Reject Application]
  ```

- **Submit** → Actions:
  1. Update application status → REJECTED
  2. Record rejection reason
  3. Send detailed rejection notification to applicant
  4. Allow resubmission after addressing issues

---

### **Section 2: Registered Exporters**

**Purpose:** Manage active exporter licenses

#### **Exporter Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Exporter ID** | `exporterId` or `exporter_id` | Generated on approval | EXP1234567 |
| **Company** | `companyName` or `company_name` | From application | Yirgacheffe Coffee Growers |
| **License** | `ectaLicenseNumber` or `ecta_license_number` | Issued on approval | ECTA-LIC-2026-123 |
| **License Status** | `licenseStatus` | State | ACTIVE, SUSPENDED, REVOKED |
| **Expiry** | `licenseExpiryDate` or `license_expiry_date` | 3 years from issue | 2029-07-07 |
| **Lab Certified** | `laboratoryCertified` or `laboratory_certificate_number` | YES/NO | ✅ / ❌ |
| **Contracts** | Count from contracts | Calculated | 15 |
| **Total Export** | Sum from contracts | Calculated | 450,000 kg |
| **Actions** | - | - | 👁️ View \| ⏸️ Suspend \| 🔬 Lab |

#### **Quick Actions**

**1. View Exporter Details Button (👁️)**
- Shows complete exporter profile
- Performance metrics
- Contract history
- Inspection history
- Compliance record

**2. Suspend/Activate License Button (⏸️)**
- **Suspend:** Prevents new contracts/shipments
- **Reasons for Suspension:**
  - Quality violations
  - Contract breaches
  - Non-payment of fees
  - Expired certificates
  - Regulatory non-compliance
- **Activate:** Restore full privileges
- Requires confirmation and reason
- Blockchain update: `SuspendExporter` / `ActivateExporter`

**3. Update Laboratory Status Button (🔬)**
- Toggle laboratory certification
- Upload new lab certificate
- Update certificate expiry
- Blockchain update: `UpdateExporterLaboratory`

---

### **Section 3: Quality Inspections**

**Purpose:** Conduct coffee quality assessments for export approval

#### **Shipment Inspection Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Shipment ID** | `shipmentId` | From exporter | SHIP1783176028054 |
| **Exporter** | `exporterId` | Blockchain | EXP1234567 |
| **Contract** | `contractId` | Linked | CNT123456789 |
| **Coffee Type** | `coffeeType` | From contract | Arabica Yirgacheffe |
| **Quantity** | `quantity` | kg | 20,000 kg |
| **Transport** | `transportMode` | NEW | 🚢 SEA / ✈️ AIR |
| **Grade** | `grade` | From inspection | Grade 2 |
| **Status** | `inspectionStatus` | State | PENDING, APPROVED, FAILED |
| **Inspector** | `inspector` | Assigned | Name |
| **Inspection Date** | `inspectionDate` | Timestamp | 2026-07-07 |
| **Actions** | - | - | 🔬 Inspect \| 👁️ View \| 📄 Cert |

#### **Coffee Grading Standards**

**Grade Classification (Ethiopian Standards):**

| Grade | Cup Score | Defects (per 300g) | Moisture % | Description |
|-------|-----------|-------------------|------------|-------------|
| **Grade 1** | 85-100 | 0-3 | 10-12% | Specialty, zero defects |
| **Grade 2** | 80-84.75 | 4-12 | 10-12% | Premium quality |
| **Grade 3** | 75-79.75 | 13-25 | 10-12% | Good commercial |
| **Grade 4** | 70-74.75 | 26-45 | 10-12% | Standard commercial |
| **Grade 5** | 60-69.75 | 46-100 | 10-12% | Low grade |
| **UG (Undergrade)** | <60 | >100 | Any | Unacceptable |

**Quality Parameters:**
- **Cup Score:** Aroma, flavor, acidity, body, balance, aftertaste
- **Defects:** Primary (black beans, sour, fungus) and secondary (broken, insect damage)
- **Moisture Content:** 10-12% (critical for storage)
- **Screen Size:** Bean size distribution
- **Density:** Altitude indicator
- **Color:** Green, bluish-green (optimal)

#### **Quick Actions**

**1. Conduct Inspection Button (🔬)**
- Opens detailed inspection form

  **Section A: Basic Information**
  ```tsx
  Shipment ID: SHIP1783176028054
  Exporter: Yirgacheffe Coffee Growers (EXP1234567)
  Contract: CNT123456789
  Coffee Type: Arabica Yirgacheffe
  Quantity: 20,000 kg
  Origin: Gedeo Zone, Yirgacheffe
  
  Intended Transport: [NEW]
  [ ] Sea Freight (Bulk Commercial)
  [x] Air Freight (Premium Specialty)
  
  [Info Alert for Air Freight Selection]
  ✅ Air Freight Quality Standards: Premium specialty
  coffee. Ensure packaging meets airline cargo requirements
  and maintains freshness for rapid transit.
  ```

  **Section B: Physical Inspection**
  ```tsx
  Sample Size: [300g default]
  Screen Size Distribution:
  - Screen 18+: [___]%
  - Screen 17: [___]%
  - Screen 16: [___]%
  - Screen 15: [___]%
  - Screen 14-: [___]%
  
  Moisture Content: [___]% (target: 10-12%)
  Color: [Dropdown] Green / Bluish-Green / Yellow / Brown
  Bean Density: [___] g/ml
  ```

  **Section C: Defect Analysis**
  ```tsx
  Primary Defects (per 300g):
  - Full Black: [0]
  - Full Sour: [0]
  - Dried Cherry: [0]
  - Fungus Damage: [0]
  - Foreign Matter: [0]
  - Severe Insect: [0]
  Total Primary: [0] (Each counts as 1 full defect)
  
  Secondary Defects (per 300g):
  - Partial Black: [2]
  - Partial Sour: [1]
  - Parchment: [3]
  - Floater: [2]
  - Immature/Unripe: [1]
  - Withered: [0]
  - Shells: [2]
  - Broken/Cut: [4]
  - Insect Damage: [1]
  Total Secondary: [16] (5 count as 1 full defect)
  
  Total Defect Count: [3.2]
  ```

  **Section D: Cupping Score**
  ```tsx
  Cupping Evaluation (SCAA Method):
  - Fragrance/Aroma: [8.5] / 10
  - Flavor: [8.75] / 10
  - Aftertaste: [8.5] / 10
  - Acidity: [8.75] / 10
  - Body: [8.25] / 10
  - Balance: [8.5] / 10
  - Uniformity: [10] / 10
  - Clean Cup: [10] / 10
  - Sweetness: [10] / 10
  - Overall: [8.5] / 10
  
  Total Cup Score: [89.75] / 100
  
  Grade Calculation:
  Cup Score: 89.75 → Specialty Range
  Defects: 3.2 → Grade 1 Range (0-3)
  Moisture: 11.2% → ✅ Acceptable
  
  Recommended Grade: Grade 1 (Specialty)
  ```

  **Section E: Additional Notes**
  ```tsx
  Flavor Notes: [Text area]
  Floral, bergamot, citrus, honey sweetness, 
  clean bright acidity, medium body, long aftertaste
  
  Processing Method: Washed
  Harvest Season: 2025/2026
  Altitude: 1,900-2,200 masl
  
  Inspector Notes: [Text area]
  Excellent specialty grade coffee. Premium quality
  suitable for air freight export. No defects observed.
  Packaging meets international standards.
  
  Inspector Name: [Auto-filled from login]
  Inspection Date: [Auto-filled - today]
  ```

  **Section F: Decision**
  ```tsx
  Inspection Result: [Radio buttons - Required]
  ( ) APPROVED - Issue Quality Certificate
  ( ) APPROVED WITH CONDITIONS - Specify below
  ( ) REJECTED - State reasons below
  
  Conditions / Rejection Reasons: [Text area if applicable]
  
  [Cancel] [Submit Inspection]
  ```

- **Submit → APPROVED** → Actions:
  1. Update shipment: `inspectionStatus` → APPROVED
  2. Record grade, cup score, defects
  3. Generate quality certificate (PDF)
  4. Update shipment status → INSPECTION_APPROVED
  5. Notify exporter
  6. Allow export permit issuance
  7. Blockchain record: `RecordQualityInspection`

- **Submit → REJECTED** → Actions:
  1. Update shipment: `inspectionStatus` → FAILED
  2. Block export permit issuance
  3. Notify exporter with detailed reasons
  4. Require re-inspection after addressing issues

**2. View Inspection Results Button (👁️)**
- Shows complete inspection report
- Grade, cup score, defects breakdown
- Cupping notes
- Inspector details
- Certificate status

**3. Issue Certificate Button (📄)**
- Available when: Inspection APPROVED
- Generates official quality certificate
- Includes:
  - Certificate number (QC-2026-001234)
  - Shipment details
  - Grade and cup score
  - Defect analysis
  - Moisture content
  - Inspector signature
  - ECTA stamp (digital)
  - QR code for verification
  - Blockchain hash
- Download as PDF
- Blockchain record: `IssueQualityCertificate`

---

### **Section 4: Analytics & Reports**

**Charts:**

**1. Monthly Inspection Volume (Line Chart)**
```tsx
Data: Count of inspections per month
X-axis: Last 12 months
Y-axis: Inspection count
Shows: Seasonal trends
```

**2. Grade Distribution (Pie Chart)**
```tsx
Data: Count of shipments by grade
Segments: Grade 1, 2, 3, 4, 5, UG
Shows: Quality profile of Ethiopian coffee exports
Target: 60%+ Grade 1-2
```

**3. Average Cup Score Trend (Line Chart)**
```tsx
Data: Average cup score per month
X-axis: Last 12 months
Y-axis: Cup score (60-100)
Shows: Quality improvement over time
Target: >85 for specialty
```

**4. Pass/Fail Rate (Bar Chart)**
```tsx
Data: Approved vs Rejected inspections
X-axis: Months
Y-axis: Percentage
Shows: Quality consistency
Target: >95% pass rate
```

**5. Transport Mode by Grade (NEW)**
```tsx
Table showing:
Grade    Sea Freight    Air Freight
1        150 (30%)      350 (70%)    ← Premium via air
2        400 (80%)      100 (20%)
3        500 (95%)       25 (5%)
4-5      200 (98%)       10 (2%)

Insight: Grade 1 specialty coffee predominantly 
shipped via air freight for freshness and speed.
```

**6. Exporter Performance**
```tsx
Table: Top exporters by volume, grade, compliance
Columns: Exporter, Inspections, Avg Grade, Pass Rate
Sorting: By performance metrics
```

**Reports:**

**1. Monthly Quality Report**
- Total inspections
- Grade distribution
- Average cup score
- Defect trends
- Pass/fail rate
- Export: PDF or Excel

**2. Exporter Performance Report**
- Selected exporter
- Total inspections
- Average grade
- Cup score trend
- Compliance issues
- Export: PDF

**3. Quarterly Compliance Report**
- License renewals
- Suspended exporters
- Quality violations
- Corrective actions
- Export: PDF for ECTA management

---

## ✅ COMPLETION CHECKLIST

### **Core Functions**
- [x] Review exporter applications
- [x] Approve/reject applications
- [x] Issue ECTA licenses
- [x] Manage exporter licenses (suspend/activate)
- [x] Conduct quality inspections
- [x] Issue quality certificates
- [x] Update laboratory certifications
- [x] Generate compliance reports

### **Data Display**
- [x] Applications grid
- [x] Exporters grid
- [x] Inspections grid
- [x] Analytics charts

### **Quick Actions**
- [x] View application details
- [x] Approve with license generation
- [x] Reject with detailed reasons
- [x] Conduct inspection with full form
- [x] Issue quality certificate
- [x] Suspend/activate licenses

### **AWB Integration (PENDING)**
- [ ] Display intended transport in applications
- [ ] Show transport mode in inspections
- [ ] Add air freight quality standards alert
- [ ] Update analytics with transport mode breakdown
- [ ] Include transport method in quality certificates

---

**Last Updated:** July 7, 2026  
**Status:** ✅ OPERATIONAL | ⏳ AWB DISPLAY PENDING  
**Version:** 1.0

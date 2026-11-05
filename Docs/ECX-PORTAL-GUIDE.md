# ECX Portal - Complete Guide

## 📋 EXECUTIVE SUMMARY

**Status:** ✅ FULLY OPERATIONAL  
**Purpose:** Ethiopia Commodity Exchange manages coffee warehouse receipts, grading, and lot assignment  
**Users:** ECX officials, warehouse managers, graders  

### Quick Stats
- **Dashboard KPIs:** 6 warehouse and trading metrics
- **Main Workflow:** 4-step lot processing (Intake → Grade → Assign → Release)
- **Quick Actions:** Issue receipts, Assign grades, Link contracts, Release lots
- **Data Grids:** Coffee lots, Warehouses, Price trends
- **Integration:** Works with ECX channel in exporter shipments

### Core Functions
1. ✅ **Warehouse Intake** - Issue warehouse receipts for delivered coffee
2. ✅ **Quality Grading** - Assign ECX grades based on inspection
3. ✅ **Lot Assignment** - Link lots to export contracts
4. ✅ **Lot Release** - Release coffee for export after clearance
5. ✅ **Price Discovery** - Monitor ECX trading prices
6. ✅ **Warehouse Management** - Track certified warehouses

---

## 📊 DASHBOARD STATISTICS (Live Data)

| KPI | Data Source | Icon | Calculation |
|-----|-------------|------|-------------|
| **Warehoused Lots** | `lots.filter(l => l.status === 'WAREHOUSED')` | 🏭 | Count awaiting grading |
| **Graded Lots** | `lots.filter(l => l.status === 'GRADED')` | ✅ | Count ready for assignment |
| **Assigned Lots** | `lots.filter(l => l.status === 'ASSIGNED')` | 📋 | Count linked to contracts |
| **Released Lots** | `lots.filter(l => l.status === 'RELEASED')` | 🚚 | Count released for export |
| **Total Volume** | `sum(lots.quantity)` | ⚖️ | Total kg in ECX system |
| **Avg Price** | `avg(lots.pricePerKg)` | 💰 | Average USD per kg |

---

## 🎯 ECX WORKFLOW (4 STEPS)

### **Overview of ECX Process**

```
Step 1: WAREHOUSE INTAKE
├─ Exporter delivers coffee to ECX warehouse
├─ ECX issues warehouse receipt
├─ Status: WAREHOUSED
└─ ECX Lot Number assigned (e.g., ECX-YIR-2026-1234)

     ↓

Step 2: QUALITY GRADING
├─ ECX grader inspects sample
├─ Assigns grade (1-5) based on defects, moisture, cup score
├─ Status: GRADED
└─ Exporter notified of grade

     ↓

Step 3: LOT ASSIGNMENT
├─ Exporter links lot to NBE-approved sales contract
├─ Records contract price
├─ Status: ASSIGNED
└─ Lot reserved for that contract

     ↓

Step 4: LOT RELEASE
├─ After customs clearance and shipping booking
├─ ECX releases lot to exporter
├─ Status: RELEASED
└─ Coffee can be loaded for export
```

---

## 📦 SECTION 1: WAREHOUSE INTAKE

**Purpose:** Register coffee delivery and issue warehouse receipt

#### **Coffee Lot Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Lot ID** | `lotId` | Generated | LOT-001234 |
| **ECX Number** | `ecxLotNumber` | Generated | ECX-YIR-2026-1234 |
| **Exporter** | `exporterId` / `exporterName` | From intake | EXP1234567 / Company Name |
| **Origin** | `origin` | From intake | Yirgacheffe, Sidama, Harar |
| **Sub-Region** | `subRegion` | From intake | Gedeo Zone, Wonago |
| **Quantity** | `quantity` | kg | 20,000 kg |
| **Bags** | `bags` | Calculated or input | 333 bags (60kg each) |
| **Processing** | `processingMethod` | From intake | Washed, Natural, Honey |
| **Season** | `harvestSeason` | From intake | 2025/2026 |
| **Grade** | `grade` | After grading | Grade 1-5 |
| **Warehouse** | `warehouseId` | From intake | WH-ADDIS-01, WH-DJIBOUTI-02 |
| **Status** | `status` | State | WAREHOUSED, GRADED, ASSIGNED, RELEASED |
| **Receipt Date** | `warehouseReceiptDate` | Timestamp | 2026-07-07 |
| **Actions** | - | - | 👁️ View \| 📊 Grade \| 🔗 Assign \| 🚚 Release |

#### **ECX-Certified Warehouses**
- **WH-ADDIS-01:** Addis Ababa Main (capacity: 5,000 tons)
- **WH-DJIBOUTI-02:** Djibouti Port (capacity: 3,000 tons)
- **WH-DIRE-03:** Dire Dawa (capacity: 2,500 tons)
- **WH-JIMMA-04:** Jimma (capacity: 2,000 tons)

#### **Quick Actions**

**1. Issue Warehouse Receipt Button (➕)**
- Opens intake form dialog

  **Intake Form:**
  ```tsx
  Exporter Information:
  - Exporter ID: [Input] EXP1234567
  - Exporter Name: [Input] Yirgacheffe Coffee Growers
  
  Coffee Details:
  - Origin: [Dropdown - Required]
    * Yirgacheffe (Gedeo Zone)
    * Sidama (Sidama Zone)
    * Harar (East Hararghe)
    * Guji (Guji Zone)
    * Limu (Jimma Zone)
    * Kaffa (Kaffa Zone)
    * Other (specify)
  
  - Sub-Region: [Input] Gedeo Zone, Wonago Woreda
  
  - Processing Method: [Dropdown - Required]
    * Washed (Wet-processed)
    * Natural (Dry-processed)
    * Honey (Semi-washed)
    * Pulped Natural
  
  - Harvest Season: [Dropdown]
    Default: 2025/2026
    * 2024/2025
    * 2025/2026 (current)
    * 2026/2027
  
  Quantity:
  - Quantity (kg): [Input - Required] 20000
  - Number of Bags: [Input or Auto-calc] 333
    (Auto-calculated: quantity / 60 kg per bag)
  
  Warehouse:
  - Warehouse: [Dropdown - Required]
    * WH-ADDIS-01 (Addis Ababa Main)
    * WH-DJIBOUTI-02 (Djibouti Port)
    * WH-DIRE-03 (Dire Dawa)
    * WH-JIMMA-04 (Jimma)
  
  ECX Lot Number: [Auto-generated on submit]
  Format: ECX-{ORIGIN}-{YEAR}-{SEQUENCE}
  Example: ECX-YIR-2026-1234
  
  [Cancel] [Issue Warehouse Receipt]
  ```

- **Submit** → Actions:
  1. Generate ECX lot number
  2. Create lot record with status = WAREHOUSED
  3. Issue warehouse receipt certificate (PDF)
  4. Blockchain update: `CreateECXLot`
  5. Notify exporter
  6. Schedule grading inspection (within 2 working days)

- **Success:**
  ```
  ✅ Warehouse Receipt Issued
  
  ECX Lot: ECX-YIR-2026-1234
  Exporter: Yirgacheffe Coffee Growers
  Quantity: 20,000 kg (333 bags)
  Warehouse: WH-ADDIS-01
  
  Next Step: ECX grader will inspect and assign
  grade within 2 working days.
  
  [Download Receipt]
  ```

---

## 🔬 SECTION 2: QUALITY GRADING

**Purpose:** ECX grader inspects coffee and assigns official grade

#### **Grading Standards (Same as ECTA)**

| Grade | Defects (per 300g) | Moisture % | Cup Score | Use |
|-------|-------------------|------------|-----------|-----|
| **Grade 1** | 0-3 | ≤12% | 85-100 | Specialty export |
| **Grade 2** | 4-12 | ≤12% | 80-84.75 | Premium export |
| **Grade 3** | 13-25 | ≤12% | 75-79.75 | Good commercial |
| **Grade 4** | 26-45 | ≤12% | 70-74.75 | Standard commercial |
| **Grade 5** | 46-100 | ≤12% | 60-69.75 | Low grade |
| **UG** | >100 or >12% moisture | Any | Any | Unacceptable |

**Critical Requirement:** Moisture content must be ≤12% for export eligibility

#### **Quick Actions**

**1. Assign Grade Button (📊)**
- Available when: Status = WAREHOUSED
- Opens grading form dialog

  **Grading Form:**
  ```tsx
  Lot Information:
  ECX Lot: ECX-YIR-2026-1234
  Exporter: Yirgacheffe Coffee Growers
  Origin: Yirgacheffe (Gedeo Zone)
  Quantity: 20,000 kg
  Processing: Washed
  
  Physical Analysis:
  - Defect Count (per 300g): [Input - Required]
    Primary defects × 1 + Secondary defects × 0.2
    Example: 2 primary + 10 secondary = 4 total
  
  - Moisture Content (%): [Input - Required]
    Must be ≤12% for export
    Example: 11.2
    
    [VALIDATION]
    If >12%: Show error, prevent submission
    "Moisture exceeds 12% maximum. Lot rejected
    for export. Exporter must re-dry and resubmit."
  
  Cupping Evaluation:
  - Cup Score (SCAA): [Input - Required]
    0-100 scale
    Example: 89.75
  
  Grade Assignment:
  - Grade: [Dropdown - Required]
    Based on defects and cup score:
    * Grade 1 (Specialty)
    * Grade 2 (Premium)
    * Grade 3 (Good Commercial)
    * Grade 4 (Standard)
    * Grade 5 (Low Grade)
    * UG (Undergrade - Rejected)
  
  Grading Officer:
  - Officer Name: [Auto-filled from login]
  - Grading Date: [Auto-filled - today]
  
  Remarks: [Text area - Optional]
  Excellent specialty grade. Clean cup, bright
  acidity, floral notes. Suitable for premium
  export markets.
  
  [Cancel] [Assign Grade]
  ```

- **Submit → If Moisture >12%** → REJECT:
  ```
  ❌ Grading Rejected
  
  Moisture Content: 13.5% exceeds 12% maximum.
  
  Lot ECX-YIR-2026-1234 cannot be exported.
  
  Action Required: Exporter must re-dry coffee
  and resubmit for grading.
  ```

- **Submit → If Valid** → Actions:
  1. Update lot with grade, cup score, defects, moisture
  2. Update status → GRADED
  3. Blockchain update: `GradeECXLot`
  4. Notify exporter with grade results
  5. Allow lot assignment to contracts

- **Success:**
  ```
  ✅ Grade Assigned
  
  ECX Lot: ECX-YIR-2026-1234
  Grade: Grade 1 (Specialty)
  Cup Score: 89.75
  Defects: 3 (per 300g)
  Moisture: 11.2%
  
  Exporter can now assign this lot to a
  sales contract for export.
  ```

---

## 🔗 SECTION 3: LOT ASSIGNMENT

**Purpose:** Link ECX lot to NBE-approved sales contract

#### **Quick Actions**

**1. Assign to Contract Button (🔗)**
- Available when: Status = GRADED
- Opens assignment dialog

  **Assignment Form:**
  ```tsx
  Lot Information:
  ECX Lot: ECX-YIR-2026-1234
  Grade: Grade 1 (Specialty)
  Quantity: 20,000 kg
  Origin: Yirgacheffe
  
  Contract Details:
  - Contract ID: [Input - Required]
    Example: CNT123456789
    
    [VALIDATION]
    Contract must exist in blockchain
    Contract must be NBE-approved
    Contract quantity must match or exceed lot quantity
  
  - Price per kg (USD): [Input - Required]
    Contract price or agreed price
    Example: 7.50
  
  Assignment Officer: [Auto-filled from login]
  Assignment Date: [Auto-filled - today]
  
  [Cancel] [Assign Lot to Contract]
  ```

- **Submit** → Actions:
  1. Verify contract exists and is NBE-approved
  2. Link lot to contract
  3. Record price
  4. Update status → ASSIGNED
  5. Reserve lot for that contract
  6. Blockchain update: `AssignECXLot`
  7. Notify exporter

- **Success:**
  ```
  ✅ Lot Assigned to Contract
  
  ECX Lot: ECX-YIR-2026-1234
  Contract: CNT123456789
  Price: $7.50 per kg
  Total Value: $150,000
  
  Lot is now reserved for this contract.
  Exporter can register shipment using ECX channel.
  
  ECX will release lot after customs clearance.
  ```

---

## 🚚 SECTION 4: LOT RELEASE

**Purpose:** Release coffee from ECX warehouse for export

#### **Quick Actions**

**1. Release Lot Button (🚚)**
- Available when: Status = ASSIGNED and customs cleared
- Opens release confirmation dialog

  **Release Form:**
  ```tsx
  Lot Information:
  ECX Lot: ECX-YIR-2026-1234
  Contract: CNT123456789
  Exporter: Yirgacheffe Coffee Growers
  Quantity: 20,000 kg
  Destination: Germany
  
  Release Verification:
  [✓] Customs clearance received
  [✓] Export permit issued
  [✓] Shipping booking confirmed
  [✓] Payment guarantee (if applicable)
  
  Release to:
  - Warehouse: WH-ADDIS-01
  - Loading Date: [Date picker]
  - Transporter: [Input]
  - Vehicle/Container: [Input]
  
  Release Officer: [Auto-filled]
  Release Date: [Auto-filled - today]
  
  Notes: [Text area]
  Released for loading to container CONT123456789
  for shipment on Maersk Eindhoven, voyage V2026W28,
  departing July 15, 2026.
  
  [Cancel] [Release Lot]
  ```

- **Submit** → Actions:
  1. Update status → RELEASED
  2. Record release date and details
  3. Allow coffee to be loaded for export
  4. Blockchain update: `ReleaseECXLot`
  5. Notify exporter
  6. Update warehouse inventory

- **Success:**
  ```
  ✅ Lot Released for Export
  
  ECX Lot: ECX-YIR-2026-1234
  Released to: Yirgacheffe Coffee Growers
  Quantity: 20,000 kg
  
  Coffee cleared for loading and export.
  Warehouse gate pass issued.
  ```

---

## 📊 SECTION 5: ANALYTICS & PRICE TRENDS

**Charts:**

**1. Monthly Trading Volume (Bar Chart)**
```tsx
Data: Total kg traded per month (last 12 months)
X-axis: Months
Y-axis: Tons
Shows: Seasonal trading patterns
Peak: Post-harvest (Nov-Feb)
```

**2. Price Trends by Origin (Line Chart)**
```tsx
Data: Average price per kg by origin (last 6 months)
Lines: Yirgacheffe, Sidama, Harar, Guji, Jimma
X-axis: Months
Y-axis: USD per kg
Shows: Yirgacheffe consistently highest ($9-9.50)
```

**3. Grade Distribution (Pie Chart)**
```tsx
Data: Count of lots by grade
Segments: Grade 1 (40%), Grade 2 (35%), Grade 3 (15%), Grade 4-5 (10%)
Shows: Ethiopia produces majority Grade 1-2
Target: Increase Grade 1 percentage
```

**4. Warehouse Utilization (Bar Chart)**
```tsx
Data: Current capacity usage per warehouse
X-axis: Warehouses
Y-axis: Percentage
Shows: WH-ADDIS-01 at 78% capacity
Alert: If >90%, need expansion
```

**5. Processing Method Distribution**
```tsx
Data: Washed vs Natural vs Honey
Pie Chart: Washed (65%), Natural (30%), Honey (5%)
Shows: Washed dominates specialty market
Trend: Natural increasing for unique flavors
```

---

## 🔔 NOTIFICATIONS

### **ECX Receives**
```tsx
📧 New Warehouse Delivery: ECX-YIR-2026-1234
   Exporter: Yirgacheffe Coffee | 20,000 kg
   [Schedule Grading]

📧 Customs Clearance Received: ECX-YIR-2026-1234
   Contract: CNT123456789
   [Release Lot for Export]
```

### **Exporter Receives**
```tsx
✅ Warehouse Receipt Issued: ECX-YIR-2026-1234
   Warehouse: WH-ADDIS-01 | 20,000 kg
   Grading scheduled within 2 days
   [View Receipt]

✅ Grade Assigned: ECX-YIR-2026-1234
   Grade: Grade 1 (Specialty) | Score: 89.75
   You can now assign to sales contract
   [View Grade Certificate]

✅ Lot Released: ECX-YIR-2026-1234
   Released for export loading
   [Download Gate Pass]
```

---

## 📌 ECX INTEGRATION WITH EXPORTER PORTAL

When exporters create shipments in Exporter Portal:

**Channel Selection:**
```tsx
Channel: [Dropdown]
- Direct Export (no ECX)
- ECX (requires ECX lot number)
- Union (requires approval reference)
```

**If ECX Channel Selected:**
```tsx
ECX Lot Number: [Input - Required]
Example: ECX-YIR-2026-1234

[VALIDATION]
- Lot must exist in ECX system
- Lot must be GRADED or ASSIGNED status
- Lot quantity must match shipment quantity
- Lot must not be already used in another shipment
```

**Result:**
- Shipment automatically linked to ECX lot
- ECX lot status updated → ASSIGNED (if graded)
- After customs clearance → ECX releases lot
- Exporter can load for export

---

## ✅ COMPLETION CHECKLIST

### **Core Functions**
- [x] Issue warehouse receipts
- [x] Assign ECX grades
- [x] Link lots to contracts
- [x] Release lots for export
- [x] Track warehouse inventory
- [x] Monitor price trends

### **Data Display**
- [x] Lots grid with 4-stage workflow
- [x] Warehouse capacity tracking
- [x] Price trends by origin
- [x] Grade distribution analytics

### **Quick Actions**
- [x] Issue warehouse receipt (with validation)
- [x] Assign grade (with moisture check)
- [x] Assign to contract (with verification)
- [x] Release lot (with clearance check)

### **AWB Integration**
- **N/A** - ECX operates pre-export
- Transport mode determined after ECX process
- No direct AWB impact on ECX workflows

---

**Last Updated:** July 7, 2026  
**Status:** ✅ OPERATIONAL | No AWB changes needed  
**Version:** 1.0

---

## 📝 NOTE

ECX Portal operates **before** transport decisions are made. The 4-step process (Intake → Grade → Assign → Release) happens at the warehouse stage, prior to shipping arrangements. Transport mode (sea/air) is determined later during shipping booking in the Exporter Portal or Shipping Portal.

Therefore, **no AWB integration is required for ECX Portal**.

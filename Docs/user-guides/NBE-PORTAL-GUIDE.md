# NBE Portal - Complete Guide

## 📋 EXECUTIVE SUMMARY

**Status:** ✅ FULLY OPERATIONAL  
**Purpose:** National Bank of Ethiopia manages forex allocation and export contract approval  
**Users:** NBE officials, forex management officers  

### Quick Stats
- **Dashboard KPIs:** 8 forex and export metrics
- **Main Sections:** Contract Approval, Forex Allocation, Exchange Rates, Analytics
- **Quick Actions:** Approve contracts, Allocate forex, Set rates
- **Data Grids:** Contracts, Forex requests, Exchange rates
- **Retention Policy:** 40-100% forex retention per NBE Directive FXD/01/2024

### Core Functions
1. ✅ **Contract Approval** - Approve export contracts for forex eligibility
2. ✅ **Forex Allocation** - Allocate foreign exchange to exporters
3. ✅ **Exchange Rates** - Set and manage official exchange rates
4. ✅ **Retention Management** - Monitor forex retention compliance
5. ✅ **Compliance Monitoring** - Track export proceeds repatriation
6. ✅ **Analytics** - Export and forex statistics

---

## 📊 DASHBOARD STATISTICS (Live Data)

| KPI | Data Source | Icon | Calculation |
|-----|-------------|------|-------------|
| **Pending Contracts** | `contracts.filter(c => c.status === 'REGISTERED')` | 📋 | Count awaiting NBE approval |
| **Approved Contracts** | `contracts.filter(c => c.status === 'NBE_APPROVED')` | ✅ | Count approved for forex |
| **Total Export Value** | `sum(contracts.totalValue)` | 💰 | Total contract value (USD) |
| **Forex Allocated** | `sum(forexAllocations.allocatedAmount)` | 💱 | Total forex allocated |
| **Pending Forex** | `forexAllocations.filter(f => f.status === 'REQUESTED')` | ⏳ | Count awaiting allocation |
| **Retention Amount** | `sum(payments.retainedAmount)` | 🏦 | Total USD retained |
| **Avg Processing Time** | `avg(approvalDate - registrationDate)` | ⏱️ | Days from registration to approval |
| **Compliance Rate** | `(compliant / total) * 100` | 📊 | % meeting retention requirements |

---

## 🎯 MAIN SECTIONS

### **Section 1: Contract Approval**

**Purpose:** Review and approve export contracts for forex allocation eligibility

#### **Contract Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Contract ID** | `contractId` | Blockchain | CNT123456789 |
| **NBE Reference** | `nbeReferenceNumber` | Generated on approval | NBE-2026-001234 |
| **Exporter** | `exporterId` | From contract | EXP1234567 |
| **Buyer** | `buyerName` | From contract | German Coffee Importers GmbH |
| **Country** | `buyerCountry` | From contract | Germany |
| **Coffee Type** | `coffeeType` | From contract | Arabica Yirgacheffe |
| **Quantity** | `quantity` | kg | 20,000 kg |
| **Value** | `totalValue` | USD | $150,000 |
| **Currency** | `currency` | From contract | USD, EUR, GBP |
| **Transport** | `transportMode` | NEW | 🚢 SEA / ✈️ AIR |
| **Status** | `contractStatus` | State | REGISTERED, NBE_APPROVED, ACTIVE |
| **Registered** | `registrationDate` | Timestamp | 2026-07-07 |
| **Actions** | - | - | 👁️ View \| ✅ Approve |

#### **Contract Approval Criteria**

**Eligibility Requirements:**
- Valid ECTA license
- Registered exporter (EXP ID)
- Complete contract documentation
- Valid buyer information
- Realistic pricing (market rate check)
- No outstanding compliance issues
- No export ban for buyer country

**Documentation Required:**
- Sales contract
- Proforma invoice
- Buyer letter of intent
- ECTA license (valid)
- Bank details

#### **Quick Actions**

**1. View Contract Button (👁️)**
- Opens contract detail dialog

  **A. Contract Information**
  ```tsx
  Contract ID: CNT123456789
  NBE Status: PENDING APPROVAL
  Registration Date: 2026-07-07 10:30
  
  Exporter: Yirgacheffe Coffee Growers (EXP1234567)
  ECTA License: ECTA-LIC-2026-123
  License Status: ✅ ACTIVE (Expires: 2029-07-07)
  ```

  **B. Buyer Information**
  ```tsx
  Buyer: German Coffee Importers GmbH
  Country: Germany (✅ No export restrictions)
  Buyer Bank: Deutsche Bank, Frankfurt
  Contact: buyer@german-coffee.de
  ```

  **C. Coffee Details**
  ```tsx
  Coffee Type: Arabica Yirgacheffe Grade 2
  Quantity: 20,000 kg
  Price per kg: $7.50 USD
  Total Value: $150,000 USD
  Currency: USD
  Incoterm: FOB Djibouti
  ```

  **D. Transport & Timeline (NEW)**
  ```tsx
  Intended Transport: [✈️ Air Freight]
  
  Expected Timeline:
  ├─ Contract Approval:      Today (pending)
  ├─ Forex Allocation:       +2 days
  ├─ Quality Inspection:     +5 days
  ├─ Customs Clearance:      +6 days
  ├─ Shipment Departure:     +8 days
  ├─ Arrival (Air):          +9 days (vs +38 for sea)
  └─ Payment Receipt:        +12 days
  
  [Info Alert]
  ✅ Faster Forex Realization: Air freight enables
  rapid export completion and payment receipt,
  improving forex retention timeline (12 days vs
  45 days for sea freight).
  
  Exporter Liquidity: Significantly improved
  Cash Flow: 3.75x faster
  ```

  **E. Banking & Forex**
  ```tsx
  Exporter Bank: Commercial Bank of Ethiopia
  Account: 1000123456789
  SWIFT: CBETETAAAA
  
  Requested Forex: $150,000 USD
  Estimated Retention (40%): $60,000 USD
  ETB Equivalent (@ 115.50): 17,325,000 ETB
  ```

  **F. Compliance Checks**
  ```tsx
  Exporter History:
  - Previous Contracts: 15
  - Compliance Rate: 100%
  - Outstanding Issues: None
  - Suspended: No
  
  Price Verification:
  - Market Price Range: $7.00 - $8.50/kg
  - Contract Price: $7.50/kg ✅ Within range
  - Variance: 0% (acceptable)
  
  Destination Check:
  - Country: Germany ✅ No restrictions
  - Trade Agreement: EU-Ethiopia partnership
  - Sanctions: None
  
  Risk Assessment: LOW RISK
  ```

  **G. Actions in Dialog**
  ```tsx
  [Download Contract] [View Documents] 
  [Approve for Forex] [Request More Info] [Reject]
  ```

**2. Approve Contract Button (✅)**
- Available when: Status = REGISTERED
- Opens approval confirmation dialog

  **Approval Form:**
  ```tsx
  Contract ID: CNT123456789
  Exporter: Yirgacheffe Coffee Growers
  Value: $150,000 USD
  
  NBE Reference Number: [Auto-generate]
  Format: NBE-YYYY-NNNNNN
  Example: NBE-2026-001234
  
  Approval Officer: [Auto-filled from login]
  Approval Date: [Today - auto-filled]
  
  Forex Eligibility:
  [x] Eligible for forex allocation
  Allocation Priority: [ ] High [x] Normal [ ] Low
  
  Retention Rate: [Dropdown]
  - 40% (Standard - Commercial coffee)
  - 60% (Enhanced - Specialty coffee)
  - 80% (Premium - High-value specialty)
  - 100% (Maximum - Direct EU/USA specialty)
  
  Recommended: 100% (Grade 1 specialty, air freight)
  
  Approval Notes: [Text area - Optional]
  Approved for 100% retention due to premium
  specialty grade and air freight to Germany.
  Expected fast payment realization.
  
  [Cancel] [Approve Contract]
  ```

- **Submit** → Actions:
  1. Update contract status → NBE_APPROVED
  2. Generate NBE reference number
  3. Record approval timestamp and officer
  4. Create forex allocation request
  5. Blockchain update: `ApproveContractForForex`
  6. Notify exporter (contract approved, forex processing)
  7. Notify exporter's bank

- **Success Notification:**
  ```
  ✅ Contract Approved for Forex Allocation
  
  Contract: CNT123456789
  NBE Reference: NBE-2026-001234
  Exporter: Yirgacheffe Coffee Growers
  Value: $150,000 USD
  Retention: 100%
  
  Forex allocation request created automatically.
  Exporter notified of approval.
  ```

---

### **Section 2: Forex Allocation**

**Purpose:** Allocate foreign exchange to approved export contracts

#### **Forex Request Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Forex ID** | `forexId` | Generated | FX-2026-001234 |
| **Contract ID** | `contractId` | Linked | CNT123456789 |
| **NBE Ref** | `nbeReferenceNumber` | From contract | NBE-2026-001234 |
| **Exporter** | `exporterId` | From contract | EXP1234567 |
| **Requested** | `requestedAmount` | Contract value | $150,000 |
| **Allocated** | `allocatedAmount` | NBE decision | $150,000 |
| **Currency** | `currency` | From contract | USD |
| **Rate** | `exchangeRate` | NBE official rate | 115.50 ETB/USD |
| **Retention** | `retentionRate` | NBE policy | 100% |
| **Retained** | Calculated | `allocated × retention` | $150,000 |
| **Transport** | `transportMode` | NEW | 🚢 / ✈️ |
| **Timeline** | Calculated | NEW | 45 days / 12 days |
| **Status** | `status` | State | REQUESTED, ALLOCATED, UTILIZED |
| **Expiry** | `expiryDate` | 180 days from allocation | 2027-01-03 |
| **Actions** | - | - | 👁️ View \| 💱 Allocate |

#### **Forex Retention Policy (NBE FXD/01/2024)**

| Export Type | Retention Rate | ETB Conversion | Exporter Keeps |
|-------------|----------------|----------------|----------------|
| **Standard Commercial** | 40% | At official rate | 40% in ETB, 60% can use for imports |
| **Specialty Coffee** | 60-80% | At official rate | Higher retention for premium |
| **Direct EU/USA Specialty** | 100% | At official rate | Full retention, premium market |
| **Air Freight Premium** | 100% | At official rate | Fast payment + full retention |

**Retention Benefits:**
- Converted to ETB at official rate (better than parallel market)
- Immediate credit to exporter's ETB account
- Supports import needs (remaining %)
- Builds national forex reserves

#### **Quick Actions**

**1. View Forex Request Button (👁️)**
- Shows complete forex allocation details
- Contract info
- Allocation history
- Utilization tracking
- Expiry countdown

**2. Allocate Forex Button (💱)**
- Available when: Status = REQUESTED
- Opens allocation dialog

  **Allocation Form:**
  ```tsx
  Forex ID: FX-2026-001234
  Contract: CNT123456789 (NBE-2026-001234)
  Exporter: Yirgacheffe Coffee Growers
  
  Requested Amount: $150,000 USD
  
  Allocated Amount: [Input field]
  Default: $150,000 (100% of request)
  Can reduce if partial allocation
  
  Exchange Rate: [Input field]
  Current Official Rate: 115.50 ETB/USD
  (Auto-filled, can adjust)
  
  Retention Rate: [Dropdown]
  [x] 100% - Premium specialty, air freight
  [ ] 80% - High-value specialty
  [ ] 60% - Specialty coffee
  [ ] 40% - Standard commercial
  
  Calculation Summary:
  ─────────────────────────────────────────
  Allocated Amount:      $150,000.00 USD
  Exchange Rate:         115.50 ETB/USD
  Gross ETB Value:       17,325,000.00 ETB
  
  Retention (100%):      $150,000.00 USD
  Retained in ETB:       17,325,000.00 ETB
  
  For Imports (0%):      $0.00 USD
  
  Exporter Receives:     17,325,000.00 ETB
  (Full conversion at official rate)
  
  Transport Impact Analysis (NEW):
  ─────────────────────────────────────────
  Transport Mode: Air Freight ✈️
  
  Expected Payment Timeline:
  - Shipment:         +8 days from approval
  - Arrival:          +9 days (air)
  - Documents:        +11 days
  - Payment:          +12 days
  - Forex Realized:   +12 days ✅
  
  vs Sea Freight (hypothetical):
  - Shipment:         +10 days
  - Arrival:          +45 days (sea)
  - Documents:        +47 days
  - Payment:          +50 days
  - Forex Realized:   +50 days
  
  Benefit: 38 days faster (3.2x improvement)
  Impact: Improved exporter liquidity,
          faster forex for national reserves
  
  Expiry Date: [Date picker]
  Default: +180 days (6 months)
  Recommended: 2027-01-03
  
  NBE Officer: [Auto-filled from login]
  NBE Approval Ref: [Auto-generated]
  Format: NBE-FX-2026-NNNNNN
  
  Allocation Notes: [Text area - Optional]
  Premium specialty grade, air freight to Germany.
  100% retention approved due to fast payment
  realization and high-value export.
  
  [Cancel] [Allocate Forex]
  ```

- **Submit** → Actions:
  1. Update forex status → ALLOCATED
  2. Record allocation amount, rate, retention
  3. Generate allocation certificate
  4. Set expiry date (180 days)
  5. Blockchain update: `AllocateForex`
  6. Notify exporter
  7. Notify exporter's bank
  8. Create forex tracking record

- **Success Notification:**
  ```
  ✅ Forex Allocated Successfully
  
  Forex ID: FX-2026-001234
  Contract: CNT123456789
  Exporter: Yirgacheffe Coffee Growers
  
  Allocated: $150,000 USD
  Rate: 115.50 ETB/USD
  Retention: 100%
  ETB Value: 17,325,000 ETB
  
  Valid Until: 2027-01-03 (180 days)
  
  Exporter and bank notified.
  Allocation certificate generated.
  ```

---

### **Section 3: Exchange Rates**

**Purpose:** Set and manage official exchange rates for forex conversion

#### **Exchange Rate Data Grid**
| Column | Field | Display |
|--------|-------|---------|
| **Rate ID** | `rateId` | RATE-2026-070401 |
| **Currency** | `currency` | USD, EUR, GBP, CNY |
| **Buying Rate** | `buyingRate` | 115.00 ETB |
| **Selling Rate** | `sellingRate` | 116.00 ETB |
| **Mid Rate** | `midRate` | 115.50 ETB |
| **Effective Date** | `effectiveDate` | 2026-07-04 |
| **Status** | `status` | ACTIVE, SUPERSEDED |
| **Actions** | - | 👁️ View \| ✏️ Update |

#### **Current Official Rates (Example)**
- **USD:** 115.50 ETB (Mid rate)
- **EUR:** 125.75 ETB
- **GBP:** 146.00 ETB
- **CNY:** 16.20 ETB

#### **Quick Actions**

**1. Set Exchange Rate Button (➕)**
- Opens rate update dialog
- Select currency
- Enter buying/selling rates
- Set effective date
- Blockchain update: `SetExchangeRate`
- Auto-supersede previous rate

---

### **Section 4: Analytics & Reports**

**Charts:**

**1. Forex Allocation Trend (Line Chart)**
```tsx
Data: Total forex allocated per month (last 12 months)
X-axis: Months
Y-axis: USD millions
Shows: Forex demand and allocation trends
```

**2. Retention Rate Distribution (Pie Chart)**
```tsx
Data: Allocations by retention rate
Segments: 40%, 60%, 80%, 100%
Shows: Most allocations at 40-60% standard
Target: Increase 80-100% for premium exports
```

**3. Currency Breakdown (Bar Chart)**
```tsx
Data: Forex allocated by currency
Currencies: USD (80%), EUR (15%), GBP (3%), Others (2%)
Shows: USD dominance in coffee exports
```

**4. Transport Mode Impact on Forex (NEW)**
```tsx
Table showing:
Transport    Avg Timeline    Avg Retention    Volume
Sea Freight  45 days         52%              $420M (85%)
Air Freight  12 days         87%              $80M (15%)

Bar Chart: Timeline comparison
Shows: Air freight 3.75x faster payment realization

Insight: Air freight shipments have 35% higher
retention rates due to premium specialty focus
and 73% faster forex realization.

Recommendation: Incentivize air freight for
high-value specialty exports to improve forex
timeline and retention rates.
```

**5. Exporter Compliance (Table)**
```tsx
Columns: Exporter, Allocated, Utilized, Returned, Compliance %
Sorting: By compliance rate
Highlights: Non-compliant exporters (red flag)
Target: >95% compliance rate
```

**6. Processing Time Analysis**
```tsx
Metric: Days from contract registration to forex allocation
Current Avg: 2.3 days
Target: <3 days
Breakdown: By officer, by value range
Shows: Efficiency of NBE approval process
```

**Reports:**

**1. Monthly Forex Report**
- Total contracts approved
- Total forex allocated
- Currency breakdown
- Retention summary
- Compliance rate
- Export: PDF or Excel

**2. Quarterly Export Report**
- Total export value
- Top exporters
- Top destinations
- Coffee type breakdown
- Transport mode analysis (NEW)
- Export: PDF for NBE management

**3. Annual Forex Policy Report**
- Retention policy effectiveness
- Forex reserves contribution
- Compliance trends
- Recommendations for policy adjustments
- Export: PDF for NBE board

---

## 🔔 NOTIFICATIONS

### **NBE Receives**
```tsx
📧 New Contract Registered: CNT123456789
   Exporter: Yirgacheffe Coffee | Value: $150K
   [Review & Approve]

📧 Forex Allocation Expired: FX-2026-001001
   Contract: CNT123456780 | Unused: $50,000
   [Investigate Delay]
```

### **Exporter Receives**
```tsx
✅ Contract Approved by NBE: CNT123456789
   NBE Reference: NBE-2026-001234
   Forex allocation processing
   [View Details]

✅ Forex Allocated: FX-2026-001234
   Amount: $150,000 USD @ 115.50 ETB
   Retention: 100% = 17,325,000 ETB
   Valid Until: 2027-01-03
   [Download Certificate]
```

---

## ✅ COMPLETION CHECKLIST

### **Core Functions**
- [x] Review export contracts
- [x] Approve contracts for forex
- [x] Allocate foreign exchange
- [x] Set exchange rates
- [x] Monitor retention compliance
- [x] Track forex utilization
- [x] Generate reports

### **Data Display**
- [x] Contracts grid (pending approval)
- [x] Forex allocations grid
- [x] Exchange rates grid
- [x] Analytics charts

### **Quick Actions**
- [x] View contract details
- [x] Approve contract with NBE reference
- [x] Allocate forex with retention rate
- [x] Set exchange rates
- [x] Download certificates

### **AWB Integration (PENDING)**
- [ ] Display transport mode in contracts
- [ ] Show expected payment timeline (sea vs air)
- [ ] Add transport impact analysis to forex allocation
- [ ] Update analytics with transport mode breakdown
- [ ] Include transport timeline in reports

---

**Last Updated:** July 7, 2026  
**Status:** ✅ OPERATIONAL | ⏳ AWB DISPLAY PENDING  
**Version:** 1.0

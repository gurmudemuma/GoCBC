# Exporter Portal - Complete Guide

## 📋 EXECUTIVE SUMMARY

**Status:** ✅ FULLY OPERATIONAL  
**Purpose:** Coffee exporters manage complete export journey from contract to payment  
**Users:** Licensed coffee exporters in Ethiopia  

### Quick Stats
- **Dashboard KPIs:** 7 live metrics from blockchain
- **Main Tabs:** 6 workflow sections
- **Quick Actions:** 5 primary buttons per workflow
- **Data Grids:** Real-time blockchain data
- **Dialogs:** 8 interactive forms

### Core Functions
1. ✅ **Register Sales Contracts** - Create export contracts with buyers
2. ✅ **Create Shipments** - Initiate coffee shipments
3. ✅ **Submit Customs Declarations** - File customs clearance
4. ✅ **Book Shipping** - Arrange sea/air freight
5. ✅ **Initiate Payments** - Start settlement process
6. ✅ **Track Everything** - Monitor entire export journey

---

## 📊 DASHBOARD STATISTICS (Live Data)

### **KPI Cards - Row 1**
| KPI | Data Source | Icon | Calculation |
|-----|-------------|------|-------------|
| **Active Contracts** | `contracts.filter(c => c.status !== 'COMPLETED')` | 📋 Assignment | Count of non-completed contracts |
| **Pending Shipments** | `shipments.filter(s => s.status !== 'DELIVERED')` | 🚢 LocalShipping | Count of in-progress shipments |
| **Total Export Value** | `sum(contracts.totalValue)` | 💰 AttachMoney | Sum of all contract values in USD |
| **Avg Price/kg** | `sum(totalValue) / sum(quantity)` | 📈 TrendingUp | Average coffee price across contracts |

### **KPI Cards - Row 2**
| KPI | Data Source | Icon | Description |
|-----|-------------|------|-------------|
| **Forex Allocated** | `sum(forexStatuses.allocatedAmount)` | 💱 AccountBalance | Total forex allocated by NBE |
| **L/C Active** | `lcStatuses.filter(l => l.status === 'ISSUED')` | 🏦 AccountBalance | Count of active Letters of Credit |
| **Payments Pending** | `payments.filter(p => p.status !== 'SETTLED')` | ⏳ Schedule | Count of pending payments |

---

## 🎯 MAIN TABS & WORKFLOWS

### **Tab 0: Overview**
**Purpose:** Dashboard with statistics and quick actions

**Components:**
- 7 KPI cards (see above)
- Recent activity timeline
- Quick action buttons (Create Contract, Create Shipment)
- Compliance status alerts

---

### **Tab 1: Contracts**

**Purpose:** Manage sales contracts with international buyers

#### **Data Grid Columns**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Contract ID** | `contractId` | Blockchain | CNT123456789 |
| **NBE Reference** | `nbeReferenceNumber` | Generated on NBE approval | NBE-2026-001234 |
| **Buyer** | `buyerName` | Form input | Company name |
| **Country** | `buyerCountry` | Form input | Germany, USA, etc. |
| **Coffee Type** | `coffeeType` | Form input | Arabica Yirgacheffe |
| **Quantity** | `quantity` | Form input | 20,000 kg |
| **Value** | `totalValue` | Calculated: `quantity × pricePerKg` | $150,000 USD |
| **Status** | `status` | Blockchain state | Chip with color |
| **Actions** | - | - | 👁️ View \| 📄 Docs |

#### **Status Flow**
```
DRAFT → REGISTERED → NBE_APPROVED → ACTIVE → COMPLETED
```

#### **Quick Actions**

**1. Create Contract Button (➕)**
- Opens dialog with multi-section form
- Sections:
  - **Buyer Information:** Name, country, bank, contact
  - **Coffee Details:** Type, quantity, price, currency
  - **Logistics:** Incoterm, ports, delivery date
  - **Certifications:** EUDR, Organic, Fair Trade
  - **Banking:** Issuing bank (buyer's), Advising bank (exporter's)
- Auto-calculations: Total value, estimated forex
- Validation: All required fields, price > 0, quantity > 0
- Submit → Blockchain: `RegisterSalesContract`
- Success → Generates NBE reference, shows in grid

**2. View Contract Button (👁️)**
- Opens detail dialog
- Shows: All contract fields, status history, linked documents
- Actions: Upload documents, View timeline

**3. Upload Documents Button (📄)**
- Opens document upload dialog
- Supported: PDF, DOCX, XLSX, JPG, PNG
- Categories: Sales contract, Proforma invoice, Buyer LOI
- Blockchain storage: Document hash + metadata
- Displays: Document list with download links

---

### **Tab 2: Shipments**

**Purpose:** Create and track coffee shipments

#### **Data Grid Columns**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Shipment ID** | `shipmentId` | Generated: SHIP + timestamp | SHIP1783176028054 |
| **Contract ID** | `contractId` | Linked from form | CNT123456789 |
| **Quantity** | `quantity` | Form input | 20,000 kg |
| **Grade** | `grade` | Form input | Grade 2 |
| **Channel** | `channel` | Form selection | Direct Export, ECX, Union |
| **Status** | `status` | Blockchain state | CREATED, BOOKED, IN_TRANSIT |
| **B/L or AWB** | `billOfLading` or `airwayBill` | After shipping booked | BL123 / AWB-157-123 |
| **Actions** | - | - | 👁️ View \| 🛃 Customs \| 🚢 Ship |

#### **Status Flow**
```
CREATED → CUSTOMS_SUBMITTED → CUSTOMS_CLEARED → BOOKED → LOADED → IN_TRANSIT → DELIVERED
```

#### **Quick Actions**

**1. Create Shipment Button (➕)**
- Opens dialog with shipment form
- Fields:
  - **Contract:** Dropdown (active contracts only)
  - **Quantity:** kg (auto-fills from contract)
  - **Origin:** Region/farm
  - **Grade:** Grade 1-5
  - **ICO Number:** International Coffee Org number (required)
  - **Channel:** Direct Export / ECX / Union
  - **ECX Lot Number:** (required if channel = ECX)
  - **Union Approval:** (required if channel = Union)
  - **Bond Reference:** (required if Direct Export)
  - **Destination:** Country/port
  - **EUDR Compliant:** Checkbox (EU Deforestation Regulation)
- Validation: Dynamic based on channel
- Submit → Blockchain: `CreateShipment`
- Success → Shows in grid with CREATED status

**2. Submit Customs Declaration Button (🛃)**
- Available when: Status = CREATED
- Opens customs declaration dialog
- Fields:
  - **HS Code:** Auto-filled (090111 for green coffee)
  - **Port of Exit:** Dropdown (Djibouti, Addis Ababa Airport)
  - **Customs Value:** Auto-filled from contract
  - **EUDR Compliant:** Checkbox
  - **Additional Notes:** Text area
- Submit → Blockchain: `SubmitCustomsDeclaration`
- Updates status → CUSTOMS_SUBMITTED
- Success → Customs portal receives notification

**3. Book Shipping Button (🚢)**
- Available when: Status = CUSTOMS_CLEARED
- Opens shipping booking dialog
- **Transport Mode Selection:** SEA or AIR
- Fields (SEA):
  - Shipping Line: Maersk, MSC, CMA CGM
  - Container Type: DRY, REEFER, OPEN_TOP
  - Vessel Name
  - Port of Loading: Djibouti
  - Port of Discharge
  - Estimated Departure: Date picker
- Fields (AIR):
  - Airline: Ethiopian Airlines, Emirates, Lufthansa
  - Flight Number
  - Airport of Loading: Addis Ababa
  - Airport of Discharge
  - Estimated Departure: Date picker
- Submit → Blockchain: `RecordShippingDetails` or `RecordAirwayBill`
- Updates status → BOOKED
- Success → Shipping portal receives booking

**4. View Shipment Button (👁️)**
- Opens detail dialog
- Shows:
  - Shipment info (ID, contract, quantity, grade)
  - Transport details (B/L/AWB, vessel/flight, ports)
  - Status timeline with checkpoints
  - Quality inspection results (if available)
  - Customs clearance details (if available)
  - Real-time tracking (if in transit)
- Actions: Download documents, View audit trail

---

### **Tab 3: Forex & Banking**

**Purpose:** Monitor forex allocation and Letter of Credit status

#### **Forex Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Forex ID** | `forexId` | Generated by NBE | FX-2026-001234 |
| **Contract** | `contractId` | Linked | CNT123456789 |
| **Requested** | `requestedAmount` | From contract | $150,000 |
| **Allocated** | `allocatedAmount` | NBE approval | $150,000 |
| **Rate** | `exchangeRate` | NBE sets | 115.50 ETB/USD |
| **Retention** | `retentionRate` | NBE policy | 100% |
| **Status** | `status` | NBE state | REQUESTED, ALLOCATED |
| **Expiry** | `expiryDate` | 90 days from allocation | 2026-10-05 |

#### **L/C Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **L/C ID** | `lcId` | Generated by bank | LC123456789 |
| **Contract** | `contractId` | Linked | CNT123456789 |
| **Amount** | `amount` | From contract | $150,000 |
| **Issuing Bank** | `issuingBank` | Buyer's bank | Deutsche Bank |
| **Advising Bank** | `advisingBank` | Exporter's bank | Commercial Bank of Ethiopia |
| **Status** | `status` | Bank state | REQUESTED, ISSUED |
| **Expiry** | `expiryDate` | LC terms | 2026-12-31 |

#### **Quick Actions**

**1. Request Forex Alert**
- Appears when: Contract status = NBE_APPROVED and no forex allocated
- Shows: "Forex not yet allocated. NBE is processing your request."
- Auto-refreshes: Every 30 seconds

**2. View Forex Details**
- Click on forex row
- Shows: Complete allocation details, retention calculation, expiry countdown
- Actions: Download forex certificate

**3. View L/C Details**
- Click on L/C row
- Shows: Complete L/C terms, document requirements, expiry countdown
- Actions: Download L/C copy, Upload L/C documents

---

### **Tab 4: Payments**

**Purpose:** Initiate and track payment settlements

#### **Data Grid Columns**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Payment ID** | `paymentId` | Generated | PAY123456789 |
| **Contract** | `contractId` | Linked | CNT123456789 |
| **Amount** | `amount` | From LC/contract | $150,000 |
| **Method** | `paymentMethod` | Selected | LC, CAD, TT_ADVANCE, TT_POST |
| **Retained** | `retainedAmount` | Calculated | $150,000 (100%) |
| **Converted** | `amountBirr` | At NBE rate | 17,325,000 ETB |
| **Status** | `status` | Blockchain state | PENDING, SWIFT_INITIATED, SETTLED |
| **SWIFT Ref** | `swiftReference` | Bank system | SWIFT12345 |

#### **Status Flow**
```
PENDING → DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_INITIATED → SWIFT_RECEIVED → SETTLED
```

#### **Quick Actions**

**1. Initiate Payment Button (➕)**
- Available when: Shipment status = SHIPPED or DELIVERED
- Opens payment initiation dialog
- Sections:
  - **Payment Method Selection:**
    - LC (Letter of Credit)
    - CAD (Cash Against Documents)
    - TT_ADVANCE (Telegraphic Transfer - Advance)
    - TT_POST (Telegraphic Transfer - Post-shipment)
    - ADVANCE (Advance payment)
  - **Auto-Mapping:**
    - Contract ID: "AUTO" → Maps from L/C
    - Exporter ID: "AUTO" → Maps from L/C
    - Amount: "0" → Maps from L/C
    - Currency: "AUTO" → Maps from L/C
    - Receiving Bank: "AUTO" → Maps from L/C advising bank
    - Beneficiary Name: "AUTO" → Maps from L/C beneficiary
  - **Bank Details:**
    - Receiving Bank: Exporter's bank
    - Receiving Bank BIC: SWIFT code
    - Beneficiary Account: Account number
  - **SWIFT Instructions:** Special handling notes
- Validation: Depends on payment method
- Submit → Blockchain: `InitiatePayment`
- Success → Payment appears in grid with PENDING status

**2. View Payment Button (👁️)**
- Opens detail dialog
- Shows:
  - Payment info (ID, amount, method, status)
  - Retention calculation breakdown
  - Currency conversion details
  - SWIFT transaction details (if available)
  - Document checklist and upload status
- Actions: Upload payment documents, Track SWIFT

**3. Upload Payment Documents Button (📄)**
- Opens document upload dialog
- Required documents (varies by method):
  - **LC:** L/C copy, Bill of Lading, Invoice, Packing list
  - **CAD:** Documents through bank
  - **TT:** Invoice, Shipping docs
- Submit → Updates status to DOCUMENTS_SUBMITTED
- Bank portal receives notification

---

### **Tab 5: Documents**

**Purpose:** Centralized document management

#### **Document Categories**
1. **Contract Documents**
   - Sales contracts
   - Proforma invoices
   - Buyer letters of intent
   
2. **Shipment Documents**
   - Quality certificates (ECTA)
   - Export permits
   - Customs declarations
   - Bills of Lading / Airway Bills
   
3. **Payment Documents**
   - L/C copies
   - Commercial invoices
   - Packing lists
   - Certificates of origin
   
4. **Compliance Documents**
   - EUDR compliance certificates
   - Organic certificates
   - Fair Trade certificates

#### **Data Grid**
| Column | Field | Display |
|--------|-------|---------|
| **Document ID** | `documentId` | DOC_1783176028054 |
| **Name** | `filename` | Contract_CNT123.pdf |
| **Category** | `category` | Contract, Shipment, Payment |
| **Related** | `entityId` | CNT123 / SHIP123 / PAY123 |
| **Uploaded** | `uploadDate` | 2026-07-07 10:30 |
| **Size** | `fileSize` | 2.5 MB |
| **Status** | `verificationStatus` | VERIFIED, PENDING |
| **Actions** | - | 👁️ View \| 📥 Download |

#### **Quick Actions**

**1. Upload Document Button (📤)**
- Opens upload dialog
- Select file (max 10MB)
- Choose category
- Link to entity (contract, shipment, payment)
- Add notes
- Submit → Encrypted storage + blockchain hash
- Success → Document appears in grid

**2. View Document Button (👁️)**
- Opens document viewer
- PDF: In-browser preview
- Images: Full-screen view
- Other: Download prompt

**3. Download Document Button (📥)**
- Downloads original file
- Filename: `{category}_{entityId}_{timestamp}.{ext}`

---

### **Tab 6: Analytics**

**Purpose:** Export performance insights

#### **Charts & Metrics**

**1. Export Volume Trend (Line Chart)**
- X-axis: Last 12 months
- Y-axis: Kg exported
- Data: Sum of shipment quantities per month
- Shows: Growth trend

**2. Revenue by Buyer Country (Bar Chart)**
- X-axis: Countries
- Y-axis: Total USD
- Data: Sum of contract values per country
- Shows: Top markets

**3. Coffee Type Distribution (Pie Chart)**
- Segments: Coffee types
- Values: Quantity or revenue
- Data: Aggregated from contracts

**4. Payment Method Breakdown**
- Shows: LC vs CAD vs TT usage
- Data: Count and total value per method

**5. Average Days to Settlement**
- Metric: From shipment to payment settled
- Calculation: Avg(`paymentDate - shipmentDate`)
- Target: < 45 days (sea) / < 10 days (air)

**6. Compliance Score**
- Calculation: % of shipments with EUDR compliance
- Target: 100% for EU exports

---

## 🔔 NOTIFICATIONS & ALERTS

### **Real-time Alerts**

**1. Forex Allocated**
```tsx
<Alert severity="success">
  ✅ Forex Allocated: $150,000 at rate 115.50 ETB/USD
  Contract: CNT123456789 | Expiry: 90 days
</Alert>
```

**2. Customs Cleared**
```tsx
<Alert severity="info">
  ✅ Customs Clearance Received for SHIP1783176028054
  You can now book shipping.
</Alert>
```

**3. L/C Issued**
```tsx
<Alert severity="success">
  ✅ Letter of Credit Issued: LC123456789
  Amount: $150,000 | Expiry: 2026-12-31
</Alert>
```

**4. Payment Received**
```tsx
<Alert severity="success">
  ✅ Payment Settled: PAY123456789
  Amount: $150,000 | Converted: 17,325,000 ETB
  SWIFT: SWIFT12345
</Alert>
```

**5. License Expiry Warning**
```tsx
<Alert severity="warning">
  ⚠️ ECTA License expires in 30 days
  Renew before 2026-08-07
</Alert>
```

---

## ✅ COMPLETION CHECKLIST

### **Core Functions**
- [x] Dashboard with 7 live KPIs
- [x] Create sales contracts
- [x] Create shipments
- [x] Submit customs declarations
- [x] Book shipping (sea/air)
- [x] Initiate payments
- [x] Upload/manage documents
- [x] View analytics

### **Data Display**
- [x] Contracts grid with real blockchain data
- [x] Shipments grid with status tracking
- [x] Forex allocations from NBE
- [x] L/C status from banks
- [x] Payment settlements with SWIFT
- [x] Documents with download links
- [x] Charts and trends

### **Quick Actions**
- [x] 8 primary action buttons
- [x] Row-level actions (View, Edit, Upload)
- [x] Status-dependent buttons
- [x] Validation and error handling
- [x] Success notifications

### **AWB Integration (PENDING)**
- [ ] Add transport mode icon to shipments grid
- [ ] Display AWB fields in shipment details
- [ ] Show flight info for air freight
- [ ] Update CSV exports

---

**Last Updated:** July 7, 2026  
**Status:** ✅ OPERATIONAL | ⏳ AWB DISPLAY PENDING  
**Version:** 1.0

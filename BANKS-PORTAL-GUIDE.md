# Banks Portal - Complete Guide

## 📋 EXECUTIVE SUMMARY

**Status:** ✅ FULLY OPERATIONAL  
**Purpose:** Commercial banks manage Letters of Credit and payment settlements for coffee exports  
**Users:** Commercial Bank of Ethiopia, Dashen Bank, Awash Bank, etc.  

### Quick Stats
- **Dashboard KPIs:** 8 live banking metrics
- **Main Sections:** L/C Management, Payments, SWIFT, Analytics
- **Quick Actions:** Issue L/C, Process payments, SWIFT transfers
- **Data Grids:** Real-time L/C and payment data
- **Payment Methods:** 5 methods supported (LC, CAD, TT, Advance)

### Core Functions
1. ✅ **L/C Management** - Request, approve, issue Letters of Credit
2. ✅ **Payment Processing** - Settle export payments with SWIFT
3. ✅ **Document Verification** - Review trade documents
4. ✅ **Forex Coordination** - Work with NBE on forex allocation
5. ✅ **SWIFT Operations** - International wire transfers
6. ✅ **Compliance** - AML/KYC checks and reporting

---

## 📊 DASHBOARD STATISTICS (Live Data)

| KPI | Data Source | Icon | Calculation |
|-----|-------------|------|-------------|
| **Active L/Cs** | `lcs.filter(l => l.status === 'ISSUED')` | 🏦 | Count of issued LCs |
| **L/C Value** | `sum(lcs.amount)` | 💰 | Total USD in active LCs |
| **Pending Payments** | `payments.filter(p => p.status !== 'SETTLED')` | ⏳ | Count awaiting settlement |
| **Payment Volume** | `sum(payments.amount)` | 💵 | Total payment value |
| **SWIFT Transfers** | `payments.filter(p => p.swiftReference)` | 📡 | Count with SWIFT ref |
| **Avg Settlement Time** | `avg(settledDate - initiatedDate)` | ⏱️ | Days to settle |
| **Retention Amount** | `sum(payments.retainedAmount)` | 🏦 | Total forex retained |
| **Converted to ETB** | `sum(payments.amountBirr)` | 💱 | Total in local currency |

---

## 🎯 MAIN SECTIONS

### **Section 1: Letters of Credit**

**Purpose:** Manage L/C requests from exporters and issuance to buyers

#### **L/C Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **L/C ID** | `lcId` | Generated | LC123456789 |
| **Contract ID** | `contractId` | Linked | CNT123456789 |
| **Exporter** | `exporterName` | From contract | Yirgacheffe Coffee Growers |
| **Buyer** | `buyerName` | From contract | German Coffee Importers GmbH |
| **Amount** | `amount` | Contract value | $150,000 USD |
| **Issuing Bank** | `issuingBank` | Buyer's bank | Deutsche Bank |
| **Advising Bank** | `advisingBank` | Exporter's bank | Commercial Bank of Ethiopia |
| **Transport** | `transportMode` | NEW | 🚢 SEA / ✈️ AIR |
| **Transit Time** | Calculated | NEW | 25-35 days / 1-3 days |
| **Status** | `status` | State | REQUESTED, APPROVED, ISSUED |
| **Issued Date** | `issuedDate` | Timestamp | 2026-07-07 |
| **Expiry Date** | `expiryDate` | LC terms | 2026-12-31 |
| **Actions** | - | - | 👁️ View \| ✅ Approve \| 📄 Issue |

#### **Status Flow**
```
REQUESTED → APPROVED → ISSUED → DOCUMENTS_RECEIVED → PAID → CLOSED
```

#### **Quick Actions**

**1. Request L/C Button (➕)**
- **Available to:** Exporters (but usually done through Exporter Portal)
- **Opens dialog with sections:**

  **A. Contract Information**
  ```tsx
  - Contract ID: CNT123456789
  - NBE Reference: NBE-2026-001234
  - Contract Value: $150,000
  - Coffee Type: Arabica Yirgacheffe Grade 2
  - Quantity: 20,000 kg
  ```

  **B. Parties**
  ```tsx
  - Beneficiary (Exporter):
    - Name: Yirgacheffe Coffee Growers
    - Account: 1000123456789
    - Bank: Commercial Bank of Ethiopia
    - Branch: Addis Ababa Main
    - SWIFT: CBETETAAAA
  
  - Applicant (Buyer):
    - Name: German Coffee Importers GmbH
    - Country: Germany
    - Bank: Deutsche Bank
    - SWIFT: DEUTDEFFXXX
  ```

  **C. L/C Terms**
  ```tsx
  - L/C Type: Irrevocable Documentary Credit
  - Amount: $150,000 USD
  - Currency: USD
  - Tolerance: +/- 5%
  - Partial Shipments: Allowed / Not Allowed
  - Transhipment: Allowed / Not Allowed
  - Incoterm: FOB Djibouti / FOB Addis Ababa
  - Latest Shipment Date: 2026-09-30
  - Expiry Date: 2026-12-31
  - Expiry Place: Ethiopia
  ```

  **D. Documents Required**
  ```tsx
  [x] Commercial Invoice (3 originals)
  [x] Bill of Lading / Airway Bill (full set)
  [x] Packing List
  [x] Certificate of Origin
  [x] Quality Certificate (ECTA)
  [x] Phytosanitary Certificate
  [x] Insurance Certificate (if CIF)
  [ ] Inspection Certificate (optional)
  [ ] Weight Certificate (optional)
  ```

  **E. Special Conditions**
  ```tsx
  - Third Party Documents: Acceptable
  - Notify Party: [Buyer address]
  - Insurance: CIF terms or FOB
  - Payment Terms: At sight / 30 days / 60 days
  - Special Instructions: [Text area]
  ```

- **Submit** → Blockchain: `RequestLC`
- **Auto-notifications:**
  - Issuing bank (buyer's bank)
  - Advising bank (exporter's bank)
  - NBE for forex allocation

**2. View L/C Details Button (👁️)**
- **Opens comprehensive L/C detail dialog:**

  **Display Sections:**
  
  **A. L/C Summary**
  ```tsx
  L/C Number: LC123456789
  Status: [ISSUED chip]
  Issue Date: 2026-07-07
  Expiry: 2026-12-31 (176 days remaining)
  Amount: $150,000 USD
  Available With: Commercial Bank of Ethiopia
  ```

  **B. Parties**
  ```tsx
  Issuing Bank: Deutsche Bank, Frankfurt
  Advising Bank: Commercial Bank of Ethiopia, Addis Ababa
  Beneficiary: Yirgacheffe Coffee Growers
  Applicant: German Coffee Importers GmbH
  ```

  **C. Shipment & Transport (NEW)**
  ```tsx
  Transport Mode: [🚢 Sea Freight] or [✈️ Air Freight]
  
  [Info Alert for Air Freight]
  ✅ Faster Payment Realization: Air freight shipments
  reach buyers faster, enabling quicker document
  presentation and payment settlement (typically 3-7 days
  vs 30-40 days for sea freight).
  
  Latest Shipment Date: 2026-09-30
  Port of Loading: Djibouti Port / Addis Ababa Airport
  Port of Discharge: Hamburg / Frankfurt
  Partial Shipments: Allowed
  Transhipment: Not Allowed
  
  Expected Timeline:
  - Sea: Shipment (35 days) + Documents (5 days) = 40 days
  - Air: Shipment (2 days) + Documents (3 days) = 5 days
  ```

  **D. Document Requirements**
  ```tsx
  [Table showing required documents with checkboxes]
  Document               Status      Upload Date
  ====================================================
  Commercial Invoice     ✅ Received  2026-07-15
  Bill of Lading         ✅ Received  2026-07-15
  Packing List          ✅ Received  2026-07-15
  Certificate of Origin  ✅ Received  2026-07-14
  Quality Certificate    ✅ Received  2026-07-10
  Phytosanitary Cert    ✅ Received  2026-07-10
  
  Document Compliance: 100% ✅
  ```

  **E. Payment Terms**
  ```tsx
  Payment Method: Letter of Credit (UCP 600)
  Payment Terms: At sight
  Reimbursement: By TT to advising bank
  Charges: All charges outside Germany for beneficiary
  ```

  **F. Actions in Dialog**
  ```tsx
  [Download L/C Copy] [Upload Documents] 
  [Process Payment] [Amendment Request] [Close L/C]
  ```

**3. Approve L/C Button (✅)**
- **Available when:** Status = REQUESTED, user is issuing bank
- **Confirmation dialog:**
  ```
  Approve Letter of Credit?
  
  L/C ID: LC123456789
  Beneficiary: Yirgacheffe Coffee Growers
  Amount: $150,000 USD
  Expiry: 2026-12-31
  
  Approval will allow issuance to advising bank.
  
  [Cancel] [Approve]
  ```
- **Submit** → Blockchain: `ApproveLC`
- **Updates:** Status → APPROVED
- **Notifications:** Advising bank, exporter

**4. Issue L/C Button (📄)**
- **Available when:** Status = APPROVED, user is advising bank
- **Opens issuance form:**
  ```tsx
  L/C ID: LC123456789 (auto-filled)
  Issue Date: [Date picker - defaults to today]
  L/C Number: [Auto-generated or manual entry]
  SWIFT Message: [Text area - MT700 format]
  Officer Name: [Auto-filled from login]
  Digital Signature: [Captured]
  ```
- **Submit** → Blockchain: `IssueLC`
- **Generates:**
  - L/C certificate PDF
  - SWIFT MT700 message
  - Blockchain record
- **Updates:** Status → ISSUED
- **Notifications:** Exporter, issuing bank, NBE

---

### **Section 2: Payments**

**Purpose:** Process export payment settlements with SWIFT integration

#### **Payment Data Grid**
| Column | Field | Data Source | Display |
|--------|-------|-------------|---------|
| **Payment ID** | `paymentId` | Generated | PAY123456789 |
| **Contract ID** | `contractId` | Linked | CNT123456789 |
| **L/C ID** | `lcId` | If LC method | LC123456789 |
| **Exporter** | `exporterId` | From contract | EXP123456 |
| **Method** | `paymentMethod` | Selected | LC, CAD, TT_ADVANCE, TT_POST |
| **Amount** | `amount` | Contract value | $150,000 USD |
| **Retained** | `retainedAmount` | NBE retention | $150,000 (100%) |
| **Rate** | `exchangeRate` | NBE rate | 115.50 ETB/USD |
| **ETB Amount** | `amountBirr` | Converted | 17,325,000 ETB |
| **Transport** | `transportMode` | NEW | 🚢 / ✈️ |
| **Timeline** | Calculated | NEW | 30-40 days / 3-7 days |
| **Status** | `status` | State | PENDING, SWIFT_INITIATED, SETTLED |
| **SWIFT Ref** | `swiftReference` | Bank system | SWIFT12345678 |
| **Actions** | - | - | 👁️ View \| 💳 Process \| 📄 Docs |

#### **Payment Method Overview**

| Method | Code | Description | Timeline | Common Use |
|--------|------|-------------|----------|------------|
| **Letter of Credit** | LC | UCP 600 compliant, bank guaranteed | 35-45 days (sea) / 7-10 days (air) | High-value, first-time buyers |
| **Cash Against Documents** | CAD | URC 522 compliant, documents through bank | 30-40 days (sea) / 5-7 days (air) | Established relationships |
| **TT Advance** | TT_ADVANCE | Telegraphic transfer before shipment | 1-3 days | Trusted buyers, urgent orders |
| **TT Post-Shipment** | TT_POST | Telegraphic transfer after shipment | 5-10 days (after shipping) | Regular customers |
| **Advance Payment** | ADVANCE | Payment before production | Immediate | Special orders, custom roasting |

#### **Quick Actions**

**1. View Payment Details Button (👁️)**
- **Opens payment detail dialog:**

  **A. Payment Information**
  ```tsx
  Payment ID: PAY123456789
  Status: [PENDING chip]
  Initiated: 2026-07-15 10:30
  Method: Letter of Credit
  L/C Reference: LC123456789
  ```

  **B. Amount Breakdown**
  ```tsx
  Contract Value:        $150,000.00 USD
  Payment Amount:        $150,000.00 USD
  
  NBE Retention (100%):  $150,000.00 USD
  Exchange Rate:         115.50 ETB/USD
  Converted Amount:      17,325,000.00 ETB
  
  Bank Charges:          $150.00 USD
  SWIFT Fees:            $50.00 USD
  Net to Exporter:       17,301,900.00 ETB
  ```

  **C. Transport & Timeline (NEW)**
  ```tsx
  Transport Mode: [✈️ Air Freight]
  
  Expected Payment Timeline:
  ├─ Shipment Departed:    2026-07-16 ✅
  ├─ Arrival at Destination: 2026-07-17 (Est)
  ├─ Documents to Bank:     2026-07-18 (Est)
  ├─ Document Review:       2026-07-19 (Est)
  └─ SWIFT Payment:         2026-07-20 (Est)
  
  Total Timeline: 5 days (Air freight advantage)
  vs Sea Freight: 38 days typical
  
  [Info Alert]
  ✅ Faster Payment Realization: Air freight enables
  rapid export completion and payment receipt, improving
  exporter liquidity and cash flow.
  ```

  **D. Banking Details**
  ```tsx
  Paying Bank: Deutsche Bank, Frankfurt
  Receiving Bank: Commercial Bank of Ethiopia
  Beneficiary: Yirgacheffe Coffee Growers
  Account Number: 1000123456789
  SWIFT BIC: CBETETAAAA
  ```

  **E. Document Status**
  ```tsx
  [Checklist of required documents]
  ✅ Commercial Invoice
  ✅ Bill of Lading / AWB (NEW)
  ✅ Packing List
  ✅ Certificate of Origin
  ✅ Quality Certificate
  
  Documents Complete: Yes
  Discrepancies: None
  ```

  **F. SWIFT Transaction**
  ```tsx
  SWIFT Reference: SWIFT12345678
  Message Type: MT103
  Sent Date: 2026-07-20 14:30
  Status: Completed
  Confirmation: Received
  ```

**2. Process Payment Button (💳)**
- **Available when:** Status = DOCUMENTS_SUBMITTED, documents verified
- **Opens payment processing dialog:**

  **Step 1: Verify Documents**
  ```tsx
  [Document checklist with review status]
  ✅ All documents received
  ✅ No discrepancies found
  ✅ Amounts match L/C
  ✅ Signatures valid
  
  Proceed to SWIFT initiation?
  ```

  **Step 2: SWIFT Details**
  ```tsx
  Message Type: MT103 (Customer Transfer)
  
  Ordering Customer:
  - Name: German Coffee Importers GmbH
  - Account: DE1234567890
  - Bank: Deutsche Bank
  
  Beneficiary:
  - Name: Yirgacheffe Coffee Growers
  - Account: 1000123456789
  - Bank: Commercial Bank of Ethiopia
  - SWIFT: CBETETAAAA
  
  Amount: USD 150,000.00
  Currency: USD
  Value Date: 2026-07-20
  
  Charges: SHA (Shared)
  Purpose: Payment for coffee export per LC123456789
  ```

  **Step 3: NBE Retention**
  ```tsx
  Retention Rate: 100% (per NBE FXD/01/2024)
  Retained Amount: $150,000.00 USD
  
  Exchange Rate: 115.50 ETB/USD (NBE official rate)
  ETB Equivalent: 17,325,000.00 ETB
  
  Exporter will receive ETB in local account.
  USD will be deposited to NBE forex account.
  ```

  **Step 4: Confirm & Send**
  ```tsx
  Officer: [Name from login]
  Authorization Code: [2FA code]
  
  [Cancel] [Initiate SWIFT Transfer]
  ```

- **Submit** → Blockchain: `ProcessPayment`
- **Updates:** Status → SWIFT_INITIATED
- **Actions:**
  - Generate SWIFT MT103 message
  - Send to SWIFT network
  - Update forex retention with NBE
  - Convert USD to ETB at official rate
  - Credit exporter's ETB account
  - Record blockchain transaction
- **Notifications:** Exporter, NBE, paying bank

**3. Upload Documents Button (📄)**
- **Opens document upload dialog**
- **Categories:**
  - Commercial Invoice
  - Bill of Lading (sea) / Airway Bill (air) - NEW
  - Packing List
  - Certificate of Origin
  - Quality Certificate
  - Insurance Certificate
  - Weight Certificate
- **Validation:**
  - File type: PDF, JPG, PNG
  - Max size: 10MB per file
  - Required: As per L/C terms
- **Submit** → Encrypted storage + blockchain hash
- **Updates:** Payment status to DOCUMENTS_SUBMITTED

---

### **Section 3: SWIFT Operations**

**Purpose:** Monitor international wire transfers

#### **SWIFT Transaction Grid**
| Column | Field | Display |
|--------|-------|---------|
| **SWIFT Reference** | `swiftReference` | SWIFT12345678 |
| **Message Type** | `messageType` | MT103, MT700, MT760 |
| **Payment ID** | `paymentId` | PAY123456789 |
| **Amount** | `amount` | $150,000 USD |
| **From Bank** | `sendingBank` | Deutsche Bank |
| **To Bank** | `receivingBank` | Commercial Bank of Ethiopia |
| **Sent Date** | `sentDate` | 2026-07-20 14:30 |
| **Status** | `status` | Sent, Confirmed, Settled |
| **Actions** | - | 👁️ View \| 📥 Download |

#### **SWIFT Message Types**
- **MT700:** Issue of Documentary Credit (L/C)
- **MT103:** Single Customer Credit Transfer (Payment)
- **MT202:** General Financial Institution Transfer
- **MT760:** Guarantee/Standby Letter of Credit

---

### **Section 4: Analytics**

**Charts:**

**1. Payment Volume Trend (Line Chart)**
```tsx
Data: Sum of payment amounts per month
X-axis: Last 12 months
Y-axis: USD millions
Shows: Growth in export payments
```

**2. Payment Method Distribution (Pie Chart)**
```tsx
Data: Count and value by payment method
Segments: LC (60%), CAD (25%), TT (15%)
Shows: Preferred payment methods
```

**3. Average Settlement Time (Bar Chart)**
```tsx
Data: Avg days from initiation to settlement
Categories: By payment method
Target Lines: LC (40 days), CAD (35 days), TT (7 days)
NEW: Sea vs Air comparison
```

**4. Transport Mode Impact (NEW)**
```tsx
Table showing:
Method    Sea Freight        Air Freight
LC        38 days avg        7 days avg
CAD       35 days avg        6 days avg
TT_POST   10 days avg        3 days avg

Bar chart: Settlement time by transport mode
Shows: 5x faster with air freight
```

**5. Forex Retention Summary**
```tsx
Data: Total USD retained, converted to ETB
Monthly breakdown
Shows: Contribution to forex reserves
```

---

## 🔔 NOTIFICATIONS

### **Bank Receives**
```tsx
📧 New L/C Request: LC123456789
   Exporter: Yirgacheffe Coffee | Amount: $150K
   Contract: CNT123456789
   [Review & Approve]

📧 Documents Received for Payment: PAY123456789
   All documents complete, no discrepancies
   [Process Payment]

📧 SWIFT Confirmation: SWIFT12345678
   Payment settled successfully
   Amount: $150,000 USD
```

### **Exporter Receives**
```tsx
✅ L/C Issued: LC123456789
   Amount: $150,000 USD | Expiry: 2026-12-31
   [View L/C Terms]

✅ Payment Initiated: PAY123456789
   SWIFT Reference: SWIFT12345678
   Expected settlement: 3-5 days
   [Track Payment]

✅ Payment Settled: PAY123456789
   Amount: 17,325,000 ETB credited to your account
   [Download Receipt]
```

---

## ✅ COMPLETION CHECKLIST

### **Core Functions**
- [x] Request L/C
- [x] Approve L/C
- [x] Issue L/C
- [x] Process payments (5 methods)
- [x] SWIFT integration
- [x] Document verification
- [x] Forex retention (NBE coordination)

### **Data Display**
- [x] L/C grid with real-time status
- [x] Payment grid with SWIFT references
- [x] SWIFT transaction log
- [x] Analytics charts

### **Quick Actions**
- [x] View L/C details
- [x] Approve/Issue L/C
- [x] Process payment
- [x] Upload documents
- [x] Download certificates

### **AWB Integration (PENDING)**
- [ ] Display transport mode in L/C grid
- [ ] Show transit timeline (sea vs air)
- [ ] Update payment timeline estimates
- [ ] Add AWB document category
- [ ] Update analytics with transport mode

---

**Last Updated:** July 7, 2026  
**Status:** ✅ OPERATIONAL | ⏳ AWB DISPLAY PENDING  
**Version:** 1.0

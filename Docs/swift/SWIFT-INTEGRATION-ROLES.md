# SWIFT Message Management - Role-Based Integration Guide

## 🎭 Who Does What: Complete Role Integration

This document defines how each stakeholder in the Ethiopian coffee export ecosystem interacts with the SWIFT message management system.

---

## 🏦 Role 1: BANKS (Ethiopian & Foreign)

### A. Ethiopian Banks (Advising/Exporter's Bank)

**Organizations**: Commercial Bank of Ethiopia, Awash Bank, Dashen Bank, etc.

#### Responsibilities:

##### 1. **Receive LC from Foreign Bank (MT700/MT710)**
```typescript
// When MT700 arrives from foreign bank
POST /api/v1/swift/messages/:messageID/receive
{
  "receivedBy": "bank_officer_id"
}

// Automatically notify exporter
POST /api/v1/swift/messages/mt710  // Create MT710 to advise exporter
{
  "messageID": "SWIFT_ADV_LC_001",
  "lcID": "LC_2026_001",
  "swiftReference": "ADV001REF2026",
  "senderBIC": "CBETETAA",        // Ethiopian bank
  "receiverBIC": "INTERNAL",       // Internal notification
  "beneficiary": "Exporter Company Name"
}
```

**UI Action**: 
- Dashboard shows "New LC Received" notification
- Bank officer reviews MT700 details
- System creates MT710 advice to exporter
- Exporter portal shows "LC Issued" status

##### 2. **Negotiate Documents (MT754)**
```typescript
// When exporter presents shipping documents
POST /api/v1/swift/messages/mt754
{
  "messageID": "SWIFT_NEG_001",
  "lcID": "LC_2026_001",
  "swiftReference": "NEG001REF2026",
  "senderBIC": "CBETETAA",
  "receiverBIC": "DEUTDEFF",       // Foreign issuing bank
  "negotiationAmount": "250000.00",
  "currency": "USD",
  "documentsPresented": [
    "Bill of Lading",
    "Commercial Invoice",
    "Certificate of Origin",
    "Quality Certificate"
  ]
}
```

**UI Action**:
- Upload documents in portal
- System creates MT754 automatically
- Track document verification status

##### 3. **Receive Payment Authorization (MT752/MT103)**
```typescript
// Receive MT752 from issuing bank
POST /api/v1/swift/messages/:messageID/receive

// Receive MT103 payment
POST /api/v1/swift/messages/:messageID/receive
POST /api/v1/swift/messages/:messageID/process
POST /api/v1/swift/messages/:messageID/settle

// Credit exporter account (MT910)
POST /api/v1/swift/messages/mt910
{
  "messageID": "SWIFT_CREDIT_001",
  "accountNumber": "exporter_account",
  "amount": "250000.00",
  "currency": "USD",
  "valueDate": "2026-07-15"
}
```

**UI Action**:
- Payment notification appears
- Automatic account crediting
- Exporter sees "Payment Received"

##### 4. **Handle Discrepancies (MT750)**
```typescript
// Receive discrepancy report
POST /api/v1/swift/messages/:messageID/receive

// Forward to exporter
// Exporter portal shows discrepancies
// Wait for buyer acceptance
// Receive MT752 authorization
```

**UI Dashboard Elements**:
```
┌────────────────────────────────────────┐
│  Ethiopian Bank Portal - SWIFT         │
├────────────────────────────────────────┤
│  📨 Incoming Messages:                 │
│  • MT700 - LC_2026_001 (New LC)       │
│  • MT752 - LC_2026_001 (Auth Payment) │
│  • MT103 - PAY_2026_001 (Payment)     │
│                                        │
│  📤 Outgoing Messages:                 │
│  • MT754 - LC_2026_001 (Negotiation)  │
│  • MT730 - LC_2026_001 (Ack)          │
│                                        │
│  ⚠️  Pending Actions:                  │
│  • Review MT750 discrepancies         │
│  • Approve MT754 negotiation          │
└────────────────────────────────────────┘
```

### B. Foreign Banks (Issuing/Buyer's Bank)

**Organizations**: Deutsche Bank, HSBC, BNP Paribas, etc.

#### Responsibilities:

##### 1. **Issue LC (MT700)**
```typescript
// Create and send LC to Ethiopian bank
POST /api/v1/swift/messages/mt700
{
  "messageID": "SWIFT_LC_ISSUE_001",
  "lcID": "LC_2026_001",
  "swiftReference": "LC001REF2026",
  "senderBIC": "DEUTDEFF",
  "receiverBIC": "CBETETAA",
  "applicant": "German Coffee Importer GmbH",
  "beneficiary": "Ethiopian Coffee Cooperative",
  "amount": "250000.00",
  "currency": "USD",
  "expiryDate": "2026-12-31",
  "terms": "FOB Djibouti, 60-day LC"
}

// Workflow
POST /api/v1/swift/messages/SWIFT_LC_ISSUE_001/approve
POST /api/v1/swift/messages/SWIFT_LC_ISSUE_001/send
```

**UI Action**:
- Bank officer enters LC details
- Compliance officer approves
- System sends MT700 automatically

##### 2. **Examine Documents (MT754 received)**
```typescript
// Receive negotiation from Ethiopian bank
POST /api/v1/swift/messages/:messageID/receive

// If discrepancies found
POST /api/v1/swift/messages/mt750
{
  "messageID": "SWIFT_DISC_001",
  "lcID": "LC_2026_001",
  "discrepancyDetails": "Documents not in compliance",
  "discrepancyList": [
    "B/L dated after LC expiry",
    "Invoice amount exceeds LC by USD 500"
  ]
}

// If documents clean OR buyer accepts discrepancies
POST /api/v1/swift/messages/mt752
{
  "messageID": "SWIFT_AUTH_001",
  "lcID": "LC_2026_001",
  "amount": "250000.00",
  "currency": "USD"
}
```

**UI Action**:
- Document examination checklist
- Discrepancy notification to buyer
- Buyer approval workflow
- Automatic MT752 generation

##### 3. **Release Payment (MT103)**
```typescript
// Send payment to Ethiopian bank
POST /api/v1/swift/messages/mt103
{
  "messageID": "SWIFT_PAY_001",
  "swiftReference": "PAY001REF2026",
  "senderBIC": "DEUTDEFF",
  "receiverBIC": "CBETETAA",
  "orderingCustomer": "German Coffee Importer GmbH",
  "beneficiary": "Ethiopian Coffee Cooperative",
  "amount": "250000.00",
  "currency": "USD",
  "chargeCode": "SHA",
  "remittanceInfo": "Payment LC_2026_001"
}
```

**UI Dashboard**:
```
┌────────────────────────────────────────┐
│  Foreign Bank Portal - SWIFT           │
├────────────────────────────────────────┤
│  📤 LC Management:                     │
│  • LC_2026_001 - Issued (MT700 sent)  │
│  • LC_2026_002 - Draft                │
│                                        │
│  📨 Document Review:                   │
│  • MT754 received - Under examination │
│  • Discrepancies: 2 items found       │
│  • Buyer approval: Pending            │
│                                        │
│  💰 Payments:                          │
│  • MT103 - Scheduled for 2026-07-15  │
│  • Amount: USD 250,000.00             │
└────────────────────────────────────────┘
```

---

## ☕ Role 2: COFFEE EXPORTERS

**Organizations**: Ethiopian Coffee Cooperatives, Private Exporters

### Responsibilities:

#### 1. **View LC Status**
```typescript
// Check LC issued for their contract
GET /api/v1/swift/messages?lcId=LC_2026_001

// Portal shows:
{
  "lcNumber": "LC_2026_001",
  "status": "ISSUED",
  "amount": "250,000.00 USD",
  "expiryDate": "2026-12-31",
  "issuingBank": "Deutsche Bank, Frankfurt",
  "advisingBank": "Commercial Bank of Ethiopia",
  "swiftMessages": [
    { "type": "MT700", "date": "2026-06-15", "status": "RECEIVED" },
    { "type": "MT710", "date": "2026-06-15", "status": "ADVISED" }
  ]
}
```

**UI View**:
```
┌────────────────────────────────────────┐
│  Exporter Portal - My LCs              │
├────────────────────────────────────────┤
│  LC Number: LC_2026_001                │
│  Status: ✅ ACTIVE                     │
│  Amount: USD 250,000.00                │
│  Expiry: 2026-12-31 (175 days left)   │
│                                        │
│  📋 Required Documents:                │
│  ✅ Bill of Lading                     │
│  ✅ Commercial Invoice                 │
│  ✅ Certificate of Origin              │
│  ✅ Quality Certificate                │
│  ✅ Phytosanitary Certificate          │
│                                        │
│  📤 Latest Shipment: 2026-11-20       │
│  🏦 Documents Presented: 2026-11-22   │
│  ⏳ Status: Under Bank Examination    │
└────────────────────────────────────────┘
```

#### 2. **Present Documents After Shipment**
```typescript
// After shipping coffee
POST /api/v1/banking/payment/:paymentID/submit-documents
{
  "paymentID": "PAY_2026_001",
  "documents": [
    "DOC_BL_001",
    "DOC_INV_001",
    "DOC_COO_001",
    "DOC_QC_001"
  ]
}

// System automatically triggers bank to send MT754
```

**UI Action**:
- Upload documents in portal
- Submit for bank review
- Track examination status
- Receive notifications

#### 3. **Respond to Discrepancies**
```typescript
// View discrepancy report
GET /api/v1/swift/messages?lcId=LC_2026_001&type=MT750

// Portal shows discrepancies
// Exporter can:
// 1. Accept and wait for buyer approval
// 2. Re-present corrected documents
// 3. Negotiate with buyer
```

**UI Notification**:
```
┌────────────────────────────────────────┐
│  ⚠️  Discrepancy Alert - LC_2026_001  │
├────────────────────────────────────────┤
│  Your documents have discrepancies:    │
│                                        │
│  1. Bill of Lading dated after expiry │
│     • Your date: 2027-01-05           │
│     • LC expiry: 2026-12-31           │
│                                        │
│  2. Invoice amount exceeds LC          │
│     • Your amount: USD 250,500        │
│     • LC amount: USD 250,000          │
│                                        │
│  ⚙️  Options:                          │
│  • Wait for buyer to accept           │
│  • Re-submit corrected documents      │
│  • Contact buyer directly             │
└────────────────────────────────────────┘
```

#### 4. **Track Payment Status**
```typescript
// Monitor payment progress
GET /api/v1/swift/messages?paymentId=PAY_2026_001

// View payment timeline
{
  "paymentID": "PAY_2026_001",
  "timeline": [
    { "event": "Documents submitted", "date": "2026-11-22", "status": "✅" },
    { "event": "MT754 sent to issuing bank", "date": "2026-11-22", "status": "✅" },
    { "event": "Documents under examination", "date": "2026-11-23", "status": "🔄" },
    { "event": "MT752 authorization received", "date": "2026-11-25", "status": "✅" },
    { "event": "MT103 payment sent", "date": "2026-11-26", "status": "✅" },
    { "event": "Payment credited", "date": "2026-11-26", "status": "✅" }
  ]
}
```

---

## 🏛️ Role 3: NATIONAL BANK OF ETHIOPIA (NBE)

### Responsibilities:

#### 1. **Monitor All SWIFT Activity**
```typescript
// Real-time dashboard
GET /api/v1/swift/messages
GET /api/v1/swift/statistics

// View all international transactions
{
  "totalMessages": 1547,
  "byType": {
    "MT700": 245,  // LCs issued
    "MT103": 198,  // Payments
    "MT750": 12,   // Discrepancies
    "MT707": 34    // Amendments
  },
  "byStatus": {
    "SENT": 450,
    "RECEIVED": 430,
    "SETTLED": 398,
    "PROCESSING": 32
  },
  "totalValue": {
    "USD": 45_000_000,
    "EUR": 12_000_000,
    "GBP": 3_500_000
  }
}
```

**UI Dashboard**:
```
┌────────────────────────────────────────────────────────┐
│  NBE Regulatory Dashboard - SWIFT Monitoring           │
├────────────────────────────────────────────────────────┤
│  📊 Today's Activity:                                  │
│  • MT700 (LCs): 12 issued, USD 3.2M                  │
│  • MT103 (Payments): 8 received, USD 2.1M            │
│  • Pending: 15 messages                               │
│                                                        │
│  💰 Forex Impact:                                      │
│  • Inflows: USD 2.1M, EUR 500K                       │
│  • Retention (100%): USD 2.1M                        │
│  • To be sold within 30 days: USD 2.1M              │
│                                                        │
│  ⚠️  Compliance Alerts:                                │
│  • High-value transaction: LC_2026_045 (USD 1.5M)   │
│  • Review required for AML                           │
└────────────────────────────────────────────────────────┘
```

#### 2. **Approve High-Value Transactions**
```typescript
// For transactions > $1M
POST /api/v1/swift/messages/:messageID/nbe-approve
{
  "approvedBy": "nbe_officer_id",
  "amlCheck": "PASSED",
  "sanctionScreening": "CLEAR",
  "comments": "Approved for forex allocation"
}
```

#### 3. **Generate Reports**
```typescript
// Monthly SWIFT activity report
GET /api/v1/swift/reports/monthly?month=06&year=2026

// Forex compliance report
GET /api/v1/swift/reports/forex-compliance?period=Q2-2026
```

---

## 🎯 Role 4: BUYERS (Importers/End Customers)

**Organizations**: International coffee importers, roasters

### Responsibilities:

#### 1. **Request LC from Their Bank**
```typescript
// Buyer initiates LC request through their bank's system
// Bank creates MT700

POST /api/v1/banking/lc/request
{
  "contractID": "CONTRACT_2026_001",
  "exporterID": "EXPORTER_001",
  "amount": "250000",
  "currency": "USD",
  "expiryDate": "2026-12-31"
}

// System creates LC record
// Foreign bank creates MT700
```

**UI Action**:
- Fill LC application form
- Provide contract details
- Bank processes and issues MT700

#### 2. **Accept/Reject Discrepancies**
```typescript
// When MT750 received, buyer is notified
GET /api/v1/swift/messages/:messageID  // MT750 details

// Buyer decides
POST /api/v1/banking/lc/:lcID/accept-discrepancies
{
  "lcID": "LC_2026_001",
  "decision": "ACCEPT",
  "comments": "Minor discrepancies acceptable"
}

// Bank sends MT752 authorization
```

**UI Notification**:
```
┌────────────────────────────────────────┐
│  Document Discrepancy Alert            │
├────────────────────────────────────────┤
│  LC: LC_2026_001                       │
│  Exporter: Ethiopian Coffee Coop       │
│  Amount: USD 250,000                   │
│                                        │
│  Discrepancies Found:                  │
│  1. B/L dated 5 days after expiry     │
│  2. Invoice USD 500 over LC amount    │
│                                        │
│  ⚙️  Your Decision:                    │
│  ✅ Accept and authorize payment       │
│  ❌ Reject and demand correction       │
│                                        │
│  💡 Note: Goods already shipped        │
└────────────────────────────────────────┘
```

---

## 🔄 Complete Workflow Integration

### Workflow 1: Successful LC Payment (No Discrepancies)

```
┌─────────────┐
│   BUYER     │ Requests LC from bank
└──────┬──────┘
       │
       ▼
┌─────────────┐ MT700
│  Foreign    │────────────────────┐
│   Bank      │                    │
└─────────────┘                    │
                                   ▼
                            ┌─────────────┐ MT710
                            │  Ethiopian  │────────────┐
                            │    Bank     │            │
                            └─────────────┘            │
                                   │                   ▼
                                   │            ┌─────────────┐
                                   │            │  EXPORTER   │
                                   │            └──────┬──────┘
                                   │                   │
                                   │                   │ Ships Coffee
                                   │                   │ Submits Documents
                                   │                   │
                                   │                   ▼
                            ┌─────────────┐ MT754  ┌─────────────┐
                            │  Ethiopian  │────────│  Foreign    │
                            │    Bank     │        │   Bank      │
                            └─────────────┘        └──────┬──────┘
                                   │                      │
                                   │                      │ Reviews Docs
                                   │                      │ No Discrepancies
                                   │                      │
                                   │              MT752   │
                            ┌──────┴──────┐◄─────────────┘
                            │  Ethiopian  │
                            │    Bank     │
                            └──────┬──────┘
                                   │
                            MT103  │
                         ◄─────────┘
                         Payment
                                   │
                            MT910  │
                            ┌──────▼──────┐
                            │  EXPORTER   │ Payment Received!
                            │   Account   │
                            └─────────────┘
```

### Workflow 2: LC with Discrepancies

```
... (Same until document examination)
                                   │
                            ┌──────┴──────┐ MT750 (Discrepancy)
                            │  Foreign    │────────────────────┐
                            │    Bank     │                    │
                            └─────────────┘                    │
                                   │                           ▼
                                   │                    ┌─────────────┐
                                   │                    │   BUYER     │
                                   │                    │  Decides    │
                                   │                    └──────┬──────┘
                                   │                           │
                                   │                           │ Accepts
                                   │              MT752        │
                            ┌──────┴──────┐◄──────────────────┘
                            │  Foreign    │  (Authorization)
                            │    Bank     │
                            └──────┬──────┘
                                   │
                            MT103  │
                            ┌──────▼──────┐
                            │  Ethiopian  │
                            │    Bank     │
                            └──────┬──────┘
                                   │
                            MT910  │
                            ┌──────▼──────┐
                            │  EXPORTER   │ Payment Received!
                            └─────────────┘
```

---

## 📱 Portal Access Summary

### Ethiopian Bank Portal
- **URL**: `/bank/swift`
- **Users**: Bank officers, compliance officers
- **Features**:
  - Receive MT700 from foreign banks
  - Create MT710 advice to exporters
  - Send MT754 negotiation
  - Receive MT752/MT103
  - Credit exporter accounts (MT910)

### Foreign Bank Portal  
- **URL**: `/bank/swift` (same, role-based)
- **Users**: Bank officers, compliance officers
- **Features**:
  - Issue MT700 LC
  - Receive MT754 negotiation
  - Send MT750 discrepancies
  - Send MT752 authorization
  - Send MT103 payment

### Exporter Portal
- **URL**: `/exporter/my-lcs`
- **Users**: Exporters, shipping managers
- **Features**:
  - View LC status and details
  - Upload shipping documents
  - Track payment status
  - View discrepancy reports
  - Receive notifications

### NBE Dashboard
- **URL**: `/nbe/swift-monitoring`
- **Users**: NBE officers, regulators
- **Features**:
  - Monitor all SWIFT messages
  - View statistics and reports
  - Approve high-value transactions
  - Generate compliance reports
  - Track forex flows

### Buyer Portal
- **URL**: `/buyer/lcs` (through their bank)
- **Users**: Importers, purchasing managers
- **Features**:
  - Request LC
  - View LC status
  - Review discrepancy reports
  - Accept/reject discrepancies
  - Track document status

---

## 🔐 Access Control Matrix

| Role | Create SWIFT Msg | Approve | Send | Receive | View All | Reports |
|------|-----------------|---------|------|---------|----------|---------|
| **Ethiopian Bank** | MT710, MT754, MT730, MT910 | ✅ | ✅ | ✅ | Own only | Own only |
| **Foreign Bank** | MT700, MT707, MT750, MT752, MT103 | ✅ | ✅ | ✅ | Own only | Own only |
| **Exporter** | ❌ | ❌ | ❌ | ❌ | Related to them | Own only |
| **NBE** | ❌ | High-value | ❌ | ❌ | ✅ All | ✅ All |
| **Buyer** | Via bank | Via bank | ❌ | ❌ | Own only | Own only |

---

## 🚀 Quick Start by Role

### For Bank IT Team
```bash
# 1. Deploy SWIFT module
cd chaincodes/coffee
# Include swift.go in deployment

# 2. Enable SWIFT routes
# Already done in server.ts

# 3. Create bank user roles
POST /api/v1/users/create
{
  "role": "BANK_OFFICER",
  "organization": "CBETETAA"
}
```

### For Exporter
```bash
# 1. Login to portal
# 2. Navigate to "My LCs"
# 3. View active LCs
# 4. Upload documents after shipment
# 5. Track payment status
```

### For NBE
```bash
# 1. Access NBE dashboard
# 2. View real-time SWIFT activity
# 3. Generate reports
# 4. Approve high-value transactions
```

---

**Version**: 1.0  
**Last Updated**: July 10, 2026  
**Status**: ✅ Ready for Implementation  
**Next**: Build UI components for each role

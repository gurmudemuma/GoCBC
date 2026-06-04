# Exporter Portal - Requirements & Best Practices

**Date:** June 3, 2026  
**Status:** Required Implementation  
**Priority:** HIGH - Exporters are primary system users

---

## 🎯 **Why Exporter Portal is Critical**

### **Current Gap:**
The system has portals for **all regulatory organizations** (ECTA, NBE, Banks, Customs, ECX, Shipping) but **NO portal for exporters** - the primary users who drive the entire export process!

### **Best Practice:**
Every blockchain supply chain system must provide **self-service portals** for business users (exporters) to:
1. ✅ Track their entire export journey
2. ✅ Manage contracts and documentation
3. ✅ Monitor financial transactions (forex, LC, payments)
4. ✅ Track shipments in real-time
5. ✅ Receive proactive notifications
6. ✅ Access immutable audit trail (blockchain benefit)

---

## 📋 **Exporter Portal - Complete Feature Set**

### **Tab 0: Dashboard (Overview)**
**Purpose:** One-stop view of all active exports

**Components:**
- **KPI Cards:**
  - Active Contracts (count)
  - Pending Approvals (needs action)
  - In-Transit Shipments (count)
  - Total Export Value (YTD)
  
- **Recent Activity Timeline:**
  - "Contract #123 approved by NBE" - 2 hours ago
  - "Forex allocated for Contract #456" - 5 hours ago
  - "Shipment #789 departed Port of Djibouti" - 1 day ago
  - "Payment settled: $50,000" - 2 days ago

- **Action Required Alerts:**
  - ⚠️ "Contract #ABC needs EUDR documentation"
  - ⚠️ "LC #XYZ expires in 15 days - extend or utilize"
  - ⚠️ "Forex allocation #DEF expires in 10 days"

- **License Status Card:**
  - ECTA License: ACTIVE ✅
  - Expiry: Dec 31, 2026
  - Laboratory Certified: Yes ✅
  - Renewal Due: 6 months

---

### **Tab 1: My Contracts**
**Purpose:** Create, manage, and track sales contracts

**Features:**
1. **Create New Contract Button**
   - Form: Buyer details, coffee type, quantity, price
   - Auto-calculates: Total value, minimum price compliance
   - EUDR checkbox for EU destinations
   - Submit → Calls `RegisterSalesContract()`

2. **Contract List (DataGrid):**
   - Columns: Contract ID, Buyer, Country, Value, Status
   - Status filter: ALL | DRAFT | REGISTERED | APPROVED | ACTIVE
   - Actions: View Details, Download PDF, Track Progress

3. **Contract Detail View:**
   - Full contract information
   - Status stepper:
     ```
     DRAFT → REGISTERED (ECTA) → APPROVED (NBE) → FOREX ALLOCATED → LC ISSUED → ACTIVE
     ```
   - Timeline of all actions
   - Related documents
   - Financial breakdown

**API Integration:**
```typescript
// Create contract
POST /api/v1/contracts/register

// Get exporter's contracts
GET /api/v1/contracts/exporter/:exporterId

// Get contract details
GET /api/v1/contracts/:contractId
```

---

### **Tab 2: Forex & Banking**
**Purpose:** Track forex allocations, LCs, and payments

**Sub-sections:**

**A. Forex Allocations**
- Table showing all forex requests
- Columns: Forex ID, Contract, Amount, Exchange Rate, Retention, Status, Expiry
- Cards showing:
  - Allocated: $150,000 (active)
  - Utilized: $100,000
  - Retained (NBE): 40% = $60,000
  - Available: $50,000

**B. Letters of Credit**
- LC cards with status
- Shows: LC #, Amount, Bank, Beneficiary, Expiry, Status
- Actions: View Details, Download LC Copy
- Alert when LC close to expiry

**C. Payments**
- Payment timeline
- Each payment shows:
  - Amount in USD
  - Exchange rate applied
  - Retention breakdown (40% retained, 60% converted)
  - Amount received in Birr
  - SWIFT reference
  - Status
- Filter by status: ALL | PENDING | IN_PROCESS | SETTLED

**Financial Dashboard:**
```
┌────────────────────────────────────┐
│  Total Exports (YTD):  $500,000   │
│  Forex Allocated:      $450,000   │
│  Retained (NBE 40%):   $180,000   │
│  Converted to Birr:    31,185,000 │
│  Pending Settlements:  $50,000    │
└────────────────────────────────────┘
```

---

### **Tab 3: Shipments & Logistics**
**Purpose:** Track physical coffee shipments

**Features:**
1. **Shipment Cards:**
   - Shipment ID, Contract, Quantity
   - Status badge with progress
   - Current location (if in transit)
   - Vessel name, container number
   - Bill of Lading number

2. **Real-time Tracking:**
   - Map showing current GPS location
   - Timeline of movement
   - IoT sensor data:
     - Temperature: 18°C ✅
     - Humidity: 65% ✅
     - Container seal: Intact ✅

3. **Customs Status:**
   - Declaration ID
   - Status: SUBMITTED | UNDER_REVIEW | CLEARED
   - EUDR compliance status
   - Clearance documents

4. **Milestones:**
   ```
   ✅ Booked - May 15
   ✅ Loaded - May 20
   ✅ Departed Djibouti - May 21
   🚢 In Transit - Current
   ⏳ Expected Hamburg - June 5
   ⏳ Delivery
   ```

---

### **Tab 4: Documents**
**Purpose:** Centralized document management

**Features:**
- Upload documents:
  - Sales contracts
  - EUDR certificates
  - Lab quality reports
  - Phytosanitary certificates
  - Origin certificates
  - ICO certificates

- Download documents:
  - Bill of Lading
  - LC copies
  - Customs clearance
  - Payment receipts
  - Blockchain verification certificates

- Document status:
  - ✅ Verified
  - ⏳ Under Review
  - ❌ Rejected (with reason)

- Document categories:
  - Contracts
  - Compliance (EUDR, Lab)
  - Shipping (B/L, Packing List)
  - Financial (LC, Payment receipts)
  - Customs

---

### **Tab 5: Reports & Analytics**
**Purpose:** Business intelligence for exporters

**Features:**
1. **Export Performance:**
   - Monthly export volume chart
   - Revenue by destination country
   - Coffee type distribution
   - Average price trends

2. **Financial Analysis:**
   - Forex utilization rate
   - Payment settlement time average
   - Retention vs conversion breakdown
   - Currency exchange impact

3. **Compliance Dashboard:**
   - Contract approval rate: 98%
   - EUDR compliance: 100%
   - Average approval time: 2.5 days
   - Zero customs rejections

4. **Export Reports:**
   - Generate PDF/Excel reports
   - Date range selection
   - Filter by: Contract, Buyer, Status
   - Blockchain verification included

---

### **Tab 6: Notifications & Alerts**
**Purpose:** Proactive communication

**Alert Types:**
1. **Action Required (Red):**
   - "Contract #123 needs your documents"
   - "LC #456 expires in 7 days"
   - "Forex #789 expires in 5 days - utilize now"

2. **Status Updates (Blue):**
   - "Contract #123 approved by NBE"
   - "Forex allocated: $50,000"
   - "Shipment departed: Container MSKU123"
   - "Payment received: $25,000"

3. **Warnings (Orange):**
   - "License renewal due in 60 days"
   - "Exchange rate changed: 115.5 ETB"
   - "New EUDR requirements for EU exports"

4. **Success (Green):**
   - "Payment settled successfully"
   - "Shipment delivered"
   - "Contract completed"

**Notification Settings:**
- Email notifications: ON/OFF
- SMS alerts: ON/OFF
- In-app only: ON/OFF
- Frequency: Real-time | Daily digest

---

## 🔐 **Security & Access Control**

### **Authentication:**
- Exporter must have valid ECTA license
- License status must be ACTIVE
- Multi-factor authentication (MFA) recommended
- Session timeout: 30 minutes

### **Data Access:**
- Exporter can ONLY see their own data
- Cannot view other exporters' information
- Cannot access regulatory functions
- Read-only for regulatory actions (NBE approval, etc.)

### **Permissions:**
```typescript
EXPORTER_PERMISSIONS = {
  contracts: {
    create: true,      // Register new contracts
    read: true,        // View own contracts
    update: false,     // Cannot modify after registration
    delete: false,     // Cannot delete
  },
  forex: {
    request: false,    // Auto-requested after NBE approval
    read: true,        // View own forex allocations
    update: false,     // Cannot modify
  },
  lc: {
    request: true,     // Request LC from bank
    read: true,        // View own LCs
    update: false,     // Cannot modify
  },
  shipments: {
    create: true,      // Create shipment
    read: true,        // Track own shipments
    update: false,     // Status updated by Shipping/Customs
  },
  payments: {
    read: true,        // View own payments
    update: false,     // Cannot modify
  },
  documents: {
    upload: true,      // Upload supporting docs
    read: true,        // View own documents
    download: true,    // Download docs/certificates
  }
}
```

---

## 🎨 **UI/UX Best Practices**

### **Dashboard Design:**
1. **Progressive Disclosure:** Show summary first, details on click
2. **Status Colors:** Consistent color coding across all sections
3. **Real-time Updates:** WebSocket for live status changes
4. **Mobile Responsive:** Exporters need mobile access
5. **Search & Filter:** Quick find for contracts, shipments
6. **Bulk Actions:** Download multiple documents at once

### **User Experience:**
1. **Onboarding Tutorial:** First-time login guide
2. **Contextual Help:** Tooltips explaining blockchain terms
3. **Progress Indicators:** Show where in process each export is
4. **Empty States:** Helpful messages when no data
5. **Error Messages:** Clear, actionable error descriptions

---

## 📊 **Blockchain Transparency Benefits**

### **What Exporters Can See (Unique to Blockchain):**

1. **Immutable Audit Trail:**
   - Every transaction timestamped
   - Who approved what and when
   - Cannot be altered or deleted

2. **Real-time Status:**
   - No calling/emailing to check status
   - Instant visibility across all organizations
   - Automated notifications

3. **Trust & Verification:**
   - Cryptographic proof of all transactions
   - Download blockchain verification certificates
   - Show to buyers/banks as proof

4. **Compliance Evidence:**
   - All EUDR documentation on-chain
   - Traceability from farm to port
   - GPS verification of origin

5. **Financial Transparency:**
   - Exact retention calculations visible
   - Exchange rates applied at each step
   - Payment flow fully traceable

---

## 🚀 **Implementation Priority**

### **Phase 1 (MVP - Essential):**
- ✅ Dashboard with KPIs
- ✅ Contract management (create, view, track)
- ✅ Forex & LC status visibility
- ✅ Basic shipment tracking
- ✅ Document upload/download

### **Phase 2 (Enhanced):**
- ✅ Payment status with SWIFT tracking
- ✅ Real-time GPS tracking maps
- ✅ Advanced analytics/reports
- ✅ Notification center
- ✅ Mobile app

### **Phase 3 (Advanced):**
- ✅ AI-powered insights
- ✅ Predictive analytics
- ✅ Automated compliance checking
- ✅ Integration with buyer portals
- ✅ Smart contract automation

---

## 🔗 **API Endpoints Needed**

All these should filter by `exporterId` from authentication:

```
# Exporter Profile
GET    /api/v1/exporter/profile
PUT    /api/v1/exporter/profile

# Contracts
POST   /api/v1/exporter/contracts              # Register new
GET    /api/v1/exporter/contracts              # Get all own contracts
GET    /api/v1/exporter/contracts/:id          # Get specific
GET    /api/v1/exporter/contracts/:id/history  # Audit trail

# Forex & Banking
GET    /api/v1/exporter/forex                  # All forex allocations
GET    /api/v1/exporter/lc                     # All LCs
GET    /api/v1/exporter/payments               # All payments

# Shipments
POST   /api/v1/exporter/shipments              # Create shipment
GET    /api/v1/exporter/shipments              # All shipments
GET    /api/v1/exporter/shipments/:id          # Specific with tracking

# Documents
POST   /api/v1/exporter/documents/upload
GET    /api/v1/exporter/documents
GET    /api/v1/exporter/documents/:id/download

# Analytics
GET    /api/v1/exporter/analytics/summary      # Dashboard KPIs
GET    /api/v1/exporter/analytics/performance  # Export performance
GET    /api/v1/exporter/analytics/financial    # Financial analysis

# Notifications
GET    /api/v1/exporter/notifications
PUT    /api/v1/exporter/notifications/:id/read
POST   /api/v1/exporter/notifications/settings
```

---

## 💡 **Key Insights - Why This Matters**

### **Without Exporter Portal:**
- ❌ Exporters call ECTA/NBE/Banks to check status
- ❌ Manual tracking with spreadsheets
- ❌ Delayed awareness of issues
- ❌ Cannot leverage blockchain transparency
- ❌ Poor user experience for primary stakeholders

### **With Exporter Portal:**
- ✅ Self-service 24/7 access
- ✅ Real-time status updates
- ✅ Proactive alerts prevent delays
- ✅ Full blockchain transparency benefits
- ✅ Professional, modern experience
- ✅ Increased trust and adoption

---

## 📝 **Next Steps**

1. **Create ExporterPortal.tsx** with all 6 tabs
2. **Implement exporter API routes** (authentication + data filtering)
3. **Add exporter authentication** to login system
4. **Create exporter dashboard page** at `/portals/exporter`
5. **Test end-to-end** exporter journey
6. **Add notification system** (WebSocket or polling)
7. **Mobile-responsive** design testing

---

**Status:** Ready for implementation  
**Estimated Time:** 2-3 days for MVP  
**Priority:** HIGH - Critical missing component

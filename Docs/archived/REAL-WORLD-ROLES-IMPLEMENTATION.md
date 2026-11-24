# Real-World Roles Implementation - Coffee Export System

## Overview
Restructured Customs and Shipping portals to accurately reflect real-world responsibilities and workflows in Ethiopian coffee export operations.

---

## ✅ CUSTOMS PORTAL - Aligned with Customs Authority Role

### Real-World Customs Responsibilities:
- **Review export declarations** submitted by exporters
- **Verify documents** (ECTA certificates, export permits, commercial docs)
- **Schedule physical inspections** (selective, not every shipment)
- **Issue customs clearance** (Bill of Exit/Export Release)
- **Collect duties/taxes** if applicable

### What Customs Does NOT Do:
- ❌ Quality testing (ECTA's role)
- ❌ Issue export permits (ECTA's role)  
- ❌ Grade coffee (ECTA's role)

### Tab Structure Implemented:

#### **Tab 1: Export Declarations** (PRIMARY WORKFLOW)
**Purpose:** Main customs workflow - declaration processing
- Exporters submit declarations with required documents
- Status flow: SUBMITTED → UNDER_REVIEW → UNDER_INSPECTION → CLEARED/REJECTED
- Actions:
  - Review documents
  - Schedule physical inspection (if required)
  - Issue customs clearance
  - Reject with reason

**Validation:** System verifies prerequisites before accepting declaration:
- ✅ Quality inspection must be APPROVED by ECTA
- ✅ Export permit must be issued by ECTA  
- ✅ Contract must exist
- ✅ Shipment must exist

#### **Tab 2: Quality Certificates (ECTA)** (REFERENCE DATA)
**Purpose:** Read-only view of ECTA quality inspection results
- Shows quality certificates for customs review
- Displays: Certificate No, Export Permit No, Classification, Status
- Customs officers verify certificate numbers match declarations
- **Important:** This is ECTA data that customs REVIEWS, not performs

#### **Tab 3: Cleared Shipments** (HISTORICAL RECORD)
**Purpose:** Complete record of customs-cleared exports
- All shipments that received clearance
- Shows: Clearance Number, Date, Value, Destination
- Audit trail for export history
- Export functionality for reports

#### **Tab 4: EUDR Compliance** (EU REGULATIONS)
**Purpose:** EU Deforestation Regulation compliance management
- EUDR declarations tracking
- GPS verification status
- Deforestation-free compliance rate

#### **Tab 5: Analytics** (PERFORMANCE METRICS)
**Purpose:** Customs performance statistics and trends

---

## ✅ SHIPPING PORTAL - Aligned with Shipping Company Role

### Real-World Shipping Responsibilities:
- **Book cargo space** on vessels/aircraft
- **Issue Bills of Lading (B/L)** or Airway Bills (AWB)
- **Load containers** at port
- **Track shipments** in transit (GPS, IoT sensors)
- **Coordinate port operations** (loading/unloading)
- **Update shipment status** (departed, in-transit, arrived, delivered)
- **Manage documentation** for international shipping

### What Shipping Does NOT Do:
- ❌ Quality inspections (ECTA's role)
- ❌ Customs clearance (Customs Authority's role)
- ❌ Issue export permits (ECTA's role)

### Tab Structure (Already Correct):

#### **Tab 1: Shipments** (MAIN WORKFLOW)
**Purpose:** Manage shipping bookings and Bills of Lading
- **Filter:** Only shows shipments with `CUSTOMS_CLEARED` status
- **Prerequisite Check:** Shipment must have customs clearance before shipping
- **Auto-Mapping:** Fetches customs clearance data to populate B/L forms
- Actions:
  - Create B/L
  - Update shipping status
  - Track containers

**Alert Added:** Clarifies that shipping handles only customs-cleared shipments

#### **Tab 2: Container Tracking** (REAL-TIME MONITORING)
**Purpose:** Track containers in transit
- GPS location tracking
- IoT sensor monitoring (temperature, humidity)
- Container security status
- Blockchain integration for immutable records

#### **Tab 3: Port Operations** (LOGISTICS COORDINATION)
**Purpose:** Port performance metrics
- Port efficiency statistics
- Average dwell time
- Container throughput
- Loading/unloading coordination

#### **Tab 4: Analytics** (PERFORMANCE METRICS)
**Purpose:** Shipping statistics and trends

---

## 📋 WORKFLOW SEQUENCE (Real-World Order)

```
1. EXPORTER: Applies for license → ECTA approves
2. EXPORTER: Contracts signed → registered in system
3. EXPORTER: Coffee sourced → delivered for inspection
4. ECTA: Quality inspection → physical tests + cupping
5. ECTA: Inspection approval → issues Quality Certificate
6. ECTA: Export permit issued
7. EXPORTER: Submits customs declaration (with ECTA docs)
8. CUSTOMS: Reviews declaration → verifies ECTA certificates
9. CUSTOMS: Physical inspection (if required/risk-based)
10. CUSTOMS: Issues customs clearance (Bill of Exit)
11. SHIPPING: Books cargo → issues Bill of Lading
12. SHIPPING: Loads container → departs port
13. SHIPPING: Tracks in transit → arrives destination
14. SHIPPING: Delivers to buyer → confirms delivery
15. BANK: Releases payment (based on shipping docs)
```

---

## 🔑 KEY PRINCIPLES APPLIED

### 1. **Role Separation**
Each portal reflects ONLY what that organization does in real life:
- ECTA = Quality control & export permits
- Customs = Border control & clearance
- Shipping = Transportation & logistics

### 2. **Sequential Dependencies**
System enforces real-world order:
- Can't ship without customs clearance
- Can't get customs clearance without ECTA permit
- Can't get export permit without quality approval

### 3. **Data Visibility vs. Data Ownership**
- Customs can **VIEW** ECTA quality certificates (Tab 2)
- But Customs cannot **MODIFY** quality inspection data
- This reflects real-world information sharing

### 4. **Workflow Triggers**
Auto-notifications across portals:
- ECTA approval → notifies exporter to submit customs declaration
- Customs clearance → notifies shipping to book cargo
- Shipment delivered → notifies bank to release payment

---

## 📁 FILES MODIFIED

### Customs Portal:
- `c:\goCBC\ui\src\components\portals\CustomsPortal.tsx` - Restructured tabs
- `c:\goCBC\ui\src\components\portals\CustomsInspection.tsx` - Rewritten for quality cert view
- `c:\goCBC\ui\src\components\portals\CustomsClearedShipments.tsx` - NEW: Historical record

### Shipping Portal:
- `c:\goCBC\ui\src\components\portals\ShippingPortal.tsx` - Added clarifying alert

### Backend (Already Implemented):
- `c:\goCBC\api\src\routes\customs.ts` - Declaration workflow APIs
- `c:\goCBC\api\src\routes\quality.ts` - Inspection APIs
- `c:\goCBC\chaincodes\coffee\customs.go` - Declaration chaincode
- `c:\goCBC\chaincodes\coffee\quality.go` - Inspection chaincode

---

## ✅ VERIFICATION CHECKLIST

- [x] Customs portal shows export declarations as primary workflow
- [x] Customs can view (but not modify) ECTA quality certificates
- [x] Customs has historical record of cleared shipments
- [x] Shipping portal only shows customs-cleared shipments
- [x] Shipping fetches customs data for auto-mapping B/L forms
- [x] System enforces prerequisite checks before operations
- [x] Blockchain data validated: 10 complete quality inspections exist
- [x] All tabs properly indexed and rendering
- [x] UI server running on http://localhost:3002

---

## 🌐 SERVERS RUNNING

- **API Server:** http://localhost:3001
- **UI Server:** http://localhost:3002
- **Blockchain:** Hyperledger Fabric network (7 organizations)

---

## 📖 USER INSTRUCTIONS

### To View Updated Portals:

1. **Open browser:** http://localhost:3002
2. **Login** with appropriate credentials
3. **Navigate to:**
   - **Customs Portal** → See 3-tab structure (Declarations, Quality Certs, Cleared)
   - **Shipping Portal** → See customs-cleared shipments only

### To Test Workflow:

1. **ECTA Portal:** Complete quality inspection → approve → issue permit
2. **Exporter/Customs:** Submit declaration (system validates ECTA completion)
3. **Customs Portal:** Review → inspect → clear
4. **Shipping Portal:** Create B/L → ship → track → deliver
5. **Bank Portal:** Release payment after delivery confirmation

---

## 📚 REFERENCES

- Ethiopian Customs Commission export procedures
- International Coffee Organization (ICO) export standards
- International Plant Protection Convention (IPPC) phytosanitary requirements
- EU Deforestation Regulation (EUDR) compliance framework
- Incoterms 2020 (FOB, CIF shipping terms)

---

**Implementation Date:** July 6, 2026
**Status:** ✅ COMPLETE
**Next Steps:** User acceptance testing with actual Ethiopian coffee exporters and customs officers

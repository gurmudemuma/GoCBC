# Complete Portal Tabs List - GoCBC System

**Generated:** October 23, 2026  
**System:** Ethiopian Coffee Export Blockchain System

This document lists all tabs in each of the 7 portals with their purposes and role-based access.

---

## 1. EXPORTER PORTAL
**File:** `/ui/src/components/portals/ExporterPortal.tsx`  
**Total Tabs:** 8

| # | Tab Name | Icon | Purpose |
|---|----------|------|---------|
| 0 | Dashboard | Assessment | Overview of export activities, trends, and KPIs |
| 1 | Contracts | Description | Manage sales contracts (dynamic count) |
| 2 | Forex & Banking | AccountBalance | Forex allocations, LC status, and banking operations (dynamic count) |
| 3 | Shipments | LocalShipping | Track all shipments (dynamic count) |
| 4 | Customs | Assignment | Customs declarations and clearances (dynamic count) |
| 5 | LC & Payments | AttachMoney | Letter of Credit and payment tracking (dynamic count) |
| 6 | Reports | TrendingUp | Export reports and analytics |
| 7 | Audit Trail | Assessment | Complete audit log of all activities |

**Note:** Tabs 1-5 show dynamic counts based on active records.

---

## 2. ECTA PORTAL (Ethiopian Coffee & Tea Authority)
**File:** `/ui/src/components/portals/ECTAPortal.tsx`  
**Total Tabs:** 10  
**Subtabs:** Tab 3 (Quality Control) has 5 workflow stages

| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 0 | Pending Applications | Assignment | Review exporter license applications (dynamic count) | ECTA, ADMIN, ECTA Officer, License Officer |
| 1 | Approved Exporters | Coffee | Manage approved/active exporters (dynamic count) | ECTA, ADMIN, ECTA Officer, License Officer |
| 2 | Sales Contracts | Description | Review and approve registered contracts (dynamic count) | ECTA, ADMIN, ECTA Officer, Permit Officer, ECTA_SUPERVISOR, ECTA_INSPECTOR |
| 3 | **Quality Control** ⚡ | Science | Pre-shipment inspections and quality checks (dynamic count) | ECTA, ADMIN, Quality Inspector, Lab Analyst, ECTA Officer, ECTA_SUPERVISOR, ECTA_INSPECTOR |
| 4 | License Renewals | Warning | Track expiring licenses (dynamic count: <3 months) | ECTA, ADMIN, ECTA Officer, License Officer |
| 5 | Analytics | Assessment | Statistical analysis and trends | ECTA, ADMIN, ECTA Officer |
| 6 | Pre-shipment Inspection | Science | Detailed quality inspections | ECTA, ADMIN, Quality Inspector, Lab Analyst, ECTA Officer, ECTA_SUPERVISOR, ECTA_INSPECTOR |
| 7 | User Management | Person | Manage portal users | ADMIN, ECTA, ECTA Portal Administrator |
| 8 | Audit Trail | Assessment | Complete audit log | ECTA, ADMIN, ECTA Officer, License Officer, Quality Inspector, Lab Analyst, Permit Officer, ECTA_SUPERVISOR, ECTA_INSPECTOR |
| 9 | Post-Delivery Audits | CheckCircle | Post-delivery verification (dynamic count) | ECTA, ADMIN, ECTA Officer |

### Tab 3: Quality Control - Workflow Stages (Subtabs)
**Type:** Filter-based workflow stages  
**Implementation:** `inspectionFilterTab` state variable

| Stage | Status | Description |
|-------|--------|-------------|
| 1 | PENDING | Shipments awaiting inspection scheduling |
| 2 | SCHEDULED | Inspections scheduled, awaiting execution |
| 3 | UNDER_REVIEW | Inspected, awaiting officer approval |
| 4 | APPROVED | Passed quality inspection |
| 5 | REJECTED | Failed quality inspection |

**Note:** All tabs are role-based; ADMIN sees all tabs. Quality Control tab shows unified table of all inspection stages.

---

## 3. BANKS PORTAL
**File:** `/ui/src/components/portals/BanksPortal.tsx`  
**Structure:** Hierarchical (Parent → Child Tabs)  
**Total Parent Tabs:** 4  
**Total Child Tabs:** 9  
**Payment Method Subtabs:** 4 payment methods

### Parent Tab 1: Payment Operations
**Icon:** Payment  
**Roles:** BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, LC Officer, Payment Officer, Document Officer

#### Child Tabs:
| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 0 | **Payment Methods** ⚡ | Payment | Select payment method (LC, CAD, OA, DP) | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, LC Officer, Payment Officer |
| 2 | Document Examination | Description | Examine LC documents (dynamic count) | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, Document Officer |
| 3 | Payment Release | AttachMoney | Release payments (dynamic count) | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, Payment Officer |
| 9 | LC Discrepancies | Error | Handle document discrepancies | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, LC Officer, Document Officer |

#### Child Tab 0: Payment Methods - Payment Type Selection (Subtabs)
**Type:** Dropdown menu selection (hover/click)  
**Implementation:** `selectedPaymentMethod` state + `PaymentMethodTab` component

| Method | Full Name | Icon | Risk Level | Description |
|--------|-----------|------|------------|-------------|
| LC | Letter of Credit | Description | LOW | Bank-guaranteed payment (UCP 600) — **Recommended** |
| CAD | Documentary Collection | LocalShipping | MEDIUM | Cash Against Documents (D/P or D/A) |
| ADVANCE | Advance Payment | AttachMoney | LOW | Payment before shipment (TT Advance) |
| CONSIGNMENT | Consignment | Assignment | HIGH | Limited to Fruits, Flowers, Meat |

**Note:** Payment method selector appears as a dropdown in the tab bar, allowing quick switching between payment types without changing tabs.

### Parent Tab 2: Forex & Settlements
**Icon:** CurrencyExchange  
**Roles:** BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, Forex Officer, LC Officer, Payment Officer

#### Child Tabs:
| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 1 | Forex Allocations | CurrencyExchange | Manage forex requests (dynamic count) | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, Forex Officer |
| 5 | LC Settlements | CheckCircle | Settle completed LCs (dynamic count) | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, LC Officer, Payment Officer |

### Parent Tab 3: Communication & Issues
**Icon:** MessageOutlined  
**Roles:** BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, SWIFT Officer, LC Officer, Document Officer

#### Child Tabs:
| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 4 | SWIFT Messages | AccountBalance | International payment messages (dynamic count) | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, SWIFT Officer |

### Parent Tab 4: System Management
**Icon:** AdminPanelSettings  
**Roles:** BANKS, ADMIN, BANKS Portal Administrator, Bank Officer

#### Child Tabs:
| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 6 | Analytics | Assessment | Banking analytics dashboard | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer |
| 7 | User Management | Person | Manage bank portal users | ADMIN, BANKS, BANKS Portal Administrator |
| 8 | Audit Trail | Assessment | Complete audit log | BANKS, ADMIN, BANKS Portal Administrator, Bank Officer, LC Officer, Payment Officer, Forex Officer, SWIFT Officer, Document Officer |

**Note:** Banks Portal uses a unique hierarchical tab structure with parent categories and child tabs.

---

## 4. NBE PORTAL (National Bank of Ethiopia)
**File:** `/ui/src/components/portals/NBEPortal.tsx`  
**Total Tabs:** 8  
**Subtabs:** Tabs 0, 2, and 5 have internal subtabs

| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 0 | **Forex Monitoring** ⚡ | CurrencyExchange | Monitor and allocate forex (dynamic count) | NBE, ADMIN, NBE Officer, Forex Officer, Exchange Rate Officer |
| 1 | Exchange Rates | TrendingUp | Manage USD-ETB rates (dynamic count) | NBE, ADMIN, NBE Officer, Exchange Rate Officer |
| 2 | **SWIFT Monitoring** ⚡ | FlightTakeoff | Track international payments | NBE, ADMIN, NBE Officer, Settlement Officer |
| 3 | Forex Repatriation | CheckCircle | Verify forex repatriation compliance | NBE, ADMIN, NBE Officer, Forex Officer, Settlement Officer |
| 4 | Policy & Compliance | Gavel | Enforce export policies and regulations | NBE, ADMIN, NBE Officer, Compliance Officer, Screening Officer |
| 5 | **Analytics** ⚡ | Assessment | Statistical analysis and reports | NBE, ADMIN, NBE Officer |
| 6 | User Management | Person | Manage NBE portal users | ADMIN, NBE, NBE Portal Administrator |
| 7 | Audit Trail | Assessment | Complete audit log (dynamic count: delivered shipments) | NBE, ADMIN, NBE Officer, Forex Officer, Exchange Rate Officer, Settlement Officer, Compliance Officer |

### Tab 0: Forex Monitoring - Filter Subtabs
**Type:** KPI-driven filtering  
**Implementation:** `forexSubTab` state variable

| Subtab | Label | Focus | KPIs Shown |
|--------|-------|-------|------------|
| 0 | All Forex | Complete overview | Total Requests, Allocated, Requested, Total Value |
| 1 | Allocated | Approved allocations | Allocated count, Allocated Amount, Avg Retention Rate |
| 2 | Requested | Pending requests | Pending Requests, Requested Amount, Ready for Approval |

### Tab 2: SWIFT Monitoring - Analysis Subtabs
**Type:** Material-UI Tabs  
**Implementation:** `swiftSubTab` state via `SWIFTMonitoringWrapper` component

| Subtab | Label | Purpose | KPIs Shown |
|--------|-------|---------|------------|
| 0 | All Messages | Complete message list | Total Messages, Forex Inflow, High Value Txns |
| 1 | Analytics & Charts | Visual analytics | Avg Message Value, analytical charts |
| 2 | Compliance Alerts | Regulatory monitoring | Compliance metrics and alerts |

### Tab 5: Analytics - Report Subtabs
**Type:** Dashboard sections  
**Implementation:** `analyticsSubTab` state via `AnalyticsDashboard` component

| Subtab | Label | Content | KPIs Shown |
|--------|-------|---------|------------|
| 0 | Overview | Summary metrics | Total Contracts, Forex Allocated, SWIFT Messages |
| 1 | Trends | Growth analysis | Monthly Growth, trend charts |
| 2 | Breakdown | Detailed breakdowns | Detailed analytical breakdowns |

**Note:** All tabs are role-based; ADMIN sees all tabs. Tabs 0, 1, 7 show dynamic counts.

---

## 5. CUSTOMS PORTAL
**File:** `/ui/src/components/portals/CustomsPortal.tsx`  
**Total Tabs:** 8

| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 0 | Submitted | LocalShipping | Review submitted declarations | CUSTOMS, ADMIN, CUSTOMS Portal Administrator, Customs Officer |
| 1 | Inspecting | Security | Manage ongoing inspections | CUSTOMS, ADMIN, CUSTOMS Portal Administrator, Customs Officer, Inspection Officer |
| 2 | Under Review | Warning | Final review before clearance | CUSTOMS, ADMIN, CUSTOMS Portal Administrator, Customs Officer, Clearance Officer |
| 3 | Cleared | CheckCircle | Cleared declarations | CUSTOMS, ADMIN, CUSTOMS Portal Administrator, Customs Officer, Clearance Officer |
| 4 | Rejected | Cancel | Rejected declarations | CUSTOMS, ADMIN, CUSTOMS Portal Administrator, Customs Officer |
| 5 | Border Crossing | DirectionsBoat | Monitor cross-border movements | CUSTOMS, ADMIN, CUSTOMS Portal Administrator, Customs Officer, Border Officer, Inspection Officer |
| 6 | User Management | Person | Manage customs portal users | ADMIN, CUSTOMS, CUSTOMS Portal Administrator |
| 7 | Audit Trail | Assessment | Complete audit log | CUSTOMS, ADMIN, CUSTOMS Portal Administrator, Customs Officer, Inspection Officer, Clearance Officer |

**Note:** All tabs are role-based; ADMIN sees all tabs. Each tab corresponds to a specific declaration status.

---

## 6. SHIPPING PORTAL
**File:** `/ui/src/components/portals/ShippingPortal.tsx`  
**Total Tabs:** 10 (Status-based Lifecycle)

| # | Tab Name | Icon | Status | Description |
|---|----------|------|--------|-------------|
| 0 | Clearance | CheckCircle | CUSTOMS_CLEARED | Customs cleared shipments ready for transport |
| 1 | Land Transport | LocalShipping | LAND_TRANSPORT | Addis Ababa → Djibouti (800km) |
| 2 | Port Arrival | Anchor | PORT_ARRIVED | Arrived at Djibouti Port |
| 3 | Container Stuffing | Inventory | CONTAINER_STUFFED | Loading into containers |
| 4 | Vessel Loading | DirectionsBoat | VESSEL_LOADED | Loaded on ship/aircraft |
| 5 | Departed | DirectionsBoat | DEPARTED | Left Djibouti Port |
| 6 | In Transit | DirectionsBoat | IN_TRANSIT | Ocean/air freight journey |
| 7 | Destination Arrived | LocationOn | DESTINATION_ARRIVED | Arrived at buyer's port |
| 8 | Delivered | CheckCircle | DELIVERED | Completed deliveries |
| 9 | Users | Person | (Admin) | User management (ADMIN, SHIPPING, Shipping Portal Administrator only) |

**Note:** Each tab (0-8) shows shipments at that exact lifecycle status. Tab 9 is role-restricted.

---

## 7. ECX PORTAL (Ethiopian Commodity Exchange)
**File:** `/ui/src/components/portals/ECXPortal.tsx`  
**Total Tabs:** 4

| # | Tab Name | Icon | Purpose | Roles |
|---|----------|------|---------|-------|
| 0 | Coffee Lots | Coffee | Register, grade, assign, and release coffee lots (dynamic count) | ECX, ADMIN, ECX Officer, Grading Officer, Warehouse Officer, Registration Officer, Release Officer |
| 1 | Market Prices | TrendingUp | View current market prices by region and grade | ECX, ADMIN, ECX Officer |
| 2 | Grading Standards | Science | Ethiopian coffee grading standards reference | ECX, ADMIN, ECX Officer, Grading Officer |
| 3 | User Management | Person | Manage ECX portal users | ADMIN, ECX, ECX Portal Administrator |

**Note:** All tabs are role-based; ADMIN sees all tabs. Tab 0 shows dynamic count of registered lots.

---

## SUMMARY

| Portal | Total Tabs | Hierarchical? | Dynamic Counts? | Role-Based Access? | Subtabs? |
|--------|------------|---------------|-----------------|-------------------|----------|
| **Exporter** | 8 | No | Yes (5 tabs) | No | No |
| **ECTA** | 10 | No | Yes (6 tabs) | Yes | **Yes (Tab 3: 5 stages)** |
| **Banks** | 4 parent + 9 child | **Yes** | Yes (5 child tabs) | Yes | **Yes (Tab 0→Child 0: 4 methods)** |
| **NBE** | 8 | No | Yes (3 tabs) | Yes | **Yes (Tabs 0, 2, 5)** |
| **Customs** | 8 | No | No | Yes | No |
| **Shipping** | 10 | No | No | Yes (Tab 9 only) | No |
| **ECX** | 4 | No | Yes (1 tab) | Yes | No |
| **TOTAL** | **61 tabs** | 1 hierarchical | 21 with counts | 6 role-based | **4 tabs with subtabs** |

---

## SUBTAB DETAILS SUMMARY

### Total Subtab Structures: 4

1. **ECTA Portal - Tab 3 (Quality Control)**
   - Type: Workflow stage filters
   - Count: 5 stages (PENDING → SCHEDULED → UNDER_REVIEW → APPROVED → REJECTED)
   - Purpose: Track inspection lifecycle

2. **Banks Portal - Parent 1 → Child Tab 0 (Payment Methods)**
   - Type: Dropdown menu selection
   - Count: 4 payment methods (LC, CAD, ADVANCE, CONSIGNMENT)
   - Purpose: Payment type selection with risk levels

3. **NBE Portal - Tab 0 (Forex Monitoring)**
   - Type: KPI-driven filters
   - Count: 3 views (All, Allocated, Requested)
   - Purpose: Filter forex requests by status

4. **NBE Portal - Tab 2 (SWIFT Monitoring)**
   - Type: Material-UI Tabs
   - Count: 3 subtabs (All Messages, Analytics & Charts, Compliance Alerts)
   - Purpose: Different SWIFT analysis views

5. **NBE Portal - Tab 5 (Analytics)**
   - Type: Dashboard sections
   - Count: 3 subtabs (Overview, Trends, Breakdown)
   - Purpose: Different analytical perspectives

### Subtab Implementation Patterns:

| Pattern | Used In | Mechanism |
|---------|---------|-----------|
| **Workflow Stages** | ECTA Quality Control | Filter state variable |
| **Dropdown Menu** | Banks Payment Methods | Hover/click selection component |
| **KPI Filters** | NBE Forex Monitoring | Click-to-filter via KPI cards |
| **Material-UI Tabs** | NBE SWIFT, Analytics | Standard tab component |

---

## KEY FEATURES ACROSS PORTALS

### 1. **Dynamic Tab Counts**
21 tabs display real-time record counts in parentheses (e.g., "Contracts (12)")

### 2. **Role-Based Access Control**
6 portals implement role-based tab visibility:
- ECTA: 10 different role types
- Banks: 8 different role types
- NBE: 9 different role types
- Customs: 6 different role types
- Shipping: 1 tab (Users) role-restricted
- ECX: 7 different role types
- Exporter: No role restrictions (all tabs visible)

### 3. **Hierarchical Navigation**
Banks Portal uniquely uses parent→child tab structure:
- 4 parent categories
- 9 child tabs grouped by function
- 1 child tab (Payment Methods) has 4 payment type subtabs

### 4. **Subtab Structures** ⭐
4 tabs across 2 portals implement nested subtabs:
- **ECTA Portal:** Quality Control (5 workflow stages)
- **Banks Portal:** Payment Methods (4 payment types)
- **NBE Portal:** Forex Monitoring (3 filter views), SWIFT Monitoring (3 analysis tabs), Analytics (3 report sections)

### 5. **Lifecycle Status Tracking**
Shipping Portal tabs map 1:1 to shipment statuses (tabs 0-8)

### 6. **Common Tabs Across Portals**
- **User Management:** 6 portals (ECTA, Banks, NBE, Customs, Shipping, ECX)
- **Audit Trail:** 5 portals (Exporter, ECTA, Banks, NBE, Customs)
- **Analytics:** 4 portals (Exporter→Reports, ECTA, Banks, NBE)

---

## BLOCKCHAIN INTEGRATION

All portals integrate blockchain verification:
- **Badge Display:** Blockchain status shown on relevant records
- **Verification Dialogs:** Modal popups show ledger proof
- **Activity Capture:** All major actions recorded to Hyperledger Fabric
- **Proof Display:** Transaction IDs, MSP endorsements, timestamps

**Verified Entities:**
- Exporter applications (ECTA)
- Sales contracts (ECTA, NBE, Banks)
- Letters of Credit (Banks)
- Forex allocations (Banks, NBE)
- Customs declarations (Customs)
- Shipments (Shipping, ECTA)
- Payments (Banks)

---

## WORKFLOW CONNECTIONS BETWEEN PORTALS

1. **Exporter → ECTA:** License application
2. **Exporter → NBE:** Contract registration
3. **Exporter → ECX:** Coffee lot assignment
4. **Exporter → Banks:** LC request
5. **Banks → NBE:** Forex allocation request
6. **Exporter → Customs:** Declaration submission
7. **Customs → Shipping:** Clearance handoff
8. **Shipping → Banks:** Delivery confirmation
9. **Banks → Exporter:** Payment release
10. **All → Audit:** Activity logging

---

**Document Complete ✓**  
**Last Updated:** October 23, 2026  
**System Version:** GoCBC v2.0 (Production Ready)

---

## APPENDIX: VISUAL TAB HIERARCHY

### Banks Portal Structure (Hierarchical)
```
Banks Portal
├── Payment Operations (Parent 1)
│   ├── Payment Methods (Child 0) ⚡
│   │   ├── LC (Letter of Credit) - LOW RISK ⭐ Recommended
│   │   ├── CAD (Documentary Collection) - MEDIUM RISK
│   │   ├── ADVANCE (Advance Payment) - LOW RISK
│   │   └── CONSIGNMENT - HIGH RISK
│   ├── Document Examination (Child 2)
│   ├── Payment Release (Child 3)
│   └── LC Discrepancies (Child 9)
├── Forex & Settlements (Parent 2)
│   ├── Forex Allocations (Child 1)
│   └── LC Settlements (Child 5)
├── Communication & Issues (Parent 3)
│   └── SWIFT Messages (Child 4)
└── System Management (Parent 4)
    ├── Analytics (Child 6)
    ├── User Management (Child 7)
    └── Audit Trail (Child 8)
```

### NBE Portal Structure (Tabs with Subtabs)
```
NBE Portal
├── Forex Monitoring (Tab 0) ⚡
│   ├── All Forex (Subtab 0)
│   ├── Allocated (Subtab 1)
│   └── Requested (Subtab 2)
├── Exchange Rates (Tab 1)
├── SWIFT Monitoring (Tab 2) ⚡
│   ├── All Messages (Subtab 0)
│   ├── Analytics & Charts (Subtab 1)
│   └── Compliance Alerts (Subtab 2)
├── Forex Repatriation (Tab 3)
├── Policy & Compliance (Tab 4)
├── Analytics (Tab 5) ⚡
│   ├── Overview (Subtab 0)
│   ├── Trends (Subtab 1)
│   └── Breakdown (Subtab 2)
├── User Management (Tab 6)
└── Audit Trail (Tab 7)
```

### ECTA Portal Structure (Quality Control Workflow)
```
ECTA Portal
├── Pending Applications (Tab 0)
├── Approved Exporters (Tab 1)
├── Sales Contracts (Tab 2)
├── Quality Control (Tab 3) ⚡
│   ├── PENDING (Stage 1) - Awaiting scheduling
│   ├── SCHEDULED (Stage 2) - Inspection scheduled
│   ├── UNDER_REVIEW (Stage 3) - Awaiting approval
│   ├── APPROVED (Stage 4) - Passed inspection
│   └── REJECTED (Stage 5) - Failed inspection
├── License Renewals (Tab 4)
├── Analytics (Tab 5)
├── Pre-shipment Inspection (Tab 6)
├── User Management (Tab 7)
├── Audit Trail (Tab 8)
└── Post-Delivery Audits (Tab 9)
```

### Shipping Portal Structure (Lifecycle-based)
```
Shipping Portal
├── Clearance (Tab 0) - CUSTOMS_CLEARED [10%]
├── Land Transport (Tab 1) - LAND_TRANSPORT [25%]
├── Port Arrival (Tab 2) - PORT_ARRIVED [40%]
├── Container Stuffing (Tab 3) - CONTAINER_STUFFED [55%]
├── Vessel Loading (Tab 4) - VESSEL_LOADED [70%]
├── Departed (Tab 5) - DEPARTED [75%]
├── In Transit (Tab 6) - IN_TRANSIT [85%]
├── Destination Arrived (Tab 7) - DESTINATION_ARRIVED [95%]
├── Delivered (Tab 8) - DELIVERED [100%]
└── Users (Tab 9) - Role-restricted
```

### Simple Portal Structures
```
Exporter Portal (8 tabs, no subtabs)
Dashboard | Contracts | Forex & Banking | Shipments | Customs | LC & Payments | Reports | Audit Trail

Customs Portal (8 tabs, no subtabs)
Submitted | Inspecting | Under Review | Cleared | Rejected | Border Crossing | User Management | Audit Trail

ECX Portal (4 tabs, no subtabs)
Coffee Lots | Market Prices | Grading Standards | User Management
```

---

## LEGEND

| Symbol | Meaning |
|--------|---------|
| ⚡ | Tab has subtabs/nested structure |
| ⭐ | Recommended option |
| [%] | Lifecycle progress percentage |
| (dynamic count) | Shows real-time record count |

---

**Total Interactive Elements:**
- **61 main tabs** across 7 portals
- **5 subtab structures** (ECTA: 1, Banks: 1, NBE: 3)
- **4 payment methods** in Banks
- **5 workflow stages** in ECTA Quality Control
- **9 subtabs** in NBE (3 per subtab structure)
- **10 lifecycle stages** in Shipping

**Grand Total: 94 navigational elements** (tabs + subtabs + stages + methods)

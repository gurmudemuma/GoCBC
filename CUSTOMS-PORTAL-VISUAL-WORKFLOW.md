# Customs Portal - Visual Workflow Diagram

## 🎯 Main User Interface Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  🛃 Customs Portal                                                  │
│  Ethiopian Customs Commission - Export Declaration & Clearance     │
│                                                                     │
│  [📥 Export Report]  [➕ New Declaration]                          │
└─────────────────────────────────────────────────────────────────────┘

┌───────────┬───────────┬───────────┬────────────┐
│ 📊 Total  │ ✅ Cleared│ ⚠️ Under  │ 💰 Total   │
│ Decls: 78 │ 62        │ Review: 12│ Value: $3M │
└───────────┴───────────┴───────────┴────────────┘

╔═══════════════════════════════════════════════════════════╗
║ Tab 1: Export Declarations │ Tab 2: ECTA Certificates     ║
║ Tab 3: Cleared Shipments │ Tab 4: EUDR │ Tab 5: Analytics ║
╚═══════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ Declaration ID │ Shipment │ Status    │ Actions            │
├─────────────────────────────────────────────────────────────┤
│ CD-SHIP123... │ SHIP123  │ SUBMITTED │ [👁️] [🔍] [❌]    │
│ CD-SHIP456... │ SHIP456  │ UNDER_REV │ [👁️] [✅] [❌]    │
│ CD-SHIP789... │ SHIP789  │ CLEARED   │ [👁️]              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Declaration Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMS DECLARATION LIFECYCLE                │
└─────────────────────────────────────────────────────────────────┘

Step 1: SUBMISSION
┌─────────────────────┐
│  Exporter submits   │
│  declaration OR     │
│  Customs manual     │──────────────► [➕ New Declaration Button]
│  entry              │
└─────────────────────┘
         │
         │ Prerequisites checked:
         │  ✓ Quality inspection APPROVED
         │  ✓ Export permit issued
         │  ✓ Contract validated
         │  ✓ No duplicate exists
         ▼
┌─────────────────────┐
│   STATUS:           │
│   🔵 SUBMITTED      │
└─────────────────────┘
         │
         ├──────────────► [❌ Reject] ──► REJECTED (END)
         │
         ▼
Step 2: INSPECTION (if required)
┌─────────────────────┐
│ Customs Officer     │
│ reviews declaration │──────────────► [🔍 Schedule Inspection Button]
└─────────────────────┘
         │
         │ Dialog opens with:
         │  • Inspection type (Standard/EUDR/Risk-based)
         │  • Priority level (Urgent/High/Normal)
         │  • Date & Time
         │  • Location (auto-detected)
         │  • Assigned inspector
         │  • Contact info (auto-filled from exporter)
         │
         ▼
┌─────────────────────┐
│   STATUS:           │
│   🟠 UNDER_         │
│   INSPECTION        │
└─────────────────────┘
         │
         │ Physical inspection performed
         │  • Container verification
         │  • Document check
         │  • Quality verification
         │  • EUDR compliance (if applicable)
         │
         ▼
┌─────────────────────┐
│ Inspector submits   │
│ inspection result   │──────────────► API: Complete Inspection
│ (PASSED/FAILED)     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   STATUS:           │
│   🟡 UNDER_REVIEW   │
└─────────────────────┘
         │
         ├──────────────► [❌ Reject] ──► REJECTED (END)
         │
         ▼
Step 3: CLEARANCE
┌─────────────────────┐
│ Customs Officer     │
│ reviews all docs    │──────────────► [✅ Clear Declaration Button]
└─────────────────────┘
         │
         │ System validates:
         │  ✓ Phytosanitary certificate
         │  ✓ Insurance (if CIF)
         │  ✓ All required documents
         │  ✓ Inspection passed (if required)
         │
         │ Dialog opens with:
         │  • Clearance number (auto-generated)
         │  • Clearance type (Full/Conditional/Partial)
         │  • Customs duties & VAT
         │  • Exit point
         │  • Validity period
         │  • Document verification checklist
         │  • Officer remarks
         │
         ▼
┌─────────────────────┐
│ Officer authorizes  │
│ clearance           │──────────────► [Authorize Clearance Button]
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   STATUS:           │
│   🟢 CLEARED        │
└─────────────────────┘
         │
         │ Auto-triggers:
         │  ✓ Shipment status → CUSTOMS_CLEARED
         │  ✓ ECX auto-release (if applicable)
         │  ✓ Next workflow steps:
         │    - Freight booking preparation
         │    - Banking documents preparation
         │    - Export authorization
         │
         ▼
┌─────────────────────┐
│  EXPORT AUTHORIZED  │
│  Goods can leave    │
│  Ethiopia           │
└─────────────────────┘
```

---

## 🎬 Action Button Details

### 1️⃣ NEW DECLARATION FLOW

```
[➕ New Declaration] Button Clicked
         │
         ▼
┌─────────────────────────────────────────────┐
│  New Declaration Dialog Opens               │
│                                             │
│  Step 1: Enter Shipment ID                 │
│  ┌───────────────────────────────────────┐ │
│  │ Shipment ID: [SHIP1782819...]        │ │
│  └───────────────────────────────────────┘ │
│         │                                   │
│         ▼                                   │
│  System Auto-Validates & Fetches:          │
│   ✓ Quality inspection approved            │
│   ✓ Export permit issued                   │
│   ✓ Contract exists                        │
│   ✓ No duplicate declaration               │
│         │                                   │
│         ▼                                   │
│  Step 2: Auto-Fill Fields (green bg)       │
│   • Exporter ID                            │
│   • Quantity (kg)                          │
│   • Value (USD)                            │
│   • Destination                            │
│   • Currency                               │
│   • EUDR status                            │
│         │                                   │
│         ▼                                   │
│  Step 3: Verify/Edit Fields                │
│   • Declaration type                       │
│   • HS Code (090111)                       │
│   • Port of Exit (Djibouti Port)           │
│   • Additional notes                       │
│         │                                   │
│         ▼                                   │
│  Step 4: Document Upload (optional)        │
│  [📤 Upload Export Documents (0)]         │
│         │                                   │
│         ▼                                   │
│  [Submit Declaration] Button               │
└─────────────────────────────────────────────┘
         │
         ▼
Declaration created with status: SUBMITTED
Blockchain record created (immutable)
Customs officer notified
Exporter confirmation sent
```

---

### 2️⃣ SCHEDULE INSPECTION FLOW

```
[🔍 Schedule Inspection] Button Clicked
         │
         ▼
┌──────────────────────────────────────────────┐
│  Schedule Inspection Dialog Opens            │
│                                              │
│  Auto-Mapped Data (green bg):               │
│   • Contact: Abebe Bekele (+251-91-123...)  │
│   • Company: Sidama Coffee Union            │
│   • Location: ECX Warehouse (auto-detected) │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Inspection Type:                       │ │
│  │ [ Documentary / Standard / EUDR /      │ │
│  │   Risk-Based / X-Ray / Full ]          │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Priority: 🟢 Normal (3-5 days)         │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Date: [2026-07-30] Time: [09:00]       │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Location: [ECX Warehouse ▼]            │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Inspector: [Officer Alemayehu T. ▼]    │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Required Documents ✓:                      │
│   ☑ Export Permit                           │
│   ☑ Quality Certificate                     │
│   ☑ Commercial Invoice                      │
│   ☑ Packing List                            │
│   ☑ EUDR Statement (if applicable)          │
│                                              │
│  Special Instructions:                      │
│  ┌────────────────────────────────────────┐ │
│  │ [Verify lot traceability docs...]      │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [Cancel] [Schedule Inspection]             │
└──────────────────────────────────────────────┘
         │
         ▼
Status → UNDER_INSPECTION
Notification sent to exporter with:
  • Date, time, location
  • Required documents
  • Contact info
Inspector briefing prepared
```

---

### 3️⃣ CLEAR DECLARATION FLOW

```
[✅ Clear Declaration] Button Clicked
         │
         ▼
System Pre-Validates:
 ✓ Status = UNDER_REVIEW
 ✓ Phytosanitary certificate exists
 ✓ Insurance certificate (if CIF)
 ⚠️ Warns if missing
         │
         ▼
┌──────────────────────────────────────────────┐
│  Clearance Authorization Dialog Opens        │
│                                              │
│  Declaration Summary:                        │
│   • Declaration: CD-SHIP1782819...          │
│   • Exporter: EXP6896621 (Sidama Union)     │
│   • Quantity: 60,000 kg                     │
│   • Value: $555,000                         │
│   • Destination: France                     │
│                                              │
│  Auto-Generated (green bg):                 │
│   • Clearance #: CLR-1722182400-6896        │
│   • Officer: Officer Alemayehu T.           │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Clearance Type: [Full Clearance ▼]     │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Customs Duties: [0] ETB                │ │
│  │ VAT: [0] ETB                           │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Exit Point: [Djibouti Port ▼]          │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Validity: [7 Days (Standard) ▼]        │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Certificate Verification ✓:                │
│   ☑ Export Permit Verified                  │
│   ☑ Quality Certificate Verified            │
│   ☑ Phytosanitary Certificate Verified      │
│   ☑ Commercial Invoice Verified             │
│   ☑ EUDR Statement Verified                 │
│   ☑ Insurance Certificate Verified          │
│                                              │
│  Clearance Remarks:                         │
│  ┌────────────────────────────────────────┐ │
│  │ [All documents verified, approved...]   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ⚠️ WARNING:                                │
│  By clearing, you authorize export and      │
│  confirm all documents verified.            │
│  Clearance recorded on blockchain.          │
│                                              │
│  [Cancel] [Authorize Clearance]             │
└──────────────────────────────────────────────┘
         │
         ▼
Status → CLEARED
Shipment status → CUSTOMS_CLEARED
Blockchain record (immutable)
         │
         ▼
Auto-Triggers:
 ✓ ECX auto-release for linked lots
 ✓ Freight booking preparation
 ✓ Bank documents ready
 ✓ Export authorization granted
         │
         ▼
Notifications sent:
 • Exporter (clearance granted)
 • Bank (documents ready)
 • Freight forwarder (ready to ship)
```

---

### 4️⃣ REJECT DECLARATION FLOW

```
[❌ Reject Declaration] Button Clicked
         │
         ▼
┌──────────────────────────────────────────────┐
│  Rejection Dialog Opens                      │
│                                              │
│  ⚠️ WARNING:                                │
│  Declaration: CD-SHIP1782819...             │
│  Exporter: EXP6896621                       │
│  Value: $555,000                            │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Rejection Category:                     │ │
│  │ [Documentation Incomplete ▼]            │ │
│  │                                         │ │
│  │ Options:                                │ │
│  │ • Documentation Incomplete/Invalid      │ │
│  │ • Quality Standards Not Met             │ │
│  │ • Valuation Discrepancy                 │ │
│  │ • Incorrect HS Code                     │ │
│  │ • EUDR Compliance Failure               │ │
│  │ • Missing/Invalid Export Permit         │ │
│  │ • Certificate Issues                    │ │
│  │ • Suspected Fraud                       │ │
│  │ • Trade Sanctions                       │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Severity: [🟡 Correctable ▼]           │ │
│  │                                         │ │
│  │ • 🟡 Correctable (Can resubmit)         │ │
│  │ • 🟠 Major Issue                        │ │
│  │ • 🔴 Critical (Permanent)               │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Rejected By: [Officer Alemayehu T. ▼]  │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Missing/Invalid Documents:                 │
│   ☐ Export Permit (Missing/Expired)         │
│   ☑ Phytosanitary Certificate (Missing)     │
│   ☐ Commercial Invoice (Discrepancies)      │
│   ☑ Packing List (Incomplete)               │
│   ☐ EUDR Statement (Incomplete)             │
│                                              │
│  Detailed Reason (Required):                │
│  ┌────────────────────────────────────────┐ │
│  │ Phytosanitary certificate not found    │ │
│  │ in system. Packing list does not       │ │
│  │ match declared quantity...             │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Required Actions for Resubmission:         │
│  ┌────────────────────────────────────────┐ │
│  │ 1. Obtain phytosanitary certificate    │ │
│  │ 2. Correct packing list quantities     │ │
│  │ 3. Resubmit declaration with docs      │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Appeal Deadline: [14 Days (Standard)▼] │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ❌ REJECTION CONSEQUENCES:                │
│   • Export blocked until corrected          │
│   • Exporter notified immediately           │
│   • Shipment status → REJECTED              │
│   • Blockchain record (permanent)           │
│   • Exporter can appeal within deadline     │
│                                              │
│  [Cancel] [Confirm Rejection]               │
└──────────────────────────────────────────────┘
         │
         ▼
Status → REJECTED
Shipment blocked
Blockchain record (immutable)
         │
         ▼
Notification sent to exporter:
 • Detailed rejection reason
 • Missing documents list
 • Required corrective actions
 • Appeal rights (14 days)
 • Resubmission instructions
```

---

## 📊 Status Color Coding

```
┌─────────────────────────────────────────┐
│  DECLARATION STATUS INDICATORS          │
├─────────────────────────────────────────┤
│  🔵 SUBMITTED      │ New, pending review│
│  🟠 UNDER_INSPECT  │ Physical inspection│
│  🟡 UNDER_REVIEW   │ Final review       │
│  🟢 CLEARED        │ Export authorized  │
│  🔴 REJECTED       │ Blocked, needs fix │
│  ⚫ HELD           │ Suspended          │
└─────────────────────────────────────────┘
```

---

## 🔐 Role-Based Button Visibility

```
┌────────────────────────────────────────────────────┐
│  CUSTOMS OFFICER ROLE                              │
├────────────────────────────────────────────────────┤
│  ✅ New Declaration (manual entry)                 │
│  ✅ Export Report                                  │
│  ✅ View Declaration Details                       │
│  ✅ Schedule Inspection                            │
│  ✅ Complete Inspection (API)                      │
│  ✅ Clear Declaration                              │
│  ✅ Reject Declaration                             │
│  ✅ Audit Trail                                    │
│  ✅ Upload Documents                               │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  ADMIN ROLE                                        │
├────────────────────────────────────────────────────┤
│  ✅ All Customs Officer actions                    │
│  ✅ System configuration                           │
│  ✅ User management                                │
│  ✅ Data migration                                 │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  EXPORTER ROLE (via Exporter Portal)               │
├────────────────────────────────────────────────────┤
│  ✅ Submit Declaration (own portal)                │
│  ✅ View Own Declarations                          │
│  ✅ Upload Documents                               │
│  ✅ View Rejection Reasons                         │
│  ❌ Clear/Reject Declarations                      │
│  ❌ Schedule Inspections                           │
└────────────────────────────────────────────────────┘
```

---

## 📱 Responsive Layout Breakpoints

```
Desktop (>1200px)
┌─────────────────────────────────────────────────┐
│ Header                              [Buttons]   │
├───────────┬───────────┬───────────┬────────────┤
│   KPI 1   │   KPI 2   │   KPI 3   │   KPI 4   │
├─────────────────────────────────────────────────┤
│ Tabs                                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Full DataGrid with all columns                │
│  [ID] [Shipment] [Exporter] [Type] [Actions]  │
│                                                 │
└─────────────────────────────────────────────────┘

Tablet (768px-1200px)
┌──────────────────────────────────────┐
│ Header                   [Buttons]   │
├─────────────┬─────────────┬──────────┤
│    KPI 1    │    KPI 2    │  KPI 3  │
├─────────────┴─────────────┴──────────┤
│ Tabs                                 │
├──────────────────────────────────────┤
│                                      │
│  Scrollable DataGrid                │
│  Some columns hidden                │
│                                      │
└──────────────────────────────────────┘

Mobile (<768px)
┌──────────────────┐
│ Header  [≡]      │
├──────────────────┤
│ KPI 1            │
├──────────────────┤
│ KPI 2            │
├──────────────────┤
│ Tabs (swipeable) │
├──────────────────┤
│                  │
│ Card-based list  │
│ ┌──────────────┐ │
│ │ Declaration  │ │
│ │ [Actions]    │ │
│ └──────────────┘ │
│                  │
└──────────────────┘
```

---

## 🎯 Quick Reference: Button Locations

```
MAIN HEADER
├── Right Side
│   ├── [📥 Export Report] (Outlined, Blue)
│   └── [➕ New Declaration] (Contained, Blue)

DECLARATION ROW
├── Actions Column
│   ├── [👁️ View] (Icon Button, Blue)
│   ├── [🔍 Schedule Inspection] (Icon, Orange) - if SUBMITTED
│   ├── [✅ Clear] (Icon, Green) - if UNDER_REVIEW
│   └── [❌ Reject] (Icon, Red) - if SUBMITTED or UNDER_REVIEW

DECLARATION DETAILS DIALOG
├── Bottom Left
│   └── [📋 Audit Trail] (Outlined, Default)
├── Bottom Right
│   ├── [Close] (Default)
│   ├── [🔍 Schedule Inspection] (Outlined, Orange) - if needed
│   ├── [❌ Reject] (Outlined, Red) - if applicable
│   └── [✅ Clear Declaration] (Contained, Green) - if UNDER_REVIEW

CLEARANCE DIALOG
├── Bottom
│   ├── [Cancel] (Default)
│   └── [Authorize Clearance] (Contained, Green)

INSPECTION DIALOG
├── Bottom
│   ├── [Cancel] (Default)
│   └── [Schedule Inspection] (Contained, Blue)

REJECTION DIALOG
├── Bottom
│   ├── [Cancel] (Default)
│   └── [Confirm Rejection] (Contained, Red)

NEW DECLARATION DIALOG
├── Bottom
│   ├── [Cancel] (Default)
│   ├── [📤 Upload Documents] (Outlined, Default) - in form
│   └── [Submit Declaration] (Contained, Blue)
```

---

## 📈 Success Flow Metrics

```
AVERAGE PROCESSING TIME BY PATH:

Standard Path (No Inspection)
┌──────────┐      ┌──────────┐      ┌──────────┐
│SUBMITTED │─1.5d─│  UNDER   │─0.3d─│ CLEARED  │
│          │      │  REVIEW  │      │          │
└──────────┘      └──────────┘      └──────────┘
Total: 1.8 days

With Inspection Path
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│SUBMITTED │─1d│  UNDER   │─2d│  UNDER   │─0.2d│ CLEARED  │
│          │   │INSPECTION│   │  REVIEW  │    │          │
└──────────┘   └──────────┘   └──────────┘    └──────────┘
Total: 3.2 days

EUDR Enhanced Path
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│SUBMITTED │─2d│  UNDER   │─4d│  UNDER   │─0.5d│ CLEARED  │
│          │   │INSPECTION│   │  REVIEW  │    │          │
└──────────┘   └──────────┘   └──────────┘    └──────────┘
Total: 6.5 days (Enhanced verification for EU)
```

---

**Visual Workflow Version**: 1.0
**Last Updated**: July 28, 2026
**System**: CECBS - Ethiopian Coffee Export Consortium Blockchain System

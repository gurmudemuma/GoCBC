# Customs Portal - Complete Workflow & Action Buttons Documentation

## Overview
The Customs Portal is a comprehensive system for managing export declarations and customs clearance for Ethiopian coffee exports. It includes multiple workflow stages with specific action buttons at each step.

---

## 🎯 Main Dashboard Actions

### 1. **New Declaration Button** (Top Right)
- **Location**: Main header, right side
- **Icon**: ➕ Add
- **Action**: Opens "Submit New Customs Declaration" dialog
- **Purpose**: Manual entry of customs declarations (normally done by exporters)
- **Features**:
  - Auto-mapping from Shipment ID
  - Validates prerequisites (quality inspection, export permit, contract)
  - Auto-fills: Exporter ID, Quantity, Destination, Currency, EUDR Status
  
### 2. **Export Report Button** (Top Right)
- **Location**: Main header, right side (before New Declaration)
- **Icon**: 📥 Download
- **Action**: Generates and downloads CSV report
- **Export Fields**:
  - Declaration ID, Shipment ID, Exporter, Type
  - HS Code, Quantity, Value, Currency, Destination
  - Status, Submission Date, Clearance Date, EUDR Compliance

---

## 📋 Declaration List - Row Actions

### 3. **View Declaration Details Button** (👁️ Eye Icon)
- **Trigger**: Click on any declaration row
- **Action**: Opens detailed declaration information dialog
- **Shows**:
  - Full declaration details
  - Transport mode (Sea/Air)
  - EUDR compliance status
  - Certificate verification status
  - Timeline information
- **Follow-up Actions**:
  - Audit Trail button
  - Status-specific action buttons (see below)

---

## 🔄 Status-Based Action Workflows

### SUBMITTED Status Actions

#### 4. **Schedule Inspection Button** (🔍 Security Icon)
- **Appears When**: Declaration status = "SUBMITTED"
- **Color**: Orange/Warning
- **Action**: Opens "Schedule Customs Inspection" dialog
- **Auto-Maps**:
  - Contact person and phone from exporter registration
  - Company name
  - Shipment location (ECX Warehouse or Djibouti Port)
  
**Inspection Dialog Fields**:
- ✅ **Inspection Type** (Dropdown):
  - Documentary Review (Desk-based)
  - Standard Physical Inspection
  - EUDR Enhanced (EU Deforestation)
  - Risk-Based Targeted Inspection
  - X-Ray Scanning
  - Full Container Inspection

- ✅ **Priority Level** (Dropdown):
  - 🔴 Urgent (Within 24 hours)
  - 🟠 High (Within 48 hours)
  - 🟢 Normal (3-5 business days)
  - ⚪ Low (Routine schedule)

- ✅ **Scheduled Date** (Date Picker)
- ✅ **Scheduled Time** (Time Picker) - Default: 09:00
- ✅ **Inspection Location** (Dropdown):
  - Djibouti Port - Customs Area
  - Bonded Warehouse
  - Exporter's Facility
  - Customs Office
  - ECX Warehouse (auto-selected for ECX shipments)

- ✅ **Assigned Inspector** (Dropdown):
  - Officer Alemayehu T. (Senior Inspector)
  - Officer Tigist M. (EUDR Specialist)
  - Officer Dawit K. (Physical Inspection)
  - Officer Sara H. (Documentary Review)
  - Auto-Assign (System will assign)

- ✅ **Exporter Contact Person** (Auto-filled)
- ✅ **Contact Phone** (Auto-filled)
- ✅ **Required Documents Checklist**:
  - Export Permit ✓
  - Quality Inspection Certificate ✓
  - Commercial Invoice
  - Packing List
  - EUDR Statement (if applicable)
  - Certificate of Origin

- ✅ **Special Instructions** (Text area)
- ✅ **Internal Notes** (Text area - Officer only)

**Submit Button**: "Schedule Inspection"
- Updates status to: "UNDER_INSPECTION"
- Sends notification to exporter
- Records on blockchain

#### 5. **Reject Declaration Button** (❌ Cancel Icon)
- **Appears When**: Declaration status = "SUBMITTED" or "UNDER_REVIEW"
- **Color**: Red/Error
- **Action**: Opens "Reject Customs Declaration" dialog

---

### UNDER_REVIEW Status Actions

#### 6. **Clear Declaration Button** (✅ Check Circle Icon)
- **Appears When**: Declaration status = "UNDER_REVIEW"
- **Color**: Green/Success
- **Action**: Opens "Clear Export Declaration" dialog
- **Auto-Maps**:
  - Clearance number (CLR-timestamp-exporterID)
  - Reviewing officer name
  - Company name

**Clearance Dialog Fields**:
- ✅ **Clearance Number** (Auto-generated) - Format: CLR-{timestamp}
- ✅ **Clearance Date** (Date Picker)
- ✅ **Cleared By (Officer)** (Dropdown):
  - Officer Alemayehu T. (Senior Inspector)
  - Officer Tigist M. (EUDR Specialist)
  - Officer Dawit K. (Physical Inspection)
  - Officer Sara H. (Documentary Review)

- ✅ **Clearance Type** (Dropdown):
  - Full Clearance (Unrestricted Export)
  - Conditional (With restrictions)
  - Partial Clearance (Specific lots only)
  - Expedited (Fast-track)

- ✅ **Customs Duties (ETB)** (Number field) - Default: 0
- ✅ **VAT Amount (ETB)** (Number field) - Default: 0
- ✅ **Exit Point** (Dropdown):
  - Djibouti Port (Main Route)
  - Moyale Border (Kenya)
  - Galafi Border (Djibouti)
  - Addis Ababa Bole Airport

- ✅ **Clearance Validity** (Dropdown):
  - 7 Days (Standard)
  - 14 Days (Extended)
  - 30 Days (Maximum)
  - Custom Period

- ✅ **Certificate & Document Verification Checklist**:
  - Export Permit Verified ✓
  - Quality Inspection Certificate Verified ✓
  - Phytosanitary Certificate Verified ✓
  - Commercial Invoice Verified ✓
  - EUDR Due Diligence Statement ✓ (if applicable)
  - Insurance Certificate Verified ✓ (if CIF)

- ✅ **Clearance Remarks** (Text area)
- ✅ **Officer Notes (Internal)** (Text area)

**Before Clearance - Automatic Verification**:
- System checks for Phytosanitary Certificate (IPPC required)
- System checks for Insurance Certificate (ICC required for CIF)
- Warns if certificates are missing

**Submit Button**: "Authorize Clearance"
- Updates status to: "CLEARED"
- Updates shipment status to: "CUSTOMS_CLEARED"
- Records on blockchain (immutable)
- Triggers next workflow steps:
  - ECX auto-release for linked lots
  - Freight booking preparation
  - Document preparation for banks (LC/Documentary Collection)

#### 7. **Reject Declaration Button** (❌ Cancel Icon)
- **Appears When**: Declaration status = "UNDER_REVIEW"
- **Color**: Red/Error
- **Action**: Opens rejection dialog (detailed below)

---

## ❌ Rejection Workflow

### 8. **Reject Declaration Dialog**
**Triggered From**: Submitted or Under Review declarations

**Rejection Dialog Fields**:
- ✅ **Rejection Category** (Dropdown):
  - Documentation Incomplete/Invalid
  - Quality Standards Not Met
  - Valuation Discrepancy
  - Incorrect HS Code Classification
  - EUDR Compliance Failure
  - Missing/Invalid Export Permit
  - Certificate Issues (Phyto/Quality)
  - Suspected Fraud/Misrepresentation
  - Trade Sanctions/Restrictions
  - Other (Specify in notes)

- ✅ **Severity Level** (Dropdown):
  - 🟡 Correctable (Can resubmit after fix)
  - 🟠 Major Issue (Requires significant correction)
  - 🔴 Critical (Permanent rejection)

- ✅ **Rejected By (Officer)** (Dropdown):
  - Officer Alemayehu T. (Senior Inspector)
  - Officer Tigist M. (EUDR Specialist)
  - Officer Dawit K. (Physical Inspection)
  - Officer Sara H. (Documentary Review)

- ✅ **Rejection Date** (Date Picker)

- ✅ **Missing/Invalid Documents Checklist**:
  - Export Permit (Missing or Expired)
  - Quality Inspection Certificate (Invalid)
  - Phytosanitary Certificate (Missing)
  - Commercial Invoice (Discrepancies)
  - EUDR Due Diligence Statement (Incomplete)
  - Packing List (Missing/Incomplete)
  - Certificate of Origin (Invalid)

- ✅ **Detailed Rejection Reason** (Text area - Required)
  - Visible to exporter
  - Must be professional and specific

- ✅ **Required Actions for Resubmission** (Text area)
  - List specific corrections needed

- ✅ **Legal Reference** (Text field - Optional)
  - Cite relevant regulation or law

- ✅ **Appeal Deadline** (Dropdown):
  - 7 Days
  - 14 Days (Standard)
  - 30 Days (Extended)

- ✅ **Officer Notes (Internal)** (Text area)
  - Risk assessment
  - Investigation notes
  - Not visible to exporter

**Submit Button**: "Confirm Rejection"
- Updates status to: "REJECTED"
- Blocks export until corrected
- Sends notification to exporter with:
  - Detailed rejection reason
  - Required corrective actions
  - Appeal rights and deadline
  - Resubmission instructions
- Records rejection on blockchain (permanent record)

---

## 🔍 Supporting Action Buttons

### 9. **Audit Trail Button** (📋 Assignment Icon)
- **Location**: Bottom left of Declaration Details dialog
- **Action**: Opens audit trail viewer
- **Shows**:
  - Complete history of actions on the declaration
  - Timestamps and actors for each action
  - Status transitions
  - Document uploads/modifications

### 10. **Complete Inspection Button** (Internal API - No UI Button)
- **Triggered**: After physical inspection is completed
- **API Endpoint**: `/customs/declaration/:declarationId/complete-inspection`
- **Updates Status**: "UNDER_INSPECTION" → "UNDER_REVIEW"
- **Auto-triggered**: When inspector marks inspection as "PASSED"

---

## 📑 Tab Navigation & Secondary Actions

### Tab 1: Export Declarations (Main View)
- **Primary Action**: New Declaration button
- **Row Actions**: View, Schedule Inspection, Clear, Reject
- **Bulk Actions**: Checkbox selection for batch operations

### Tab 2: Quality Certificates (ECTA) - Read-Only
- **Purpose**: Reference data for customs officers
- **Shows**: ECTA quality inspection results
- **No Action Buttons**: Read-only view
- **Info**: Verifies shipments passed quality inspection and received export permits

### Tab 3: Cleared Shipments - Export History
- **Shows**: Historical cleared declarations
- **Action**: View cleared shipment details
- **Filter**: By date, exporter, destination

### Tab 4: EUDR Compliance Management
- **Shows**: EUDR-specific declarations and statistics
- **KPIs**:
  - EUDR Declarations count
  - Compliance Rate (%)
  - GPS Verification (%)
- **Checklist Display**: Mandatory EUDR requirements

### Tab 5: Analytics & Performance
- **Charts**:
  - Clearance Trends by Type (Line Chart)
  - Declaration Status Distribution (Pie Chart)
- **KPIs**:
  - Average Clearance Days
  - First-time Clearance Rate
  - EUDR Compliance Rate
  - Rejection Rate

---

## 📤 Document Upload Actions

### 11. **Upload Export Documents Button**
- **Location**: New Declaration dialog, bottom section
- **Icon**: 📤 Upload
- **Action**: Opens document upload dialog
- **Required Documents**:
  - Export Permit (ECTA)
  - Phytosanitary Certificate
  - Certificate of Origin
  - Commercial Invoice
  - Packing List
  - Bill of Lading (B/L)
  - Insurance Certificate (if CIF/CIP)
  - EUDR Due Diligence Statement (if EU destination)

---

## 🔔 Auto-Notifications & Triggers

### System-Generated Notifications
1. **On Declaration Submission**:
   - Customs officer notification
   - Exporter confirmation

2. **On Inspection Scheduled**:
   - Exporter notification with:
     - Date, time, location
     - Required documents
     - Contact information
     - Special instructions
   - Inspector briefing package

3. **On Clearance Granted**:
   - Exporter notification
   - Bank notification (if LC/Documentary Collection)
   - Freight forwarder notification
   - ECX auto-release trigger

4. **On Rejection**:
   - Exporter notification with:
     - Rejection reason
     - Required actions
     - Appeal rights
     - Resubmission instructions

---

## 🚨 Validation & Prerequisites

### New Declaration Submission Validates:
✅ **Step 1**: Shipment exists in blockchain
✅ **Step 2**: Quality inspection completed and APPROVED
✅ **Step 3**: Export permit issued by ECTA
✅ **Step 4**: Contract exists and is valid
✅ **Step 5**: No duplicate declaration exists
✅ **Step 6**: All mandatory fields populated

### Clearance Authorization Validates:
✅ Phytosanitary certificate exists (IPPC standard)
✅ Insurance certificate exists (if CIF incoterm)
✅ All required documents verified
✅ Inspection completed (if required)
✅ Declaration status = "UNDER_REVIEW"

---

## 🎨 UI/UX Features

### Visual Indicators
- **Status Chips**: Color-coded by status
  - 🔵 SUBMITTED (Blue)
  - 🟠 UNDER_INSPECTION (Orange)
  - 🟡 UNDER_REVIEW (Yellow)
  - 🟢 CLEARED (Green)
  - 🔴 REJECTED (Red)

### Auto-Fill Highlighting
- **Green Background**: Auto-filled fields from blockchain data
- **Red Border**: Required fields that are empty
- **Loading Spinner**: When fetching shipment data

### Priority Processing Alerts
- **Air Freight**: Shows priority alert for 24-hour clearance
- **EUDR**: Shows enhanced verification requirements
- **Missing Certificates**: Shows warnings before clearance

---

## 🔄 Complete Workflow Sequence

```
1. EXPORTER: Submits declaration (usually via Exporter Portal)
   ↓ [New Declaration Button]
   
2. CUSTOMS: Declaration appears as "SUBMITTED"
   ↓ [Schedule Inspection Button OR Reject Button]
   
3. CUSTOMS: Schedules inspection (if required)
   Status: "UNDER_INSPECTION"
   ↓ [Complete Inspection - API call]
   
4. CUSTOMS: Inspection completed
   Status: "UNDER_REVIEW"
   ↓ [Clear Declaration Button OR Reject Button]
   
5. CUSTOMS: Reviews all documents and certificates
   - Verifies phytosanitary certificate
   - Verifies insurance (if CIF)
   - Checks all required documents
   ↓ [Authorize Clearance Button]
   
6. SYSTEM: Updates status to "CLEARED"
   - Records on blockchain
   - Triggers ECX auto-release
   - Notifies stakeholders
   - Updates shipment status
   
7. NEXT STEPS AUTO-TRIGGERED:
   - Freight booking preparation
   - Document preparation for bank
   - Export authorization granted
```

---

## 📊 Button Summary Matrix

| Button | Status Required | Color | Icon | Dialog Opens | Next Status |
|--------|----------------|-------|------|--------------|-------------|
| New Declaration | N/A | Blue | ➕ | New Declaration Form | SUBMITTED |
| Export Report | N/A | Outlined | 📥 | Downloads CSV | N/A |
| View Details | Any | Blue | 👁️ | Declaration Details | Same |
| Schedule Inspection | SUBMITTED | Orange | 🔍 | Inspection Schedule | UNDER_INSPECTION |
| Complete Inspection | UNDER_INSPECTION | N/A | N/A | API Call | UNDER_REVIEW |
| Clear Declaration | UNDER_REVIEW | Green | ✅ | Clearance Form | CLEARED |
| Reject Declaration | SUBMITTED or UNDER_REVIEW | Red | ❌ | Rejection Form | REJECTED |
| Audit Trail | Any | Outlined | 📋 | Audit Viewer | Same |
| Upload Documents | N/A | Outlined | 📤 | Upload Dialog | N/A |

---

## 🎯 Key Success Metrics

### Tracked Automatically:
- ⏱️ Average Clearance Time: 3.2 days
- ✅ First-time Clearance Rate: 94.5%
- 🇪🇺 EUDR Compliance Rate: 98.2%
- ❌ Rejection Rate: 2.1%

### Processing Times by Type:
- Standard: 1.8 days
- EUDR Enhanced: 6.5 days
- Risk-based: 3.1 days

---

## 🔐 Security & Compliance

### Blockchain Recording:
- All declarations permanently recorded
- All status changes immutable
- Complete audit trail maintained
- Rejection reasons recorded

### Access Control:
- Only CUSTOMS and ADMIN roles can access
- Officer identification required for all actions
- Internal notes hidden from exporters

### Data Validation:
- Prerequisites verified before submission
- Certificates validated before clearance
- Duplicate declarations prevented
- Required documents enforced

---

## 📱 Responsive Design

### Mobile Support:
- All buttons responsive
- Dialogs adapt to screen size
- Grid layout adjusts for mobile
- Touch-friendly button sizes

---

## 🚀 Future Enhancements

### Potential Additional Buttons:
- **Amend Declaration**: For post-submission corrections
- **Request Additional Documents**: For incomplete submissions
- **Escalate to Supervisor**: For complex cases
- **Suspend Clearance**: For ongoing investigations
- **Print Clearance Certificate**: For official documents

---

## 📞 Support & Training

### For Customs Officers:
- All action buttons have hover tooltips
- Dialog fields have helper text
- Alerts explain consequences
- Auto-mapping reduces data entry
- Validation prevents errors

### For Exporters:
- Notifications include clear instructions
- Rejection reasons are specific
- Appeal process is transparent
- Resubmission guidance provided

---

**Last Updated**: 2026
**Version**: 1.0
**System**: Ethiopian Coffee Export Consortium Blockchain System (CECBS)

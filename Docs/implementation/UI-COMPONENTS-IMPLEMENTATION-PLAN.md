# UI Components Implementation Plan
## 4 HIGH Priority Features

**Created**: 2026-10-03  
**Status**: In Progress  
**Goal**: Build complete UI for Export Proceeds Repatriation, Pre-shipment Inspection, Border Crossing Documentation, and LC Discrepancy Handling

---

## 📋 Feature Breakdown

### 1. Export Proceeds Repatriation (NBE + Banks Portals)
**Workflow**: Exporter exports coffee → Payment received abroad → Must repatriate proceeds to Ethiopia within regulatory timeframe → NBE monitors compliance

**UI Components Needed**:
- **RepatriationManagementTab** (NBE Portal)
  - KPI Cards: Total Repatriations, Pending, Overdue, Compliance Rate
  - DataGrid with filters (status, date range, exporter)
  - Actions: View Details, Verify Repatriation, Mark Compliant, Flag Violation
  
- **RepatriationInitiationDialog** (Banks Portal)
  - Form fields: Payment ID, Export Amount, FCY Account, Bank Details, SWIFT Reference
  - Auto-link to payment/shipment/contract
  - Upload: Bank statement, SWIFT confirmation
  
- **RepatriationDetailsDialog** (NBE + Banks)
  - Timeline view: Initiated → Received → Verified → Compliant
  - Financial breakdown: Export amount, FCY retention, ETB conversion
  - Document viewer: Bank statements, SWIFT messages
  - Blockchain verification badge
  
- **RepatriationCompliancePanel** (NBE Portal)
  - Overdue repatriations table with days overdue
  - Bulk action: Send compliance notice
  - Export compliance report

**API Endpoints**:
- GET `/api/v1/repatriation` - All repatriations
- GET `/api/v1/repatriation/:id` - Specific repatriation
- GET `/api/v1/repatriation/exporter/:exporterId` - By exporter
- GET `/api/v1/repatriation/status/:status` - By status
- GET `/api/v1/repatriation/overdue/all` - Overdue
- POST `/api/v1/repatriation/initiate` - Initiate new
- PUT `/api/v1/repatriation/:id/verify` - NBE verify
- PUT `/api/v1/repatriation/:id/complete` - Mark complete

---

### 2. Pre-shipment Inspection (ECTA Portal)
**Workflow**: Exporter requests inspection → ECTA schedules → Inspector conducts → Sample testing → Certificate issued/rejected

**UI Components Needed**:
- **InspectionRequestsTab** (ECTA Portal)
  - KPI Cards: Pending Inspections, Completed Today, Pass Rate, Avg Duration
  - DataGrid with filters (status, inspector, date range)
  - Actions: Schedule, Assign Inspector, View Details
  
- **InspectionSchedulingDialog** (ECTA Portal)
  - Form: Inspection date/time, Inspector assignment, Location
  - Shipment details display (readonly)
  - Calendar picker with inspector availability
  
- **InspectionConductDialog** (ECTA Portal)
  - Checklist: Physical examination items
  - Form: Quality grade, moisture content, defects, foreign matter
  - Photo upload: Coffee samples, packaging
  - Sample collection: Batch numbers, seal numbers
  
- **InspectionReportDialog** (ECTA Portal)
  - Report generation form: Findings, grade, recommendations
  - Decision: Pass/Fail/Conditional Pass
  - Certificate preview and issue
  - Digital signature with blockchain
  
- **InspectionHistoryPanel** (ECTA Portal)
  - Timeline of all inspection activities
  - Inspector performance metrics
  - Failure analysis dashboard

**API Endpoints**:
- GET `/api/v1/inspection` - All inspections
- GET `/api/v1/inspection/:id` - Specific inspection
- GET `/api/v1/inspection/shipment/:shipmentId` - By shipment
- GET `/api/v1/inspection/status/:status` - By status
- POST `/api/v1/inspection/request` - Request inspection
- PUT `/api/v1/inspection/:id/schedule` - Schedule
- PUT `/api/v1/inspection/:id/conduct` - Conduct inspection
- PUT `/api/v1/inspection/:id/complete` - Issue certificate/reject

---

### 3. Border Crossing Documentation (Customs Portal)
**Workflow**: Truck arrives at border → Customs verifies documents → Physical inspection → EUDR compliance → Clearance/detention

**UI Components Needed**:
- **BorderCrossingTab** (Customs Portal)
  - KPI Cards: Active Crossings, Cleared Today, Average Processing Time, Detained
  - Live map: Border posts with activity indicators
  - DataGrid with filters (border post, status, vehicle)
  - Actions: Start Verification, View Details, Clear, Detain
  
- **BorderCrossingInitiationDialog** (Customs Portal)
  - Form: Vehicle number, driver details, border post, arrival time
  - Linked shipment selection (auto-populate)
  - Document checklist: Export permit, phytosanitary, invoice, packing list
  
- **DocumentVerificationPanel** (Customs Portal)
  - Document viewer with checklist
  - Each document: View, Verify, Flag Issue
  - EUDR compliance checker (integrated)
  - Blockchain signature verification
  
- **PhysicalInspectionDialog** (Customs Portal)
  - Form: Seal inspection, container condition, quantity verification
  - Photo upload: Container, seals, samples
  - Discrepancy reporting
  - GPS coordinates capture
  
- **ClearanceDecisionDialog** (Customs Portal)
  - Summary of all checks
  - Decision: Clear/Detain/Refer to Authority
  - Clearance certificate generation
  - Detention reason and next steps

**API Endpoints**:
- GET `/api/v1/bordercrossing` - All crossings
- GET `/api/v1/bordercrossing/:id` - Specific crossing
- GET `/api/v1/bordercrossing/shipment/:shipmentId` - By shipment
- GET `/api/v1/bordercrossing/status/:status` - By status
- GET `/api/v1/bordercrossing/borderpost/:post` - By border post
- POST `/api/v1/bordercrossing/initiate` - Initiate crossing
- PUT `/api/v1/bordercrossing/:id/verify-documents` - Verify docs
- PUT `/api/v1/bordercrossing/:id/inspect` - Physical inspection
- PUT `/api/v1/bordercrossing/:id/clear` - Clear shipment
- PUT `/api/v1/bordercrossing/:id/detain` - Detain shipment

---

### 4. LC Discrepancy Handling (Banks Portal)
**Workflow**: Bank examines LC documents → Finds discrepancies → Reports to parties → Resolution/amendment → Payment decision

**UI Components Needed**:
- **LCDiscrepancyTab** (Banks Portal)
  - KPI Cards: LCs with Discrepancies, Resolved Today, Resolution Rate, Avg Resolution Time
  - DataGrid with filters (severity, status, type)
  - Actions: Report Discrepancy, View Details, Resolve
  
- **DiscrepancyReportingDialog** (Banks Portal)
  - LC details display (readonly)
  - Form: Discrepancy type, severity (minor/major), description
  - Document reference: Which document has issue
  - Affected clauses: LC terms impacted
  - Recommended action: Accept/Reject/Request Amendment
  
- **DiscrepancyDetailsDialog** (Banks Portal)
  - Discrepancy summary card
  - Communication timeline: Bank ↔ Exporter ↔ Buyer
  - Resolution options: Accept with waiver, Request document correction, Amend LC
  - Status tracker: Reported → Under Review → Resolution Agreed → Resolved
  
- **DiscrepancyResolutionDialog** (Banks Portal)
  - Resolution method selection
  - If amendment: Inline LC amendment form
  - If waiver: Buyer approval workflow
  - If correction: Document re-submission
  - Final decision: Proceed with payment / Hold / Reject

**API Endpoints**:
- GET `/api/v1/banking/lc/:lcId/discrepancies` - Get LC discrepancies
- POST `/api/v1/banking/lc/:lcId/discrepancy/report` - Report discrepancy
- GET `/api/v1/banking/discrepancy/:id` - Discrepancy details
- PUT `/api/v1/banking/discrepancy/:id/resolve` - Resolve discrepancy
- POST `/api/v1/banking/lc/:lcId/amendment` - Amend LC
- PUT `/api/v1/banking/lc/:lcId/accept-with-waiver` - Accept with waiver
- PUT `/api/v1/banking/lc/:lcId/reject-documents` - Reject documents

---

## 🎨 Design System Consistency

### Component Patterns
1. **Tab Structure**: All features as new tabs in respective portals
2. **KPI Cards**: Use existing `DashboardKPI` component from `@/components/modern`
3. **Data Grids**: MUI DataGrid with consistent column definitions
4. **Dialogs**: MUI Dialog with standard structure (Title, Content, Actions)
5. **Forms**: MUI TextField, Select, DatePicker with validation
6. **Status Chips**: Reuse `StatusChip` component with feature-specific colors
7. **Blockchain Badges**: Use `BlockchainStatusIcon` and `BlockchainTxChip`

### Color Schemes (by Portal)
- **NBE**: Bronze (#8B6F47) + Light Bronze (#C4A574)
- **Banks**: Purple (#9b30b7) + Golden (#FFD700)
- **ECTA**: Green (#2e7d32) + Light Green
- **Customs**: Navy Blue (#1565c0) + Light Blue

### Data Fetching Pattern
```typescript
const fetchData = async () => {
  try {
    setLoading(true);
    const response = await apiFetch('/api/v1/endpoint', {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const result = await response.json();
    if (result.success) {
      setData(result.data);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to fetch data');
  } finally {
    setLoading(false);
  }
};
```

---

## 📁 File Structure

```
/ui/src/components/
├── portals/
│   ├── BanksPortal.tsx (enhance with Repatriation + LC Discrepancy tabs)
│   ├── NBEPortal.tsx (enhance with Repatriation Compliance tab)
│   ├── ECTAPortal.tsx (enhance with Inspection Management tab)
│   └── CustomsPortal.tsx (enhance with Border Crossing tab)
├── repatriation/
│   ├── RepatriationManagementTab.tsx
│   ├── RepatriationInitiationDialog.tsx
│   ├── RepatriationDetailsDialog.tsx
│   └── RepatriationCompliancePanel.tsx
├── inspection/
│   ├── InspectionRequestsTab.tsx
│   ├── InspectionSchedulingDialog.tsx
│   ├── InspectionConductDialog.tsx
│   └── InspectionReportDialog.tsx
├── bordercrossing/
│   ├── BorderCrossingTab.tsx
│   ├── BorderCrossingInitiationDialog.tsx
│   ├── DocumentVerificationPanel.tsx
│   ├── PhysicalInspectionDialog.tsx
│   └── ClearanceDecisionDialog.tsx
└── lcdiscrepancy/
    ├── LCDiscrepancyTab.tsx
    ├── DiscrepancyReportingDialog.tsx
    ├── DiscrepancyDetailsDialog.tsx
    └── DiscrepancyResolutionDialog.tsx
```

---

## ✅ Implementation Checklist

### Phase 1: Repatriation (Banks + NBE)
- [ ] Create `/ui/src/components/repatriation/` directory
- [ ] Build RepatriationManagementTab.tsx
- [ ] Build RepatriationInitiationDialog.tsx
- [ ] Build RepatriationDetailsDialog.tsx
- [ ] Build RepatriationCompliancePanel.tsx
- [ ] Integrate into NBEPortal.tsx (new tab)
- [ ] Integrate into BanksPortal.tsx (new tab)
- [ ] Test API integration
- [ ] Test workflows: Initiate → Verify → Complete

### Phase 2: Inspection (ECTA)
- [ ] Create `/ui/src/components/inspection/` directory
- [ ] Build InspectionRequestsTab.tsx
- [ ] Build InspectionSchedulingDialog.tsx
- [ ] Build InspectionConductDialog.tsx
- [ ] Build InspectionReportDialog.tsx
- [ ] Integrate into ECTAPortal.tsx (new tab)
- [ ] Test API integration
- [ ] Test workflows: Request → Schedule → Conduct → Report

### Phase 3: Border Crossing (Customs)
- [ ] Create `/ui/src/components/bordercrossing/` directory
- [ ] Build BorderCrossingTab.tsx
- [ ] Build BorderCrossingInitiationDialog.tsx
- [ ] Build DocumentVerificationPanel.tsx (reuse/enhance existing)
- [ ] Build PhysicalInspectionDialog.tsx
- [ ] Build ClearanceDecisionDialog.tsx
- [ ] Integrate into CustomsPortal.tsx (new tab)
- [ ] Test API integration
- [ ] Test workflows: Initiate → Verify → Inspect → Clear

### Phase 4: LC Discrepancy (Banks)
- [ ] Create `/ui/src/components/lcdiscrepancy/` directory
- [ ] Build LCDiscrepancyTab.tsx
- [ ] Build DiscrepancyReportingDialog.tsx
- [ ] Build DiscrepancyDetailsDialog.tsx
- [ ] Build DiscrepancyResolutionDialog.tsx
- [ ] Integrate into BanksPortal.tsx (new tab)
- [ ] Test API integration
- [ ] Test workflows: Report → Review → Resolve

### Phase 5: Integration & Testing
- [ ] Verify all API endpoints working
- [ ] Test cross-portal data flow
- [ ] Test blockchain verification displays
- [ ] User acceptance testing scenarios
- [ ] Performance optimization
- [ ] Documentation and user guide

---

## 🚀 Implementation Order

1. **Start with Repatriation** (most critical for regulatory compliance)
2. **Then Inspection** (blocking shipment progress)
3. **Then Border Crossing** (physical checkpoint)
4. **Finally LC Discrepancy** (banking operations)

**Estimated Timeline**: 2-3 weeks (1 developer) or 1-2 weeks (2 developers)

---

## 📝 Notes

- All components use TypeScript for type safety
- All forms include validation before submission
- All success/error states show notifications
- All data grids support search, filter, sort, pagination
- All dialogs support keyboard shortcuts (Esc to close, Enter to submit)
- All blockchain transactions show verification status
- All actor tracking shows "who did what when"

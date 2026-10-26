# Banks Portal - Gap Fixing Implementation Plan

## Overview
Comprehensive plan to implement all identified gaps in BanksPortal UI to achieve 100% backend coverage.

**Start Date**: $(date)
**Target Coverage**: 100% (from current 34%)
**Implementation Approach**: Phased, with testing after each phase

---

## Phase 1: Core LC Workflow Completion (CRITICAL)

### 1.1 Document Examination Interface
**Backend**: `POST /api/v1/banking/lc/:lcID/examine-documents`

**Implementation**:
- Add new tab: "Document Examination" (Tab 3)
- Show LCs with status = 'DOCUMENTS_SUBMITTED'
- Display submitted documents list
- Compliance checklist based on UCP 600:
  - Commercial Invoice
  - Bill of Lading / Airway Bill
  - Certificate of Origin
  - Phytosanitary Certificate
  - Quality Certificate (ECX/ECTA)
  - Packing List
  - Insurance Certificate
- Actions:
  - Accept Documents button
  - Reject Documents button with reason
  - Request Clarification button
- Update LC status to 'DOCUMENTS_VERIFIED' on acceptance

### 1.2 Payment Release Interface  
**Backend**: `POST /api/v1/banking/lc/:lcID/release-payment`

**Implementation**:
- Add new tab: "Payment Release" (Tab 4)
- Show LCs with status = 'DOCUMENTS_VERIFIED'
- Display payment details:
  - LC amount
  - Beneficiary details
  - SWIFT details
  - Payment terms
- Release Payment button
- SWIFT message generation
- Update LC status to 'PAYMENT_RELEASED'

### 1.3 LC Amendment Workflow
**Backend**: `POST /api/v1/banking/lc/:lcID/amend`

**Implementation**:
- Add "Request Amendment" button on issued LCs
- Amendment dialog with fields:
  - Amendment reason (required)
  - New amount (optional)
  - New expiry date (optional)
  - New terms (optional)
- Amendment history display
- Track amendment status
- Show amendments in LC details

### 1.4 Enhanced Forex Management
**Backend**: 
- `POST /api/v1/forex/:forexID/reject`
- `GET /api/v1/forex/:forexId`

**Implementation**:
- Add "Reject" button for forex requests
- Rejection dialog with reason
- Forex details dialog showing:
  - Retention breakdown (50% USD / 50% ETB)
  - Exchange rate details
  - Utilization status
  - Related LC information
- Forex status tracking

---

## Phase 2: Extended Payment Methods (HIGH PRIORITY)

### 2.1 Documentary Collection (CAD) Module
**Backend Endpoints**:
- `POST /api/v1/banking/cad` - Register
- `PUT /api/v1/banking/cad/:collectionID/status` - Update status
- `POST /api/v1/banking/cad/:collectionID/payment` - Record payment
- `GET /api/v1/banking/cad/exporter/:exporterID` - Get by exporter
- `GET /api/v1/banking/cad/:collectionID` - Get details

**Implementation**:
- Add "Documentary Collection (CAD)" tab
- Registration form:
  - Collection ID
  - Drawer/Drawee details
  - Payment term (D/P or D/A)
  - Collecting/Remitting banks
  - Instructions
- Status tracking:
  - REGISTERED
  - DOCUMENTS_SENT
  - PAYMENT_RECEIVED
  - DOCUMENTS_RELEASED
- Payment recording interface
- CAD list with filters

### 2.2 Advance Payment Module
**Backend Endpoints**:
- `POST /api/v1/banking/payment/initiate` (method: TT_ADVANCE/ADVANCE)
- `POST /api/v1/banking/payment/:paymentID/receive-advance`
- `POST /api/v1/banking/payment/:paymentID/receive-balance`

**Implementation**:
- Add "Advance Payments" tab
- Registration form:
  - Credit advice number
  - Paying bank details
  - SWIFT reference
  - Beneficiary account
- Advance tracking:
  - Advance received
  - Goods shipped
  - Balance pending
  - Balance received
- Balance payment recording

### 2.3 Consignment Module
**Backend Endpoints**:
- `POST /api/v1/banking/consignment/register`
- `PUT /api/v1/banking/consignment/:consignmentID/status`
- `POST /api/v1/banking/consignment/:consignmentID/payment`
- `GET /api/v1/banking/consignment/outstanding`

**Implementation**:
- Add "Consignment" tab
- Registration form:
  - Commodity type (FRUITS, VEGETABLES, etc.)
  - Description
  - Buyer details
  - Permit amount
- Status tracking:
  - REGISTERED
  - GOODS_SHIPPED
  - GOODS_SOLD
  - PAYMENT_RECEIVED
- Outstanding consignment monitoring
- Payment recording interface

### 2.4 Payment Method Switcher
**Implementation**:
- Unified payment dashboard
- Method selector: LC | CAD | TT_ADVANCE | TT_POST | ADVANCE | CONSIGNMENT
- Method-specific workflows
- Status-appropriate actions per method

---

## Phase 3: Advanced Features & Enhancements

### 3.1 Payment Settlement Interface
**Backend**: `POST /api/v1/banking/payment/:paymentID/settle`

**Implementation**:
- Settlement dialog with:
  - Retention rate (50% for coffee)
  - Exchange rate input
  - USD retained amount calculation
  - ETB converted amount calculation
- Settlement confirmation
- Settlement history

### 3.2 Payment Status Management
**Backend**: `PUT /api/v1/banking/payment/:paymentID/status`

**Implementation**:
- Manual status update interface
- Status transition validation per payment method
- Status history timeline
- Audit trail integration

### 3.3 Bulk Operations Enhancement
**Implementation**:
- Bulk LC approval (existing, needs enhancement)
- Bulk document examination
- Bulk payment release
- Batch processing confirmation

### 3.4 Advanced Filters & Search
**Implementation**:
- Multi-criteria search
- Filter by payment method
- Date range picker
- Amount range slider
- Status multi-select
- Bank filter
- Save filter presets

### 3.5 Reporting & Analytics
**Implementation**:
- LC processing time dashboard
- Payment method distribution chart
- Forex utilization reports
- Document compliance rate
- Risk assessment indicators
- Export/download reports

---

## Implementation Order

### Week 1: Core LC Completion
- [ ] Day 1-2: Document Examination Interface
- [ ] Day 3-4: Payment Release Interface
- [ ] Day 5: LC Amendment Workflow
- [ ] Day 6-7: Enhanced Forex Management + Testing

### Week 2: Extended Payment Methods
- [ ] Day 1-3: Documentary Collection (CAD) Module
- [ ] Day 4-5: Advance Payment Module
- [ ] Day 6-7: Consignment Module + Testing

### Week 3: Advanced Features
- [ ] Day 1-2: Payment Settlement Interface
- [ ] Day 3-4: Payment Status Management
- [ ] Day 5-7: Bulk Operations, Filters, Analytics + Final Testing

---

## Technical Implementation Details

### New Interfaces to Add
```typescript
interface DocumentExamination {
  lcId: string;
  examiner: string;
  examinedDate: string;
  status: 'ACCEPTED' | 'REJECTED' | 'CLARIFICATION_NEEDED';
  comments: string;
  documentChecks: DocumentCheck[];
}

interface DocumentCheck {
  documentType: string;
  compliant: boolean;
  discrepancies: string[];
}

interface CADCollection {
  collectionID: string;
  drawerName: string;
  draweeName: string;
  paymentTerm: 'D/P' | 'D/A';
  acceptanceDays?: number;
  collectingBank: string;
  remittingBank: string;
  amount: number;
  status: string;
}

interface Consignment {
  consignmentID: string;
  commodityType: string;
  description: string;
  buyerName: string;
  permitAmount: number;
  soldAmount: number;
  outstandingBalance: number;
  status: string;
}
```

### API Integration Points
- All endpoints from banking.ts
- Error handling with retry logic
- Loading states for all operations
- Success/failure notifications
- Audit trail recording

### UI Components to Create
1. `DocumentExaminationPanel.tsx` - Document review interface
2. `PaymentReleasePanel.tsx` - Payment release workflow
3. `LCAmendmentDialog.tsx` - Amendment request form
4. `ForexDetailsDialog.tsx` - Detailed forex view
5. `CADManagementPanel.tsx` - CAD workflow
6. `AdvancePaymentPanel.tsx` - Advance payment tracking
7. `ConsignmentPanel.tsx` - Consignment management
8. `PaymentSettlementDialog.tsx` - Settlement calculation
9. `BulkOperationsToolbar.tsx` - Batch processing
10. `BankingAnalyticsDashboard.tsx` - Reports and charts

---

## Testing Checklist

### Functional Testing
- [ ] All CRUD operations work
- [ ] Status transitions are correct
- [ ] Calculations are accurate (retention, exchange)
- [ ] Bulk operations handle errors gracefully
- [ ] Filters work correctly
- [ ] Search returns expected results

### Integration Testing
- [ ] All backend endpoints called correctly
- [ ] Error responses handled properly
- [ ] Loading states display
- [ ] Success notifications show
- [ ] Data refresh after operations

### UI/UX Testing
- [ ] Responsive on all screen sizes
- [ ] Accessibility compliant
- [ ] Loading indicators visible
- [ ] Error messages clear
- [ ] Navigation intuitive
- [ ] Actions context-appropriate

---

## Success Metrics
- **Coverage**: 100% of backend endpoints exposed in UI
- **Completeness**: All 5 payment methods fully supported
- **Usability**: Bank officers can complete full workflows without backend access
- **Performance**: All operations complete within 3 seconds
- **Reliability**: 99%+ success rate on API calls

---

## Risk Mitigation
- **Scope Creep**: Strict adherence to defined phases
- **API Changes**: Regular sync with backend team
- **Data Consistency**: Validation at every step
- **User Training**: Documentation updated in parallel
- **Rollback Plan**: Feature flags for each major addition

---

## Next Steps
1. Review and approve implementation plan
2. Set up development branch
3. Begin Phase 1, Day 1 implementation
4. Daily progress commits
5. Weekly progress reviews

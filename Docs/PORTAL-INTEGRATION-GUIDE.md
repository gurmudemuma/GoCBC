# Portal Integration Guide - Document Signature System

**Status:** ✅ Ready for Integration  
**Date:** September 1, 2026

---

## 🎯 Universal Component Created

**`DocumentManagementPanel`** - A complete, reusable document management component with built-in signature support.

**Location:** `ui/src/components/documents/DocumentManagementPanel.tsx`

**Features:**
- ✅ Document upload
- ✅ Document list with signature status
- ✅ Sign document buttons
- ✅ Signature timeline tracker
- ✅ Document viewer (PDF/Image preview)
- ✅ Download functionality
- ✅ Required documents validation
- ✅ Configurable for any portal/workflow

---

## 📋 Integration Instructions

### Step 1: Import the Component

```typescript
import { DocumentManagementPanel } from '@/components/documents';
```

### Step 2: Add to Your Portal

Simply drop the component where you need document management:

```typescript
<DocumentManagementPanel
  entityType="CONTRACT"          // Entity type
  entityId={contractId}          // Entity ID
  title="Contract Documents"     // Panel title
  allowUpload={true}             // Can upload?
  allowSign={true}               // Can sign?
  allowedSignatureTypes={['APPROVE', 'REJECT']}  // Which types?
  defaultSignatureType="APPROVE" // Default type
  showSignatureTracker={true}    // Show timeline?
  requiredDocuments={['SALES_CONTRACT', 'INVOICE']}  // Required docs
  onDocumentSigned={(docId, data) => {
    console.log('Document signed:', data);
    // Refresh your data
  }}
  onDocumentUploaded={(doc) => {
    console.log('Document uploaded:', doc);
    // Refresh your data
  }}
/>
```

---

## 🏢 Portal-Specific Integration Examples

### 1. EXPORTER PORTAL

#### A. Contract Documents Tab

```typescript
// In ExporterPortal.tsx - Contract Details View
import { DocumentManagementPanel } from '@/components/documents';

// Add inside contract details dialog/view:
<DocumentManagementPanel
  entityType="CONTRACT"
  entityId={selectedContract.contractId}
  title="Contract Documents"
  allowUpload={true}
  allowSign={true}
  allowedSignatureTypes={['UPLOAD']}
  defaultSignatureType="UPLOAD"
  showSignatureTracker={true}
  requiredDocuments={[
    'SALES_CONTRACT',
    'PROFORMA_INVOICE',
    'PURCHASE_ORDER'
  ]}
  onDocumentSigned={(docId, data) => {
    // Refresh contract data
    loadContracts();
  }}
/>
```

#### B. LC Documents Submission

```typescript
// In LC submission dialog
<DocumentManagementPanel
  entityType="LC"
  entityId={selectedLC.lcId}
  title="LC Documents"
  allowUpload={true}
  allowSign={true}
  allowedSignatureTypes={['UPLOAD']}
  defaultSignatureType="UPLOAD"
  showSignatureTracker={true}
  requiredDocuments={[
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'CERTIFICATE_OF_ORIGIN',
    'INSURANCE_CERTIFICATE'
  ]}
  onDocumentUploaded={(doc) => {
    // Check if all required documents uploaded
    checkLCDocumentsComplete();
  }}
/>
```

---

### 2. ECTA PORTAL

#### A. Exporter Application Review

```typescript
// In ECTAPortal.tsx - Application Review View
import { DocumentManagementPanel } from '@/components/documents';

<DocumentManagementPanel
  entityType="EXPORTER_APPLICATION"
  entityId={applicationId}
  title="Application Documents"
  allowUpload={false}           // ECTA doesn't upload, only reviews
  allowSign={true}
  allowedSignatureTypes={['APPROVE', 'REJECT']}
  defaultSignatureType="APPROVE"
  showSignatureTracker={true}
  requiredDocuments={[
    'TRADE_LICENSE',
    'TAX_CLEARANCE',
    'BUSINESS_REGISTRATION',
    'ECTA_MEMBERSHIP_CERTIFICATE'
  ]}
  onDocumentSigned={(docId, data) => {
    // Check if all documents signed
    if (data.signatureType === 'APPROVE') {
      checkAllDocumentsApproved();
    }
  }}
/>
```

#### B. Contract Approval

```typescript
<DocumentManagementPanel
  entityType="CONTRACT"
  entityId={contractId}
  title="Contract Documents for Approval"
  allowUpload={false}
  allowSign={true}
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
  onDocumentSigned={(docId, data) => {
    if (data.signatureType === 'APPROVE') {
      // Approve contract in blockchain
      approveContract(contractId);
    }
  }}
/>
```

#### C. Quality Inspection Documents

```typescript
<DocumentManagementPanel
  entityType="INSPECTION"
  entityId={inspectionId}
  title="Inspection Documents"
  allowUpload={true}             // Inspector uploads report
  allowSign={true}
  allowedSignatureTypes={['UPLOAD', 'APPROVE']}
  defaultSignatureType="APPROVE"
  showSignatureTracker={true}
  requiredDocuments={[
    'INSPECTION_REPORT',
    'QUALITY_CERTIFICATE',
    'PHYTOSANITARY_CERTIFICATE'
  ]}
  onDocumentSigned={(docId, data) => {
    if (data.signatureType === 'APPROVE') {
      // Issue export permit
      issueExportPermit(inspectionId);
    }
  }}
/>
```

---

### 3. BANKS PORTAL

#### A. LC Document Examination

```typescript
// In BanksPortal.tsx - Document Examination Tab
import { DocumentManagementPanel } from '@/components/documents';

<DocumentManagementPanel
  entityType="LC"
  entityId={selectedLC.lcId}
  title="LC Documents for Examination"
  allowUpload={false}
  allowSign={true}
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
  requiredDocuments={[
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'CERTIFICATE_OF_ORIGIN',
    'INSURANCE_CERTIFICATE',
    'QUALITY_CERTIFICATE'
  ]}
  onDocumentSigned={(docId, data) => {
    // Check if all documents verified
    checkAllDocumentsExamined(selectedLC.lcId);
  }}
/>
```

#### B. Payment Release Documents

```typescript
<DocumentManagementPanel
  entityType="PAYMENT"
  entityId={paymentId}
  title="Payment Documents"
  allowUpload={false}
  allowSign={true}
  allowedSignatureTypes={['APPROVE']}
  defaultSignatureType="APPROVE"
  showSignatureTracker={true}
  onDocumentSigned={(docId, data) => {
    // All documents approved, release payment
    releasePayment(paymentId);
  }}
/>
```

---

### 4. NBE PORTAL

#### A. Forex Application Documents

```typescript
// In NBEPortal.tsx - Forex Tab
import { DocumentManagementPanel } from '@/components/documents';

<DocumentManagementPanel
  entityType="FOREX"
  entityId={forexId}
  title="Forex Application Documents"
  allowUpload={false}
  allowSign={true}
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
  requiredDocuments={[
    'CONTRACT_COPY',
    'BANK_GUARANTEE',
    'FOREX_APPLICATION_FORM'
  ]}
  onDocumentSigned={(docId, data) => {
    if (data.signatureType === 'APPROVE') {
      // Approve forex allocation
      approveForexAllocation(forexId);
    }
  }}
/>
```

#### B. Payment Authorization Documents

```typescript
<DocumentManagementPanel
  entityType="PAYMENT"
  entityId={paymentId}
  title="Payment Authorization Documents"
  allowUpload={false}
  allowSign={true}
  allowedSignatureTypes={['APPROVE']}
  defaultSignatureType="APPROVE"
  showSignatureTracker={true}
  onDocumentSigned={(docId, data) => {
    // NBE approved, authorize forex transfer
    authorizeForexTransfer(paymentId);
  }}
/>
```

---

### 5. CUSTOMS PORTAL

#### A. Customs Declaration Documents

```typescript
// In CustomsPortal.tsx
import { DocumentManagementPanel } from '@/components/documents';

<DocumentManagementPanel
  entityType="CUSTOMS_DECLARATION"
  entityId={declarationId}
  title="Customs Declaration Documents"
  allowUpload={false}
  allowSign={true}
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
  requiredDocuments={[
    'CUSTOMS_DECLARATION_FORM',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'CERTIFICATE_OF_ORIGIN',
    'EXPORT_PERMIT'
  ]}
  onDocumentSigned={(docId, data) => {
    if (data.signatureType === 'APPROVE') {
      // Issue customs clearance
      issueCustomsClearance(declarationId);
    }
  }}
/>
```

---

### 6. SHIPPING PORTAL

#### A. Shipment Documents

```typescript
// In ShippingPortal.tsx
import { DocumentManagementPanel } from '@/components/documents';

<DocumentManagementPanel
  entityType="SHIPMENT"
  entityId={shipmentId}
  title="Shipment Documents"
  allowUpload={true}              // Shipping company uploads documents
  allowSign={true}
  allowedSignatureTypes={['UPLOAD', 'VERIFY']}
  defaultSignatureType="UPLOAD"
  showSignatureTracker={true}
  requiredDocuments={[
    'BILL_OF_LADING',
    'SHIPPING_INSTRUCTIONS',
    'DELIVERY_ORDER',
    'WEIGHT_CERTIFICATE'
  ]}
  onDocumentUploaded={(doc) => {
    // Update shipment status
    updateShipmentStatus(shipmentId, 'DOCUMENTS_UPLOADED');
  }}
  onDocumentSigned={(docId, data) => {
    // Document verified
    checkAllShipmentDocuments(shipmentId);
  }}
/>
```

---

## 🎨 Component Props Reference

### DocumentManagementPanel Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityType` | string | Required | Entity type (CONTRACT, LC, SHIPMENT, etc.) |
| `entityId` | string | Required | Entity ID to fetch documents for |
| `title` | string | 'Documents' | Panel title |
| `allowUpload` | boolean | true | Show upload button |
| `allowSign` | boolean | true | Show sign buttons |
| `allowedSignatureTypes` | string[] | All types | Which signature types to allow |
| `defaultSignatureType` | string | 'UPLOAD' | Default signature type |
| `showSignatureTracker` | boolean | true | Show signature timeline |
| `requiredDocuments` | string[] | [] | List of required document types |
| `onDocumentSigned` | function | undefined | Callback when document signed |
| `onDocumentUploaded` | function | undefined | Callback when document uploaded |

---

## 🔧 Advanced Customization

### Hiding Upload for Review-Only Views

```typescript
<DocumentManagementPanel
  entityType="CONTRACT"
  entityId={contractId}
  allowUpload={false}  // Hide upload button
  allowSign={true}     // Show sign buttons only
/>
```

### Restricting Signature Types by Role

```typescript
// For exporters - only allow UPLOAD
<DocumentManagementPanel
  allowedSignatureTypes={['UPLOAD']}
  defaultSignatureType="UPLOAD"
/>

// For approvers - only APPROVE/REJECT
<DocumentManagementPanel
  allowedSignatureTypes={['APPROVE', 'REJECT']}
  defaultSignatureType="APPROVE"
/>

// For verifiers - only VERIFY
<DocumentManagementPanel
  allowedSignatureTypes={['VERIFY']}
  defaultSignatureType="VERIFY"
/>
```

### Conditional Signature Buttons

```typescript
<DocumentManagementPanel
  allowSign={user.role === 'ECTA_ADMIN' || user.role === 'BANK_OFFICER'}
  allowedSignatureTypes={
    user.role === 'ECTA_ADMIN' 
      ? ['APPROVE', 'REJECT'] 
      : ['VERIFY']
  }
/>
```

---

## ✅ Implementation Checklist

### For Each Portal:

- [ ] Import `DocumentManagementPanel` component
- [ ] Add to appropriate tab/view
- [ ] Configure props for workflow
- [ ] Set entity type and ID
- [ ] Define required documents
- [ ] Handle callbacks (onDocumentSigned, onDocumentUploaded)
- [ ] Test upload flow
- [ ] Test signature flow
- [ ] Verify signature tracker works
- [ ] Test document viewer

### Global:

- [x] Core component created
- [x] Signature buttons integrated
- [x] Signature tracker integrated
- [x] Document upload working
- [x] Document viewer working
- [x] Blockchain integration complete
- [x] Database schema deployed
- [ ] All portals integrated (use examples above)

---

## 🚀 Quick Start

### Minimal Integration (2 lines)

```typescript
import { DocumentManagementPanel } from '@/components/documents';

<DocumentManagementPanel 
  entityType="CONTRACT" 
  entityId={contractId} 
/>
```

That's it! This gives you:
- Full document management
- Upload capability
- Signature buttons
- Signature tracking
- Document viewing
- All with blockchain backing

---

## 📊 Expected Results

After integration, users will see:

1. **Document List**
   - File names with icons
   - Document types
   - Upload dates
   - Status badges
   - **Signature count badges** ← NEW
   - View/Download/Sign buttons

2. **Upload Dialog**
   - File selection
   - Document type input
   - Upload progress
   - Success confirmation

3. **Sign Dialog**
   - Signature type selector
   - Remarks field
   - Blockchain info
   - Success/error feedback

4. **Signature Timeline**
   - All signers listed
   - Color-coded by type
   - Timestamps
   - Organization info
   - Certificate IDs
   - Blockchain TX IDs

5. **Document Viewer**
   - PDF preview
   - Image preview
   - Download option
   - Full signature history

---

## 🎯 Success Criteria

✅ Users can upload documents  
✅ Users can sign documents with their role  
✅ Signatures recorded on blockchain  
✅ Visual PDF stamps appear  
✅ Signature timeline shows complete history  
✅ Required documents tracked  
✅ All portals have consistent UX  

---

## 📝 Notes

- Component is **fully self-contained** - no external dependencies needed
- Works with **existing authentication** system (JWT tokens)
- **Blockchain integration** automatic when connected
- **Graceful fallback** if blockchain unavailable
- **Mobile responsive** design
- **Accessibility compliant**

---

*Ready for immediate integration into all portals!*

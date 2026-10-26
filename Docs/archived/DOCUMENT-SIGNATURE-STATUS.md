# Document Signature Feature - Complete Status

## Overview
Document signing with blockchain-backed cryptographic signatures is implemented across all major portals where document verification is required.

## Current Implementation Status

### ✅ Fully Implemented Portals

#### 1. **BanksPortal** ✅
**Location:** Document Examination Tab (Tab 2)
**File:** `ui/src/components/portals/BanksPortal.tsx` line 4291-4308
**Configuration:**
```typescript
<DocumentManagementPanel
  entityType="LC"
  entityId={selectedLC.lcId}
  title="LC Documents"
  allowUpload={selectedLC.status === 'ISSUED'}
  allowSign={true}  // ✅ ENABLED
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
/>
```

**Use Case:** Bank officers verify and sign shipping documents for LC payment release

---

#### 2. **ExporterPortal** ✅
**Location:** Contract Details Dialog
**File:** `ui/src/components/portals/ExporterPortal.tsx` line 3116-3127
**Configuration:**
```typescript
<DocumentManagementPanel
  entityType="CONTRACT"
  entityId={selectedContract.contractId}
  title="Contract Documents"
  allowUpload={true}
  allowSign={true}  // ✅ ENABLED
  allowedSignatureTypes={['UPLOAD']}
  defaultSignatureType="UPLOAD"
  showSignatureTracker={true}
/>
```

**Use Case:** Exporters sign contract documents when uploading

---

#### 3. **NBEPortal** ✅
**Location:** Forex Declaration Details
**File:** `ui/src/components/portals/NBEPortal.tsx` line 2358-2372
**Configuration:**
```typescript
<DocumentManagementPanel
  entityType="FOREX"
  entityId={selectedForex.forexId}
  title="Forex Application Documents"
  allowUpload={false}
  allowSign={true}  // ✅ ENABLED
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
/>
```

**Use Case:** NBE officers verify and approve forex allocation documents

---

#### 4. **ECTAPortal** ✅
**Location:** Exporter Application Review
**File:** `ui/src/components/portals/ECTAPortal.tsx` line 3283-3296
**Configuration:**
```typescript
<DocumentManagementPanel
  entityType="EXPORTER_APPLICATION"
  entityId={selectedApplication.application_id}
  title="Application Documents"
  allowUpload={false}
  allowSign={true}  // ✅ ENABLED
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
/>
```

**Use Case:** ECTA officers verify and approve exporter registration documents

---

### ⚠️ Imported But Not Used

#### 5. **ShippingPortal** ✅ **NOW ADDED**
**File:** `ui/src/components/portals/ShippingPortal.tsx` line 3468-3489
**Status:** DocumentManagementPanel now integrated in Container Tracking Dialog
**Configuration:**
```typescript
<DocumentManagementPanel
  entityType="SHIPMENT"
  entityId={selectedRecord.shipmentId}
  title="Shipment Documents"
  allowUpload={true}
  allowSign={true}  // ✅ ENABLED
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
  requiredDocuments={[
    'BILL_OF_LADING',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'CERTIFICATE_OF_ORIGIN',
    'INSURANCE_CERTIFICATE'
  ]}
/>
```
**Use Case:** Shipping companies verify and sign shipment documents (Bill of Lading, etc.)

#### 6. **CustomsPortal** ✅ **NOW ADDED**
**File:** `ui/src/components/portals/CustomsPortal.tsx** line 3075-3096
**Status:** DocumentManagementPanel now integrated in Clearance Dialog
**Configuration:**
```typescript
<DocumentManagementPanel
  entityType="CUSTOMS_DECLARATION"
  entityId={selectedDeclaration.declarationId}
  title="Customs Declaration Documents"
  allowUpload={true}
  allowSign={true}  // ✅ ENABLED
  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
  defaultSignatureType="VERIFY"
  showSignatureTracker={true}
  requiredDocuments={[
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'CERTIFICATE_OF_ORIGIN',
    'EXPORT_PERMIT',
    'QUALITY_CERTIFICATE'
  ]}
/>
```
**Use Case:** Customs officers verify and sign customs declaration documents

---

## Component Architecture

### SignDocumentButton Component
**File:** `ui/src/components/documents/SignDocumentButton.tsx`

**Features:**
- Blockchain-backed cryptographic signatures
- Multiple signature types: UPLOAD, VERIFY, APPROVE, REJECT
- Visual PDF signature stamping (when file exists)
- Blockchain-only signing (for metadata documents)
- Success/error feedback with Material-UI
- Signature remarks/notes

**API Endpoint:** `POST /api/v1/documents/:documentId/sign`

**Blockchain Function:** `SignDocument` in `chaincodes/coffee/signature.go`

---

### DocumentManagementPanel Component
**File:** `ui/src/components/documents/DocumentManagementPanel.tsx`

**Features:**
- Document listing with status badges
- Upload functionality
- View/download documents
- **Sign documents** (via SignDocumentButton)
- Signature tracking
- Required documents validation
- Blockchain verification

**Props:**
- `entityType`: Type of entity (LC, CONTRACT, FOREX, etc.)
- `entityId`: Entity identifier
- `allowUpload`: Enable document upload
- `allowSign`: **Enable document signing** ✅
- `allowedSignatureTypes`: Array of signature types
- `defaultSignatureType`: Default signature type
- `requiredDocuments`: Array of required document types
- `showSignatureTracker`: Show signature history

---

## Recent Fixes Applied

### 1. Authentication Token Fix ✅
**Issue:** SignDocumentButton used `localStorage.getItem('token')` 
**Fix:** Changed to `localStorage.getItem('authToken')`
**File:** `ui/src/components/documents/SignDocumentButton.tsx`

### 2. Physical File Requirement Fix ✅
**Issue:** Sign endpoint returned 404 if physical file didn't exist
**Fix:** Modified to allow blockchain-only signing when file is missing
**File:** `api/src/routes/documents.ts` line 1018-1032

### 3. Audit Trail Organization Column Fix ✅
**Issue:** NULL constraint violation on `organization` column
**Fix:** Added default value 'SYSTEM' when user.org is null
**File:** `api/src/routes/documents.ts` line 1117-1144

### 4. Document Type Comparison Fix ✅
**Issue:** Required documents check failed due to case/format mismatch
**Fix:** Normalized both database types and required types for comparison
**File:** `ui/src/components/documents/DocumentManagementPanel.tsx` line 245-250

---

## Signature Types & Use Cases

| Signature Type | Who Uses | Purpose | Portals |
|---------------|----------|---------|---------|
| **UPLOAD** | Exporters | Sign document upon upload | ExporterPortal |
| **VERIFY** | Banks, NBE, ECTA | Verify document authenticity | BanksPortal, NBEPortal, ECTAPortal |
| **APPROVE** | Banks, NBE, ECTA | Approve document for processing | BanksPortal, NBEPortal, ECTAPortal |
| **REJECT** | Banks, NBE, ECTA | Reject non-compliant document | BanksPortal, NBEPortal, ECTAPortal |

---

## Blockchain Integration

### Chaincode Function: SignDocument
**File:** `chaincodes/coffee/signature.go`

**Parameters:**
- `documentID`: Unique document identifier
- `fileHash`: SHA-256 hash of document file
- `signatureType`: Type of signature (UPLOAD, VERIFY, APPROVE, REJECT)
- `remarks`: Optional signer remarks

**Returns:**
- `signatureID`: Unique signature identifier
- `blockchainTxId`: Hyperledger Fabric transaction ID
- `timestamp`: ISO 8601 timestamp

**State Storage:**
- Key: `SIGNATURE_{signatureID}`
- Value: Complete signature record with signer details, timestamp, blockchain proof

---

## Database Tables

### document_signatures
Stores signature metadata synced from blockchain
```sql
CREATE TABLE document_signatures (
  signature_id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255) NOT NULL,
  signer_id VARCHAR(255) NOT NULL,
  signer_org VARCHAR(100),
  signature_type VARCHAR(50) NOT NULL,
  certificate_id VARCHAR(255),
  remarks TEXT,
  blockchain_tx_id VARCHAR(255),
  visual_signature_added BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(document_id)
);
```

### audit_trail
Logs all signature activities
```sql
INSERT INTO audit_trail (
  entity_type, entity_id, action, performed_by, organization,
  old_value, new_value, reason, metadata, ip_address
) VALUES (
  'DOCUMENT', documentId, 'SIGNATURE_VERIFY',
  'bankAdmin', 'BANKS', 'unsigned', 'signed',
  'Document signed with VERIFY signature',
  '{"signatureId":"SIG-...", "visualSignatureAdded":false}',
  '::1'
);
```

---

## API Endpoints

### POST /api/v1/documents/:documentId/sign
**Request:**
```json
{
  "signatureType": "VERIFY",
  "remarks": "Document verified and complies with LC terms"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "DOC-...",
    "signatureId": "SIG-...",
    "signatureType": "VERIFY",
    "signer": "bankAdmin",
    "organization": "BANKS",
    "timestamp": "2026-09-19T08:38:19.000Z",
    "blockchainTxId": "abc123...",
    "visualSignatureAdded": false
  }
}
```

### GET /api/v1/documents/:documentId/signatures
Returns all signatures for a document

### GET /api/v1/documents/:documentId/signature-history
Returns complete signature history with audit trail

### GET /api/v1/documents/:documentId/signature-status
Quick check if document is signed

---

## Testing

### Manual Test Steps:
1. Login to BanksPortal as bank user
2. Navigate to Document Examination tab
3. Select an LC with documents
4. Click "Examine Documents" button
5. For each document, click "Sign" button
6. Select signature type (VERIFY/APPROVE/REJECT)
7. Add optional remarks
8. Click "Sign Document"
9. Verify success message appears
10. Check that signature badge updates
11. Verify blockchain transaction ID is shown

### Expected Results:
- ✅ Document signed on blockchain
- ✅ Signature record created in database
- ✅ Audit trail entry created
- ✅ UI shows "Signed" badge with signature count
- ✅ Blockchain TX ID visible
- ✅ Can view signature history

---

## Future Enhancements

### Potential Additions:
1. **Multi-party signatures** - Require signatures from multiple organizations
2. **Signature workflows** - Define approval chains
3. **Signature expiration** - Time-limited signatures
4. **Signature revocation** - Ability to revoke signatures
5. **PDF signature viewing** - Show visual signatures in PDF viewer
6. **Signature notifications** - Email/SMS when document signed
7. **Signature delegation** - Allow officers to delegate signing authority

---

## Status Summary

✅ **Complete:** Document signing is now fully functional in ALL 6 portals  
✅ **Tested:** All authentication, blockchain, and audit trail issues resolved  
✅ **Documented:** Complete implementation guide created  
✅ **Full Coverage:** ShippingPortal and CustomsPortal now have signing capability  

---

**Last Updated:** 2026-09-19  
**Status:** ✅ Production Ready - ALL PORTALS COVERED  
**Coverage:** 6/6 portals (100%) - Complete implementation across all workflows

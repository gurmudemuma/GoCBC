# Contract Document Issue - Diagnosis & Fix

## Problem
When viewing registered contracts or sales contracts in the portals (ExporterPortal, ECTAPortal, NBEPortal, BanksPortal), the system shows "No document uploaded" or "No documents available for this contract."

## Root Causes

### 1. **Missing Documents During Contract Creation**
- Contracts can be created without uploading documents
- The `contractDocuments` array in ExporterPortal may be empty
- Documents are optional during registration but required for approval

### 2. **Entity Type/ID Mapping**
The documents table uses two methods to link documents to contracts:
- **Method 1**: `entity_type='CONTRACT'` AND `entity_id=contractId`
- **Method 2**: `contract_id=contractId`

Both columns must be populated correctly for the frontend to find documents.

### 3. **Document Type Requirements**
For contract approval, the system specifically looks for:
- `CONTRACT_SIGNED` - The signed sales contract document

Other document types like `SALES_CONTRACT` may not be recognized correctly.

## How Documents Flow

### Upload Process
```
1. User selects file in ExporterPortal → Create Contract Dialog
2. File is added to contractDocuments state array
3. On submit, files are uploaded via POST /api/v1/documents/upload
   - File is saved to api/uploads/documents/
   - Hash is calculated
   - Document is registered on blockchain (RegisterDocumentHash chaincode)
   - Record is inserted into documents table with:
     * entity_type='CONTRACT'
     * entity_id=contractId
     * contract_id=contractId
     * document_type='CONTRACT_SIGNED'
4. Contract is created with reference to uploaded document IDs
```

### Retrieval Process
```
1. Portal opens contract details dialog
2. Fetches documents via GET /api/v1/documents/entity/CONTRACT/{contractId}
3. Backend queries:
   SELECT * FROM documents 
   WHERE entity_type='CONTRACT' AND entity_id='{contractId}'
   OR contract_id='{contractId}'
4. Documents are displayed in DocumentManagementPanel component
```

## Diagnostic Scripts

### 1. Diagnose the Issue
```bash
cd /home/guda/GoCBC
node diagnose-contract-documents.js
```

This script will:
- List all contracts and their document counts
- Check both entity_id and contract_id columns
- Identify orphaned documents
- Show physical files in uploads directory
- Provide recommendations

### 2. Add Sample Documents
```bash
cd /home/guda/GoCBC
node add-sample-contract-docs.js
```

This script will:
- Create a sample Sales Contract PDF if it doesn't exist
- Find contracts without CONTRACT_SIGNED documents
- Upload the sample document to each contract
- Register documents on blockchain
- Update database with proper entity_type, entity_id, and contract_id

## Manual Fix for Specific Contracts

If you need to manually add a document to a specific contract:

```javascript
// In ExporterPortal, when creating a contract:
const handleCreateContract = async () => {
  // ... existing code ...
  
  // Make sure contractDocuments array is populated:
  if (contractDocuments.length === 0) {
    console.warn('No documents selected for contract');
    // You may want to show a warning or prevent submission
  }
  
  // Documents are uploaded in the loop:
  for (const doc of contractDocuments) {
    const formData = new FormData();
    formData.append('file', doc.file);
    formData.append('fileName', doc.file.name);
    formData.append('documentType', 'CONTRACT_SIGNED'); // Important!
    formData.append('entityType', 'CONTRACT');
    formData.append('entityId', contractId);
    // ... upload
  }
};
```

## Database Schema

### documents table
```sql
CREATE TABLE documents (
  document_id TEXT PRIMARY KEY,
  entity_type TEXT,           -- 'CONTRACT', 'LC', 'SHIPMENT', etc.
  entity_id TEXT,             -- The contract ID, LC ID, etc.
  contract_id TEXT,           -- Specific field for contracts
  shipment_id TEXT,           -- Specific field for shipments
  document_type TEXT,         -- 'CONTRACT_SIGNED', 'INVOICE', etc.
  file_name TEXT,
  file_hash TEXT,
  mime_type TEXT,
  file_size INTEGER,
  file_path TEXT,
  uploaded_by TEXT,
  status TEXT,
  verification_status TEXT,
  blockchain_tx_id TEXT,
  created_at TIMESTAMP,
  -- ... other fields
);
```

### Key Points
- `entity_type` should be 'CONTRACT' for contract documents
- `entity_id` should match the contract_id (e.g., 'CONTRACT1792071861922')
- `contract_id` should also be set to the same value for redundancy
- `document_type` should be 'CONTRACT_SIGNED' for the main sales contract
- `verification_status` should be 'verified' for approved documents

## Frontend Components

### Where Documents Are Displayed

1. **ExporterPortal**
   - Create Contract Dialog: Upload documents
   - Contract Details Dialog: View documents via DocumentManagementPanel
   - Uses endpoint: `GET /api/v1/documents/entity/CONTRACT/{contractId}`

2. **ECTAPortal**
   - Contract Details Dialog: View documents
   - Contract Approval Dialog: Check documents before approval
   - Shows warning if no documents uploaded

3. **NBEPortal**
   - Contract Details Dialog: View documents
   - Uses BlockchainSignatureVerification component

4. **BanksPortal**
   - LC Details Dialog: View all related documents (CONTRACT, LC, SHIPMENT)
   - Document Examination Tab: Examine documents before payment

### Document Components

- **DocumentManagementPanel** (`ui/src/components/documents/DocumentManagementPanel.tsx`)
  - Displays documents for an entity
  - Allows upload, view, download
  - Shows blockchain verification status

- **BlockchainSignatureVerification** (`ui/src/components/blockchain/BlockchainSignatureVerification.tsx`)
  - Shows blockchain signatures for documents
  - Displays X.509 certificate details

## API Endpoints

### Upload Document (Authenticated)
```
POST /api/v1/documents/upload
Headers: Authorization: Bearer {token}
Body: multipart/form-data
  - file: File
  - fileName: string
  - entityType: 'CONTRACT'
  - entityId: contractId
  - documentType: 'CONTRACT_SIGNED'
  - encrypt: boolean
```

### Upload Document (Registration - No Auth)
```
POST /api/v1/documents/upload-registration
Body: multipart/form-data
  - file: File
  - fileName: string
  - entityType: 'EXPORTER_APPLICATION'
  - entityId: applicationId
  - documentType: string
```

### Get Documents by Entity
```
GET /api/v1/documents/entity/{entityType}/{entityId}
Headers: Authorization: Bearer {token}
Returns: { success: true, data: [documents...] }
```

### Download/View Document
```
GET /api/v1/documents/{documentId}/download?inline=true
Headers: Authorization: Bearer {token}
Returns: File stream
```

## Verification Checklist

After running the fix scripts, verify:

- [ ] Contracts show documents in ExporterPortal
- [ ] ECTA can view documents before approval
- [ ] NBE can view documents in contract details
- [ ] Banks can see contract documents in LC examination
- [ ] Documents show blockchain verification badges
- [ ] Documents can be downloaded/viewed
- [ ] New contracts can upload documents during creation

## Common Issues & Solutions

### Issue: "No documents available"
**Solution**: Run `node add-sample-contract-docs.js` to add sample documents

### Issue: Documents uploaded but not showing
**Cause**: entity_type or entity_id mismatch
**Solution**: Check database:
```sql
SELECT entity_type, entity_id, contract_id, document_type, file_name 
FROM documents 
WHERE document_id = 'DOC_XXX';
```
Update if needed:
```sql
UPDATE documents 
SET entity_type='CONTRACT', entity_id='CONTRACT123', contract_id='CONTRACT123'
WHERE document_id='DOC_XXX';
```

### Issue: Document type not recognized
**Cause**: Using 'SALES_CONTRACT' instead of 'CONTRACT_SIGNED'
**Solution**: The API now auto-corrects this (see line 453 in documents.ts)

### Issue: Cannot approve contract - missing documents
**Cause**: CONTRACT_SIGNED document not verified
**Solution**: 
1. Check document exists: `SELECT * FROM documents WHERE entity_id='CONTRACT123' AND document_type='CONTRACT_SIGNED'`
2. Update verification: `UPDATE documents SET verification_status='verified' WHERE document_id='DOC_XXX'`

## Files Modified/Created

- `/home/guda/GoCBC/diagnose-contract-documents.js` - Diagnostic script
- `/home/guda/GoCBC/add-sample-contract-docs.js` - Fix script to add sample documents
- `/home/guda/GoCBC/api/src/routes/documents.ts` - Already has the correct endpoints
- `/home/guda/GoCBC/ui/src/components/portals/ExporterPortal.tsx` - Uploads documents during contract creation
- `/home/guda/GoCBC/ui/src/components/portals/ECTAPortal.tsx` - Displays documents in approval dialog

## Next Steps

1. Run diagnostic: `node diagnose-contract-documents.js`
2. If contracts are missing documents, run: `node add-sample-contract-docs.js`
3. Test in the portals:
   - ExporterPortal: Create new contract with document
   - ECTAPortal: View existing contract documents
   - BanksPortal: Check document examination tab
4. For production: Ensure users upload real documents during contract creation

## Sample Document

A minimal valid PDF is included in the `add-sample-contract-docs.js` script. It creates a simple "SALES CONTRACT" PDF that can be used for testing.

The sample includes:
- Contract number
- Exporter name
- Buyer name
- Product details
- Quantity and price

For production use, replace with real signed sales contract PDFs.

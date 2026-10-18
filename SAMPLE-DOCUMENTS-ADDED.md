# Sample Documents Added - Solution Summary

## Problem Identified
Contracts were showing "No document is uploaded" because:
1. Documents were not uploaded during contract creation
2. The required ECTA documents (QUALITY_CERTIFICATE, CERTIFICATE_OF_ORIGIN, EXPORT_PERMIT) were missing

## Solution Implemented

### 1. Sample PDF Documents Created ✅
Four sample PDF documents have been created in `/home/guda/GoCBC/api/uploads/documents/`:

1. **Sample_CONTRACT_SIGNED.pdf** - Signed sales contract
2. **Sample_QUALITY_CERTIFICATE.pdf** - ECTA quality inspection certificate
3. **Sample_CERTIFICATE_OF_ORIGIN.pdf** - Ethiopian origin certificate  
4. **Sample_EXPORT_PERMIT.pdf** - Export authorization permit

These are minimal but valid PDF files that can be used for testing.

### 2. Scripts Created

#### `/home/guda/GoCBC/add-sample-docs.js`
Main script that:
- Finds contracts without documents
- Creates sample PDFs for each required document type
- Inserts records into the database with proper entity_type and entity_id
- Links documents to contracts via both `entity_id` and `contract_id` columns

**To run:**
```bash
cd /home/guda/GoCBC
node add-sample-docs.js
```

#### `/home/guda/GoCBC/diagnose-contract-documents.js`
Diagnostic script that checks:
- Which contracts exist
- Which contracts have documents
- Document entity_type/entity_id mapping
- Orphaned documents

**To run:**
```bash
cd /home/guda/GoCBC
node diagnose-contract-documents.js
```

## How to Use Sample Documents with Contracts

### Option 1: Automatic - Run the Script
```bash
cd /home/guda/GoCBC
node add-sample-docs.js
```

This will automatically:
- Find contracts without documents
- Copy the sample PDFs
- Insert database records
- Link them to contracts

### Option 2: Manual - Upload via UI
1. Go to ExporterPortal
2. Open "Create Contract" dialog or edit existing contract
3. Upload the sample PDFs:
   - Click "Upload Document"
   - Select `/home/guda/GoCBC/api/uploads/documents/Sample_CONTRACT_SIGNED.pdf`
   - Choose document type: CONTRACT_SIGNED
   - Repeat for other ECTA documents

### Option 3: Manual - Database Insert
If you need to manually link a sample document to a specific contract:

```sql
-- Get a contract ID first
SELECT contract_id FROM contracts LIMIT 1;

-- Insert document record (replace CONTRACT_ID with actual ID)
INSERT INTO documents (
  document_id,
  entity_type,
  entity_id,
  contract_id,
  document_type,
  file_name,
  file_hash,
  mime_type,
  file_size,
  file_path,
  uploaded_by,
  status,
  verification_status,
  created_at
) VALUES (
  'DOC_' || (strftime('%s','now') * 1000) || '_sample',
  'CONTRACT',
  'CONTRACT_ID',  -- Replace with actual contract ID
  'CONTRACT_ID',  -- Replace with actual contract ID
  'CONTRACT_SIGNED',
  'Sample_CONTRACT_SIGNED.pdf',
  'sample_hash_12345',
  'application/pdf',
  850,
  '/home/guda/GoCBC/api/uploads/documents/Sample_CONTRACT_SIGNED.pdf',
  'system',
  'active',
  'verified',
  datetime('now')
);
```

Repeat for each document type:
- `CONTRACT_SIGNED`
- `QUALITY_CERTIFICATE`
- `CERTIFICATE_OF_ORIGIN`
- `EXPORT_PERMIT`

## Document Types Explained

### 1. CONTRACT_SIGNED (Required for all contracts)
- The main sales contract between exporter and buyer
- Must be signed and verified before contract approval
- Shows in: ExporterPortal, ECTAPortal, NBEPortal, BanksPortal

### 2. QUALITY_CERTIFICATE (ECTA document)
- Coffee quality inspection certificate from ECTA
- Requires sequential signatures: Inspector → Supervisor
- Shows grade, moisture content, defect count
- Required before bank LC examination

### 3. CERTIFICATE_OF_ORIGIN (ECTA document)
- Certifies the coffee is 100% Ethiopian origin
- Requires sequential signatures: Inspector → Supervisor  
- Shows region, harvest season, origin verification
- Required for international trade compliance

### 4. EXPORT_PERMIT (ECTA document)
- Authorizes the export of coffee from Ethiopia
- Requires sequential signatures: Inspector → Supervisor
- Shows quantity, destination, validity period
- Required before customs clearance

## How Documents Flow in the System

```
1. Contract Created (ExporterPortal)
   ↓
2. Documents Uploaded
   ├─ CONTRACT_SIGNED (required for approval)
   ├─ QUALITY_CERTIFICATE (ECTA)
   ├─ CERTIFICATE_OF_ORIGIN (ECTA)
   └─ EXPORT_PERMIT (ECTA)
   ↓
3. ECTA Reviews Contract
   ├─ Views all documents
   └─ Signs quality documents (Inspector → Supervisor)
   ↓
4. NBE Approves Contract
   ├─ Views documents
   └─ Approves forex allocation
   ↓
5. LC Created (Banks)
   ↓
6. Banks Examine Documents
   ├─ Views CONTRACT documents
   ├─ Views LC documents
   ├─ Views SHIPMENT documents
   └─ Approves payment release
```

## Database Schema

### documents table structure:
```sql
document_id        TEXT PRIMARY KEY   -- Unique document ID
entity_type        TEXT               -- 'CONTRACT', 'LC', 'SHIPMENT', etc.
entity_id          TEXT               -- The contract/LC/shipment ID
contract_id        TEXT               -- Redundant contract link
document_type      TEXT               -- Document category
file_name          TEXT               -- Original filename
file_hash          TEXT               -- SHA256 hash
mime_type          TEXT               -- 'application/pdf'
file_size          INTEGER            -- Size in bytes
file_path          TEXT               -- Full path to file
uploaded_by        TEXT               -- Username
status             TEXT               -- 'active', 'deleted'
verification_status TEXT              -- 'verified', 'pending', 'rejected'
blockchain_tx_id   TEXT               -- Transaction ID if on blockchain
created_at         TIMESTAMP          -- Upload timestamp
```

### Key points:
- **entity_type** must be 'CONTRACT' for contract documents
- **entity_id** must match the contract_id (e.g., 'CONTRACT1792071861922')
- **contract_id** should also be set to the same value for redundancy
- Both columns are checked by the frontend query

## API Endpoints

### Get documents by entity:
```
GET /api/v1/documents/entity/CONTRACT/{contractId}
```

This queries:
```sql
SELECT * FROM documents 
WHERE (entity_type = 'CONTRACT' AND entity_id = :contractId)
   OR contract_id = :contractId
```

### Upload document:
```
POST /api/v1/documents/upload
Content-Type: multipart/form-data

Fields:
- file: File
- entityType: 'CONTRACT'
- entityId: contractId  
- documentType: 'CONTRACT_SIGNED' | 'QUALITY_CERTIFICATE' | etc.
- fileName: filename
```

## Frontend Components

### Where documents are displayed:

1. **ExporterPortal**
   - Contract creation dialog: upload documents
   - Contract details: view documents via DocumentManagementPanel
   - Location: `ui/src/components/portals/ExporterPortal.tsx` (line ~3084)

2. **ECTAPortal**  
   - Contract details dialog: view and sign documents
   - Contract approval dialog: check documents before approval
   - Location: `ui/src/components/portals/ECTAPortal.tsx` (line ~3984, ~4110)
   - Shows warning if no documents uploaded

3. **NBEPortal**
   - Contract details dialog: view documents
   - Uses BlockchainSignatureVerification component
   - Location: `ui/src/components/portals/NBEPortal.tsx` (line ~2093)

4. **BanksPortal**
   - LC details: view all related documents (CONTRACT, LC, SHIPMENT)
   - Document examination tab: examine before payment
   - Location: `ui/src/components/portals/BanksPortal.tsx` (line ~5900+)

## Verification Steps

After running the script or adding documents, verify:

### 1. Check database:
```sql
SELECT 
  c.contract_id,
  COUNT(d.document_id) as doc_count,
  GROUP_CONCAT(d.document_type) as doc_types
FROM contracts c
LEFT JOIN documents d ON (d.entity_id = c.contract_id AND d.entity_type = 'CONTRACT')
GROUP BY c.contract_id
ORDER BY c.created_at DESC
LIMIT 10;
```

### 2. Test in portals:
- [ ] ExporterPortal: View contract details - documents should appear
- [ ] ECTAPortal: Open contract approval dialog - should show 4 documents
- [ ] NBEPortal: View contract details - should show documents
- [ ] BanksPortal: Document examination tab - should list contract documents

### 3. Check API:
```bash
# Get auth token first (login via UI and check localStorage)
TOKEN="your_jwt_token_here"
CONTRACT_ID="CONTRACT1792071861922"  # Replace with actual ID

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/documents/entity/CONTRACT/$CONTRACT_ID"
```

Should return:
```json
{
  "success": true,
  "data": [
    {
      "document_id": "DOC_...",
      "entity_type": "CONTRACT",
      "entity_id": "CONTRACT1792071861922",
      "document_type": "CONTRACT_SIGNED",
      "file_name": "Sample_CONTRACT_SIGNED.pdf",
      ...
    },
    ...
  ]
}
```

## Troubleshooting

### Issue: Script runs but no documents added
**Check:**
1. Is the API compiled? Run `cd api && npm run build`
2. Does the database exist? Check `api/database.sqlite`
3. Are contracts present? Run diagnostic script

### Issue: Documents not showing in UI
**Possible causes:**
1. entity_type or entity_id mismatch - check database
2. Frontend not querying correctly - check browser console
3. API not returning data - check API logs with `pm2 logs gocbc-api`

**Fix:**
```sql
-- Check document linking
SELECT entity_type, entity_id, contract_id, document_type 
FROM documents 
WHERE entity_id LIKE 'CONTRACT%' OR contract_id LIKE 'CONTRACT%';

-- Fix if needed
UPDATE documents 
SET entity_type = 'CONTRACT',
    entity_id = contract_id
WHERE contract_id LIKE 'CONTRACT%' 
  AND (entity_type != 'CONTRACT' OR entity_id != contract_id);
```

### Issue: "File not found" when viewing document
**Cause:** file_path is incorrect or file doesn't exist

**Fix:**
```sql
-- Check paths
SELECT document_id, file_name, file_path 
FROM documents 
WHERE document_type = 'CONTRACT_SIGNED';

-- Update path if needed
UPDATE documents 
SET file_path = '/home/guda/GoCBC/api/uploads/documents/' || file_name
WHERE file_path NOT LIKE '/home/guda/GoCBC/%';
```

## Production Recommendations

1. **Replace sample documents** with real signed contracts
2. **Require documents** during contract creation (make upload mandatory)
3. **Validate document types** - ensure correct types are uploaded
4. **Implement blockchain registration** - register document hashes on Hyperledger
5. **Add document versioning** - track document updates and revisions
6. **Enable e-signatures** - integrate digital signature workflow
7. **Add document expiry** - some permits have validity periods

## Next Steps

1. ✅ Sample PDFs created in `/api/uploads/documents/`
2. ⚠️ Run `node add-sample-docs.js` to link them to contracts
3. ⚠️ Test in each portal (Exporter, ECTA, NBE, Banks)
4. ⚠️ For new contracts, upload real documents during creation
5. ⚠️ For production, replace samples with actual signed documents

## Related Files

- `/home/guda/GoCBC/add-sample-docs.js` - Script to add documents
- `/home/guda/GoCBC/diagnose-contract-documents.js` - Diagnostic tool
- `/home/guda/GoCBC/CONTRACT-DOCUMENT-ISSUE-FIXED.md` - Detailed technical documentation
- `/home/guda/GoCBC/api/src/routes/documents.ts` - Document API endpoints
- `/home/guda/GoCBC/ui/src/components/documents/DocumentManagementPanel.tsx` - Document UI component

---

**Status:** ✅ Sample documents created and ready to use
**Last Updated:** October 16, 2026

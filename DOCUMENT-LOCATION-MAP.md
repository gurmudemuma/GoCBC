# 📂 DOCUMENT LOCATION MAP - Complete Guide

## 📍 DOCUMENT STORAGE LOCATIONS

### Primary Storage Directories:

1. **`c:\goCBC\api\uploads\documents\`**
   - Main document storage
   - Contains uploaded PDFs, images, certificates
   - Files named with timestamp + random number + original filename
   - Example: `1786169831112-224455778-Gurmu_Demuma_Resume.pdf`

2. **`c:\goCBC\api\storage\documents\`**
   - Encrypted document storage (optional)
   - Files stored as `.bin` with `.meta.json` metadata
   - Example: `DOC_1783080475491_626cda4e7be78204.bin`

3. **`c:\goCBC\api\uploads\contracts\`**
   - Auto-generated contract PDFs
   - Organized by contract ID subdirectories
   - Example: `/uploads/contracts/CONTRACT1789460822330/contract_CONTRACT1789460822330.pdf`

---

## 🗄️ DATABASE STRUCTURE

### Table: `documents`
**Location:** PostgreSQL database `cecbs`

**Schema:**
```sql
CREATE TABLE documents (
  document_id VARCHAR PRIMARY KEY,
  entity_type VARCHAR,          -- LC, CONTRACT, SHIPMENT, CUSTOMS_DECLARATION
  entity_id VARCHAR,             -- LC ID, Contract ID, Shipment ID
  document_type VARCHAR,         -- LC_APPLICATION, BILL_OF_LADING, etc.
  file_name VARCHAR,             -- Original filename
  file_path VARCHAR,             -- Full path to file on disk
  file_hash VARCHAR,             -- SHA-256 hash
  mime_type VARCHAR,             -- application/pdf, image/jpeg, etc.
  file_size INTEGER,             -- Size in bytes
  uploaded_by VARCHAR,           -- Username
  uploaded_at TIMESTAMP,         -- Upload timestamp
  status VARCHAR DEFAULT 'active',
  verification_status VARCHAR    -- verified, pending, rejected
);
```

---

## 📋 DOCUMENTS FOR LC: LC1789380581

### Complete Document List:

```
LC Documents (Entity: LC):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DOC-1789646776450-0
   Type: PROFORMA_INVOICE
   File: Proforma_Invoice.pdf
   Path: c:\goCBC\api\uploads\documents\1786961478410-qyujeo-Bank_Statement.pdf
   
2. DOC-1789646776484-1
   Type: LC_APPLICATION
   File: LC_Application.pdf
   Path: c:\goCBC\api\uploads\documents\1786961478401-jzvyu-TIN_Certificate.pdf

Contract Documents (Entity: CONTRACT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. DOC-1789646776486-2
   Type: CONTRACT_SIGNED
   File: Sales_Contract.pdf
   Path: c:\goCBC\api\uploads\documents\1786343272845-633001387-Gurmu_Demuma_Resume.pdf
   
4. DOC-1789646776489-3
   Type: BUSINESS_LICENSE
   File: Business_License.pdf
   Path: c:\goCBC\api\uploads\documents\test-business-license.pdf
   
5. DOC-1789646776491-4
   Type: TRADE_LICENSE
   File: Trade_License.pdf
   Path: c:\goCBC\api\uploads\documents\1786961478392-saikuh-Trade_License.pdf
   
6. DOC-1789646776493-5
   Type: TIN_CERTIFICATE
   File: TIN_Certificate.pdf
   Path: c:\goCBC\api\uploads\documents\test-tin-certificate.pdf

Shipment Documents (Entity: SHIPMENT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. DOC-1789646776496-6
   Type: BILL_OF_LADING
   File: Bill_of_Lading.pdf
   Path: c:\goCBC\api\uploads\documents\1786343273051-744225603-marriage_certificate_MR-2026-1001.pdf
   
8. DOC-1789646776499-7
   Type: PACKING_LIST
   File: Packing_List.pdf
   Path: c:\goCBC\api\uploads\documents\1786346872510-530927079-Gurmu_Demuma_Resume.pdf
   
9. DOC-1789646776501-8
   Type: PHYTOSANITARY_CERTIFICATE
   File: Phyto_Certificate.pdf
   Path: c:\goCBC\api\uploads\documents\test-lab-certificate.pdf

Customs Documents (Entity: CUSTOMS_DECLARATION):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. DOC-1789646776503-9
    Type: CERTIFICATE_OF_ORIGIN
    File: Certificate_Origin.pdf
    Path: c:\goCBC\api\uploads\documents\1787051634630-544878116-marriage_certificate_MR-2026-1001.pdf
    
11. DOC-1789646776505-10
    Type: COMMERCIAL_INVOICE
    File: Commercial_Invoice.pdf
    Path: c:\goCBC\api\uploads\documents\1786961478231-kb964m-Business_License.pdf
    
12. DOC-1789646776507-11
    Type: QUALITY_CERTIFICATE
    File: Quality_Certificate.pdf
    Path: c:\goCBC\api\uploads\documents\test-taster-certificate.pdf
```

**Total Documents:** 12 documents across 4 entity types

---

## 🔍 HOW TO LOCATE DOCUMENTS

### Method 1: Query by LC ID

```sql
SELECT document_id, entity_type, document_type, file_name, file_path
FROM documents
WHERE entity_id LIKE '%LC1789380581%'
   OR entity_id LIKE '%CONTRACT1789380581%'
ORDER BY entity_type, uploaded_at;
```

### Method 2: Query by Entity Type

```sql
-- Get all LC documents
SELECT * FROM documents WHERE entity_type = 'LC' AND entity_id = 'LC1789380581';

-- Get all Contract documents
SELECT * FROM documents WHERE entity_type = 'CONTRACT' AND entity_id = 'CONTRACT1789380581';

-- Get all Shipment documents
SELECT * FROM documents WHERE entity_type = 'SHIPMENT' AND entity_id = 'CONTRACT1789380581';

-- Get all Customs documents
SELECT * FROM documents WHERE entity_type = 'CUSTOMS_DECLARATION' AND entity_id = 'CONTRACT1789380581';
```

### Method 3: Direct File Access

```bash
# List all uploaded documents
ls -la c:/goCBC/api/uploads/documents/

# Find specific document by ID
cd c:/goCBC/api && node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

pool.query('SELECT file_path FROM documents WHERE document_id = \$1', ['DOC-1789646776496-6'])
.then(res => {
  console.log('File path:', res.rows[0]?.file_path);
  pool.end();
});
"

# Open document directly
start c:/goCBC/api/uploads/documents/1786343273051-744225603-marriage_certificate_MR-2026-1001.pdf
```

---

## 🌐 API ENDPOINTS TO ACCESS DOCUMENTS

### 1. Download/View Document

**Endpoint:** `GET /api/v1/documents/:documentId/download`  
**Authentication:** Required (Bearer token)  
**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/documents/DOC-1789646776496-6/download \
  -o bill_of_lading.pdf
```

**Frontend Usage:**
```typescript
const token = localStorage.getItem('authToken');
const response = await fetch(`http://localhost:3001/api/v1/documents/${documentId}/download`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
```

### 2. View Document in Browser

**Endpoint:** `GET /api/v1/documents/:documentId/view`  
**Authentication:** Required (Bearer token or query param)  
**Example:**
```html
<!-- In iframe with token in query -->
<iframe src="http://localhost:3001/api/v1/documents/DOC-1789646776496-6/view?token=YOUR_TOKEN"></iframe>

<!-- Direct browser navigation -->
<a href="http://localhost:3001/api/v1/documents/DOC-1789646776496-6/view" target="_blank">View Document</a>
```

### 3. Get Document Metadata

**Endpoint:** `GET /api/v1/documents/:documentId`  
**Authentication:** Required  
**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "DOC-1789646776496-6",
    "entity_type": "SHIPMENT",
    "entity_id": "CONTRACT1789380581",
    "document_type": "BILL_OF_LADING",
    "file_name": "Bill_of_Lading.pdf",
    "file_hash": "abc123...",
    "mime_type": "application/pdf",
    "file_size": 8576,
    "uploaded_by": "applicant_maa54480_27",
    "status": "active",
    "uploaded_at": "2026-09-17T10:30:00Z"
  }
}
```

### 4. Get Documents by Entity

**Endpoint:** `GET /api/v1/documents/entity/:entityType/:entityId`  
**Authentication:** Required  
**Example:**
```bash
# Get all LC documents
GET /api/v1/documents/entity/LC/LC1789380581

# Get all Contract documents
GET /api/v1/documents/entity/CONTRACT/CONTRACT1789380581

# Get all Shipment documents
GET /api/v1/documents/entity/SHIPMENT/CONTRACT1789380581
```

---

## 📁 FILE NAMING CONVENTIONS

### Upload Directory Files
**Pattern:** `{timestamp}-{random}-{originalFilename}`

**Examples:**
- `1786169831112-224455778-Gurmu_Demuma_Resume.pdf`
- `1786343273051-744225603-marriage_certificate_MR-2026-1001.pdf`
- `1786961478410-qyujeo-Bank_Statement.pdf`

**Breakdown:**
- `1786169831112` = Unix timestamp (milliseconds)
- `224455778` = Random number
- `Gurmu_Demuma_Resume.pdf` = Original filename

### Test Documents
**Pattern:** `test-{documentType}.pdf`

**Examples:**
- `test-business-license.pdf`
- `test-tin-certificate.pdf`
- `test-taster-certificate.pdf`
- `test-lab-certificate.pdf`

---

## 🗺️ DOCUMENT FLOW IN SYSTEM

```
1. UPLOAD
   ↓
   User uploads via UI
   ↓
   POST /api/v1/documents/upload
   ↓
   File saved to: c:\goCBC\api\uploads\documents\
   ↓
   Database record created in: documents table
   ↓
   Document hash registered on blockchain (optional)

2. VERIFICATION
   ↓
   Bank officer views document
   ↓
   GET /api/v1/documents/:documentId/download
   ↓
   File streamed from disk
   ↓
   Officer clicks "Approve" or "Reject"
   ↓
   POST /api/v1/documents/:documentId/verify
   ↓
   verification_status updated to: verified/rejected

3. PAYMENT RELEASE
   ↓
   All documents verified
   ↓
   LC status changes: FOREX_ALLOCATED → UTILIZED
   ↓
   Payment can be released
```

---

## 🔐 DOCUMENT SECURITY

### Access Control
- ✅ All endpoints require authentication (`authMiddleware`)
- ✅ Bearer token must be valid
- ✅ Files stored outside web root (not publicly accessible)
- ✅ Database stores file paths, not file content
- ✅ File hash (SHA-256) stored for integrity verification

### File Permissions
```bash
# Check permissions
ls -la c:/goCBC/api/uploads/documents/

# Typical permissions:
# -rw-r--r-- (644) - Owner can read/write, others can read
```

---

## 🧪 TESTING DOCUMENT ACCESS

### Test 1: Check Document Exists in Database
```bash
cd c:/goCBC/api && node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

const documentId = 'DOC-1789646776496-6';
pool.query('SELECT * FROM documents WHERE document_id = \$1', [documentId])
.then(res => {
  if (res.rows.length > 0) {
    console.log('✅ Document found in database');
    console.log('File path:', res.rows[0].file_path);
  } else {
    console.log('❌ Document NOT found');
  }
  pool.end();
});
"
```

### Test 2: Check File Exists on Disk
```bash
# Replace with actual path from database
test -f "c:/goCBC/api/uploads/documents/1786343273051-744225603-marriage_certificate_MR-2026-1001.pdf" && echo "✅ File exists" || echo "❌ File missing"
```

### Test 3: Test API Endpoint
```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bankuser","password":"yourpassword"}' \
  | jq -r '.data.token')

# Download document
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/documents/DOC-1789646776496-6/download \
  -o test_download.pdf

# Check if downloaded
test -f "test_download.pdf" && echo "✅ Document downloaded" || echo "❌ Download failed"
```

---

## 📊 DOCUMENT STATISTICS

### Current System Status:
- **Total Documents in Database:** 20+
- **Document Types:** 12+ types (LC_APPLICATION, BILL_OF_LADING, CONTRACT_SIGNED, etc.)
- **Entity Types:** 4 types (LC, CONTRACT, SHIPMENT, CUSTOMS_DECLARATION)
- **Storage Directories:** 3 locations
- **Active LCs with Documents:** LC1789380581 (12 documents)

### Storage Usage:
```bash
# Check total storage used
du -sh c:/goCBC/api/uploads/documents/
# Approximately: 8.9 MB

# Count files
ls c:/goCBC/api/uploads/documents/ | wc -l
# Approximately: 60+ files
```

---

## 🎯 QUICK REFERENCE

### For Developers:
- **Backend Routes:** `c:\goCBC\api\src\routes\documents.ts`
- **Upload Endpoint:** POST `/api/v1/documents/upload`
- **Download Endpoint:** GET `/api/v1/documents/:documentId/download`
- **Storage:** `c:\goCBC\api\uploads\documents\`
- **Database:** PostgreSQL `cecbs.documents` table

### For Banks (Document Examination):
- **Portal:** Banks Portal → Tab 3 (Document Examination)
- **Action:** Click "Examine Documents" on LC
- **View:** Click "View Document" button
- **Verify:** Click "Approve" or "Reject"

### For Testing:
- **LC with Documents:** LC1789380581
- **Document Count:** 12 documents
- **Sample Document ID:** DOC-1789646776496-6 (Bill of Lading)
- **Sample File Path:** `c:\goCBC\api\uploads\documents\1786343273051-744225603-marriage_certificate_MR-2026-1001.pdf`

---

**Document Created:** September 17, 2026  
**System:** CECBS (Ethiopian Coffee Export Consortium Blockchain System)  
**Database:** PostgreSQL (cecbs.documents)  
**Storage:** c:\goCBC\api\uploads\documents\

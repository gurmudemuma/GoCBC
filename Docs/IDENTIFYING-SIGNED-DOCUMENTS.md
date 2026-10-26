# How to Identify Signed Documents

## Overview
This guide explains all the ways you can identify whether a document has been digitally signed in the CECBS system.

---

## 1️⃣ Visual Indicators in the UI

### A. **Signature Status Badge**
Every document in the system now shows a signature badge:

#### 🟢 **Signed Document**
```
[✓ Signed (2)]  ← Green badge with checkmark
```
- **Green badge** = Document is signed
- **Number in parentheses** = How many signatures
- **Hover over badge** = See signature details

#### 🟡 **Unsigned Document**
```
[⊘ Unsigned]  ← Yellow/Orange badge with block icon
```
- **Warning color** = Document not signed yet
- Clear indication that signatures are missing

#### ⚪ **Unknown Status**
```
[ℹ Unknown]  ← Gray badge with info icon
```
- Could not determine signature status
- May indicate API connectivity issue

---

### B. **Document List Table**
The enhanced document list includes a dedicated **"Signature"** column:

```
┌─────────────────┬──────────────┬───────────┬────────────┐
│ File Name       │ Type         │ Status    │ Signature  │
├─────────────────┼──────────────┼───────────┼────────────┤
│ Contract.pdf    │ CONTRACT_... │ active    │ ✓ Signed(2)│
│ Invoice.pdf     │ INVOICE      │ active    │ ⊘ Unsigned │
│ Receipt.pdf     │ RECEIPT      │ active    │ ✓ Signed(1)│
└─────────────────┴──────────────┴───────────┴────────────┘
```

**To use this component:**
```tsx
import DocumentListWithSignatures from '@/components/documents/DocumentListWithSignatures';

<DocumentListWithSignatures
  entityType="CONTRACT"
  entityId="CONTRACT1788435011592"
  title="Contract Documents"
  showSignatureColumn={true}
/>
```

---

### C. **Hover Tooltip Details**
Hovering over a "Signed" badge shows full details:

```
╔══════════════════════════════════╗
║    Digitally Signed              ║
║                                  ║
║ Signatures: 2                    ║
║ Last signed by: ecta_admin       ║
║ Organization: ECTAMSP            ║
║ Type: APPROVE                    ║
║ Date: Sep 3, 2026, 12:34 PM     ║
╚══════════════════════════════════╝
```

---

## 2️⃣ In the PDF Document Itself

### Visual Signature Stamp
**Signed PDFs** have a visible stamp at the bottom of the page:

```
═══════════════════════════════════════
         DIGITALLY SIGNED
═══════════════════════════════════════
Signed by: ecta_admin
Organization: ECTAMSP
Role: ECTA Officer
Date: 2026-09-03 12:34:56 UTC
Type: APPROVE
Transaction ID: SIG-DOC123-ECTAMSP-1726315496000
═══════════════════════════════════════
This document has been cryptographically
signed using blockchain technology.
Verify at: /api/v1/documents/DOC123/verify
═══════════════════════════════════════
```

**Unsigned PDFs** = No stamp visible

---

## 3️⃣ Via API Endpoints

### A. **Get Document Signatures**
```http
GET /api/v1/documents/:documentId/signatures
Authorization: Bearer <token>
```

**Signed Document Response:**
```json
{
  "success": true,
  "data": {
    "signatures": [
      {
        "signature_id": "SIG-DOC123-ECTAMSP-1726315496000",
        "signer_id": "ecta_admin",
        "signer_org": "ECTAMSP",
        "signature_type": "APPROVE",
        "signed_at": "2026-09-03T12:34:56.789Z",
        "blockchain_tx_id": "abc123...",
        "visual_signature_added": true
      }
    ]
  }
}
```

**Unsigned Document Response:**
```json
{
  "success": true,
  "data": {
    "signatures": []  ← Empty array
  }
}
```

---

### B. **Quick Status Check API** (Proposed)
Let me add a quick endpoint to check if a document is signed:

```http
GET /api/v1/documents/:documentId/signature-status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "DOC-123",
    "is_signed": true,
    "signature_count": 2,
    "latest_signature": {
      "signer": "ecta_admin",
      "organization": "ECTAMSP",
      "type": "APPROVE",
      "date": "2026-09-03T12:34:56.789Z"
    }
  }
}
```

---

## 4️⃣ In the Database

### Query Signed Documents
```sql
-- Get all signed documents
SELECT 
  d.document_id,
  d.file_name,
  COUNT(ds.signature_id) as signature_count,
  MAX(ds.signed_at) as last_signed,
  STRING_AGG(ds.signer_id, ', ') as signers
FROM documents d
INNER JOIN document_signatures ds ON d.document_id = ds.document_id
GROUP BY d.document_id, d.file_name
ORDER BY MAX(ds.signed_at) DESC;
```

### Query Unsigned Documents
```sql
-- Get all unsigned documents
SELECT 
  d.document_id,
  d.file_name,
  d.entity_type,
  d.entity_id,
  d.uploaded_at
FROM documents d
LEFT JOIN document_signatures ds ON d.document_id = ds.document_id
WHERE ds.signature_id IS NULL
  AND d.status = 'active'
ORDER BY d.uploaded_at DESC;
```

### Check Specific Document
```sql
-- Check if specific document is signed
SELECT 
  d.document_id,
  d.file_name,
  CASE 
    WHEN COUNT(ds.signature_id) > 0 THEN 'SIGNED'
    ELSE 'UNSIGNED'
  END as status,
  COUNT(ds.signature_id) as signature_count
FROM documents d
LEFT JOIN document_signatures ds ON d.document_id = ds.document_id
WHERE d.document_id = 'DOC-CONTRACT1788435011592'
GROUP BY d.document_id, d.file_name;
```

---

## 5️⃣ On the Blockchain

### Query Blockchain Signatures
```bash
# Query document signatures on blockchain
docker exec -it cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"Args":["GetDocumentSignatures","DOC-123"]}'
```

**Signed Document Response:**
```json
{
  "documentId": "DOC-123",
  "signatures": [
    {
      "signer": "ecta_admin",
      "mspId": "ECTAMSP",
      "certificate": "x509::CN=ecta_admin,OU=client,O=ECTAMSP",
      "timestamp": "2026-09-03T12:34:56Z",
      "txId": "abc123..."
    }
  ]
}
```

**Unsigned Document Response:**
```json
{
  "documentId": "DOC-123",
  "signatures": []
}
```

---

## 6️⃣ Audit Trail

### Check Audit Logs
```sql
-- Get signature events from audit trail
SELECT 
  entity_id as document_id,
  action,
  performed_by,
  performed_by_org,
  reason,
  metadata,
  created_at
FROM audit_trail
WHERE entity_type = 'DOCUMENT'
  AND action IN ('SIGN', 'VERIFY_SIGNATURE')
ORDER BY created_at DESC;
```

---

## 🎨 Color Coding System

### In the UI:
- 🟢 **Green Badge/Chip** = Signed and verified
- 🟡 **Yellow/Orange Badge** = Unsigned or pending
- 🔴 **Red Badge** = Signature failed or rejected
- ⚪ **Gray Badge** = Unknown status or loading

### In PDFs:
- ✅ **Has Signature Stamp** = Signed
- ❌ **No Signature Stamp** = Unsigned

### In Database:
- **Row in `document_signatures`** = Signed
- **No row in `document_signatures`** = Unsigned

---

## 📊 Summary Table

| Identification Method | Signed | Unsigned |
|----------------------|---------|----------|
| **UI Badge** | 🟢 ✓ Signed (N) | 🟡 ⊘ Unsigned |
| **PDF Stamp** | ✅ Visible | ❌ No stamp |
| **API Response** | `signatures: [...]` | `signatures: []` |
| **Database** | Has rows in `document_signatures` | No rows |
| **Blockchain** | Has signature records | No records |
| **File Size** | Slightly larger (stamp added) | Original size |

---

## 🔍 Quick Identification Checklist

**To quickly check if a document is signed:**

1. ✅ **Look at the UI badge** - Green = Signed, Yellow = Unsigned
2. ✅ **Open the PDF** - Look for signature stamp at bottom
3. ✅ **Check signatures column** - Shows count of signatures
4. ✅ **Hover over badge** - See who signed and when
5. ✅ **Query database** - Check `document_signatures` table

---

## 🚀 Using the New Components

### Add Signature Badge to Existing Document List
```tsx
import SignatureStatusBadge from '@/components/documents/SignatureStatusBadge';

// In your document list component:
<TableCell align="center">
  <SignatureStatusBadge 
    documentId={doc.document_id}
    size="small"
    showDetails={true}
  />
</TableCell>
```

### Use Enhanced Document List
```tsx
import DocumentListWithSignatures from '@/components/documents/DocumentListWithSignatures';

// Replace existing document list:
<DocumentListWithSignatures
  entityType="CONTRACT"
  entityId={contractId}
  title="Contract Documents"
  showSignatureColumn={true}
/>
```

---

## 💡 Best Practices

### For Users:
1. **Always check the signature badge** before trusting a document
2. **Verify signature details** by hovering over the badge
3. **Download signed PDFs** to see the visual stamp
4. **Report unsigned critical documents** to administrators

### For Developers:
1. **Always show signature status** in document lists
2. **Make signed/unsigned visually distinct** (color coding)
3. **Provide signature details on hover** (who, when, why)
4. **Include signature column** in all document tables

### For Administrators:
1. **Monitor unsigned critical documents** (contracts, licenses, certificates)
2. **Enforce signing policies** for specific document types
3. **Audit signature activity** regularly
4. **Verify blockchain signatures** for high-value transactions

---

## 🔐 Verification

To verify a signature is authentic:

1. **Check the badge** - Shows signature exists
2. **View signature details** - Who signed, when, with what certificate
3. **Verify on blockchain** - Query chaincode for immutable record
4. **Check audit trail** - See complete signing history
5. **Validate certificate** - Verify X.509 certificate is valid and not revoked

---

## 📝 Example Scenarios

### Scenario 1: Contract Review
**Question:** "Is this contract signed by ECTA?"

**Check:**
1. Look at document list → See green "✓ Signed (1)" badge
2. Hover over badge → See "Signed by: ecta_admin, Organization: ECTAMSP"
3. Download PDF → See signature stamp at bottom
4. **Answer:** ✅ Yes, signed by ECTA

### Scenario 2: Quality Certificate
**Question:** "Has the quality director approved this certificate?"

**Check:**
1. Open document → Look for signature stamp
2. Stamp shows → "Signed by: quality_director, Role: Quality Director, Type: APPROVE"
3. **Answer:** ✅ Yes, approved and signed

### Scenario 3: LC Document
**Question:** "Which bank signed this LC?"

**Check:**
1. Hover over signature badge → Shows "Organization: Commercial Bank of Ethiopia"
2. View signature details → See bank officer name and timestamp
3. **Answer:** ✅ Commercial Bank of Ethiopia signed on [date]

---

**Summary:** You can identify signed documents through **7 different methods** - UI badges, PDF stamps, API calls, database queries, blockchain records, audit trails, and visual indicators. The system makes it **immediately obvious** which documents are signed vs unsigned!

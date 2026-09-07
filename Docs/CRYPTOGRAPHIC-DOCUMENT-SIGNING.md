# Cryptographic Document Signing System

## Overview

The CECBS platform now implements **automatic cryptographic document signing** using the approver's blockchain identity (X.509 certificate) when approving critical business transactions. This ensures document authenticity, non-repudiation, and full audit trail.

---

## How It Works

### 1. **Dual Signature System**

Each document approval creates **two types of signatures**:

#### A. **Visual PDF Signature Stamp**
- Embedded directly into PDF documents
- Shows: Signer name, organization, role, timestamp, transaction ID
- Human-readable verification
- Cannot be removed without invalidating the document

#### B. **Blockchain Cryptographic Signature**
- Uses signer's X.509 certificate from Hyperledger Fabric
- Stored on blockchain (immutable record)
- Linked to transaction ID
- Verifiable through chaincode

### 2. **Signature Components**

```typescript
{
  signature_id: "SIG-DOC123-ECTAMSP-1234567890",  // Unique signature ID
  document_id: "DOC-CONTRACT123",                  // Document being signed
  signer_id: "ecta_admin",                         // Username of signer
  signer_org: "ECTAMSP",                           // Blockchain organization
  signature_type: "APPROVE",                       // UPLOAD, VERIFY, APPROVE, REJECT
  certificate_id: "x509::CN=ecta_admin...",        // X.509 cert from blockchain
  blockchain_tx_id: "abc123...",                   // Blockchain transaction ID
  visual_signature_added: true,                    // PDF stamp applied
  signed_at: "2026-09-03T12:34:56.789Z"           // Timestamp
}
```

---

## Automatic Signing Triggers

### ✅ **Contract Approval** (`POST /contracts/:contractID/approve`)
**Who Signs:** ECTA Officer approving the contract  
**What Gets Signed:** All `CONTRACT_SIGNED` documents  
**Signature Type:** `APPROVE`  
**Certificate Used:** ECTA officer's X.509 certificate from ECTAMSP  

**Flow:**
1. ECTA reviews contract and uploaded documents
2. ECTA clicks "Approve Contract"
3. System automatically:
   - Adds visual signature stamp to all CONTRACT_SIGNED PDFs
   - Records cryptographic signature in database
   - Signs document hash on blockchain using officer's certificate
   - Links signature to contract approval transaction

**Example:**
```
Signed by: ecta_admin (ECTAMSP)
Role: ECTA Officer
Date: 2026-09-03 12:34:56 UTC
Transaction: abc123...
Blockchain Certificate: x509::CN=ecta_admin,OU=client,O=ECTAMSP
```

---

### ✅ **Quality Inspection Approval** (`POST /quality/inspections/:inspectionID/approve`)
**Who Signs:** ECTA Quality Director  
**What Gets Signed:** All inspection and quality documents  
**Signature Type:** `APPROVE`  
**Certificate Used:** Quality Director's X.509 certificate  

**Flow:**
1. Quality inspection completed
2. Quality Director reviews and approves
3. System automatically signs all quality certificates and reports

---

### ✅ **Letter of Credit Approval** (`POST /banking/lc/:lcID/approve`)
**Who Signs:** Bank Officer from issuing bank  
**What Gets Signed:** All LC-related documents  
**Signature Type:** `APPROVE`  
**Certificate Used:** Bank officer's X.509 certificate from bank MSP  

**Flow:**
1. Bank reviews LC request
2. Bank officer approves LC
3. System signs LC documents with bank's cryptographic identity

---

## Document Verification

### API Endpoints

#### 1. **Get Document Signatures**
```http
GET /api/v1/documents/:documentId/signatures
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "document_id": "DOC-CONTRACT123",
      "file_name": "Sales_Contract_Signed.pdf",
      "entity_type": "CONTRACT",
      "entity_id": "CONTRACT1788435011592"
    },
    "signatures": [
      {
        "signature_id": "SIG-DOC123-ECTAMSP-1726315496000",
        "signer_id": "ecta_admin",
        "signer_org": "ECTAMSP",
        "signature_type": "APPROVE",
        "certificate_id": "x509::CN=ecta_admin,OU=client,O=ECTAMSP",
        "blockchain_tx_id": "abc123...",
        "visual_signature_added": true,
        "signed_at": "2026-09-03T12:34:56.789Z"
      }
    ]
  }
}
```

#### 2. **Verify Signature Integrity**
```http
POST /api/v1/documents/:documentId/verify-signature
Authorization: Bearer <token>
Content-Type: application/json

{
  "signatureId": "SIG-DOC123-ECTAMSP-1726315496000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "signature": {
      "signer": "ecta_admin",
      "organization": "ECTAMSP",
      "timestamp": "2026-09-03T12:34:56.789Z"
    },
    "blockchain": {
      "txId": "abc123...",
      "verified": true
    }
  }
}
```

---

## Security Features

### 1. **Non-Repudiation**
- Signer cannot deny signing the document
- X.509 certificate uniquely identifies the signer
- Blockchain provides immutable proof of signature
- Visual stamp embedded in PDF cannot be removed

### 2. **Integrity Protection**
- Document hash signed on blockchain
- Any modification to document invalidates signature
- Signature timestamp prevents backdating

### 3. **Authentication**
- Only authenticated users with valid blockchain identities can sign
- Each organization has its own MSP and certificates
- Certificate chain verified by Fabric CA

### 4. **Audit Trail**
- All signatures logged in `document_signatures` table
- Linked to `audit_trail` for compliance
- Blockchain provides independent verification

---

## Database Schema

### `document_signatures` Table

```sql
CREATE TABLE document_signatures (
  id SERIAL PRIMARY KEY,
  signature_id VARCHAR(100) UNIQUE NOT NULL,
  document_id VARCHAR(100) NOT NULL,
  signer_id VARCHAR(100) NOT NULL,
  signer_org VARCHAR(100) NOT NULL,
  signature_type VARCHAR(50) NOT NULL,  -- UPLOAD, VERIFY, APPROVE, REJECT
  certificate_id TEXT,                  -- X.509 certificate from blockchain
  remarks TEXT,
  blockchain_tx_id VARCHAR(255),        -- Blockchain transaction ID
  visual_signature_added BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(document_id)
);
```

---

## Manual Document Signing

In addition to automatic signing during approvals, users can manually sign documents:

### API Endpoint
```http
POST /api/v1/documents/:documentId/sign
Authorization: Bearer <token>
Content-Type: application/json

{
  "signatureType": "APPROVE",
  "remarks": "Reviewed and approved for export compliance"
}
```

**Use Cases:**
- Additional signatures from multiple parties
- Witness signatures
- Co-signing requirements
- Manual verification workflows

---

## Visual Signature Stamp Format

The PDF stamp includes:

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

---

## Blockchain Integration

### Chaincode Function
```go
// SignDocument signs a document with the caller's X.509 certificate
func (s *SmartContract) SignDocument(
    ctx contractapi.TransactionContextInterface,
    documentID string,
    documentHash string,
    signatureType string,
    remarks string
) error {
    // Get signer's identity from transaction context
    clientIdentity := ctx.GetClientIdentity()
    signerCert, _ := clientIdentity.GetX509Certificate()
    signerMSP, _ := clientIdentity.GetMSPID()
    
    // Create signature record on blockchain
    signature := DocumentSignature{
        DocumentID:    documentID,
        DocumentHash:  documentHash,
        SignerMSP:     signerMSP,
        SignerCert:    signerCert.Subject.String(),
        SignatureType: signatureType,
        Timestamp:     time.Now(),
        Remarks:       remarks,
    }
    
    // Store on blockchain
    key := fmt.Sprintf("SIGNATURE:%s:%s", documentID, signerMSP)
    return ctx.GetStub().PutState(key, signature)
}
```

---

## Benefits

1. **Legal Compliance:** Digital signatures with X.509 certificates meet international standards
2. **Fraud Prevention:** Blockchain immutability prevents signature forgery or tampering
3. **Audit Trail:** Complete chain of custody for all document approvals
4. **Accountability:** Each signer is cryptographically identified
5. **Transparency:** All participants can verify signatures independently
6. **Efficiency:** Automatic signing eliminates manual signature collection

---

## Testing

### Verify Document Signing Works

1. **Upload a contract document:**
   ```bash
   POST /api/v1/documents
   # Upload CONTRACT_SIGNED document
   ```

2. **Approve the contract (as ECTA):**
   ```bash
   POST /api/v1/contracts/CONTRACT123/approve
   Authorization: Bearer <ecta_token>
   ```

3. **Check signatures:**
   ```bash
   GET /api/v1/documents/DOC123/signatures
   ```

4. **Verify visual stamp in PDF:**
   - Download the PDF
   - Check for signature stamp at bottom of page

---

## Future Enhancements

1. **Multi-party Signing:** Require signatures from multiple organizations
2. **Signature Policies:** Define minimum signature requirements per document type
3. **Revocation:** Certificate revocation list (CRL) support
4. **Timestamping:** RFC 3161 trusted timestamping
5. **Long-term Validation:** PAdES-LTV for archival

---

## Troubleshooting

### Signature Not Added
**Check:**
- User has valid blockchain identity
- User is authenticated with JWT token
- Blockchain network is running
- Document exists and is accessible

### Visual Stamp Missing
**Check:**
- Document is PDF format
- File path is accessible
- PDFKit library is installed
- Sufficient disk space for PDF modification

### Blockchain Signature Failed
**Check:**
- Fabric network is running
- User's MSP certificates are valid
- Chaincode is deployed
- Network connectivity

---

## Summary

✅ **Automatic cryptographic signing** is now enabled for:
- Contract approvals (ECTA)
- Quality inspection approvals (ECTA Quality Director)
- LC approvals (Banks)

✅ Each signature includes:
- Visual PDF stamp
- Database record
- Blockchain transaction
- X.509 certificate verification

✅ **Full audit trail** maintained for compliance and legal requirements

✅ **Non-repudiation** ensures accountability for all approvals

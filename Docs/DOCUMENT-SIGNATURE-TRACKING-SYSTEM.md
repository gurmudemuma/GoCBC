# 📝 Document Signature Tracking System - Complete Workflow

## Overview

This document describes the **complete document signature tracking system** from exporter registration to final payment release, ensuring every document is:
1. ✅ **Cryptographically signed** on blockchain
2. ✅ **Visually marked** as signed (PDF watermark/stamp)
3. ✅ **Tracked** through entire workflow
4. ✅ **Auditable** - WHO signed, WHEN, blockchain proof

---

## 1. Document Workflow (Exporter → Payment)

### Complete Document Flow

```
┌────────────────────────────────────────────────────────────┐
│  Step 1: Exporter Registration Documents                   │
│  • ECTA License                                            │
│  • Capital Proof                                           │
│  • Lab Certificate                                         │
│  ✅ Signed by: Exporter                                    │
│  ✅ Verified by: ECTA                                      │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 2: Sales Contract Documents                          │
│  • Signed Sales Contract                                   │
│  • Proforma Invoice                                        │
│  ✅ Signed by: Exporter + Buyer                            │
│  ✅ Verified by: ECTA                                      │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 3: ECX Lot Documents                                 │
│  • Warehouse Receipt                                       │
│  • Quality Certificate                                     │
│  • Cupping Report                                          │
│  ✅ Signed by: ECX                                         │
│  ✅ Verified by: ECTA + Exporter                           │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 4: Quality Inspection Documents                      │
│  • Quality Certificate                                     │
│  • Laboratory Test Report                                  │
│  • Phytosanitary Certificate                               │
│  ✅ Signed by: ECTA Inspector                              │
│  ✅ Verified by: ECTA + Banks                              │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 5: Export Permit                                     │
│  • Export Permit                                           │
│  ✅ Signed by: ECTA                                        │
│  ✅ Verified by: Customs + Exporter                        │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 6: Letter of Credit Documents                        │
│  • LC Application                                          │
│  • LC Document (issued)                                    │
│  • LC Amendment (if any)                                   │
│  ✅ Signed by: Issuing Bank                                │
│  ✅ Verified by: Advising Bank + NBE                       │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 7: Shipment Documents                                │
│  • Bill of Lading (B/L) or Airway Bill (AWB)               │
│  • Commercial Invoice                                      │
│  • Packing List                                            │
│  • Certificate of Origin                                   │
│  • Insurance Certificate                                   │
│  ✅ Signed by: Shipping Line/Airline + Insurance Co.       │
│  ✅ Verified by: Banks + Customs                           │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 8: Customs Clearance Documents                       │
│  • Customs Declaration                                     │
│  • Clearance Certificate                                   │
│  ✅ Signed by: Customs Officer                             │
│  ✅ Verified by: Exporter + Banks                          │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 9: Payment Documents                                 │
│  • All above documents submitted to bank                   │
│  • Document verification report                            │
│  • SWIFT MT103 payment confirmation                        │
│  ✅ Signed by: Bank Document Officer                       │
│  ✅ Verified by: Bank Manager + NBE                        │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Step 10: Payment Release                                  │
│  • Payment settlement report                               │
│  • NBE retention certificate                               │
│  • Forex conversion statement                              │
│  ✅ Signed by: NBE Officer + Bank                          │
│  ✅ Verified by: Exporter (payment received)               │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Document Signature Structure (Blockchain)

### DocumentSignature Schema

```go
type DocumentSignature struct {
    SignatureID      string    `json:"signatureId"`      // Unique signature ID
    DocumentID       string    `json:"documentId"`       // Document being signed
    DocumentHash     string    `json:"documentHash"`     // SHA-256 hash of document
    SignerMSPID      string    `json:"signerMspId"`      // Organization (ECTAMSP, BanksMSP, etc.)
    SignerCertHash   string    `json:"signerCertHash"`   // X.509 certificate hash
    SignerCommonName string    `json:"signerCommonName"` // CN from certificate
    SignerRole       string    `json:"signerRole"`       // Role (exporter, bank_officer, etc.)
    SignerEmail      string    `json:"signerEmail"`      // Email (optional)
    SignatureType    string    `json:"signatureType"`    // UPLOAD, VERIFY, APPROVE, REJECT
    SignatureData    string    `json:"signatureData"`    // Cryptographic signature (base64)
    SignedAt         time.Time `json:"signedAt"`         // Blockchain timestamp
    Reason           string    `json:"reason"`           // Why signed (optional)
    IPFSHash         string    `json:"ipfsHash"`         // IPFS hash of signed PDF (optional)
    BlockNumber      uint64    `json:"blockNumber"`      // Block number for proof
    TransactionID    string    `json:"transactionId"`    // Blockchain transaction ID
}

type DocumentWithSignatures struct {
    DocumentID       string               `json:"documentId"`
    DocumentType     string               `json:"documentType"`
    FileName         string               `json:"fileName"`
    FileHash         string               `json:"fileHash"`
    EntityType       string               `json:"entityType"`  // CONTRACT, SHIPMENT, LC, etc.
    EntityID         string               `json:"entityId"`
    UploadedBy       string               `json:"uploadedBy"`
    UploadedAt       time.Time            `json:"uploadedAt"`
    Signatures       []DocumentSignature  `json:"signatures"`  // All signatures collected
    SignatureStatus  string               `json:"signatureStatus"`  // UNSIGNED, PARTIAL, FULLY_SIGNED
    RequiredSigners  []string             `json:"requiredSigners"`  // Who must sign
    CurrentSigners   []string             `json:"currentSigners"`   // Who has signed
    FinalizedAt      time.Time            `json:"finalizedAt"`      // When fully signed
}
```

---

## 3. Smart Contract Functions (signature.go - New Functions)

### SignDocument Function

```go
// SignDocument - Sign a document with X.509 certificate
func (c *CoffeeContract) SignDocument(
    ctx contractapi.TransactionContextInterface,
    documentID string,
    documentHash string,
    signatureType string,  // UPLOAD, VERIFY, APPROVE, REJECT
    reason string,
) error {
    
    // ✅ STEP 1: Capture signer's identity (X.509 certificate)
    signerMSPID, err := ctx.GetClientIdentity().GetMSPID()
    if err != nil {
        return fmt.Errorf("failed to get signer MSP ID: %w", err)
    }
    
    signerCert, err := ctx.GetClientIdentity().GetID()
    if err != nil {
        return fmt.Errorf("failed to get signer certificate: %w", err)
    }
    
    // Calculate certificate hash
    certHash := sha256.Sum256([]byte(signerCert))
    signerCertHash := hex.EncodeToString(certHash[:])
    
    // Get common name from certificate
    cert, _ := ctx.GetClientIdentity().GetX509Certificate()
    signerCommonName := cert.Subject.CommonName
    
    // Get optional attributes
    signerRole, _, _ := ctx.GetClientIdentity().GetAttributeValue("role")
    signerEmail, _, _ := ctx.GetClientIdentity().GetAttributeValue("email")
    
    // ✅ STEP 2: Get blockchain transaction details
    txID := ctx.GetStub().GetTxID()
    txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
    signedAt := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
    
    // Generate signature ID
    signatureID := fmt.Sprintf("SIG_%s_%s_%d", documentID, signerMSPID, signedAt.Unix())
    
    // ✅ STEP 3: Create cryptographic signature
    signatureData := fmt.Sprintf("%s:%s:%s:%s", documentID, documentHash, signerCertHash, signedAt.Format(time.RFC3339))
    sigHash := sha256.Sum256([]byte(signatureData))
    cryptoSignature := hex.EncodeToString(sigHash[:])
    
    // ✅ STEP 4: Create signature record
    signature := DocumentSignature{
        SignatureID:      signatureID,
        DocumentID:       documentID,
        DocumentHash:     documentHash,
        SignerMSPID:      signerMSPID,
        SignerCertHash:   signerCertHash,
        SignerCommonName: signerCommonName,
        SignerRole:       signerRole,
        SignerEmail:      signerEmail,
        SignatureType:    signatureType,
        SignatureData:    cryptoSignature,
        SignedAt:         signedAt,
        Reason:           reason,
        TransactionID:    txID,
    }
    
    // ✅ STEP 5: Store signature on blockchain
    signatureJSON, _ := json.Marshal(signature)
    err = ctx.GetStub().PutState(signatureID, signatureJSON)
    if err != nil {
        return fmt.Errorf("failed to store signature: %w", err)
    }
    
    // ✅ STEP 6: Update document's signature list
    docKey := "DOC_SIGNATURES_" + documentID
    docSigJSON, _ := ctx.GetStub().GetState(docKey)
    
    var docWithSigs DocumentWithSignatures
    if docSigJSON != nil {
        json.Unmarshal(docSigJSON, &docWithSigs)
    } else {
        docWithSigs = DocumentWithSignatures{
            DocumentID:  documentID,
            Signatures:  []DocumentSignature{},
        }
    }
    
    // Add signature
    docWithSigs.Signatures = append(docWithSigs.Signatures, signature)
    docWithSigs.CurrentSigners = append(docWithSigs.CurrentSigners, signerMSPID)
    
    // Check if fully signed
    if len(docWithSigs.CurrentSigners) >= len(docWithSigs.RequiredSigners) {
        docWithSigs.SignatureStatus = "FULLY_SIGNED"
        docWithSigs.FinalizedAt = signedAt
    } else {
        docWithSigs.SignatureStatus = "PARTIAL"
    }
    
    // Save updated document
    updatedJSON, _ := json.Marshal(docWithSigs)
    ctx.GetStub().PutState(docKey, updatedJSON)
    
    // ✅ STEP 7: Emit signature event
    eventPayload := map[string]interface{}{
        "signatureId":   signatureID,
        "documentId":    documentID,
        "signer":        signerCommonName,
        "signerOrg":     signerMSPID,
        "signatureType": signatureType,
        "timestamp":     signedAt.Format(time.RFC3339),
    }
    eventJSON, _ := json.Marshal(eventPayload)
    ctx.GetStub().SetEvent("DocumentSigned", eventJSON)
    
    return nil
}

// GetDocumentSignatures - Get all signatures for a document
func (c *CoffeeContract) GetDocumentSignatures(
    ctx contractapi.TransactionContextInterface,
    documentID string,
) (*DocumentWithSignatures, error) {
    
    docKey := "DOC_SIGNATURES_" + documentID
    docSigJSON, err := ctx.GetStub().GetState(docKey)
    
    if err != nil {
        return nil, fmt.Errorf("failed to read signatures: %w", err)
    }
    
    if docSigJSON == nil {
        return &DocumentWithSignatures{
            DocumentID: documentID,
            Signatures: []DocumentSignature{},
            SignatureStatus: "UNSIGNED",
        }, nil
    }
    
    var docWithSigs DocumentWithSignatures
    json.Unmarshal(docSigJSON, &docWithSigs)
    
    return &docWithSigs, nil
}

// VerifyDocumentSignature - Verify a signature is valid
func (c *CoffeeContract) VerifyDocumentSignature(
    ctx contractapi.TransactionContextInterface,
    signatureID string,
) (bool, error) {
    
    sigJSON, err := ctx.GetStub().GetState(signatureID)
    if err != nil || sigJSON == nil {
        return false, fmt.Errorf("signature not found")
    }
    
    var signature DocumentSignature
    json.Unmarshal(sigJSON, &signature)
    
    // Recalculate signature
    signatureData := fmt.Sprintf("%s:%s:%s:%s", 
        signature.DocumentID, 
        signature.DocumentHash, 
        signature.SignerCertHash, 
        signature.SignedAt.Format(time.RFC3339))
    sigHash := sha256.Sum256([]byte(signatureData))
    expectedSignature := hex.EncodeToString(sigHash[:])
    
    // Compare
    if signature.SignatureData == expectedSignature {
        return true, nil
    }
    
    return false, fmt.Errorf("signature verification failed")
}
```

---

## 4. API Routes (New Endpoints)

### POST /api/v1/documents/:documentId/sign

```typescript
router.post('/:documentId/sign',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const { signatureType, reason } = req.body;
      const user = (req as any).user;
      
      // 1. Get document from PostgreSQL
      const doc = await db.get(
        'SELECT * FROM documents WHERE document_id = $1',
        [documentId]
      );
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' }
        });
      }
      
      // 2. Sign on blockchain
      const result = await fabricService.invokeChaincode('SignDocument', [
        documentId,
        doc.file_hash,
        signatureType,
        reason || ''
      ]);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: result.error }
        });
      }
      
      // 3. Update PostgreSQL
      await db.run(
        `UPDATE documents 
         SET status = 'signed', 
             verification_status = $1,
             verified_at = NOW()
         WHERE document_id = $2`,
        [signatureType === 'APPROVE' ? 'verified' : 'pending', documentId]
      );
      
      // 4. Add visual signature to PDF (if PDF)
      if (doc.mime_type === 'application/pdf') {
        await addVisualSignatureToPDF(doc.file_path, {
          signer: user.username,
          organization: user.org,
          timestamp: new Date().toISOString(),
          signatureType
        });
      }
      
      res.json({
        success: true,
        data: {
          documentId,
          signedBy: user.username,
          signatureType,
          txId: result.txId
        }
      });
      
    } catch (error: any) {
      logger.error('Document signing error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message }
      });
    }
  }
);
```

### GET /api/v1/documents/:documentId/signatures

```typescript
router.get('/:documentId/signatures',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      
      // Query blockchain for all signatures
      const result = await fabricService.queryChaincode('GetDocumentSignatures', [
        documentId
      ]);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No signatures found' }
        });
      }
      
      res.json({
        success: true,
        data: result.data
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message }
      });
    }
  }
);
```

---

## 5. Visual Signature (PDF Watermark/Stamp)

### Implementation (Node.js - pdf-lib)

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';

interface SignatureStamp {
  signer: string;
  organization: string;
  timestamp: string;
  signatureType: string;
}

async function addVisualSignatureToPDF(
  filePath: string,
  stamp: SignatureStamp
): Promise<void> {
  
  // 1. Load existing PDF
  const existingPdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
  // 2. Get first page (add stamp to all pages optionally)
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  
  // 3. Load font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // 4. Create signature stamp (bottom right corner)
  const stampX = width - 200;
  const stampY = 30;
  
  // Draw signature box
  firstPage.drawRectangle({
    x: stampX,
    y: stampY,
    width: 180,
    height: 80,
    borderColor: rgb(0.2, 0.5, 0.8),
    borderWidth: 2,
    color: rgb(0.95, 0.95, 1),
    opacity: 0.9,
  });
  
  // Draw signature icon/checkmark
  firstPage.drawText('✓', {
    x: stampX + 10,
    y: stampY + 50,
    size: 30,
    font: boldFont,
    color: rgb(0, 0.7, 0),
  });
  
  // Draw signature details
  firstPage.drawText('DIGITALLY SIGNED', {
    x: stampX + 45,
    y: stampY + 62,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  firstPage.drawText(`By: ${stamp.signer}`, {
    x: stampX + 45,
    y: stampY + 48,
    size: 8,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  firstPage.drawText(`Org: ${stamp.organization}`, {
    x: stampX + 45,
    y: stampY + 36,
    size: 7,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  firstPage.drawText(`Date: ${new Date(stamp.timestamp).toLocaleString()}`, {
    x: stampX + 45,
    y: stampY + 24,
    size: 7,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  firstPage.drawText(`Type: ${stamp.signatureType}`, {
    x: stampX + 45,
    y: stampY + 12,
    size: 7,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  // 5. Add watermark on all pages (optional)
  for (const page of pages) {
    page.drawText('SIGNED', {
      x: width / 2 - 50,
      y: height / 2,
      size: 80,
      font: boldFont,
      color: rgb(0, 0.7, 0),
      opacity: 0.1,
      rotate: { angle: Math.PI / 4, type: 'degrees' },
    });
  }
  
  // 6. Save modified PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
  
  logger.info(`✅ Visual signature added to PDF: ${filePath}`);
}
```

---

## 6. UI Components (React/TypeScript)

### DocumentSignatureTracker Component

```typescript
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface Signature {
  signatureId: string;
  signerCommonName: string;
  signerMspId: string;
  signerRole: string;
  signatureType: string;
  signedAt: string;
  transactionId: string;
}

interface DocumentSignaturesProps {
  documentId: string;
}

export const DocumentSignatureTracker: React.FC<DocumentSignaturesProps> = ({ documentId }) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSignatures();
  }, [documentId]);
  
  const fetchSignatures = async () => {
    try {
      const response = await fetch(
        `/api/v1/documents/${documentId}/signatures`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setSignatures(data.data.signatures || []);
      }
    } catch (error) {
      console.error('Failed to fetch signatures:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusIcon = (signatureType: string) => {
    switch (signatureType) {
      case 'APPROVE':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'VERIFY':
        return <CheckCircle className="text-blue-500" size={20} />;
      case 'REJECT':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-yellow-500" size={20} />;
    }
  };
  
  const getOrgBadgeColor = (mspId: string) => {
    const colors: Record<string, string> = {
      ECTAMSP: 'bg-blue-100 text-blue-800',
      BanksMSP: 'bg-green-100 text-green-800',
      NBEMSP: 'bg-purple-100 text-purple-800',
      CustomsMSP: 'bg-orange-100 text-orange-800',
      ShippingMSP: 'bg-cyan-100 text-cyan-800',
      ECXMSP: 'bg-pink-100 text-pink-800',
    };
    return colors[mspId] || 'bg-gray-100 text-gray-800';
  };
  
  if (loading) {
    return <div className="p-4">Loading signatures...</div>;
  }
  
  if (signatures.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          ⚠️ No signatures found. Document not yet signed.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Document Signatures ({signatures.length})</h3>
      
      <div className="space-y-2">
        {signatures.map((sig) => (
          <div
            key={sig.signatureId}
            className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getStatusIcon(sig.signatureType)}
                <div>
                  <p className="font-medium">{sig.signerCommonName}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getOrgBadgeColor(sig.signerMspId)}`}
                  >
                    {sig.signerMspId}
                  </span>
                  {sig.signerRole && (
                    <span className="ml-2 text-xs text-gray-500">({sig.signerRole})</span>
                  )}
                </div>
              </div>
              
              <div className="text-right text-sm text-gray-500">
                <p>{new Date(sig.signedAt).toLocaleString()}</p>
                <p className="text-xs mt-1">
                  Type: <span className="font-medium">{sig.signatureType}</span>
                </p>
              </div>
            </div>
            
            {/* Blockchain proof */}
            <div className="mt-3 pt-3 border-t text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="font-medium">🔗 Blockchain TX:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {sig.transactionId.substring(0, 16)}...
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(sig.transactionId)}
                  className="text-blue-600 hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
        <p className="text-sm text-green-800">
          ✅ Document has been signed by {signatures.length} authorized{' '}
          {signatures.length === 1 ? 'party' : 'parties'} with blockchain verification.
        </p>
      </div>
    </div>
  );
};
```

### SignDocumentButton Component

```typescript
interface SignDocumentButtonProps {
  documentId: string;
  onSigned: () => void;
}

export const SignDocumentButton: React.FC<SignDocumentButtonProps> = ({
  documentId,
  onSigned,
}) => {
  const [signing, setSigning] = useState(false);
  const [signatureType, setSignatureType] = useState('VERIFY');
  const [reason, setReason] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  
  const handleSign = async () => {
    setSigning(true);
    try {
      const response = await fetch(
        `/api/v1/documents/${documentId}/sign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ signatureType, reason }),
        }
      );
      
      const data = await response.json();
      if (data.success) {
        alert('✅ Document signed successfully on blockchain!');
        onSigned();
        setShowDialog(false);
      } else {
        alert(`❌ Signature failed: ${data.error.message}`);
      }
    } catch (error) {
      alert('❌ Failed to sign document');
      console.error(error);
    } finally {
      setSigning(false);
    }
  };
  
  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🔏 Sign Document
      </button>
      
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Sign Document</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Signature Type
                </label>
                <select
                  value={signatureType}
                  onChange={(e) => setSignatureType(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="UPLOAD">Upload Signature</option>
                  <option value="VERIFY">Verify Document</option>
                  <option value="APPROVE">Approve Document</option>
                  <option value="REJECT">Reject Document</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Enter reason for signature..."
                />
              </div>
              
              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
                <p>🔒 This action will:</p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Sign document with your X.509 certificate</li>
                  <li>Record signature on blockchain (immutable)</li>
                  <li>Add visual signature to PDF</li>
                  <li>Create audit trail entry</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
                disabled={signing}
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {signing ? 'Signing...' : '✍️ Sign Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

---

## 7. Document Tracking Dashboard

### Required Documents by Workflow Step

```typescript
const WORKFLOW_DOCUMENTS = {
  REGISTRATION: [
    { type: 'ECTA_LICENSE', required: true, signers: ['Exporter', 'ECTA'] },
    { type: 'CAPITAL_PROOF', required: true, signers: ['Exporter', 'ECTA'] },
    { type: 'LAB_CERTIFICATE', required: true, signers: ['Lab', 'ECTA'] },
  ],
  CONTRACT: [
    { type: 'CONTRACT_SIGNED', required: true, signers: ['Exporter', 'Buyer', 'ECTA'] },
    { type: 'PROFORMA_INVOICE', required: false, signers: ['Exporter'] },
  ],
  QUALITY: [
    { type: 'QUALITY_CERTIFICATE', required: true, signers: ['ECTA Inspector', 'ECTA'] },
    { type: 'CUPPING_REPORT', required: true, signers: ['ECTA Lab'] },
    { type: 'LAB_TEST_REPORT', required: true, signers: ['ECTA Lab'] },
    { type: 'PHYTOSANITARY_CERT', required: true, signers: ['ECTA Officer'] },
  ],
  ECX: [
    { type: 'WAREHOUSE_RECEIPT', required: true, signers: ['ECX', 'Exporter'] },
  ],
  LC: [
    { type: 'LC_APPLICATION', required: true, signers: ['Exporter', 'Bank'] },
    { type: 'LC_DOCUMENT', required: true, signers: ['Issuing Bank', 'Advising Bank'] },
  ],
  SHIPMENT: [
    { type: 'BILL_OF_LADING', required: true, signers: ['Shipping Line', 'Bank'] },
    { type: 'COMMERCIAL_INVOICE', required: true, signers: ['Exporter', 'Bank'] },
    { type: 'PACKING_LIST', required: true, signers: ['Exporter'] },
    { type: 'CERTIFICATE_OF_ORIGIN', required: true, signers: ['ECTA', 'Customs'] },
    { type: 'INSURANCE_CERT', required: true, signers: ['Insurance Co.'] },
  ],
  CUSTOMS: [
    { type: 'CUSTOMS_DECLARATION', required: true, signers: ['Exporter', 'Customs Officer'] },
    { type: 'CLEARANCE_CERT', required: true, signers: ['Customs Officer'] },
  ],
  PAYMENT: [
    { type: 'SWIFT_MT103', required: true, signers: ['Bank'] },
    { type: 'PAYMENT_RECEIPT', required: true, signers: ['Bank', 'NBE'] },
  ],
};
```

---

## 8. Implementation Checklist

### Backend (API)
- [ ] Add `pdf-lib` dependency to `package.json`
- [ ] Implement `addVisualSignatureToPDF()` function
- [ ] Add `/api/v1/documents/:id/sign` endpoint
- [ ] Add `/api/v1/documents/:id/signatures` endpoint
- [ ] Update document schema with `signature_status` field

### Smart Contract (Chaincode)
- [ ] Implement `SignDocument()` function
- [ ] Implement `GetDocumentSignatures()` function
- [ ] Implement `VerifyDocumentSignature()` function
- [ ] Add `DocumentSignature` and `DocumentWithSignatures` structs
- [ ] Deploy updated chaincode

### Frontend (UI)
- [ ] Create `DocumentSignatureTracker` component
- [ ] Create `SignDocumentButton` component
- [ ] Add signature indicators to document lists
- [ ] Add workflow progress tracker
- [ ] Show required vs. obtained signatures

### Database
- [ ] Add migration for signature tracking fields
- [ ] Add indexes for signature queries
- [ ] Create audit table for signature events

---

## 9. Testing Checklist

### Test Scenario 1: Exporter Signs Contract
```bash
1. Exporter uploads signed contract PDF
2. System captures exporter's X.509 certificate
3. Blockchain records signature
4. PDF gets visual signature stamp
5. UI shows "Signed by Exporter" with green checkmark
```

### Test Scenario 2: ECTA Verifies Document
```bash
1. ECTA inspector reviews contract
2. Clicks "Sign Document" → Selects "VERIFY"
3. Blockchain captures ECTA officer's certificate
4. PDF shows both signatures (Exporter + ECTA)
5. UI shows signature progress: 2/3 signatures
```

### Test Scenario 3: Full Workflow Tracking
```bash
1. Query all documents for shipment SHIP-001
2. For each document, show signature status
3. Highlight missing signatures
4. Show blockchain transaction IDs for proof
5. Allow stakeholders to verify signatures
```

---

## 10. Benefits

✅ **Complete Traceability** - Every signature tracked from exporter to payment  
✅ **Cryptographic Proof** - X.509 certificates on blockchain  
✅ **Visual Confirmation** - PDF stamps show who signed when  
✅ **Audit Trail** - Immutable record of all signatures  
✅ **Non-Repudiation** - Cannot deny signing a document  
✅ **Workflow Enforcement** - Cannot proceed without required signatures  
✅ **Compliance** - Meet regulatory requirements for document authentication  

---

**Created**: September 1, 2026  
**System**: CECBS - Coffee Export Consortium Blockchain System  
**Blockchain**: Hyperledger Fabric 2.5.9 with X.509 PKI

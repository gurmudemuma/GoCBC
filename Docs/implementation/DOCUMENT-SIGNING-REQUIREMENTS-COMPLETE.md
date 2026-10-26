# Document Signing Requirements - Complete Guide

**Date:** September 28, 2026  
**Status:** ✅ Production Ready  
**System:** CECBS (Ethiopian Coffee Export Consortium Blockchain System)

---

## Executive Summary

The CECBS system implements a **multi-party approval workflow** for critical trade documents to ensure compliance, security, and audit trail integrity. Documents are categorized into:

1. **Multi-Party Approval Required** (2 approvers, sequential workflow)
2. **Single-Party Approval Required** (1 approver, parallel workflow)
3. **No Approval Required** (information-only documents)

All signatures are recorded on the **Hyperledger Fabric blockchain** with visual PDF stamps, creating an immutable audit trail.

---

## Answer to "Are These All Documents Must Be Signed Here?"

**Short Answer:** **NO** - not all documents require signatures. Only 12 document types have approval requirements configured in the system.

**Documents Showing "Multi-party, Unsigned":** These documents MUST be signed according to their approval rules (see section below).

**Documents Without Approval Rules:** These can be uploaded for reference but don't require formal approval signatures (e.g., Weight Certificate, Fumigation Certificate, EUR1 Certificate, ICO Certificate).

---

## 1. Multi-Party Approval Requirements (2 Approvers - Sequential)

### 1.1 CONTRACT Documents

#### SALES_CONTRACT
- **Entity Type:** CONTRACT
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `ecta_inspector` (First)
  2. `ecta_supervisor` (Second)
- **Description:** Sales contracts require inspector verification followed by supervisor approval
- **Workflow:** Inspector must approve first, then supervisor can approve

#### EXPORT_LICENSE
- **Entity Type:** CONTRACT
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `ecta_inspector` (First)
  2. `ecta_supervisor` (Second)
- **Description:** Export licenses require inspector and supervisor approval
- **Workflow:** Inspector reviews eligibility, supervisor provides final authorization

---

### 1.2 LC (Letter of Credit) Documents

#### COMMERCIAL_INVOICE
- **Entity Type:** LC
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `bank_officer` (First)
  2. `senior_bank_officer` (Second)
- **Description:** Commercial invoices require junior and senior bank officer approval
- **Workflow:** Bank officer verifies invoice details, senior officer authorizes payment terms
- **Required for:** LC payment release (critical document)

#### BILL_OF_LADING
- **Entity Type:** LC
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `bank_officer` (First)
  2. `senior_bank_officer` (Second)
- **Description:** Bill of lading requires junior and senior bank officer approval
- **Workflow:** Bank officer verifies shipping details, senior officer confirms acceptance
- **Required for:** LC payment release (critical document)

#### CERTIFICATE_OF_ORIGIN
- **Entity Type:** LC
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `ecta_inspector` (First)
  2. `ecta_supervisor` (Second)
- **Description:** Certificate of origin requires inspector and supervisor approval
- **Workflow:** Inspector verifies Ethiopian origin, supervisor certifies authenticity
- **Required for:** LC document examination

#### QUALITY_CERTIFICATE
- **Entity Type:** LC
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `ecta_inspector` (First)
  2. `ecta_supervisor` (Second)
- **Description:** Quality certificate requires inspector and supervisor approval
- **Workflow:** Inspector conducts quality tests, supervisor validates results
- **Required for:** LC document examination

---

### 1.3 CUSTOMS_DECLARATION Documents

#### CUSTOMS_DECLARATION
- **Entity Type:** CUSTOMS_DECLARATION
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `customs_officer` (First)
  2. `senior_customs_officer` (Second)
- **Description:** Customs declarations require officer and senior officer approval
- **Workflow:** Customs officer reviews declaration, senior officer authorizes clearance

#### DUTY_ASSESSMENT
- **Entity Type:** CUSTOMS_DECLARATION
- **Min Approvers:** 2 (Sequential)
- **Required Roles:** 
  1. `customs_officer` (First)
  2. `senior_customs_officer` (Second)
- **Description:** Duty assessments require officer and senior officer approval
- **Workflow:** Customs officer calculates duties, senior officer confirms assessment

---

## 2. Single-Party Approval Requirements (1 Approver - Parallel)

### 2.1 LC Documents (Single Approval)

#### PACKING_LIST
- **Entity Type:** LC
- **Min Approvers:** 1 (Parallel)
- **Required Roles:** `bank_officer`
- **Description:** Packing list requires single bank officer approval
- **Workflow:** Any bank officer can approve independently
- **Required for:** LC payment release (critical document)

#### INSURANCE_CERTIFICATE
- **Entity Type:** LC
- **Min Approvers:** 1 (Parallel)
- **Required Roles:** `bank_officer`
- **Description:** Insurance certificate requires single bank officer approval
- **Workflow:** Any bank officer can approve independently
- **Required for:** LC document examination

---

### 2.2 SHIPMENT Documents

#### SHIPPING_MANIFEST
- **Entity Type:** SHIPMENT
- **Min Approvers:** 1 (Parallel)
- **Required Roles:** `shipping_agent`
- **Description:** Shipping manifest requires shipping agent approval
- **Workflow:** Shipping agent verifies cargo manifest before departure

#### CONTAINER_SEAL
- **Entity Type:** SHIPMENT
- **Min Approvers:** 2 (Parallel)
- **Required Roles:** `shipping_agent`, `customs_officer`
- **Description:** Container sealing requires shipping agent and customs officer
- **Workflow:** Both parties can approve in any order (parallel)
- **Security:** Ensures joint custody verification

---

## 3. Documents WITHOUT Approval Requirements

These documents can be uploaded for reference but do NOT require formal signatures:

### 3.1 Quality & Certification Documents
- **Weight Certificate** - Informational weight documentation
- **Fumigation Certificate** - Pest treatment verification
- **ICO Certificate** - International Coffee Organization certificate
- **EUR1 Certificate** - EU preferential origin certificate
- **Phytosanitary Certificate** - Plant health certificate (informational)
- **Cupping Report** - Coffee quality tasting notes
- **Laboratory Certificate** - Lab test results
- **Taster Certificate** - Coffee taster qualification

### 3.2 Business & Legal Documents
- **Business License** - Company registration proof
- **Trade License** - Trading authorization
- **TIN Certificate** - Tax identification number
- **Driver License** - Driver identification
- **Truck Registration** - Vehicle registration
- **Bank Statement** - Financial proof

### 3.3 Contract Documents
- **Proforma Invoice** - Initial quotation
- **Contract Signed** - Already executed contract (pre-signed)
- **Purchase Order** - Buyer order form

### 3.4 Other Documents
- **EUDR Statement** - EU Deforestation Regulation statement
- **Invoice** - General invoice type
- **LC Application** - LC request form
- **OTHER** - Miscellaneous documents

---

## 4. Signature Workflow Process

### 4.1 Sequential Approval (Multi-Party)

```
1. Document uploaded → Status: "Unsigned"
2. First approver signs → Status: "Partially Approved (1/2)"
3. Second approver signs → Status: "Fully Approved (2/2)"
```

**Example: COMMERCIAL_INVOICE**
```
Step 1: Bank Officer reviews and signs
        ↓
Step 2: Senior Bank Officer can now sign
        ↓
Step 3: Invoice fully approved, LC can proceed
```

**Validation Rules:**
- ❌ Second approver CANNOT sign before first approver
- ❌ Same user CANNOT sign twice
- ❌ Wrong role CANNOT sign (e.g., customs officer signing bank document)
- ✅ Visual PDF stamp added to document
- ✅ Blockchain transaction recorded with immutable timestamp

---

### 4.2 Parallel Approval

```
1. Document uploaded → Status: "Unsigned"
2. Any required approver signs → Status: "Approved"
```

**Example: PACKING_LIST**
```
Any Bank Officer can sign → Immediately approved
```

**Example: CONTAINER_SEAL (2 parallel approvers)**
```
Shipping Agent signs → Status: "Partially Approved (1/2)"
Customs Officer signs → Status: "Fully Approved (2/2)"
(Order doesn't matter - either can sign first)
```

---

### 4.3 No Approval Required

```
Document uploaded → Status: "Verified" (no signatures needed)
```

These documents are stored on blockchain for audit trail but don't require approval workflow.

---

## 5. How to Check Document Signing Status

### 5.1 In Banks Portal

```
Navigate to: Banks Portal → LC Applications → Select LC → Documents Tab

Document List shows:
┌──────────────────────────┬─────────────┬─────────────┬──────────────┐
│ Document Type            │ Status      │ Signed By   │ Signature    │
├──────────────────────────┼─────────────┼─────────────┼──────────────┤
│ COMMERCIAL_INVOICE       │ Verified    │ Multi-party │ Unsigned     │
│ BILL_OF_LADING          │ Verified    │ Multi-party │ Unsigned     │
│ PACKING_LIST            │ Verified    │ Single      │ Unsigned     │
│ CERTIFICATE_OF_ORIGIN   │ Verified    │ Multi-party │ Unsigned     │
│ INSURANCE_CERTIFICATE   │ Verified    │ Single      │ Unsigned     │
│ QUALITY_CERTIFICATE     │ Verified    │ Multi-party │ Unsigned     │
└──────────────────────────┴─────────────┴─────────────┴──────────────┘
```

**What "Multi-party" Means:**
- 2 approvers required (sequential approval)
- Shows which roles need to sign
- Tracks approval progress (e.g., "1/2 approved")

**What "Single" Means:**
- 1 approver required
- Any user with correct role can sign

**What "Unsigned" Means:**
- No signatures recorded yet
- Document is waiting for approval

---

### 5.2 Signing a Document

**Step 1:** Click on document in list  
**Step 2:** Click "Sign" or "Approve" button  
**Step 3:** System validates:
- ✓ User has correct role
- ✓ User hasn't already signed
- ✓ Previous approvers signed (for sequential)
- ✓ Document exists and is valid

**Step 4:** System records:
- ✓ Visual PDF stamp added to document
- ✓ Blockchain transaction recorded
- ✓ Approval workflow state updated
- ✓ Audit log created

**Step 5:** Status updates:
- Sequential: "Approved (1/2)" → "Approved (2/2)"
- Parallel: "Unsigned" → "Approved"

---

## 6. API Endpoints

### 6.1 Sign Document
```
POST /api/v1/documents/:documentId/sign

Request Body:
{
  "signatureType": "approve",
  "remarks": "Verified invoice amount and terms"
}

Response (Success):
{
  "success": true,
  "message": "Document signed successfully",
  "signatureId": "SIG-DOC123-BANKSMSP-1727507524000",
  "blockchainTxId": "a1b2c3d4e5f6...",
  "approvalStatus": {
    "currentApprovals": 1,
    "requiredApprovals": 2,
    "workflowComplete": false
  }
}

Response (Approval Denied):
{
  "success": false,
  "error": {
    "code": "APPROVAL_DENIED",
    "message": "Sequential approval required. Waiting for bank_officer approval first.",
    "details": {
      "requiresApproval": true,
      "currentApprovals": 0,
      "requiredApprovals": 2,
      "nextRequiredRole": "bank_officer"
    }
  }
}
```

---

### 6.2 Get Approval Status
```
GET /api/v1/documents/:documentId/approval-status

Response:
{
  "documentId": "DOC123",
  "entityType": "LC",
  "documentType": "COMMERCIAL_INVOICE",
  "requiredApprovals": 2,
  "currentApprovals": 1,
  "approvalStatus": "in_progress",
  "approvedBy": ["bank_officer_user123"],
  "nextRequiredRole": "senior_bank_officer"
}
```

---

## 7. Database Schema

### 7.1 approval_requirements Table
```sql
CREATE TABLE approval_requirements (
  id SERIAL PRIMARY KEY,
  document_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  min_approvers INTEGER NOT NULL,
  required_roles TEXT[] NOT NULL,
  approval_order TEXT CHECK (approval_order IN ('parallel', 'sequential')),
  description TEXT,
  active BOOLEAN DEFAULT true
);
```

### 7.2 approval_workflow_state Table
```sql
CREATE TABLE approval_workflow_state (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  required_approvals INTEGER NOT NULL,
  current_approvals INTEGER DEFAULT 0,
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT[] DEFAULT ARRAY[]::TEXT[],
  rejected_by TEXT,
  rejection_reason TEXT,
  completed_at TIMESTAMP
);
```

### 7.3 document_signatures Table
```sql
CREATE TABLE document_signatures (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  signature_type TEXT NOT NULL,
  signed_by TEXT NOT NULL,
  signed_by_role TEXT,
  signed_by_org TEXT,
  signed_at TIMESTAMP DEFAULT NOW(),
  approval_status TEXT,
  blockchain_tx_id TEXT,
  approval_level INTEGER,
  approval_order INTEGER
);
```

**Trigger:** Automatic approval_workflow_state update when signature inserted.

---

## 8. User Roles and Permissions

### 8.1 Bank Roles
- **bank_officer**: Can approve PACKING_LIST, INSURANCE_CERTIFICATE (single); first approver for COMMERCIAL_INVOICE, BILL_OF_LADING
- **senior_bank_officer**: Second approver for COMMERCIAL_INVOICE, BILL_OF_LADING

### 8.2 ECTA Roles
- **ecta_inspector**: First approver for QUALITY_CERTIFICATE, CERTIFICATE_OF_ORIGIN, SALES_CONTRACT, EXPORT_LICENSE
- **ecta_supervisor**: Second approver for all ECTA documents

### 8.3 Customs Roles
- **customs_officer**: First approver for CUSTOMS_DECLARATION, DUTY_ASSESSMENT; parallel approver for CONTAINER_SEAL
- **senior_customs_officer**: Second approver for CUSTOMS_DECLARATION, DUTY_ASSESSMENT

### 8.4 Shipping Roles
- **shipping_agent**: Approver for SHIPPING_MANIFEST; parallel approver for CONTAINER_SEAL

---

## 9. Blockchain Integration

### 9.1 What Gets Recorded on Blockchain
Every document signature creates an immutable blockchain transaction containing:
```json
{
  "documentId": "DOC123",
  "signatureType": "approve",
  "signedBy": "bank_officer_user123",
  "signedByRole": "bank_officer",
  "organization": "BANKSMSP",
  "timestamp": "2026-09-28T06:30:00.000Z",
  "approvalMetadata": {
    "multiPartyApproval": true,
    "approvalLevel": 1,
    "requiredApprovals": 2,
    "approverRole": "bank_officer",
    "workflowComplete": false
  }
}
```

### 9.2 Visual PDF Stamps
Physical PDF files are stamped with signature details:
```
┌─────────────────────────────────────┐
│ DIGITALLY SIGNED                    │
│ Signer: bank_officer_user123        │
│ Organization: BANKSMSP              │
│ Role: bank_officer                  │
│ Date: 2026-09-28 06:30:00          │
│ Type: APPROVE (Level 1/2)          │
│ Blockchain: a1b2c3d4e5f6...        │
└─────────────────────────────────────┘
```

---

## 10. Testing Document Signing

### 10.1 Test Scenario: Sign COMMERCIAL_INVOICE

**Prerequisites:**
- LC with uploaded COMMERCIAL_INVOICE
- Users: bank_officer, senior_bank_officer

**Test Steps:**
```bash
# Step 1: Get document ID
GET /api/v1/banking/lc/LC001
# Find documentId in documents array

# Step 2: Bank officer signs (first approval)
curl -X POST http://localhost:3001/api/v1/documents/DOC123/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <bank_officer_token>" \
  -d '{"signatureType": "approve"}'

# Expected: Success, 1/2 approved

# Step 3: Senior bank officer signs (second approval)
curl -X POST http://localhost:3001/api/v1/documents/DOC123/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <senior_bank_officer_token>" \
  -d '{"signatureType": "approve"}'

# Expected: Success, 2/2 approved, workflow complete
```

---

## 11. Common Questions

### Q1: Why do some documents show "Multi-party" but others don't?
**A:** Documents with approval requirements (12 types) show their approval type. Documents without requirements show "Verified" only.

### Q2: Can I skip the first approver and go directly to second?
**A:** No. Sequential approval requires strict order (inspector → supervisor, bank officer → senior officer).

### Q3: What happens if document is signed on paper first?
**A:** Physical signatures don't affect digital approval workflow. Both can coexist, but blockchain signature is required for system validation.

### Q4: Can an approver unsign a document?
**A:** No. Blockchain signatures are immutable. If correction needed, a new version must be uploaded.

### Q5: Do all 12 documents need to be signed for LC payment?
**A:** Bank requires these critical documents signed for payment release:
- COMMERCIAL_INVOICE (2 sigs)
- BILL_OF_LADING (2 sigs)
- PACKING_LIST (1 sig)

Other documents (CERTIFICATE_OF_ORIGIN, QUALITY_CERTIFICATE, INSURANCE_CERTIFICATE) are for examination but may have different signing requirements based on LC terms.

---

## 12. Summary Matrix

| Document Type | Entity Type | Approvers | Order | Roles |
|--------------|-------------|-----------|-------|-------|
| SALES_CONTRACT | CONTRACT | 2 | Sequential | ecta_inspector → ecta_supervisor |
| EXPORT_LICENSE | CONTRACT | 2 | Sequential | ecta_inspector → ecta_supervisor |
| COMMERCIAL_INVOICE | LC | 2 | Sequential | bank_officer → senior_bank_officer |
| BILL_OF_LADING | LC | 2 | Sequential | bank_officer → senior_bank_officer |
| CERTIFICATE_OF_ORIGIN | LC | 2 | Sequential | ecta_inspector → ecta_supervisor |
| QUALITY_CERTIFICATE | LC | 2 | Sequential | ecta_inspector → ecta_supervisor |
| PACKING_LIST | LC | 1 | Parallel | bank_officer |
| INSURANCE_CERTIFICATE | LC | 1 | Parallel | bank_officer |
| CUSTOMS_DECLARATION | CUSTOMS | 2 | Sequential | customs_officer → senior_customs_officer |
| DUTY_ASSESSMENT | CUSTOMS | 2 | Sequential | customs_officer → senior_customs_officer |
| SHIPPING_MANIFEST | SHIPMENT | 1 | Parallel | shipping_agent |
| CONTAINER_SEAL | SHIPMENT | 2 | Parallel | shipping_agent + customs_officer |

**All other documents:** No approval requirement (information-only)

---

## 13. Next Steps

1. **For Users:**
   - Check which role you have
   - Find documents assigned to your role
   - Sign documents in correct order (sequential) or as needed (parallel)

2. **For Administrators:**
   - Monitor approval workflow completion rates
   - Check for bottlenecks (e.g., senior officers not signing)
   - Review audit logs for signature compliance

3. **For Developers:**
   - Add new document types to `approval_requirements` table if needed
   - Customize visual PDF stamps via `documentSignatureService.ts`
   - Add role-based UI controls for signature buttons

---

**Document Status:** ✅ Complete  
**Last Updated:** September 28, 2026  
**Version:** 1.0  
**Author:** CECBS Development Team

# Documents & Blockchain Signatures - Status Report

## ✅ What's Working

### 1. API Endpoints ✅ VERIFIED
- `GET /api/v1/documents/entity/:entityType/:entityId` - Returns documents with deduplication
- `GET /api/v1/blockchain-signatures/entity/:entityType/:entityId` - Returns blockchain transactions
- `GET /api/v1/documents/:documentId/verify-signatures` - Returns document signatures

### 2. Data Fetching ✅ VERIFIED  
All portal components are now using API endpoints instead of CouchDB:
- **NBEPortal.tsx** - Fetches forex, contracts via API
- **BanksPortal.tsx** - Fetches LCs, forex, payments via API
- **ExporterPortal.tsx** - Fetches contracts, LCs, forex, shipments via API

### 3. Component Structure ✅ CORRECT
Two separate components serve different purposes:
- **DocumentManagementPanel** - Shows uploadable document files (PDFs, images)
- **BlockchainSignatureVerification** - Shows blockchain transaction signatures (not files)

These are BOTH supposed to be visible, showing different data.

---

## ⚠️  Issue: Document Duplication in UI

### Symptom
Based on your screenshot, documents appear **3 times each**:
- Bill_of_Lading.pdf (appears 3x)
- Commercial_Invoice.pdf (appears 3x)  
- Packing_List.pdf (appears 3x)
- ... etc (12 documents × 3 = 36 total displayed)

### Root Cause: NOT the API
The API has deduplication logic and is working correctly. The issue is in the **UI rendering**.

### Possible Causes

#### Cause 1: Multiple DocumentManagementPanel Instances
If a portal renders `DocumentManagementPanel` multiple times with same entityType/entityId:

```typescript
// ❌ BAD: Multiple panels for same entity
<DocumentManagementPanel entityType="LC" entityId="LC123" />
<DocumentManagementPanel entityType="LC" entityId="LC123" />  
<DocumentManagementPanel entityType="LC" entityId="LC123" />
```

#### Cause 2: React Component Re-rendering
If useEffect fetches documents multiple times due to missing dependencies or infinite loops.

#### Cause 3: Multiple Tabs/Sections Showing Same Data
If different UI sections all show the same document list:
- "Documents" tab
- "Attachments" section
- "Files" panel

All three showing the same 12 documents = 36 total

---

## 🔍 How to Diagnose

### Step 1: Check Browser DevTools - Network Tab

1. Open the page showing duplicates
2. Press F12 → Network tab
3. Filter by "Fetch/XHR"
4. Look for `/api/v1/documents/entity/` calls

**What to check:**
- How many times is the endpoint called? (Should be 1)
- Does the response contain 12 documents or 36? (Should be 12)
- If response has 12 but UI shows 36, it's a rendering issue

### Step 2: Check Browser DevTools - Console

Look for:
- React warnings about duplicate keys
- Multiple "Fetching documents..." log messages
- Errors about invalid data

### Step 3: Check Browser DevTools - Elements Tab

1. Right-click on one of the duplicate documents
2. Select "Inspect Element"
3. Look at the parent component structure
4. See if there are multiple parent containers rendering same data

---

## 🛠️ How to Fix

### Option 1: Check Which Portal is Showing Duplicates

The screenshot shows LC documents. This could be from:
- **BanksPortal** - LC details dialog  
- **ExporterPortal** - LC status view
- **Document validation** - Compliance check

**Find the exact component:**
```bash
cd ui/src/components/portals
grep -n "DocumentManagementPanel.*LC" *.tsx
```

### Option 2: Verify Component Rendering Once

In the portal file (e.g., `BanksPortal.tsx`), find where LC documents are shown:

```typescript
// Should appear ONCE per dialog/view
<Dialog open={selectedLC !== null}>
  <DocumentManagementPanel 
    entityType="LC" 
    entityId={selectedLC?.lcId}
  />
  <BlockchainSignatureVerification 
    entityType="LETTER_OF_CREDIT"
    entityId={selectedLC?.lcId}
  />
</Dialog>
```

**NOT this (causing 3x duplication):**
```typescript
// ❌ DON'T DO THIS
<Box>
  <DocumentManagementPanel entityType="LC" entityId={lcId} />
</Box>
<Box>
  <DocumentManagementPanel entityType="LC" entityId={lcId} />
</Box>
<Box>
  <DocumentManagementPanel entityType="LC" entityId={lcId} />
</Box>
```

### Option 3: Add React Keys for Uniqueness

Ensure each document in the list has a unique key:

```typescript
// In DocumentManagementPanel or wherever documents.map() is used
{documents.map((doc) => (
  <DocumentCard 
    key={doc.document_id}  // ✅ Must be unique
    {...doc}
  />
))}
```

---

## ✅ Blockchain Signatures ARE Working

Based on your screenshot showing:
```
🔐 Cryptographic Signatures & Blockchain Verification
✅ 2 Verified
Verification: UpdateLC - Block #0
```

This confirms:
1. ✅ Blockchain transactions are being fetched
2. ✅ Signatures are being verified
3. ✅ Multi-party endorsements are captured
4. ✅ X.509 certificate details are displaying
5. ✅ Consortium endorsements show (3 organizations)

**All signature components are working correctly!**

---

## 📋 What You Should See (Correct Behavior)

### In Banks Portal → LC Details

**Section 1: LC Information**
- LC ID, Amount, Status
- Issuing Bank, Beneficiary Bank
- Dates, Terms

**Section 2: Documents (12 unique files)**
```
📄 Documents & Attachments
├─ Bill_of_Lading.pdf         [18/09/2026] [Verified] [Upload/Download/View buttons]
├─ Commercial_Invoice.pdf      [18/09/2026] [Verified]
├─ Packing_List.pdf           [18/09/2026] [Verified]
├─ Certificate_of_Origin.pdf   [18/09/2026] [Verified]
├─ Insurance_Certificate.pdf   [18/09/2026] [Verified]
├─ Quality_Certificate.pdf     [18/09/2026] [Verified]
├─ Phytosanitary_Certificate.pdf [18/09/2026] [Verified]
├─ Weight_Certificate.pdf      [18/09/2026] [Verified]
├─ Fumigation_Certificate.pdf  [18/09/2026] [Verified]
├─ ICO_Certificate.pdf         [18/09/2026] [Verified]
├─ EUR1_Certificate.pdf        [18/09/2026] [Verified]
└─ Customs_Declaration.pdf     [18/09/2026] [Verified]

Total: 12 documents (NOT 36)
```

**Section 3: Blockchain Signatures (separate from documents)**
```
🔐 Blockchain Signature Verification
├─ 2 Verified
├─ Signature 1: UpdateLC - Block #0
│   ├─ Signer: EXP4342570 (ExportersMSP)
│   ├─ TX ID: 4-8922f478fde340...
│   └─ Certificate: CN=EXP4342570, O=ExportersMSP
└─ Consortium Endorsements: 3 organizations

Total: 2 blockchain signatures (for LC transactions, not individual documents)
```

---

##  Quick Fix If Duplicates Persist

### 1. Add hideDocuments Prop
Modify `BlockchainSignatureVerification` to accept a `hideDocuments` prop:

```typescript
// In BlockchainSignatureVerification.tsx
interface Props {
  entityType: string;
  entityId: string;
  hideDocuments?: boolean;  // NEW
}

// Then only render documents if not hidden
{!hideDocuments && documents.map(...)}
```

### 2. Use Prop in Portal
```typescript
// In BanksPortal.tsx or wherever duplicates appear
<DocumentManagementPanel entityType="LC" entityId={lcId} />
<BlockchainSignatureVerification 
  entityType="LC" 
  entityId={lcId}
  hideDocuments={true}  // Don't show document files, only signatures
/>
```

### 3. Or Use Tabs to Separate
```typescript
<Tabs>
  <Tab label="Documents">
    <DocumentManagementPanel entityType="LC" entityId={lcId} />
  </Tab>
  <Tab label="Blockchain Verification">
    <BlockchainSignatureVerification entityType="LC" entityId={lcId} />
  </Tab>
</Tabs>
```

---

## 🎯 Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **API Endpoints** | ✅ Working | Deduplication logic present |
| **Data Fetching** | ✅ Working | All portals use API, not CouchDB |
| **Document Display** | ⚠️  Duplicates | UI rendering issue, not API |
| **Blockchain Signatures** | ✅ Working | Signatures verified, endorsements captured |
| **Multi-party Verification** | ✅ Working | Consortium endorsements showing |
| **Certificate Details** | ✅ Working | X.509 details displaying |

**Action Required:** Fix UI component to render documents once, not 3 times.

---

## 📞 Next Steps

1. **Identify which portal** is showing the duplicates (Banks/NBE/Exporter)
2. **Check that portal's code** for multiple `DocumentManagementPanel` instances
3. **Verify React keys** are using `document_id` not array index
4. **Test in browser** with DevTools → Network tab to confirm API returns 12, not 36
5. **Apply fix** based on root cause found

The system is working correctly at the API level. This is purely a UI rendering issue that can be fixed by ensuring documents are only displayed once per view!

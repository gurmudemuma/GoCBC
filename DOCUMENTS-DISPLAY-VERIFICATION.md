# Documents & Blockchain Signatures Display Verification

## Issue Described
You're showing a list of documents that appear to be duplicated 3 times:
- Bill of Lading.pdf
- Commercial Invoice.pdf  
- Packing List.pdf
- Certificate of Origin.pdf
- Insurance Certificate.pdf
- Quality Certificate.pdf
- Phytosanitary Certificate.pdf
- Weight Certificate.pdf
- Fumigation Certificate.pdf
- ICO Certificate.pdf
- EUR1 Certificate.pdf
- Customs Declaration.pdf

Each appearing **3 times** with same metadata:
- Uploaded by: exporter.cecbs.et
- Date: 18/09/2026
- Status: verified, Multi-party, Unsigned

## Root Cause Analysis

### 1. API Deduplication ✅ WORKING
The API has deduplication logic at `api/src/routes/documents.ts:968-970`:
```typescript
// Deduplicate - don't add if already exists from PostgreSQL
const existingIds = new Set(allDocuments.map(d => d.document_id));
const newDocs = sqliteDocs.filter((d: any) => !existingIds.has(d.document_id));
```

### 2. Possible UI Issues

#### A. React Component Rendering Same Data Multiple Times
**Check:** Look for multiple instances of the same component rendering

**Example Bad Pattern:**
```typescript
// DON'T: Multiple mappings of same array
{documents.map(doc => <DocumentCard />)}
{documents.map(doc => <DocumentRow />)}  
{documents.map(doc => <DocumentListItem />)}
```

#### B. Multiple Event Listeners/Effects
**Check:** useEffect hooks that don't have proper dependencies

**Example Bad Pattern:**
```typescript
useEffect(() => {
  fetchDocuments();
}, []); // Missing dependencies can cause multiple fetches

useEffect(() => {
  fetchDocuments();  
}, [entityId]); // Duplicate effect

useEffect(() => {
  fetchDocuments();
}, [entityType]); // Another duplicate effect
```

#### C. Component Mounted Multiple Times
**Check:** Parent component rendering children multiple times

**Example Bad Pattern:**
```typescript
<DocumentManagementPanel entityType="LC" entityId={lcId} />
<BlockchainSignatureVerification entityType="LC" entityId={lcId} />
<DocumentListWithSignatures entityType="LC" entityId={lcId} />
// All three might be fetching and displaying same documents
```

## How to Fix

### Step 1: Check Browser DevTools

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by "Fetch/XHR"
4. Look for `/api/v1/documents/entity/` requests

**What to check:**
- How many times is the same endpoint called?
- Is it returning the same document_id multiple times in a single response?
- Or are there multiple calls returning the same documents?

### Step 2: Check Console for React Warnings

Look for warnings like:
```
Warning: Each child in a list should have a unique "key" prop
```

If documents have duplicate keys, React might render them multiple times.

### Step 3: Check Component Structure

**In the component showing documents, find:**

```typescript
// Should have UNIQUE keys
{documents.map((doc, index) => (
  <DocumentCard 
    key={doc.document_id}  // ✅ GOOD: unique ID
    // key={index}          // ❌ BAD: index can cause duplicates
    // key={doc.file_name}  // ❌ BAD: filename might not be unique
    {...doc} 
  />
))}
```

### Step 4: Check for Multiple Rendering Components

**Find all components that might be rendering documents:**

```bash
cd ui/src/components
grep -r "documents.map" . | grep -v node_modules
```

**Check if multiple components are ALL rendering the same data:**
- `DocumentManagementPanel` - Shows uploadable documents
- `BlockchainSignatureVerification` - Shows documents with signatures
- `DocumentListWithSignatures` - Shows documents in list format

If all three are visible on same page, you'll see 3x duplicates!

## Solution Options

### Option 1: Show Documents in ONE Component Only

**Recommended structure:**
```typescript
<Tabs>
  <Tab label="Documents">
    <DocumentManagementPanel /> {/* Shows all documents */}
  </Tab>
  <Tab label="Blockchain Verification">
    <BlockchainSignatureVerification /> {/* Shows ONLY signatures, not documents */}
  </Tab>
</Tabs>
```

### Option 2: Filter Documents by Component Purpose

**Document Management Panel:** Shows uploaded files
**Blockchain Verification:** Shows ONLY blockchain transactions (not document files)

```typescript
// In BlockchainSignatureVerification.tsx
// DON'T show the documents list if DocumentManagementPanel is already showing it
{showDocumentsList && documents.map(...)}  // Only if needed
```

### Option 3: Combine Into Single View

Create ONE master component that shows:
1. Documents list (from DocumentManagementPanel)
2. Each document's blockchain signatures (from BlockchainSignatureVerification)
3. Signature status badges (from SignatureStatusBadge)

## Specific Files to Check

### 1. Check BanksPortal.tsx
Look for how LC documents are displayed:
```typescript
// Around line 1067-1091
// Is DocumentManagementPanel AND BlockchainSignatureVerification both rendering?
<DocumentManagementPanel entityType="LC" entityId={lcId} />
<BlockchainSignatureVerification entityType="LC" entityId={lcId} />
```

### 2. Check NBEPortal.tsx  
Similar pattern check for forex/contract documents

### 3. Check ExporterPortal.tsx
Similar pattern check for contract/shipment documents

## Quick Fix Commands

### Find Duplicate Document Renderings
```bash
cd ui/src/components/portals
grep -n "documents.map" *.tsx
grep -n "DocumentManagementPanel" *.tsx  
grep -n "BlockchainSignatureVerification" *.tsx
```

### Find React Key Issues
```bash
cd ui/src/components
grep -n "key={" documents/*.tsx portals/*.tsx | grep "index"
```

## Expected Behavior

### ✅ Correct Display
```
Documents (12)
├─ Bill_of_Lading.pdf         [Verified] [Multi-party] [Unsigned]
├─ Commercial_Invoice.pdf      [Verified] [Multi-party] [Unsigned]
├─ Packing_List.pdf           [Verified] [Multi-party] [Unsigned]
└─ ... 9 more documents
```

### ❌ Current Issue (Based on your screenshot)
```
Documents (36)  // 12 × 3
├─ Bill_of_Lading.pdf         [Verified] [Multi-party] [Unsigned]
├─ Bill_of_Lading.pdf         [Verified] [Multi-party] [Unsigned]  ← DUPLICATE
├─ Bill_of_Lading.pdf         [Verified] [Multi-party] [Unsigned]  ← DUPLICATE
├─ Commercial_Invoice.pdf      [Verified] [Multi-party] [Unsigned]
├─ Commercial_Invoice.pdf      [Verified] [Multi-party] [Unsigned]  ← DUPLICATE
├─ Commercial_Invoice.pdf      [Verified] [Multi-party] [Unsigned]  ← DUPLICATE
└─ ... pattern repeats 3x for each doc
```

## Testing After Fix

### 1. Check API Response
```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nbeAdmin","password":"password123","organization":"NBE"}' \
  | jq -r '.token')

# Fetch documents
curl -s "http://localhost:3001/api/v1/documents/entity/LC/LC123" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data | length'
  
# Should return: 12 (not 36)
```

### 2. Check UI Component
1. Open browser DevTools → Elements tab
2. Search for document filename (e.g., "Bill_of_Lading")
3. Count how many times it appears in DOM
4. Should be: **1 time** per document

### 3. Check React Keys
1. Open browser DevTools → Console
2. Look for React warnings
3. Should be: **No warnings** about duplicate keys

## Manual Fix Example

If `BanksPortal.tsx` is showing duplicates:

### Before (showing 3x duplicates):
```typescript
<Box>
  {/* All three components showing same documents */}
  <DocumentManagementPanel entityType="LC" entityId={lcId} />
  <BlockchainSignatureVerification entityType="LC" entityId={lcId} />
  <DocumentListWithSignatures entityType="LC" entityId={lcId} />
</Box>
```

### After (showing documents once):
```typescript
<Tabs>
  <Tab label="Documents & Signatures">
    {/* Single unified view */}
    <DocumentManagementPanel 
      entityType="LC" 
      entityId={lcId}
      showSignatures={true}  // Include signature info
    />
  </Tab>
  <Tab label="Blockchain Verification">
    {/* Only show blockchain transactions, not document files */}
    <BlockchainSignatureVerification 
      entityType="LC" 
      entityId={lcId}
      hideDocumentsList={true}  // Don't show document files again
    />
  </Tab>
</Tabs>
```

## Summary

**API:** ✅ Working correctly with deduplication  
**Issue:** ⚠️  UI rendering components multiple times  
**Fix:** Update portal components to show documents in ONE place only  
**Test:** Verify browser shows each document once

---

## Need Help?

1. Take screenshot of browser DevTools → Network tab showing API calls
2. Take screenshot of browser DevTools → Elements tab showing DOM structure  
3. Check browser console for React warnings
4. Share which portal is showing duplicates (NBE/Banks/Exporter)

This will help pinpoint exactly which component is causing the duplication!

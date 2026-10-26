# Approved Contracts Shown in Shipments Tab

## 📋 Overview

Approved contracts are now **automatically displayed** in the Exporter Portal's **Shipments tab** as **PENDING** entries until the exporter creates actual shipments. This provides a clear view of contracts ready for export workflow initiation.

---

## 🎯 Problem Solved

**Before:**
- ❌ Exporters had to remember which contracts were approved
- ❌ No visual indication in Shipments tab that contracts were ready
- ❌ Had to manually check Contracts tab, then create shipment

**After:**
- ✅ Approved contracts automatically appear in Shipments tab
- ✅ Clear "PENDING" status with visual indicators
- ✅ One-click "Create Shipment" button directly in Shipments tab
- ✅ Seamless workflow from contract approval to shipment creation

---

## 🔄 How It Works

### 1. **Contract Gets Approved by ECTA**
```
ECTA Portal → Review Contract → Approve
↓
Status changes: DRAFT → APPROVED
```

### 2. **Contract Automatically Appears in Shipments Tab**
```
Exporter Portal → Shipments Tab
↓
Shows approved contract with:
- Shipment ID: "PENDING" (italic, gray)
- Status: All fields marked "Awaiting Shipment" or "N/A"
- Action Button: "Create Shipment"
```

### 3. **Exporter Creates Actual Shipment**
```
Click "Create Shipment" button
↓
Fill in shipping details (origin, ICO number, ECX lot, etc.)
↓
Submit → Real shipment created
↓
PENDING entry removed, replaced with actual shipment record
```

---

## 🎨 Visual Indicators

### **In Shipments Table:**

| Column | Value for Pending Contracts |
|--------|----------------------------|
| **Shipment ID** | ⏳ PENDING _(gray, italic)_ |
| **Contract ID** | CONTRACT1788435011592 |
| **Buyer** | Buyer name from contract |
| **Destination** | Buyer country |
| **Quantity** | Contract quantity |
| **Quality Status** | 🔘 "Awaiting Shipment" _(gray)_ |
| **Export Permit** | 🔘 "N/A" _(gray)_ |
| **Customs Status** | 🔘 "N/A" _(gray)_ |
| **Actions** | 🟪 **"Create Shipment"** button |

### **Real Shipments:**

| Column | Value for Actual Shipments |
|--------|---------------------------|
| **Shipment ID** | 🚚 SHIP-1788435011592-123 |
| **Status** | 🟡 Pending / 🟢 Approved / 🔵 Shipped |
| **Actions** | "Declare Customs" / "Waiting" / "Cleared" |

---

## 🔧 Technical Implementation

### **Frontend Changes** (`ui/src/components/portals/ExporterPortal.tsx`)

#### **1. Merge Approved Contracts into Shipments Array**
```typescript
// After fetching shipments, filter approved contracts without shipments
const approvedContracts = contracts.filter(c => 
  (c.status === 'APPROVED' || c.status === 'NBE_APPROVED' || c.status === 'ACTIVE') &&
  !mappedShipments.some((s: any) => s.contractId === c.contractId)
);

// Map contracts to shipment format with PENDING status
const contractsAsPendingShipments = approvedContracts.map(contract => ({
  shipmentId: `PENDING-${contract.contractId}`,
  contractId: contract.contractId,
  status: 'PENDING',
  quantity: contract.quantity,
  destination: contract.buyerCountry,
  _isContract: true, // Flag to identify these are contracts
  // ... other fields set to defaults
}));

// Merge: pending contracts first, then actual shipments
const mergedShipments = [...contractsAsPendingShipments, ...mappedShipments];
setShipments(mergedShipments);
```

#### **2. Visual Indicators in DataGrid**
```typescript
// Shipment ID column
renderCell: (params) => {
  const isPending = params.row.isPendingContract;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isPending ? (
        <HourglassEmpty fontSize="small" sx={{ color: '#9E9E9E' }} />
      ) : (
        <LocalShipping fontSize="small" sx={{ color: BRAND_COLOR }} />
      )}
      <Typography 
        variant="body2" 
        fontWeight={600}
        sx={{ 
          color: isPending ? '#9E9E9E' : 'inherit',
          fontStyle: isPending ? 'italic' : 'normal'
        }}
      >
        {isPending ? 'PENDING' : params.value}
      </Typography>
    </Box>
  );
}
```

#### **3. Status Columns Logic**
```typescript
// Quality inspection status
let qualityStatus = isPendingContract ? 'Awaiting Shipment' : 'Pending';
let qualityColor = isPendingContract ? '#9E9E9E' : '#FF9800';

// Export permit status
let permitStatus = isPendingContract ? 'N/A' : 'Not Issued';
let permitColor = isPendingContract ? '#9E9E9E' : '#FF9800';

// Customs status
let customsStatus = isPendingContract ? 'N/A' : 'Not Declared';
let customsColor = isPendingContract ? '#9E9E9E' : '#FF9800';
```

#### **4. Action Button**
```typescript
// Actions column
renderCell: (params) => {
  if (params.row.isPendingContract) {
    return (
      <Button
        variant="contained"
        size="small"
        startIcon={<Add />}
        onClick={() => {
          setCreateShipmentDialogOpen(true);
          // Pre-fill contract in shipment form
          setNewShipment({
            ...newShipment,
            contractId: params.row.contractId,
          });
        }}
      >
        Create Shipment
      </Button>
    );
  }
  
  // ... normal shipment actions (customs declaration, etc.)
}
```

#### **5. Info Alert at Top**
```typescript
{contracts.filter(c => 
  (c.status === 'APPROVED' || c.status === 'NBE_APPROVED' || c.status === 'ACTIVE') &&
  !shipments.some(s => s.contractId === c.contractId)
).length > 0 && (
  <Alert severity="info" sx={{ mb: 3 }}>
    <Typography variant="body2">
      <strong>📋 Approved Contracts Awaiting Shipment</strong>
      <br />
      Your approved contracts are shown below with status <em>"PENDING"</em> until you create actual shipments.
      Click <strong>"Create Shipment"</strong> button to provide shipping details and initiate the export workflow.
    </Typography>
  </Alert>
)}
```

---

## 📊 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPORTER WORKFLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. CREATE CONTRACT
   Exporter Portal → My Sales Contracts → Register New Contract
   ↓
   Status: DRAFT

2. ECTA APPROVES CONTRACT
   ECTA Portal → Review & Approve
   ↓
   Status: APPROVED
   ✅ Contract cryptographically signed by ECTA officer

3. ✨ CONTRACT APPEARS IN SHIPMENTS TAB (NEW FEATURE)
   Exporter Portal → Shipments Tab
   ↓
   Shows:
   - Shipment ID: "PENDING"
   - Quality Status: "Awaiting Shipment"
   - Button: "Create Shipment"

4. EXPORTER CREATES SHIPMENT
   Click "Create Shipment" → Fill form
   ↓
   Shipment registered on blockchain
   ↓
   Status: CREATED
   📋 Quality inspection request auto-submitted to ECTA

5. CONTINUE EXPORT WORKFLOW
   Quality Inspection → Export Permit → Customs → Shipping → Payment
```

---

## 🧪 Testing

### **Test Case 1: Approved Contract Appears**
1. Login as ECTA officer
2. Navigate to Contracts tab
3. Approve a contract (e.g., CONTRACT1788435011592)
4. **Logout** and login as the exporter
5. Navigate to **Shipments tab**
6. **Expected:** Contract appears with:
   - ⏳ "PENDING" shipment ID (gray, italic)
   - 🔘 "Awaiting Shipment" status
   - 🟪 "Create Shipment" button

### **Test Case 2: Create Shipment from Pending Contract**
1. In Shipments tab, click **"Create Shipment"** on a PENDING row
2. Fill in shipment details:
   - Origin: "Sidamo, Ethiopia"
   - ICO Number: "ICO-123456"
   - ECX Lot Number: "ECX-789"
   - Grade: "Arabica Grade 1"
3. Upload documents
4. Submit
5. **Expected:**
   - PENDING row disappears
   - New shipment row appears with actual shipment ID
   - Status changes to "CREATED"

### **Test Case 3: Multiple Approved Contracts**
1. Approve 3 contracts (CONTRACT-A, CONTRACT-B, CONTRACT-C)
2. Login as exporter → Shipments tab
3. **Expected:** All 3 contracts shown as PENDING
4. Create shipment for CONTRACT-A
5. **Expected:** CONTRACT-A removed, CONTRACT-B and CONTRACT-C still PENDING

### **Test Case 4: Info Alert Shown**
1. Have at least 1 approved contract without shipment
2. Navigate to Shipments tab
3. **Expected:** Blue info alert at top:
   ```
   📋 Approved Contracts Awaiting Shipment
   Your approved contracts are shown below with status "PENDING"...
   ```

---

## 🎯 Business Value

### **For Exporters:**
- ✅ **Immediate visibility** of approved contracts ready for shipping
- ✅ **Faster workflow** - no need to switch tabs or remember contract IDs
- ✅ **Clear action items** - "Create Shipment" button prominently displayed
- ✅ **Reduced errors** - contract details pre-filled in shipment form

### **For System Efficiency:**
- ✅ **No database changes** - purely frontend logic (lightweight)
- ✅ **Real-time sync** - contracts appear immediately after approval
- ✅ **Clean separation** - pending vs actual shipments clearly distinguished
- ✅ **Scalable** - works for 1 or 100 approved contracts

---

## 🔐 Security & Permissions

- ✅ **Exporter-specific** - Only shows contracts belonging to logged-in exporter
- ✅ **Read-only display** - Cannot modify contract data from Shipments tab
- ✅ **Blockchain-backed** - Contract approval verified via blockchain signatures
- ✅ **Audit trail** - All shipment creations logged with user identity

---

## 📝 User Documentation

### **For Exporters:**

**Q: Why do I see "PENDING" in my Shipments tab?**  
A: These are your **approved contracts** that don't have shipments yet. Click "Create Shipment" to start the export workflow.

**Q: What happens after I click "Create Shipment"?**  
A: The system will:
1. Pre-fill contract details (buyer, quantity, value)
2. Ask you to provide shipping details (origin, ICO number, ECX lot)
3. Register the shipment on the blockchain
4. Automatically submit quality inspection request to ECTA

**Q: Can I create multiple shipments for one contract?**  
A: No. The system enforces **one contract = one shipment** to prevent fraud and duplicate exports.

**Q: What if I don't want to create a shipment yet?**  
A: No problem. The PENDING entry will stay in the Shipments tab until you're ready. You can create the shipment anytime.

---

## 🚀 Deployment

### **Files Modified:**
- ✅ `ui/src/components/portals/ExporterPortal.tsx`
  - Lines ~1115-1150: Merge approved contracts into shipments array
  - Lines ~4388-4650: DataGrid rendering with PENDING indicators
  - Lines ~4217-4230: Info alert for pending contracts

### **No Backend Changes Required:**
- ✅ Uses existing `/contracts` API
- ✅ Uses existing `/shipments` API
- ✅ No database schema changes
- ✅ No blockchain changes

### **Build & Deploy:**
```bash
cd ui
npm run build
npm start
```

---

## 🎉 Summary

This feature **bridges the gap** between contract approval and shipment creation, providing exporters with a **unified view** of their export pipeline. By showing approved contracts directly in the Shipments tab, we eliminate context switching and make the next action obvious.

**Key Innovation:** Virtual "PENDING" shipments that represent approved contracts, with a clear call-to-action to convert them into real shipments.

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** ✅ Deployed to Production

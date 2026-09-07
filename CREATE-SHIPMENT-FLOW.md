# Create Shipment Flow - Data Fetching Analysis

## When User Clicks "Create Shipment" Button on Pending Contract

### 1. **Button Click Location**
- **File**: `ui/src/components/portals/ExporterPortal.tsx`
- **Line**: ~2365-2380 (inside DataGrid actions column)
- **Component**: Purple "Create" button in Actions column for PENDING rows

### 2. **What Happens on Click**

```typescript
onClick={() => {
  setCreateShipmentDialogOpen(true);  // Opens the shipment creation dialog
  
  // Pre-select the contract
  if (contract) {
    const forex = forexStatuses.find(f => f.contractId === contract.contractId);
    setNewShipment({
      ...newShipment,
      contractId: contract.contractId,
    });
    
    // Auto-fill form with contract data
    if (forex) {
      applyContractToShipment(contract, forex.exchangeRate);
    }
  }
}
```

### 3. **Data Pre-Filled in Dialog** (`applyContractToShipment` function)

The following fields are **automatically populated** from the approved contract:

| Field | Source | Description |
|-------|--------|-------------|
| **contractId** | `contract.contractId` | The approved contract ID (e.g., CONTRACT1788435011592) |
| **quantity** | `contract.quantity` | Total coffee quantity from contract (kg) |
| **origin** | `contract.origin` or `contract.buyerCountry` | Origin country/region |
| **destination** | `contract.buyerCountry` | Destination country (buyer's location) |
| **icoNumber** | Generated or existing | ICO reference number (auto-generated if not provided) |
| **ecxLotNumber** | Generated or existing | ECX lot number (auto-generated if not provided) |
| **forexRate** | `forex.exchangeRate` | Exchange rate from allocated forex record |

### 4. **Data Sources**

#### A. **Contract Data** (from contracts array)
```typescript
const contract = contracts.find(c => c.contractId === shipment.contractId);
```

**Fields Available:**
- `contractId` - Contract ID
- `buyerName` - Buyer's company name
- `buyerId` - Buyer ID
- `buyerCountry` - Buyer's country
- `quantity` - Coffee quantity (kg)
- `pricePerKg` - Price per kilogram (USD)
- `origin` - Coffee origin
- `gradeType` - Coffee grade
- `status` - Contract status (APPROVED/NBE_APPROVED/ACTIVE)

#### B. **Forex Data** (from forexStatuses array)
```typescript
const forex = forexStatuses.find(f => f.contractId === contract.contractId);
```

**Fields Available:**
- `exchangeRate` - Current forex rate (e.g., 115.5 ETB/USD)
- `allocationStatus` - Forex allocation status
- `allocationDate` - When forex was allocated

### 5. **Additional Data Generated**

#### A. **ICO Reference** (Generated)
```typescript
generateICOReference(contractId, exporterId)
// Format: ICO-{exporterId}-{timestamp}
```

#### B. **ECX Lot Number** (Generated)
```typescript
generateECXLotNumber(contractId)
// Format: ECX-LOT-{timestamp}
```

### 6. **Fields User Must Fill Manually**

The dialog still requires user input for:
- ✍️ **Grade** - Coffee grade (e.g., Grade 1, Grade 2)
- ✍️ **Channel** - Export channel (ECX, Direct Export, Union/Cooperative)
- ✍️ **EUDR Compliance** - EU Deforestation Regulation compliance (checkbox)
- ✍️ **Documents** - Upload shipment-related documents
- ✍️ **Bond Reference** (if Direct Export channel selected)
- ✍️ **Union Approval Reference** (if Union/Cooperative channel selected)
- ✍️ **ECX Lot Number** (if ECX channel selected and not auto-generated)

### 7. **Validation Before Submission**

Before creating the shipment, the system validates:

1. **Profile Loaded**: Exporter profile must be loaded
2. **Contract Found**: Selected contract exists
3. **No Duplicate**: No existing shipment for this contract
4. **Valid Quantity**: Quantity must be positive number
5. **Quantity Limit**: Shipment quantity ≤ Contract quantity
6. **Channel-Specific**:
   - ECX: Requires ECX Lot Number
   - Union/Cooperative: Requires Union Approval Reference
   - Direct Export: Requires Bond Reference

### 8. **Final Shipment Data Structure**

When submitted, the API receives:

```typescript
{
  shipmentID: "SHIP{timestamp}",
  contractID: "CONTRACT1788435011592",
  exporterID: "EXP123",
  buyerID: "BUYER_ID",
  origin: "Yirgacheffe, Ethiopia",
  quantity: 5000,
  grade: "Grade 1",
  icoNumber: "ICO-EXP123-1788435011",
  ecxLotNumber: "ECX-LOT-1788435011",
  channel: "ECX",
  bondReference: null,
  unionApprovalReference: null,
  forexRate: 115.5,
  valueUSD: 46250.00,
  eudrCompliant: true,
  documents: [
    {
      documentId: "DOC-123",
      fileName: "quality_certificate.pdf",
      category: "QUALITY",
      hash: "sha256_hash",
      ipfsCID: "Qm...",
      description: "Quality inspection certificate",
      encrypted: false
    }
  ]
}
```

### 9. **Summary**

**Automatically Fetched & Pre-filled:**
- ✅ Contract ID
- ✅ Buyer information (from contract)
- ✅ Quantity (from contract)
- ✅ Origin/Destination (from contract)
- ✅ Forex rate (from forex allocation)
- ✅ Price per kg (from contract)
- ✅ ICO Number (auto-generated)
- ✅ ECX Lot Number (auto-generated)

**User Must Provide:**
- ❌ Grade selection
- ❌ Channel selection
- ❌ EUDR compliance confirmation
- ❌ Document uploads
- ❌ Channel-specific references (Bond/Union/ECX)

**Verification:**
- 🔐 Blockchain-verified contract signatures shown in View Details dialog
- 🔐 X.509 certificate details displayed for each signer
- 🔐 Transaction IDs available for independent verification
- 🔒 Duplicate shipment prevention check

---

## API Endpoint Called

**POST** `/api/v1/shipments`

**Authentication**: Bearer token (JWT)

**Request Body**: Full shipment data structure (shown above)

**Response**: 
- Success: `{ success: true, data: { shipmentId, blockchainTxId } }`
- Error: `{ success: false, error: { code, message } }`

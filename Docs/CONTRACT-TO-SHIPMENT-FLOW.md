# Contract to Shipment Flow - How It Works

## ✅ YES! Approved Contracts Appear in Shipment Creation

Your understanding is **100% correct**. Here's exactly how it works:

---

## 📍 Where You See Your Approved Contract

### **1. Contracts Tab (View All Contracts)**

```
Exporter Portal → Contracts Tab
┌────────────────┬─────────────┬─────────┬───────────────┐
│ Contract ID    │ Buyer       │ Value   │ Status        │
├────────────────┼─────────────┼─────────┼───────────────┤
│ CONTRACT123 ✅ │ Buyer USA   │ $50,000 │ 🟢 APPROVED   │
│ CONTRACT456 ⏳ │ Buyer EU    │ $30,000 │ 🟡 PENDING    │
│ CONTRACT789 ✅ │ Buyer Asia  │ $40,000 │ 🟢 NBE_APPROVED│
└────────────────┴─────────────┴─────────┴───────────────┘

✅ = Ready to use for shipment
⏳ = Not yet approved (can't use)
```

---

### **2. Shipments Tab → Create New Shipment**

```
Exporter Portal → Shipments → "Create New Shipment"

┌─────────────────────────────────────────────────────┐
│ Create New Shipment Dialog                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Select Approved Contract: [Dropdown ▼]              │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✅ CONTRACT123 — Arabica (5000 kg) → USA       │ │ ← Can select
│ │ ✅ CONTRACT789 — Robusta (3000 kg) → China     │ │ ← Can select
│ │ ⏳ CONTRACT456 — Arabica (4000 kg) → Germany   │ │ ← Disabled (awaiting forex)
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Only APPROVED contracts with forex allocation shown  │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 The Complete Flow

### **Stage 1: Contract Creation & Approval**

```
Step 1: Exporter creates contract
   ↓
Step 2: ECTA reviews contract
   ↓
Step 3: ECTA approves contract
   ↓
Step 4: Contract documents signed ✓
   ↓
Step 5: Contract status → APPROVED
   ↓
Step 6: NBE allocates forex
   ↓
Step 7: Contract status → NBE_APPROVED or ACTIVE
   ↓
✅ Contract is now READY for shipment creation
```

---

### **Stage 2: Shipment Creation (Current Step)**

```
Exporter Portal → Shipments Tab → Create New Shipment
   ↓
Contract Selection Dropdown Shows:
   • ONLY approved contracts
   • ONLY contracts with forex allocated
   • Filtered automatically
   ↓
Exporter selects: CONTRACT123
   ↓
System auto-fills from contract:
   • Buyer name & country
   • Coffee type
   • Maximum quantity
   • Currency
   • Price per kg
   • Forex rate (from NBE allocation)
   ↓
Exporter adds shipment-specific details:
   • Actual quantity being shipped
   • Origin (Yirgacheffe, Sidamo, etc.)
   • Destination port
   • EUDR compliance (for EU)
   ↓
Submit Shipment
   ↓
✅ Shipment created and linked to CONTRACT123
```

---

## 🎯 Contract Selection Logic

### **Automatic Filtering (in code):**

```typescript
// From ExporterPortal.tsx line 5692
contracts
  .filter(c => 
    c.status === 'APPROVED' || 
    c.status === 'NBE_APPROVED' || 
    c.status === 'ACTIVE'
  )
  .map((contract) => {
    const forex = forexStatuses.find(f => 
      f.contractId === contract.contractId && 
      f.status === 'ALLOCATED'
    );
    const hasForex = !!forex;
    
    return (
      <MenuItem
        value={contract.contractId}
        disabled={!hasForex}  // Can't select without forex
      >
        {hasForex ? '✅' : '⏳'} {contract.contractId} 
        — {contract.coffeeType} 
        ({contract.quantity.toLocaleString()} kg) 
        → {contract.buyerCountry}
        {!hasForex && ' (awaiting forex allocation)'}
      </MenuItem>
    );
  })
```

### **What This Means:**

1. **Only APPROVED contracts appear**
   - Status must be: APPROVED, NBE_APPROVED, or ACTIVE
   - Pending/Rejected contracts hidden

2. **Only contracts WITH forex allocation enabled**
   - NBE must have allocated forex
   - Without forex = grayed out with "⏳ (awaiting forex allocation)"

3. **Visual indicators:**
   - ✅ = Ready (has forex, can use)
   - ⏳ = Waiting (no forex yet, can't use)

---

## 📊 Visual Example

### **Exporter sees this dropdown:**

```
Select Approved Contract
┌─────────────────────────────────────────────────────┐
│ ✅ CONTRACT1788435011592 — Arabica (18000 kg) → USA│ ← Your approved contract!
│                                                      │
│ ⏳ CONTRACT789456 — Robusta (5000 kg) → Germany    │ ← Waiting forex
│    (awaiting forex allocation)                      │
└─────────────────────────────────────────────────────┘
```

**Click on the ✅ contract:**
```
Auto-fills:
✓ Buyer: USA Buyer Company
✓ Coffee: Arabica
✓ Max Quantity: 18,000 kg
✓ Price: $9.25/kg
✓ Forex Rate: 115.50 ETB/USD
✓ Currency: USD

Exporter adds:
• Quantity: 5,000 kg (or up to 18,000)
• Origin: Yirgacheffe
• Destination: New York Port
• EUDR: Yes (EU destination)
```

---

## 🔗 Data Linkage

### **After shipment creation:**

```yaml
Database Tables:

contracts:
  contract_id: CONTRACT1788435011592
  status: APPROVED
  buyer_id: BUYER_USA_001
  quantity: 18000
  
shipments:
  shipment_id: SHIP-12345
  contract_id: CONTRACT1788435011592  ← LINKED!
  exporter_id: EXP8958382
  buyer_id: BUYER_USA_001  ← From contract
  quantity: 5000  ← Actual shipment amount
  status: CREATED

Blockchain:
  ContractID: CONTRACT1788435011592
  ShipmentID: SHIP-12345
  LinkedOn: 2026-09-03T12:00:00Z
  TxID: abc123...
```

---

## ⚠️ Important Rules

### **One Shipment Per Contract**

```
Contract → Shipment (1:1 relationship)

✅ Allowed:
CONTRACT123 → SHIP001 ✓

❌ Not Allowed:
CONTRACT123 → SHIP001 ✓
CONTRACT123 → SHIP002 ✗  (duplicate prevented!)
```

**Why?** Each contract represents a specific deal with a specific quantity. One shipment fulfills that contract.

**If you see this warning:**
```
⚠️ Shipment Already Exists
This contract already has a registered shipment: SHIP-001
Status: QUALITY_APPROVED
Each contract can only have one shipment.
```

**Solution:** Check your existing shipments tab - you already created one!

---

### **Quantity Validation**

```
Contract Quantity: 18,000 kg
Shipment Quantity: Cannot exceed 18,000 kg

✅ Valid: 5,000 kg
✅ Valid: 18,000 kg (full amount)
❌ Invalid: 20,000 kg (exceeds contract!)
```

**If you try to exceed:**
```
⚠️ Quantity Exceeds Contract
Maximum quantity: 18,000 kg
Shipment quantity cannot exceed contract quantity
```

---

### **Forex Requirement**

```
For shipment creation, contract MUST have:
1. ECTA Approval ✓
2. NBE Forex Allocation ✓

Without forex:
⏳ CONTRACT456 — Arabica (4000 kg) → Germany
   (awaiting forex allocation)
   [DISABLED - Cannot select]
```

**Reason:** Payment calculation requires forex rate. NBE must allocate forex before shipping.

---

## 🎬 Step-by-Step: Creating Your First Shipment

### **Prerequisites:**
- ✅ Contract approved by ECTA
- ✅ Contract documents signed
- ✅ NBE forex allocated

### **Steps:**

**1. Login to Exporter Portal**
```
URL: http://localhost:3000/portals/exporter
Username: Your exporter ID (e.g., EXP8958382)
Password: Your password
```

**2. Navigate to Shipments**
```
Top navigation → "Shipments" tab
```

**3. Click "Create New Shipment"**
```
Button at top right: "+ Create New Shipment"
```

**4. Select Your Approved Contract**
```
Dropdown: "Select Approved Contract"
Choose: ✅ CONTRACT1788435011592 — Arabica...
```

**5. See Auto-Filled Data**
```
System fills:
• Buyer information
• Coffee type
• Maximum quantity
• Price per kg
• Forex rate
```

**6. Add Shipment Details**
```
Required fields:
• Quantity: 5000 (example)
• Origin: Yirgacheffe
• Destination: Destination port
• Coffee Type: Auto-filled
• Grade: Select grade
• Processing: Washed/Natural/etc.

For EU destinations:
• EUDR Compliant: Yes
• Geolocation: GPS coordinates
• Due Diligence: Upload document
```

**7. Upload Documents**
```
• Packing list
• Sample details  
• Weight certificate
• EUDR documents (if EU)
```

**8. Review and Submit**
```
Check:
✓ Contract selected correctly
✓ Quantity within limits
✓ All fields filled
✓ Documents uploaded

Click: "Create Shipment"
```

**9. Confirmation**
```
✅ Shipment Created Successfully!
Shipment ID: SHIP-12345
Contract: CONTRACT1788435011592
Status: CREATED

Next: Quality inspection will be scheduled
```

---

## 🔄 What Happens After Shipment Creation

```
Shipment Status: CREATED
   ↓
System Actions:
   • Records on blockchain
   • Notifies ECTA Quality team
   • Assigns to inspection queue
   • Generates shipment ID
   ↓
ECTA Quality Inspector notified:
   📧 "New shipment awaiting inspection"
   ↓
Inspector logs in → Quality Tab
   ↓
Sees your shipment in pending queue
   ↓
Conducts inspection
   ↓
Issues quality certificate ✓ (signed)
   ↓
Shipment status → QUALITY_APPROVED
   ↓
... workflow continues automatically
```

---

## 📝 Summary

### **Q: Where do I see my approved contract?**
**A:** In the **Shipments Tab → Create New Shipment → Contract Dropdown**

### **Q: Will ALL my contracts appear?**
**A:** NO - only:
- ✅ Approved contracts (APPROVED/NBE_APPROVED/ACTIVE status)
- ✅ Contracts with forex allocated by NBE
- ❌ Pending contracts hidden
- ❌ Contracts without forex disabled (grayed out)

### **Q: Can I create multiple shipments for one contract?**
**A:** NO - one contract = one shipment (1:1 relationship)

### **Q: What if I don't see my contract?**
**A:** Check:
1. Contract status is APPROVED? (check Contracts tab)
2. NBE allocated forex? (check for ✅ vs ⏳)
3. Already created shipment? (check Shipments tab)

### **Q: What information carries over from contract?**
**A:** Auto-filled:
- Buyer details
- Coffee type
- Maximum quantity
- Price per kg
- Currency
- Forex rate

You add:
- Actual shipping quantity
- Origin location
- Processing method
- EUDR compliance
- Packing details

---

## ✅ Ready to Create Your Shipment?

**Current State:** Contract approved with signed documents ✅

**Your Next Action:** 
1. Login to Exporter Portal
2. Go to Shipments tab
3. Click "Create New Shipment"
4. Select your approved contract from dropdown
5. Fill in details and submit

**System will automatically guide you through the rest!** 🚀

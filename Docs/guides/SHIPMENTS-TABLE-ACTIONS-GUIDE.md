# 🎯 Shipments Table - Actions Guide

## 📋 Overview

The Shipments table now shows **approved contracts as PENDING rows** with **direct action buttons** to create shipments without leaving the table view.

---

## 🎨 Complete Table View with Actions

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                         📋 Approved Contracts Awaiting Shipment                               │
│  Click "Create Shipment" button on PENDING rows to initiate the export workflow              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

╔════════════════╦══════════════════╦═════════════╦════════════╦══════════╦════════════════════╗
║ Shipment ID    ║ Contract         ║ Buyer       ║ Destination║ Quantity ║ Quality Inspection ║
╠════════════════╬══════════════════╬═════════════╬════════════╬══════════╬════════════════════╣
║ ⏳ PENDING     ║ CONTRACT1788...  ║ GLOBAL_BUYER║ USA        ║ 1,987 kg ║ 🔘 Awaiting Ship.. ║
║ (gray, italic) ║                  ║             ║            ║          ║                    ║
╠════════════════╬══════════════════╬═════════════╬════════════╬══════════╬════════════════════╣
║ ⏳ PENDING     ║ CONTRACT1789...  ║ EURO_COFFEE ║ Germany    ║ 5,000 kg ║ 🔘 Awaiting Ship.. ║
║ (gray, italic) ║                  ║             ║            ║          ║                    ║
╠════════════════╬══════════════════╬═════════════╬════════════╬══════════╬════════════════════╣
║ 🚚 SHIP-178... ║ CONTRACT1790...  ║ ITALY_BEANS ║ Italy      ║ 8,000 kg ║ 🟡 Pending         ║
║                ║                  ║             ║            ║          ║                    ║
╠════════════════╬══════════════════╬═════════════╬════════════╬══════════╬════════════════════╣
║ 🚚 SHIP-179... ║ CONTRACT1791...  ║ JAPAN_TRADE ║ Japan      ║ 3,500 kg ║ 🟢 Approved        ║
║                ║                  ║             ║            ║          ║                    ║
╚════════════════╩══════════════════╩═════════════╩════════════╩══════════╩════════════════════╝

╔══════════════╦══════════════════╦══════════════════════════════════════════════════════════════╗
║ Export Permit║ Customs Status   ║ Actions                                                      ║
╠══════════════╬══════════════════╬══════════════════════════════════════════════════════════════╣
║ 🔘 N/A       ║ 🔘 N/A           ║ 🟪 [Create Shipment]  ← CLICK THIS                          ║
║              ║                  ║                                                              ║
╠══════════════╬══════════════════╬══════════════════════════════════════════════════════════════╣
║ 🔘 N/A       ║ 🔘 N/A           ║ 🟪 [Create Shipment]  ← CLICK THIS                          ║
║              ║                  ║                                                              ║
╠══════════════╬══════════════════╬══════════════════════════════════════════════════════════════╣
║ 🟡 Not Issued║ 🟡 Not Declared  ║ 🟡 [Waiting] (ECTA inspection pending)                       ║
║              ║                  ║                                                              ║
╠══════════════╬══════════════════╬══════════════════════════════════════════════════════════════╣
║ 🟢 Issued    ║ 🟡 Not Declared  ║ 🟪 [Declare Customs] ← CLICK TO DECLARE                     ║
║              ║                  ║                                                              ║
╚══════════════╩══════════════════╩══════════════════════════════════════════════════════════════╝
```

---

## 🎯 Actions Available by Row Type

### **Row Type 1: PENDING (Approved Contracts)**

**Visual:**
- ⏳ Shipment ID: "PENDING" (gray, italic)
- 🔘 All statuses: Gray "N/A" or "Awaiting Shipment"
- 🟪 Action Button: **"Create Shipment"**

**What Happens When You Click "Create Shipment":**
```
1. Dialog/Form opens
2. Contract is PRE-SELECTED automatically
3. Contract details PRE-FILLED (buyer, quantity, coffee type, value)
4. You only fill in:
   - Origin location (e.g., "Sidamo, Ethiopia")
   - ICO Number
   - ECX Lot Number
   - Grade
   - Transport mode (Sea/Air)
5. Upload required documents
6. Click "Submit"
7. ✅ Shipment created on blockchain
8. ✅ Quality inspection auto-requested to ECTA
9. ✅ PENDING row disappears from table
10. ✅ New row appears with real shipment ID
```

**Pre-filled Fields:**
- ✅ Contract ID (locked)
- ✅ Buyer Name (locked)
- ✅ Buyer Country (locked)
- ✅ Coffee Type (locked)
- ✅ Quantity (locked)
- ✅ Price per kg (locked)
- ✅ Total Value (locked)
- ✅ Currency (locked)

**Fields You Fill:**
- ✏️ Origin (free text)
- ✏️ ICO Number (text input)
- ✏️ ECX Lot Number (text input)
- ✏️ Grade (dropdown: Grade 1, Grade 2, etc.)
- ✏️ Transport Mode (radio: Sea / Air)
- ✏️ EUDR Compliant (checkbox)
- 📎 Documents (file upload)

---

### **Row Type 2: CREATED (Awaiting Quality Inspection)**

**Visual:**
- 🚚 Shipment ID: Real ID (e.g., "SHIP-1788435011592-123456")
- 🟡 Quality Status: "Pending"
- 🟡 Export Permit: "Not Issued"
- 🟡 Customs Status: "Not Declared"
- 🟡 Action Button: **"Waiting"** (disabled chip)

**What It Means:**
- ✅ Shipment created successfully
- ⏳ ECTA quality inspector will perform physical inspection
- ⏳ Cupping test scheduled within 2-3 business days
- ❌ No action needed from you - just wait

**What Happens Next:**
- ECTA receives quality inspection request
- Inspector schedules visit
- Physical inspection + cupping test performed
- Results uploaded to system
- Status changes to "Approved" or "Rejected"

---

### **Row Type 3: APPROVED (Quality Passed, Permit Issued)**

**Visual:**
- 🚚 Shipment ID: Real ID
- 🟢 Quality Status: "Approved"
- 🟢 Export Permit: "Issued"
- 🟡 Customs Status: "Not Declared"
- 🟪 Action Button: **"Declare Customs"**

**What Happens When You Click "Declare Customs":**
```
1. Customs declaration form opens
2. Pre-filled fields:
   - HS Code: 090111 (coffee, not roasted)
   - Port of Exit: Djibouti Port
   - Customs Value: Auto-calculated
   - EUDR Compliance: From shipment data
3. You can add:
   - Additional notes
   - Supporting documents
4. Click "Submit Declaration"
5. ✅ Declaration submitted to customs
6. ✅ Status changes to "Declared"
7. ⏳ Await customs officer clearance
```

**Required Documents for Customs:**
- ✅ Quality Certificate (from ECTA)
- ✅ Export Permit (from ECTA)
- ✅ Commercial Invoice
- ✅ Phytosanitary Certificate
- ✅ Bill of Lading (if available)
- ✅ EUDR Due Diligence Statement (for EU)

---

### **Row Type 4: DECLARED (Awaiting Customs Clearance)**

**Visual:**
- 🚚 Shipment ID: Real ID
- 🟢 Quality Status: "Approved"
- 🟢 Export Permit: "Issued"
- 🔵 Customs Status: "Declared"
- 🔵 Action Chip: **"Declared"** (informational)

**What It Means:**
- ✅ Customs declaration submitted
- ⏳ Customs officer reviewing documents
- ⏳ Physical inspection may be scheduled
- ❌ No action needed - just wait

**What Happens Next:**
- Customs officer reviews declaration
- May request additional documents
- May schedule physical inspection
- Issues clearance certificate
- Status changes to "Cleared"

---

### **Row Type 5: CLEARED (Ready for Shipping)**

**Visual:**
- 🚚 Shipment ID: Real ID
- 🟢 Quality Status: "Approved"
- 🟢 Export Permit: "Issued"
- 🟢 Customs Status: "Cleared"
- ✅ Action Chip: **"Cleared"** (green, with checkmark)

**What It Means:**
- ✅ All approvals obtained
- ✅ Ready for physical shipment
- ✅ Can proceed to loading and departure

**Next Steps (Outside Portal):**
1. Arrange shipping with freight forwarder
2. Load cargo at port/airport
3. Obtain Bill of Lading
4. Shipment departs
5. Update system with tracking details
6. Await arrival and delivery
7. Submit documents to bank for payment

---

## 🔄 Complete Action Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPORTER ACTION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: CONTRACT APPROVED (ECTA)
   ↓
   PENDING row appears in table
   ↓
   🟪 [Create Shipment] button visible
   ↓
   
Step 2: EXPORTER CLICKS "Create Shipment"
   ↓
   Form opens with contract pre-filled
   ↓
   Exporter fills: Origin, ICO#, ECX Lot, Grade
   ↓
   Uploads documents
   ↓
   Submits
   ↓
   
Step 3: SHIPMENT CREATED
   ↓
   PENDING row disappears
   ↓
   Real shipment row appears
   ↓
   Status: 🟡 Waiting
   ↓
   Quality inspection auto-requested
   ↓
   
Step 4: ECTA APPROVES QUALITY
   ↓
   Status: 🟢 Approved
   ↓
   Export permit issued
   ↓
   🟪 [Declare Customs] button appears
   ↓
   
Step 5: EXPORTER CLICKS "Declare Customs"
   ↓
   Customs form opens (pre-filled)
   ↓
   Exporter reviews and submits
   ↓
   
Step 6: CUSTOMS DECLARED
   ↓
   Status: 🔵 Declared
   ↓
   🔵 [Declared] chip (informational)
   ↓
   Awaiting customs officer
   ↓
   
Step 7: CUSTOMS OFFICER CLEARS
   ↓
   Status: 🟢 Cleared
   ↓
   ✅ [Cleared] chip (green)
   ↓
   Ready for physical shipment
   ↓
   
Step 8: PHYSICAL SHIPMENT & PAYMENT
   ↓
   Arrange shipping
   ↓
   Load and depart
   ↓
   Submit documents to bank
   ↓
   Receive payment
   ↓
   ✅ Export Complete
```

---

## 🎨 Button Visual Guide

### **🟪 Purple Buttons - Primary Actions**
```
[Create Shipment]
[Declare Customs]
```
- **When:** Actionable step ready
- **What:** Click to proceed to next stage
- **Effect:** Opens form or dialog

### **🟡 Orange Chips - Waiting States**
```
[Waiting]
```
- **When:** Action pending from another party (ECTA, Customs, Bank)
- **What:** Informational only, no click action
- **Effect:** None - just wait

### **🔵 Blue Chips - In Progress**
```
[Declared]
```
- **When:** Action submitted, awaiting response
- **What:** Informational only
- **Effect:** None - progress indication

### **🟢 Green Chips - Completed**
```
[Cleared]
[Approved]
```
- **When:** Stage completed successfully
- **What:** Informational only
- **Effect:** None - confirmation

---

## 📊 Action Summary Table

| Row Status | Shipment ID | Action Button | Click Result | Who Acts |
|------------|-------------|---------------|--------------|----------|
| **PENDING** | ⏳ PENDING | 🟪 Create Shipment | Opens shipment form | **YOU** |
| **CREATED** | 🚚 SHIP-XXX | 🟡 Waiting | None (disabled) | ECTA |
| **APPROVED** | 🚚 SHIP-XXX | 🟪 Declare Customs | Opens customs form | **YOU** |
| **DECLARED** | 🚚 SHIP-XXX | 🔵 Declared | None (info only) | Customs |
| **CLEARED** | 🚚 SHIP-XXX | ✅ Cleared | None (info only) | **YOU** (offline) |

**Key:**
- **YOU** = Exporter must take action
- **ECTA** = Waiting for ECTA quality inspector
- **Customs** = Waiting for customs officer
- **YOU (offline)** = Physical shipping action outside system

---

## ✅ Quick Action Checklist

### **When You See PENDING Row:**
- [ ] Check contract details are correct
- [ ] Prepare required documents
- [ ] Click **"Create Shipment"** button
- [ ] Fill in origin, ICO#, ECX lot, grade
- [ ] Upload documents
- [ ] Submit shipment

### **When You See 🟡 Waiting:**
- [ ] No action needed
- [ ] ECTA inspector will contact you
- [ ] Prepare coffee samples for cupping
- [ ] Await inspection results (2-3 days)

### **When You See 🟪 Declare Customs:**
- [ ] Review pre-filled customs form
- [ ] Add any additional notes
- [ ] Upload supporting documents
- [ ] Click **"Declare Customs"** button
- [ ] Submit declaration

### **When You See 🔵 Declared:**
- [ ] No action needed
- [ ] Monitor for customs clearance
- [ ] Respond to any document requests
- [ ] Await clearance (1-2 days)

### **When You See ✅ Cleared:**
- [ ] Arrange freight forwarder
- [ ] Schedule pickup/loading
- [ ] Obtain Bill of Lading
- [ ] Confirm departure
- [ ] Submit docs to bank for payment

---

## 🎉 Summary

**Actions YOU Take:**
1. ✅ **Create Shipment** (from PENDING row)
2. ✅ **Declare Customs** (after permit issued)
3. ✅ **Physical Shipping** (after clearance)

**Actions System/Others Take:**
- ⏳ **Quality Inspection** (ECTA)
- ⏳ **Customs Clearance** (Customs Officer)
- ⏳ **Payment Processing** (Bank)

**Total Clicks in Table:**
- **2 clicks** for entire export workflow (Create + Declare)
- **Everything else is automatic or external**

---

**Ready to Test! 🚀**

1. Start services: `cd api && npm start`, `cd ui && npm start`
2. Login as exporter
3. Navigate to Shipments tab
4. Look for PENDING rows (approved contracts)
5. Click **"Create Shipment"** button
6. Fill form and submit
7. Watch row transform from PENDING → Real shipment

**Build Status:** ✅ Successful  
**Actions:** ✅ Fully Implemented  
**Documentation:** ✅ Complete

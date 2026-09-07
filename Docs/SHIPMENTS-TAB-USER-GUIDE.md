# Shipments Tab - User Guide for Exporters

## 📦 What You'll See in the Shipments Tab

The Shipments tab now shows **TWO types of entries**:

### 1. ⏳ **PENDING** - Approved Contracts (Gray, Italic)
These are contracts that have been approved by ECTA but don't have shipments yet.

### 2. 🚚 **ACTUAL SHIPMENTS** - With Real Shipment IDs
These are shipments you've already created and are in the export workflow.

---

## 🎨 Visual Guide

### **Example: Shipments Tab Display**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  📋 Approved Contracts Awaiting Shipment                                        │
│  Your approved contracts are shown below with status "PENDING" until you        │
│  create actual shipments. Click "Create Shipment" to initiate export workflow.  │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Shipment ID          │ Contract            │ Buyer        │ Destination │ Quantity │ Actions │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⏳ PENDING           │ CONTRACT1788435011  │ GLOBAL_BUYER │ USA         │ 1,987 kg │ 🟪 Create Shipment │
│   (gray, italic)     │                     │              │             │          │                     │
│                      │                     │              │             │          │                     │
│ Quality: Awaiting Shipment    Export Permit: N/A         Customs: N/A             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🚚 SHIP-1788-123456  │ CONTRACT1788435012  │ COFFEE_CO    │ Germany     │ 5,000 kg │ 🟡 Waiting         │
│                      │                     │              │             │          │                     │
│ Quality: Pending      Export Permit: Not Issued          Customs: Not Declared    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🚚 SHIP-1788-789012  │ CONTRACT1788435013  │ EURO_BEANS   │ Italy       │ 8,000 kg │ 🟢 Declare         │
│                      │                     │              │             │          │                     │
│ Quality: ✓ Approved   Export Permit: ✓ Issued           Customs: Ready to Declare│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Workflow

### **Step 1: Contract Gets Approved**
```
Your Contract (CONTRACT1788435011592) is approved by ECTA
↓
Automatically appears in Shipments tab as "PENDING"
```

### **Step 2: You See It in Shipments Tab**
```
Navigate to: Exporter Portal → Shipments (0) → Inspections (0) → Customs & Export (1)

You see:
┌────────────────────────────────────────────┐
│ ⏳ PENDING                                 │
│ Contract: CONTRACT1788435011592             │
│ Buyer: GLOBAL_BUYER                         │
│ Destination: United States                  │
│ Quantity: 1,987 kg                          │
│                                             │
│ Quality Status: 🔘 Awaiting Shipment       │
│ Export Permit: 🔘 N/A                      │
│ Customs Status: 🔘 N/A                     │
│                                             │
│ [🟪 Create Shipment]                       │
└────────────────────────────────────────────┘
```

### **Step 3: Click "Create Shipment"**
```
Dialog opens with pre-filled contract info:
┌────────────────────────────────────────────┐
│  Register New Shipment                      │
├────────────────────────────────────────────┤
│  Contract: CONTRACT1788435011592            │
│  (automatically selected, grayed out)       │
│                                             │
│  Origin: [Sidamo, Ethiopia          ]       │
│  ICO Number: [ICO-                  ]       │
│  ECX Lot Number: [ECX-              ]       │
│  Coffee Type: Arabica (pre-filled)          │
│  Grade: [Grade 1                    ]       │
│  Quantity: 1987 kg (pre-filled)             │
│  Processing: Washed (pre-filled)            │
│  Transport Mode: ○ Sea  ○ Air               │
│  EUDR Compliant: ☑ Yes                      │
│                                             │
│  [Cancel]           [Submit Shipment]       │
└────────────────────────────────────────────┘
```

### **Step 4: Submit Shipment**
```
System does:
✅ Validates shipment details
✅ Registers shipment on blockchain
✅ Auto-submits quality inspection request to ECTA
✅ Removes PENDING entry from Shipments tab
✅ Adds new entry with actual shipment ID
```

### **Step 5: Track Your Shipment**
```
Now you see:
┌────────────────────────────────────────────┐
│ 🚚 SHIP-1788435011592-1704067200           │
│ Contract: CONTRACT1788435011592             │
│ Buyer: GLOBAL_BUYER                         │
│ Destination: United States                  │
│ Quantity: 1,987 kg                          │
│                                             │
│ Quality Status: 🟡 Pending                 │
│ Export Permit: 🟡 Not Issued               │
│ Customs Status: 🟡 Not Declared            │
│                                             │
│ [🟡 Waiting]                               │
│ (Waiting for ECTA quality inspection)       │
└────────────────────────────────────────────┘
```

---

## 🎯 Understanding the Status Colors

### **PENDING Entries (Approved Contracts)**
| Field | Display | Meaning |
|-------|---------|---------|
| Shipment ID | ⏳ PENDING _(gray, italic)_ | Not a real shipment yet |
| Quality Status | 🔘 Awaiting Shipment _(gray)_ | Shipment needs to be created first |
| Export Permit | 🔘 N/A _(gray)_ | Not applicable until shipment created |
| Customs Status | 🔘 N/A _(gray)_ | Not applicable until shipment created |
| Action Button | 🟪 **Create Shipment** | Click to start export workflow |

### **Real Shipments**
| Field | Display | Meaning |
|-------|---------|---------|
| Shipment ID | 🚚 SHIP-XXX-XXX | Actual blockchain shipment ID |
| Quality Status | 🟡 Pending / 🟢 Approved | ECTA inspection status |
| Export Permit | 🟡 Not Issued / 🟢 Issued | ECTA export permit status |
| Customs Status | 🟡 Not Declared / 🔵 Declared / 🟢 Cleared | Customs clearance status |
| Action Button | 🟡 Waiting / 🟢 Declare / 🔵 Declared | Your next action |

---

## ❓ Frequently Asked Questions

### **Q: Why is my contract showing as "PENDING" in Shipments?**
**A:** Your contract has been approved by ECTA and is ready for export. Click the "Create Shipment" button to provide shipping details and start the export workflow.

### **Q: What information do I need to create a shipment?**
**A:** You need:
- ✅ Origin location (e.g., "Sidamo, Ethiopia")
- ✅ ICO Number (International Coffee Organization)
- ✅ ECX Lot Number (Ethiopian Commodity Exchange)
- ✅ Coffee grade (e.g., "Grade 1")
- ✅ Transport mode (Sea or Air)
- ✅ EUDR compliance confirmation

The contract details (buyer, quantity, coffee type) are **automatically filled** from your approved contract.

### **Q: Can I create a shipment later?**
**A:** Yes! The PENDING entry will stay in your Shipments tab until you're ready to create the shipment. There's no deadline.

### **Q: What happens after I create a shipment?**
**A:** The system will:
1. Register your shipment on the blockchain
2. Automatically submit a quality inspection request to ECTA
3. ECTA inspector will schedule physical inspection and cupping test
4. Once approved, ECTA issues export permit
5. You can then proceed to customs declaration and shipping

### **Q: Can I create multiple shipments for one contract?**
**A:** No. The system enforces **one contract = one shipment** to comply with export regulations and prevent fraud.

### **Q: I created a shipment but it still shows PENDING?**
**A:** Refresh the page (F5) or navigate away and back to the Shipments tab. The page should update automatically, but a manual refresh ensures the latest data.

### **Q: What if I don't see my approved contract?**
**A:** Check:
1. ✅ Contract status is "APPROVED" (not "DRAFT" or "REGISTERED")
2. ✅ You're logged in as the correct exporter
3. ✅ You haven't already created a shipment for this contract
4. ✅ Refresh the page (F5)

### **Q: Can I edit a PENDING entry?**
**A:** No. PENDING entries are read-only representations of your approved contracts. To modify contract details, go to the "My Sales Contracts (1)" tab.

---

## 🚀 Quick Tips

### **Tip 1: Batch Processing**
If you have multiple approved contracts:
1. Review all PENDING entries in Shipments tab
2. Prepare documents for all shipments in advance
3. Create shipments one by one in order of priority

### **Tip 2: Document Preparation**
Before creating a shipment, have ready:
- ✅ Quality certificates
- ✅ Phytosanitary certificates
- ✅ ICO certificate
- ✅ ECX warehouse receipt
- ✅ Commercial invoice

### **Tip 3: EUDR Compliance**
For shipments to the EU, ensure:
- ✅ EUDR due diligence statement prepared
- ✅ Geolocation data available
- ✅ Deforestation-free sourcing documented

### **Tip 4: Transport Mode Selection**
- 🚢 **Sea Freight:** Lower cost, longer transit (30-45 days)
- ✈️ **Air Freight:** Higher cost, faster transit (3-7 days)

Choose based on:
- Contract urgency
- Coffee freshness requirements
- Buyer's preference
- Cost considerations

---

## 📞 Need Help?

**Technical Support:**
- Email: support@cecbs.et
- Phone: +251-11-XXX-XXXX
- Hours: Mon-Fri, 8:00 AM - 5:00 PM EAT

**ECTA Quality Inspection:**
- Email: quality@ecta.gov.et
- Phone: +251-11-XXX-XXXX

**Customs Support:**
- Email: customs@erca.gov.et
- Phone: +251-11-XXX-XXXX

---

## 🎉 Summary

The **Shipments tab** is now your **one-stop dashboard** for:
- 👀 Viewing approved contracts ready for export
- 🚀 Creating new shipments with one click
- 📊 Tracking shipments through the entire export workflow
- 📋 Managing quality inspections, permits, and customs

**No more switching between tabs** - everything you need is right here!

---

**User Guide Version:** 1.0  
**Last Updated:** January 2026  
**For:** Coffee Exporters in Ethiopia

# Ethiopian Coffee Export Workflow - Complete Process

**Ethiopian Coffee Export Consortium Blockchain System (CECBS)**  
**Date:** June 3, 2026

---

## Overview

This document outlines the complete end-to-end workflow for coffee exporters in the CECBS system, from initial registration through final goods delivery.

---

## Complete Export Workflow

### **PHASE 1: Exporter Registration & Licensing** 🏢
**Organization: ECTA (Ethiopian Coffee & Tea Authority)**

#### Step 1.1: Exporter Application Submission
**Who:** New Coffee Exporter  
**Portal:** Exporter Portal (Public Registration)  
**Action:**
```
- Submit registration form with:
  * Company information
  * ECTA license number
  * Exporter type (Direct/Indirect/Union/Cooperative)
  * Capital requirement proof (15M - 75M Birr)
  * Professional taster certificate
  * Laboratory certification (if applicable)
  * Laboratory certificate number
  * Bank account details
```

**Blockchain Function:**
```go
RegisterExporter(
  exporterId,           // EXP2026001
  companyName,          // "Modern Coffee Exports PLC"
  ectaLicenseNumber,    // "ECTA-LIC-2026-001"
  exporterType,         // "Direct_Exporter"
  capitalRequirement,   // "75000000"
  laboratoryCertified,  // "true"
  labCertNumber,        // "LAB-CERT-2026-999"
  professionalTaster,   // "Dr. Meron Teshome"
  tasterCertificate     // "TASTER-CERT-2026-001"
)
```

#### Step 1.2: ECTA Review & Approval
**Who:** ECTA Officer  
**Portal:** ECTA Portal  
**Action:**
```
- Review application documents
- Verify capital requirements
- Validate taster certificate
- Check laboratory certification
- Approve or reject application
```

**Status After Approval:** ✅ **ACTIVE Exporter**

---

### **PHASE 2: Coffee Sourcing & Quality Certification** ☕
**Organization: Exporter + ECTA**

#### Step 2.1: Source Coffee
**Who:** Approved Exporter  
**Action:**
```
- Purchase coffee from:
  * Farmers/Cooperatives (Direct Export)
  * ECX Commodity Exchange (Indirect)
  * Coffee Unions
  
- Obtain purchase invoices and receipts
```

#### Step 2.2: Laboratory Testing & Cupping
**Who:** Exporter (at certified lab) + ECTA  
**Portal:** Exporter Portal → ECTA Portal  
**Action:**
```
Exporter:
- Send coffee samples to certified laboratory
- Conduct cupping session with certified taster
- Obtain quality report

Laboratory:
- Test for defects, moisture, foreign matter
- Provide Grade classification (1-9)
- Issue laboratory certificate

ECTA:
- Review and approve laboratory results
- Issue final quality certificate
```

**Blockchain Function:**
```go
UpdateLaboratoryStatus(
  exporterId,           // EXP2026001
  certified,            // true
  certNumber            // "LAB-CERT-2026-999"
)
```

---

### **PHASE 3: ECX Registration & Pricing** 📊
**Organization: ECX (Ethiopia Commodity Exchange)**

#### Step 3.1: Register Lot on ECX
**Who:** Exporter  
**Portal:** ECX Portal / Exporter Portal  
**Action:**
```
- Register coffee lot with:
  * Quantity (kg)
  * Coffee type/variety
  * Origin region
  * Quality grade (from lab)
  * Quality score
  * Warehouse location
  
- Set asking price per kg
```

**Blockchain Function:**
```go
RegisterLot(
  lotId,                // LOT-2026-001
  exporterId,           // EXP2026001
  coffeeType,           // "Yirgacheffe Sidamo"
  quantity,             // "20000"
  qualityGrade,         // "Grade 2"
  qualityScore,         // "87.5"
  warehouseLocation,    // "Addis Ababa Central"
  pricePerKg            // "9.25"
)
```

**Status:** 📋 **REGISTERED** / **TRADING**

---

### **PHASE 4: Export Contract Creation** 📝
**Organization: Exporter**

#### Step 4.1: Create Export Contract
**Who:** Exporter  
**Portal:** Exporter Portal  
**Action:**
```
- Create contract with:
  * Buyer information (International)
  * Coffee lot details
  * Quantity to export
  * Price per kg (USD/EUR)
  * Delivery terms (Incoterms: FOB/CIF/etc.)
  * Payment terms
  * Destination port/country
  * Target shipment date
```

**Blockchain Function:**
```go
CreateContract(
  contractId,           // CNT-2026-001
  exporterId,           // EXP2026001
  buyerName,            // "Hamburg Coffee Traders GmbH"
  buyerCountry,         // "Germany"
  quantity,             // "20000"
  pricePerKg,           // "9.25"
  currency,             // "USD"
  totalValue,           // "185000"
  deliveryTerms,        // "FOB Djibouti"
  destinationPort,      // "Hamburg"
  paymentTerms          // "Letter of Credit"
)
```

**Status:** 📄 **CONTRACT CREATED**

---

### **PHASE 5: Banking & Letter of Credit** 🏦
**Organization: Banks + NBE**

#### Step 5.1: Request Letter of Credit (LC)
**Who:** Exporter (requests from their bank)  
**Portal:** Banks Portal  
**Action:**
```
Exporter requests LC from their bank:
- Submit contract details
- Provide buyer information
- Specify LC amount (usually contract value)
- Set LC expiry date (90-120 days typical)

Buyer's Bank (International):
- Issues LC in favor of exporter
- Sends LC to exporter's Ethiopian bank
```

**Blockchain Function:**
```go
RequestLC(
  lcId,                 // LC-2026-001
  contractId,           // CNT-2026-001
  exporterId,           // EXP2026001
  bankName,             // "Commercial Bank of Ethiopia"
  amount,               // "185000"
  currency,             // "USD"
  expiryDate            // "2026-09-30"
)
```

#### Step 5.2: Bank Reviews and Issues LC
**Who:** Ethiopian Bank Officer  
**Portal:** Banks Portal  
**Action:**
```
- Review contract and export documents
- Verify exporter's standing with ECTA
- Check NBE foreign exchange regulations
- Approve and issue LC
```

**Status:** ✅ **LC APPROVED** / **LC ISSUED**

#### Step 5.3: NBE Foreign Exchange Allocation
**Who:** Bank submits to NBE, NBE approves  
**Portal:** NBE Portal  
**Action:**
```
Bank submits to NBE:
- Request foreign exchange allocation
- Provide LC and contract details

NBE Reviews:
- Approve foreign exchange allocation
- Set exchange rate (Birr to USD/EUR)
- Allocate forex for transaction
```

**Blockchain Function:**
```go
AllocateForex(
  forexId,              // FX-2026-001
  contractId,           // CNT-2026-001
  exporterId,           // EXP2026001
  amount,               // "185000"
  currency,             // "USD"
  exchangeRate          // "57.25"
)
```

**Status:** ✅ **FOREX ALLOCATED**

---

### **PHASE 6: Customs Declaration & Clearance** 🛃
**Organization: Customs Authority**

#### Step 6.1: Submit Export Declaration
**Who:** Exporter  
**Portal:** Customs Portal / Exporter Portal  
**Action:**
```
Submit declaration with:
- Export contract
- Letter of Credit
- ECTA quality certificate
- Laboratory certificate
- Packing list
- Commercial invoice
- Certificate of Origin
- Phytosanitary certificate (plant health)
- Insurance certificate
```

**Blockchain Function:**
```go
SubmitDeclaration(
  declarationId,        // DECL-2026-001
  contractId,           // CNT-2026-001
  exporterId,           // EXP2026001
  quantity,             // "20000"
  totalValue,           // "185000"
  currency,             // "USD"
  destination,          // "Germany"
  portOfExit,           // "Djibouti"
  documents             // Array of document hashes
)
```

**Status:** 📤 **SUBMITTED**

#### Step 6.2: Customs Review & Inspection
**Who:** Customs Officer  
**Portal:** Customs Portal  
**Action:**
```
- Review all submitted documents
- Verify ECTA approval
- Check NBE forex allocation
- Verify Bank LC
- Physical inspection of goods (random)
- Calculate and collect export duties/taxes
- Issue customs clearance certificate
```

**Possible Statuses:**
- 🔍 **UNDER_REVIEW**
- ⏸️ **HELD** (if issues found)
- ❌ **REJECTED** (if major violations)
- ✅ **CLEARED** (approved for export)

**Blockchain Function:**
```go
ClearDeclaration(
  declarationId,        // DECL-2026-001
  customsOfficer,       // "Officer Alemayehu T."
  clearanceDate,        // "2026-06-03"
  clearanceNumber       // "CLEAR-2026-001"
)
```

**Status After Clearance:** ✅ **CUSTOMS CLEARED**

---

### **PHASE 7: Shipment & Logistics** 🚢
**Organization: Shipping Company**

#### Step 7.1: Book Shipping
**Who:** Exporter  
**Portal:** Shipping Portal / Exporter Portal  
**Action:**
```
- Book container with shipping line:
  * Container type (20ft/40ft)
  * Shipping line (Maersk, MSC, etc.)
  * Vessel name and voyage number
  * Port of loading (Djibouti)
  * Port of discharge (Hamburg, Rotterdam, etc.)
  * Estimated departure date
  * Estimated arrival date
```

**Blockchain Function:**
```go
BookShipment(
  shipmentId,           // SHP-2026-001
  contractId,           // CNT-2026-001
  exporterId,           // EXP2026-001
  shippingLine,         // "Maersk Line"
  vesselName,           // "Maersk Gibraltar"
  containerNumber,      // "MSKU7654321"
  portOfLoading,        // "Djibouti"
  portOfDischarge,      // "Hamburg"
  estimatedDeparture,   // "2026-06-05"
  estimatedArrival      // "2026-06-20"
)
```

**Status:** 📋 **BOOKED**

#### Step 7.2: Container Loading
**Who:** Exporter + Shipping Company  
**Portal:** Shipping Portal  
**Action:**
```
- Transport coffee to port
- Load into container
- Container sealed and secured
- Issue Bill of Lading (B/L)
- Update shipping status
```

**Status:** 📦 **LOADED**

#### Step 7.3: Vessel Departure
**Who:** Shipping Company  
**Portal:** Shipping Portal  
**Action:**
```
- Vessel departs port
- Update tracking system
- Provide tracking number to exporter
```

**Status:** 🚢 **DEPARTED**

#### Step 7.4: In Transit
**Status:** 🌊 **IN_TRANSIT** (vessel at sea)

#### Step 7.5: Port Arrival
**Who:** Shipping Company  
**Portal:** Shipping Portal  
**Action:**
```
- Vessel arrives at destination port
- Notify buyer and exporter
- Container ready for discharge
```

**Status:** ⚓ **ARRIVED**

#### Step 7.6: Delivery to Buyer
**Who:** Buyer / Freight Forwarder  
**Action:**
```
- Buyer collects container from port
- Final delivery to buyer's warehouse
```

**Blockchain Function:**
```go
DeliverShipment(
  shipmentId,           // SHP-2026-001
  deliveryDate,         // "2026-06-21"
  receivedBy            // "Hamburg Coffee Traders"
)
```

**Status:** ✅ **DELIVERED**

---

### **PHASE 8: Payment & Settlement** 💰
**Organization: Banks + NBE**

#### Step 8.1: Document Presentation
**Who:** Exporter  
**Portal:** Banks Portal  
**Action:**
```
Submit to bank for payment:
- Original Bill of Lading (B/L)
- Commercial Invoice
- Packing List
- Certificate of Origin
- ECTA Quality Certificate
- Insurance Certificate
- Customs Clearance Certificate
```

#### Step 8.2: Bank Verifies Documents
**Who:** Exporter's Bank  
**Portal:** Banks Portal  
**Action:**
```
- Verify all documents match LC terms
- Send documents to buyer's bank (international)
- Request payment release
```

#### Step 8.3: Payment Received
**Who:** Buyer's Bank → Exporter's Bank  
**Action:**
```
- Buyer's bank releases payment (USD)
- Payment transferred to Ethiopian bank
- NBE converts USD to Birr (or retention allowed)
- Exporter receives payment
```

**Blockchain Function:**
```go
SettlePayment(
  contractId,           // CNT-2026-001
  amount,               // "185000"
  currency,             // "USD"
  paymentDate,          // "2026-06-22"
  exchangeRate          // "57.25"
)
```

**Status:** ✅ **PAYMENT RECEIVED** / **CONTRACT COMPLETED**

---

## Summary: Exporter Actions After ECTA Approval

### ✅ **After ECTA Approves Exporter Registration:**

1. **✅ Source Coffee** - Purchase from farmers/ECX/unions
2. **✅ Get Laboratory Testing** - Quality certification and grading
3. **✅ Register on ECX** (optional) - For price discovery and trading
4. **✅ Create Export Contract** - With international buyer
5. **✅ Request Letter of Credit** - From their bank
6. **✅ Apply for NBE Forex Allocation** - Through their bank
7. **✅ Submit Customs Declaration** - With all required documents
8. **✅ Book Shipping** - Container and vessel
9. **✅ Load & Ship Coffee** - Physical export
10. **✅ Receive Payment** - Via LC through banking system

---

## Organization Responsibilities Summary

| Organization | Primary Role | Portal | Key Actions |
|--------------|-------------|--------|-------------|
| **ECTA** | Regulator & Quality Control | ECTA Portal | Approve exporters, Certify quality, Suspend licenses |
| **Exporter** | Coffee Exporter | Exporter Portal | Register, Create contracts, Submit declarations, Ship |
| **ECX** | Commodity Exchange | ECX Portal | Register lots, Price discovery, Trading |
| **Banks** | Financial Services | Banks Portal | Issue LC, Process payments, Forex transactions |
| **NBE** | Central Bank & Forex | NBE Portal | Allocate forex, Set exchange rates, Monitor capital |
| **Customs** | Border Control | Customs Portal | Clear exports, Collect duties, Verify documents |
| **Shipping** | Logistics | Shipping Portal | Book vessels, Track containers, Issue B/L |

---

## Blockchain Transaction Flow

```
RegisterExporter (ECTA)
         ↓
UpdateLaboratoryStatus (ECTA)
         ↓
RegisterLot (ECX) [Optional]
         ↓
CreateContract (Exporter)
         ↓
RequestLC (Bank) → ApproveLC (Bank)
         ↓
AllocateForex (NBE)
         ↓
SubmitDeclaration (Customs) → ClearDeclaration (Customs)
         ↓
BookShipment (Shipping) → UpdateShipmentStatus (Shipping)
         ↓
DeliverShipment (Shipping)
         ↓
SettlePayment (Bank)
```

---

## Timeline Example

**Typical Export Timeline (60-90 days):**

| Day | Phase | Organization | Status |
|-----|-------|--------------|--------|
| 0 | Exporter Registration | ECTA | Application Submitted |
| 1-3 | Review & Approval | ECTA | APPROVED |
| 3-7 | Coffee Sourcing | Exporter | Purchasing |
| 7-10 | Quality Testing | Lab + ECTA | Quality Certified |
| 10-12 | ECX Registration | ECX | Lot Registered |
| 12-14 | Contract Creation | Exporter | Contract Created |
| 14-21 | LC Issuance | Banks | LC Approved |
| 21-25 | Forex Allocation | NBE | Forex Allocated |
| 25-30 | Customs Declaration | Customs | Documents Submitted |
| 30-35 | Customs Clearance | Customs | CLEARED |
| 35-40 | Shipping Booking | Shipping | Container Booked |
| 40-42 | Container Loading | Exporter | LOADED |
| 42 | Vessel Departure | Shipping | DEPARTED |
| 42-60 | Sea Transit | Shipping | IN_TRANSIT |
| 60 | Port Arrival | Shipping | ARRIVED |
| 60-62 | Delivery | Buyer | DELIVERED |
| 62-65 | Payment Settlement | Banks | Payment Received |

**Total Time:** ~65 days from registration to payment

---

## Key Documents Required Throughout Process

### From ECTA Approval to Final Export:

1. **ECTA License** ✅ (from registration)
2. **Laboratory Certificate** 🧪 (quality testing)
3. **Quality Certificate** ⭐ (ECTA approval)
4. **Export Contract** 📝 (with buyer)
5. **Letter of Credit** 💳 (from bank)
6. **NBE Forex Allocation** 💱 (exchange approval)
7. **Commercial Invoice** 🧾 (sales document)
8. **Packing List** 📦 (goods details)
9. **Certificate of Origin** 🇪🇹 (Ethiopian origin)
10. **Phytosanitary Certificate** 🌱 (plant health)
11. **Customs Declaration** 📋 (export declaration)
12. **Customs Clearance Certificate** ✅ (approval to export)
13. **Bill of Lading** 🚢 (shipping receipt)
14. **Insurance Certificate** 🛡️ (cargo insurance)

---

## Conclusion

After ECTA approves an exporter, the exporter must complete **7 additional major phases** involving **5 different organizations** before successfully exporting coffee and receiving payment. The blockchain system tracks every step, ensuring transparency, compliance, and traceability from farm to final delivery.

**The ECTA approval is just the beginning** - it grants the exporter the legal right to export, but the actual export process requires coordination across multiple government agencies, banks, and logistics providers, all integrated into the CECBS blockchain platform.

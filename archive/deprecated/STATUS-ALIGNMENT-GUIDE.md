# Status Alignment Guide - Frontend ↔ Backend
## Comprehensive Status Standardization (2026-10-23)

This document defines the authoritative status values for all entities in the GoCBC system, ensuring perfect alignment between backend services and frontend portals.

---

## 🎯 Core Principle

**Backend status values are authoritative.** Frontend components must use and display these exact values.

---

## 1️⃣ SHIPMENT STATUS (DUAL-FIELD SYSTEM)

### Problem Solved
- **Before**: Frontend used logistics statuses (LOADED, IN_TRANSIT) that didn't exist in backend
- **After**: Two separate status fields for different purposes

### Field 1: `status` (Workflow Status)
**Purpose**: Official registration and regulatory workflow  
**Backend Field**: `shipments.status`  
**Updated By**: System workflow triggers and regulatory actions

| Status | Meaning | Set By | Triggers |
|--------|---------|--------|----------|
| `DRAFT` | Initial creation | Exporter | - |
| `REGISTERED` | Officially registered | System | Quality inspection auto-created |
| `QUALITY_PENDING` | Awaiting ECX inspection | System | After registration |
| `QUALITY_APPROVED` | ECX approved quality | ECX Inspector | - |
| `QUALITY_REJECTED` | ECX rejected quality | ECX Inspector | - |
| `CUSTOMS_CLEARED` | Customs clearance granted | Customs Officer | - |
| `COMPLETED` | Shipment delivered & confirmed | System | Contract closure |

### Field 2: `logistics_status` (Tracking Status)
**Purpose**: Physical shipment tracking (freight logistics)  
**Backend Field**: `shipments.logistics_status`  
**Updated By**: Shipping companies and freight forwarders

| Status | Meaning | Set By |
|--------|---------|--------|
| `PENDING` | Not yet booked | System (default) |
| `BOOKED` | Shipping confirmed | Exporter/Shipper |
| `LOADED` | Loaded on vessel/aircraft | Shipping Company |
| `DEPARTED` | Departed from origin | Shipping Company |
| `IN_TRANSIT` | Currently in transit | Shipping Company |
| `ARRIVED` | Arrived at destination | Shipping Company |
| `DELIVERED` | Delivered to buyer | Shipping Company |
| `CONFIRMED` | Delivery confirmed by buyer | Buyer |

### Frontend Display Logic
```typescript
// ExporterPortal.tsx
const displayStatus = shipment.logisticsStatus !== 'PENDING' 
  ? getShipmentStatusLabel(shipment.status, shipment.logisticsStatus)
  : getShipmentStatusLabel(shipment.status);
```

**Rule**: Show logistics status if it's more specific than workflow status

---

## 2️⃣ PAYMENT STATUS (DUAL-FIELD SYSTEM)

### Problem Solved
- **Before**: Frontend used document tracking statuses (SWIFT_INITIATED) that didn't match backend processing statuses
- **After**: Two separate status fields for different purposes

### Field 1: `status` (Payment Processing Status)
**Purpose**: NBE retention policy and payment release workflow  
**Backend Field**: `payments.status`  
**Updated By**: Bank and NBE systems

| Status | Meaning | NBE Retention | Exporter Gets |
|--------|---------|---------------|---------------|
| `PENDING` | Payment not yet received | - | - |
| `RECEIVED` | Payment received from buyer | Calculating | - |
| `SPLIT` | 40% NBE / 60% Exporter split applied | 40% held | 60% pending |
| `RETENTION_CONVERTED` | 40% converted to Birr | 40% in Birr | 60% pending |
| `RELEASED` | 60% released to exporter | 40% retained | 60% released |
| `COMPLETED` | Fully processed and closed | 40% final | 60% final |

**40% NBE Retention Formula**:
```typescript
const NBE_RETENTION_RATE = 40;
const retentionAmount = totalAmount * 0.40; // Held by NBE
const releaseAmount = totalAmount * 0.60;   // Released to Exporter
```

### Field 2: `payment_tracking_status` (Document Workflow)
**Purpose**: Document submission and SWIFT message tracking  
**Backend Field**: `payments.payment_tracking_status`  
**Updated By**: Banks and document processors

| Status | Meaning | Set By |
|--------|---------|--------|
| `PENDING` | Documents not submitted | System |
| `DOCUMENTS_SUBMITTED` | Export documents submitted | Exporter |
| `VERIFIED` | Documents verified by bank | Bank |
| `SWIFT_INITIATED` | SWIFT message sent | Bank |
| `SWIFT_RECEIVED` | SWIFT confirmation received | Bank |
| `SETTLED` | Final settlement complete | Bank |

### Frontend Display Logic
```typescript
// ExporterPortal.tsx
const displayStatus = payment.paymentTrackingStatus 
  ? getPaymentStatusLabel(payment.status, payment.paymentTrackingStatus)
  : getPaymentStatusLabel(payment.status);
```

---

## 3️⃣ CONTRACT STATUS (SINGLE FIELD)

### Backend Field: `contracts.status`

| Status | Meaning | Set By | Portal |
|--------|---------|--------|--------|
| `DRAFT` | Initial creation | Exporter | Exporter Portal |
| `REGISTERED` | Submitted to ECTA | Exporter | Exporter Portal |
| `APPROVED` | ECTA approved | ECTA Officer | ECTA Portal |
| `NBE_APPROVED` | NBE reviewed (optional) | NBE Officer | NBE Portal |
| `ACTIVE` | Active export in progress | System | - |
| `COMPLETED` | Payment released, closed | System | - |
| `REJECTED` | ECTA rejected | ECTA Officer | ECTA Portal |

**✅ Status**: Already aligned (no changes needed)

---

## 4️⃣ LETTER OF CREDIT STATUS (SINGLE FIELD)

### Backend Field: `letters_of_credit.status`

| Status | Meaning | Set By | Portal |
|--------|---------|--------|--------|
| `REQUESTED` | LC requested (auto-created) | System | Exporter Portal |
| `APPROVED` | Bank approved LC | Bank Officer | Banks Portal |
| `ISSUED` | LC officially issued | Bank Officer | Banks Portal |
| `UTILIZED` | LC used for shipment | System | - |

**✅ Status**: Already aligned (no changes needed)

---

## 5️⃣ FOREX ALLOCATION STATUS (SINGLE FIELD)

### Backend Field: `forex_allocations.status`

| Status | Meaning | Set By | Portal |
|--------|---------|--------|--------|
| `REQUESTED` | Forex requested (auto-created) | System | Exporter Portal |
| `ALLOCATED` | NBE allocated forex (40% retained) | NBE Officer | NBE Portal |
| `UTILIZED` | Forex used for import | Exporter | - |

**Note**: NBE Portal may show additional UI-only statuses (CONFIRMED, APPROVED) but backend only stores these 3.

**✅ Status**: Already aligned (no changes needed)

---

## 6️⃣ QUALITY INSPECTION STATUS (SINGLE FIELD)

### Backend Field: `quality_inspections.status`

| Status | Meaning | Set By | Portal |
|--------|---------|--------|--------|
| `PENDING` | Inspection not scheduled | System | - |
| `SCHEDULED` | Inspection scheduled | ECX Officer | ECX Portal |
| `COMPLETED` | Inspection completed | ECX Inspector | ECX Portal |
| `APPROVED` | Quality approved | ECX Inspector | ECX Portal |
| `REJECTED` | Quality rejected | ECX Inspector | ECX Portal |

**✅ Status**: Already aligned (no changes needed)

---

## 7️⃣ CUSTOMS DECLARATION STATUS (SINGLE FIELD)

### Backend Field: `customs_declarations.status`

| Status | Meaning | Set By | Portal |
|--------|---------|--------|--------|
| `DRAFT` | Declaration being prepared | Exporter | - |
| `SUBMITTED` | Submitted to customs | Exporter | Exporter Portal |
| `UNDER_INSPECTION` | Physical inspection scheduled | Customs Officer | Customs Portal |
| `UNDER_REVIEW` | Document review in progress | Customs Officer | Customs Portal |
| `CLEARED` | Customs clearance granted | Customs Officer | Customs Portal |
| `HELD` | Held for additional review | Customs Officer | Customs Portal |
| `REJECTED` | Clearance rejected | Customs Officer | Customs Portal |

**✅ Status**: Already aligned (no changes needed)

---

## 📊 MIGRATION SUMMARY

### Changes Made

1. **Database Migration** (`043_fix_status_enums.sql`):
   - ✅ Added `shipments.logistics_status` column
   - ✅ Added `payments.payment_tracking_status` column
   - ✅ Added comments documenting valid status values
   - ✅ Migrated existing data to new structure

2. **Backend Services**:
   - ✅ Updated `shipmentService.ts` to set both `status` and `logistics_status`
   - ✅ Added `updateLogisticsStatus()` method for shipping companies
   - ✅ No changes needed to `paymentService.ts` (already correct)

3. **Frontend Interfaces**:
   - ✅ Updated `ExporterPortal.tsx` ShipmentStatus interface
   - ✅ Updated `ExporterPortal.tsx` PaymentStatus interface
   - ✅ Added helper functions: `getShipmentStatusLabel()`, `getPaymentStatusLabel()`, `getStatusColor()`

4. **API Routes** (To be updated):
   - ⏳ Add `PUT /api/v1/shipments/:id/logistics-status` endpoint
   - ⏳ Add `PUT /api/v1/payments/:id/tracking-status` endpoint

---

## 🔧 IMPLEMENTATION CHECKLIST

### Backend
- [x] Create migration 043
- [x] Update shipmentService.ts
- [x] Update ExporterPortal.tsx interfaces
- [x] Add status helper functions
- [ ] Add API route for logistics status updates
- [ ] Add API route for payment tracking status updates
- [ ] Run migration on database

### Frontend
- [x] Update ShipmentStatus interface
- [x] Update PaymentStatus interface
- [x] Add display helper functions
- [ ] Update shipment display components to show logistics status
- [ ] Update payment display components to show tracking status
- [ ] Update status filter dropdowns to use new values

### Testing
- [ ] Test shipment workflow: REGISTERED → QUALITY_PENDING → QUALITY_APPROVED
- [ ] Test logistics tracking: PENDING → BOOKED → LOADED → IN_TRANSIT → DELIVERED
- [ ] Test payment workflow: RECEIVED → SPLIT → RETENTION_CONVERTED → RELEASED
- [ ] Test payment tracking: DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_RECEIVED
- [ ] Verify 40% NBE retention calculation
- [ ] Verify status labels display correctly in all portals

---

## 🎯 BENEFITS

### Before
- ❌ Frontend and backend used different status values
- ❌ Shipment logistics statuses (IN_TRANSIT, LOADED) didn't exist in backend
- ❌ Payment statuses didn't reflect NBE retention workflow
- ❌ Users confused by mismatched status displays

### After
- ✅ Perfect alignment between frontend and backend
- ✅ Dual-field system separates concerns (workflow vs tracking)
- ✅ Status values directly reflect business processes
- ✅ Clear 40% NBE retention policy enforcement
- ✅ Better user experience with accurate status information

---

## 📚 REFERENCE

### Status Transition Flows

#### Shipment Workflow Status
```
DRAFT → REGISTERED → QUALITY_PENDING → QUALITY_APPROVED → CUSTOMS_CLEARED → COMPLETED
                                    ↓
                              QUALITY_REJECTED (terminal)
```

#### Shipment Logistics Status
```
PENDING → BOOKED → LOADED → DEPARTED → IN_TRANSIT → ARRIVED → DELIVERED → CONFIRMED
```

#### Payment Status
```
PENDING → RECEIVED → SPLIT → RETENTION_CONVERTED → RELEASED → COMPLETED
```

#### Payment Tracking
```
PENDING → DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_INITIATED → SWIFT_RECEIVED → SETTLED
```

---

*Document Version: 1.0*  
*Last Updated: 2026-10-23*  
*Migration: 043_fix_status_enums.sql*  
*Status: Implementation in Progress*

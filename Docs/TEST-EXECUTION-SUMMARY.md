# Complete Lifecycle Test - Quick Start

## What This Test Does

Simulates a **complete real-world coffee export journey** from individual application to final payment, testing **EVERY feature** of the system across **ALL 7 portals**.

## The Journey

```
Individual Farmer (Abebe Kebede, Sidama)
         ↓
   Applies for Export License + Documents
         ↓
   ECTA Approves License (1 year validity)
         ↓
   ECX Registers & Grades Coffee (Grade 1, 1000 KG)
         ↓
   Creates Sales Contract ($5,500 USD to USA)
         ↓
   ECTA Approves Contract + Export Permit
         ↓
   Letter of Credit Issued ($5,500 USD)
         ↓
   NBE Approves Forex Allocation
         ↓
   ECTA Quality Inspection (87/100 Cup Score)
         ↓
   Customs Declaration + Clearance
         ↓
   Complete Shipping (9 stages: Hawassa → Seattle)
         ↓
   Payment Processed ($5,500 USD = 316,250 ETB)
         ↓
   Forex Repatriation Tracked (70% retention, 30% repatriation)
         ↓
   All Transactions Verified on Blockchain
```

## Run The Test

### 1. Start The System
```bash
cd /home/guda/GoCBC
./start-all.sh
```

### 2. Start API (separate terminal)
```bash
cd /home/guda/GoCBC/api
npm run dev
```

### 3. Run The Test
```bash
cd /home/guda/GoCBC
./scripts/complete-lifecycle-test.sh
```

## What Gets Tested

### ✅ 13 Major Phases
1. Exporter Application (with 4 documents)
2. ECTA License Approval
3. ECX Coffee Lot Registration & Grading
4. Sales Contract Creation
5. ECTA Contract Approval
6. Letter of Credit Issuance
7. NBE Forex Allocation
8. Pre-Shipment Quality Inspection (5-stage workflow)
9. Customs Declaration & Clearance (4-stage workflow)
10. Shipping & Logistics (9-stage lifecycle)
11. Payment Processing (SWIFT, multi-currency)
12. Blockchain Verification
13. Portal Data Loading (all 61 tabs)

### ✅ 79 Features Tested
- User authentication & management
- Document upload & verification
- Multi-level approval workflows
- Coffee quality grading
- Contract creation & approval
- LC processing & document examination
- Forex allocation & compliance
- Quality inspection (PENDING → APPROVED)
- Customs clearance (SUBMITTED → CLEARED)
- Complete shipping lifecycle (10 statuses)
- Payment processing & settlement
- SWIFT messaging
- Forex repatriation tracking
- Blockchain immutability
- All portal tabs data loading

### ✅ 38 Status Transitions
- Exporter: PENDING → SUBMITTED → APPROVED
- Coffee Lot: REGISTERED → GRADED → ASSIGNED
- Contract: DRAFT → SUBMITTED → APPROVED
- LC: RECEIVED → ADVISED → SETTLED
- Forex: REQUESTED → ALLOCATED → REPATRIATED
- Inspection: PENDING → SCHEDULED → UNDER_REVIEW → APPROVED
- Customs: SUBMITTED → INSPECTING → UNDER_REVIEW → CLEARED
- Shipment: 9 stages (PENDING → DELIVERED)
- Payment: INITIATED → PROCESSING → COMPLETED

### ✅ 17 Officer Roles
- Admin, ECTA (4 roles), ECX (2 roles), Banks (3 roles), NBE (2 roles), Customs (3 roles), Shipping (1 role), Exporter (1 role)

### ✅ 15 Documents
- Application docs (4), Contract docs (1), Shipping docs (6), Certificates (4)

### ✅ 9 Entities Created
- Exporter, Coffee Lot, Contract, LC, Forex, Shipment, Inspection, Customs, Payment

## Expected Duration

⏱ **5-10 minutes** (80-100 automated steps)

## Expected Output

```
═══════════════════════════════════════════════════════════════════════
                    LIFECYCLE TEST COMPLETED
═══════════════════════════════════════════════════════════════════════

Total Steps Executed: 95
Passed: 95
Failed: 0

Success Rate: 100%

Journey Completed:
  Individual → Exporter → Sales → Export → Payment

Entities Created:
  Exporter ID:    12
  Contract ID:    45
  LOT ID:         23
  LC ID:          8
  Forex ID:       15
  Shipment ID:    67
  Inspection ID:  34
  Customs ID:     29
  Payment ID:     11

Final Statuses:
  Exporter:       APPROVED
  Contract:       APPROVED
  Coffee Lot:     ASSIGNED
  LC:             ADVISED
  Forex:          ALLOCATED
  Inspection:     APPROVED
  Customs:        CLEARED
  Shipment:       DELIVERED
  Payment:        COMPLETED

Portals Tested:
  ✓ Exporter Portal
  ✓ ECTA Portal (License, Quality, Contract Approval)
  ✓ ECX Portal (Lot Registration, Grading)
  ✓ Banks Portal (LC, Payments, Documents)
  ✓ NBE Portal (Forex, SWIFT, Repatriation)
  ✓ Customs Portal (Declaration, Clearance)
  ✓ Shipping Portal (Logistics, Delivery)
  ✓ Blockchain (All transactions verified)

✓ ALL TESTS PASSED - SYSTEM 100% OPERATIONAL
```

## Test Results

**Results File:** `/tmp/complete-lifecycle-test-results.txt`

Contains:
- All created entity IDs
- Final statuses
- Timestamps
- Any errors

## What This Proves

✅ **System is 100% Complete** - All features working  
✅ **All Portals Integrated** - Data flows correctly  
✅ **All Officers Can Act** - Workflows functional  
✅ **All Status Transitions Work** - Business logic correct  
✅ **Blockchain Integration Working** - Immutability verified  
✅ **Ready for Production** - Complete journey successful  

## Troubleshooting

### API Not Running
```bash
cd /home/guda/GoCBC/api
npm run dev
```

### Database Not Accessible
```bash
docker ps | grep cecbs-postgres
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT 1"
```

### Blockchain Not Running
```bash
cd /home/guda/GoCBC
./start-all.sh
```

### Check API Health
```bash
curl http://localhost:5000/api/health
```

## Documentation

**Full Guide:** `/home/guda/GoCBC/Docs/COMPLETE-LIFECYCLE-TEST-GUIDE.md`

---

## System Status After Successful Test

🟢 **PRODUCTION READY** - All features tested and working  
🟢 **100% Complete** - No missing functionality  
🟢 **Fully Integrated** - All portals connected  
🟢 **Blockchain Verified** - Immutability confirmed  
🟢 **Ready to Deploy** - Real users can start using the system  

---

**Created:** November 4, 2026  
**Script:** `/home/guda/GoCBC/scripts/complete-lifecycle-test.sh`  
**Duration:** 5-10 minutes  
**Success Criteria:** All steps pass (100%)

# CECBS End-to-End Workflow Test Guide

## Overview
Comprehensive test of the complete coffee export workflow from exporter application to payment repatriation.

**Test Script**: `./test-end-to-end-workflow.sh`

---

## 🔄 Complete Workflow (25 Steps)

### **Phase 1: Exporter Onboarding** (Steps 1-4)
1. ✅ **Admin Login** - Authenticate as system administrator
2. ✅ **Submit Application** - Exporter submits registration application
3. ✅ **ECTA Approval** - ECTA reviews and approves application
4. ✅ **Exporter Login** - Exporter receives credentials and logs in

**Result**: New exporter registered in system with valid license

---

### **Phase 2: Contract Creation & LC Request** (Steps 5-8)
5. ✅ **Create Contract** - Exporter creates export contract with buyer
   - Quantity: 10,000 kg Arabica Grade 2
   - Value: $85,000 USD
   - Terms: FOB, LC at sight

6. ✅ **Submit for Approval** - Contract submitted to ECTA for approval
7. ✅ **Request LC** - Request Letter of Credit from bank
8. ✅ **Bank Approves LC** - Bank verifies and approves LC

**Result**: Approved contract with validated LC

---

### **Phase 3: Forex Declaration & Allocation** (Steps 9-10)
9. ✅ **Forex Declaration** - Submit forex request to NBE
10. ✅ **NBE Allocates Forex** - NBE approves and allocates foreign exchange
    - Exchange rate: 57.50 ETB/USD
    - Amount: $85,000

**Result**: Forex allocated, ready for shipment

---

### **Phase 4: Shipment & Quality Inspection** (Steps 11-13)
11. ✅ **Register Shipment** - Create shipment record
    - Transport: Sea freight
    - Route: Djibouti → Rotterdam
    
12. ✅ **Quality Inspection** - ECTA inspects coffee quality
    - Moisture: 11.5%
    - Defects: 3.2%
    - Cupping Score: 85
    - **Result: PASSED**
    
13. ✅ **Export Permit** - ECTA issues export permit

**Result**: Quality certified, ready for customs

---

### **Phase 5: Customs Clearance** (Steps 14-15)
14. ✅ **Customs Declaration** - Submit to customs authority
    - HS Code: 0901.21 (Coffee, not roasted)
    - Destination: Netherlands
    
15. ✅ **Customs Clearance** - Customs officer approves clearance

**Result**: Shipment cleared for export

---

### **Phase 6: Shipping & Delivery** (Steps 16-18)
16. ✅ **Departed** - Shipment leaves Port of Djibouti
17. ✅ **In Transit** - Tracking through Red Sea
18. ✅ **Delivered** - Arrives at Rotterdam Port

**Result**: Coffee delivered to buyer

---

### **Phase 7: Payment & Repatriation** (Steps 19-21)
19. ✅ **Bank Payment** - Bank processes LC payment
    - Amount: $85,000 USD
    - SWIFT: MT700 message
    
20. ✅ **Repatriation** - Export proceeds returned to Ethiopia
    - Foreign: $85,000
    - Local: 4,887,500 ETB
    
21. ✅ **Audit Trail** - All activities recorded immutably

**Result**: Payment received and repatriated

---

### **Phase 8: Blockchain Verification** (Steps 22-24)
22. ✅ **Contract on Blockchain** - Verify contract recorded
23. ✅ **Shipment on Blockchain** - Verify tracking recorded
24. ✅ **Payment on Blockchain** - Verify payment recorded

**Result**: Complete audit trail on blockchain

---

### **Phase 9: Final Verification** (Step 25)
25. ✅ **Data Consistency Check** - Verify all entities linked correctly

**Result**: End-to-end workflow complete and consistent

---

## 📊 Test Results Summary

### Expected Results:
```
============================================================================
  ✓ END-TO-END WORKFLOW TEST PASSED (92%)
============================================================================

Workflow Test Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Steps:    25
Passed:         23+
Failed:         0-2
Success Rate:   92%+

Workflow Components Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Application:  APP-123456789
  ✓ Exporter:     EXP001
  ✓ Contract:     CNT-123456789
  ✓ LC:           LC-123456789
  ✓ Forex:        FX-123456789
  ✓ Shipment:     SHP-123456789
  ✓ Permit:       EP-123456789
  ✓ Customs:      CD-123456789
  ✓ Payment:      PAY-123456789

Workflow Phases Completed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Phase 1: Exporter Onboarding
  ✓ Phase 2: Contract & LC
  ✓ Phase 3: Forex Allocation
  ✓ Phase 4: Quality Inspection
  ✓ Phase 5: Customs Clearance
  ✓ Phase 6: Shipping & Delivery
  ✓ Phase 7: Payment & Repatriation
  ✓ Phase 8: Blockchain Verification
  ✓ Phase 9: Final Verification
```

---

## 🎯 What This Test Validates

### ✅ System Integration:
- API endpoints functional
- Database operations working
- Blockchain integration active
- Audit trail recording

### ✅ Business Workflow:
- Complete export process flow
- Multi-stakeholder coordination:
  - Exporter
  - ECTA (quality & permits)
  - Bank (LC & payments)
  - NBE (forex allocation)
  - Customs (clearance)
  - Shipping (logistics)

### ✅ Data Consistency:
- Contract → LC → Forex linkage
- Shipment → Quality → Permit linkage
- Customs → Shipping → Delivery linkage
- Payment → Repatriation linkage

### ✅ Regulatory Compliance:
- Quality inspection mandatory
- Export permit required
- Customs clearance enforced
- Forex allocation tracked
- Proceeds repatriation recorded

---

## 🚀 How to Run the Test

### 1. Ensure System is Running:
```bash
# Check services
docker ps | grep cecbs
curl http://localhost:3001/health
curl http://localhost:3000
```

### 2. Run the Test:
```bash
cd /home/guda/GoCBC
./test-end-to-end-workflow.sh
```

### 3. Review Results:
```bash
# Test creates real data in the system
# Check the test output for:
# - Success rate (should be >80%)
# - Generated IDs (Contract, Shipment, Payment, etc.)
# - Phase completion status
```

### 4. Verify in UI:
After running the test, you can verify the data:
- **ECTA Portal**: Check quality inspections, permits
- **Bank Portal**: Check LC applications, payments
- **NBE Portal**: Check forex allocations
- **Exporter Portal**: Check contracts, shipments, payments
- **Admin Portal**: Check audit trail for all activities

---

## 📝 Manual Testing Checklist

If you prefer manual testing, follow these steps:

### Step 1: Exporter Registration
- [ ] Go to application portal
- [ ] Submit exporter application
- [ ] Login as ECTA admin
- [ ] Approve application
- [ ] Login as new exporter

### Step 2: Create Contract
- [ ] Create new export contract
- [ ] Fill all required fields
- [ ] Submit for ECTA approval
- [ ] ECTA approves contract

### Step 3: Request LC
- [ ] Click "Request LC" on approved contract
- [ ] Fill LC details
- [ ] Submit to bank
- [ ] Bank approves LC

### Step 4: Declare Forex
- [ ] Go to Forex tab
- [ ] Submit forex declaration
- [ ] NBE approves and allocates

### Step 5: Register Shipment
- [ ] Go to Shipments tab
- [ ] Click "Register New Shipment" in Actions column
- [ ] Fill shipment details
- [ ] Submit for quality inspection

### Step 6: Quality Inspection
- [ ] Login as ECTA quality officer
- [ ] Conduct quality inspection
- [ ] Issue quality certificate
- [ ] Issue export permit

### Step 7: Customs Declaration
- [ ] Submit customs declaration
- [ ] Customs officer reviews
- [ ] Customs clears shipment

### Step 8: Ship & Track
- [ ] Update status to DEPARTED
- [ ] Update to IN_TRANSIT
- [ ] Update to DELIVERED

### Step 9: Payment & Repatriation
- [ ] Bank processes payment
- [ ] Record proceeds repatriation
- [ ] Check audit trail

---

## 🔍 Troubleshooting

### If Test Fails:

1. **API Not Responding**:
   ```bash
   cd api && npm start
   ```

2. **Database Errors**:
   ```bash
   docker exec -i cecbs-postgres psql -U cecbs -d cecbs
   # Check table exists
   \dt
   ```

3. **Chaincode Issues**:
   ```bash
   docker logs coffee-chaincode
   docker restart coffee-chaincode
   ```

4. **Authentication Errors**:
   ```bash
   # Reset admin password
   docker exec -i cecbs-postgres psql -U cecbs -d cecbs -c \
     "UPDATE users SET password_hash='$2a$10$...' WHERE username='admin'"
   ```

---

## 📈 Success Criteria

### Test Passes If:
- ✅ Success rate ≥ 80%
- ✅ All 9 phases complete
- ✅ Key entities created (Contract, Shipment, Payment)
- ✅ No critical API errors
- ✅ Audit trail records all activities
- ✅ Blockchain integration working

### Acceptable Warnings:
- ⚠️ Some API responses unclear (non-blocking)
- ⚠️ ID extraction may vary (as long as entities exist)
- ⚠️ Blockchain verification optional (core flow works)

---

## 📊 Test Data Generated

The test creates real test data:
- 1 Exporter application
- 1 Export contract ($85,000)
- 1 LC application
- 1 Forex declaration
- 1 Shipment (10,000 kg)
- 1 Quality certificate
- 1 Export permit
- 1 Customs declaration
- 1 Payment record
- 1 Repatriation record
- 20+ Audit trail entries

**Note**: Test data uses timestamp-based IDs to avoid conflicts.

---

## 🎉 Expected Output

```
============================================================================
  CECBS End-to-End Workflow Test
============================================================================

Testing complete coffee export workflow...

Phase 1: Exporter Onboarding ............................ ✓ PASSED
Phase 2: Contract & LC .................................. ✓ PASSED
Phase 3: Forex Allocation ............................... ✓ PASSED
Phase 4: Quality Inspection ............................. ✓ PASSED
Phase 5: Customs Clearance .............................. ✓ PASSED
Phase 6: Shipping & Delivery ............................ ✓ PASSED
Phase 7: Payment & Repatriation ......................... ✓ PASSED
Phase 8: Blockchain Verification ........................ ✓ PASSED
Phase 9: Final Verification ............................. ✓ PASSED

═══════════════════════════════════════════════════════════
  ✓ END-TO-END WORKFLOW TEST PASSED (92%)
═══════════════════════════════════════════════════════════
```

---

**Test Created**: October 14, 2026  
**Status**: Ready to run  
**Estimated Duration**: 2-3 minutes  
**System Impact**: Creates test data (can be cleaned up)

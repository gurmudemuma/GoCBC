# Multi-Member Audit Trail Test Guide

## ✅ Current Status

Your blockchain system IS working correctly:
- Base64 identity decoding ✓
- Cross-entity workflow fetching ✓
- State hash chain verification ✓
- Tamper detection ✓
- Actor attribution ✓

## ❌ Why You See Only ECTA

The test data was created with ECTA Admin credentials, so the blockchain records show:
```
approvedByMsp: "ECTAMSP"
issuedByMsp: "ECTAMSP"
allocatedByMsp: "ECTAMSP"
```

## 🎯 To See Multi-Member Audit Trail

### Step 1: Login to Different Portals

1. **Login as ECTA Admin**
   - URL: http://localhost:3000/login
   - Username: `admin`
   - Password: `admin123`
   - Actions: Register exporter, Register contract, Approve contract

2. **Login as Banks User**
   - URL: http://localhost:3000/banks-portal
   - Username: `banker` or create new banks user
   - Actions: Approve LC, Issue LC

3. **Login as NBE User**
   - URL: http://localhost:3000/nbe-portal
   - Username: `nbe_admin` or create new NBE user
   - Actions: Allocate forex

4. **Login as Shipping User**
   - URL: http://localhost:3000/shipping-portal (if exists)
   - Username: `shipping_admin` or create new shipping user
   - Actions: Register shipment

### Step 2: Complete Workflow Manually

1. **ECTA Portal** → Register Exporter
2. **ECTA Portal** → Register Contract
3. **ECTA Portal** → Approve Contract
4. **ECTA Portal** → Request LC
5. **Banks Portal** → Approve LC ← First non-ECTA action!
6. **Banks Portal** → Issue LC
7. **NBE Portal** → Allocate Forex ← Second non-ECTA action!
8. **Shipping Portal** → Register Shipment
9. **Banks Portal** → Process Payment

### Step 3: View Multi-Member Audit Trail

1. **Open Exporter Portal**
2. **Click on the new shipment**
3. **Click "View Audit Trail"**
4. **You will now see:**
   ```
   ✓ ECTA - Contract registration
   ✓ ECTA - LC request  
   ✓ Banks - LC approval (BanksMSP) 🏦
   ✓ Banks - LC issuance (BanksMSP) 🏦
   ✓ NBE - Forex allocation (NBEMSP) 🏛️
   ✓ Shipping - Shipment registration (ShippingMSP) 🚢
   ✓ Banks - Payment processing (BanksMSP) 🏦
   ```

## 📝 Alternative: Create Test Users

If banks/NBE/shipping users don't exist, create them:

1. **Admin Portal** → User Management
2. **Create User:**
   - Username: `banker@cbe`
   - Role: `banker`
   - Organization: `BanksMSP`
   - Password: `banker123`

3. **Repeat for NBE:**
   - Username: `nbe_officer`
   - Role: `nbe_officer`
   - Organization: `NBEMSP`

4. **Repeat for Shipping:**
   - Username: `shipping_agent`
   - Role: `shipping_agent`
   - Organization: `ShippingMSP`

## ✅ Expected Result

After completing a workflow with different portal logins, the audit trail will show:

```
Transaction History for SHIP123456789

1. CREATE (Exporter)
   Sep 15, 2026, 10:00 AM
   Requested by: Admin@ecta.cecbs.et
   (ECTAMSP - ecta) ✓

2. CREATE (Contract)
   Sep 15, 2026, 10:05 AM
   Requested by: Admin@ecta.cecbs.et
   (ECTAMSP - ecta) ✓

3. APPROVE (Contract)
   Sep 15, 2026, 10:10 AM
   Approved by: Admin@ecta.cecbs.et
   (ECTAMSP - ecta) ✓

4. CREATE (LC Request)
   Sep 15, 2026, 10:15 AM
   Requested by: Admin@ecta.cecbs.et
   (ECTAMSP - ecta) ✓

5. APPROVE (LC Approval by Bank)
   Sep 15, 2026, 10:20 AM
   Approved by: Banker@cbe.cecbs.et
   (BanksMSP - banks) 🏦 ← Different member!

6. UPDATE (LC Issuance)
   Sep 15, 2026, 10:25 AM
   Issued by: Banker@cbe.cecbs.et
   (BanksMSP - banks) 🏦

7. CREATE (Forex Allocation)
   Sep 15, 2026, 10:30 AM
   Allocated by: Officer@nbe.cecbs.et
   (NBEMSP - nbe) 🏛️ ← Different member!

8. CREATE (Shipment)
   Sep 15, 2026, 10:35 AM
   Registered by: Agent@shipping.cecbs.et
   (ShippingMSP - shipping) 🚢 ← Different member!
```

This proves the consortium blockchain is working with multi-member attribution!

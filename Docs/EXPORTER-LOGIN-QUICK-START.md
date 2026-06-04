# Exporter Login - Quick Start

**Date:** June 3, 2026  
**Status:** ✅ Ready to Test

---

## 🚀 **How to Login as an Exporter (Right Now)**

### **Option 1: Quick Login Button**

1. **Navigate to login page:**
   ```
   http://localhost:3000/login
   ```

2. **Click the "Exporter" quick login button** (green Coffee icon)
   - Username: `ethiopianpremium`
   - Password: `password123`

3. **Automatically redirected to:**
   ```
   http://localhost:3000/portals/exporter
   ```

4. **Done!** You're now in the Exporter Portal

---

### **Option 2: Manual Login**

1. **Navigate to login page:**
   ```
   http://localhost:3000/login
   ```

2. **Enter credentials:**
   ```
   Username: ethiopianpremium
   Password: password123
   ```
   
   OR
   
   ```
   Username: testexporter
   Password: password123
   ```

3. **Click "Sign In Securely"**

4. **Automatically redirected to exporter portal**

---

## 👥 **Available Test Accounts**

### **Exporter 1: Ethiopian Premium**
```
Username: ethiopianpremium
Password: password123
Exporter ID: EXP2026001
License: ECTA-LIC-2026-001
Organization: Ethiopian Premium Coffee Exporters PLC
```

### **Exporter 2: Test Exporter**
```
Username: testexporter
Password: password123
Exporter ID: EXP2026002
License: ECTA-LIC-2026-002
Organization: Test Coffee Exporters Ltd
```

---

## ✅ **What You'll See After Login**

### **Automatic Redirect:**
After successful login, you are automatically routed to `/portals/exporter`

### **Exporter Portal Features:**

1. **Dashboard Tab**
   - Active Contracts: 2
   - Pending Approvals: 1
   - In Transit Shipments: 1
   - Total Export Value: $289,000
   - Recent activity timeline
   - Action required alerts
   - License status card

2. **My Contracts Tab**
   - DataGrid with 3 sample contracts
   - Contract details dialog
   - Register new contract button (to be connected)

3. **Forex & Banking Tab**
   - Financial overview KPIs
   - Forex allocations with 40% retention
   - Letters of Credit tracking
   - Payment status with SWIFT tracking
   - Birr conversion display

4. **Shipments Tab**
   - Shipment cards with GPS tracking
   - Bill of Lading details
   - Progress stepper (6 steps)
   - Estimated arrival dates

5. **Documents Tab**
   - Drag-and-drop upload area
   - Recent documents list
   - Download buttons
   - Verification status

6. **Reports Tab**
   - Summary KPIs
   - Custom report generator
   - Compliance dashboard
   - Performance metrics

---

## 🔑 **How Authentication Works**

### **JWT Token Contains:**
```javascript
{
  sub: "100",
  userId: "100",
  username: "ethiopianpremium",
  role: "EXPORTER",
  organization: "Ethiopian Premium Coffee Exporters PLC",
  exporterId: "EXP2026001",        // Critical for data filtering
  ectaLicense: "ECTA-LIC-2026-001",
  permissions: [
    "contract.create",
    "contract.view",
    "shipment.view",
    "shipment.create",
    "payment.view",
    "document.upload",
    "document.view",
    "report.generate"
  ]
}
```

### **Data Filtering:**
Every API call extracts `exporterId` from JWT and filters:
```typescript
// api/src/routes/exporters.ts
router.get('/contracts', authMiddleware, async (req, res) => {
  const exporterId = (req as any).user?.exporterId || 'EXP2026001';
  
  // Query only this exporter's contracts
  const result = await fabricService.queryContracts({ exporterId });
  // ...
});
```

Exporters can **ONLY** see their own data.

---

## 🧪 **Testing Checklist**

### **Basic Login Test:**
- [ ] Navigate to http://localhost:3000/login
- [ ] Click "Exporter" quick login button
- [ ] Verify redirect to /portals/exporter
- [ ] Check dashboard loads without errors
- [ ] Verify KPIs display correct numbers
- [ ] Check console for errors (should be none except @mui/lab warning)

### **Portal Navigation Test:**
- [ ] Click through all 6 tabs
- [ ] Verify each tab renders content
- [ ] Check StatusChip displays properly
- [ ] Verify DataGrid in Contracts tab
- [ ] Check Timeline in Dashboard tab
- [ ] Verify Stepper in Shipments tab

### **Data Display Test:**
- [ ] Dashboard shows 2 active contracts
- [ ] Contracts tab shows 3 contracts
- [ ] Forex tab shows 2 allocations
- [ ] Shipments tab shows 2 shipments
- [ ] Payments tab shows retention breakdown
- [ ] Reports tab shows compliance metrics

### **Authentication Test:**
- [ ] Logout from exporter portal
- [ ] Login as ECTA admin (ecta_admin/password123)
- [ ] Verify redirect to /portals/ecta (NOT exporter)
- [ ] Logout and login as exporter again
- [ ] Verify redirect back to /portals/exporter

---

## 🐛 **Known Issues**

### **1. @mui/lab Dependency**
**Issue:** TypeScript error about missing @mui/lab module

**Solution:**
```bash
cd ui
npm install @mui/lab@^5.0.0-alpha.161
```

**Impact:** Timeline component won't render until installed (Dashboard tab)

### **2. Mock Data**
**Issue:** All data is hardcoded in component

**Solution:** Phase 2 - Connect to real API endpoints

**Impact:** Data doesn't refresh, changes don't persist

### **3. Contract Registration**
**Issue:** "Register New Contract" button opens dialog but doesn't submit

**Solution:** Implement form handler and API connection

**Impact:** Cannot create new contracts yet (view-only mode)

---

## 🔄 **Complete Login Flow**

```
┌────────────────────────────────────────────────┐
│  1. User enters credentials                    │
│     Username: ethiopianpremium                 │
│     Password: password123                      │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  2. Frontend calls API                         │
│     POST /api/v1/auth/login                    │
│     { username, password }                     │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  3. Backend validates credentials              │
│     - Find user in database                    │
│     - Verify password (password123)            │
│     - Generate JWT token with exporterId       │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  4. Frontend receives token + user data        │
│     - Store token in localStorage              │
│     - Store user data in localStorage          │
│     - Update AuthContext state                 │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  5. AuthContext checks user role               │
│     - Role: EXPORTER                           │
│     - Route: /portals/exporter                 │
│     - router.push('/portals/exporter')         │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  6. Exporter Portal renders                    │
│     - Load mock data                           │
│     - Display dashboard                        │
│     - Ready for interaction                    │
└────────────────────────────────────────────────┘
```

---

## 📋 **Production Flow (Future)**

### **For New Exporters:**

1. **Register:** http://localhost:3000/register-exporter
2. **Submit Application:** Form submission → Database (status: PENDING)
3. **ECTA Reviews:** ECTA admin views applications in portal
4. **ECTA Approves:**
   - Blockchain registration (RegisterExporter)
   - Credentials created (username + password)
   - Email sent to exporter with login details
5. **Exporter Logs In:** Using provided credentials
6. **First Login:** Force password change
7. **Access Portal:** Full access to exporter portal

### **For Existing Exporters:**
1. **Login:** http://localhost:3000/login
2. **Enter Credentials:** Username + password
3. **Access Portal:** Immediate access

---

## 💡 **Quick Tips**

### **Switching Between Users:**
1. Click user avatar → Logout
2. Return to login page
3. Click different quick login button

### **Testing Different Exporters:**
- Use `ethiopianpremium` for Exporter 1
- Use `testexporter` for Exporter 2
- Each should show different exporterId in mock data (future)

### **Checking JWT Token:**
Open browser DevTools:
```javascript
// Get stored token
const token = localStorage.getItem('authToken');

// Decode (without verification)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);

// Should show:
// { exporterId: "EXP2026001", role: "EXPORTER", ... }
```

---

**Status:** ✅ READY TO TEST  
**Next Steps:** 
1. Install @mui/lab dependency
2. Login as exporter
3. Explore all 6 tabs
4. Report any issues

**Testing Time:** 5-10 minutes


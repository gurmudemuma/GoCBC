# Exporter Portal - Complete Function Checklist ✅

## Overview
This document lists ALL functions in the Exporter Portal and provides a testing guide.

**Status**: Ready for testing once system is running (`./start-all.sh`)

---

## 🔧 How to Test

### 1. Start the System:
```bash
cd /home/guda/GoCBC
./start-all.sh
```

### 2. Run Automated Tests:
```bash
./test-exporter-portal-functions.sh
```

### 3. Manual Testing:
- Open browser: `http://localhost:3000`
- Login as exporter
- Go through each tab and test functions below

---

## 📊 Function Categories

### 🏠 **DASHBOARD TAB** (Tab 1)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 1 | View KPI Cards | Shows Created/Booked/In-Transit/Delivered counts | ⏳ | Visual check |
| 2 | Load exporter profile | Fetches user profile data from API | ⏳ | Check network tab |
| 3 | Display company info | Shows company name, license, contact | ⏳ | Visual check |
| 4 | Calculate statistics | Computes total shipments, contracts, payments | ⏳ | Verify numbers |

**API Endpoints Used:**
- `GET /api/v1/stats/exporter-portal` - Dashboard statistics
- `GET /api/v1/exporters/:exporterID` - Exporter profile

---

### 📋 **CONTRACTS TAB** (Tab 2)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 5 | List all contracts | Display contracts in DataGrid table | ⏳ | Check table loads |
| 6 | Filter by status | Filter contracts (DRAFT, APPROVED, etc.) | ⏳ | Use filter dropdown |
| 7 | Sort contracts | Sort by date, amount, buyer | ⏳ | Click column headers |
| 8 | View contract details | Click row to open detail dialog | ⏳ | Click on contract |
| 9 | Request LC | Button to request Letter of Credit | ⏳ | Click "Request LC" |
| 10 | Search contracts | Search by contract ID or buyer | ⏳ | Use search box |
| 11 | Pagination | Navigate through pages | ⏳ | Change page |

**API Endpoints Used:**
- `GET /api/v1/contracts` - List all contracts
- `GET /api/v1/contracts/:contractId` - Get contract details
- `POST /api/v1/banking/lc/request` - Request LC

**Code Location:**
- `ui/src/components/portals/ExporterPortal.tsx` (Lines ~3100-3400)

---

### 💰 **FOREX & BANKING TAB** (Tab 3)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 12 | View LC applications | Show all LC requests and statuses | ⏳ | Check LC table |
| 13 | View forex declarations | Show NBE forex allocation status | ⏳ | Check forex table |
| 14 | Request forex | Submit forex declaration | ⏳ | Click button |
| 15 | Track LC approval | Monitor bank approval workflow | ⏳ | Check status chips |
| 16 | View CAD (Documentary Collections) | Alternative to LC | ⏳ | Check CAD tab |
| 17 | Filter by contract | Filter forex/LC by contract ID | ⏳ | Use filter |

**API Endpoints Used:**
- `GET /api/v1/banking/lcs` - Get LC applications
- `GET /api/v1/forex` - Get forex declarations
- `GET /api/v1/forex/exporter/:exporterId` - Get exporter's forex
- `POST /api/v1/forex/declare` - Submit forex declaration
- `GET /api/v1/banking/cad` - Get documentary collections

**Code Location:**
- `ui/src/components/portals/ExporterPortal.tsx` (Lines ~3400-3800)

---

### 🚢 **SHIPMENTS TAB** (Tab 4)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 18 | List shipments | Display all registered shipments | ⏳ | Check table loads |
| 19 | **Register new shipment** | Create shipment from Actions column | ✅ | Click button in table |
| 20 | View shipment details | Click to see full shipment info | ⏳ | Click view icon |
| 21 | Track shipment status | Monitor quality → customs → shipping | ⏳ | Check status chip |
| 22 | Filter by status | Filter by CREATED, CLEARED, IN_TRANSIT | ⏳ | Use filter |
| 23 | View transport mode | See AIR or SEA shipping | ⏳ | Check icon |
| 24 | View current location | Track physical location | ⏳ | Check location column |
| 25 | Submit customs declaration | After quality approval | ⏳ | Click customs button |
| 26 | Post-delivery workflow | Mark as delivered and complete | ⏳ | Click checkmark |

**API Endpoints Used:**
- `GET /api/v1/shipments` - List all shipments
- `POST /api/v1/shipments` - Create new shipment
- `GET /api/v1/shipments/:shipmentId` - Get shipment details
- `PATCH /api/v1/shipments/:shipmentId/status` - Update status
- `POST /api/v1/customs/declare` - Submit customs declaration

**Code Location:**
- `ui/src/components/portals/ExporterPortal.tsx` (Lines ~4200-4600)
- **UPDATED**: Register button now in table Actions column (Line ~2336)

---

### 🛃 **CUSTOMS TAB** (Tab 5)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 27 | View customs workflow | Quality → Permit → Declaration → Clearance | ⏳ | Check workflow display |
| 28 | Monitor quality inspection | ECTA cupping test status | ⏳ | Check quality column |
| 29 | Track export permits | ECTA export permit issuance | ⏳ | Check permit column |
| 30 | View customs declarations | Customs submission status | ⏳ | Check declaration column |
| 31 | View clearance status | Final customs clearance | ⏳ | Check clearance column |
| 32 | Filter by shipment | Search specific shipments | ⏳ | Use filter |
| 33 | Declare to customs | Submit declaration when permit issued | ⏳ | Click declare button |

**API Endpoints Used:**
- `GET /api/v1/customs` - Get customs declarations
- `GET /api/v1/permits` - Get export permits
- `GET /api/v1/quality/certificates` - Get quality certificates
- `POST /api/v1/customs/declare` - Submit customs declaration

**Code Location:**
- `ui/src/components/portals/ExporterPortal.tsx` (Lines ~4600-5000)

---

### 💵 **LC & PAYMENTS TAB** (Tab 6)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 34 | View LC details | Full LC information | ⏳ | Check LC section |
| 35 | View payments received | Track incoming payments | ⏳ | Check payment table |
| 36 | View payment status | PENDING, COMPLETED, FAILED | ⏳ | Check status chip |
| 37 | View SWIFT messages | MT700 (LC), MT400 (Collection) | ⏳ | Check SWIFT tab |
| 38 | Match payment to contract | Link payments with contracts | ⏳ | Check mapping |
| 39 | View repatriation records | Export proceeds tracking | ⏳ | Check repatriation section |
| 40 | Filter by date range | Filter payments by date | ⏳ | Use date picker |

**API Endpoints Used:**
- `GET /api/v1/payments` - Get all payments
- `GET /api/v1/banking/swift` - Get SWIFT messages
- `GET /api/v1/banking/swift/mt700` - Get LC SWIFT messages
- `GET /api/v1/repatriation` - Get repatriation records
- `GET /api/v1/repatriation/exporter/:exporterId` - Exporter repatriation

**Code Location:**
- `ui/src/components/portals/ExporterPortal.tsx` (Lines ~5000-5400)

---

### 📊 **REPORTS TAB** (Tab 7)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 41 | Generate contract report | Export contract data | ⏳ | Click generate |
| 42 | Generate shipment report | Export shipment data | ⏳ | Click generate |
| 43 | Generate payment report | Export payment data | ⏳ | Click generate |
| 44 | View compliance checklist | Regulatory compliance status | ⏳ | Check compliance section |
| 45 | Select report format | Choose PDF, Excel, CSV | ⏳ | Use dropdown |
| 46 | Filter report data | Date range, status filters | ⏳ | Use filters |
| 47 | Download report | Save report file | ⏳ | Click download |

**API Endpoints Used:**
- `GET /api/v1/reports/contracts` - Contract report data
- `GET /api/v1/reports/shipments` - Shipment report data
- `GET /api/v1/reports/payments` - Payment report data

**Code Location:**
- `ui/src/components/portals/ExporterPortal.tsx` (Lines ~2528-2640)
- **UPDATED**: Simplified, removed large KPI cards

---

### 📜 **AUDIT TRAIL TAB** (Tab 8)
Functions to test:

| # | Function | Description | Status | Test Method |
|---|----------|-------------|--------|-------------|
| 48 | View all audit logs | Complete activity history | ✅ | Check table loads |
| 49 | Filter by entity type | CONTRACT, SHIPMENT, PAYMENT | ⏳ | Use entity filter |
| 50 | Filter by action | CREATE, UPDATE, APPROVE | ⏳ | Use action filter |
| 51 | Filter by user | Who performed action | ⏳ | Use user filter |
| 52 | Filter by date range | Specific time periods | ⏳ | Use date picker |
| 53 | View audit details | Expand to see old/new values | ⏳ | Click row |
| 54 | Sort by timestamp | Latest first | ⏳ | Click header |
| 55 | Search audit logs | Search by entity ID or user | ⏳ | Use search box |
| 56 | Export audit trail | Download audit report | ⏳ | Click export |

**API Endpoints Used:**
- `GET /api/v1/audit` - Get all audit logs
- `GET /api/v1/audit/entity/:entityType/:entityId` - Get entity audit trail

**Code Location:**
- `ui/src/components/portals/ExporterPortal.tsx` (Lines ~5400-5800)

**Database Columns (ALL FIXED):** ✅
- `performed_by` ✅
- `performed_by_org` ✅
- `organization` ✅
- `reason` ✅
- `metadata` ✅
- `created_at` ✅

---

## 🎨 UI/UX Features

### Visual Elements:
| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 57 | Brand colors (#9b30b7, #FFD700) | ✅ | Matches login page |
| 58 | No blockchain badges | ✅ | Removed from tabs |
| 59 | No ECTA LICENSE badge | ✅ | Cleaned up |
| 60 | Clean table layouts | ✅ | All tabs use DataGrid |
| 61 | Status chips with colors | ✅ | Color-coded status |
| 62 | Icons for actions | ✅ | View, Edit, Delete icons |
| 63 | Responsive design | ⏳ | Test on mobile |
| 64 | Loading indicators | ⏳ | Check spinners |
| 65 | Error messages | ⏳ | Test error handling |
| 66 | Empty states | ✅ | Shows helpful messages |
| 67 | Tooltips on icons | ✅ | Hover to see labels |

---

## 🔐 Security & Authorization

### Access Control:
| # | Feature | Status | Test Method |
|---|---------|--------|-------------|
| 68 | Login required | ⏳ | Access without login |
| 69 | JWT token validation | ⏳ | Use expired token |
| 70 | Role-based access | ⏳ | Try admin functions |
| 71 | Exporter data isolation | ⏳ | Check other exporter data |
| 72 | API authentication | ⏳ | Call API without token |
| 73 | Session timeout | ⏳ | Wait and retry |

---

## 🔗 Integration Functions

### Blockchain Integration:
| # | Function | Status | Test Method |
|---|----------|--------|-------------|
| 74 | Contract on blockchain | ⏳ | Check transaction ID |
| 75 | Shipment on blockchain | ⏳ | Verify blockchain sync |
| 76 | Payment on blockchain | ⏳ | Check blockchain record |
| 77 | Audit trail to blockchain | ⏳ | Verify immutable log |

### Email Notifications:
| # | Function | Status | Test Method |
|---|----------|--------|-------------|
| 78 | Contract approval email | ⏳ | Check email sent |
| 79 | Shipment status email | ⏳ | Check email sent |
| 80 | Payment received email | ⏳ | Check email sent |
| 81 | LC approval email | ⏳ | Check email sent |

---

## 📱 Responsive Design

### Device Compatibility:
| Device | Status | Notes |
|--------|--------|-------|
| Desktop (1920x1080) | ⏳ | Primary target |
| Laptop (1366x768) | ⏳ | Test layout |
| Tablet (768x1024) | ⏳ | Test touch |
| Mobile (375x667) | ⏳ | Test mobile menu |

---

## 🚀 Performance Tests

| # | Test | Target | Status |
|---|------|--------|--------|
| 82 | Page load time | < 3s | ⏳ |
| 83 | API response time | < 500ms | ⏳ |
| 84 | Table render time | < 1s | ⏳ |
| 85 | Search/filter speed | < 200ms | ⏳ |

---

## 🧪 Test Automation

### Automated Test Script:
```bash
# Run comprehensive test suite
./test-exporter-portal-functions.sh
```

**Tests Included:**
- ✅ System health checks (API, UI, Database)
- ✅ Authentication (Admin, Exporter login)
- ✅ All API endpoints
- ✅ Database schema validation
- ✅ Critical tables existence
- ✅ UI component checks

---

## 📝 Manual Test Script

### Step-by-Step Testing:

1. **Start System:**
   ```bash
   cd /home/guda/GoCBC
   ./start-all.sh
   ```
   Wait for: "All services started successfully"

2. **Login:**
   - Go to `http://localhost:3000`
   - Username: `exporter1`
   - Password: `password123`

3. **Test Each Tab:**
   
   **Dashboard:**
   - [ ] KPI cards show numbers
   - [ ] Company info displayed
   - [ ] No errors in console

   **Contracts:**
   - [ ] Table loads with data
   - [ ] Can click on row
   - [ ] "Request LC" button works
   - [ ] Sorting works
   - [ ] Filtering works

   **Forex & Banking:**
   - [ ] LC applications shown
   - [ ] Forex declarations shown
   - [ ] Can submit forex request
   - [ ] Status colors correct

   **Shipments:**
   - [ ] Shipments table loads
   - [ ] **"Register New Shipment" button in Actions column** ✅
   - [ ] Can view shipment details
   - [ ] Status tracking works
   - [ ] Transport icons show

   **Customs:**
   - [ ] Workflow displayed
   - [ ] Quality status shown
   - [ ] Permit status shown
   - [ ] Declaration works

   **LC & Payments:**
   - [ ] Payments table loads
   - [ ] SWIFT messages shown
   - [ ] Repatriation records shown

   **Reports:**
   - [ ] Report options shown
   - [ ] Compliance checklist visible
   - [ ] Can select report type

   **Audit Trail:**
   - [ ] Audit logs load
   - [ ] No "column does not exist" errors ✅
   - [ ] Can filter by entity
   - [ ] Can filter by action
   - [ ] Timestamps shown

4. **Check Console:**
   - Press F12
   - Check for errors (should be none)
   - Check network tab (all API calls should succeed)

---

## 🎯 Success Criteria

### All Functions Working If:
- ✅ No red errors in browser console
- ✅ All tabs load without errors
- ✅ All tables show data (or "No data" message)
- ✅ All buttons are clickable
- ✅ All API calls return 200 or 201
- ✅ Audit trail loads without database errors
- ✅ Colors match login page
- ✅ No blockchain badges visible

---

## 📊 Test Results

Run automated test and record results:

```bash
./test-exporter-portal-functions.sh > test-results.log 2>&1
cat test-results.log
```

**Expected Output:**
```
============================================================================
  ✓ ALL TESTS PASSED - SYSTEM FUNCTIONAL
============================================================================
Total Tests:    50+
Passed:         50+
Failed:         0
Warnings:       0-2
Pass Rate:      100%
```

---

## 🔧 Troubleshooting

### If Tests Fail:

1. **API Not Responding:**
   ```bash
   cd api && npm start
   ```

2. **UI Not Loading:**
   ```bash
   cd ui && npm run dev
   ```

3. **Database Errors:**
   ```bash
   docker exec -i cecbs-postgres psql -U cecbs -d cecbs
   \d audit_trail
   ```

4. **Chaincode Issues:**
   ```bash
   docker logs coffee-chaincode
   ```

---

## 📅 Testing Schedule

- **Before Release:** Test all 85 functions manually
- **After Updates:** Run automated test script
- **Weekly:** Spot check critical functions (login, contracts, shipments)
- **After start-all.sh:** Run full test suite to verify permanence

---

**Document Version:** 1.0  
**Last Updated:** October 14, 2026  
**Status:** Ready for comprehensive testing ✅

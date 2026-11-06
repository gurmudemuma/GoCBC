# Portal Tab & Subtab Data Validation Guide

**Created:** November 5, 2026  
**Purpose:** Comprehensive validation of all portal tabs and subtabs data fetching

---

## Overview

This test validates that all **61 main tabs** plus **18 subtabs** across **7 portals** are correctly fetching and displaying data from the API.

### Total Coverage
- **7 Portals:** Exporter, ECTA, Banks, NBE, Customs, Shipping, ECX
- **61 Main Tabs**
- **18 Subtabs/Filters:**
  - ECTA Quality Control: 5 workflow stages
  - Banks Payment Methods: 4 payment types
  - NBE Forex Monitoring: 3 filter views
  - NBE SWIFT Monitoring: 3 analysis tabs
  - NBE Analytics: 3 report sections
- **Grand Total:** 79 data endpoints tested

---

## Test Structure

### Portal 1: Exporter Portal (8 Tabs)
| Tab # | Tab Name | Endpoint Tested |
|-------|----------|-----------------|
| 0 | Dashboard | `/exporters/dashboard` |
| 1 | Contracts | `/contracts` |
| 2 | Forex & Banking | `/forex`, `/lc` |
| 3 | Shipments | `/shipments` |
| 4 | Customs | `/customs/declarations` |
| 5 | LC & Payments | `/payment` |
| 6 | Reports | `/exporters/reports` |
| 7 | Audit Trail | `/audit/trail` |

### Portal 2: ECTA Portal (10 Tabs + 5 Quality Control Subtabs)
| Tab # | Tab Name | Endpoint Tested |
|-------|----------|-----------------|
| 0 | Pending Applications | `/exporters/applications` |
| 1 | Approved Exporters | `/exporters` |
| 2 | Sales Contracts | `/contracts` |
| 3 | Quality Control | `/quality/inspections` |
| 3.1 | → PENDING Stage | `/quality/inspections?status=PENDING` |
| 3.2 | → SCHEDULED Stage | `/quality/inspections?status=SCHEDULED` |
| 3.3 | → UNDER_REVIEW Stage | `/quality/inspections?status=UNDER_REVIEW` |
| 3.4 | → APPROVED Stage | `/quality/inspections?status=APPROVED` |
| 3.5 | → REJECTED Stage | `/quality/inspections?status=REJECTED` |
| 4 | License Renewals | `/exporters/renewals` |
| 5 | Analytics | `/ecta/analytics` |
| 6 | Pre-shipment Inspection | `/quality/pre-shipment` |
| 7 | User Management | `/users?organization=ECTA` |
| 8 | Audit Trail | `/audit/trail?organization=ECTA` |
| 9 | Post-Delivery Audits | `/quality/post-delivery` |

### Portal 3: Banks Portal (4 Parent + 9 Child Tabs + 4 Payment Methods)
| Parent | Child # | Tab Name | Endpoint Tested |
|--------|---------|----------|-----------------|
| **Payment Operations** |
|  | 0 | Payment Methods | (4 payment types below) |
|  | 0.1 | → LC (Letter of Credit) | `/payment?method=LC` |
|  | 0.2 | → CAD (Documentary Collection) | `/payment?method=CAD` |
|  | 0.3 | → ADVANCE (Advance Payment) | `/payment?method=ADVANCE` |
|  | 0.4 | → CONSIGNMENT | `/payment?method=CONSIGNMENT` |
|  | 2 | Document Examination | `/banking/lc/documents` |
|  | 3 | Payment Release | `/payment/pending-release` |
|  | 9 | LC Discrepancies | `/banking/lc/discrepancies` |
| **Forex & Settlements** |
|  | 1 | Forex Allocations | `/forex` |
|  | 5 | LC Settlements | `/banking/lc/settlements` |
| **Communication & Issues** |
|  | 4 | SWIFT Messages | `/swift/messages` |
| **System Management** |
|  | 6 | Analytics | `/banking/analytics` |
|  | 7 | User Management | `/users?organization=BANKS` |
|  | 8 | Audit Trail | `/audit/trail?organization=BANKS` |

### Portal 4: NBE Portal (8 Tabs + 9 Subtabs)
| Tab # | Tab Name | Endpoint Tested |
|-------|----------|-----------------|
| 0 | Forex Monitoring | (3 filter views below) |
| 0.1 | → All Forex | `/forex` |
| 0.2 | → Allocated | `/forex?status=ALLOCATED` |
| 0.3 | → Requested | `/forex?status=REQUESTED` |
| 1 | Exchange Rates | `/nbe/exchange-rates` |
| 2 | SWIFT Monitoring | (3 analysis tabs below) |
| 2.1 | → All Messages | `/swift/messages` |
| 2.2 | → Analytics & Charts | `/swift/analytics` |
| 2.3 | → Compliance Alerts | `/swift/compliance` |
| 3 | Forex Repatriation | `/forex/repatriation` |
| 4 | Policy & Compliance | `/nbe/compliance` |
| 5 | Analytics | (3 report sections below) |
| 5.1 | → Overview | `/nbe/analytics` |
| 5.2 | → Trends | `/nbe/analytics/trends` |
| 5.3 | → Breakdown | `/nbe/analytics/breakdown` |
| 6 | User Management | `/users?organization=NBE` |
| 7 | Audit Trail | `/audit/trail?organization=NBE` |

### Portal 5: Customs Portal (8 Tabs)
| Tab # | Tab Name | Endpoint Tested |
|-------|----------|-----------------|
| 0 | Submitted | `/customs/declarations?status=SUBMITTED` |
| 1 | Inspecting | `/customs/declarations?status=INSPECTING` |
| 2 | Under Review | `/customs/declarations?status=UNDER_REVIEW` |
| 3 | Cleared | `/customs/declarations?status=CLEARED` |
| 4 | Rejected | `/customs/declarations?status=REJECTED` |
| 5 | Border Crossing | `/customs/border-crossing` |
| 6 | User Management | `/users?organization=CUSTOMS` |
| 7 | Audit Trail | `/audit/trail?organization=CUSTOMS` |

### Portal 6: Shipping Portal (10 Lifecycle Tabs)
| Tab # | Tab Name (Status) | Endpoint Tested |
|-------|-------------------|-----------------|
| 0 | Clearance (CUSTOMS_CLEARED) | `/shipments?status=CUSTOMS_CLEARED` |
| 1 | Land Transport (LAND_TRANSPORT) | `/shipments?status=LAND_TRANSPORT` |
| 2 | Port Arrival (PORT_ARRIVED) | `/shipments?status=PORT_ARRIVED` |
| 3 | Container Stuffing (CONTAINER_STUFFED) | `/shipments?status=CONTAINER_STUFFED` |
| 4 | Vessel Loading (VESSEL_LOADED) | `/shipments?status=VESSEL_LOADED` |
| 5 | Departed (DEPARTED) | `/shipments?status=DEPARTED` |
| 6 | In Transit (IN_TRANSIT) | `/shipments?status=IN_TRANSIT` |
| 7 | Destination Arrived (DESTINATION_ARRIVED) | `/shipments?status=DESTINATION_ARRIVED` |
| 8 | Delivered (DELIVERED) | `/shipments?status=DELIVERED` |
| 9 | User Management | `/users?organization=SHIPPING` |

### Portal 7: ECX Portal (4 Tabs)
| Tab # | Tab Name | Endpoint Tested |
|-------|----------|-----------------|
| 0 | Coffee Lots | `/ecx/coffee-lots` |
| 1 | Market Prices | `/ecx/market-prices` |
| 2 | Grading Standards | `/ecx/grading-standards` |
| 3 | User Management | `/users?organization=ECX` |

---

## How to Run

### Option 1: Quick Run (Auto-start system if needed)
```bash
cd /home/guda/GoCBC/tests/ui
./RUN-PORTAL-VALIDATION.sh
```

This script will:
1. Check if API is running
2. Start the system if needed (waits 60 seconds)
3. Run the complete portal validation test

### Option 2: Manual Run (System already running)
```bash
# First, ensure system is running
cd /home/guda/GoCBC
./start-all.sh

# Wait for services to be ready (about 60 seconds)
# Then run the validation
cd tests/ui
./PORTAL-TAB-DATA-VALIDATION.sh
```

---

## Test Output

### Success Indicators
```
✓ Dashboard stats (5 records)
✓ Contracts list (12 records)
✓ Forex allocations (8 records)
```

### Warning Indicators
```
⚠ ECTA analytics - No data field found
⚠ Market prices - Invalid JSON
```
**Note:** Warnings indicate the endpoint is accessible but may not have data or needs investigation.

### Failure Indicators
```
✗ Coffee lots (HTTP 404)
✗ Forex repatriation (HTTP 500)
```
**Note:** Failures indicate the endpoint is not accessible or returned an error.

---

## Expected Results

### ✅ Pass Criteria
- **Pass Rate:** ≥ 95%
- **Failed Tests:** 0
- **HTTP Status:** All 200 or 201
- **Response Format:** Valid JSON with data

### ⚠️ Warning Criteria
- **Pass Rate:** 90-95%
- **Failed Tests:** 0
- **Some endpoints:** Return empty arrays (no data)

### ❌ Fail Criteria
- **Pass Rate:** < 90%
- **Failed Tests:** > 0
- **HTTP Status:** 404, 500, or connection errors

---

## Common Issues & Solutions

### Issue 1: API Not Running
**Symptom:**
```
✗ API is not responding at http://localhost:5000/api/v1
```

**Solution:**
```bash
cd /home/guda/GoCBC
./start-all.sh
# Wait 60 seconds for services to start
```

### Issue 2: Authentication Failed
**Symptom:**
```
✗ ECTA login failed
✗ Bank login failed
```

**Solution:**
Check user credentials in the database:
```bash
cd /home/guda/GoCBC
docker exec -it postgres psql -U postgres -d gocbc_db -c "SELECT email, role FROM users WHERE role IN ('ECTA', 'BANKS', 'NBE');"
```

### Issue 3: Empty Data Warnings
**Symptom:**
```
⚠ Coffee lots - No data field found
⚠ Market prices - Invalid JSON
```

**Solution:**
This is expected if no data exists yet. Run the E2E test first to populate data:
```bash
cd /home/guda/GoCBC/tests/e2e
./COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh
```

### Issue 4: 404 Errors
**Symptom:**
```
✗ Forex repatriation (HTTP 404)
✗ Post-delivery audits (HTTP 404)
```

**Solution:**
Check if the API route exists:
```bash
cd /home/guda/GoCBC/api/src
grep -r "forex/repatriation" routes/
grep -r "post-delivery" routes/
```

If the route doesn't exist, it may need to be implemented.

---

## Validation Checklist

Before running the test, ensure:

- [ ] System is running (`./start-all.sh`)
- [ ] API is accessible (http://localhost:5000/api/v1/health)
- [ ] UI is accessible (http://localhost:3001)
- [ ] Database is running (`docker ps | grep postgres`)
- [ ] Blockchain network is active (`docker ps | grep peer`)
- [ ] Test data exists (run E2E test if needed)

After running the test:

- [ ] All 7 portal authentications succeeded
- [ ] Pass rate is ≥ 95%
- [ ] No failed tests (only warnings acceptable)
- [ ] All critical endpoints return 200
- [ ] Data is being fetched correctly

---

## What This Test Validates

### ✅ API Layer
- All endpoints are accessible
- Authentication is working
- Authorization is properly configured
- Data is being returned in correct format

### ✅ Database Layer
- All tables are populated
- Queries are executing correctly
- Relationships are properly defined
- Data integrity is maintained

### ✅ Frontend Layer (Indirect)
- All tab endpoints match UI expectations
- Filter parameters work correctly
- Organization-based queries work
- Status-based filtering works

### ✅ Integration
- Portal-to-API communication
- Role-based access control
- Multi-organization data isolation
- Complete data flow validation

---

## Next Steps After Validation

### If Test Passes (≥95%)
1. Document any warnings for investigation
2. Verify UI rendering by manually checking portals
3. Test user interactions (clicks, filters, etc.)
4. Perform load testing if needed

### If Test Fails (<95%)
1. Review failed endpoint logs
2. Check API route definitions
3. Verify database schema
4. Check for missing migrations
5. Re-run E2E test to populate data
6. Fix identified issues
7. Re-run validation test

---

## Test Maintenance

### When to Re-run
- After any API changes
- After database migrations
- After adding new portal tabs
- After modifying authentication
- Before production deployment
- Weekly as part of CI/CD

### Updating the Test
When adding new tabs:
1. Add endpoint to `PORTAL-TAB-DATA-VALIDATION.sh`
2. Update this documentation
3. Update `COMPLETE-PORTAL-TABS-LIST.md`
4. Add to CI/CD pipeline

---

## Related Documentation

- **Portal Structure:** [Docs/COMPLETE-PORTAL-TABS-LIST.md](COMPLETE-PORTAL-TABS-LIST.md)
- **E2E Testing:** [Docs/COMPREHENSIVE-E2E-TEST-FINAL-RESULTS.md](COMPREHENSIVE-E2E-TEST-FINAL-RESULTS.md)
- **API Documentation:** [api/src/routes/](../api/src/routes/)
- **System Status:** [Docs/SYSTEM-STATUS-FINAL-REPORT.md](SYSTEM-STATUS-FINAL-REPORT.md)

---

## Summary

This validation test ensures that all 61 main tabs plus 18 subtabs across 7 portals are correctly connected to their respective API endpoints and can fetch data successfully.

**Test Coverage:** 79 data endpoints  
**Expected Duration:** 2-3 minutes  
**Prerequisites:** Running system with test data  
**Success Criteria:** ≥95% pass rate with 0 failures

---

*Generated: November 5, 2026*  
*Last Updated: November 5, 2026*  
*Status: Ready for Production Validation*

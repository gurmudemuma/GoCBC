# Remaining 14 Endpoints to Fix - Portal Tab Validation

## Test Results: 80.8% Pass Rate (59/73 passing)

**Progress:** Improved from 52.1% to 80.8% (+28.7%) by fixing endpoint paths

## 14 Failing Endpoints (Need Creation or Path Correction)

### ECTA Portal (3 endpoints)
1. ❌ `/api/v1/exporters/renewals` - License renewals (HTTP 404)
2. ❌ `/api/v1/quality/pre-shipment` - Pre-shipment inspections (HTTP 404)
3. ❌ `/api/v1/quality/post-delivery` - Post-delivery audits (HTTP 404)

### Banks Portal (3 endpoints)
4. ❌ `/api/v1/payments/pending-release` - Pending payment releases (HTTP 404)
5. ❌ `/api/v1/banking/lc/discrepancies` - LC discrepancies (HTTP 404)
6. ❌ `/api/v1/banking/lc/settlements` - LC settlements (HTTP 404)

### NBE Portal (6 endpoints)
7. ❌ `/api/v1/swift/analytics` - SWIFT Analytics & Charts (HTTP 404)
8. ❌ `/api/v1/swift/compliance` - SWIFT Compliance Alerts (HTTP 404)
9. ❌ `/api/v1/forex/repatriation` - Forex repatriation (HTTP 404)
10. ❌ `/api/v1/compliance` - Policy & compliance (HTTP 404)
11. ❌ `/api/v1/analytics/timeseries/trends` - Analytics Trends (HTTP 400)
12. ❌ `/api/v1/analytics/timeseries/breakdown` - Analytics Breakdown (HTTP 400)

### Customs Portal (1 endpoint)
13. ❌ `/api/v1/customs/border-crossing` - Border crossing (HTTP 404)

### ECX Portal (1 endpoint)
14. ❌ `/api/v1/ecx/grading-standards` - Grading standards (HTTP 404)

---

## Analysis & Recommendations

### 🔍 Check if these endpoints exist with different paths:

1. **LC Discrepancies** - Check if exists at:
   - `/api/v1/lc/:lcId/discrepancies` (lc-amendments.ts)
   
2. **SWIFT Analytics/Compliance** - Check swift.ts routes

3. **Forex Repatriation** - Check if exists at:
   - `/api/v1/repatriation`

4. **Border Crossing** - Check if exists at:
   - `/api/v1/bordercrossing`

5. **Analytics Timeseries** - HTTP 400 suggests endpoint exists but needs proper parameters

### ✅ Endpoints that genuinely need creation:

1. `/api/v1/exporters/renewals` - License renewal workflow
2. `/api/v1/quality/pre-shipment` - Pre-shipment inspection filter
3. `/api/v1/quality/post-delivery` - Post-delivery audit filter
4. `/api/v1/payments/pending-release` - Payment release queue
5. `/api/v1/banking/lc/settlements` - LC settlement tracking
6. `/api/v1/compliance` - NBE compliance reports
7. `/api/v1/ecx/grading-standards` - Coffee grading standards

---

## Next Steps

### Option 1: Quick Path Fixes (for endpoints that exist elsewhere)
- Update test script to use correct paths
- Should bring pass rate to ~85-90%

### Option 2: Create Missing Endpoints (full implementation)
- Implement the 7-10 genuinely missing endpoints
- Should bring pass rate to 95-100%

### Option 3: Hybrid Approach (Recommended)
1. First, verify which endpoints exist with different paths (30 mins)
2. Update test script with corrected paths (15 mins)
3. Create only the genuinely missing critical endpoints (2-3 hours)
4. Defer nice-to-have endpoints to backlog

---

## Priority Classification

### 🔴 HIGH PRIORITY (Create Now)
- `/api/v1/payments/pending-release` - Critical for payment workflow
- `/api/v1/banking/lc/settlements` - Critical for LC lifecycle
- `/api/v1/customs/border-crossing` - Critical for customs workflow

### 🟡 MEDIUM PRIORITY (Create Soon)
- `/api/v1/exporters/renewals` - License management
- `/api/v1/compliance` - NBE regulatory compliance
- `/api/v1/ecx/grading-standards` - Quality standards reference

### 🟢 LOW PRIORITY (Can Defer)
- `/api/v1/quality/pre-shipment` - Can filter quality inspections client-side
- `/api/v1/quality/post-delivery` - Can filter quality inspections client-side
- `/api/v1/swift/analytics` - Nice-to-have analytics
- `/api/v1/swift/compliance` - Nice-to-have monitoring

---

## Commands to Verify Endpoints Exist

```bash
# Check if LC discrepancies route exists
grep -r "discrepancies" api/src/routes/*.ts

# Check if repatriation route exists  
grep -r "repatriation" api/src/routes/*.ts

# Check if bordercrossing route exists
grep -r "border" api/src/routes/*.ts

# Check swift routes
grep -r "analytics\|compliance" api/src/routes/swift.ts
```

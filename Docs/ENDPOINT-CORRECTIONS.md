# Endpoint Corrections - Portal Tab Validation

## Summary
Mapping of the 35 failing endpoints (HTTP 404) to their correct paths.

## ✅ CONFIRMED: Endpoints That Need Path Updates

### Exporter Portal
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/exporters/dashboard` | `/api/v1/analytics/dashboard` or `/api/v1/portals/exporter/dashboard` | analytics.ts, portals.ts |
| `/api/v1/exporters/applications` | `/api/v1/exporters/exporter-applications` | exporters.ts line 26 |
| `/api/v1/exporters/reports` | `/api/v1/analytics/export-report` | analytics.ts line 102 |

### ECTA Portal
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/ecta/analytics` | `/api/v1/analytics/dashboard` or `/api/v1/portals/ecta/dashboard` | analytics.ts, portals.ts |

### Banking Portal
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/lc` | `/api/v1/banking/lc` | banking.ts |
| `/api/v1/payment` | `/api/v1/payments` | payments.ts line 984 (GET /), line 1525 (POST /) |
| `/api/v1/banking/analytics` | `/api/v1/analytics/dashboard` or `/api/v1/stats/*` | analytics.ts, stats.ts |
| `/api/v1/banking/lc/documents` | `/api/v1/banking/lc` (LC data) + `/api/v1/documents` (document list) | banking.ts + documents.ts |

### NBE Portal
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/nbe/analytics` | `/api/v1/analytics/dashboard` or `/api/v1/portals/nbe/dashboard` | analytics.ts, portals.ts |
| `/api/v1/nbe/exchange-rates` | `/api/v1/exchange-rates` | exchangeRates.ts line 18 |

### Customs Portal
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/customs/analytics` | `/api/v1/analytics/dashboard` or `/api/v1/portals/customs/dashboard` | analytics.ts, portals.ts |

### Shipping Portal
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/shipping/analytics` | `/api/v1/analytics/dashboard` or `/api/v1/portals/shipping/dashboard` | analytics.ts, portals.ts |

### ECX Portal
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/ecx/analytics` | `/api/v1/analytics/dashboard` or `/api/v1/portals/ecx/dashboard` | analytics.ts, portals.ts |
| `/api/v1/ecx/coffee-lots` | `/api/v1/ecx/lots` | ecx.ts line 73 |
| `/api/v1/ecx/market-prices` | `/api/v1/market/prices` | market.ts line 53 |

### Audit Trail
| Failed Endpoint | Correct Endpoint | Found In |
|----------------|------------------|----------|
| `/api/v1/audit/trail` | `/api/v1/audit/portal/recent` or `/api/v1/audit/trail/:entityType/:entityId` | audit.ts line 70, line 1917 |

## Pattern Summary

### 1. Dashboard/Analytics Endpoints
All portal-specific analytics endpoints should use:
- **Option A**: `/api/v1/analytics/dashboard` (universal)
- **Option B**: `/api/v1/portals/{portal}/dashboard` (portal-specific)

Example:
- ❌ `/api/v1/exporters/dashboard`
- ✅ `/api/v1/analytics/dashboard`
- ✅ `/api/v1/portals/exporter/dashboard`

### 2. Application Endpoints
- ❌ `/api/v1/exporters/applications`
- ✅ `/api/v1/exporters/exporter-applications`

### 3. Payment Endpoints
- ❌ `/api/v1/payment`
- ✅ `/api/v1/payments`

### 4. LC Endpoints
- ❌ `/api/v1/lc`
- ✅ `/api/v1/banking/lc`

### 5. ECX Endpoints
- ❌ `/api/v1/ecx/coffee-lots`
- ✅ `/api/v1/ecx/lots`

- ❌ `/api/v1/ecx/market-prices`
- ✅ `/api/v1/market/prices`

### 6. Exchange Rates
- ❌ `/api/v1/nbe/exchange-rates`
- ✅ `/api/v1/exchange-rates`

### 7. Reports
- ❌ `/api/v1/exporters/reports`
- ✅ `/api/v1/analytics/export-report`

## Next Actions

1. ✅ Update test script `/home/guda/GoCBC/tests/ui/PORTAL-TAB-DATA-VALIDATION.sh` with correct endpoints
2. ✅ Re-run validation test
3. ✅ Achieve >95% pass rate
4. ✅ Identify any genuinely missing endpoints that need creation

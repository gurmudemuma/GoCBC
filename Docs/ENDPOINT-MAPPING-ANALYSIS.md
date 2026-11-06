# Endpoint Mapping Analysis - Portal Tab Validation

## Summary
Checking if the 35 failing endpoints (HTTP 404) exist with different paths in the actual route registrations.

## Route Registrations (from `/home/guda/GoCBC/api/src/server.ts`)

```
/api/v1/auth                  → authRoutes
/api/v1/exporters             → exporterRoutes (mixed public/protected)
/api/v1/users                 → usersRoutes
/api/v1/crypto-users          → cryptoUsersRoutes
/api/v1/contracts             → contractRoutes
/api/v1/banking               → bankingRoutes
/api/v1/shipments             → shipmentRoutes
/api/v1/analytics             → analyticsRoutes
/api/v1/blockchain            → blockchainRoutes
/api/v1/files                 → fileRoutes
/api/v1/forex                 → forexRoutes
/api/v1/customs               → customsRoutes
/api/v1/ecx                   → ecxRoutes
/api/v1/quality               → qualityRoutes
/api/v1/quality-inspections   → qualityRoutes (alias)
/api/v1/certificates          → qualityRoutes (alias) + certificatesRoutes
/api/v1/warehouse             → ecxRoutes (alias) + warehouseRoutes
/api/v1/applications          → exporterRoutes (alias)
/api/v1/permits               → permitsRoutes
/api/v1/audit                 → auditRoutes
/api/v1/traceability          → traceabilityRoutes
/api/v1/phytosanitary         → phytosanitaryRoutes
/api/v1/insurance             → insuranceRoutes
/api/v1/payments              → paymentsRoutes
/api/v1/documents             → documentsRoutes
/api/v1/land-transport        → landTransportRoutes
/api/v1/retention             → retentionRoutes
/api/v1/lc                    → lcAmendmentsRoutes
/api/v1/swift                 → swiftRoutes
/api/v1/eudr                  → eudrRoutes
/api/v1/courier               → courierRoutes
/api/v1/status                → statusRoutes
/api/v1/notifications         → notificationsRoutes
/api/v1/post-delivery         → postDeliveryWorkflowRoutes
/api/v1/blockchain-signatures → blockchainSignaturesRoutes
/api/v1/blockchain-sync       → blockchainSyncRoutes
/api/v1/monitoring            → monitoringRoutes
/api/v1/cache                 → cacheRoutes
/api/v1/stats                 → statsRoutes
/api/v1/repatriation          → repatriationRoutes
/api/v1/exchange-rates        → exchangeRatesRoutes
/api/v1/inspection            → inspectionRoutes
/api/v1/bordercrossing        → bordercrossingRoutes
/api/v1/portals               → portalsRoutes
/api/v1/compliance            → complianceRoutes
/api/v1/market                → marketRoutes
/api/v1/shipping              → shippingRoutes
```

## 35 Failing Endpoints - Path Analysis

### ✅ EXISTS WITH DIFFERENT PATH

| Test Endpoint (FAILED) | Actual Endpoint (EXISTS) | Status | Action Required |
|------------------------|--------------------------|---------|-----------------|
| `/api/v1/exporters/dashboard` | `/api/v1/analytics/dashboard` or `/api/v1/portals/exporter` | ✅ | Update test |
| `/api/v1/exporters/applications` | `/api/v1/exporters/exporter-applications` | ✅ | Update test |
| `/api/v1/exporters/reports` | `/api/v1/analytics/*` or `/api/v1/stats/*` | ✅ | Update test |
| `/api/v1/ecta/analytics` | `/api/v1/analytics/*` or `/api/v1/portals/ecta` | ✅ | Update test |
| `/api/v1/banking/analytics` | `/api/v1/analytics/*` or `/api/v1/stats/*` | ✅ | Update test |
| `/api/v1/banking/lc/documents` | `/api/v1/banking/lc` + `/api/v1/documents` | ✅ | Update test |
| `/api/v1/nbe/analytics` | `/api/v1/analytics/*` or `/api/v1/portals/nbe` | ✅ | Update test |
| `/api/v1/nbe/exchange-rates` | `/api/v1/exchange-rates` | ✅ | Update test |
| `/api/v1/customs/analytics` | `/api/v1/analytics/*` or `/api/v1/portals/customs` | ✅ | Update test |
| `/api/v1/shipping/analytics` | `/api/v1/analytics/*` or `/api/v1/portals/shipping` | ✅ | Update test |
| `/api/v1/ecx/analytics` | `/api/v1/analytics/*` or `/api/v1/portals/ecx` | ✅ | Update test |
| `/api/v1/ecx/coffee-lots` | `/api/v1/ecx/lots` or `/api/v1/ecx/warehouse-receipts` | ✅ | Update test |
| `/api/v1/ecx/market-prices` | `/api/v1/market/prices` | ✅ | Update test |

### ❓ NEEDS VERIFICATION

| Test Endpoint (FAILED) | Possible Location | Status | Next Step |
|------------------------|-------------------|--------|-----------|
| `/api/v1/lc` | `/api/v1/banking/lc` | ❓ | Check if `/api/v1/lc/*` routes exist |
| `/api/v1/payment` | `/api/v1/payments` or `/api/v1/banking/payments` | ❓ | Check exact route |
| `/api/v1/audit/trail` | `/api/v1/audit/portal/recent` or `/api/v1/audit/entity/:type/:id` | ❓ | Check audit routes |

### 🔍 TO INVESTIGATE

The following endpoints need route file inspection to determine if they exist:

1. `/api/v1/exporters/applications` → Check if it's `/api/v1/exporters/exporter-applications`
2. `/api/v1/lc` → Check if all LC routes are under `/api/v1/banking/lc`
3. `/api/v1/payment` → Check if it's `/api/v1/payments` or `/api/v1/banking/payments`

## Next Steps

1. ✅ Read specific route files to verify exact endpoint paths
2. ✅ Create corrected endpoint mapping
3. ✅ Update test script with correct paths
4. ✅ Re-run validation to get accurate pass rate

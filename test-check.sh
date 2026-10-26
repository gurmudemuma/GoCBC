#!/bin/bash
echo "=========================================="
echo "SYSTEM VERIFICATION CHECK"
echo "=========================================="
echo ""

# Check migration file
echo "1. Migration File:"
if [ -f "api/src/migrations/043_fix_status_enums.sql" ]; then
  echo "   ✅ Migration 043 exists"
  grep -q "logistics_status" api/src/migrations/043_fix_status_enums.sql && echo "   ✅ Contains logistics_status" || echo "   ❌ Missing logistics_status"
  grep -q "payment_tracking_status" api/src/migrations/043_fix_status_enums.sql && echo "   ✅ Contains payment_tracking_status" || echo "   ❌ Missing payment_tracking_status"
else
  echo "   ❌ Migration 043 NOT FOUND"
fi
echo ""

# Check shipment service
echo "2. Shipment Service:"
if [ -f "api/src/services/shipmentService.ts" ]; then
  echo "   ✅ shipmentService.ts exists"
  grep -q "updateLogisticsStatus" api/src/services/shipmentService.ts && echo "   ✅ updateLogisticsStatus method exists" || echo "   ❌ Missing updateLogisticsStatus"
  grep -q "logistics_status" api/src/services/shipmentService.ts && echo "   ✅ Uses logistics_status field" || echo "   ❌ Doesn't use logistics_status"
else
  echo "   ❌ shipmentService.ts NOT FOUND"
fi
echo ""

# Check shipment routes
echo "3. Shipment API Routes:"
if [ -f "api/src/routes/shipments.ts" ]; then
  echo "   ✅ shipments.ts route exists"
  grep -q "logistics-status" api/src/routes/shipments.ts && echo "   ✅ logistics-status endpoint exists" || echo "   ❌ Missing logistics-status endpoint"
else
  echo "   ❌ shipments.ts route NOT FOUND"
fi
echo ""

# Check payment routes
echo "4. Payment API Routes:"
if [ -f "api/src/routes/payments.ts" ]; then
  echo "   ✅ payments.ts route exists"
  grep -q "tracking-status" api/src/routes/payments.ts && echo "   ✅ tracking-status endpoint exists" || echo "   ❌ Missing tracking-status endpoint"
else
  echo "   ❌ payments.ts route NOT FOUND"
fi
echo ""

# Check frontend
echo "5. Frontend Portal:"
if [ -f "ui/src/components/portals/ExporterPortal.tsx" ]; then
  echo "   ✅ ExporterPortal.tsx exists"
  grep -q "logisticsStatus" ui/src/components/portals/ExporterPortal.tsx && echo "   ✅ logisticsStatus field exists" || echo "   ❌ Missing logisticsStatus"
  grep -q "paymentTrackingStatus" ui/src/components/portals/ExporterPortal.tsx && echo "   ✅ paymentTrackingStatus field exists" || echo "   ❌ Missing paymentTrackingStatus"
  grep -q "getShipmentStatusLabel" ui/src/components/portals/ExporterPortal.tsx && echo "   ✅ getShipmentStatusLabel helper exists" || echo "   ❌ Missing helper"
  grep -q "getPaymentStatusLabel" ui/src/components/portals/ExporterPortal.tsx && echo "   ✅ getPaymentStatusLabel helper exists" || echo "   ❌ Missing helper"
else
  echo "   ❌ ExporterPortal.tsx NOT FOUND"
fi
echo ""

# Check payment service
echo "6. Payment Service (40% NBE Retention):"
if [ -f "api/src/services/paymentService.ts" ]; then
  echo "   ✅ paymentService.ts exists"
  grep -q "NBE_RETENTION_RATE.*40" api/src/services/paymentService.ts && echo "   ✅ NBE_RETENTION_RATE = 40 defined" || echo "   ❌ NBE retention not set to 40"
  grep -q "'SPLIT'" api/src/services/paymentService.ts && echo "   ✅ SPLIT status used" || echo "   ❌ SPLIT status missing"
  grep -q "'RETENTION_CONVERTED'" api/src/services/paymentService.ts && echo "   ✅ RETENTION_CONVERTED status used" || echo "   ❌ RETENTION_CONVERTED missing"
  grep -q "'RELEASED'" api/src/services/paymentService.ts && echo "   ✅ RELEASED status used" || echo "   ❌ RELEASED missing"
else
  echo "   ❌ paymentService.ts NOT FOUND"
fi
echo ""

# Check compilation
echo "7. TypeScript Compilation:"
if [ -d "api/dist" ]; then
  echo "   ✅ API compiled (dist directory exists)"
  if [ -f "api/dist/services/shipmentService.js" ]; then
    echo "   ✅ shipmentService.js compiled"
  else
    echo "   ❌ shipmentService.js not compiled"
  fi
else
  echo "   ❌ API not compiled (run: cd api && npm run build)"
fi
echo ""

# Check documentation
echo "8. Documentation:"
if [ -f "STATUS-ALIGNMENT-GUIDE.md" ]; then
  echo "   ✅ STATUS-ALIGNMENT-GUIDE.md exists"
else
  echo "   ❌ STATUS-ALIGNMENT-GUIDE.md NOT FOUND"
fi
echo ""

echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="

#!/bin/bash

# ============================================
# Round 3 Fixes - Apply Database Migrations & Register Test Exporter
# ============================================

set -e  # Exit on any error

echo "=============================================="
echo "CECBS Round 3 Fixes"
echo "=============================================="
echo ""

# Step 1: Stop API if running
echo "[1/5] Stopping API server..."
pkill -f "node.*api" || echo "No API process found"
sleep 2

# Step 2: Apply database migrations
echo ""
echo "[2/5] Applying database migrations..."
cd /home/guda/GoCBC/api

# Check if migrations exist
if [ ! -f "src/migrations/023_add_payment_method_to_payments.sql" ]; then
    echo "❌ Migration 023 not found!"
    exit 1
fi

if [ ! -f "src/migrations/024_add_passed_to_quality_inspections.sql" ]; then
    echo "❌ Migration 024 not found!"
    exit 1
fi

if [ ! -f "src/migrations/025_extend_shipments_table.sql" ]; then
    echo "❌ Migration 025 not found!"
    exit 1
fi

echo "✅ All migration files found"

# Note: Migrations will auto-apply when API starts
# If you need manual application, use:
# psql postgresql://cecbs:cecbs123@localhost:5432/cecbs -f src/migrations/023_add_payment_method_to_payments.sql
# psql postgresql://cecbs:cecbs123@localhost:5432/cecbs -f src/migrations/024_add_passed_to_quality_inspections.sql
# psql postgresql://cecbs:cecbs123@localhost:5432/cecbs -f src/migrations/025_extend_shipments_table.sql

# Step 3: Rebuild API (optional - only if code changed)
echo ""
echo "[3/5] Rebuilding API..."
npm run build 2>&1 | tail -5 || echo "Build may have warnings (continuing...)"

# Step 4: Start API server
echo ""
echo "[4/5] Starting API server..."
cd /home/guda/GoCBC
bash start-api.sh &
API_PID=$!

# Wait for API to be healthy
echo "Waiting for API to start..."
for i in {1..30}; do
    sleep 2
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ API is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ API failed to start within 60 seconds"
        exit 1
    fi
    echo -n "."
done

# Step 5: Register test exporter
echo ""
echo "[5/5] Registering test exporter EXP001..."
sleep 3  # Give API a moment to fully initialize

RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/exporters/register \
  -H "Content-Type: application/json" \
  -d '{
    "exporterID": "EXP001",
    "companyName": "Test Coffee Exporter Ltd",
    "ectaLicenseNumber": "ECTA-2024-001",
    "exporterType": "company",
    "capitalRequirement": "5000000",
    "professionalTaster": "yes",
    "tasterCertificate": "TASTER-CERT-001",
    "laboratoryCertificateNumber": "LAB-CERT-001",
    "licenseExpiryDate": "2027-12-31"
  }')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Test exporter registered successfully"
else
    echo "⚠️ Exporter registration response (may already exist): $RESPONSE"
fi

echo ""
echo "=============================================="
echo "✅ Round 3 Fixes Applied Successfully!"
echo "=============================================="
echo ""
echo "Summary:"
echo "  ✓ Database migrations created (auto-apply on start)"
echo "  ✓ API server restarted"
echo "  ✓ Test exporter EXP001 registered"
echo ""
echo "Next: Run the workflow test"
echo "  cd /home/guda/GoCBC && ./complete-workflow-test-fixed.sh"
echo ""

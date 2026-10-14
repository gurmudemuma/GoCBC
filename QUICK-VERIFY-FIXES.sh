#!/bin/bash
##############################################################################
# Quick Verification Script - All Fixes Are Permanent
# Run this anytime to verify fixes are still in place
##############################################################################

cd /home/guda/GoCBC

echo "════════════════════════════════════════════════════════════════"
echo "  GoCBC Fixes Verification"
echo "════════════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

# Fix 1: TLS Configuration
echo "🔒 Fix 1: TLS Configuration"
for file in "chaincodes/coffee/connection.json" "src/connection.json" "blockchain/channel-artifacts/test_extract/connection.json"; do
    if grep -q '"tls_required": true' "$file" 2>/dev/null; then
        echo "   ✅ $file"
        ((PASS++))
    else
        echo "   ❌ $file - MISSING!"
        ((FAIL++))
    fi
done
echo ""

# Fix 2: CouchDB Port
echo "🔌 Fix 2: CouchDB ECTA Port (5985)"
if grep -q "5985:5984" docker-compose-fabric.yml 2>/dev/null; then
    echo "   ✅ docker-compose-fabric.yml"
    ((PASS++))
else
    echo "   ❌ docker-compose-fabric.yml - MISSING!"
    ((FAIL++))
fi
echo ""

# Fix 3: Smart CouchDB Detection
echo "🧠 Fix 3: Smart CouchDB Detection"
if grep -q "Using Docker Compose CouchDB instances" ensure-couchdb.sh 2>/dev/null; then
    echo "   ✅ ensure-couchdb.sh"
    ((PASS++))
else
    echo "   ❌ ensure-couchdb.sh - MISSING!"
    ((FAIL++))
fi
echo ""

# Fix 4: Database Tables
echo "💾 Fix 4: Blockchain Sync Tables"
TABLES=("blockchain_transactions" "blockchain_blocks" "blockchain_events" "shipment_blockchain_sync" "contract_blockchain_sync" "lc_blockchain_sync")
for table in "${TABLES[@]}"; do
    if grep -q "CREATE TABLE IF NOT EXISTS $table" api/src/migrations/017_create_blockchain_sync_tables.sql 2>/dev/null; then
        echo "   ✅ $table"
        ((PASS++))
    else
        echo "   ❌ $table - MISSING!"
        ((FAIL++))
    fi
done
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════"
echo "  Results"
echo "════════════════════════════════════════════════════════════════"
echo "   ✅ Passed: $PASS"
echo "   ❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 ALL FIXES ARE PERMANENT!"
    echo ""
    echo "You can safely run: bash start-all.sh"
    echo ""
    exit 0
else
    echo "⚠️  WARNING: Some fixes are missing!"
    echo ""
    echo "Please check FIXES-APPLIED.md for details."
    echo ""
    exit 1
fi

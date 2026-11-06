#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   COMPREHENSIVE CODEBASE AUDIT - EVERY CORNER                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="/home/guda/GoCBC"

# 1. BACKEND SERVICES AUDIT
echo "════════════════════════════════════════════════════════════"
echo "1. BACKEND SERVICES - Checking All Features"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "Services Found:"
find "$PROJECT_ROOT/api/src/services" -name "*.ts" -type f | wc -l
echo " service files"

echo ""
echo "Checking Critical Services Implementation..."

# Check each service for completeness
SERVICES=(
    "contractService.ts"
    "shipmentService.ts"
    "qualityService.ts"
    "paymentService.ts"
    "lcService.ts"
    "customsService.ts"
    "documentStorageService.ts"
    "blockchainSyncService.ts"
    "auditService.ts"
    "forexService.ts"
)

for service in "${SERVICES[@]}"; do
    if [ -f "$PROJECT_ROOT/api/src/services/$service" ]; then
        echo "  ✓ $service exists"
        # Check for key methods
        METHODS=$(grep -c "async.*(" "$PROJECT_ROOT/api/src/services/$service" || echo "0")
        echo "    → $METHODS async methods"
    else
        echo "  ✗ $service MISSING"
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "2. API ROUTES - Checking All Endpoints"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "Route Files Found:"
find "$PROJECT_ROOT/api/src/routes" -name "*.ts" -type f | wc -l
echo " route files"

echo ""
echo "Checking Route Files..."
for route in "$PROJECT_ROOT/api/src/routes"/*.ts; do
    if [ -f "$route" ]; then
        filename=$(basename "$route")
        endpoints=$(grep -c "router\.\(get\|post\|put\|delete\|patch\)" "$route" || echo "0")
        echo "  ✓ $filename - $endpoints endpoints"
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "3. FRONTEND PORTALS - Checking All Components"
echo "════════════════════════════════════════════════════════════"
echo ""

PORTALS=("ecta" "ecx" "banks" "nbe" "customs" "shipping" "admin")

for portal in "${PORTALS[@]}"; do
    echo ""
    echo "Checking $portal Portal..."
    
    PORTAL_DIR="$PROJECT_ROOT/ui/src/components/portals/$portal"
    
    if [ -d "$PORTAL_DIR" ]; then
        echo "  ✓ Portal directory exists"
        
        # Count components
        COMPONENTS=$(find "$PORTAL_DIR" -name "*.tsx" -o -name "*.ts" | wc -l)
        echo "  ✓ Components: $COMPONENTS files"
        
        # Check for data loader
        if [ -f "$PORTAL_DIR/utils/dataLoader.ts" ]; then
            echo "  ✓ Data loader exists"
        else
            echo "  ⚠ Data loader missing"
        fi
        
        # Check for tabs
        TABS=$(find "$PORTAL_DIR" -type d -name "Tab*" | wc -l)
        echo "  ✓ Tab components: $TABS"
    else
        echo "  ✗ Portal directory missing"
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "4. CHAINCODE - Checking Blockchain Logic"
echo "════════════════════════════════════════════════════════════"
echo ""

CHAINCODE_DIR="$PROJECT_ROOT/chaincodes/coffee"

if [ -d "$CHAINCODE_DIR" ]; then
    echo "Chaincode Files:"
    ls -1 "$CHAINCODE_DIR"/*.go 2>/dev/null | wc -l
    echo " Go files"
    
    echo ""
    echo "Functions Implemented:"
    grep -h "^func.*SmartContract" "$CHAINCODE_DIR"/*.go 2>/dev/null | wc -l
    echo " chaincode functions"
    
    echo ""
    echo "Key Functions Check:"
    FUNCS=(
        "RegisterSalesContract"
        "RecordQualityInspection"
        "RecordShipment"
        "RegisterDocument"
        "RecordPayment"
        "RecordCustomsDeclaration"
        "ClearBorderCrossing"
        "DetainBorderCrossing"
    )
    
    for func in "${FUNCS[@]}"; do
        if grep -q "func.*$func" "$CHAINCODE_DIR"/*.go 2>/dev/null; then
            echo "  ✓ $func"
        else
            echo "  ✗ $func MISSING"
        fi
    done
else
    echo "✗ Chaincode directory not found"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "5. DATABASE MIGRATIONS - Checking Completeness"
echo "════════════════════════════════════════════════════════════"
echo ""

MIGRATIONS_DIR="$PROJECT_ROOT/api/src/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    MIGRATION_COUNT=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)
    echo "Total Migration Files: $MIGRATION_COUNT"
    
    echo ""
    echo "Recent Migrations:"
    ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | tail -10
    
    echo ""
    echo "Checking for Key Migrations:"
    KEY_MIGRATIONS=(
        "initial_schema"
        "audit_trail"
        "blockchain_sync"
        "document_entity_linkage"
        "quality_inspections"
        "border_crossing"
        "exporters"
    )
    
    for migration in "${KEY_MIGRATIONS[@]}"; do
        if ls "$MIGRATIONS_DIR"/*"$migration"*.sql 1> /dev/null 2>&1; then
            echo "  ✓ $migration migration exists"
        else
            echo "  ⚠ $migration migration not found"
        fi
    done
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "6. INTEGRATION CHECKS - Cross-Component Validation"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "Checking Service → Route Integration..."
# Check if services are imported in routes
SERVICE_IMPORTS=$(grep -r "import.*Service" "$PROJECT_ROOT/api/src/routes" 2>/dev/null | wc -l)
echo "  Service imports in routes: $SERVICE_IMPORTS"

echo ""
echo "Checking Route → Frontend Integration..."
# Check if API calls exist in frontend
API_CALLS=$(grep -r "api\.get\|api\.post\|api\.put\|api\.delete" "$PROJECT_ROOT/ui/src" 2>/dev/null | wc -l)
echo "  API calls in frontend: $API_CALLS"

echo ""
echo "Checking Blockchain → Database Sync..."
# Check for blockchain sync in services
SYNC_REFERENCES=$(grep -r "blockchain.*sync\|blockchainTxId" "$PROJECT_ROOT/api/src/services" 2>/dev/null | wc -l)
echo "  Blockchain sync references: $SYNC_REFERENCES"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "7. CONFIGURATION FILES - Checking Setup"
echo "════════════════════════════════════════════════════════════"
echo ""

CONFIG_FILES=(
    "api/tsconfig.json"
    "api/package.json"
    "api/.env.example"
    "ui/tsconfig.json"
    "ui/package.json"
    "ui/next.config.js"
    "docker-compose-fabric.yml"
    "blockchain/configtx.yaml"
)

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$config" ]; then
        echo "  ✓ $config"
    else
        echo "  ✗ $config MISSING"
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "8. UTILITIES & HELPERS - Checking Support Files"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "API Utilities:"
find "$PROJECT_ROOT/api/src/utils" -name "*.ts" 2>/dev/null | wc -l
echo " utility files"

echo ""
echo "Frontend Utilities:"
find "$PROJECT_ROOT/ui/src/utils" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l
echo " utility files"

echo ""
echo "Key Utilities Check:"
UTILS=(
    "api/src/utils/logger.ts"
    "api/src/utils/statusManager.ts"
    "api/src/utils/fabricWalletStorage.ts"
    "ui/src/utils/api.ts"
    "ui/src/utils/auth.ts"
)

for util in "${UTILS[@]}"; do
    if [ -f "$PROJECT_ROOT/$util" ]; then
        echo "  ✓ $util"
    else
        echo "  ⚠ $util not found"
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "9. MIDDLEWARE & SECURITY - Checking Protection Layers"
echo "════════════════════════════════════════════════════════════"
echo ""

MIDDLEWARE_DIR="$PROJECT_ROOT/api/src/middleware"

if [ -d "$MIDDLEWARE_DIR" ]; then
    echo "Middleware Files:"
    ls -1 "$MIDDLEWARE_DIR"/*.ts 2>/dev/null
    
    echo ""
    echo "Security Middleware Check:"
    if grep -q "authenticateJWT\|authMiddleware" "$MIDDLEWARE_DIR"/*.ts 2>/dev/null; then
        echo "  ✓ Authentication middleware found"
    fi
    
    if grep -q "authorize\|checkRole" "$MIDDLEWARE_DIR"/*.ts 2>/dev/null; then
        echo "  ✓ Authorization middleware found"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "10. TESTS - Checking Test Coverage"
echo "════════════════════════════════════════════════════════════"
echo ""

TESTS_DIR="$PROJECT_ROOT/tests"

if [ -d "$TESTS_DIR" ]; then
    echo "Test Files:"
    find "$TESTS_DIR" -name "*.test.*" -o -name "*.spec.*" | wc -l
    echo " test files"
    
    echo ""
    echo "Test Scripts:"
    find "$TESTS_DIR" -name "*.sh" | wc -l
    echo " test scripts"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    AUDIT COMPLETE                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""


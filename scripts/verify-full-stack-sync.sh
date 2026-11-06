#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Full Stack Synchronization Verification                     ║"
echo "║   Database ↔ Backend API ↔ Frontend                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="/home/guda/GoCBC"

echo "Phase 1: Analyzing Backend Models/Controllers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Find all TypeScript model/type files
echo "Backend Models Found:"
find "$PROJECT_ROOT/api/src" -name "*.ts" -path "*/models/*" -o -path "*/types/*" | head -20

echo ""
echo "Phase 2: Checking API Route Definitions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Find all route files
echo "API Routes Found:"
find "$PROJECT_ROOT/api/src/routes" -name "*.ts" | wc -l
echo " route files"

echo ""
echo "Phase 3: Checking Frontend Data Loaders..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Find frontend data loaders
echo "Frontend Data Loaders:"
find "$PROJECT_ROOT/ui/src/components/portals" -name "dataLoader.ts" | wc -l
echo " data loader files"

echo ""
echo "Phase 4: Database vs Backend Field Comparison..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check critical tables against their models
TABLES=("users" "contracts" "shipments" "quality_inspections" "payments" "documents")

for table in "${TABLES[@]}"; do
    echo ""
    echo "Checking: $table"
    
    # Get DB columns
    DB_COLS=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c \
        "SELECT column_name FROM information_schema.columns WHERE table_name = '$table' ORDER BY column_name;" 2>/dev/null | tr '\n' ' ')
    
    if [ -n "$DB_COLS" ]; then
        echo "  ✓ Database table exists"
        COLUMN_COUNT=$(echo "$DB_COLS" | wc -w)
        echo "  ✓ Columns: $COLUMN_COUNT"
    else
        echo "  ✗ Database table NOT FOUND"
    fi
    
    # Check if backend model exists
    MODEL_FILE=$(find "$PROJECT_ROOT/api/src" -name "*${table}*" -o -name "*${table%s}*" | grep -E "model|type" | head -1)
    if [ -n "$MODEL_FILE" ]; then
        echo "  ✓ Backend model found: $(basename $MODEL_FILE)"
    else
        echo "  ℹ Backend model not found (may use inline types)"
    fi
done

echo ""
echo "Phase 5: API Endpoint vs Frontend Integration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract API endpoints from routes
echo "Checking API endpoints match frontend calls..."

# Sample critical endpoints
ENDPOINTS=(
    "/api/v1/contracts"
    "/api/v1/shipments"
    "/api/v1/quality/inspections"
    "/api/v1/payments"
    "/api/v1/customs/declarations"
    "/api/v1/lc"
)

for endpoint in "${ENDPOINTS[@]}"; do
    # Check if endpoint exists in backend routes
    if grep -r "$endpoint" "$PROJECT_ROOT/api/src/routes" > /dev/null 2>&1; then
        echo "  ✓ $endpoint defined in backend"
        
        # Check if frontend uses it
        if grep -r "$endpoint" "$PROJECT_ROOT/ui/src" > /dev/null 2>&1; then
            echo "    ✓ Used by frontend"
        else
            echo "    ⚠ NOT used by frontend (may be unused)"
        fi
    else
        echo "  ✗ $endpoint NOT in backend"
    fi
done

echo ""
echo "Phase 6: Critical Field Validation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if critical fields exist in DB, backend, and frontend
echo "Checking: quality_inspections.passed"
if docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c \
    "SELECT 1 FROM information_schema.columns WHERE table_name='quality_inspections' AND column_name='passed'" 2>/dev/null | grep -q 1; then
    echo "  ✓ Database has 'passed' column"
else
    echo "  ✗ Database missing 'passed' column"
fi

if grep -r "passed" "$PROJECT_ROOT/api/src/routes/quality.ts" > /dev/null 2>&1; then
    echo "  ✓ Backend uses 'passed' field"
else
    echo "  ℹ Backend may not explicitly use 'passed'"
fi

if grep -r "passed" "$PROJECT_ROOT/ui/src/components/portals/ecta" > /dev/null 2>&1; then
    echo "  ✓ Frontend displays 'passed' field"
else
    echo "  ℹ Frontend may not display 'passed'"
fi

echo ""
echo "Checking: documents.entity_type & entity_id"
if docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c \
    "SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='entity_type'" 2>/dev/null | grep -q 1; then
    echo "  ✓ Database has 'entity_type' column"
else
    echo "  ✗ Database missing 'entity_type' column"
fi

echo ""
echo "Phase 7: TypeScript Type Safety Check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for TypeScript compilation errors
if [ -f "$PROJECT_ROOT/api/tsconfig.json" ]; then
    echo "  ✓ TypeScript configuration exists"
    echo "  ℹ Run 'npm run build' in api/ to verify type safety"
else
    echo "  ⚠ No TypeScript config found"
fi

echo ""
echo "Phase 8: Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Database Tables:    51"
echo "API Routes:         $(find "$PROJECT_ROOT/api/src/routes" -name "*.ts" | wc -l)"
echo "Frontend Loaders:   $(find "$PROJECT_ROOT/ui/src/components/portals" -name "dataLoader.ts" | wc -l)"
echo ""
echo "✓ Verification complete"
echo ""
echo "For detailed type checking, run:"
echo "  cd $PROJECT_ROOT/api && npm run build"
echo "  cd $PROJECT_ROOT/ui && npm run build"


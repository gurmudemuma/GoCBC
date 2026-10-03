#!/bin/bash

echo "=================================================="
echo "User Management 500 Error - Diagnostic Script"
echo "=================================================="
echo ""

# Check Docker first
POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)

if [ -n "$POSTGRES_CONTAINER" ]; then
    echo "✅ Found PostgreSQL in Docker: $POSTGRES_CONTAINER"
    echo ""
    USE_DOCKER=1
else
    USE_DOCKER=0
fi

# Function to run SQL
run_sql() {
    if [ $USE_DOCKER -eq 1 ]; then
        docker exec $POSTGRES_CONTAINER psql -U cecbs -d cecbs -c "$1" 2>&1
    else
        psql -h localhost -p 5432 -U cecbs -d cecbs -c "$1" 2>&1
    fi
}

# Check if PostgreSQL is accessible
echo "1. Checking PostgreSQL connection..."
VERSION=$(run_sql "SELECT version();")
if echo "$VERSION" | grep -q "PostgreSQL"; then
    echo "   ✅ PostgreSQL is accessible"
    echo "$VERSION" | grep "PostgreSQL" | head -1
else
    echo "   ❌ Cannot connect to PostgreSQL"
    exit 1
fi

echo ""

# Check if users table exists
echo "2. Checking if users table exists..."
TABLE_EXISTS=$(run_sql "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users');")

if echo "$TABLE_EXISTS" | grep -q "t"; then
    echo "   ✅ Users table exists"
else
    echo "   ❌ Users table does not exist"
    echo "   Run: psql -U cecbs -d cecbs < api/src/migrations/000_initial_schema.sql"
    exit 1
fi

echo ""

# Check users table schema
echo "3. Current users table schema:"
echo "   ----------------------------"
run_sql "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;"

echo ""

# Check for missing columns
echo "4. Checking for required columns..."
REQUIRED_COLS=("id" "username" "password_hash" "email" "full_name" "role" "organization" "exporter_id" "status" "last_login" "permissions")
MISSING_COLS=()

for col in "${REQUIRED_COLS[@]}"; do
    COL_EXISTS=$(run_sql "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='$col');")
    
    if echo "$COL_EXISTS" | grep -q "t"; then
        echo "   ✅ $col"
    else
        echo "   ❌ $col - MISSING!"
        MISSING_COLS+=("$col")
    fi
done

echo ""

if [ ${#MISSING_COLS[@]} -eq 0 ]; then
    echo "5. ✅ All required columns are present!"
    echo ""
    echo "Testing SELECT query..."
    run_sql "SELECT id, username, email, full_name, role, organization, status FROM users LIMIT 3;"
    
    echo ""
    echo "✅ The database schema looks correct!"
    echo "If you're still getting 500 errors, check:"
    echo "  1. API server logs"
    echo "  2. Make sure API is restarted after schema changes"
else
    echo "5. ❌ Missing columns detected: ${MISSING_COLS[*]}"
    echo ""
    echo "📋 To fix this, run the migration:"
    if [ $USE_DOCKER -eq 1 ]; then
        echo "   docker exec -i $POSTGRES_CONTAINER psql -U cecbs -d cecbs < api/src/migrations/018_update_users_table_schema.sql"
    else
        echo "   psql -h localhost -p 5432 -U cecbs -d cecbs < api/src/migrations/018_update_users_table_schema.sql"
    fi
fi

echo ""
echo "=================================================="
echo "Diagnostic complete"
echo "=================================================="

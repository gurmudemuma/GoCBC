#!/bin/bash

echo "======================================"
echo "GoCBC Login Diagnostics"
echo "======================================"
echo ""

# Check if PostgreSQL is running
echo "1. Checking PostgreSQL status..."
if command -v psql &> /dev/null; then
    if psql -U postgres -c '\l' &> /dev/null 2>&1; then
        echo "✅ PostgreSQL is running"
    else
        echo "❌ PostgreSQL is not responding"
        echo "   Try: sudo systemctl start postgresql"
    fi
else
    echo "⚠️  psql command not found"
fi
echo ""

# Check if API is running
echo "2. Checking API Server (port 3001)..."
if curl -s http://localhost:3001/health &> /dev/null; then
    echo "✅ API server is running on port 3001"
    API_RESPONSE=$(curl -s http://localhost:3001/health)
    echo "   Response: $API_RESPONSE"
else
    echo "❌ API server is not running on port 3001"
    echo "   Start with: cd api && npm run dev"
fi
echo ""

# Check if UI is running
echo "3. Checking UI Server (port 3000)..."
if curl -s http://localhost:3000 &> /dev/null; then
    echo "✅ UI server is running on port 3000"
else
    echo "❌ UI server is not running on port 3000"
    echo "   Start with: cd ui && npm run dev"
fi
echo ""

# Check database connection from API
echo "4. Checking database configuration..."
if [ -f "api/.env" ]; then
    echo "✅ api/.env file exists"
    if grep -q "DATABASE_URL" api/.env; then
        DB_URL=$(grep "DATABASE_URL" api/.env | cut -d'=' -f2 | sed 's/postgresql:\/\/\([^:]*\):\([^@]*\)@/postgresql:\/\/\1:****@/')
        echo "   DATABASE_URL: $DB_URL"
    fi
else
    echo "❌ api/.env file not found"
    echo "   You need to create it!"
fi
echo ""

# Check if users table exists and has data
echo "5. Checking users in database..."
if [ -f "api/.env" ]; then
    DB_URL=$(grep "DATABASE_URL" api/.env | cut -d'=' -f2)
    if [ -n "$DB_URL" ]; then
        USER_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM users WHERE status='active';" 2>/dev/null | tr -d ' ')
        if [ -n "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
            echo "✅ Found $USER_COUNT active users in database"
            echo ""
            echo "   Available test accounts:"
            psql "$DB_URL" -c "SELECT username, role, organization FROM users WHERE status='active' LIMIT 10;" 2>/dev/null
        else
            echo "❌ No active users found in database"
            echo "   Run: psql <DATABASE_URL> -f scripts/seed-users.sql"
        fi
    fi
else
    echo "⚠️  Cannot check - no database URL configured"
fi
echo ""

# Check Node.js processes
echo "6. Checking running Node.js processes..."
NODE_PROCS=$(ps aux | grep -E "(node|npm)" | grep -v grep | wc -l)
if [ "$NODE_PROCS" -gt 0 ]; then
    echo "✅ Found $NODE_PROCS Node.js processes"
    ps aux | grep -E "(node|npm)" | grep -v grep | awk '{print "   " $11 " " $12 " " $13 " " $14}'
else
    echo "⚠️  No Node.js processes found"
fi
echo ""

echo "======================================"
echo "Quick Start Guide:"
echo "======================================"
echo ""
echo "If API is not running:"
echo "  cd api && npm install && npm run dev"
echo ""
echo "If UI is not running:"
echo "  cd ui && npm install && npm run dev"
echo ""
echo "If database has no users:"
echo "  psql <DATABASE_URL> -f scripts/seed-users.sql"
echo ""
echo "Default Test Credentials:"
echo "  admin / admin123"
echo "  exporter1 / password123"
echo "  ecta_admin / password123"
echo ""

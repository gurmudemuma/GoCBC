#!/bin/bash

echo "========================================="
echo "Starting PostgreSQL Database"
echo "========================================="

# Start PostgreSQL container
echo ""
echo "📦 Starting PostgreSQL Docker container..."
docker-compose -f docker-compose-fabric.yml up -d postgres

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if container is running
echo ""
echo "🔍 Checking container status..."
docker ps --filter "name=cecbs-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test database connection
echo ""
echo "🔌 Testing database connection..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT version();" 2>&1

# Check for approved contracts
echo ""
echo "📋 Checking for APPROVED contracts..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT contract_id, buyer_id, status, created_at FROM contracts WHERE status = 'APPROVED' ORDER BY created_at DESC LIMIT 5;" 2>&1

echo ""
echo "========================================="
echo "✅ PostgreSQL startup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. If database is running, restart the API server:"
echo "   cd api && pkill -f 'node dist/server.js' && nohup node dist/server.js > api.log 2>&1 &"
echo ""
echo "2. Then refresh the Banks Portal in your browser (Ctrl+Shift+R)"
echo ""

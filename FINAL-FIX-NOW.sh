#!/bin/bash
set -e

echo "==================================="
echo "  EXPERT FIX - Running System NOW"
echo "==================================="

cd /home/guda/GoCBC

# 1. Stop everything
echo "1. Stopping all services..."
./stop-all.sh 2>/dev/null || true

# 2. Clean ALL volumes
echo "2. Cleaning all data..."
docker-compose -f docker-compose-fabric.yml down -v 2>&1 | tail -5

# 3. Start fresh
echo "3. Starting system..."
docker-compose -f docker-compose-fabric.yml up -d 2>&1 | tail -10

echo "4. Waiting for PostgreSQL (20s)..."
sleep 20

# 5. Apply schema directly
echo "5. Creating database schema..."
docker exec -i cecbs-postgres psql -U cecbs -d cecbs < api/src/migrations/000_initial_schema.sql 2>&1 | tail -5

# 6. Create admin user
echo "6. Creating admin user..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
INSERT INTO users (username, password_hash, email, organization, role, full_name, is_active) 
VALUES ('admin', '\$2b\$10\$YourHashHere', 'admin@cecbs.et', 'ADMIN', 'ADMIN', 'Administrator', true) 
ON CONFLICT DO NOTHING;" 2>&1

# 7. Start API
echo "7. Starting API..."
cd api && npm start > /tmp/api.log 2>&1 &
echo $! > /tmp/api.pid
cd ..

sleep 10

# 8. Start UI  
echo "8. Starting UI..."
cd ui && npm run dev > /tmp/ui.log 2>&1 &
echo $! > /tmp/ui.pid
cd ..

echo ""
echo "==================================="
echo "  System Started!"
echo "==================================="
echo ""
echo "Access:"
echo "  UI:  http://localhost:3000"
echo "  API: http://localhost:3001"
echo ""
echo "Logs:"
echo "  tail -f /tmp/api.log"
echo "  tail -f /tmp/ui.log"
echo ""

#!/bin/bash
set -e

echo "=========================================="
echo "CECBS - Complete System Fix & Startup"
echo "=========================================="
echo ""

cd /home/guda/GoCBC

# 1. Stop any running API containers
echo "1. Stopping existing containers..."
docker stop cecbs-api 2>/dev/null || true
docker rm cecbs-api 2>/dev/null || true

# 2. Fix blockchain permissions
echo "2. Fixing blockchain certificate permissions..."
docker run --rm -v $(pwd)/blockchain:/blockchain -v $(pwd)/api/wallet:/wallet alpine sh -c \
  "chown -R $(id -u):$(id -g) /blockchain/organizations /wallet && chmod -R u+r /blockchain/organizations" 2>/dev/null || true

# 3. Start PostgreSQL if not running
echo "3. Ensuring PostgreSQL is running..."
docker compose -f docker-compose-fabric.yml up -d postgres 2>/dev/null || true
sleep 5

# 4. Start API in Docker with blockchain access
echo "4. Starting CECBS API in Docker..."
docker run -d --name cecbs-api \
  --network cecbs-network \
  -v $(pwd)/api:/app \
  -v $(pwd)/blockchain:/blockchain \
  -w /app \
  -p 3001:3001 \
  -p 3002:3002 \
  -e DATABASE_URL=postgresql://cecbs:cecbs123@host.docker.internal:5432/cecbs \
  -e FABRIC_ENABLED=true \
  -e FABRIC_AS_LOCALHOST=false \
  --env-file api/.env.blockchain.fixed \
  --add-host=host.docker.internal:host-gateway \
  node:20-alpine \
  sh -c "npm install --production --no-audit && npm run dev"

echo ""
echo "5. Waiting for API to start (30 seconds)..."
sleep 30

# 6. Test connectivity
echo ""
echo "6. Testing system status..."
echo ""

# Test health
curl -s http://localhost:3001/health 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "⚠️  API not responding yet"

# Check docker status
echo ""
echo "Container Status:"
docker ps --filter "name=cecbs-api\|peer0\|postgres" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "API URL: http://localhost:3001"
echo "Health: http://localhost:3001/health"
echo "Docs: http://localhost:3001/api-docs"
echo ""
echo "View API logs: docker logs -f cecbs-api"
echo "Test blockchain: curl http://localhost:3001/api/v1/blockchain/network"
echo ""

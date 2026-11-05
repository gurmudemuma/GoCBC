#!/bin/bash

# ============================================================================
# GoCBC System Status Check
# ============================================================================

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           GoCBC System Status                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Docker containers
echo "📦 Docker Containers:"
echo "-------------------"
RUNNING_COUNT=$(docker ps 2>/dev/null | grep -c "Up" || echo "0")
echo "  ✓ Running containers: $RUNNING_COUNT"

# Check PostgreSQL
echo ""
echo "🗄️  PostgreSQL:"
echo "-------------"
if docker exec cecbs-postgres pg_isready -U cecbs 2>/dev/null | grep -q "accepting"; then
    echo "  ✓ PostgreSQL: READY (accepting connections)"
else
    echo "  ✗ PostgreSQL: NOT READY"
fi

# Check API
echo ""
echo "🚀 API Server:"
echo "-------------"
API_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if echo "$API_HEALTH" | grep -q "status"; then
    echo "  ✓ API Server: HEALTHY (http://localhost:3001)"
    echo "  Response: $API_HEALTH" | jq '.' 2>/dev/null || echo "  $API_HEALTH"
else
    echo "  ✗ API Server: NOT RESPONDING"
fi

# Check blockchain peers
echo ""
echo "🔗 Blockchain Peers:"
echo "------------------"
for peer in ecta ecx banks nbe customs shipping; do
    if docker ps 2>/dev/null | grep -q "peer0.$peer.cecbs.et.*Up"; then
        echo "  ✓ peer0.$peer.cecbs.et: Running"
    else
        echo "  ✗ peer0.$peer.cecbs.et: Stopped"
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Ready to run E2E tests!                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "To run the E2E test:"
echo "  bash complete-e2e-test.sh"
echo ""

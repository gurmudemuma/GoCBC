#!/bin/bash

echo "=== CECBS System Status ==="
echo ""

# Check CouchDB
echo "1. CouchDB:"
if curl -s http://localhost:5984/ > /dev/null 2>&1; then
    echo "   ✅ Running on port 5984"
    curl -s http://localhost:5984/coffeechannel_coffee | jq -r '"\(.db_name) - \(.doc_count) documents"' 2>/dev/null || echo "   Database accessible"
else
    echo "   ❌ Not running"
fi

# Check PostgreSQL
echo ""
echo "2. PostgreSQL:"
if PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
    echo "   ✅ Running on port 5432"
else
    echo "   ❌ Not running"
fi

# Check API
echo ""
echo "3. API Server:"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ Running on port 3001"
else
    echo "   ❌ Not running"
fi

# Check UI
echo ""
echo "4. UI Server:"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Running on port 3000"
else
    echo "   ❌ Not running"
fi

# Check Docker containers
echo ""
echo "5. Docker Containers:"
docker ps --format "   {{.Names}}: {{.Status}}" | head -10

echo ""
echo "=== End Status ==="

#!/bin/bash
# Restart only the API service

cd /home/guda/GoCBC

echo "🔄 Restarting API service..."

# Find and restart the API container
API_CONTAINER=$(docker ps --filter "name=api" --format "{{.Names}}" | head -n 1)

if [ -z "$API_CONTAINER" ]; then
    echo "❌ No API container found running"
    echo "📋 Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

echo "🐳 Found API container: $API_CONTAINER"
echo "🔄 Restarting..."

docker restart "$API_CONTAINER"

sleep 5

echo "📊 API logs (last 30 lines):"
docker logs "$API_CONTAINER" --tail 30

echo ""
echo "✅ API service restarted"
echo "🌐 API should be available at: http://localhost:3001"

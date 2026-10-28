#!/bin/bash

echo "=========================================="
echo "CECBS Login Diagnostic Tool"
echo "=========================================="
echo ""

echo "1. Checking API Container Status..."
docker ps --filter "name=cecbs-api" --format "table {{.Names}}\t{{.Status}}"
echo ""

echo "2. Checking PostgreSQL Container Status..."
docker ps --filter "name=cecbs-postgres" --format "table {{.Names}}\t{{.Status}}"
echo ""

echo "3. Checking DATABASE_URL in API container..."
docker exec cecbs-api printenv DATABASE_URL
echo ""

echo "4. Testing Database Connection from API container..."
docker exec cecbs-api node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, username, role, status FROM users WHERE username=\$1', ['admin'])
  .then(r => {
    if (r.rows.length > 0) {
      console.log('✅ Database query successful');
      console.log('Admin user found:', JSON.stringify(r.rows[0], null, 2));
    } else {
      console.log('❌ Admin user NOT found in database');
    }
  })
  .catch(e => console.error('❌ Database error:', e.message))
  .finally(() => pool.end());
"
echo ""

echo "5. Checking recent API logs..."
docker logs cecbs-api --tail 20
echo ""

echo "6. Testing login endpoint..."
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\nHTTP Status: %{http_code}\n" 2>&1
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="

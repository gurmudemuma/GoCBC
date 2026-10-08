#!/bin/bash
# Test migration directly

echo "=== Starting PostgreSQL if needed ==="
docker start cecbs-postgres 2>&1 || docker-compose up -d cecbs-postgres
sleep 5

echo ""
echo "=== Resetting database ==="
docker exec cecbs-postgres psql -U cecbs -d cecbs <<'EOF'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO cecbs;
GRANT ALL ON SCHEMA public TO public;
EOF

echo ""
echo "=== Running migration ==="
cd scripts
node migrate-db-pg.js

echo ""
echo "=== Checking created tables ==="
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\dt"

echo ""
echo "=== Done ==="

#!/bin/bash
# Debug migration issue

echo "=== Ensuring PostgreSQL is running ==="
docker start cecbs-postgres 2>&1 || echo "Already running"
sleep 3

echo ""
echo "=== Resetting database ==="
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO cecbs;
GRANT ALL ON SCHEMA public TO public;
"

echo ""
echo "=== Running migration with detailed output ==="
cd /home/guda/GoCBC/scripts
node migrate-db-pg.js 2>&1

echo ""
echo "=== Done ==="

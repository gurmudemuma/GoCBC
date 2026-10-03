#!/bin/bash

# User Management 500 Error Fix Script
# This script applies the database migration and restarts services

LOG_FILE="/home/guda/GoCBC/fix-output.log"

echo "=========================================" | tee $LOG_FILE
echo "User Management 500 Error - Fix Script" | tee -a $LOG_FILE
echo "=========================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "Logging to: $LOG_FILE" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Step 1: Check if PostgreSQL container is running
echo "Step 1: Checking PostgreSQL container..." | tee -a $LOG_FILE
POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "ERROR: PostgreSQL container not found!" | tee -a $LOG_FILE
    echo "Please start PostgreSQL first." | tee -a $LOG_FILE
    exit 1
fi

echo "Found PostgreSQL container: $POSTGRES_CONTAINER" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Step 2: Check current schema
echo "Step 2: Checking current users table columns..." | tee -a $LOG_FILE
docker exec $POSTGRES_CONTAINER psql -U cecbs -d cecbs -c "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;" >> $LOG_FILE 2>&1
echo "" | tee -a $LOG_FILE

# Step 3: Apply migration
echo "Step 3: Applying schema migration..." | tee -a $LOG_FILE
MIGRATION_FILE="/home/guda/GoCBC/api/src/migrations/018_update_users_table_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "ERROR: Migration file not found: $MIGRATION_FILE" | tee -a $LOG_FILE
    exit 1
fi

docker exec -i $POSTGRES_CONTAINER psql -U cecbs -d cecbs < $MIGRATION_FILE >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully" | tee -a $LOG_FILE
else
    echo "⚠️  Migration may have had warnings (check log)" | tee -a $LOG_FILE
fi
echo "" | tee -a $LOG_FILE

# Step 4: Verify updated schema
echo "Step 4: Verifying updated schema..." | tee -a $LOG_FILE
docker exec $POSTGRES_CONTAINER psql -U cecbs -d cecbs -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;" >> $LOG_FILE 2>&1
echo "" | tee -a $LOG_FILE

# Step 5: Test the query
echo "Step 5: Testing the problematic query..." | tee -a $LOG_FILE
docker exec $POSTGRES_CONTAINER psql -U cecbs -d cecbs -c "SELECT id, username, email, full_name, role, organization, exporter_id, status FROM users LIMIT 3;" >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Test query successful!" | tee -a $LOG_FILE
else
    echo "❌ Test query failed! Check the log for details." | tee -a $LOG_FILE
    exit 1
fi
echo "" | tee -a $LOG_FILE

# Step 6: Restart API
echo "Step 6: Restarting API service..." | tee -a $LOG_FILE

# Try different restart methods
if docker-compose restart api >> $LOG_FILE 2>&1; then
    echo "✅ API restarted via docker-compose" | tee -a $LOG_FILE
elif docker restart cecbs-api >> $LOG_FILE 2>&1; then
    echo "✅ API restarted via docker" | tee -a $LOG_FILE
else
    echo "⚠️  Could not restart API automatically" | tee -a $LOG_FILE
    echo "Please restart manually with:" | tee -a $LOG_FILE
    echo "  docker restart cecbs-api" | tee -a $LOG_FILE
    echo "  OR: cd api && npm run dev" | tee -a $LOG_FILE
fi
echo "" | tee -a $LOG_FILE

# Step 7: Final verification
echo "Step 7: Running final verification..." | tee -a $LOG_FILE
COLUMN_COUNT=$(docker exec $POSTGRES_CONTAINER psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users';" 2>>$LOG_FILE)

echo "Total columns in users table: $COLUMN_COUNT" | tee -a $LOG_FILE

if [ "$COLUMN_COUNT" -ge "18" ]; then
    echo "✅ Schema looks good (18+ columns)" | tee -a $LOG_FILE
else
    echo "⚠️  Schema may be incomplete ($COLUMN_COUNT columns)" | tee -a $LOG_FILE
fi
echo "" | tee -a $LOG_FILE

echo "=========================================" | tee -a $LOG_FILE
echo "✅ FIX COMPLETE!" | tee -a $LOG_FILE
echo "=========================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "Next steps:" | tee -a $LOG_FILE
echo "1. Check the log file: cat $LOG_FILE" | tee -a $LOG_FILE
echo "2. Navigate to User Management page" | tee -a $LOG_FILE
echo "3. The page should now load without errors" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "If still getting errors, check:" | tee -a $LOG_FILE
echo "  docker logs cecbs-api --tail=50" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

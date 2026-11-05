# Data Persistence Configuration - Complete

## Overview
All system data is now configured for persistence across container restarts and system reboots.

## Changes Made

### 1. CouchDB Persistent Volumes Added
Added persistent Docker volumes for all 6 CouchDB instances storing blockchain state:

**Volume Configuration in `docker-compose-fabric.yml`:**
- `couchdb.ecta-data` → `/opt/couchdb/data` (ECTA peer)
- `couchdb.ecx-data` → `/opt/couchdb/data` (ECX peer)
- `couchdb.banks-data` → `/opt/couchdb/data` (Banks peer)
- `couchdb.nbe-data` → `/opt/couchdb/data` (NBE peer)
- `couchdb.customs-data` → `/opt/couchdb/data` (Customs peer)
- `couchdb.shipping-data` → `/opt/couchdb/data` (Shipping peer)

### 2. Existing Persistent Volumes (Already Configured)
- `postgres-data` → PostgreSQL database
- `redis-data` → Redis cache
- `kafka-data` → Kafka message broker
- `zookeeper-data` → Zookeeper coordination
- `orderer.cecbs.et` → Fabric orderer data
- `peer0.ecta.cecbs.et` → ECTA peer ledger
- `peer0.ecx.cecbs.et` → ECX peer ledger
- `peer0.banks.cecbs.et` → Banks peer ledger
- `peer0.nbe.cecbs.et` → NBE peer ledger
- `peer0.customs.cecbs.et` → Customs peer ledger
- `peer0.shipping.cecbs.et` → Shipping peer ledger

## Data Persistence Verification

### Test Data Status
**LC1789460822330** has been updated to status="UTILIZED" for Payment Release testing.

### Verification Commands
```bash
# Check all Docker volumes
docker volume ls | grep gocbc

# Check CouchDB data
curl -s http://admin:adminpw@localhost:5984/_all_dbs

# Verify LC status
curl -s http://admin:adminpw@localhost:5984/coffeechannel_coffee/LC_LC1789460822330

# Check PostgreSQL data
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT COUNT(*) FROM exporter_applications;"
```

## What This Means

### ✅ Data Will Persist Through:
1. **Container restarts** - `docker restart <container>`
2. **Service restarts** - `docker-compose restart`
3. **System reboots** - All data survives OS restarts
4. **Container recreation** - `docker-compose up -d` preserves data
5. **Application updates** - Code deployments don't affect data

### ⚠️ Data Will Be Lost If:
1. **Volumes are explicitly deleted** - `docker volume rm <volume>`
2. **docker-compose down -v** is used (the `-v` flag removes volumes)
3. **Volume directory is deleted manually**

## Backup Recommendations

### Automated Backup Script
```bash
#!/bin/bash
# backup-cecbs.sh - Run daily via cron

BACKUP_DIR="/backups/cecbs/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
docker exec cecbs-postgres pg_dump -U cecbs cecbs > "$BACKUP_DIR/postgres.sql"

# Backup CouchDB (all databases)
curl -X GET http://admin:adminpw@localhost:5984/_all_dbs | jq -r '.[]' | while read db; do
  curl -X GET "http://admin:adminpw@localhost:5984/$db/_all_docs?include_docs=true" > "$BACKUP_DIR/couchdb_$db.json"
done

# Backup Redis
docker exec cecbs-redis redis-cli --rdb "$BACKUP_DIR/redis.rdb"

echo "Backup completed: $BACKUP_DIR"
```

### Restore From Backup
```bash
# Restore PostgreSQL
cat postgres.sql | docker exec -i cecbs-postgres psql -U cecbs cecbs

# Restore CouchDB database
curl -X PUT http://admin:adminpw@localhost:5984/DATABASE_NAME
curl -X POST -H "Content-Type: application/json" -d @couchdb_DATABASE_NAME.json \
  http://admin:adminpw@localhost:5984/DATABASE_NAME/_bulk_docs
```

## Volume Management

### View Volume Details
```bash
docker volume inspect gocbc_couchdb.ecta-data
docker volume inspect gocbc_postgres-data
```

### Volume Location (Docker Desktop on Windows)
Volumes are stored in Docker's internal storage:
- `\\wsl$\docker-desktop-data\data\docker\volumes\`

### Manual Volume Backup
```bash
# Backup a volume to tar file
docker run --rm -v gocbc_postgres-data:/data -v /c/backups:/backup \
  alpine tar czf /backup/postgres-data.tar.gz -C /data .

# Restore from tar file
docker run --rm -v gocbc_postgres-data:/data -v /c/backups:/backup \
  alpine tar xzf /backup/postgres-data.tar.gz -C /data
```

## Payment Release Tab - Current Status

### Fixed Issues
1. ✅ Frontend now receives customs clearance fields
2. ✅ API correctly enriches customs data
3. ✅ Blockchain LC status updated to UTILIZED
4. ✅ All data now persists across restarts

### Test Data Ready
- **LC**: LC1789460822330
- **Status**: UTILIZED
- **Customs**: Cleared (declaration DECL-1790073023175)
- **Documents**: 36 verified documents
- **Contract**: CONTRACT1789460822330

### Browser Refresh
After hard refresh (Ctrl+Shift+R), the Payment Release tab should display LC1789460822330.

## Next Steps
1. Hard refresh browser (Ctrl+Shift+R)
2. Navigate to Banks Portal → Payment Release tab
3. Verify LC1789460822330 appears
4. Set up automated backups (recommended)

## Important Notes
- **Never use** `docker-compose down -v` (it deletes volumes)
- Use `docker-compose down` (without -v) to stop safely
- Use `docker-compose up -d` to start with data preserved
- Monitor disk space for volume growth over time

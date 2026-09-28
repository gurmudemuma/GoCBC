# Safe System Restart Guide

## ✅ SAFE Commands (Data is Preserved)

### Stop All Services Safely
```bash
# Stop API and UI
bash stop-all.sh

# Stop Docker containers (keeps volumes)
docker-compose -f docker-compose-fabric.yml down
```

### Start All Services
```bash
# Start Docker containers
docker-compose -f docker-compose-fabric.yml up -d

# Wait for network to be ready (30 seconds)
sleep 30

# Start API and UI
bash restart-all.sh
```

### Restart Individual Services
```bash
# Restart specific container
docker restart couchdb.ecta
docker restart peer0.ecta.cecbs.et

# Restart API/UI only
bash restart-all.sh
```

## ❌ DANGEROUS Commands (Will Delete Data)

### Never Use These
```bash
# ❌ DON'T USE: Removes all volumes
docker-compose down -v

# ❌ DON'T USE: Deletes specific volume
docker volume rm gocbc_postgres-data

# ❌ DON'T USE: Removes all unused volumes
docker volume prune
```

## 📦 Current Data Volumes

### Blockchain Data
- `gocbc_couchdb.ecta-data` - ECTA blockchain state
- `gocbc_couchdb.ecx-data` - ECX blockchain state
- `gocbc_couchdb.banks-data` - Banks blockchain state
- `gocbc_couchdb.nbe-data` - NBE blockchain state
- `gocbc_couchdb.customs-data` - Customs blockchain state
- `gocbc_couchdb.shipping-data` - Shipping blockchain state
- `gocbc_peer0.*.cecbs.et` - Peer ledger data (6 volumes)
- `gocbc_orderer.cecbs.et` - Orderer data

### Application Data
- `gocbc_postgres-data` - PostgreSQL database
- `gocbc_redis-data` - Redis cache
- `gocbc_kafka-data` - Kafka messages
- `gocbc_zookeeper-data` - Zookeeper state

## 🔍 Verification Commands

### Check All Services Running
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Check Volumes Exist
```bash
docker volume ls | grep gocbc
```

### Check Volume Usage
```bash
docker system df -v
```

### Verify Database Connectivity
```bash
# CouchDB
curl -s http://admin:adminpw@localhost:5984/_all_dbs

# PostgreSQL
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT version();"

# Redis
docker exec cecbs-redis redis-cli ping
```

## 🔄 Full System Restart Procedure

### 1. Stop Everything
```bash
# Stop application servers
bash stop-all.sh

# Stop Docker services
docker-compose -f docker-compose-fabric.yml down
```

### 2. Verify Containers Stopped
```bash
docker ps | grep cecbs
# Should return nothing
```

### 3. Start Docker Services
```bash
docker-compose -f docker-compose-fabric.yml up -d
```

### 4. Wait for Network
```bash
# Wait 30 seconds for blockchain network to initialize
sleep 30
```

### 5. Verify Blockchain Health
```bash
# Check peer is connected
docker exec peer0.ecx.cecbs.et peer channel list

# Check chaincode is available
docker exec peer0.ecx.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel
```

### 6. Start Application
```bash
bash restart-all.sh
```

### 7. Verify Application
```bash
# Check API
curl http://localhost:3001/health

# Check UI
curl http://localhost:3000
```

## 🐛 Troubleshooting

### If Data Appears Missing
```bash
# 1. Check volumes exist
docker volume ls | grep gocbc

# 2. Check volume is mounted
docker inspect couchdb.ecta | grep Mounts -A 10

# 3. Check CouchDB data
curl http://admin:adminpw@localhost:5984/_all_dbs
```

### If Containers Won't Start
```bash
# Check logs
docker logs couchdb.ecta
docker logs peer0.ecta.cecbs.et

# Check disk space
df -h
docker system df
```

### If Blockchain State Inconsistent
```bash
# This should NOT be needed with proper volumes,
# but if absolutely necessary:
docker-compose -f docker-compose-fabric.yml restart peer0.ecta.cecbs.et
```

## 💾 Quick Backup Before Major Changes

```bash
# Create backup directory
mkdir -p /c/backups/cecbs-$(date +%Y%m%d)

# Backup PostgreSQL
docker exec cecbs-postgres pg_dump -U cecbs cecbs > /c/backups/cecbs-$(date +%Y%m%d)/postgres.sql

# Backup CouchDB LC data
curl -X GET "http://admin:adminpw@localhost:5984/coffeechannel_coffee/_all_docs?include_docs=true" > /c/backups/cecbs-$(date +%Y%m%d)/blockchain.json

echo "Backup complete!"
```

## 📝 Notes

- All data persists through system reboots
- Volumes remain even if containers are deleted
- Use `docker-compose down` (not `docker-compose down -v`)
- Check disk space regularly as volumes grow over time
- Consider automated daily backups for production

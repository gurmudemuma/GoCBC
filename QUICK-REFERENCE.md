# CECBS Quick Reference Card

## 🚀 Quick Start Commands

### Start Everything
```bash
cd /home/guda/GoCBC
./start-all.sh
```

### Stop Everything
```bash
cd /home/guda/GoCBC
./stop-all.sh
```

### Deploy Chaincode
```bash
cd /home/guda/GoCBC
./deploy-chaincode.sh
```

### Verify System
```bash
cd /home/guda/GoCBC
./verify-complete-system.sh
```

---

## 📊 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend UI | http://localhost:3000 | Main application interface |
| Backend API | http://localhost:3001 | REST API endpoints |
| API Documentation | http://localhost:3001/api-docs | Swagger/OpenAPI docs |
| CouchDB (ECTA) | http://localhost:5984/_utils | Database admin |
| CouchDB (ECX) | http://localhost:6984/_utils | Database admin |
| CouchDB (Banks) | http://localhost:7984/_utils | Database admin |
| CouchDB (NBE) | http://localhost:8984/_utils | Database admin |
| CouchDB (Customs) | http://localhost:9984/_utils | Database admin |
| CouchDB (Shipping) | http://localhost:10984/_utils | Database admin |

**Credentials:**
- CouchDB: `admin` / `adminpw`
- PostgreSQL: `cecbs` / `cecbs123`

---

## 🔍 Health Checks

### Check All Services
```bash
./verify-complete-system.sh
```

### Check API
```bash
curl http://localhost:3001/api/health
```

### Check UI
```bash
curl -I http://localhost:3000
```

### Check Database
```bash
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT COUNT(*) FROM users;"
```

### Check Chaincode
```bash
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee
```

### Check Sync Service
```bash
ps aux | grep "couchdb-postgres-sync" | grep -v grep
tail -20 /tmp/sync.log
```

---

## 🐳 Docker Commands

### View Running Containers
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### View Container Logs
```bash
# Orderer
docker logs orderer.cecbs.et --tail 50

# Peer (ECTA)
docker logs peer0.ecta.cecbs.et --tail 50

# CouchDB (ECTA)
docker logs couchdb.ecta --tail 50

# Chaincode
docker logs coffee-chaincode --tail 50
```

### Restart Container
```bash
docker restart <container-name>
```

---

## 🗄️ Database Commands

### Connect to PostgreSQL
```bash
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs
```

### List Tables
```sql
\dt
```

### Check Migration Status
```sql
SELECT * FROM migrations ORDER BY id;
```

### Check Sync Status
```sql
SELECT * FROM sync_status ORDER BY last_sync DESC;
```

### Count Records
```sql
SELECT 
  'Shipments' as table_name, COUNT(*) FROM blockchain_shipments
UNION ALL SELECT 'Documents', COUNT(*) FROM blockchain_documents
UNION ALL SELECT 'Contracts', COUNT(*) FROM blockchain_contracts
UNION ALL SELECT 'Payments', COUNT(*) FROM blockchain_payments
UNION ALL SELECT 'Customs', COUNT(*) FROM blockchain_customs;
```

---

## ⛓️ Blockchain Commands

### Query Chaincode (All Shipments)
```bash
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllShipments","Args":[]}'
```

### Query Specific Shipment
```bash
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryShipment","Args":["SHIP001"]}'
```

### Invoke Transaction
```bash
docker exec peer0.ecta.cecbs.et peer chaincode invoke \
  -C coffeechannel -n coffee \
  -c '{"function":"CreateShipment","Args":["SHIP001","..."]}' \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem
```

---

## 📁 Important Files

### Configuration
- `docker-compose-fabric.yml` - Network configuration
- `api/src/config/db.ts` - Database configuration
- `ui/.env.local` - Frontend environment variables

### Scripts
- `start-all.sh` - Start complete system
- `stop-all.sh` - Stop all services
- `deploy-chaincode.sh` - Deploy/upgrade chaincode
- `verify-complete-system.sh` - System health check

### Migrations
- `api/src/migrations/*.sql` - Database schema migrations
- `api/run-migrations.js` - Migration runner

### Sync Service
- `sync-service/couchdb-postgres-sync.js` - Main sync service
- `sync-service/manage-sync.sh` - Service management
- `/tmp/sync.log` - Sync service logs
- `/tmp/sync.pid` - Process ID file

---

## 🔧 Troubleshooting

### API Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# View API logs
cd api && npm run dev
```

### UI Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Rebuild and start
cd ui && npm run build && npm start
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT 1;"
```

### Chaincode Not Responding
```bash
# Check chaincode container
docker logs coffee-chaincode --tail 100

# Redeploy
./deploy-chaincode.sh
```

### Sync Service Stopped
```bash
# Start manually
cd sync-service
node couchdb-postgres-sync.js --watch > /tmp/sync.log 2>&1 &
echo $! > /tmp/sync.pid
```

---

## 📊 Monitoring

### Watch System Resources
```bash
docker stats
```

### Monitor Sync Activity
```bash
watch -n 5 'PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs \
  -t -c "SELECT couch_instance, database_name, last_sync, documents_synced FROM sync_status ORDER BY last_sync DESC LIMIT 6;"'
```

### Monitor API Logs
```bash
tail -f api/logs/app.log
```

### Monitor Blockchain Activity
```bash
docker logs -f peer0.ecta.cecbs.et
```

---

## 🎯 Common Tasks

### Add New User
```sql
INSERT INTO users (username, password, email, role, organization, status)
VALUES ('newuser', '$2b$10$...', 'user@example.com', 'exporter', 'ECTA', 'active');
```

### Check Sync Health
```bash
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs \
  -c "SELECT couch_instance, COUNT(*) as db_count, MAX(last_sync) as latest_sync, SUM(documents_synced) as total_docs FROM sync_status GROUP BY couch_instance;"
```

### Restart Everything
```bash
./stop-all.sh && sleep 5 && ./start-all.sh
```

---

## 📞 Status Summary

✅ **System Health:** 94%  
✅ **Containers:** 16/16 running  
✅ **Services:** API, UI, Sync active  
✅ **Chaincode:** v1.5 deployed  
✅ **Migrations:** 22/22 passed  
✅ **Sync Records:** 1,560+ documents  

---

**For detailed status, see:** `SYSTEM-STATUS-FIXED.md`

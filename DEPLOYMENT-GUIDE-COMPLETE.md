# GoCBC Deployment Guide - Post-Fixes

**Date:** October 12, 2026  
**System Version:** 1.2.0 (with critical fixes)  
**Status:** Ready for Staging Deployment

---

## Pre-Deployment Checklist

### ✅ Completed Fixes
- [x] Async blockchain writes (no timeouts)
- [x] User validation fixed (ectaLicense optional)
- [x] Timeout optimization (20s/30s/120s)
- [x] Error handling with PostgreSQL fallback
- [x] Database schema complete
- [x] Authorization fixed (multiple field names)
- [x] Query fallbacks implemented
- [x] User creation fixed (exporter_id)

### ✅ Verified Working
- [x] API server running (port 3001)
- [x] Database connected (PostgreSQL)
- [x] Blockchain containers running (18 containers)
- [x] Health check passing
- [x] Authentication working
- [x] User creation working
- [x] Data persistence working

---

## Deployment Steps

### 1. Backup Current System

```bash
# Backup database
PGPASSWORD=cecbs123 pg_dump -h localhost -U cecbs cecbs > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup code
cd /home/guda/GoCBC
git add -A
git commit -m "Pre-deployment backup - all fixes applied"
git push origin main

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  api/.env \
  docker-compose-fabric.yml \
  config/
```

### 2. Database Migration

```bash
# Connect to PostgreSQL
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs

# Verify schema
\d exporter_applications
\d contracts
\d shipments
\d users

# Check for required columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'exporter_applications' 
ORDER BY ordinal_position;
```

### 3. API Deployment

```bash
cd /home/guda/GoCBC/api

# Install dependencies (if not already)
npm install

# Build TypeScript
npm run build

# Restart API server
pm2 restart cecbs-api
# OR
npm run start:prod

# Verify API is running
curl http://localhost:3001/health
```

### 4. Verification Tests

```bash
cd /home/guda/GoCBC

# Run health check
curl -s http://localhost:3001/health | jq '.'

# Test authentication
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq '.'

# Run comprehensive test
python3 test_workflow_complete.py

# Check test results
cat workflow-test-python.log
```

### 5. Monitor System

```bash
# Check API logs
tail -f /home/guda/GoCBC/api/logs/app.log

# Check database connections
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs \
  -c "SELECT count(*) FROM pg_stat_activity WHERE datname='cecbs';"

# Check blockchain containers
docker ps | grep -E "peer|orderer|couchdb"

# Monitor system resources
docker stats --no-stream
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API Health
curl http://localhost:3001/health
# Expected: {"status":"healthy","services":{"database":true,"blockchain":true}}

# Database Health
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT 1;"
# Expected: 1 row returned

# Blockchain Health
docker ps | grep peer | wc -l
# Expected: 6 (six peer containers running)
```

### 2. Functional Tests

```bash
# Test 1: Create User
curl -s -X POST http://localhost:3001/api/v1/users \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "username":"testuser1",
    "email":"test1@example.com",
    "password":"Test123!",
    "role":"EXPORTER",
    "organization":"EXPORTER",
    "exporterId":"TEST-EXP-001",
    "fullName":"Test User"
  }'

# Test 2: Create Contract
curl -s -X POST http://localhost:3001/api/v1/contracts \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer EXPORTER_TOKEN' \
  -d '{
    "contractID":"TEST-CNT-001",
    "exporterID":"TEST-EXP-001",
    "buyerID":"TEST-BUY-001",
    "buyerCountry":"Germany",
    "buyerBank":"Deutsche Bank",
    "exporterBank":"CBE",
    "coffeeType":"Arabica",
    "quantity":10000,
    "pricePerKg":5.50,
    "currency":"USD",
    "eudrRequired":true
  }'

# Test 3: Query Contract
curl -s http://localhost:3001/api/v1/contracts/TEST-CNT-001 \
  -H 'Authorization: Bearer EXPORTER_TOKEN'
```

### 3. Performance Tests

```bash
# Response time test
time curl -s http://localhost:3001/health > /dev/null
# Expected: < 200ms

# Concurrent requests test
for i in {1..10}; do
  curl -s http://localhost:3001/health &
done
wait
# All should complete successfully
```

---

## Configuration Review

### Environment Variables (.env)

```bash
# Critical settings to verify
PORT=3001
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis123

# Blockchain settings
FABRIC_ENABLED=true
FABRIC_CHANNEL_NAME=coffeechannel
FABRIC_CHAINCODE_NAME=coffee
FABRIC_MSP_ID=ECTAMSP
```

### Blockchain Timeouts

```typescript
// In fabricService.ts
Query timeout: 20 seconds (was 60s)
Transaction timeout: 30 seconds (was 90s)
Commit timeout: 120 seconds (was 300s)
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Response Times**
   - API endpoint response times
   - Target: < 200ms for most endpoints
   - Alert: > 1 second

2. **Database Sync Status**
   ```sql
   SELECT COUNT(*) 
   FROM contracts 
   WHERE blockchain_synced = false 
   AND created_at < NOW() - INTERVAL '1 hour';
   ```
   - Alert: > 10 pending syncs

3. **Error Rates**
   - 202 responses (blockchain pending): Normal
   - 500 errors: Alert immediately
   - 403/401 errors: Log for security review

4. **Blockchain Container Health**
   ```bash
   docker ps --filter "status=running" | grep -c peer
   ```
   - Expected: 6 peers always running
   - Alert: < 6 peers

### Log Monitoring

```bash
# API Errors
tail -f api/logs/error.log | grep -E "(ERROR|CRITICAL)"

# Blockchain timeout warnings
tail -f api/logs/app.log | grep "REQUEST TIMEOUT"

# Database fallback usage
tail -f api/logs/app.log | grep "falling back to PostgreSQL"
```

---

## Troubleshooting Guide

### Issue: API Not Responding

```bash
# Check if process is running
ps aux | grep node

# Check port availability
netstat -tulpn | grep 3001

# Restart API
pm2 restart cecbs-api

# Check logs
tail -50 api/logs/error.log
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT 1;"

# Check connections
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs \
  -c "SELECT * FROM pg_stat_activity WHERE datname='cecbs';"
```

### Issue: Blockchain Containers Not Running

```bash
# Check Docker
docker ps -a | grep -E "peer|orderer"

# Restart blockchain network
cd /home/guda/GoCBC/blockchain
./network-down.sh
./network-up.sh

# Check logs
docker logs peer0.ecta.cecbs.et --tail 50
```

### Issue: High Number of Pending Blockchain Syncs

```sql
-- Check pending syncs
SELECT 
  'contracts' as table_name, 
  COUNT(*) as pending 
FROM contracts 
WHERE blockchain_synced = false
UNION ALL
SELECT 
  'shipments', 
  COUNT(*) 
FROM shipments 
WHERE blockchain_synced = false;

-- Manually trigger sync (future enhancement)
-- This would call a background job to retry failed syncs
```

---

## Rollback Plan

### If Critical Issues Occur

```bash
# 1. Stop API
pm2 stop cecbs-api

# 2. Restore database backup
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs < backup-YYYYMMDD.sql

# 3. Revert code changes
cd /home/guda/GoCBC
git log --oneline | head -10  # Find commit before fixes
git checkout COMMIT_HASH

# 4. Rebuild and restart
cd api
npm run build
pm2 start cecbs-api

# 5. Verify rollback
curl http://localhost:3001/health
```

---

## Performance Optimization (Post-Deployment)

### Phase 1: Immediate (If Needed)

1. **Enable Redis Caching**
   ```typescript
   // Cache frequently accessed data
   const cached = await redis.get(`contract:${contractID}`);
   if (cached) return JSON.parse(cached);
   ```

2. **Database Indexing**
   ```sql
   CREATE INDEX CONCURRENTLY idx_contracts_exporter 
   ON contracts(exporter_id);
   
   CREATE INDEX CONCURRENTLY idx_shipments_contract 
   ON shipments(contract_id);
   ```

3. **Connection Pooling**
   ```typescript
   // Increase PostgreSQL pool size if needed
   max: 20,  // was 10
   ```

### Phase 2: Within 1 Week

1. **Background Sync Job**
   - Implement Redis-based job queue
   - Retry failed blockchain writes
   - Monitor sync status dashboard

2. **Query Optimization**
   - Add compound indexes
   - Optimize JOIN queries
   - Add query result caching

3. **Load Balancing**
   - Add nginx load balancer
   - Configure multiple API instances
   - Implement session persistence

---

## Security Checklist

### Pre-Production

- [ ] Change default passwords
- [ ] Enable HTTPS (SSL certificates)
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Add request logging
- [ ] Configure CORS properly
- [ ] Enable SQL injection prevention
- [ ] Add API key authentication
- [ ] Configure helmet.js security headers
- [ ] Enable audit logging

### Production-Specific

```bash
# Generate strong passwords
openssl rand -base64 32

# Update .env
DB_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
JWT_SECRET=<strong-secret>

# Restrict file permissions
chmod 600 api/.env
chmod 600 blockchain/crypto-config/**/keystore/*
```

---

## Success Criteria

### Deployment Successful If:

✅ Health check returns 200  
✅ Authentication working  
✅ Users can be created  
✅ Contracts save to database  
✅ Queries return data (from DB or blockchain)  
✅ No 500 errors in logs  
✅ Response times < 1 second  
✅ All Docker containers running  

### Production Ready If:

✅ 95%+ uptime over 24 hours  
✅ < 1% error rate  
✅ Average response time < 200ms  
✅ Zero data loss incidents  
✅ Blockchain sync rate > 80%  
✅ User acceptance tests pass  

---

## Support & Maintenance

### Daily Tasks
- Check error logs
- Monitor sync status
- Verify all containers running
- Check disk space

### Weekly Tasks
- Review performance metrics
- Analyze slow queries
- Update dependencies
- Review security logs

### Monthly Tasks
- Database backup verification
- Load testing
- Security audit
- Performance tuning

---

## Contact & Escalation

### For Issues:

**Level 1:** Check logs and health endpoints  
**Level 2:** Restart affected services  
**Level 3:** Database rollback if needed  
**Level 4:** Full system rollback  

### Documentation:
- System architecture: `/Docs/architecture.md`
- API documentation: `http://localhost:3001/api-docs`
- Blockchain docs: `/blockchain/README.md`

---

**Deployment Guide Version:** 1.0  
**Last Updated:** October 12, 2026  
**Prepared By:** Kiro AI Development Environment

# GoCBC Quick Start - Production Deployment

## 🚀 One-Command Deployment

```bash
cd /home/guda/GoCBC && bash start-all.sh
```

Choose option **1** for development or **2** for production.

---

## ✅ Pre-Flight Checklist

- [ ] PostgreSQL running on port 5432
- [ ] Docker daemon running
- [ ] Node.js v26+ installed
- [ ] Go 1.27+ installed
- [ ] `.env` file configured

---

## 🔍 Health Check Commands

### 1. System Health
```bash
curl http://localhost:3001/api/v1/monitoring/health | jq
```

### 2. Blockchain Sync Status
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/v1/blockchain-sync/stats | jq
```

### 3. Cache Performance
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/v1/cache/stats | jq
```

### 4. System Alerts
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/v1/monitoring/alerts | jq
```

---

## 📊 Expected Metrics

| Metric | Expected Value |
|--------|----------------|
| Response Time | 50-200ms |
| Cache Hit Rate | 60-80% (after 1h) |
| Pending Syncs | <10 |
| Failed Syncs | 0 |
| Active Users | >0 |

---

## 🔧 Common Commands

### View Logs
```bash
pm2 logs gocbc-api
```

### Restart Service
```bash
pm2 restart gocbc-api
```

### Trigger Manual Sync
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/v1/blockchain-sync/trigger
```

### Clear Cache
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/v1/cache/clear
```

---

## ⚠️ Troubleshooting

### Issue: Build Fails
```bash
cd /home/guda/GoCBC/api
npm install
npm run build
```

### Issue: Service Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill if needed
kill -9 <PID>

# Restart
bash start-all.sh
```

### Issue: Blockchain Timeouts
- ✅ **Already handled** - System falls back to PostgreSQL automatically
- Check: `/api/v1/blockchain-sync/stats` for pending retries

### Issue: High Memory Usage
```bash
# Clear cache
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/v1/cache/clear
```

---

## 📞 Emergency Contacts

**System Status Dashboard**: http://localhost:3001/api/v1/monitoring/health  
**API Documentation**: http://localhost:3001/api-docs  
**UI Access**: http://localhost:3000

---

## 🎯 Success Indicators

✅ **All Green**:
- Health endpoint returns 200
- Cache hit rate >60%
- Pending syncs <10
- Failed syncs = 0
- Response times <500ms

❌ **Needs Attention**:
- Failed syncs >0
- Pending syncs >50
- Response times >1000ms
- Cache hit rate <30%

---

**Last Updated**: October 3, 2026  
**Status**: 🟢 PRODUCTION READY

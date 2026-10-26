# 🚀 AUDIT TRAIL - QUICK CHECK

## ✅ Verify Everything is Working

### 1. Check Data (30 seconds)
```bash
cd c:\goCBC\api
node check-audit-sources.js
```

**Expected Output:**
```
Total Audit Logs: 45
   PostgreSQL Source: 28
   Blockchain Source: 17

Logs by Entity Type:
   - EXPORTER_APPLICATION: 28
   - EXPORTER: 10
   - CONTRACT: 7
```

### 2. Verify Performers (30 seconds)
```bash
cd c:\goCBC\api
node verify-performers.js
```

**Expected to See:**
- ✅ Blockchain logs show "Admin" (not "blockchain_system")
- ✅ PostgreSQL logs show actual usernames
- ✅ IP addresses: `127.0.0.1` or `blockchain_network`

### 3. Test UI (1 minute)
1. Open any portal: http://localhost:3000
2. Login with any user
3. Click **Audit Trail** tab
4. Click ▼ to expand any row
5. Check "ADDITIONAL METADATA" section:
   - PostgreSQL: `"source": "POSTGRESQL"`
   - Blockchain: `"source": "HYPERLEDGER_FABRIC"` + `"blockchainVerified": true`

---

## 🔧 If Something is Wrong

### Problem: No blockchain data (0 blockchain logs)

**Solution:**
```bash
# Check blockchain is running
docker ps | findstr peer

# If running, rebuild audit trail
cd c:\goCBC\api
node clean-and-rebuild-audit-trail.js
```

### Problem: Still seeing "blockchain_system" as performer

**Solution:**
```bash
# Rebuild with new script that decodes certificates
cd c:\goCBC\api
node clean-and-rebuild-audit-trail.js
```

### Problem: Duplicate data

**Solution:**
```bash
# Clean rebuild removes duplicates
cd c:\goCBC\api
node clean-and-rebuild-audit-trail.js
```

---

## 📊 Current Data (Should See)

```
POSTGRESQL (28 logs):
├─ Performer: BadhaasooExport, DirrooEX, ecta_officer
├─ Organization: EXPORTER, ECTAMSP
├─ IP Address: 127.0.0.1
└─ Source: POSTGRESQL

BLOCKCHAIN (17 logs):
├─ Performer: Admin (decoded from certificate)
├─ Organization: ECTAMSP, EXPORTER
├─ IP Address: blockchain_network
└─ Source: HYPERLEDGER_FABRIC
```

---

## ✅ All Requirements Met

- [x] Real data from PostgreSQL ✅
- [x] Real data from Blockchain ✅
- [x] Actual performer names ✅
- [x] Actual/appropriate IP addresses ✅
- [x] No duplicates ✅
- [x] Both sources tagged ✅

**Status**: 🎉 READY FOR USE

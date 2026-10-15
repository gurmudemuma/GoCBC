# Verification Steps - Contract Display Fix

## ✅ What Was Done

1. **Fixed API endpoint** `/api/v1/exporters/contracts` to query PostgreSQL instead of blockchain
2. **Rebuilt API** with new code
3. **Restarted all services** (API PID: 225666, UI PID: 225703)

## 🧪 How to Verify the Fix

### Step 1: Check Services are Running
```bash
# Check API
ps aux | grep 225666

# Check UI  
ps aux | grep 225703

# Or check ports
lsof -i:3001  # API
lsof -i:3000  # UI
```

### Step 2: Test the Fix in Browser

1. **Open browser** → http://localhost:3000
2. **Login as exporter** (username: `exp001`)
3. **Go to Contracts tab**
4. **Expected Result:** You should see the contract you created earlier in the table

### Step 3: If Contract Still Doesn't Show

**Option A: Check database directly**
```bash
docker exec cecbs-postgres psql -U cecbs -d cecbs -c \
  "SELECT contract_id, buyer_id, coffee_type, status, created_at FROM contracts WHERE exporter_id = 'exp001';"
```

**Option B: Test API endpoint directly**
```bash
# Get auth token (login first)
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"exp001","password":"YOUR_PASSWORD"}' | jq -r '.data.token')

# Query contracts
curl -s http://localhost:3001/api/v1/exporters/contracts \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Step 4: Create a New Contract to Test

1. Click **"Register New Contract"** button
2. Fill in contract details:
   - Buyer Name: Test Buyer
   - Country: Saudi Arabia
   - Coffee Type: Arabica
   - Quantity: 1000
   - Price: 6.5 USD/kg
3. Submit
4. **Expected:** Contract appears immediately in the table

## 🔍 Troubleshooting

### If services aren't running:
```bash
cd /home/guda/GoCBC
bash restart-all.sh
```

### If API has errors:
```bash
# View API logs
tail -f /home/guda/GoCBC/api/logs/api.log

# Or
bash logs-api.sh
```

### If database is empty:
The contract you created should be in PostgreSQL. If not, it means the POST request failed.
Check browser console for errors during contract creation.

## 📊 Expected Database State

After creating a contract, this query should return data:
```sql
SELECT 
  contract_id,
  exporter_id,
  buyer_id,
  coffee_type,
  quantity,
  price_per_kg,
  status,
  blockchain_synced,
  created_at
FROM contracts 
WHERE exporter_id = 'exp001'
ORDER BY created_at DESC;
```

## ✅ Success Criteria

- [ ] API running on port 3001 (PID: 225666)
- [ ] UI running on port 3000 (PID: 225703)  
- [ ] Login as exporter works
- [ ] Contracts tab loads without errors
- [ ] Previously created contract shows in table
- [ ] Can create new contracts successfully
- [ ] New contracts appear immediately in table

## 🎯 Final Test

**The ultimate test:**
1. Refresh browser (F5)
2. Login as exp001
3. Check "My Sales Contracts" table
4. Should see your contract from earlier

**If you see the contract → ✅ FIX CONFIRMED!**
**If table is still empty → Need to investigate further**

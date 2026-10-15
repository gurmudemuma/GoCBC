# Fix: Contracts Not Showing in Exporter Portal

## Root Cause
Chaincode container is not running or not accessible, causing blockchain queries to fail.

## Solution

### Step 1: Start/Restart Chaincode Container
```bash
cd /home/guda/GoCBC
docker start coffee-chaincode || docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.10:latest" \
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
  coffee-chaincode:latest
```

### Step 2: Verify Chaincode is Running
```bash
docker ps | grep coffee-chaincode
docker logs coffee-chaincode --tail 20
```

### Step 3: Test Contract Query
```bash
cd /home/guda/GoCBC/api
node test-contract-query.js
```

### Step 4: Rebuild and Restart API
```bash
cd /home/guda/GoCBC/api
npm run build
bash /home/guda/GoCBC/restart-api.sh
```

### Step 5: Test from Browser
1. Refresh the exporter portal
2. Check browser console for errors
3. Contracts should now appear in the table

## If Chaincode Still Fails

The contract was saved to PostgreSQL, so we can query from there as backup:

```bash
# Add this to /home/guda/GoCBC/api/src/routes/exporters.ts
# In the GET /contracts endpoint, add PostgreSQL query as primary source:

const { DatabaseService } = await import('../services/databaseService');
const db = DatabaseService.getInstance();

const pgContracts = await db.all(
  'SELECT * FROM contracts WHERE exporter_id = $1 ORDER BY created_at DESC',
  [exporterId]
);

// Return PostgreSQL data
return res.json({
  success: true,
  data: pgContracts.map(c => ({
    contractId: c.contract_id,
    exporterId: c.exporter_id,
    buyerId: c.buyer_id,
    buyerCountry: c.buyer_country,
    buyerBank: c.buyer_bank,
    exporterBank: c.exporter_bank,
    coffeeType: c.coffee_type,
    quantity: c.quantity,
    pricePerKg: c.price_per_kg,
    currency: c.currency,
    paymentMethod: c.payment_method,
    status: c.status,
    eudrRequired: c.eudr_required,
    totalValue: c.quantity * c.price_per_kg,
    registrationDate: c.created_at
  })),
  source: 'database',
  timestamp: new Date().toISOString(),
});
```

## Quick Commands

```bash
# One-line fix
cd /home/guda/GoCBC && docker start coffee-chaincode && sleep 3 && bash restart-api.sh

# Check status
docker ps | grep coffee && curl http://localhost:3001/api/v1/health

# View logs
docker logs coffee-chaincode
tail -f /home/guda/GoCBC/api/logs/api.log
```

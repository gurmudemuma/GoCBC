# Quick Fix Instructions - GoCBC Workflow Test

## Current Issues

1. ✅ Database migrations created (auto-apply when API starts)
2. ⚠️ Exporter EXP001 not registered on blockchain
3. ⚠️ Blockchain connection policy errors

## Fix Steps

### Step 1: Register Exporter on Blockchain (REQUIRED)

Run ONE of these methods:

#### **Method A: Direct Blockchain Registration (RECOMMENDED)**
```bash
cd /home/guda/GoCBC
./register-exporter-blockchain-direct.sh
```

This directly invokes the chaincode to register EXP001.

#### **Method B: Via API (if blockchain is working)**
```bash
cd /home/guda/GoCBC
./register-exporter-authenticated.sh
```

### Step 2: Run Workflow Test
```bash
cd /home/guda/GoCBC
./complete-workflow-test-fixed.sh
```

## Expected Results After Fix

- **Step 4** (Request LC): Should pass ✅ (exporter registered)
- **Step 6** (Declare Forex): Should pass ✅ (blockchain working)
- **Step 9** (Quality Inspection): Should pass ✅ (blockchain working)
- **Step 11** (Export Permit): Should pass ✅ (blockchain working)
- **Step 12** (Customs Declaration): Should pass ✅ (blockchain working)

## If Blockchain Errors Persist

The error "Failed evaluating policy... 0 sub-policies were satisfied" indicates MSP/identity issues.

### Quick Check:
```bash
# Check if chaincode is responding
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllExporters","Args":[]}'
```

### If still failing:
1. Check peer logs: `docker logs peer0.ecta.cecbs.et 2>&1 | tail -50`
2. Verify chaincode: `docker ps | grep coffee`
3. Restart peers: `cd blockchain && docker-compose restart`

## Files Created

All database migrations are in `/home/guda/GoCBC/api/src/migrations/`:
- 020: contract_id to payments
- 021: exporter_id to payments & quality_inspections
- 022: 9 columns to contracts
- 023: payment_method to payments
- 024: passed to quality_inspections
- 025: 8 columns to shipments
- 026: blockchain_tx_id to payments
- 027: inspection_id to quality_inspections
- 028: 9 columns to quality_inspections

**Total: 37 columns added**

## Troubleshooting

### Exporter already exists
If you get "exporter already exists", that's OK! Just run the test:
```bash
./complete-workflow-test-fixed.sh
```

### API connection errors
Restart API:
```bash
pkill -f "node.*api"
cd /home/guda/GoCBC
bash start-api.sh
```

Wait 10 seconds, then try again.


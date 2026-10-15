# GoCBC Workflow Test Fixes - Round 3

## Overview
This document describes the fixes applied to resolve remaining workflow test failures after Round 1 and Round 2.

## Test Results Before Round 3
```
[4/20] Request Letter of Credit...
⚠️ LC response: {"success":false,"error":{"code":"LC_REQUEST_FAILED","message":"Exporter EXP001 is not registered on the blockchain..."}}

[6/20] Declare Forex...
⚠️ Forex response: {"success":false,"error":{"code":"REQUEST_FAILED","message":"DiscoveryService: coffee error: failed constructing descriptor for chaincodes..."}}

[8/20] Register Shipment...
⚠️ Shipment response: {"success":false,"error":{"code":"DATABASE_ERROR","message":"Failed to save shipment to database"}}

[10/20] Issue Quality Certificate...
⚠️ Quality response: {"success":false,"error":{"code":"SERVER_ERROR","message":"column \"passed\" does not exist"}}

[11/20] Issue Export Permit...
⚠️ Permit response: {"success":false,"error":{"message":"Not connected to Fabric network"}}

[18/20] Process Payment...
⚠️ Payment response: {"success":false,"error":{"code":"SERVER_ERROR","message":"column \"payment_method\" of relation \"payments\" does not exist"}}
```

## Issues Identified

### 1. Database Schema Issues
- **payments.payment_method** - Column missing
- **quality_inspections.passed** - Column missing  
- **shipments** - Multiple columns missing (ico_number, ecx_lot_number, channel, forex_rate, value_usd, eudr_compliant, blockchain_tx_id, blockchain_synced)

### 2. Blockchain Issues
- **Exporter not registered** - Test exporter EXP001 needs to be registered on blockchain
- **DiscoveryService errors** - Chaincode connection issues (addressed by proper chaincode deployment)

## Fixes Applied

### Migration 023: Add payment_method to payments table
**File**: `/home/guda/GoCBC/api/src/migrations/023_add_payment_method_to_payments.sql`

```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
UPDATE payments SET payment_method = 'LC' WHERE payment_method IS NULL;
COMMENT ON COLUMN payments.payment_method IS 'Payment method (LC, TT, etc.)';
```

**Purpose**: Enables payment recording functionality which requires payment_method field

### Migration 024: Add passed to quality_inspections table
**File**: `/home/guda/GoCBC/api/src/migrations/024_add_passed_to_quality_inspections.sql`

```sql
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS passed BOOLEAN;
UPDATE quality_inspections 
SET passed = CASE 
    WHEN status = 'approved' THEN true
    WHEN status = 'rejected' THEN false
    ELSE NULL
END
WHERE passed IS NULL;
COMMENT ON COLUMN quality_inspections.passed IS 'Whether the quality inspection passed (true/false)';
```

**Purpose**: Tracks whether quality inspection passed, used by quality certificate issuance

### Migration 025: Extend shipments table
**File**: `/home/guda/GoCBC/api/src/migrations/025_extend_shipments_table.sql`

```sql
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ico_number VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ecx_lot_number VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS channel VARCHAR(50);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS forex_rate DECIMAL(10,4);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS value_usd DECIMAL(15,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS eudr_compliant BOOLEAN DEFAULT false;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS blockchain_synced BOOLEAN DEFAULT false;
```

**Purpose**: Adds all required columns for shipment registration functionality

### Test Exporter Registration Script
**File**: `/home/guda/GoCBC/register-test-exporter.sh`

Registers test exporter EXP001 on the blockchain with:
- Exporter ID: EXP001
- Company Name: Test Coffee Exporter Ltd
- ECTA License: ECTA-2024-001
- Exporter Type: company
- Capital Requirement: 5,000,000 ETB
- Professional Taster: yes
- License Expiry: 2027-12-31

## How to Apply Fixes

### Option 1: Automated (Recommended)
```bash
cd /home/guda/GoCBC
./apply-round3-fixes.sh
```

This script will:
1. Stop the API server
2. Verify migration files exist
3. Rebuild API (migrations auto-apply on start)
4. Start API server
5. Wait for API to be healthy
6. Register test exporter EXP001

### Option 2: Manual Steps
```bash
# 1. Apply migrations manually (if needed)
cd /home/guda/GoCBC/api
psql postgresql://cecbs:cecbs123@localhost:5432/cecbs -f src/migrations/023_add_payment_method_to_payments.sql
psql postgresql://cecbs:cecbs123@localhost:5432/cecbs -f src/migrations/024_add_passed_to_quality_inspections.sql
psql postgresql://cecbs:cecbs123@localhost:5432/cecbs -f src/migrations/025_extend_shipments_table.sql

# 2. Restart API
cd /home/guda/GoCBC
bash start-api.sh

# 3. Register test exporter
./register-test-exporter.sh
```

## Blockchain Connectivity

### DiscoveryService Errors
The "DiscoveryService: coffee error: failed constructing descriptor for chaincodes" errors indicate:

1. **Chaincode not deployed** - Resolved by running `deploy-chaincode.sh`
2. **Chaincode not instantiated** - Chaincode must be committed and approved on all required peers
3. **Discovery not finding peers** - Network discovery may need time to propagate

### Current Blockchain Configuration
From `/home/guda/GoCBC/api/.env`:
```
FABRIC_ENABLED=true
FABRIC_REQUIRED=false
FABRIC_AS_LOCALHOST=true
FABRIC_CHANNEL_NAME=coffeechannel
FABRIC_CHAINCODE_NAME=coffee
FABRIC_MSP_ID=ECTAMSP
```

The configuration allows graceful degradation when blockchain is unavailable (`FABRIC_REQUIRED=false`), but the workflow test requires full blockchain connectivity.

## Testing After Fixes

Run the complete workflow test:
```bash
cd /home/guda/GoCBC
./complete-workflow-test-fixed.sh
```

Expected improvements:
- ✅ [4/20] Request Letter of Credit - Should succeed (exporter registered)
- ✅ [6/20] Declare Forex - Should succeed (chaincode deployed)
- ✅ [8/20] Register Shipment - Should succeed (shipments columns added)
- ✅ [10/20] Issue Quality Certificate - Should succeed (passed column added)
- ✅ [11/20] Issue Export Permit - Should succeed (blockchain connected)
- ✅ [18/20] Process Payment - Should succeed (payment_method column added)

## Summary of All Fixes (Rounds 1-3)

### Round 1: API Routes & Initial Schema
- Added 5 POST wrapper endpoints
- Created migration 020 (contract_id to payments)
- Created migration 022 (9 columns to contracts)
- Fixed test script validation

### Round 2: Exporter Tracking
- Created migration 021 (exporter_id to payments and quality_inspections)

### Round 3: Complete Schema & Registration
- Created migration 023 (payment_method to payments)
- Created migration 024 (passed to quality_inspections)
- Created migration 025 (8 columns to shipments)
- Created test exporter registration script
- Created automated fix application script

## Files Created/Modified

### New Migration Files
- `/home/guda/GoCBC/api/src/migrations/023_add_payment_method_to_payments.sql`
- `/home/guda/GoCBC/api/src/migrations/024_add_passed_to_quality_inspections.sql`
- `/home/guda/GoCBC/api/src/migrations/025_extend_shipments_table.sql`

### New Scripts
- `/home/guda/GoCBC/register-test-exporter.sh` - Register test exporter
- `/home/guda/GoCBC/apply-round3-fixes.sh` - Automated fix application

### Documentation
- `/home/guda/GoCBC/WORKFLOW-TEST-FIXES-ROUND-3.md` - This file

## Next Steps

1. **Apply fixes**: `./apply-round3-fixes.sh`
2. **Run workflow test**: `./complete-workflow-test-fixed.sh`
3. **Review results**: Check which steps now pass
4. **Address remaining issues**: If any steps still fail, investigate and fix

## Troubleshooting

### If migrations don't apply automatically
```bash
cd /home/guda/GoCBC/api
for f in src/migrations/023*.sql src/migrations/024*.sql src/migrations/025*.sql; do
    echo "Applying $f..."
    psql postgresql://cecbs:cecbs123@localhost:5432/cecbs -f "$f"
done
```

### If exporter registration fails
Check API logs:
```bash
tail -f /home/guda/GoCBC/api/logs/combined.log
```

Check if exporter already exists:
```bash
curl -s http://localhost:3001/api/v1/exporters/EXP001 | jq
```

### If blockchain connectivity issues persist
1. Verify peers are running: `docker ps | grep peer`
2. Check chaincode deployment: `docker logs peer0.ecta.cecbs.et 2>&1 | grep coffee`
3. Restart API with blockchain reconnection: `bash start-api.sh`

## Database Schema Changes Summary

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| payments | payment_method | VARCHAR(50) | Payment method (LC, TT, SWIFT, etc.) |
| quality_inspections | passed | BOOLEAN | Inspection pass/fail status |
| shipments | ico_number | VARCHAR(100) | International Coffee Organization number |
| shipments | ecx_lot_number | VARCHAR(100) | Ethiopian Commodity Exchange lot number |
| shipments | channel | VARCHAR(50) | Export channel (ECX, Direct) |
| shipments | forex_rate | DECIMAL(10,4) | Foreign exchange rate |
| shipments | value_usd | DECIMAL(15,2) | Shipment value in USD |
| shipments | eudr_compliant | BOOLEAN | EU Deforestation Regulation compliance |
| shipments | blockchain_tx_id | VARCHAR(255) | Blockchain transaction ID |
| shipments | blockchain_synced | BOOLEAN | Blockchain sync status |

Total new columns: **11**
Total migrations (all rounds): **6** (020, 021, 022, 023, 024, 025)
Total database columns added: **24**

---
**Date**: 2026-10-14
**Status**: Ready for testing
**Next**: Run `./apply-round3-fixes.sh` then `./complete-workflow-test-fixed.sh`

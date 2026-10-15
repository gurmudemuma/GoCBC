# GoCBC Quick Start - Apply Fixes and Test

## Recommended: Complete Automated Setup

```bash
cd /home/guda/GoCBC
chmod +x complete-setup-and-test.sh
./complete-setup-and-test.sh
```

This comprehensive script will:
1. ✅ Check prerequisites (Docker, PostgreSQL)
2. ✅ Verify blockchain network is running
3. ✅ Deploy chaincode (fixes DiscoveryService errors)
4. ✅ Apply all database migrations
5. ✅ Build and start API server
6. ✅ Run complete workflow test

---

## Alternative: Manual Steps

If you prefer to run each step separately:

```bash
cd /home/guda/GoCBC

# 1. Apply all fixes (automated)
chmod +x apply-fixes-and-restart.sh
./apply-fixes-and-restart.sh

# 2. Run workflow test
./complete-workflow-test-fixed.sh

# 3. View results
cat workflow-test-fixed-output.log
```

## What Gets Fixed

✅ **3 Database Migrations:**
- Migration 020: Adds `contract_id` to payments table
- Migration 021: Adds `exporter_id` to payments and quality_inspections tables
- Migration 022: Extends contracts table with 9 missing columns

✅ **5 API Route Wrappers Added:**
- POST /api/v1/forex
- POST /api/v1/inspection
- POST /api/v1/quality/issue
- POST /api/v1/permits
- POST /api/v1/customs

✅ **Validation Fixes:**
- Shipment bondReference now optional
- LC request uses correct field names
- Payment includes exporter_id

✅ **System Restart:**
- Stops old API process
- Rebuilds TypeScript
- Applies migrations
- Starts fresh with blockchain connections

## Expected Time

- Fix application: ~30 seconds
- API restart: ~10 seconds
- Workflow test: ~40 seconds

**Total: ~80 seconds**

## If Issues Occur

```bash
# Check API logs
tail -f /tmp/api-restart.log

# Check API health
curl http://localhost:3001/health | jq

# Check database
psql -U postgres -d cecbs -c "\d contracts"

# Restart blockchain if needed
cd blockchain && docker-compose restart
```

## Documentation

- `WORKFLOW-TEST-FIXES-SUMMARY.md` - Round 1 fixes (API routes)
- `WORKFLOW-TEST-FIXES-ROUND-2.md` - Round 2 fixes (database schema)
- This file - Quick reference

## Success Indicators

✅ API health check returns `"status": "healthy"`
✅ All 20 workflow steps execute
✅ Entities created with proper IDs
✅ No DATABASE_ERROR messages
✅ No "column does not exist" errors
✅ Blockchain connections established

---

**Ready to go!** Just run `./apply-fixes-and-restart.sh` and then test.

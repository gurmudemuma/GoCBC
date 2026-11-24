# CECBS Utility Scripts

Utility scripts for data migration, testing, and system maintenance.

## Utility Scripts (`utility/`)

### Data Management
- `create-simple-test-data.js` - Create simple test data
- `create-test-shipping-data.js` - Create test shipping data
- `recreate-test-data.js` - Recreate all test data
- `populate-shipping-data.js` - Populate shipping data

### Data Migration
- `migrate-db-columns.js` - Migrate database columns
- `migrate-old-applications.js` - Migrate old applications
- `create-missing-users.js` - Create missing users
- `register-missing-exporters.js` - Register missing exporters

### Data Verification
- `analyze-portal-tables.js` - Analyze portal data tables
- `check-inspection-data.js` - Check inspection data
- `check-shipping-data.js` - Check shipping data
- `diagnose-data-issue.js` - Diagnose data issues

### Data Fixes
- `fix-lab-certification.js` - Fix lab certification issues
- `fix-shipment-data.js` - Fix shipment data
- `approve-contracts.js` - Approve pending contracts
- `complete-pending-inspections.js` - Complete pending inspections

### Old Windows Scripts
- Various `.bat`, `.ps1`, `.sh` files for quick operations
- Mostly for development, replaced by main scripts

## Usage

```bash
# Run utility scripts from project root
node scripts/utility/create-simple-test-data.js

# Or from scripts directory
cd scripts/utility
node create-simple-test-data.js
```

---

For main operations, use scripts in project root:
- `chaincode.sh` - Chaincode management
- `prepare-deployment.sh` - Deployment preparation
- `deploy-to-coffeex-cbe.sh` - Production deployment

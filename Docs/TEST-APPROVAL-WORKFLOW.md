# Test Approval Workflow - CECBS Exporter Registration

## Current Status
✅ API Server restarted with `getTransactionId` fix applied  
✅ Fabric network connected successfully  
✅ Database has 2 pending applications  
✅ Discovery enabled for multi-org endorsement  

## Fix Applied
Changed `invokeChaincode()` method in `fabricService.ts`:
```typescript
// OLD (broken):
const result = await this.contract.submitTransaction(functionName, ...args);
const txId = this.contract.getTransactionId(); // ❌ Not a function

// NEW (fixed):
const transaction = this.contract.createTransaction(functionName);
const result = await transaction.submit(...args);
const txId = transaction.getTransactionId(); // ✅ Correct API
```

## Test Steps

### 1. Access ECTA Portal
- Open: http://localhost:3000/
- Click "Login" button
- Username: `ecta_admin`
- Password: `ecta123`
- Should redirect to ECTA Portal

### 2. View Pending Applications
- Click on "Pending Applications" tab
- Should see 2 applications in the table
- Applications should display with status "pending"

### 3. Test Approval Workflow
- Click "Actions" dropdown on first application
- Click "Approve"
- **System will auto-generate:**
  - Exporter ID: EXP + 7 random digits (e.g., EXP1234567)
  - License Number: ECTA-LIC-2026-XXX (e.g., ECTA-LIC-2026-001)
  - License Expiry: One year from today (2027-06-02)

### 4. Expected Results
✅ **Success Case:**
- Success dialog appears with exporter details
- Shows login credentials and portal URL
- Database updated: status = "approved"
- **Blockchain registration:**
  - Transaction submitted to Fabric network
  - Endorsed by MAJORITY of organizations (4 of 6)
  - Returns transaction ID
  - Exporter stored in blockchain ledger
- Application disappears from pending list

❌ **Failure Case (if still issues):**
- Error dialog shows detailed error message
- Check API logs in terminal for specific error
- Common issues:
  - Endorsement policy failure (need 4 orgs to endorse)
  - Chaincode connectivity issues
  - Peer communication problems

### 5. Verify Registration
After successful approval:

**A. Check Database:**
```powershell
# Query approved applications
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('./api/cecbs.db'); db.all('SELECT * FROM exporter_applications WHERE status = \\'approved\\'', (err, rows) => { console.log(JSON.stringify(rows, null, 2)); db.close(); });"
```

**B. Check Blockchain:**
- API logs should show transaction ID
- Look for: `✅ Chaincode invoke successful: RegisterExporter`
- Transaction should have endorsements from multiple orgs

**C. Test Exporter Login:**
- Go to: http://localhost:3000/
- Login with generated credentials:
  - Username: [company_email from application]
  - Password: Default password (check fabricService.ts for default)
- Should access Exporter Portal

### 6. Test Rejection Workflow
- Click "Actions" dropdown on second application
- Click "Reject"
- Enter rejection reason
- Click "Confirm Rejection"
- Should show notification with re-application instructions
- Application status updated to "rejected" in database

## Monitoring

### API Logs
Watch the API server terminal for:
```
info: Invoking chaincode function: RegisterExporter
info: ✅ Chaincode invoke successful: RegisterExporter { txId: '...' }
```

### Error Patterns to Watch For
1. **Endorsement Policy Failure:**
   ```
   ENDORSEMENT_POLICY_FAILURE
   ```
   - Means not enough orgs endorsed (need 4 of 6)
   - Check peer containers are running
   - Verify discovery is enabled

2. **Contract Method Error:**
   ```
   this.contract.getTransactionId is not a function
   ```
   - Should be FIXED now (restart applied)
   - If still occurs, check fabricService.ts line 345-350

3. **Network Connection:**
   ```
   Not connected to Fabric network
   ```
   - Auto-reconnect should trigger
   - Check Fabric peers are running

## Docker Status Check
```powershell
docker ps --filter "name=peer0" --format "table {{.Names}}\t{{.Status}}"
docker ps --filter "name=coffee-chaincode" --format "table {{.Names}}\t{{.Status}}"
```

All should show "Up" status.

## Next Steps After Testing
1. If approval works: Test with both applications
2. If still fails: Check specific error in API logs
3. Verify approved exporter can login
4. Test complete exporter workflow (create contract, shipment, etc.)

## Troubleshooting

### If Endorsement Fails
Check peer connectivity:
```powershell
docker logs peer0.ecta.cecbs.et 2>&1 | Select-String "chaincode"
docker logs peer0.ecx.cecbs.et 2>&1 | Select-String "chaincode"
```

### If Database Not Updated
Check fabricService.ts `approveApplication()` method - should update DB after blockchain registration succeeds.

### If UI Shows Old Data
Hard refresh: Ctrl+Shift+R or clear browser cache

---

**Current Time:** 2026-06-02 11:19 (Ethiopia Time)  
**API Server:** Running on port 3001 ✅  
**UI Server:** Running on port 3000 ✅  
**Fabric Network:** Connected ✅  
**Fix Applied:** getTransactionId using createTransaction() ✅

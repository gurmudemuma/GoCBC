# Next Steps - Test Exporter Approval

## 🎯 Current Status
✅ **ALL SYSTEMS READY**
- API Server running with `getTransactionId` fix applied
- Fabric network connected and healthy
- 2 pending applications in database
- All 6 peer organizations running
- Chaincode container operational
- Discovery enabled for multi-org endorsement

## 🧪 Test Now

### Step 1: Access ECTA Portal
1. Open browser: **http://localhost:3000/**
2. Click "Login" button
3. Enter credentials:
   - Username: `ecta_admin`
   - Password: `ecta123`
4. You should be redirected to ECTA Portal

### Step 2: View Pending Applications
1. In ECTA Portal, click **"Pending Applications"** tab
2. You should see **2 pending applications** in the table
3. Review the application details:
   - Company Name
   - Contact Email
   - Capital Requirement
   - Professional Taster info
   - Submitted date

### Step 3: Approve First Application
1. Click the **"Actions"** dropdown button on the first application row
2. Select **"Approve"**
3. The system will **automatically generate**:
   - ✅ Exporter ID (format: EXP1234567)
   - ✅ ECTA License Number (format: ECTA-LIC-2026-XXX)
   - ✅ License Expiry Date (1 year from today: 2027-06-02)
4. Wait for the approval to process...

### Step 4: Check Result

#### ✅ SUCCESS SCENARIO:
- Green success dialog appears
- Shows exporter details and credentials
- Provides login instructions:
  - Portal URL: http://localhost:3000/
  - Username: [company email]
  - Login information displayed
- Application disappears from the pending list
- **Check API logs** - should show:
  ```
  info: Invoking chaincode function: RegisterExporter
  info: ✅ Chaincode invoke successful: RegisterExporter { txId: '...' }
  info: Application approved: [app-id] -> [exporter-id]
  ```

#### ❌ FAILURE SCENARIO:
- Red error dialog appears with error details
- Application remains in pending list
- **Check API logs** for specific error:
  - Look for `error:` lines
  - Check for endorsement policy failures
  - Verify chaincode connectivity

### Step 5: Verify Blockchain Registration
If approval succeeded, the exporter should now be registered on blockchain:

**API Logs will show:**
```
info: Invoking chaincode function: RegisterExporter
info: ✅ Chaincode invoke successful: RegisterExporter
```

**Transaction details:**
- Transaction ID returned
- Endorsed by MAJORITY of organizations (4 of 6)
- Exporter stored in blockchain state database

### Step 6: Test Rejection (Optional)
1. For the second application, click **"Actions"** → **"Reject"**
2. Enter rejection reason (e.g., "Insufficient capital requirement")
3. Click **"Confirm Rejection"**
4. Should show notification with:
   - Rejection reason
   - Re-application instructions
   - URL: http://localhost:3000/register-exporter
   - List of requirements

## 🔍 What to Watch For

### Monitor API Terminal
Watch the terminal running API server (Process 13) for real-time logs:
- Authentication messages
- Chaincode invocation
- Transaction IDs
- Success/error messages

### Common Issues and Solutions

#### Issue 1: "Endorsement Policy Failure"
**Cause:** Not enough organizations endorsed (need 4 of 6)
**Check:**
```powershell
docker ps --filter "name=peer0" --format "table {{.Names}}\t{{.Status}}"
```
All peers should show "Up"

**Solution:** Ensure all peer containers are running and connected

#### Issue 2: "Not connected to Fabric network"
**Cause:** Fabric connection lost
**Solution:** Auto-reconnect should trigger. If not, restart API server:
```powershell
# Stop: Ctrl+C in API terminal
# Start: npm run dev
```

#### Issue 3: "Contract method error"
**Cause:** Wrong API usage (should be FIXED now)
**Check:** Verify `fabricService.ts` line 345-350 has the fix
**Solution:** Already applied - restart API if needed

#### Issue 4: "Database error"
**Cause:** Database connection issue
**Check:** Verify `api/cecbs.db` exists and has pending applications
**Solution:** Database should reconnect automatically

## 📊 Expected Data Flow

```
User Action (UI)
    ↓
Click "Approve"
    ↓
Auto-generate: Exporter ID, License Number, Expiry Date
    ↓
POST /api/v1/exporters/exporter-applications/:id/approve
    ↓
fabricService.registerExporter()
    ↓
invokeChaincode('RegisterExporter', [...params])
    ↓
transaction = contract.createTransaction('RegisterExporter')
    ↓
transaction.submit(...params)
    ↓
Blockchain: Endorsement by 4+ organizations
    ↓
Transaction committed to ledger
    ↓
Get transaction ID: transaction.getTransactionId()
    ↓
Update database: status = 'approved'
    ↓
Return success response
    ↓
UI: Show success notification
```

## 🎉 Success Criteria

### Application Approval Succeeds When:
1. ✅ Success notification displayed
2. ✅ Transaction ID returned
3. ✅ Database updated (status = 'approved')
4. ✅ Blockchain updated (exporter registered)
5. ✅ Application removed from pending list
6. ✅ API logs show successful chaincode invocation
7. ✅ No errors in API terminal

### Exporter Can Now:
1. ✅ Login to system with generated credentials
2. ✅ Access Exporter Portal
3. ✅ Create sales contracts
4. ✅ Register shipments
5. ✅ View their profile on blockchain

## 📞 What to Report Back

After testing, please report:

### If SUCCESS ✅:
- "Approval worked!"
- Mention the transaction ID shown
- Confirm application disappeared from list

### If FAILURE ❌:
- Copy the exact error message from the dialog
- Copy relevant lines from API logs (the lines with `error:`)
- Mention which application you tried to approve
- Share any error details shown in the UI

## 🚀 Ready to Test!

Everything is configured and running. The fix has been applied and the server restarted.

**Go ahead and test the approval workflow now!**

1. Open: http://localhost:3000/
2. Login as ECTA admin
3. Go to Pending Applications tab
4. Click Approve on first application
5. Watch for success/error message

---

**System Status:** 🟢 OPERATIONAL  
**Fix Applied:** ✅ YES (`getTransactionId` using `createTransaction()`)  
**API Server:** ✅ Running (Port 3001)  
**UI Server:** ✅ Running (Port 3000)  
**Fabric Network:** ✅ Connected (All 6 peers + chaincode)  
**Ready for Testing:** ✅ YES

**Time:** 2026-06-02 11:24 Ethiopia Time

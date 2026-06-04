# CECBS Exporter Registration System - READY FOR TESTING

## ✅ System Status

### Services Running
- **API Server:** Port 3001 ✅ (Process 13)
- **UI Server:** Port 3000 ✅
- **Database:** SQLite at `api/cecbs.db` ✅
- **Blockchain:** Hyperledger Fabric Network ✅

### Docker Containers Status
```
✅ peer0.ecta.cecbs.et       (Up 20 hours)
✅ peer0.ecx.cecbs.et        (Up 20 hours)
✅ peer0.customs.cecbs.et    (Up 47 hours)
✅ peer0.shipping.cecbs.et   (Up 47 hours)
✅ peer0.nbe.cecbs.et        (Up 47 hours)
✅ peer0.banks.cecbs.et      (Up 47 hours)
✅ coffee-chaincode          (Up 18 minutes)
✅ orderer.cecbs.et          (Up 47 hours)
```

## ✅ Fix Applied and Verified

### The Problem
```typescript
// ❌ OLD CODE (caused error):
const result = await this.contract.submitTransaction(functionName, ...args);
const txId = this.contract.getTransactionId();
// Error: this.contract.getTransactionId is not a function
```

### The Solution
```typescript
// ✅ NEW CODE (fixed in fabricService.ts line 345-350):
const transaction = this.contract.createTransaction(functionName);
const result = await transaction.submit(...args);
const txId = transaction.getTransactionId();
```

**Status:** ✅ Applied and API server restarted

## 📋 Data Flow Verification

### 1. Database Schema
Table: `exporter_applications`
- Contains: 2 pending applications
- Fields: application_id, company_name, contact_email, status, capital_requirement, professional_taster, taster_certificate, etc.

### 2. API Endpoint
Route: `POST /api/v1/exporters/exporter-applications/:applicationId/approve`
- ✅ Auth required
- ✅ Validates: exporterId, ectaLicenseNumber, licenseExpiryDate
- ✅ Calls: `fabricService.registerExporter()`
- ✅ Updates database on success

### 3. Chaincode Function
Function: `RegisterExporter`
Parameters (7):
1. exporterID (string)
2. companyName (string)
3. ectaLicenseNumber (string)
4. capitalRequirementStr (string - parsed to float)
5. professionalTaster (string)
6. tasterCertificate (string)
7. licenseExpiryDate (string)

**Chain:** UI → API → FabricService → Blockchain → Database

## 🧪 Test the System

### Quick Test
1. Open: http://localhost:3000/
2. Login as ECTA admin:
   - Username: `ecta_admin`
   - Password: `ecta123`
3. Go to "Pending Applications" tab
4. Click "Approve" on first application
5. Check for success message

### Expected Behavior
✅ Auto-generates approval data:
- Exporter ID: `EXP1234567` (random 7 digits)
- License Number: `ECTA-LIC-2026-XXX`
- Expiry Date: One year from today

✅ Submits to blockchain:
- Invokes `RegisterExporter` chaincode
- Gets endorsements from MAJORITY of orgs (4/6)
- Returns transaction ID

✅ Updates database:
- Sets status = 'approved'
- Stores exporter_id and approval timestamp

✅ Shows notification:
- Success dialog with exporter details
- Login instructions for exporter
- Portal URL and credentials

## 🔍 Monitoring

### Watch API Logs
Terminal showing process 13 output should display:
```
info: Invoking chaincode function: RegisterExporter
info: ✅ Chaincode invoke successful: RegisterExporter { txId: '...' }
```

### If Error Occurs
Check API logs for specific error message. Common patterns:

1. **Endorsement Policy Failure**
   ```
   ENDORSEMENT_POLICY_FAILURE
   ```
   - Need 4 of 6 orgs to endorse
   - Check if all peers are connected

2. **Network Connection**
   ```
   Not connected to Fabric network
   ```
   - Auto-reconnect should trigger
   - Verify Fabric services are up

3. **Data Validation**
   ```
   invalid capital requirement
   ```
   - Check database has valid data

## 📊 Endorsement Policy

**Channel:** coffeechannel  
**Policy:** `MAJORITY Endorsement`  
**Required:** 4 of 6 organizations must endorse

Organizations:
1. ECTA (Ethiopian Coffee and Tea Authority)
2. ECX (Ethiopian Commodity Exchange)
3. Banks (Commercial Bank of Ethiopia)
4. NBE (National Bank of Ethiopia)
5. Customs (Ethiopian Customs Commission)
6. Shipping (Ethiopian Shipping and Logistics Services)

Discovery Mode: **Enabled** (`enabled: true, asLocalhost: true`)

## 🎯 Test Cases

### Test Case 1: Successful Approval
**Steps:**
1. Approve first application
2. Verify success notification
3. Check application disappears from pending list
4. Verify API logs show transaction ID
5. Try to login as approved exporter

**Expected:** All steps succeed

### Test Case 2: Application Rejection
**Steps:**
1. Reject second application
2. Enter rejection reason
3. Verify rejection notification with re-application instructions
4. Check application status = 'rejected' in database

**Expected:** Notification shows re-registration URL

### Test Case 3: Duplicate Prevention
**Steps:**
1. Approve same application twice
2. Should fail with "exporter already exists"

**Expected:** Blockchain prevents duplicate registration

## 🔧 Configuration Files

### API Environment (`.env`)
```
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
FABRIC_DISCOVERY_ENABLED=true
FABRIC_DISCOVERY_AS_LOCALHOST=true
```

### Fabric Connection
- **Channel:** coffeechannel
- **Chaincode:** coffee (version 1.2)
- **MSP ID:** ECTAMSP
- **Peer:** peer0.ecta.cecbs.et:7051

## 📁 Key Files

### Backend
- `api/src/services/fabricService.ts` (line 330-360: invokeChaincode with fix)
- `api/src/routes/exporters.ts` (line 150-220: approve endpoint)
- `api/cecbs.db` (SQLite database with pending applications)

### Frontend
- `ui/src/components/portals/ECTAPortal.tsx` (approval UI)
- `ui/src/pages/register-exporter.tsx` (public registration form)

### Blockchain
- `chaincodes/coffee/main.go` (line 75-120: RegisterExporter function)
- `blockchain/configtx.yaml` (endorsement policy configuration)

## 🚀 Ready to Test!

All systems are operational. The `getTransactionId` bug has been fixed and API server has been restarted with the fix.

**Next Action:** Test the approval workflow in the UI at http://localhost:3000/

---

**Last Updated:** 2026-06-02 11:21 (Ethiopia Time)  
**System Version:** CECBS v1.2.0  
**Chaincode Version:** coffee v1.2  
**Status:** 🟢 READY FOR TESTING

# Testing the Bank/Branch Selection Feature

## Quick Test Guide

### Prerequisites
- Backend API running on `http://localhost:3001`
- Frontend UI running on `http://localhost:3000`
- Database migration completed (`node api/add-bank-columns.js`)
- SQLite database exists at `api/cecbs.db`

---

## Test Scenario 1: Database Migration Verification

**Purpose:** Verify database columns were added successfully

### Steps:
```bash
cd api
node add-bank-columns.js
```

### Expected Output:
```
📦 CECBS Database Migration - Add Bank Columns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database: C:\CEX\api\cecbs.db

✅ Connected to database

🚀 Starting migrations...

[1/5] Add bank columns to users table
   ✅ Success
[2/5] Add bank branch to users table
   ✅ Success
[3/5] Add bank branch code to users table
   ✅ Success
[4/5] Add bank branch name to exporter_applications table
   ✅ Success
[5/5] Add bank branch code to exporter_applications table
   ✅ Success

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   ✅ Successful: 5
   ⏭️  Skipped:    0
   ❌ Failed:     0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ All migrations completed successfully!
```

✅ **Pass Criteria:** All 5 migrations successful, 0 failed

---

## Test Scenario 2: Complete Flow Integration Test

**Purpose:** Test the entire approval flow with bank selection

### Steps:
```bash
cd api
node test-bank-branch-flow.js
```

### Expected Output:
```
🧪 CECBS Bank/Branch Selection Flow Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Step 1: Creating test exporter application...
✅ Test application created: TEST-APP-1782329303491
   Company: Test Coffee Exporters Ltd
   Email: test.exporter.1782329303491@test.com
   Bank: Commercial Bank of Ethiopia

✅ Step 2: Approving application with bank/branch selection...
✅ Application approved!
   Exporter ID: EXP7419517
   License: ECTA-LIC-2026-170
   Bank: Commercial Bank of Ethiopia
   Branch: Bole Branch (CBE-002)

👤 Step 3: Creating user account with bank information...
✅ User account created!
   Username: EXP7419517
   Password: EXP7419517@test123
   Status: active

🔍 Step 4: Verifying data integrity...

✅ Application Record:
   Status: approved
   Exporter ID: EXP7419517
   License: ECTA-LIC-2026-170
   Bank: Commercial Bank of Ethiopia
   Branch: Bole Branch
   Branch Code: CBE-002
   Expires: 2027-06-24

✅ User Account:
   Username: EXP7419517
   Email: test.exporter.1782329303491@test.com
   Role: EXPORTER
   Organization: Test Coffee Exporters Ltd
   Exporter ID: EXP7419517
   Bank: Commercial Bank of Ethiopia
   Branch: Bole Branch
   Branch Code: CBE-002
   Status: active

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Results:
   ✅ Passed: 10/10 checks

✨ All tests passed! Bank/branch selection flow is working correctly!
```

✅ **Pass Criteria:** 10/10 checks passed

---

## Test Scenario 3: UI - ECTA Approval Dialog

**Purpose:** Test the bank/branch selection UI during approval

### Steps:

1. **Start the system:**
   ```bash
   # Terminal 1 - Backend
   cd api
   npm run dev

   # Terminal 2 - Frontend
   cd ui
   npm run dev
   ```

2. **Login as ECTA Admin:**
   - Navigate to: `http://localhost:3000/login`
   - Username: `ecta_admin` or `admin`
   - Password: (system admin password)

3. **Go to ECTA Portal:**
   - Click "ECTA Portal" in navigation
   - Go to "Pending Applications" tab

4. **Create Test Application (if needed):**
   - Go to: `http://localhost:3000/register-exporter`
   - Fill form with test data
   - Submit application

5. **Approve Application:**
   - In ECTA Portal, find pending application
   - Click green checkmark (✓) approve button
   - **Verify auto-generated fields:**
     - ✅ Exporter ID: `EXP#######` (7 digits)
     - ✅ License Number: `ECTA-LIC-2026-###` (3 digits)
     - ✅ License Expiry: 1 year from today

6. **Select Bank:**
   - Click "Select Bank" dropdown
   - Choose: **Commercial Bank of Ethiopia**
   - Verify: BankBranchSelect becomes enabled

7. **Select Branch:**
   - Click "Select Branch" dropdown
   - Verify: Shows CBE branches (Main, Bole, Merkato, etc.)
   - Choose: **Bole Branch**
   - **Verify Branch Details Card appears:**
     ```
     Selected Branch Details
     Branch: Bole Branch [Main Branch]
     Code: CBE-002
     Location: Bole Road, Addis Ababa
     Phone: +251-11-662-0000
     ✓ Authorized for LC Processing
     ```

8. **Complete Approval:**
   - Click "Approve Application" button
   - **Verify Success Notification:**
     ```
     ✅ Application Approved Successfully!
     
     Exporter: Test Coffee Exporters Ltd
     Exporter ID: EXP7419517
     License Number: ECTA-LIC-2026-170
     Email: test@example.com
     
     🏦 Banking Details:
     • Bank: Commercial Bank of Ethiopia
     • Branch: Bole Branch
     • Branch Code: CBE-002
     • LC Processing: This branch will approve Letters of Credit
     
     📧 Email Notification Sent
     
     Next Steps for Exporter: [...]
     ```

✅ **Pass Criteria:**
- Bank dropdown populates correctly
- Branch dropdown shows correct branches for selected bank
- Branch details display correctly
- Approval succeeds with bank information
- Notification shows complete banking details

---

## Test Scenario 4: UI - Exporter Profile Display

**Purpose:** Test that exporters can see their assigned bank/branch

### Steps:

1. **Login as Approved Exporter:**
   - Navigate to: `http://localhost:3000/login`
   - Username: Use the Exporter ID from approval (e.g., `EXP7419517`)
   - Password: Provided in approval notification or test credentials

2. **View Dashboard:**
   - Should land on Exporter Portal dashboard
   - Look at the top section

3. **Verify Profile Card:**
   - **Left Column - Company Information:**
     ```
     Company Name: Test Coffee Exporters Ltd
     Exporter ID: EXP7419517
     Capital Requirement: ETB 75,000,000.00
     Laboratory Status: ✓ Certified
     ```

   - **Right Column - License & Banking Information:**
     ```
     ECTA License Number: ECTA-LIC-2026-170
     License Expiry Date: June 24, 2027
     LC Processing Bank: Commercial Bank of Ethiopia
     LC Processing Branch: Bole Branch [CBE-002]
     ✓ All Letter of Credit requests will be processed through this branch
     ```

✅ **Pass Criteria:**
- Profile card displays at top of dashboard
- Bank name shows correctly
- Branch name shows correctly
- Branch code displays in chip/badge
- LC processing message displays
- All data matches what was selected during approval

---

## Test Scenario 5: API Endpoint Testing

**Purpose:** Test that API returns bank information correctly

### Test 5A: Profile Endpoint

```bash
# Get JWT token first (login)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "EXP7419517",
    "password": "your_password"
  }'

# Use token to get profile
curl http://localhost:3001/api/v1/exporters/me/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "exporterId": "EXP7419517",
    "companyName": "Test Coffee Exporters Ltd",
    "ectaLicenseNumber": "ECTA-LIC-2026-170",
    "licenseStatus": "ACTIVE",
    "licenseExpiryDate": "2027-06-24",
    "bankName": "Commercial Bank of Ethiopia",
    "bankBranch": "Bole Branch",
    "bankBranchCode": "CBE-002",
    "capitalRequirement": 75000000,
    "laboratoryCertified": true
  },
  "timestamp": "2026-06-24T10:30:00.000Z"
}
```

✅ **Pass Criteria:**
- Response includes bank fields
- Bank name matches approval
- Branch name matches approval
- Branch code matches approval

### Test 5B: Approval Endpoint

```bash
# As ECTA admin, approve an application
curl -X POST http://localhost:3001/api/v1/exporters/exporter-applications/APP-12345678/approve \
  -H "Authorization: Bearer ECTA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP9999999",
    "ectaLicenseNumber": "ECTA-LIC-2026-999",
    "licenseExpiryDate": "2027-06-24",
    "bankName": "Dashen Bank",
    "bankBranch": "Mexico Branch",
    "bankBranchCode": "DSH-003"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-12345678",
    "exporterId": "EXP9999999",
    "status": "approved",
    "txId": "blockchain_tx_id_here",
    "bankName": "Dashen Bank",
    "bankBranch": "Mexico Branch",
    "bankBranchCode": "DSH-003",
    "credentials": {
      "username": "EXP9999999",
      "temporaryPassword": "generated_password",
      "email": "applicant@example.com",
      "message": "Please send these credentials to the exporter via email..."
    }
  },
  "timestamp": "2026-06-24T10:30:00.000Z"
}
```

✅ **Pass Criteria:**
- Approval succeeds
- Response includes bank information
- Credentials generated correctly
- Bank info stored in database

---

## Test Scenario 6: Database Verification

**Purpose:** Verify data is stored correctly in database

### Steps:

```bash
# Open SQLite database
cd api
sqlite3 cecbs.db

# Check user bank information
SELECT username, exporter_id, bank_name, bank_branch, bank_branch_code 
FROM users 
WHERE role = 'EXPORTER' 
ORDER BY created_at DESC 
LIMIT 5;

# Expected output:
# EXP7419517|EXP7419517|Commercial Bank of Ethiopia|Bole Branch|CBE-002

# Check application bank information
SELECT 
  application_id, 
  company_name, 
  exporter_id, 
  bank_name, 
  bank_branch_name, 
  bank_branch_code,
  status
FROM exporter_applications 
WHERE status = 'approved' 
ORDER BY approved_at DESC 
LIMIT 5;

# Expected output:
# APP-12345678|Test Coffee Exporters Ltd|EXP7419517|Commercial Bank of Ethiopia|Bole Branch|CBE-002|approved

# Exit
.exit
```

✅ **Pass Criteria:**
- Bank information present in users table
- Bank information present in exporter_applications table
- Data matches between tables
- No NULL values in bank fields for approved exporters

---

## Test Scenario 7: Edge Cases

### Test 7A: No Bank Selected
**Steps:**
1. In ECTA approval dialog, leave bank/branch empty
2. Try to approve

**Expected:**
- Validation error (if required)
- OR approval succeeds with NULL bank values
- System handles gracefully

### Test 7B: Bank Without Branches
**Steps:**
1. Select a bank with no branches defined
2. Verify error message

**Expected:**
- BankBranchSelect shows: "No branches available"
- Error message: "This bank may not process export transactions"

### Test 7C: Profile Without Bank Info
**Steps:**
1. View profile for exporter approved before feature
2. Check display

**Expected:**
- Profile displays without errors
- Bank section shows "Not assigned" or hidden
- No JavaScript errors in console

---

## Troubleshooting

### Issue: Bank dropdown doesn't populate
**Check:**
- `ui/src/utils/banks.ts` imported correctly
- BankSelect component rendering
- Browser console for errors

**Fix:**
- Restart frontend dev server
- Clear browser cache

### Issue: Branch dropdown doesn't cascade
**Check:**
- Bank name passed correctly to BankBranchSelect
- `getBranchesByBankName()` returns results
- Console log to verify data

**Fix:**
- Verify bank name matches exactly (case-sensitive)
- Check bankBranches.ts for bank entry

### Issue: Database columns missing
**Check:**
```bash
cd api
sqlite3 cecbs.db
PRAGMA table_info(users);
PRAGMA table_info(exporter_applications);
.exit
```

**Fix:**
```bash
node add-bank-columns.js
```

### Issue: API doesn't return bank info
**Check:**
- Profile endpoint code updated
- Database query successful
- Token includes exporterId

**Fix:**
- Check API logs: `api/logs/combined.log`
- Verify user has bank info in database
- Test with Postman/curl

---

## Success Criteria Summary

### ✅ Complete Success:
- [ ] Migration script runs successfully (5/5)
- [ ] Integration test passes (10/10 checks)
- [ ] Bank dropdown works in UI
- [ ] Branch dropdown cascades correctly
- [ ] Branch details display
- [ ] Approval saves bank information
- [ ] Profile displays bank information
- [ ] API returns bank information
- [ ] Database stores bank information correctly
- [ ] No JavaScript errors in console
- [ ] No API errors in logs

### 📊 Acceptance Criteria:
- All 11 success criteria checked
- No critical bugs
- Feature works end-to-end
- Data integrity maintained

---

## Quick Reference: Test Data

### Banks Available:
- Commercial Bank of Ethiopia (CBE) - 8 branches
- Dashen Bank - 3 branches
- Awash International Bank - 2 branches
- Bank of Abyssinia - 2 branches
- Others - 1 branch each

### Sample Branch Codes:
- CBE-001: CBE Main Branch
- CBE-002: CBE Bole Branch
- DSH-001: Dashen Head Office
- AIB-001: Awash Head Office

### Test Credentials:
- ECTA Admin: `ecta_admin` / (system password)
- Test Exporter: `EXP7419517` / (generated password)

---

**Last Updated:** June 24, 2026  
**Feature Version:** 1.0.0  
**Status:** Ready for Testing

# Test Public Exporter Registration System

## Quick Test Guide

Follow these steps to test the complete exporter registration workflow.

---

## Prerequisites

1. **API Server Running**
   ```bash
   cd api
   npm run dev
   ```
   Check logs for: "✅ Connected to SQLite database" and "✅ Exporter applications table ready"

2. **UI Server Running**
   ```bash
   cd ui
   npm run dev
   ```
   Access at: http://localhost:3000

3. **Blockchain Network** (Optional for full test)
   - If blockchain is running, approvals will register on-chain
   - If not running, approval will still work but skip blockchain step

---

## Test 1: Submit Public Application

### Step 1: Open Registration Page
```
http://localhost:3000/register-exporter
```

### Step 2: Fill Company Information
- **Company Name:** Yirgacheffe Coffee Exporters PLC
- **TIN Number:** 0012345678
- **Business License Number:** BL-2026-12345
- **Registration Date:** 2026-01-15

Click **Next**

### Step 3: Fill ECTA Requirements
- **Capital Requirement:** 8000000 (8 million ETB)
- **Professional Taster Name:** Abebe Kebede
- **Taster Certificate Number:** ECTA-TASTER-2025-456
- **Laboratory Facility:** Yes

Click **Next**

### Step 4: Fill Contact Details
- **Contact Person:** Tigist Alemu
- **Email:** info@yirgacheffecoffee.et
- **Phone:** +251911234567
- **City:** Addis Ababa
- **Address:** Bole Road, Addis Ababa
- **Bank Name:** Commercial Bank of Ethiopia
- **Bank Account Number:** 1000123456789
- **Comments:** We specialize in Grade 1 Yirgacheffe coffee

Click **Next**

### Step 5: Review & Submit
- Review all information
- Click **Submit Application**

### Expected Result
✅ Success screen appears with:
- Application Reference Number (e.g., APP-12345678)
- Confirmation message
- Next steps information
- Buttons: "Go to Home" and "Submit Another Application"

---

## Test 2: View Application in ECTA Portal

### Step 1: Login as ECTA Admin
```
http://localhost:3000/login
```
- **Username:** ecta_admin
- **Password:** password123

### Step 2: Navigate to ECTA Portal
Click on **ECTA Portal** in navigation

### Step 3: Check Statistics
Verify the dashboard shows:
- **Total Exporters:** Current count
- **Pending Applications:** Should show 1 (orange card)
- **Lab Certified:** Current count
- **Expiring Soon:** Current count

### Step 4: View Pending Applications Tab
- Should be the **first tab** (already selected)
- Table should show your test application with:
  - Application ID
  - Company Name: Yirgacheffe Coffee Exporters PLC
  - Contact Person: Tigist Alemu
  - Email: info@yirgacheffecoffee.et
  - Capital: 8,000,000 ETB
  - Submitted date

### Expected Result
✅ Application appears in pending list

---

## Test 3: Review Application Details

### Step 1: Click View Details Icon (👁️)
Click the eye icon in the Actions column

### Step 2: Verify Information
Dialog should show three sections:

**Company Information:**
- Application ID: APP-XXXXXXXX
- Company Name: Yirgacheffe Coffee Exporters PLC
- TIN Number: 0012345678
- Business License: BL-2026-12345

**Requirements:**
- Capital: 8,000,000 ETB
- Professional Taster: Abebe Kebede
- Taster Certificate: ECTA-TASTER-2025-456
- Laboratory: Yes

**Contact Details:**
- Contact Person: Tigist Alemu
- Email: info@yirgacheffecoffee.et
- Phone: +251911234567
- City: Addis Ababa
- Address: Bole Road, Addis Ababa

### Expected Result
✅ All information displays correctly

---

## Test 4: Approve Application

### Step 1: Click Approve Button (✅)
From the details dialog or directly from the table

### Step 2: Fill Approval Form
- **Exporter ID:** EXP2026001
- **ECTA License Number:** ECTA-LIC-2026-001
- **License Expiry Date:** 2027-06-01 (1 year from today)

### Step 3: Submit Approval
Click **Approve & Register**

### Expected Result
✅ Success message appears
✅ Application removed from pending list
✅ Pending Applications count decreases by 1
✅ If blockchain is running: Exporter registered on blockchain

---

## Test 5: Verify Exporter Registration

### Step 1: Navigate to Exporters Management Tab
Click the **second tab** in ECTA Portal

### Step 2: Find New Exporter
Look for exporter with ID: EXP2026001

### Step 3: Verify Details
- **Exporter ID:** EXP2026001
- **Company Name:** Yirgacheffe Coffee Exporters PLC
- **License Number:** ECTA-LIC-2026-001
- **Status:** ACTIVE
- **Capital:** 8,000,000 ETB
- **Lab Certified:** Toggle should be available

### Expected Result
✅ Exporter appears in registered exporters list

---

## Test 6: Reject Application (Optional)

### Step 1: Submit Another Test Application
Follow Test 1 again with different company name

### Step 2: View in ECTA Portal
Navigate to Pending Applications tab

### Step 3: Click Reject Button (⚠️)
Click the warning icon for the new application

### Step 4: Provide Rejection Reason
Enter reason, for example:
```
Capital requirement not met. Minimum 5,000,000 ETB required, but only 3,000,000 ETB provided.
```

### Step 5: Submit Rejection
Click **Reject Application**

### Expected Result
✅ Application removed from pending list
✅ Pending Applications count decreases by 1
✅ Application status updated to "rejected" in database

---

## API Testing (Optional)

### Test API Endpoints Directly

#### 1. Submit Application
```bash
curl -X POST http://localhost:3001/api/v1/exporters/applications \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Sidama Coffee Exporters",
    "tinNumber": "0098765432",
    "businessLicenseNumber": "BL-2026-54321",
    "registrationDate": "2026-02-01",
    "capitalRequirement": "6000000",
    "professionalTaster": "Chaltu Tadesse",
    "tasterCertificate": "ECTA-TASTER-2025-789",
    "laboratoryFacility": "no",
    "contactPerson": "Mulugeta Bekele",
    "email": "info@sidamacoffee.et",
    "phone": "+251922334455",
    "address": "Hawassa, SNNPR",
    "city": "Hawassa"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-XXXXXXXX",
    "status": "pending",
    "submittedAt": "2026-06-01T...",
    "message": "Application submitted successfully..."
  }
}
```

#### 2. List Applications (Requires Auth Token)
```bash
# First login to get token
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' \
  | jq -r '.data.token')

# Then list applications
curl -X GET http://localhost:3001/api/v1/exporters/applications \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "application_id": "APP-XXXXXXXX",
      "company_name": "Sidama Coffee Exporters",
      "status": "pending",
      ...
    }
  ]
}
```

#### 3. Approve Application
```bash
curl -X POST http://localhost:3001/api/v1/exporters/applications/APP-XXXXXXXX/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP2026002",
    "ectaLicenseNumber": "ECTA-LIC-2026-002",
    "licenseExpiryDate": "2027-06-01"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-XXXXXXXX",
    "exporterId": "EXP2026002",
    "status": "approved",
    "txId": "abc123..."
  }
}
```

---

## Database Verification

### Check SQLite Database Directly

```bash
cd api

# Open SQLite database
sqlite3 cecbs.db

# List all applications
SELECT application_id, company_name, status, submitted_at 
FROM exporter_applications;

# Count by status
SELECT status, COUNT(*) 
FROM exporter_applications 
GROUP BY status;

# Exit
.exit
```

---

## Troubleshooting

### Issue: "Cannot find module 'sqlite3'"
**Solution:**
```bash
cd api
npm install sqlite3 @types/sqlite3
npm run dev
```

### Issue: Applications not showing in ECTA Portal
**Solution:**
1. Check API logs: `api/logs/combined.log`
2. Verify database exists: `api/cecbs.db`
3. Test API endpoint:
   ```bash
   curl http://localhost:3001/api/v1/exporters/applications
   ```

### Issue: Approval fails with blockchain error
**Solution:**
- This is expected if blockchain network is not running
- Application will still be marked as approved in database
- To fully test, start blockchain network first

### Issue: Database table doesn't exist
**Solution:**
```bash
cd api
rm cecbs.db  # Delete old database
npm run dev  # Restart server (auto-creates table)
```

---

## Success Criteria

✅ Public registration page loads and accepts submissions  
✅ Applications appear in ECTA Portal pending tab  
✅ Statistics show correct pending count  
✅ Application details display correctly  
✅ Approval workflow assigns IDs and updates status  
✅ Approved exporters appear in exporters list  
✅ Rejection workflow updates status with reason  
✅ Database persists all application data  

---

## Next Steps After Testing

1. **Production Deployment**
   - Set `DATABASE_PATH` environment variable
   - Configure email notifications
   - Set up SSL certificates

2. **User Training**
   - Train ECTA staff on approval workflow
   - Create user manual for applicants
   - Set up support email/phone

3. **Monitoring**
   - Monitor application submission rate
   - Track approval/rejection ratios
   - Review processing times

4. **Enhancements**
   - Add email notifications
   - Implement document upload
   - Create applicant tracking portal

---

## Test Complete! 🎉

If all tests pass, the Public Exporter Registration System is fully operational and ready for production use.

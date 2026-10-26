# Public Exporter Registration System

## Overview

The Ethiopian Coffee Export Consortium Blockchain System (CECBS) now includes a **Public Exporter Registration System** that allows anyone interested in becoming a coffee exporter to apply online. This system streamlines the ECTA licensing process and integrates with the blockchain for approved exporters.

---

## System Architecture

### Components

1. **Public Registration Page** (`/register-exporter`)
   - Accessible to anyone without authentication
   - 4-step wizard for application submission
   - Collects company information, requirements, and contact details

2. **SQLite Database** (`cecbs.db`)
   - Stores pending, approved, and rejected applications
   - Automatically created on API server startup
   - Table: `exporter_applications`

3. **API Endpoints** (`/api/v1/exporters/applications`)
   - `POST /applications` - Submit new application (public)
   - `GET /applications` - List applications (ECTA admin only)
   - `POST /applications/:id/approve` - Approve and register on blockchain
   - `POST /applications/:id/reject` - Reject with reason

4. **ECTA Portal Integration**
   - New "Pending Applications" tab
   - View application details
   - Approve/reject workflow
   - Automatic blockchain registration on approval

---

## Application Workflow

### Step 1: Public Application Submission

Anyone can visit `/register-exporter` and submit an application with:

**Company Information:**
- Company Name
- TIN Number
- Business License Number
- Registration Date

**ECTA Requirements:**
- Capital Requirement (minimum 5,000,000 ETB)
- Professional Taster Name
- Taster Certificate Number
- Laboratory Facility (Yes/No)

**Contact Details:**
- Contact Person
- Email Address
- Phone Number
- Address & City
- Bank Information (optional)

**Submission:**
- Application receives unique ID (e.g., `APP-12345678`)
- Status set to `pending`
- Stored in SQLite database
- Confirmation message displayed with reference number

### Step 2: ECTA Admin Review

ECTA administrators can:

1. **View Pending Applications**
   - Navigate to ECTA Portal → "Pending Applications" tab
   - See list of all pending applications
   - View statistics: Total Exporters, Pending Applications, Lab Certified, Expiring Soon

2. **Review Application Details**
   - Click "View Details" icon to see full application
   - Review all submitted information
   - Verify capital requirements (minimum 5,000,000 ETB)
   - Check professional taster credentials

3. **Approve Application**
   - Click "Approve" button
   - Assign Exporter ID (format: `EXP2026001`)
   - Assign ECTA License Number (format: `ECTA-LIC-2026-001`)
   - Set License Expiry Date (typically 1 year)
   - System automatically:
     - Registers exporter on blockchain via `RegisterExporter` chaincode
     - Updates application status to `approved`
     - Records approval timestamp and exporter ID

4. **Reject Application**
   - Click "Reject" button
   - Provide rejection reason
   - System updates status to `rejected`
   - Records rejection timestamp and reason

### Step 3: Blockchain Registration (Automatic)

When an application is approved:

1. API calls Hyperledger Fabric chaincode function `RegisterExporter`
2. Exporter data written to blockchain ledger
3. Transaction ID returned and logged
4. Exporter can now use the system with assigned credentials

---

## Database Schema

### Table: `exporter_applications`

```sql
CREATE TABLE exporter_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    tin_number TEXT NOT NULL,
    business_license_number TEXT NOT NULL,
    registration_date TEXT,
    capital_requirement TEXT NOT NULL,
    professional_taster TEXT NOT NULL,
    taster_certificate TEXT NOT NULL,
    laboratory_facility TEXT DEFAULT 'no',
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    comments TEXT,
    status TEXT DEFAULT 'pending',  -- pending, approved, rejected
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    rejected_at TEXT,
    rejection_reason TEXT,
    exporter_id TEXT,  -- Assigned after approval
    reviewed_by TEXT
);
```

**Indexes:**
- `idx_exporter_applications_status` - Fast filtering by status
- `idx_exporter_applications_email` - Email lookups
- `idx_exporter_applications_submitted` - Chronological sorting

---

## API Endpoints

### 1. Submit Application (Public)

**Endpoint:** `POST /api/v1/exporters/applications`

**Authentication:** None required (public endpoint)

**Request Body:**
```json
{
  "companyName": "Yirgacheffe Coffee Exporters PLC",
  "tinNumber": "0012345678",
  "businessLicenseNumber": "BL-2026-12345",
  "registrationDate": "2026-01-15",
  "capitalRequirement": "8000000",
  "professionalTaster": "Abebe Kebede",
  "tasterCertificate": "ECTA-TASTER-2025-456",
  "laboratoryFacility": "yes",
  "contactPerson": "Tigist Alemu",
  "email": "info@yirgacheffecoffee.et",
  "phone": "+251911234567",
  "address": "Bole Road, Addis Ababa",
  "city": "Addis Ababa",
  "region": "Addis Ababa",
  "bankName": "Commercial Bank of Ethiopia",
  "bankAccountNumber": "1000123456789",
  "comments": "We specialize in Grade 1 Yirgacheffe coffee"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-12345678",
    "status": "pending",
    "submittedAt": "2026-06-01T12:00:00.000Z",
    "message": "Application submitted successfully. ECTA will review your application within 2-3 business days."
  },
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

### 2. List Applications (ECTA Admin)

**Endpoint:** `GET /api/v1/exporters/applications`

**Authentication:** Required (JWT token)

**Query Parameters:**
- `status` - Filter by status (pending, approved, rejected)
- `limit` - Number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "application_id": "APP-12345678",
      "company_name": "Yirgacheffe Coffee Exporters PLC",
      "tin_number": "0012345678",
      "capital_requirement": "8000000",
      "professional_taster": "Abebe Kebede",
      "contact_person": "Tigist Alemu",
      "email": "info@yirgacheffecoffee.et",
      "phone": "+251911234567",
      "status": "pending",
      "submitted_at": "2026-06-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50
  },
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

### 3. Approve Application (ECTA Admin)

**Endpoint:** `POST /api/v1/exporters/applications/:applicationId/approve`

**Authentication:** Required (JWT token, ECTA admin only)

**Request Body:**
```json
{
  "exporterId": "EXP2026001",
  "ectaLicenseNumber": "ECTA-LIC-2026-001",
  "licenseExpiryDate": "2027-06-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-12345678",
    "exporterId": "EXP2026001",
    "status": "approved",
    "txId": "abc123def456..."
  },
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

### 4. Reject Application (ECTA Admin)

**Endpoint:** `POST /api/v1/exporters/applications/:applicationId/reject`

**Authentication:** Required (JWT token, ECTA admin only)

**Request Body:**
```json
{
  "reason": "Capital requirement not met. Minimum 5,000,000 ETB required."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-12345678",
    "status": "rejected",
    "reason": "Capital requirement not met. Minimum 5,000,000 ETB required."
  },
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

---

## ECTA Portal Features

### Pending Applications Tab

**Location:** ECTA Portal → First Tab

**Features:**
- Table view of all pending applications
- Columns: Application ID, Company Name, Contact Person, Email, Capital, Submitted Date, Actions
- Action buttons:
  - 👁️ View Details - Opens detailed application dialog
  - ✅ Approve - Opens approval dialog
  - ⚠️ Reject - Opens rejection dialog

### Application Details Dialog

Shows complete application information organized in sections:
- **Company Information:** Name, TIN, Business License, Registration Date
- **Requirements:** Capital, Professional Taster, Certificate, Laboratory
- **Contact Details:** Contact Person, Email, Phone, Address, City

### Approval Dialog

**Fields:**
- Exporter ID (format: EXP followed by 7 digits)
- ECTA License Number (format: ECTA-LIC-YYYY-XXX)
- License Expiry Date (typically 1 year from approval)

**Validation:**
- All fields required
- Format validation for IDs
- Date must be in the future

**Action:**
- Registers exporter on blockchain
- Updates application status
- Assigns exporter ID for system access

### Rejection Dialog

**Fields:**
- Rejection Reason (required, multiline text)

**Action:**
- Updates application status to rejected
- Records reason for applicant reference
- Logs rejection timestamp

---

## Statistics Dashboard

The ECTA Portal displays real-time statistics:

1. **Total Exporters** - Count of registered exporters (green)
2. **Pending Applications** - Count of applications awaiting review (orange)
3. **Lab Certified** - Count of exporters with laboratory certification (green)
4. **Expiring Soon** - Count of licenses expiring within 3 months (red)

---

## ECTA Licensing Requirements

### Minimum Requirements

1. **Capital Requirement**
   - Minimum: 5,000,000 ETB (Five Million Ethiopian Birr)
   - Must be verified and documented

2. **Professional Coffee Taster**
   - Must have valid ECTA taster certification
   - Certificate number required
   - Name must be provided

3. **Business Documentation**
   - Valid TIN (Tax Identification Number)
   - Business License Number
   - Company registration documents

4. **Laboratory Facility (Optional)**
   - Recommended but not mandatory
   - Can be updated after registration
   - Provides competitive advantage

### License Validity

- **Duration:** Typically 1 year from approval date
- **Renewal:** Required before expiry
- **Monitoring:** ECTA tracks licenses expiring within 3 months

---

## Technical Implementation

### Files Modified/Created

**Frontend (UI):**
- `ui/src/pages/register-exporter.tsx` - Public registration page (NEW)
- `ui/src/components/portals/ECTAPortal.tsx` - Added applications tab
- `ui/src/utils/api.ts` - Already has generic methods (no changes needed)

**Backend (API):**
- `api/src/routes/exporters.ts` - Added 3 new endpoints
- `api/src/services/fabricService.ts` - Added SQLite database support
- `api/package.json` - Added sqlite3 dependency

**Database:**
- `scripts/init-db-sqlite.sql` - SQLite schema (NEW)
- `scripts/init-db.sql` - PostgreSQL schema (updated)

### Database Location

- **Development:** `api/cecbs.db` (auto-created)
- **Production:** Set via `DATABASE_PATH` environment variable

### Environment Variables

```env
# Database
DATABASE_PATH=./cecbs.db

# Fabric Network
FABRIC_WALLET_PATH=./wallet
FABRIC_CHANNEL_NAME=coffeechannel
FABRIC_CHAINCODE_NAME=coffee
FABRIC_MSP_ID=ECTAMSP
```

---

## Testing the System

### 1. Submit Test Application

Visit: `http://localhost:3000/register-exporter`

Fill out the 4-step form and submit.

### 2. View in ECTA Portal

1. Login as ECTA admin: `ecta_admin` / `password123`
2. Navigate to ECTA Portal
3. Click "Pending Applications" tab
4. You should see your test application

### 3. Approve Application

1. Click "View Details" to review
2. Click "Approve" button
3. Fill in:
   - Exporter ID: `EXP2026001`
   - License Number: `ECTA-LIC-2026-001`
   - Expiry Date: One year from today
4. Click "Approve & Register"
5. Check blockchain for new exporter record

### 4. Verify Blockchain Registration

```bash
# Query all exporters
curl http://localhost:3001/api/v1/exporters

# Query specific exporter
curl http://localhost:3001/api/v1/exporters/EXP2026001
```

---

## Security Considerations

### Public Endpoint Protection

- Rate limiting applied to prevent spam
- Input validation on all fields
- Email format validation
- SQL injection prevention (parameterized queries)

### Admin Endpoint Protection

- JWT authentication required
- Role-based access control (ECTA admin only)
- Audit logging of all approve/reject actions

### Data Privacy

- Applicant data stored securely in SQLite
- Only ECTA admins can view applications
- Sensitive data not exposed in public APIs

---

## Future Enhancements

### Phase 2 Features

1. **Email Notifications**
   - Send confirmation email on application submission
   - Notify applicant of approval/rejection
   - Reminder emails for incomplete applications

2. **Application Status Tracking**
   - Public page for applicants to check status
   - Track application using reference number and email

3. **Document Upload**
   - Upload business license PDF
   - Upload taster certificate
   - Upload bank statements

4. **Payment Integration**
   - Online payment for application fee
   - License renewal payment

5. **Multi-step Verification**
   - Email verification
   - Phone number verification (SMS)
   - Document verification workflow

6. **Advanced Analytics**
   - Application approval rate
   - Average processing time
   - Regional distribution of exporters

---

## Troubleshooting

### Database Not Created

**Issue:** `exporter_applications` table doesn't exist

**Solution:**
```bash
cd api
rm cecbs.db  # Delete old database
npm run dev  # Restart server (auto-creates table)
```

### Applications Not Showing

**Issue:** Pending applications tab is empty

**Solution:**
1. Check API logs for database errors
2. Verify database file exists: `api/cecbs.db`
3. Check API endpoint: `GET http://localhost:3001/api/v1/exporters/applications`

### Approval Fails

**Issue:** "Failed to register exporter on blockchain"

**Solution:**
1. Ensure blockchain network is running
2. Check Fabric connection in API logs
3. Verify chaincode is deployed
4. Test blockchain connection: `curl http://localhost:3001/api/v1/health`

---

## Summary

The Public Exporter Registration System provides:

✅ **Public Access** - Anyone can apply to become an exporter  
✅ **Streamlined Process** - 4-step wizard with clear requirements  
✅ **ECTA Admin Control** - Review, approve, or reject applications  
✅ **Blockchain Integration** - Approved exporters automatically registered  
✅ **Database Persistence** - SQLite storage for all applications  
✅ **Professional UI** - Consistent with ECTA branding and theme  
✅ **Real-time Statistics** - Dashboard showing pending applications  

The system is now fully operational and ready for use!

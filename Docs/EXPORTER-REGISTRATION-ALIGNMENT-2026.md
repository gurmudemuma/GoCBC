# Exporter Registration System - Complete 2026 Alignment

## Overview
This document describes the complete alignment of exporter registration data across all three layers of the CECBS system: Chaincode (Blockchain), Backend API, and Frontend UI.

---

## System Architecture

### Three-Layer Data Flow:
```
Frontend (UI) → Database (SQLite) → Backend API → Chaincode (Blockchain)
```

1. **Frontend**: Public registration form collecting 2026 compliance data
2. **Database**: Stores pending applications with complete details
3. **Backend API**: Approval workflow that registers to blockchain
4. **Chaincode**: Immutable blockchain record with 2026 fields

---

## 2026 Compliance Fields

### New Fields Added (Directive 1106/2025):

| Field | Type | Description | Requirement |
|-------|------|-------------|-------------|
| `exporterType` | string | Business structure: private, company, or individual | Mandatory |
| `laboratoryCertificateNumber` | string | ECTA lab certificate number | Mandatory for non-farmer exporters |

### Capital Requirements by Type:
- **Private Exporters**: 15,000,000 ETB (1,400% increase from 1M)
- **Trade Associations/Companies**: 20,000,000 ETB (1,233% increase from 1.5M)
- **Individual Exporters**: 10,000,000 ETB (900% increase from 1M)

---

## Layer-by-Layer Alignment

### 1. CHAINCODE (`chaincodes/coffee/main.go`)

#### Exporter Struct (Updated):
```go
type Exporter struct {
    ExporterID                   string    `json:"exporterId"`
    CompanyName                  string    `json:"companyName"`
    ECTALicenseNumber            string    `json:"ectaLicenseNumber"`
    LicenseStatus                string    `json:"licenseStatus"`
    ExporterType                 string    `json:"exporterType"`                 // ✅ NEW 2026
    CapitalRequirement           float64   `json:"capitalRequirement"`
    LaboratoryCertified          bool      `json:"laboratoryCertified"`
    LaboratoryCertificateNumber  string    `json:"laboratoryCertificateNumber"`  // ✅ NEW 2026
    ProfessionalTaster           string    `json:"professionalTaster"`
    TasterCertificate            string    `json:"tasterCertificate"`
    LicenseExpiryDate            string    `json:"licenseExpiryDate"`
    CreatedAt                    time.Time `json:"createdAt"`
    UpdatedAt                    time.Time `json:"updatedAt"`
}
```

#### RegisterExporter Function (Updated):
```go
func (c *CoffeeContract) RegisterExporter(
    ctx contractapi.TransactionContextInterface,
    exporterID string,
    companyName string,
    ectaLicenseNumber string,
    exporterType string,                    // ✅ NEW 2026
    capitalRequirementStr string,
    professionalTaster string,
    tasterCertificate string,
    laboratoryCertificateNumber string,     // ✅ NEW 2026
    licenseExpiryDate string
) error
```

**Parameters**: 9 (was 7)
**Version**: 1.3 (upgrade required)

#### UpdateExporterStatus Function (License Suspension):
```go
func (c *CoffeeContract) UpdateExporterStatus(
    ctx contractapi.TransactionContextInterface,
    exporterID string,
    status string  // ACTIVE, SUSPENDED, EXPIRED
) error
```

---

### 2. BACKEND API (`api/src/services/fabricService.ts`)

#### FabricService.registerExporter (Updated):
```typescript
public async registerExporter(
  exporterId: string,
  companyName: string,
  ectaLicenseNumber: string,
  exporterType: string,                    // ✅ NEW 2026
  capitalRequirement: string,
  professionalTaster: string,
  tasterCertificate: string,
  laboratoryCertificateNumber: string,     // ✅ NEW 2026
  licenseExpiryDate: string
): Promise<ChaincodeResponse>
```

**Parameters**: 9 (matches chaincode)
**Alignment**: ✅ PERFECT MATCH

#### FabricService.updateExporterStatus:
```typescript
public async updateExporterStatus(
  exporterId: string,
  status: string  // ACTIVE, SUSPENDED, EXPIRED
): Promise<ChaincodeResponse>
```

---

### 3. BACKEND ROUTES (`api/src/routes/exporters.ts`)

#### Approval Endpoint (Updated):
```
POST /api/v1/exporters/exporter-applications/:applicationId/approve
```

**Flow**:
1. Reads application from database (includes `exporter_type` and `laboratory_certificate_number`)
2. Calls `fabricService.registerExporter()` with 9 parameters
3. Blockchain stores complete 2026 compliance data
4. Updates database with approval status

**Code**:
```typescript
const result = await fabricService.registerExporter(
  exporterId,
  application.company_name,
  ectaLicenseNumber,
  application.exporter_type || 'private',                    // ✅ NEW 2026
  application.capital_requirement,
  application.professional_taster,
  application.taster_certificate,
  application.laboratory_certificate_number || '',           // ✅ NEW 2026
  licenseExpiryDate
);
```

#### Status Update Endpoint:
```
PUT /api/v1/exporters/:exporterID/status
Body: { "status": "ACTIVE" | "SUSPENDED" | "EXPIRED" }
```

---

### 4. DATABASE (`api/cecbs.db`)

#### Table: `exporter_applications`

**New Columns**:
- `exporter_type` TEXT DEFAULT 'private'
- `laboratory_certificate_number` TEXT

**Complete Schema** (relevant fields):
```sql
CREATE TABLE exporter_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  tin_number TEXT NOT NULL,
  business_license_number TEXT NOT NULL,
  registration_date TEXT,
  exporter_type TEXT DEFAULT 'private',                      -- ✅ NEW 2026
  capital_requirement TEXT NOT NULL,
  professional_taster TEXT NOT NULL,
  taster_certificate TEXT NOT NULL,
  laboratory_facility TEXT DEFAULT '',
  laboratory_certificate_number TEXT,                        -- ✅ NEW 2026
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  exporter_id TEXT,
  ecta_license_number TEXT,
  license_expiry_date TEXT,
  reviewed_by TEXT
);
```

---

### 5. FRONTEND UI (`ui/src/pages/register-exporter.tsx`)

#### Form Fields (Updated):
```typescript
const [formData, setFormData] = useState({
  // Company Information
  companyName: '',
  tinNumber: '',
  businessLicenseNumber: '',
  registrationDate: '',
  
  // Requirements (2026 Compliance)
  exporterType: '',                          // ✅ NEW 2026 (private, company, individual)
  capitalRequirement: '',
  professionalTaster: '',
  tasterCertificate: '',
  laboratoryFacility: '',
  laboratoryCertificateNumber: '',          // ✅ NEW 2026
  
  // Contact Details
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  region: '',
  
  // Additional
  bankName: '',
  bankAccountNumber: '',
  comments: '',
});
```

#### Form Validation:
- Exporter type selection enforces correct capital minimum
- Laboratory certificate required unless farmer exporter
- Professional taster diploma verification required

---

## Data Flow Example

### Complete Registration Flow:

#### 1. User Submits Application:
```
POST /api/v1/exporters/exporter-applications
{
  "companyName": "Ethiopian Premium Coffee Export",
  "tinNumber": "0012345678",
  "businessLicenseNumber": "BL-2026-001234",
  "exporterType": "private",                           ✅ NEW
  "capitalRequirement": "15000000",
  "professionalTaster": "Alemayehu Tadesse",
  "tasterCertificate": "ECTA-TASTER-2026-0023",
  "laboratoryCertificateNumber": "ECTA-LAB-2025-0156", ✅ NEW
  "email": "info@premiumcoffee.et",
  ...
}
```

**Result**: Stored in database with status `pending`

---

#### 2. ECTA Admin Approves:
```
POST /api/v1/exporters/exporter-applications/APP-12345678/approve
{
  "exporterId": "EXP0001234",
  "ectaLicenseNumber": "ECTA-LIC-2026-001",
  "licenseExpiryDate": "2027-06-02"
}
```

**Backend Processing**:
1. Reads application from database
2. Extracts 2026 fields (`exporter_type`, `laboratory_certificate_number`)
3. Calls chaincode with 9 parameters
4. Updates database status to `approved`

**Blockchain Transaction**:
```
RegisterExporter(
  "EXP0001234",
  "Ethiopian Premium Coffee Export",
  "ECTA-LIC-2026-001",
  "private",                           ✅ NEW - from database
  "15000000",
  "Alemayehu Tadesse",
  "ECTA-TASTER-2026-0023",
  "ECTA-LAB-2025-0156",               ✅ NEW - from database
  "2027-06-02"
)
```

**Result**: Immutable blockchain record with complete 2026 compliance data

---

#### 3. ECTA Admin Suspends License:
```
PUT /api/v1/exporters/EXP0001234/status
{
  "status": "SUSPENDED"
}
```

**Blockchain Transaction**:
```
UpdateExporterStatus("EXP0001234", "SUSPENDED")
```

**Result**: License status updated to SUSPENDED (prevents contract/shipment creation)

---

## Verification Checklist

### ✅ Chaincode (`main.go`):
- [x] `Exporter` struct includes `exporterType` and `laboratoryCertificateNumber`
- [x] `RegisterExporter` function accepts 9 parameters
- [x] `UpdateExporterStatus` function implemented
- [x] Exporter type validation (private, company, individual)
- [x] Go build successful (version 1.3 ready)

### ✅ Backend API (`fabricService.ts`, `exporters.ts`):
- [x] `registerExporter` method has 9 parameters
- [x] `updateExporterStatus` method implemented
- [x] Approval endpoint passes 2026 fields from database
- [x] Direct POST endpoint accepts optional 2026 fields
- [x] Status update endpoint validates status values

### ✅ Database (`cecbs.db`):
- [x] `exporter_type` column exists
- [x] `laboratory_certificate_number` column exists
- [x] Old applications migrated with defaults
- [x] Indexes created for performance

### ✅ Frontend UI (`register-exporter.tsx`):
- [x] Exporter type field with validation
- [x] Laboratory certificate number field
- [x] Capital requirement helper text based on type
- [x] 2026 compliance alert with Directive reference
- [x] Review step shows all 2026 fields

---

## Deployment Requirements

### Chaincode Upgrade to Version 1.3:

1. **Build new chaincode**:
   ```bash
   cd chaincodes/coffee
   go build
   ```

2. **Package and install** (all organizations):
   ```bash
   peer lifecycle chaincode package coffee-1.3.tar.gz \
     --path ./chaincodes/coffee \
     --lang golang \
     --label coffee_1.3
   
   peer lifecycle chaincode install coffee-1.3.tar.gz
   ```

3. **Approve and commit** (multi-org endorsement):
   ```bash
   # Each org approves
   peer lifecycle chaincode approveformyorg \
     --channelID coffeechannel \
     --name coffee \
     --version 1.3 \
     --sequence 3 \
     --package-id <package_id>
   
   # Commit when majority approves
   peer lifecycle chaincode commit \
     --channelID coffeechannel \
     --name coffee \
     --version 1.3 \
     --sequence 3
   ```

4. **Restart API server**:
   ```bash
   cd api
   npm run dev
   ```

---

## Testing

### Test New Exporter Registration:

1. **Submit application** via UI:
   - Go to `/register-exporter`
   - Fill all fields including exporter type and lab certificate
   - Submit

2. **Approve application** (ECTA Portal):
   - Login as ECTA admin
   - Navigate to "Pending Applications"
   - Click "Approve" and provide license details
   - Verify blockchain transaction succeeds

3. **Verify blockchain data**:
   ```bash
   peer chaincode query \
     -C coffeechannel \
     -n coffee \
     -c '{"Args":["ReadExporter","EXP0001234"]}'
   ```
   
   **Expected**: JSON with `exporterType` and `laboratoryCertificateNumber`

4. **Test suspension**:
   - In ECTA Portal → Exporters Management
   - Click "Suspend" icon next to exporter
   - Verify status changes to SUSPENDED
   - Confirm blockchain updated

---

## Backward Compatibility

### Existing Exporters:
- Old exporters registered with 7 parameters remain valid
- `exporterType` defaults to empty string (displayed as "Not Specified")
- `laboratoryCertificateNumber` defaults to empty string (displayed as "Not Provided")
- No data migration required for existing blockchain records
- Database migration handles old application records with defaults

---

## Summary

### ✅ COMPLETE ALIGNMENT ACHIEVED:

| Layer | Parameters | Version | Status |
|-------|-----------|---------|--------|
| Chaincode | 9 | 1.3 | ✅ Ready to deploy |
| Backend API | 9 | Current | ✅ Updated |
| Database | All 2026 fields | Current | ✅ Migrated |
| Frontend UI | All 2026 fields | Current | ✅ Live |

### Key Features:
1. **2026 Compliance**: Complete support for Directive 1106/2025
2. **Data Consistency**: All layers store complete exporter information
3. **License Management**: Suspend/activate functionality for license control
4. **Audit Trail**: Immutable blockchain records with timestamps
5. **Backward Compatible**: Existing exporters remain functional

### Next Steps:
1. Deploy chaincode version 1.3 to all peer organizations
2. Test approval workflow with new 2026 fields
3. Test license suspension feature
4. Monitor blockchain transaction logs

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-02  
**Status**: Ready for Production Deployment

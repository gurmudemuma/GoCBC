# 🚀 User Management System - Quick Start Guide

**Status**: ✅ Ready for Testing  
**Date**: August 2, 2026

---

## ⚡ Quick Start (3 Steps)

### Step 1: Start the System

```bash
# Option A: Start everything (recommended)
bash start-all.sh

# Option B: Start just the API (if Docker is already running)
cd api
npm start
```

The API will start on **http://localhost:3001**

### Step 2: Run the Test Suite

```bash
# Make sure you're in the project root
cd /c/goCBC

# Run comprehensive user management tests
node tests/test-user-management.js
```

The test suite will:
- ✅ Login as admin
- ✅ Create a new test user
- ✅ Enroll user with blockchain identity (RSA keys + certificate)
- ✅ Sign data with user's private key
- ✅ Verify cryptographic signature
- ✅ Test all user management endpoints
- ✅ Check audit trail

### Step 3: Verify Results

Check the test output for:
- ✅ Green checkmarks = Success
- ❌ Red X = Failure
- ⚠️  Yellow warnings = Non-critical issues

---

## 📊 What's Been Implemented

### ✅ Backend (Complete)

**Database Schema** (PostgreSQL):
- `users` - Traditional user accounts
- `blockchain_identities` - RSA keys + X.509 certificates
- `user_activity_log` - Comprehensive audit trail
- `transaction_signatures` - Blockchain transaction signatures
- `certificate_revocation_list` - Revoked certificates
- `msp_configuration` - MSP setup for 6 organizations
- `role_permissions` - Granular RBAC (40+ permissions)

**API Endpoints** (30+ endpoints):
- `/api/v1/users` - Traditional user management (CRUD)
- `/api/v1/crypto-users` - Blockchain identity management
- `/api/v1/crypto-users/enroll` - Enroll with cryptographic identity
- `/api/v1/crypto-users/sign` - Digital signature creation
- `/api/v1/crypto-users/verify` - Signature verification
- `/api/v1/crypto-users/identities` - List all blockchain identities

**Cryptographic Service**:
- RSA 4096-bit key pair generation
- X.509 certificate issuance
- Digital signatures (SHA256withRSA)
- Certificate renewal & revocation
- MSP enrollment

**Security Features**:
- Bcrypt password hashing (10 rounds)
- Private keys encrypted (AES-256-CBC)
- Certificate-based blockchain access
- Comprehensive audit logging
- Role-based access control (RBAC)

### 🔄 Frontend (Needs Updates)

**Current State**: Basic user management UI exists  
**Location**: `ui/src/components/admin/UserManagement.tsx`

**Needs**:
- ✅ Display blockchain identity status
- ✅ Show certificate expiry dates
- ✅ Add signature verification UI
- ✅ Permission management with checkboxes
- ✅ Activity log viewer with filters
- ✅ Certificate management dashboard

---

## 🧪 Manual Testing (Using cURL)

### 1. Login as Admin

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Save the token** from the response!

### 2. Create a New User

```bash
TOKEN="your-admin-token-here"

curl -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "fullName": "Test User",
    "role": "EXPORTER",
    "organization": "Test Coffee Ltd",
    "exporterId": "EXP1001",
    "ectaLicense": "ECTA/LIC/2024/001",
    "phone": "+251912345678"
  }'
```

**Save the user ID** from the response!

### 3. Enroll User with Blockchain Identity

```bash
USER_ID=123  # Replace with actual user ID

curl -X POST http://localhost:3001/api/v1/crypto-users/enroll \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": '"$USER_ID"',
    "username": "testuser1",
    "role": "EXPORTER",
    "organization": "Test Coffee Ltd"
  }'
```

This creates:
- RSA 4096-bit key pair
- X.509 certificate
- MSP enrollment (ECTAMSP)
- Certificate hash for verification

### 4. Get Blockchain Identity

```bash
curl -X GET http://localhost:3001/api/v1/crypto-users/$USER_ID/identity \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Sign Data (Login as Test User First)

```bash
# Login as test user
TEST_TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser1", "password": "SecurePass123!"}' \
  | jq -r '.data.token')

# Sign data
curl -X POST http://localhost:3001/api/v1/crypto-users/sign \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": "Sample transaction data"}'
```

**Save the signature** from the response!

### 6. Verify Signature

```bash
SIGNATURE="base64-signature-here"

curl -X POST http://localhost:3001/api/v1/crypto-users/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": '"$USER_ID"',
    "data": "Sample transaction data",
    "signature": "'"$SIGNATURE"'"
  }'
```

---

## 📂 File Locations

### Backend Code
```
api/src/routes/users.ts           # Traditional user management
api/src/routes/crypto-users.ts    # Blockchain identity management
api/src/services/cryptoUserService.ts  # Cryptographic service
api/src/middleware/auth.ts        # Authentication middleware
```

### Database Scripts
```
scripts/migrate-user-management-postgres.sql  # Main schema
scripts/add-blockchain-identities.sql         # Blockchain tables
```

### Frontend Code
```
ui/src/components/admin/UserManagement.tsx  # User management UI
```

### Documentation
```
USER-MANAGEMENT-SYSTEM.md         # Complete documentation
USER-MANAGEMENT-QUICKSTART.md     # This guide
```

---

## 🔍 Verify Database Tables

### Check PostgreSQL Tables

```bash
# Connect to PostgreSQL container
docker exec -it cecbs-postgres psql -U cecbs -d cecbs

# List all tables
\dt

# Check users table
SELECT id, username, role, organization, status FROM users LIMIT 5;

# Check blockchain identities
SELECT user_id, username, msp_id, status, expires_at FROM blockchain_identities LIMIT 5;

# Check activity log
SELECT action, username, target_username, performed_by, created_at 
FROM user_activity_log 
ORDER BY created_at DESC 
LIMIT 10;

# Exit psql
\q
```

---

## 🎯 Default Users

The system comes with these pre-configured users:

| Username | Password | Role | Organization |
|----------|----------|------|-------------|
| admin | admin123 | ADMIN | ECTA |
| admin@ecta.gov.et | ecta_admin_2024 | ECTA | ECTA |
| nbe_admin | nbe_admin_2024 | NBE | National Bank |
| admin@cbe.com.et | cbe_admin_2024 | BANKS | Commercial Bank |
| customs_admin | customs_admin_2024 | CUSTOMS | Customs Commission |
| admin@ecx.com.et | ecx_admin_2024 | ECX | ECX |

---

## 🐛 Troubleshooting

### API Won't Start

```bash
# Check if port 3001 is already in use
netstat -ano | findstr :3001

# Kill process if needed (Windows)
taskkill /PID <process-id> /F

# Check logs
cd api
npm start
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker restart cecbs-postgres

# Check connection from API
cat api/.env | grep DATABASE
```

### Test Failures

```bash
# Enable debug logging
export DEBUG=true

# Run tests with verbose output
node tests/test-user-management.js 2>&1 | tee test-output.log

# Check API logs
tail -f api/logs/combined.log
```

### Missing Crypto Keys

```bash
# Check if crypto directories exist
ls -la api/crypto-keys/
ls -la api/certificates/

# Create directories if missing
mkdir -p api/crypto-keys api/certificates
chmod 700 api/crypto-keys api/certificates
```

---

## 🔗 API Documentation

Once the API is running, visit:

**http://localhost:3001/api-docs**

This provides interactive Swagger documentation for all endpoints.

---

## 📝 Next Steps

### 1. Test the System (Now)
```bash
node tests/test-user-management.js
```

### 2. Update Frontend UI
- Add blockchain identity display
- Add certificate status indicators
- Add signature verification UI
- Add permission management interface
- Add activity log viewer

### 3. Integration Testing
- Test from each portal type (ECTA, Banks, ECX, etc.)
- Verify permissions work correctly
- Test certificate renewal
- Test identity revocation

### 4. Security Hardening
- Review key storage (consider HSM for production)
- Implement proper CA for certificate issuance
- Add rate limiting for cryptographic operations
- Enable 2FA for admin accounts

### 5. Documentation
- API integration guide for portal developers
- Security best practices guide
- Certificate management procedures
- Incident response procedures

---

## ✅ Success Criteria

Your user management system is working correctly if:

- ✅ All tests pass (green checkmarks)
- ✅ Users can be created via API
- ✅ Blockchain identities are enrolled automatically
- ✅ Digital signatures can be created and verified
- ✅ Activity logs capture all operations
- ✅ Permissions are enforced correctly
- ✅ Certificates have proper expiry dates
- ✅ MSP IDs are assigned correctly

---

**Ready to test?** Run: `node tests/test-user-management.js`

**Questions?** Check the full documentation: `USER-MANAGEMENT-SYSTEM.md`

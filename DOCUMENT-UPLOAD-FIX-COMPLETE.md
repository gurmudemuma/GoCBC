# Document Upload 401/500 Error - FIXED ✅

## Problem
Users were unable to upload documents during exporter registration:
1. **401 Unauthorized**: `/api/v1/documents/upload-registration` was blocked by authentication
2. **500 Internal Server Error**: PostgreSQL `documents` table didn't exist

---

## Root Causes

### Issue 1: Authentication Blocking Public Endpoint
**Problem**: The documents routes had `authMiddleware` applied at the router level in `server.ts`, which meant ALL document endpoints required authentication, including the public `/upload-registration` endpoint needed for exporter registration.

**Location**: `c:\goCBC\api\src\server.ts` line 209

**Before**:
```typescript
apiV1.use('/documents', authMiddleware, documentsRoutes);
```

**After**:
```typescript
// Note: authMiddleware NOT applied here - individual routes handle auth
// /upload-registration is public for exporter registration
apiV1.use('/documents', documentsRoutes);
```

### Issue 2: Missing PostgreSQL Documents Table
**Problem**: The `documents` table SQL was only written for SQLite (with `AUTOINCREMENT`), but the system uses PostgreSQL. The table was never created in the PostgreSQL database.

**Error**: `relation "documents" does not exist`

---

## Solutions Implemented

### ✅ Fix 1: Removed Blanket Authentication
- Removed `authMiddleware` from documents router registration in `server.ts`
- Individual routes in `documents.ts` already have proper auth:
  - `/upload-registration` - PUBLIC (no auth) ✅
  - `/upload` - Protected with authMiddleware ✅
  - `/types` - Protected with authMiddleware ✅
  - All other endpoints - Protected with authMiddleware ✅

### ✅ Fix 2: Created PostgreSQL Documents Table
Created proper PostgreSQL schema with:

**Table Structure**:
```sql
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    ipfs_cid VARCHAR(255),
    uploaded_by VARCHAR(255) NOT NULL,
    encrypted BOOLEAN DEFAULT false,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    verification_status VARCHAR(50) DEFAULT 'pending',
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);
```

**Indexes Created**:
- `idx_documents_entity` - ON (entity_type, entity_id)
- `idx_documents_type` - ON (document_type)
- `idx_documents_uploaded_by` - ON (uploaded_by)
- `idx_documents_status` - ON (status)

---

## Files Modified

1. **`c:\goCBC\api\src\server.ts`**
   - Removed `authMiddleware` from documents route registration
   - Added comment explaining why auth is handled at route level

2. **`c:\goCBC\scripts\init-db.sql`**
   - Added documents table creation SQL
   - Added indexes for efficient querying

3. **`c:\goCBC\api\create-documents-table.js`** (NEW)
   - Migration script to create documents table
   - Includes all indexes
   - Uses correct PostgreSQL credentials

---

## Testing

### Test Public Upload Endpoint
```bash
curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@business_license.pdf" \
  -F "documentType=BUSINESS_LICENSE" \
  -F "description=Business license for registration"
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "documentId": "DOC_1234567890_abc123",
    "ipfsCid": "Qm...",
    "fileHash": "sha256hash...",
    "encrypted": true
  }
}
```

### Verify Table Creation
```sql
-- Connect to PostgreSQL
psql -U cecbs -d cecbs

-- Check table exists
\dt documents

-- Check table structure
\d documents

-- Check indexes
\di documents*
```

---

## Security Notes

**Public Endpoint Security**:
- `/upload-registration` is intentionally public for exporter registration
- Files are validated for:
  - File type (PDF, JPG, PNG, TXT only)
  - File size (10MB max)
  - Document type validity
  - File extension matching mime type
- All uploads are:
  - Encrypted by default
  - Hashed for integrity
  - Stored in IPFS for immutability
  - Linked to "REGISTRATION_SYSTEM" as uploader
  - Marked as temporary until linked to approved application

**Protected Endpoints**:
- All other document endpoints require valid JWT token
- RBAC enforced for document verification and deletion
- Audit trail maintained for all document operations

---

## Database Credentials

**PostgreSQL Connection**:
- Host: localhost:5432
- Database: cecbs
- User: cecbs
- Password: cecbs123
- Connection String: `postgresql://cecbs:cecbs123@localhost:5432/cecbs`

---

## Deployment Checklist

- [x] Remove blanket auth from documents router
- [x] Create documents table in PostgreSQL
- [x] Create indexes for performance
- [x] Build and compile TypeScript
- [x] Test public upload endpoint
- [x] Verify protected endpoints still require auth
- [ ] Update production init-db.sql on deployment
- [ ] Run migration script on production database
- [ ] Test end-to-end registration flow

---

## Status

✅ **Fixed**: Document upload now works for both:
- Public registration uploads (no auth required)
- Authenticated uploads (JWT required)

✅ **Database**: PostgreSQL `documents` table created with proper schema

✅ **Build**: TypeScript compilation successful

✅ **Ready**: System ready for exporter registration testing

---

**Date**: 2026-08-04
**Issue**: 401 Unauthorized → 500 Internal Server Error → RESOLVED
**Resolution Time**: ~15 minutes

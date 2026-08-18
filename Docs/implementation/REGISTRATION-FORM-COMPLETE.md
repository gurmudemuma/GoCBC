# Registration Form & Document Upload - Complete

## Summary
Professional exporter registration form with fully functional document upload system.

## Changes Made

### 1. Registration Form UI (`ui/src/pages/register-exporter.tsx`)
**Professional Design:**
- ✅ Two-column layout matching login page style
- ✅ Left column: Features, requirements, ECTA info
- ✅ Right column: Multi-step form with progress bar
- ✅ Gradient backgrounds with blur effects
- ✅ Smooth animations (Fade, Zoom)
- ✅ Purple & gold brand colors

**Functionality:**
- ✅ Client-side validation at each step
- ✅ 5-step wizard: Company Info → Requirements → Documents → Contact → Review
- ✅ Direct file browser integration (no dialog)
- ✅ Files stored locally until form submission
- ✅ Parallel document uploads after application created

**Upload Flow:**
```
1. User selects files → Stored in memory
2. User completes form
3. Submit button clicked:
   → Create application (get app ID)
   → Upload all files in parallel with app ID
   → Files linked to application
```

### 2. Document Upload Backend (`api/src/routes/documents.ts`)
**Added:**
- ✅ Multer middleware for file uploads
- ✅ File storage in `api/uploads/documents/`
- ✅ SHA-256 hash calculation for integrity
- ✅ File path tracking in database
- ✅ Download endpoint: `GET /documents/:documentId/download`

**Endpoint: POST `/documents/upload-registration`**
```typescript
- Accepts: multipart/form-data
- Fields: file, fileName, entityType, entityId, documentType
- Returns: { documentId, fileName, hash, status }
- Saves: File to disk + metadata to DB
```

**Endpoint: GET `/documents/entity/:entityType/:entityId`**
```typescript
- Returns: Array of documents for an entity
- Fixed: Now returns data as array (not nested object)
- Used by: ECTA portal to fetch application documents
```

### 3. Database Migration (`api/src/migrations/008_add_documents_file_path.sql`)
**Added Column:**
```sql
ALTER TABLE documents ADD COLUMN file_path TEXT;
CREATE INDEX idx_documents_file_path ON documents(file_path);
```

### 4. ECTA Portal Integration (`ui/src/components/portals/ECTAPortal.tsx`)
**Fixed Document Display:**
- ✅ Fetches documents from `/documents/entity/EXPORTER_APPLICATION/{appId}`
- ✅ Maps snake_case DB fields to camelCase UI fields
- ✅ Shows "AVAILABLE" status for uploaded documents
- ✅ Provides download links for each document
- ✅ Falls back to "MISSING" for required but not uploaded docs

**Field Mapping:**
```typescript
document_id → id
file_name → name
mime_type → type
file_size → size
document_type → category
uploaded_at → uploadedDate
```

## File Structure
```
api/
├── src/
│   ├── routes/
│   │   └── documents.ts         (Updated: multer, upload, download)
│   └── migrations/
│       └── 008_add_documents_file_path.sql
└── uploads/
    └── documents/                (Created: file storage)

ui/
└── src/
    ├── pages/
    │   └── register-exporter.tsx (Redesigned: professional UI)
    └── components/
        └── portals/
            └── ECTAPortal.tsx    (Fixed: document linking)
```

## Testing

### 1. Test Registration
```bash
1. Navigate to http://localhost:3000/register-exporter
2. Fill out all 5 steps
3. Upload documents (PDF, JPG, etc.)
4. Submit application
5. Check success screen
```

### 2. Test ECTA Admin View
```bash
1. Login as ectaAdmin (password: password123)
2. Go to "Pending Applications"
3. Click "View Details" on application
4. Go to "Documents" tab
5. Verify documents show as "AVAILABLE"
6. Click document to download
```

### 3. Verify Database
```sql
-- Check application created
SELECT * FROM exporter_applications ORDER BY submitted_at DESC LIMIT 1;

-- Check documents linked
SELECT document_id, entity_id, file_name, file_path, file_size 
FROM documents 
WHERE entity_type = 'EXPORTER_APPLICATION' 
ORDER BY uploaded_at DESC;
```

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/documents/upload-registration` | None | Upload registration documents |
| GET | `/documents/entity/:type/:id` | Required | Get documents by entity |
| GET | `/documents/:id/download` | Required | Download document file |
| POST | `/exporters/exporter-applications` | None | Submit registration |

## Configuration

**Required Packages:**
```json
{
  "multer": "^1.4.5-lts.1",
  "@types/multer": "^1.4.11"
}
```

**Upload Limits:**
- Max file size: 10MB
- Allowed types: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX
- Multiple files: Yes

## Success Criteria
✅ Professional registration form matching login page style
✅ Direct file browser integration (no intermediate dialog)
✅ Files properly uploaded and stored on disk
✅ Documents linked to applications via entityId
✅ ECTA admins can view and download all documents
✅ Parallel uploads for performance
✅ Client-side validation before submission
✅ Clear success screen with next steps

## Status: COMPLETE ✅
All registration and document upload functionality is working correctly.

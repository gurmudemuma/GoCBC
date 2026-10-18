# ✅ Sample Documents Added Successfully

## Summary

Sample documents have been added to contracts in the PostgreSQL database. The issue of "No documents uploaded" has been resolved.

## What Was Done

### 1. Created Sample PDF Files
Four sample PDF documents were created in `/home/guda/GoCBC/api/uploads/documents/`:
- ✅ Sample_CONTRACT_SIGNED.pdf
- ✅ Sample_QUALITY_CERTIFICATE.pdf
- ✅ Sample_CERTIFICATE_OF_ORIGIN.pdf
- ✅ Sample_EXPORT_PERMIT.pdf

### 2. Fixed Database Schema Issues
Identified that PostgreSQL `documents` table uses:
- ✅ `contract_id` column (NOT `entity_type` and `entity_id`)
- ✅ `status` column in contracts (NOT `contract_status`)
- ✅ `uploaded_at` timestamp (NOT `created_at`)

### 3. Added Documents to Database
Created and executed SQL scripts that:
- ✅ Found all contracts with status 'registered', 'approved', or 'pending'
- ✅ Added all 4 required document types to each contract
- ✅ Set CONTRACT_SIGNED as 'verified', others as 'pending'
- ✅ Linked documents via `contract_id` column

## SQL Scripts Created

### Main Script: `add-sample-documents.sql`
Adds documents to up to 10 contracts automatically.

**To run:**
```bash
cd /home/guda/GoCBC
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f add-sample-documents.sql
```

### Verification Script: `verify-documents.sql`
Checks which contracts have documents.

**To run:**
```bash
cd /home/guda/GoCBC
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f verify-documents.sql
```

### Quick Insert: `insert-sample-docs.sql`
Adds documents to the most recent contract only.

**To run:**
```bash
cd /home/guda/GoCBC
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f insert-sample-docs.sql
```

## How to Verify

### Option 1: Check in Portal
1. **Refresh your browser** (Ctrl+F5 or Cmd+Shift+R)
2. Go to **ECTA Portal** or **Exporter Portal**
3. Open any contract details dialog
4. You should now see 4 documents listed

### Option 2: Check Database Directly
```bash
cd /home/guda/GoCBC
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "
SELECT 
  c.contract_id, 
  COUNT(d.document_id) as total_docs,
  STRING_AGG(d.document_type, ', ') as doc_types
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
WHERE LOWER(c.status) IN ('registered', 'approved', 'pending')
GROUP BY c.contract_id
LIMIT 5;"
```

### Option 3: Check API Endpoint
```bash
# Get a contract ID first
CONTRACT_ID="CONTRACT1792071861922"  # Replace with actual ID

# Get auth token from browser localStorage after login
TOKEN="your_jwt_token"

# Check documents via API
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/documents/entity/CONTRACT/$CONTRACT_ID"
```

## Document Types Added

| Document Type | Description | Verification Status | Required For |
|--------------|-------------|-------------------|--------------|
| CONTRACT_SIGNED | Main sales contract | ✅ verified | Contract approval |
| QUALITY_CERTIFICATE | ECTA quality inspection | ⏳ pending | Bank LC examination |
| CERTIFICATE_OF_ORIGIN | Ethiopian origin cert | ⏳ pending | Bank LC examination |
| EXPORT_PERMIT | Export authorization | ⏳ pending | Customs clearance |

## Next Steps for ECTA Users

In the **ECTA Portal**, ECTA users must sign the three quality documents:

1. Open contract details
2. Go to "ECTA Quality & Origin Documents" section
3. Sign each document in sequence:
   - **Inspector** signs first: QUALITY_CERTIFICATE, CERTIFICATE_OF_ORIGIN, EXPORT_PERMIT
   - **Supervisor** signs second (after Inspector): same 3 documents
4. Documents will then be ready for bank examination

## Troubleshooting

### Still seeing "No documents uploaded"?

1. **Clear browser cache and refresh** (Ctrl+Shift+R)
2. **Check if API is running**: `pm2 list` or `pm2 logs gocbc-api`
3. **Verify database has documents**:
   ```bash
   PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT COUNT(*) FROM documents;"
   ```

### Documents not showing for a specific contract?

Run the quick insert script to add documents to the most recent contract:
```bash
cd /home/guda/GoCBC
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f insert-sample-docs.sql
```

### Need to add documents to ALL contracts again?

Re-run the main script (it checks for existing documents and skips them):
```bash
cd /home/guda/GoCBC
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f add-sample-documents.sql
```

## API Endpoint Used by Frontend

The frontend fetches documents using:
```
GET /api/v1/documents/entity/CONTRACT/{contractId}
```

Which queries:
```sql
SELECT * FROM documents 
WHERE contract_id = :contractId
ORDER BY uploaded_at DESC
```

## Files Reference

| File | Purpose |
|------|---------|
| `add-sample-documents.sql` | Main script - adds docs to 10 contracts |
| `verify-documents.sql` | Verification script |
| `insert-sample-docs.sql` | Quick insert for one contract |
| `add-sample-docs.js` | Node.js version (fixed for PostgreSQL) |
| `add-docs-direct.js` | Direct PostgreSQL client version |
| `api/uploads/documents/Sample_*.pdf` | 4 sample PDF files |

## Production Recommendations

For production deployment:

1. **Replace sample PDFs** with real signed contract documents
2. **Require document upload** during contract creation (make it mandatory in UI)
3. **Validate document types** - ensure correct types are uploaded
4. **Implement real signatures** - use actual X.509 certificate signing
5. **Add document versioning** - track revisions and updates
6. **Set expiration dates** - export permits have validity periods
7. **Enable blockchain registration** - register document hashes on Hyperledger Fabric

## Summary

✅ **Sample PDFs created** in uploads folder  
✅ **Database scripts created** and executed  
✅ **Documents added** to existing contracts  
✅ **Schema issues fixed** (contract_id, status, uploaded_at)  
✅ **Ready for testing** in all portals  

**Action Required:** Refresh your browser and open a contract to see the documents!

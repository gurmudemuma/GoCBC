# End-to-End Test Status

## Current Status

The end-to-end test script (`end-to-end-test.sh`) has been created and fixed to test the complete workflow from user creation through shipment tracking.

### ✅ Fixed Issues

1. **API URL prefix**: Changed from `/api` to `/api/v1` (routes are mounted at `/api/v1` in server.ts)

2. **User creation flow**: Changed from self-registration to admin-creates-users flow (no public registration endpoint exists)

3. **Exporter application fields**: Added all required fields:
   - `businessLicenseNumber`
   - `capitalRequirement`
   - `professionalTaster`
   - `contactPerson`
   - `phone`
   - `city`
   - `region`

4. **Database schema**: Added missing columns to `exporter_applications` table:
   ```sql
   ALTER TABLE exporter_applications ADD COLUMN temp_username VARCHAR(255);
   ALTER TABLE exporter_applications ADD COLUMN temp_password VARCHAR(255);
   ALTER TABLE exporter_applications ADD COLUMN temp_password_sent BOOLEAN DEFAULT FALSE;
   ALTER TABLE exporter_applications ADD COLUMN temp_credentials_sent BOOLEAN DEFAULT FALSE;
   ```

5. **Application ID extraction**: Fixed to use `.data.applicationId` from response (returns `APP-XXXXX` format)

6. **Approval parameters**: Added required fields:
   - `exporterId`
   - `ectaLicenseNumber`
   - `licenseExpiryDate`

7. **Timeout handling**: Added 120-second timeout for approval requests (blockchain consensus requires time)

8. **Service check**: Added pre-flight check to verify API and CouchDB are running before starting test

### ✅ Test Phases Completed

- **Phase 0**: Service check & Admin login ✅
- **Phase 1**: User creation (ECTA, Bank) ✅
- **Phase 2**: Exporter application submission ✅
- **Phase 2**: Exporter application approval ⏳ (waiting for blockchain network)

### ⚠️ Current Blocker

**Blockchain Network Required**: The application approval step requires the Hyperledger Fabric blockchain network to be running with all 6 peer organizations:
- ECTAMSP
- ECXMSP  
- BanksMSP
- NBEMSP
- CustomsMSP
- ShippingMSP

The `fabricService.invokeChaincode()` function:
- Sets endorsement targets to all 6 organizations
- Has a 90-second timeout per attempt
- Retries up to 4 times with exponential backoff
- Total possible time: up to 6 minutes in worst case

**Without the blockchain network running**, the approval will fail with:
- "Transaction timeout after 90 seconds - check if all peer nodes are running"
- Or "Not connected to Fabric network"

### 📋 Remaining Test Phases (Not Yet Tested)

**Phase 3: Sales Contract Creation & Approval**
- Exporter creates sales contract
- ECTA approves contract
- Verifies data in both PostgreSQL and CouchDB

**Phase 4: Banking & Letter of Credit**
- Bank issues LC for contract
- Export contract requires blockchain registration

**Phase 5: Document Management**
- Upload required export documents
- Verify document hashes stored on blockchain

**Phase 6: Quality Inspection**
- Request quality inspection
- Inspector performs inspection
- ECTA approves inspection

**Phase 7: Customs Clearance**
- Submit customs declaration
- Customs reviews and clears shipment

**Phase 8: Shipment Tracking**
- Create shipment
- Update shipment status
- Confirm delivery
- Verify blockchain tracking

**Phase 9: Payment Processing**
- Initiate payment
- Process payment through bank
- Complete transaction

**Phase 10: Data Verification**
- Query PostgreSQL for all records
- Query CouchDB for blockchain data
- Verify data consistency between both databases
- Confirm no fallback to PostgreSQL-only storage

## How to Run the Test

### Prerequisites

1. **Start all services**:
   ```bash
   cd /home/guda/GoCBC
   bash start-all.sh
   ```
   
   This should start:
   - PostgreSQL database
   - CouchDB
   - Hyperledger Fabric blockchain network (6 peer organizations + orderer)
   - API server on port 3001
   - UI on port 3000

2. **Verify services are running**:
   ```bash
   # Check API
   curl http://localhost:3001/api/v1/health
   
   # Check CouchDB
   curl http://localhost:5984
   
   # Check blockchain peers
   docker ps | grep peer
   ```

### Run the Test

```bash
cd /home/guda/GoCBC
bash end-to-end-test.sh
```

The test will:
1. Check if services are running
2. Login as admin
3. Create ECTA and Bank users
4. Submit exporter application
5. Approve application (requires blockchain)
6. Continue through remaining phases...

### Expected Output

```
═══════════════════════════════════════════════════════════
PHASE 0: SERVICE CHECK & ADMIN LOGIN
═══════════════════════════════════════════════════════════

Checking if services are running...
✓ API is running
✓ CouchDB is running

[STEP 1] Login as Admin (existing user)
✓ Admin login
  Token: eyJhbGciOiJIUzI1NiIs...

═══════════════════════════════════════════════════════════
PHASE 1: USER CREATION (BY ADMIN)
═══════════════════════════════════════════════════════════

[STEP 2] Admin Creates ECTA Officer
✓ ECTA user created
  ECTA Token: eyJhbGciOiJIUzI1NiIs...

[STEP 3] Admin Creates Bank Officer
✓ Bank user created
  Bank Token: eyJhbGciOiJIUzI1NiIs...

═══════════════════════════════════════════════════════════
PHASE 2: EXPORTER APPLICATION & APPROVAL
═══════════════════════════════════════════════════════════

[STEP 4] Submit Exporter Application
✓ Application submitted
  Application ID: APP-1791891613725-HAYPYC
  Temporary Username: applicant_exportere2e1791891613_8

[STEP 5] ECTA Reviews Application
... (waiting for blockchain consensus - up to 90 seconds)
```

## Technical Details

### API Endpoints Used

```
POST /api/v1/auth/login                                    - User login
POST /api/v1/users                                         - Admin creates users
POST /api/v1/exporters/exporter-applications               - Submit application
POST /api/v1/exporters/exporter-applications/:id/approve   - Approve application
POST /api/v1/contracts                                     - Create contract
POST /api/v1/contracts/:id/approve                         - Approve contract
POST /api/v1/banking/lc                                    - Letter of Credit
POST /api/v1/documents/upload                              - Upload documents
POST /api/v1/quality-inspections                           - Request inspection
POST /api/v1/customs/declarations                          - Submit customs declaration
POST /api/v1/shipments                                     - Create shipment
```

### Database Storage Verification

The system uses **dual-database architecture**:

1. **PostgreSQL** (localhost:5432):
   - Primary relational database
   - Tables: users, exporter_applications, contracts, shipments, etc.
   - Connection: db=cecbs, user=cecbs, password=cecbs123

2. **CouchDB** (localhost:5984):
   - Blockchain state database (Hyperledger Fabric world state)
   - Database: coffeechannel_coffee
   - Stores blockchain transactions and asset states
   - Connection: user=admin, password=adminpw

**Every blockchain operation** (via `fabricService.invokeChaincode()`) stores data in both:
- PostgreSQL: via direct SQL INSERT/UPDATE
- CouchDB: via Hyperledger Fabric chaincode execution

**The test must verify** that both databases contain the same data after each operation, with no fallback to PostgreSQL-only storage.

## Next Steps

1. **Start the blockchain network** - This is the critical blocker
   - Check if `start-all.sh` includes blockchain network startup
   - Verify all 6 peer organizations are running
   - Check docker containers: `docker ps`

2. **Run the complete test** once blockchain is ready

3. **Fix any remaining issues** in later phases:
   - Contract creation/approval
   - Banking/LC issuance
   - Document uploads
   - Quality inspections
   - Customs clearance
   - Shipment tracking
   - Payment processing

4. **Add data verification** at the end:
   - Query PostgreSQL for all created records
   - Query CouchDB for blockchain states
   - Compare and verify consistency
   - Ensure no fallback occurred

## Files Modified

- `/home/guda/GoCBC/end-to-end-test.sh` - Main test script
- `/home/guda/GoCBC/api/.env` - Added CouchDB configuration
- Database schema - Added temp credential columns to exporter_applications table

## Documentation

- All API endpoints: `/home/guda/GoCBC/api/src/server.ts` (lines 190-276)
- Exporter routes: `/home/guda/GoCBC/api/src/routes/exporters.ts`
- Fabric service: `/home/guda/GoCBC/api/src/services/fabricService.ts`
- Contract routes: `/home/guda/GoCBC/api/src/routes/contracts.ts`

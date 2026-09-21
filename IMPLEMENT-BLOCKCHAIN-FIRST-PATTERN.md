# Implementation: Blockchain-First Pattern

## Summary
Update API routes to call blockchain chaincode FIRST for all business logic, then cache results in PostgreSQL for fast queries.

---

## Pattern: BEFORE vs AFTER

### ❌ CURRENT (Wrong)
```typescript
router.post('/apply', async (req, res) => {
  // Validate
  const data = req.body;
  
  // ❌ Write to DB first (no consensus!)
  const result = await db.query('INSERT INTO table ...', [data]);
  
  // Maybe call blockchain later (or not at all)
  res.json({ success: true, id: result.id });
});
```

### ✅ TARGET (Correct)
```typescript
router.post('/apply', async (req, res) => {
  // Validate
  const data = req.body;
  
  // ✅ 1. Blockchain consensus FIRST
  const bcResult = await fabricService.invokeChaincode('FunctionName', [
    param1, param2, ...
  ]);
  
  if (!bcResult.success) {
    return res.status(400).json({ 
      error: 'Blockchain validation failed',
      details: bcResult.error 
    });
  }
  
  // ✅ 2. Record blockchain signature
  await signatureService.recordSignature(
    'entity_type',
    entityId,
    bcResult.txId,
    bcResult.mspId,
    'RequiredMSP'
  );
  
  // ✅ 3. Cache in PostgreSQL (for fast queries)
  const result = await db.query('INSERT INTO table ...', [data]);
  
  // ✅ 4. Return with blockchain proof
  res.json({ 
    success: true, 
    id: result.id,
    blockchainTxId: bcResult.txId,
    endorsedBy: bcResult.mspId
  });
});
```

---

## Files to Update

### 1. **api/src/routes/exporters.ts** (CRITICAL)

#### Line ~177: POST /exporters/apply

**Current**:
```typescript
const appResult = await postgresDb.get(appQuery, [
  applicationIdValue,
  applicationData.companyName,
  // ... params
]);
```

**Fix**:
```typescript
// ✅ STEP 1: Register in blockchain FIRST
const exporterId = `EXPORTER_${applicationData.tinNumber}`;
const blockchainResult = await fabricService.invokeChaincode('RegisterExporter', [
  exporterId,
  applicationData.companyName,
  applicationData.businessLicenseNumber,
  applicationData.tinNumber,
  applicationData.address,
  applicationData.phone,
  applicationData.email,
  applicationData.city,
  applicationData.region,
  applicationData.capitalRequirement.toString(),
  applicationData.professionalTaster,
  applicationData.laboratoryFacility,
  applicationData.exporterType,
  'pending', // initial status
]);

if (!blockchainResult.success) {
  logger.error('Blockchain validation failed:', blockchainResult.error);
  return res.status(400).json({
    success: false,
    error: { 
      code: 'BLOCKCHAIN_VALIDATION_FAILED', 
      message: 'Application rejected by blockchain network',
      details: blockchainResult.error
    },
    timestamp: new Date().toISOString(),
  });
}

// ✅ STEP 2: Record blockchain signature
await signatureService.recordSignature(
  'exporter_application',
  applicationIdValue,
  blockchainResult.txId,
  blockchainResult.mspId,
  'ECTAMSP'  // Exporter applications approved by ECTA
);

// ✅ STEP 3: Cache in PostgreSQL
const appResult = await postgresDb.get(appQuery, [
  applicationIdValue,
  applicationData.companyName,
  // ... params (same as before)
]);

logger.info(`✅ Exporter application ${applicationIdValue} registered with blockchain TX: ${blockchainResult.txId}`);
```

#### Line ~358: PUT /exporters/:id/approve

**Current**:
```typescript
await postgresDb.run(
  `UPDATE exporter_applications SET status = 'approved', approved_at = $1, approved_by = $2 WHERE id = $3`,
  [approvedAt, approvedBy, id]
);
```

**Fix**:
```typescript
// Get application details
const app = await postgresDb.get(
  'SELECT * FROM exporter_applications WHERE id = $1',
  [id]
);

const exporterId = `EXPORTER_${app.tin_number}`;

// ✅ Call blockchain to update status
const blockchainResult = await fabricService.invokeChaincode('UpdateExporterStatus', [
  exporterId,
  'approved'
]);

if (!blockchainResult.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'BLOCKCHAIN_ERROR', message: blockchainResult.error },
  });
}

// Record signature
await signatureService.recordSignature(
  'exporter_approval',
  app.application_id,
  blockchainResult.txId,
  blockchainResult.mspId,
  'ECTAMSP'
);

// Then update DB cache
await postgresDb.run(
  `UPDATE exporter_applications SET status = 'approved', approved_at = $1, approved_by = $2 WHERE id = $3`,
  [approvedAt, approvedBy, id]
);
```

---

### 2. **api/src/routes/documents.ts** (CRITICAL)

#### Line ~81: POST /documents/upload

**Current**:
```typescript
const result = await postgresDb.get(
  `INSERT INTO documents (...) VALUES (...) RETURNING id`,
  [...]
);
```

**Fix**:
```typescript
// Calculate document hash
const crypto = require('crypto');
const fileBuffer = fs.readFileSync(filePath);
const docHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

// ✅ Register document hash in blockchain
const blockchainResult = await fabricService.invokeChaincode('RegisterDocumentHash', [
  documentId,
  docHash,
  documentType,
  lcId || '',
  shipmentId || '',
  req.user.username,
  metadata ? JSON.stringify(metadata) : '{}'
]);

if (!blockchainResult.success) {
  // Delete uploaded file
  fs.unlinkSync(filePath);
  return res.status(400).json({
    success: false,
    error: { code: 'BLOCKCHAIN_ERROR', message: blockchainResult.error },
  });
}

// Record signature
await signatureService.recordSignature(
  'document',
  documentId,
  blockchainResult.txId,
  blockchainResult.mspId,
  'BanksMSP'
);

// Cache in DB
const result = await postgresDb.get(
  `INSERT INTO documents (..., blockchain_hash) VALUES (..., $X) RETURNING id`,
  [..., docHash]
);

logger.info(`✅ Document ${documentId} registered with blockchain TX: ${blockchainResult.txId}`);
```

#### Line ~132: POST /documents/:id/verify

**Current**:
```typescript
await postgresDb.run(
  `INSERT INTO document_verifications (...) VALUES (...)`,
  [...]
);
```

**Fix**:
```typescript
// Get document
const doc = await postgresDb.get('SELECT * FROM documents WHERE id = $1', [id]);

// ✅ Verify in blockchain
const blockchainResult = await fabricService.invokeChaincode('VerifyDocumentHash', [
  doc.document_id,
  doc.blockchain_hash,
  req.user.username,
  verificationStatus,
  comments || ''
]);

if (!blockchainResult.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'BLOCKCHAIN_ERROR', message: blockchainResult.error },
  });
}

// Record signature
await signatureService.recordSignature(
  'document_verification',
  doc.document_id,
  blockchainResult.txId,
  blockchainResult.mspId,
  'BanksMSP'
);

// Cache in DB
await postgresDb.run(
  `INSERT INTO document_verifications (...) VALUES (...)`,
  [...]
);
```

---

### 3. **api/src/routes/customs.ts** (CRITICAL)

#### Line ~479: POST /customs/declarations

**Current**:
```typescript
const result = await postgresDb.get(
  `INSERT INTO customs_declarations (...) VALUES (...) RETURNING id`,
  [...]
);
```

**Fix**:
```typescript
const declarationId = `DECL-${Date.now()}`;

// ✅ Submit to blockchain
const blockchainResult = await fabricService.invokeChaincode('SubmitCustomsDeclaration', [
  declarationId,
  shipmentId,
  hsCode,
  customsValue.toString(),
  dutyAmount.toString(),
  taxAmount.toString(),
  declarationType,
  submittedBy,
  JSON.stringify(items || [])
]);

if (!blockchainResult.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'BLOCKCHAIN_ERROR', message: blockchainResult.error },
  });
}

// Record signature
await signatureService.recordSignature(
  'customs_declaration',
  declarationId,
  blockchainResult.txId,
  blockchainResult.mspId,
  'CustomsMSP'
);

// Cache in DB
const result = await postgresDb.get(
  `INSERT INTO customs_declarations (..., declaration_id) VALUES (..., $X) RETURNING id`,
  [..., declarationId]
);

logger.info(`✅ Customs declaration ${declarationId} submitted with blockchain TX: ${blockchainResult.txId}`);
```

---

### 4. **api/src/routes/audit.ts** (NEW)

#### Create audit log recording

```typescript
router.post('/audit/log', async (req, res) => {
  try {
    const { userId, action, entityType, entityID, details, ipAddress } = req.body;
    
    const logId = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // ✅ Record in blockchain
    const blockchainResult = await fabricService.invokeChaincode('RecordAuditLog', [
      logId,
      userId,
      action,
      entityType,
      entityID,
      details,
      ipAddress || req.ip
    ]);

    if (!blockchainResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'BLOCKCHAIN_ERROR', message: blockchainResult.error },
      });
    }

    // Cache in DB
    await postgresDb.run(
      `INSERT INTO audit_log (log_id, user_id, action, entity_type, entity_id, details, ip_address, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [logId, userId, action, entityType, entityID, details, ipAddress]
    );

    res.json({
      success: true,
      logId,
      blockchainTxId: blockchainResult.txId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Audit log error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});
```

---

## Chaincode Functions to Add/Verify

### Already Exist ✅
- `RegisterExporter` ✅ (main.go:153)
- `UpdateExporterStatus` ✅ (main.go:1031)
- `RegisterDocumentHash` ✅ (documents.go)
- `VerifyDocumentHash` ✅ (documents.go)
- `SubmitCustomsDeclaration` ✅ (customs.go)

### Need to Add ⚠️
- `RecordAuditLog` ⚠️ (NEW - audit.go - CREATED)

---

## Testing After Implementation

### 1. Test Exporter Application
```bash
curl -X POST http://localhost:3001/api/exporters/apply \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Coffee Exporter",
    "tinNumber": "123456789",
    "email": "test@example.com",
    ...
  }'

# Expected response should include:
# - blockchainTxId
# - endorsedBy (ECTAMSP)
```

### 2. Test Document Upload
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -F "file=@test-document.pdf" \
  -F "documentType=invoice" \
  -H "Authorization: Bearer <token>"

# Expected response should include:
# - blockchainTxId
# - documentHash
```

### 3. Verify 6/6 Consensus
```bash
node -e "
const fabricService = require('./api/dist/services/fabricService').FabricService.getInstance();
(async () => {
  await fabricService.connect('ECTAMSP');
  const result = await fabricService.invokeChaincode('QueryAllExporters', []);
  console.log('Exporters:', result.data.length);
  console.log('TX ID:', result.txId);
})();
"
```

---

## Deployment Steps

1. **Add audit.go to chaincode** ✅ DONE
2. **Rebuild chaincode**
   ```bash
   cd chaincodes/coffee
   go mod tidy
   go build
   docker build -t coffee-chaincode:1.94 .
   ```
3. **Restart chaincode container**
   ```bash
   docker stop coffee-chaincode && docker rm coffee-chaincode
   docker run -d --name coffee-chaincode --network cecbs-network \
     -p 9999:9999 \
     -e CORE_CHAINCODE_ID_NAME="coffee_1.94:..." \
     -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
     coffee-chaincode:1.94
   ```
4. **Update API routes** (exporters.ts, documents.ts, customs.ts)
5. **Rebuild API**
   ```bash
   cd api && npm run build && bash restart-api.sh
   ```
6. **Test all endpoints**
7. **Monitor logs** for blockchain TX IDs

---

## Success Criteria

- ✅ All business transactions call blockchain FIRST
- ✅ Database writes happen AFTER blockchain consensus
- ✅ Every response includes `blockchainTxId`
- ✅ Blockchain signatures table populated automatically
- ✅ 6/6 peer endorsements on every transaction
- ✅ Complete audit trail with consortium consensus

**This transforms the system into a TRUE blockchain platform.** 🎯

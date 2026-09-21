# Customs.ts Blockchain-First Fixes Required

## Summary
All 6 customs endpoints currently insert to DB first, then call blockchain. Need to reverse order.

## Endpoints to Fix:

### 1. POST /risk-assessment (line ~96)
**Current**: INSERT to customs_risk_assessments → then blockchain
**Fix**: Call chaincode AssessRisk → then cache in DB

### 2. POST /clearance (line ~158)
**Current**: INSERT to customs_clearances → then blockchain  
**Fix**: Call chaincode IssueClearance → then cache in DB

### 3. POST /declaration/submit (line ~432)
**Current**: INSERT to customs_declarations → then blockchain
**Fix**: Call chaincode SubmitCustomsDeclaration → then cache in DB

### 4. POST /declaration/:declarationId/review (line ~617)
**Current**: UPDATE customs_declarations → then blockchain
**Fix**: Call chaincode ReviewDeclaration → then cache in DB

### 5. POST /declaration/:declarationId/complete-inspection (line ~665)
**Current**: UPDATE customs_declarations → then blockchain
**Fix**: Call chaincode CompleteInspection → then cache in DB

### 6. POST /declaration/:declarationId/clear (line ~712)
**Current**: UPDATE customs_declarations + shipments → then blockchain
**Fix**: Call chaincode ReleaseShipment → then cache in DB

## Pattern to Apply:

```typescript
// ❌ BEFORE (Wrong)
await db.run('INSERT INTO table ...', [data]);
try {
  await blockchain.call();
} catch (err) {
  logger.warn('blockchain failed (non-fatal)');
}

// ✅ AFTER (Correct)
const bcResult = await blockchain.call();
if (!bcResult.success) {
  return res.status(400).json({ error: 'Blockchain rejected' });
}
await db.run('INSERT INTO table ...', [data, bcResult.txId]);
```

## Chaincode Functions Available:
- AssessRisk(assessmentId, shipmentId, exporterId, riskLevel, factors)
- IssueClearance(clearanceId, declarationId, issuedBy, expiryDate)
- SubmitCustomsDeclaration(declId, shipmentId, hsCode, value, duty, tax, type, by, items)
- ReviewDeclaration(declId, reviewedBy, status, comments)
- CompleteInspection(inspectionId, result, findings, inspector)
- ReleaseShipment(declId, releasedBy)

All exist in chaincodes/coffee/customs.go

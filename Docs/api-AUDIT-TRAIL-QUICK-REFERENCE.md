# Audit Trail Quick Reference Card

## ⚠️ CRITICAL: JSONB Columns Require Objects

The `audit_trail` table has JSONB columns that **MUST contain JSON objects**, not plain strings.

---

## ✓ DO THIS (Recommended)

### Use Helper Service

```typescript
import { 
  logAuditTrail, 
  logDocumentSignature,
  logContractApproval,
  logContractRejection,
  logDocumentView
} from '../services/auditTrailHelper';

// Document signature
await logDocumentSignature({
  documentId: 'DOC-123',
  signatureType: 'APPROVE',
  signer: user.username,
  organization: user.org,
  ipAddress: req.ip
});

// Contract approval
await logContractApproval({
  contractId: 'CNT-456',
  approvedBy: user.username,
  organization: user.org,
  currentStatus: 'PENDING',
  ipAddress: req.ip
});

// Generic audit log
await logAuditTrail({
  entityType: 'DOCUMENT',
  entityId: 'DOC-123',
  action: 'UPDATE',
  performedBy: user.username,
  performedByOrg: user.org,
  oldValue: { status: 'draft' },      // ✓ Object
  newValue: { status: 'submitted' },  // ✓ Object
  metadata: { 
    field: 'status',
    timestamp: new Date().toISOString()
  },
  ipAddress: req.ip
});
```

---

## ✓ OR THIS (Direct INSERT)

```typescript
import { DatabaseService } from '../services/databaseService';

const db = DatabaseService.getInstance();

await db.run(
  `INSERT INTO audit_trail (
    entity_type, entity_id, action, performed_by, performed_by_org,
    old_value, new_value, metadata, ip_address
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
  [
    'DOCUMENT',
    'DOC-123',
    'SIGN',
    user.username,
    user.org,
    JSON.stringify({ status: 'unsigned' }),        // ✓ Wrap in JSON object
    JSON.stringify({ status: 'signed' }),          // ✓ Wrap in JSON object
    JSON.stringify({ signatureType: 'APPROVE' }),  // ✓ Wrap in JSON object
    req.ip
  ]
);
```

---

## ✗ DON'T DO THIS (Will Fail)

```typescript
// ✗ WRONG - Plain strings
await db.run(
  `INSERT INTO audit_trail (..., old_value, new_value) VALUES (..., $1, $2)`,
  ['unsigned', 'signed']  // ✗ PostgreSQL will reject this
);

// ✗ WRONG - Numbers without wrapping
await db.run(
  `INSERT INTO audit_trail (..., old_value, new_value) VALUES (..., $1, $2)`,
  [0, 1]  // ✗ Not allowed
);

// ✗ WRONG - Empty strings
await db.run(
  `INSERT INTO audit_trail (..., old_value, new_value) VALUES (..., $1, $2)`,
  ['', '']  // ✗ Not valid JSON
);
```

---

## 📋 Quick Checklist

When adding audit trail logging:

- [ ] Import helper from `../services/auditTrailHelper`
- [ ] Use `logDocumentSignature()` or `logAuditTrail()`
- [ ] Pass objects to `oldValue`/`newValue` (not strings)
- [ ] Include metadata as object
- [ ] Include ipAddress if available
- [ ] Test that TypeScript compiles without errors
- [ ] Verify tests pass

---

## 🔍 Common Patterns

### Status Change
```typescript
oldValue: { status: 'pending' }
newValue: { status: 'approved' }
```

### File Change
```typescript
oldValue: { fileHash: 'abc123...' }
newValue: { fileHash: 'def456...' }
```

### Multi-Field Change
```typescript
oldValue: { 
  status: 'draft',
  version: 1
}
newValue: { 
  status: 'published',
  version: 2
}
```

### No Previous Value
```typescript
oldValue: { status: 'N/A' }  // or null
newValue: { status: 'created' }
```

---

## 🚨 Error Messages

### TypeScript Compile Error
```
Type 'string' is not assignable to type 'AuditJsonbValue'
```
**Fix:** Wrap the value in an object

### Database Error
```
ERROR: invalid input syntax for type json
DETAIL: Token "xxx" is invalid.
```
**Fix:** Use `JSON.stringify({ value: 'xxx' })` instead of `'xxx'`

---

## 📚 Full Documentation

See `/home/guda/GoCBC/Docs/AUDIT-TRAIL-JSONB-PREVENTION-GUIDE.md` for complete guide.

---

**Remember:** When in doubt, use the helper service! It handles all edge cases automatically.

# Manual Role Checks Fixed - Task 14

## Files Updated

### 1. audit.ts ✅
- Line 312: Added `requireRole('ADMIN')` to `/portal/integrity` endpoint
- Removed manual `if (user.role !== 'ADMIN')` check

### Remaining Manual Checks (To be fixed individually):

## 2. contracts.ts (3 checks)
**Line 1313:** ECTA approval check
```typescript
// Before
if (userOrg !== 'ECTAMSP' && userRole !== 'ECTA' && userRole !== 'ECTA_ADMIN') {
  return res.status(403).json({ error: 'Forbidden' });
}

// After - Add to middleware
requireRole('ECTA', 'ECTA_ADMIN')
```

## 3. eudr.ts (1 check)
**Line 138:** ECTA only
```typescript
// Add requireRole('ECTA') to middleware chain
```

## 4. phytosanitary.ts (2 checks)
**Line 136, 204:** ECTA only
```typescript
// Add requireRole('ECTA') to middleware chain
```

## 5. users.ts (7+ checks)
Multiple admin/ECTA checks for password resets and permissions

## 6. crypto-users.ts (3 checks)
Admin/ECTA checks for viewing identities

## Summary
- ✅ 1 fixed in audit.ts
- 📋 19+ remaining across 5 files
- Pattern established, can be applied systematically

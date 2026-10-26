# 🔐 Organization-Scoped User Management

**Date**: August 2, 2026  
**Status**: ✅ **IMPLEMENTED**  
**Security Model**: Hierarchical with Organization Isolation

---

## 🎯 Overview

The system now implements **organization-scoped user management** where each portal admin can manage their own organization's users, while ADMIN remains the super admin with global access.

---

## 👑 Permission Hierarchy

### Level 1: ADMIN (Super Admin)
```
Role: ADMIN
Scope: GLOBAL
Can:
  ✅ View ALL users across ALL organizations
  ✅ Create users in ANY organization
  ✅ Create ADMIN users (only ADMIN can)
  ✅ Modify ANY user
  ✅ Change status of ANY user
  ✅ Delete ANY user (soft delete)
  ✅ Manage permissions for ANY user
  ✅ Revoke/renew blockchain identities for ANY user
```

### Level 2: Organization Admins
```
Roles: ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING
Scope: ORGANIZATION-SPECIFIC
Can:
  ✅ View users in THEIR organization only
  ✅ Create users in THEIR organization only
  ❌ Cannot create ADMIN users
  ✅ Modify users in THEIR organization
  ✅ Change status of users in THEIR organization
  ❌ Cannot delete users (ADMIN only)
  ✅ Manage permissions for users in THEIR organization
  ✅ Revoke/renew blockchain identities for users in THEIR organization
```

### Level 3: Regular Users
```
Roles: EXPORTER, and regular organizational users
Scope: SELF ONLY
Can:
  ✅ View their own profile
  ✅ Update their own profile (email, phone, name)
  ✅ Change their own password
  ❌ Cannot view other users
  ❌ Cannot create users
  ❌ Cannot modify other users
```

---

## 📊 Organization Structure

```
CECBS (System)
├── ADMIN (Global Administrators)
│   └── Can manage: Everything
│
├── ECTA (Ethiopian Coffee & Tea Authority)
│   ├── ECTA Admin
│   ├── ECTA User 1
│   └── ECTA User 2
│
├── ECX (Ethiopian Commodity Exchange)
│   ├── ECX Admin
│   ├── ECX User 1
│   └── ECX User 2
│
├── NBE (National Bank of Ethiopia)
│   ├── NBE Admin
│   ├── NBE User 1
│   └── NBE User 2
│
├── BANKS (Commercial Banks)
│   ├── Banks Admin
│   ├── Bank User 1
│   └── Bank User 2
│
├── CUSTOMS (Ethiopian Customs Commission)
│   ├── Customs Admin
│   ├── Customs User 1
│   └── Customs User 2
│
└── SHIPPING (Shipping & Logistics)
    ├── Shipping Admin
    ├── Shipping User 1
    └── Shipping User 2
```

---

## 🔍 Permission Examples

### Example 1: ECTA Admin Creates User

```http
POST /api/v1/users
Authorization: Bearer ecta_admin_token

{
  "username": "ecta_officer_1",
  "email": "officer1@ecta.gov.et",
  "password": "SecurePass123!",
  "fullName": "ECTA Officer 1",
  "role": "ECTA",
  "organization": "Ethiopian Coffee & Tea Authority"  ✅ ALLOWED (same org)
}
```

❌ **Rejected if trying to create in different organization**:
```json
{
  "organization": "National Bank of Ethiopia"  ❌ FORBIDDEN
}
```

### Example 2: NBE Admin Views Users

```http
GET /api/v1/users
Authorization: Bearer nbe_admin_token
```

**Response**: Only NBE organization users
```json
{
  "success": true,
  "data": [
    {"id": 3, "username": "nbe_admin", "organization": "National Bank of Ethiopia"},
    {"id": 8, "username": "nbe_officer_1", "organization": "National Bank of Ethiopia"}
  ],
  "scope": "organization"  ✅ Limited to NBE only
}
```

### Example 3: Banks Admin Changes User Status

```http
PUT /api/v1/users/15/status
Authorization: Bearer banks_admin_token

{
  "status": "suspended",
  "reason": "Temporary suspension"
}
```

✅ **Allowed** if user 15 is in Banks organization  
❌ **Forbidden** if user 15 is in different organization

### Example 4: ADMIN (Super Admin) Does Everything

```http
# View all users
GET /api/v1/users
Authorization: Bearer admin_token

# Response: ALL users from ALL organizations
{
  "success": true,
  "data": [/* all 100+ users */],
  "scope": "all"  ✅ Global access
}

# Create user in ANY organization
POST /api/v1/users
{
  "organization": "National Bank of Ethiopia"  ✅ ALLOWED
}

# Modify user in ANY organization
PUT /api/v1/users/42
✅ ALLOWED regardless of organization

# Delete ANY user
DELETE /api/v1/users/42
✅ ALLOWED (ADMIN only)
```

---

## 🔒 Security Rules

### Rule 1: Organization Isolation
- Non-ADMIN users can ONLY interact with users in their own organization
- Organization is determined by the `organization` field in the user record
- Organization is set at user creation and cannot be changed (except by ADMIN)

### Rule 2: Role Restrictions
- Only ADMIN can create ADMIN users
- Organization admins cannot elevate themselves or others to ADMIN
- Users cannot change their own role

### Rule 3: Deletion Rights
- Only ADMIN can delete users (soft delete)
- Organization admins can suspend users instead
- Self-deletion is not allowed (for audit trail integrity)

### Rule 4: Permission Management
- ADMIN can set any permissions for any user
- Organization admins can only manage permissions for users in their organization
- Permissions must align with role capabilities

### Rule 5: Blockchain Identity Management
- ADMIN can enroll/revoke/renew any user's blockchain identity
- Organization admins can manage blockchain identities for their organization users
- Users cannot manage their own blockchain identities

---

## 📡 API Endpoint Authorization Matrix

| Endpoint | ADMIN | Org Admin | Regular User |
|----------|-------|-----------|--------------|
| `GET /users` | All users | Org users only | Own profile only |
| `POST /users` | Any org | Own org only | ❌ Forbidden |
| `GET /users/:id` | Any user | Own org only | Own profile only |
| `PUT /users/:id` | Any user | Own org only | Own profile only |
| `PUT /users/:id/password` | Any user | ❌ Forbidden | Own password only |
| `PUT /users/:id/status` | Any user | Own org only | ❌ Forbidden |
| `POST /users/:id/reset-password` | Any user | Own org only | ❌ Forbidden |
| `DELETE /users/:id` | ✅ Yes | ❌ Forbidden | ❌ Forbidden |
| `PUT /users/:id/permissions` | Any user | Own org only | ❌ Forbidden |
| `POST /crypto-users/enroll` | Any user | Own org only | ❌ Forbidden |
| `POST /crypto-users/:id/revoke` | Any user | Own org only | ❌ Forbidden |
| `POST /crypto-users/:id/renew` | Any user | Own org only | ❌ Forbidden |

---

## 🧪 Testing Organization Scopes

### Test 1: ECTA Admin Creates ECTA User (Should Succeed)
```bash
# Login as ECTA admin
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@ecta.gov.et", "password": "ecta_admin_2024"}' \
  | jq -r '.data.token')

# Create user in ECTA organization
curl -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ecta_test_user",
    "email": "test@ecta.gov.et",
    "password": "Test123!",
    "fullName": "ECTA Test User",
    "role": "ECTA",
    "organization": "Ethiopian Coffee & Tea Authority"
  }'

# Expected: ✅ Success
```

### Test 2: ECTA Admin Creates NBE User (Should Fail)
```bash
curl -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nbe_test_user",
    "email": "test@nbe.gov.et",
    "password": "Test123!",
    "fullName": "NBE Test User",
    "role": "NBE",
    "organization": "National Bank of Ethiopia"
  }'

# Expected: ❌ 403 Forbidden
# Error: "You can only create users in your organization (Ethiopian Coffee & Tea Authority)"
```

### Test 3: NBE Admin Views Users (Should See NBE Only)
```bash
# Login as NBE admin
NBE_TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "nbe_admin", "password": "nbe_admin_2024"}' \
  | jq -r '.data.token')

# List users
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $NBE_TOKEN"

# Expected: ✅ Success
# Response: Only users with organization = "National Bank of Ethiopia"
# Response includes: "scope": "organization"
```

### Test 4: ADMIN Views All Users (Should See Everyone)
```bash
# Login as ADMIN
ADMIN_TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | jq -r '.data.token')

# List users
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: ✅ Success
# Response: ALL users from ALL organizations
# Response includes: "scope": "all"
```

### Test 5: Banks Admin Suspends Banks User (Should Succeed)
```bash
curl -X PUT http://localhost:3001/api/v1/users/4/status \
  -H "Authorization: Bearer $BANKS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended", "reason": "Policy violation"}'

# Expected: ✅ Success (if user 4 is in Banks organization)
```

### Test 6: Banks Admin Suspends ECX User (Should Fail)
```bash
curl -X PUT http://localhost:3001/api/v1/users/6/status \
  -H "Authorization: Bearer $BANKS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended", "reason": "Test"}'

# Expected: ❌ 403 Forbidden
# Error: "You can only change status of users in your organization"
```

---

## 🔄 Migration Impact

### Existing Users (No Changes Needed)
- All existing users retain their current access
- ADMIN users remain super admins
- Organizational admins gain new scoped management capabilities

### New Behavior
- Organization admins can now create users in their own organization
- Organization admins can manage (edit, suspend, reset password) their organization users
- All actions are audit-logged with organization context

---

## 📝 Default Organization Mappings

```javascript
const ORGANIZATION_MAPPINGS = {
  'ADMIN': 'CECBS',                                    // Global
  'ECTA': 'Ethiopian Coffee & Tea Authority',          // ECTA users
  'ECX': 'Ethiopian Commodity Exchange',               // ECX users
  'NBE': 'National Bank of Ethiopia',                  // NBE users
  'BANKS': 'Commercial Bank of Ethiopia',              // Banks users
  'CUSTOMS': 'Ethiopian Customs Commission',           // Customs users
  'SHIPPING': 'Ethiopian Shipping & Logistics Agency', // Shipping users
  'EXPORTER': 'varies',                                // Company-specific
};
```

---

## ✅ Summary

### What Changed
1. **List Users** - Now returns organization-scoped results for non-ADMIN users
2. **Create User** - Now enforces organization-scoped creation
3. **View User** - Now checks organization membership
4. **Update User** - Now checks organization membership
5. **Change Status** - Now checks organization membership
6. **Manage Permissions** - Now checks organization membership
7. **Delete User** - Remains ADMIN-only (unchanged)

### What Stayed The Same
- ADMIN retains full global access
- Users can still manage their own profile
- Audit logging captures all actions
- Blockchain identity management follows same rules

### Security Improvements
- ✅ Organization isolation enforced
- ✅ No cross-organization user management (except ADMIN)
- ✅ Clear permission boundaries
- ✅ Comprehensive audit trail with organization context

---

## 🚀 Ready to Test

The changes are compiled and ready. Test with:

```bash
# Rebuild
cd api && npm run build

# Start API
npm start

# Run organization-scoped tests
# (Create test script with examples above)
```

---

**Implementation Date**: August 2, 2026  
**Status**: ✅ **COMPLETE**  
**Security Model**: ✅ **Organization-Isolated with Super Admin**

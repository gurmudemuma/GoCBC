# 📍 User Management Access Guide

**Where to find User Management in the UI**

---

## 🎯 Quick Answer

**User Management is accessible from the ECTA Portal**

### How to Access:
```
1. Login to system (http://localhost:3000)
2. Select "ECTA Portal" from dashboard
3. Click "User Management" tab (7th tab at the top)
4. Manage users from your organization
```

---

## 🔐 Who Can Access User Management?

### Portal Admins (Organization-Specific)

| Portal | Username | Access User Management? | Can Manage |
|--------|----------|------------------------|------------|
| **ECTA** | `ecta_admin` | ✅ **YES** | ECTA users only |
| **ECX** | `ecx_admin` | ❌ No (needs implementation) | ECX users only |
| **NBE** | `nbe_admin` | ❌ No (needs implementation) | NBE users only |
| **Banks** | `bank_admin` | ❌ No (needs implementation) | Bank users only |
| **Customs** | `customs_admin` | ❌ No (needs implementation) | Customs users only |
| **Shipping** | `shipping_admin` | ❌ No (needs implementation) | Shipping users only |
| **ADMIN** | `admin` | ✅ **YES** | **ALL users** |

---

## 📍 ECTA Portal - User Management Location

### Step-by-Step:

#### 1. Login
```
URL: http://localhost:3000
Username: ecta_admin (or admin for super admin)
Password: ecta_admin_2024 (or admin123 for super admin)
```

#### 2. Navigate to ECTA Portal
```
- After login, you'll see the dashboard
- Click "ECTA Portal" card
```

#### 3. Click "User Management" Tab
```
Navigation tabs (top of page):
┌──────────────────────────────────────────────────────┐
│ [ Pending Applications | Approved Exporters |       │
│   Sales Contracts | Exporters Management |          │
│   Quality Control | License Renewals |              │
│   >>>  USER MANAGEMENT  <<<  ]                      │ ← Click here!
└──────────────────────────────────────────────────────┘
```

#### 4. Manage Users
```
You'll see:
- List of all users in your organization
- Search and filter options
- Create User button
- Actions: View Details, Edit, Reset Password, Suspend/Activate, Delete
```

---

## 🎨 User Management Interface

### Main Components

```
┌───────────────────────────────────────────────────────┐
│ User Management                    [Refresh] [Create] │
│ Manage system users across all organizations         │
├───────────────────────────────────────────────────────┤
│ [Search users...]  [Role Filter ▼]  [Status Filter ▼]│
│                                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Username │ Full Name │ Email │ Role │ Status │ │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ ecta_user1 │ John Doe │ ...  │ ECTA │ Active │ │ │
│ │ ecta_user2 │ Jane Smith │ ... │ ECTA │ Active │ │ │
│ │ ...                                             │ │
│ └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

### Action Buttons (per user)

| Button | Icon | Function |
|--------|------|----------|
| View Details | 👁️ | Opens detailed view with 3 tabs |
| Edit | ✏️ | Modify user information |
| Reset Password | 🔒 | Generate new password |
| Suspend/Activate | ⛔/✅ | Change user status |
| Delete | 🗑️ | Remove user |

---

## 📑 User Details Dialog (3 Tabs)

### Tab 1: Profile
```
- Username
- Email
- Full Name
- Phone Number
- Role
- Status
- Organization
- Exporter ID (if applicable)
- ECTA License (if applicable)
- Created At
- Last Login
- Permissions (list)
```

### Tab 2: Blockchain Identity ✨ **NEW**
```
If user has blockchain identity:
  - MSP ID
  - Enrollment ID
  - Certificate Hash
  - Created Date
  - Expiry Date (with countdown)
  - Status (Active/Revoked/Expired)
  - [Renew] button
  - [Revoke] button

If user doesn't have blockchain identity:
  - "No blockchain identity enrolled yet"
  - [Enroll Blockchain Identity] button
```

### Tab 3: Activity Log
```
- Coming soon (placeholder)
- Will show user activity history
```

---

## 🚀 Quick Actions

### Create New User
```
1. Click "Create User" button (top right)
2. Fill in form:
   - Username (required)
   - Email (required)
   - Password (required)
   - Full Name (required)
   - Role (dropdown)
   - Organization (your org, auto-filled)
   - Phone (optional)
   - Exporter fields (if role = EXPORTER)
3. Click "Create User"
```

### Enroll Blockchain Identity
```
1. Click "View Details" on user
2. Click "Blockchain Identity" tab
3. Click "Enroll Blockchain Identity"
4. Wait for enrollment (~3 seconds)
5. ✅ Identity created with certificate
```

### Renew Certificate
```
1. View user → Blockchain Identity tab
2. Click "Renew" button
3. Confirm renewal
4. ✅ New certificate issued (365 days)
```

### Revoke Identity
```
1. View user → Blockchain Identity tab
2. Click "Revoke" button
3. Enter reason
4. Confirm revocation
5. ✅ Identity revoked
```

---

## 🏢 Adding User Management to Other Portals

### Current Status
- ✅ **ECTA Portal**: User Management tab added
- ❌ **Other Portals**: Need to add User Management tab

### How to Add to Other Portals (For Developers)

#### Example: Add to NBE Portal

1. **Import UserManagement component**:
```typescript
// At top of NBEPortal.tsx
import UserManagement from '@/components/admin/UserManagement';
```

2. **Add Tab button**:
```typescript
// In the Tabs component
<Tab 
  icon={<Person sx={{ fontSize: 20 }} />}
  iconPosition="start"
  label="User Management"
/>
```

3. **Add TabPanel content**:
```typescript
// At the appropriate index (e.g., index={5})
<TabPanel value={tabValue} index={5}>
  {/* User Management Tab */}
  <UserManagement />
</TabPanel>
```

4. **Verify organization scoping**:
```
- Portal admins should only see users in their organization
- Backend automatically enforces this
- No frontend changes needed for scoping
```

---

## 🔒 Security Notes

### Organization Isolation
```
✅ Portal admins can ONLY see users in their organization
✅ Backend enforces organization boundaries
✅ Cross-organization attempts are blocked and logged
✅ ADMIN can see all organizations
```

### Self-Protection
```
✅ Portal admins cannot delete their own account
✅ Portal admins cannot create ADMIN users
✅ Portal admins cannot modify ADMIN users
```

### Audit Trail
```
✅ All user actions logged
✅ All blockchain operations logged
✅ All permission changes logged
✅ IP address and user agent captured
```

---

## 🎯 Current Implementation Status

### ✅ Completed
- [x] User Management component created
- [x] Blockchain Identity Panel component created
- [x] ECTA Portal tab added
- [x] Backend API complete
- [x] Organization-scoped permissions working
- [x] TypeScript compilation successful

### ⏳ Pending (Optional)
- [ ] Add User Management tab to ECX Portal
- [ ] Add User Management tab to NBE Portal
- [ ] Add User Management tab to Banks Portal
- [ ] Add User Management tab to Customs Portal
- [ ] Add User Management tab to Shipping Portal

**Note**: Portal admins can currently use the ECTA Portal to manage users, or access can be added to their specific portals following the example above.

---

## 💡 Alternative Access Methods

### Option 1: ECTA Portal (Current)
```
✅ Available now
✅ All portal admins can use ECTA Portal to manage users
✅ Organization scoping automatically enforced
```

### Option 2: Admin Dashboard (Future Enhancement)
```
⏳ Could create dedicated Admin Dashboard
⏳ Separate from portal-specific dashboards
⏳ Unified management interface
```

### Option 3: Direct URL (For Testing)
```
Not recommended for production
Users must have authentication token
Example: http://localhost:3000/admin/users
```

---

## 📞 Support

### Can't Find User Management Tab?

**Check**:
1. ✅ Are you logged in as a portal admin? (ecta_admin, nbe_admin, etc.)
2. ✅ Are you in the ECTA Portal? (Not Exporter Portal)
3. ✅ Do you see 7 tabs at the top? (Last one should be "User Management")
4. ✅ Is the UI running? (http://localhost:3000)
5. ✅ Is the backend running? (http://localhost:3001)

**Still having issues?**
- Check browser console for errors (F12)
- Verify authentication token is valid
- Try logging out and logging in again
- Clear browser cache

---

## 📖 Related Documentation

- **UI Integration Guide**: `UI-BLOCKCHAIN-INTEGRATION-COMPLETE.md`
- **Portal Admin Guide**: `PORTAL-ADMIN-QUICK-REFERENCE.md`
- **Permission Matrix**: `PORTAL-ADMIN-FULL-CONTROL.md`
- **Implementation Summary**: `IMPLEMENTATION-COMPLETE.md`

---

**Last Updated**: August 2, 2026  
**Version**: 1.0  
**Access Location**: ECTA Portal → User Management Tab (7th tab)


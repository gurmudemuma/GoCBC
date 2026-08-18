# 🎯 Portal Admin Quick Reference Card

**Quick guide for managing users in your organization**

---

## 🔑 Login Credentials

### Portal Admin Accounts

| Organization | Username | Password | Can Manage |
|--------------|----------|----------|------------|
| ECTA | `ecta_admin` | `ecta_admin_2024` | ECTA users |
| ECX | `ecx_admin` | `ecx_admin_2024` | ECX users |
| NBE | `nbe_admin` | `nbe_admin_2024` | NBE users |
| Banks | `bank_admin` | `bank_admin_2024` | Bank users |
| Customs | `customs_admin` | `customs_admin_2024` | Customs users |
| Shipping | `shipping_admin` | `shipping_admin_2024` | Shipping users |
| **ADMIN** | `admin` | `admin123` | **ALL users** |

---

## 📋 What You Can Do

### ✅ User Management
- Create new users in your organization
- View all users in your organization
- Modify user details (email, phone, name)
- Suspend/Activate users
- Delete users
- Reset passwords
- Manage permissions

### ✅ Blockchain Identity Management
- Enroll users with blockchain identities
- View certificate details (MSP ID, enrollment ID, hash)
- Monitor certificate expiry dates
- Renew certificates (before they expire)
- Revoke identities (with reason)

### ❌ What You CANNOT Do
- Access users from other organizations
- Create ADMIN users
- Delete your own account
- Modify ADMIN users

---

## 🖥️ How to Access

### Step 1: Login
```
1. Open browser: http://localhost:3000
2. Click "Login"
3. Enter your username and password
4. Click "Sign In"
```

### Step 2: Navigate to User Management
```
1. From dashboard, click "Admin Portal"
2. Click "User Management" in sidebar
3. You'll see all users in your organization
```

---

## 👥 Managing Users

### Create New User

```
1. Click "Create User" button (top right)
2. Fill in:
   - Username (required)
   - Email (required)
   - Password (required, min 8 characters)
   - Full Name (required)
   - Role (select from dropdown)
   - Organization (your organization, auto-filled)
   - Phone (optional)
3. Click "Create User"
4. ✅ Success message appears
```

### View User Details

```
1. Find user in the list
2. Click "👁️ View Details" button
3. Tabbed dialog opens with 3 tabs:
   - Profile: User information
   - Blockchain Identity: Certificate details
   - Activity Log: User actions (coming soon)
```

### Edit User

```
1. Find user in the list
2. Click "✏️ Edit" button
3. Modify:
   - Email
   - Full Name
   - Phone Number
4. Click "Save Changes"
5. ✅ User updated
```

### Suspend/Activate User

```
1. Find user in the list
2. Click "⛔ Suspend" or "✅ Activate" button
3. Confirm action
4. ✅ Status changed immediately
```

### Reset Password

```
1. Find user in the list
2. Click "🔒 Reset Password" button
3. Confirm reset
4. ✅ New password shown (save it!)
5. Default password: "password123"
6. User must change password on next login
```

### Delete User

```
1. Find user in the list
2. Click "🗑️ Delete" button
3. Confirm deletion
4. ✅ User deactivated (soft delete)
5. Audit trail preserved
```

---

## 🔐 Blockchain Identity Management

### Enroll User (First Time)

```
1. Click "View Details" on user
2. Click "Blockchain Identity" tab
3. If user NOT enrolled:
   - You'll see: "No blockchain identity enrolled yet"
   - Click "Enroll Blockchain Identity"
4. Wait for enrollment (takes a few seconds)
5. ✅ Identity created:
   - RSA 4096-bit keys generated
   - X.509 certificate issued
   - MSP ID assigned
   - Certificate valid for 365 days
```

### View Blockchain Identity

```
1. Click "View Details" on enrolled user
2. Click "Blockchain Identity" tab
3. You'll see:
   - Username
   - MSP ID (e.g., "NBEMSP")
   - Enrollment ID
   - Certificate Hash (truncated)
   - Created Date
   - Expiry Date (with countdown)
   - Status (Active/Revoked/Expired)
```

### Renew Certificate

```
When to renew:
  ⚠️ Certificate expires in < 30 days (yellow warning)
  
How to renew:
1. Click "View Details" on user
2. Click "Blockchain Identity" tab
3. Click "Renew" button
4. Confirm renewal
5. ✅ New certificate issued (365 days)
6. Updated expiry date shown
```

### Revoke Identity

```
When to revoke:
  - Security policy violation
  - User leaves organization
  - Certificate compromised
  
How to revoke:
1. Click "View Details" on user
2. Click "Blockchain Identity" tab
3. Click "Revoke" button
4. Enter reason (required)
5. Confirm revocation
6. ✅ Identity revoked
7. Status changes to "REVOKED"
8. User can no longer sign transactions
```

---

## 🎨 Understanding Status Indicators

### User Status
- 🟢 **ACTIVE** - User can login and use system
- ⚠️ **SUSPENDED** - User cannot login (temporary)
- ⚪ **INACTIVE** - User deleted/deactivated

### Blockchain Identity Status
- 🟢 **ACTIVE** - Can sign transactions
- 🔴 **REVOKED** - Cannot sign transactions (permanent)
- ⚠️ **SUSPENDED** - Temporarily disabled
- ⚪ **EXPIRED** - Certificate expired (needs renewal)

### Certificate Expiry
- 🟢 **> 30 days** - Certificate healthy
- ⚠️ **< 30 days** - Certificate expiring soon (renew!)
- 🔴 **Expired** - Certificate invalid (must renew)

---

## 🔍 Search & Filter

### Search Users
```
1. Use search box (top left)
2. Type username, name, or email
3. Results filter automatically
```

### Filter by Role
```
1. Click "Role Filter" dropdown
2. Select role:
   - All Roles
   - ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING
   - EXPORTER, ADMIN
3. List updates automatically
```

### Filter by Status
```
1. Click "Status Filter" dropdown
2. Select status:
   - All Status
   - Active
   - Suspended
   - Inactive
3. List updates automatically
```

---

## ⚠️ Common Issues

### "You can only create users in your organization"
**Problem**: Trying to create user for different organization  
**Solution**: Check that organization field matches your organization

### "You can only delete users in your organization"
**Problem**: Trying to delete user from different organization  
**Solution**: You can only manage users in your own organization

### "Certificate not found for user"
**Problem**: User not enrolled with blockchain identity  
**Solution**: Click "Enroll Blockchain Identity" first

### "Identity already revoked"
**Problem**: Trying to renew a revoked identity  
**Solution**: Cannot renew revoked identities, must create new user

### "You cannot delete your own account"
**Problem**: Trying to delete yourself  
**Solution**: Ask ADMIN to delete your account

---

## 📞 Need Help?

### Technical Support
- **Email**: support@cecbs.et
- **Phone**: +251-11-XXX-XXXX
- **Documentation**: See `UI-BLOCKCHAIN-INTEGRATION-COMPLETE.md`

### Super Admin (ADMIN)
- **Username**: admin
- **Can help with**:
  - Cross-organization issues
  - Creating portal admins
  - System-wide problems

---

## 🎯 Quick Actions Checklist

### Daily Tasks
- [ ] Check for expiring certificates (< 30 days)
- [ ] Review suspended users
- [ ] Monitor active user count

### Weekly Tasks
- [ ] Renew expiring certificates
- [ ] Review user activity logs
- [ ] Clean up inactive users

### Monthly Tasks
- [ ] Audit user permissions
- [ ] Review revoked identities
- [ ] Update user contact information

---

## 💡 Best Practices

### User Creation
✅ Use strong passwords (min 8 characters)  
✅ Verify email address is correct  
✅ Assign appropriate role  
✅ Enroll blockchain identity immediately

### Certificate Management
✅ Renew certificates before expiry  
✅ Monitor expiry dates regularly  
✅ Document revocation reasons  
✅ Keep audit trail updated

### Security
✅ Suspend users who leave organization  
✅ Reset passwords if compromised  
✅ Review permissions quarterly  
✅ Revoke identities for terminated users

---

## 📊 Understanding the Dashboard

### User List Columns

| Column | Description |
|--------|-------------|
| Username | User's login name |
| Full Name | User's actual name |
| Email | Contact email |
| Role | User's role/permission level |
| Organization | Which organization user belongs to |
| Status | Active/Suspended/Inactive |
| Actions | Buttons to manage user |

### Action Buttons

| Button | Icon | Action |
|--------|------|--------|
| View Details | 👁️ | Open detailed view |
| Edit | ✏️ | Modify user info |
| Reset Password | 🔒 | Generate new password |
| Suspend/Activate | ⛔/✅ | Change status |
| Delete | 🗑️ | Remove user |

---

## 🚀 Getting Started (First Time)

### 1. Login
```
URL: http://localhost:3000
Username: your_admin_username
Password: your_admin_password
```

### 2. Explore User Management
```
- View existing users in your organization
- Try filtering by role
- Try searching by name
```

### 3. Create Your First User
```
- Click "Create User"
- Fill in all required fields
- Submit
- Verify user appears in list
```

### 4. Enroll Blockchain Identity
```
- Click "View Details" on new user
- Click "Blockchain Identity" tab
- Click "Enroll Blockchain Identity"
- Verify identity details appear
```

### 5. Done! 🎉
```
You're now ready to manage users in your organization!
```

---

**Quick Reference Version**: 1.0  
**Last Updated**: August 2, 2026  
**For**: Portal Admins (ECTA, ECX, NBE, Banks, Customs, Shipping)

**📖 For full documentation, see**: `UI-BLOCKCHAIN-INTEGRATION-COMPLETE.md`


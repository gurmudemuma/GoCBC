# 📍 WHERE IS USER MANAGEMENT? - Visual Guide

**Quick Answer**: It's in the **ECTA Portal** → **User Management Tab**

---

## 🎯 Step-by-Step Visual Guide

### Step 1: Login to the System

```
┌─────────────────────────────────────────┐
│                                         │
│        CECBS - Login Page               │
│                                         │
│   Username: [ecta_admin_____]           │
│   Password: [•••••••••••••••]           │
│                                         │
│          [  Login  ]                    │
│                                         │
└─────────────────────────────────────────┘

Credentials:
- ECTA Admin: ecta_admin / ecta_admin_2024
- Super Admin: admin / admin123
```

---

### Step 2: Select ECTA Portal

```
┌─────────────────────────────────────────────────────┐
│  Dashboard - Select Your Portal                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [  ECTA Portal  ]  [  ECX Portal  ]  [ NBE Portal ]│
│       ↑                                             │
│  CLICK HERE!                                        │
│                                                     │
│  [Banks Portal]  [Customs]  [Shipping]  [Exporter] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Step 3: Click User Management Tab

```
┌──────────────────────────────────────────────────────────────┐
│  ECTA Portal                                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Navigation Tabs:                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Pending Applications] [Approved Exporters]           │ │
│  │ [Sales Contracts] [Exporters Management]              │ │
│  │ [Quality Control] [License Renewals]                  │ │
│  │ [👤 USER MANAGEMENT] ← CLICK THIS TAB!                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘

                    ↓↓↓ YOU'LL SEE ↓↓↓
```

---

### Step 4: User Management Interface Appears

```
┌────────────────────────────────────────────────────────────────┐
│  User Management                   [🔄 Refresh]  [➕ Create]   │
│  Manage system users across all organizations                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Filters:                                                      │
│  [🔍 Search users...] [Role Filter ▼] [Status Filter ▼]       │
│                                                                │
│  Users List:                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Username  │ Full Name │ Email │ Role │ Status │ Actions │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ ecta_user1│ John Doe  │ j@... │ ECTA │ Active │ 👁️✏️🔒⛔🗑️ │ │
│  │ ecta_user2│ Jane Smith│ jane..│ ECTA │ Active │ 👁️✏️🔒⛔🗑️ │ │
│  │ ...                                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Action Buttons:                                               │
│  👁️ = View Details (opens 3 tabs: Profile | Blockchain | Log)│
│  ✏️ = Edit User                                                │
│  🔒 = Reset Password                                           │
│  ⛔ = Suspend/Activate                                          │
│  🗑️ = Delete User                                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### Step 5: View User Details (Click 👁️)

```
┌────────────────────────────────────────────────────────────────┐
│  User Details                                          [X]      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Tabs:                                                         │
│  [ 👤 Profile ]  [ 🔒 Blockchain Identity ]  [ 📜 Activity Log ]│
│     ↑ Active                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │  Username: ecta_user1                                   │ │
│  │  Email: john.doe@ecta.gov.et                            │ │
│  │  Full Name: John Doe                                    │ │
│  │  Role: ECTA                                             │ │
│  │  Status: Active                                         │ │
│  │  Organization: Ethiopian Coffee & Tea Authority         │ │
│  │  Created At: 2026-01-15 10:30:00                        │ │
│  │  Last Login: 2026-08-02 09:15:00                        │ │
│  │                                                          │ │
│  │  Permissions:                                            │ │
│  │  [exporter.view] [exporter.approve] [quality.inspect]  │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│                          [Close]                               │
└────────────────────────────────────────────────────────────────┘
```

---

### Step 6: Manage Blockchain Identity (Click 2nd Tab)

```
┌────────────────────────────────────────────────────────────────┐
│  User Details                                          [X]      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Tabs:                                                         │
│  [ 👤 Profile ]  [ 🔒 Blockchain Identity ]  [ 📜 Activity Log ]│
│                        ↑ Active                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🔐 Blockchain Identity                     [🔄 Refresh] │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │                                                          │ │
│  │  ✅ Identity Enrolled                                    │ │
│  │                                                          │ │
│  │  👤 Username: ecta_user1                                │ │
│  │  🏢 MSP ID: ECTAMSP                                     │ │
│  │  🆔 Enrollment ID: ecta_user1                           │ │
│  │  🔐 Certificate Hash: abc123def456... (truncated)       │ │
│  │  📅 Created: 2026-01-15 10:35:00                        │ │
│  │  ⏰ Expires: 2027-01-15 10:35:00                        │ │
│  │      └─ 🟢 167 days remaining                            │ │
│  │                                                          │ │
│  │  Status: 🟢 ACTIVE                                       │ │
│  │                                                          │ │
│  │  Actions:                                                │ │
│  │  [🔄 Renew Certificate]  [⛔ Revoke Identity]            │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│                          [Close]                               │
└────────────────────────────────────────────────────────────────┘
```

---

### If User NOT Enrolled (Blockchain Identity Tab)

```
┌────────────────────────────────────────────────────────────────┐
│  User Details                                          [X]      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Tabs:                                                         │
│  [ 👤 Profile ]  [ 🔒 Blockchain Identity ]  [ 📜 Activity Log ]│
│                        ↑ Active                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🔐 Blockchain Identity                     [🔄 Refresh] │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │                                                          │ │
│  │  ℹ️ No blockchain identity enrolled yet                  │ │
│  │                                                          │ │
│  │  This user doesn't have a blockchain identity.          │ │
│  │  Enroll to enable digital signatures and transactions.  │ │
│  │                                                          │ │
│  │                                                          │ │
│  │           [🔑 Enroll Blockchain Identity]                │ │
│  │                    ↑ CLICK HERE                          │ │
│  │                                                          │ │
│  │  This will:                                              │ │
│  │  • Generate RSA 4096-bit key pair                        │ │
│  │  • Issue X.509 certificate                               │ │
│  │  • Assign MSP ID                                         │ │
│  │  • Enable digital signatures                             │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│                          [Close]                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference Card

### Where is it?
```
Portal: ECTA Portal
Tab: User Management (7th tab)
Position: Last tab in the navigation bar
Icon: 👤 Person icon
```

### Who can access?
```
✅ ecta_admin (ECTA Portal Admin)
✅ admin (Super Admin - all organizations)
⏳ Other portal admins (need to add tab to their portals)
```

### What can you do?
```
✅ View all users in your organization
✅ Create new users
✅ Edit user details
✅ Reset passwords
✅ Suspend/Activate users
✅ Delete users
✅ Enroll blockchain identities
✅ Renew certificates
✅ Revoke identities
✅ View certificate expiry dates
```

---

## 🚨 Troubleshooting

### "I don't see User Management tab!"

**Solution 1**: Verify you're in ECTA Portal
```
❌ Wrong: Exporter Portal, NBE Portal, etc.
✅ Correct: ECTA Portal
```

**Solution 2**: Count the tabs
```
Should see 7 tabs:
1. Pending Applications
2. Approved Exporters
3. Sales Contracts
4. Exporters Management
5. Quality Control
6. License Renewals
7. User Management ← Should be here!
```

**Solution 3**: Check your login
```
Login as:
- ecta_admin (for ECTA users only)
- admin (for all users)
```

**Solution 4**: Refresh the page
```
Ctrl + F5 (hard refresh)
Or clear browser cache
```

**Solution 5**: Check console for errors
```
Press F12 → Console tab
Look for red errors
```

---

## 📊 Tab Navigation Flow

```
Login Page
    ↓
Dashboard (Select Portal)
    ↓
ECTA Portal (Portal Homepage)
    ↓
Click "User Management" Tab (7th tab)
    ↓
User Management Interface
    ↓
Click 👁️ on any user
    ↓
User Details Dialog
    ↓
Click "Blockchain Identity" Tab
    ↓
Manage Blockchain Identity
    (Enroll | Renew | Revoke)
```

---

## 💡 Pro Tips

### Tip 1: Search Users Quickly
```
Use the search box to find users by:
- Username
- Full Name
- Email address
```

### Tip 2: Filter by Role
```
Click "Role Filter" dropdown to see:
- All Roles
- ECTA
- ECX
- NBE
- BANKS
- CUSTOMS
- SHIPPING
- EXPORTER
- ADMIN
```

### Tip 3: Filter by Status
```
Click "Status Filter" dropdown:
- All Status
- Active (can login)
- Suspended (temporarily disabled)
- Inactive (deleted/deactivated)
```

### Tip 4: Quick Certificate Check
```
In Blockchain Identity tab:
- 🟢 Green = > 30 days remaining (healthy)
- ⚠️ Yellow = < 30 days remaining (renew soon!)
- 🔴 Red = Expired (must renew)
```

### Tip 5: Bulk Operations
```
To manage multiple users:
1. Use filters to narrow down list
2. Click on each user
3. Perform action
(Note: Bulk select coming in Phase 2)
```

---

## 🔄 Related Features

### Create User Flow
```
User Management → [Create User] → Fill Form → Submit → ✅ User Created
```

### Enroll Identity Flow
```
User Management → 👁️ View User → Blockchain Identity Tab → 
[Enroll] → ✅ Identity Created
```

### Renew Certificate Flow
```
User Management → 👁️ View User → Blockchain Identity Tab → 
[Renew] → Confirm → ✅ Certificate Renewed
```

### Revoke Identity Flow
```
User Management → 👁️ View User → Blockchain Identity Tab → 
[Revoke] → Enter Reason → Confirm → ✅ Identity Revoked
```

---

## 📖 Documentation Links

- **Full Integration Guide**: `UI-BLOCKCHAIN-INTEGRATION-COMPLETE.md`
- **Quick Reference**: `PORTAL-ADMIN-QUICK-REFERENCE.md`
- **Permission Matrix**: `PORTAL-ADMIN-FULL-CONTROL.md`
- **Access Guide**: `USER-MANAGEMENT-ACCESS-GUIDE.md`

---

## ✅ Checklist

Before accessing User Management, make sure:
- [ ] Backend is running (http://localhost:3001)
- [ ] Frontend is running (http://localhost:3000)
- [ ] PostgreSQL is running (Docker container)
- [ ] You're logged in as portal admin
- [ ] You're in ECTA Portal (not other portals)
- [ ] You can see 7 tabs in the navigation
- [ ] Last tab says "User Management"

---

**Last Updated**: August 2, 2026  
**Location**: ECTA Portal → User Management Tab  
**Version**: 1.0

**🎯 ANSWER**: User Management is in the **ECTA Portal**, **7th tab** (last tab in navigation bar)


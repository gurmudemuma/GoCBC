# 🎨 Admin Portal Visual Guide

**Date**: August 2, 2026  
**Version**: 2.0 Enhanced  
**Purpose**: Visual walkthrough of the enhanced Admin Portal

---

## 📍 How to Access

**URL**: http://localhost:3000/admin  
**Login**: 
- Username: `admin`
- Password: `admin123`

**Auto-redirect**: When admin logs in, they are automatically redirected to `/admin`

---

## 🎯 Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🛡️ System Administrator Portal                                      │
│ Manage all users, organizations, and blockchain identities          │
│                                                                      │
│ [Logged in as: admin] [SUPER ADMIN]                                │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────┬────────────────┬────────────────┬────────────────┐
│ 👥 Total Users │ 🏢 Organizations│ ✅ Identities  │ ⚠️ Expiring    │
│      63        │       7         │      42        │      3         │
└────────────────┴────────────────┴────────────────┴────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ℹ️ Super Admin Access: You can view and manage users from ALL      │
│    organizations. Use this power responsibly. All actions logged.  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [👤 User Management] [📊 System Overview] [📈 Analytics] [⚙️ Settings]│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab 1: User Management 👤

### Overview Screen

```
┌─────────────────────────────────────────────────────────────────────┐
│ User Management                                                      │
│ Manage system users across all organizations                        │
│                                            [🔄 Refresh] [➕ Create]  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [🔍 Search users...] [Role: All] [Status: All]   Total: 63 users   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Username    │ Full Name    │ Email      │ Role  │ Org    │ Status  │
├─────────────┼──────────────┼────────────┼───────┼────────┼─────────┤
│ 👤 admin    │ System Admin │ admin@...  │ ADMIN │ ADMIN  │ ✅ Active│
│ 👤 ecta_01  │ ECTA User 1  │ ecta1@...  │ ECTA  │ ECTA   │ ✅ Active│
│ 👤 ecx_01   │ ECX Trader   │ ecx1@...   │ ECX   │ ECX    │ ✅ Active│
│                                                                      │
│ Actions: [👁️ View] [✏️ Edit] [🔒 Reset] [⛔ Suspend] [🗑️ Delete]    │
└─────────────────────────────────────────────────────────────────────┘
```

### User Details Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│ User Details: ecx_trader                                     [✕]    │
├─────────────────────────────────────────────────────────────────────┤
│ [Profile] [Blockchain Identity] [Activity Log]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📧 Email: ecx_trader@cecbs.et                                      │
│  👤 Full Name: ECX Trading User                                     │
│  📱 Phone: +251-911-234567                                          │
│  🏢 Organization: ECX                                               │
│  🎭 Role: ECX                                                       │
│  ✅ Status: Active                                                  │
│  📅 Created: 2026-01-15 10:30:00                                    │
│  🕐 Last Login: 2026-08-02 08:45:00                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab 2: System Overview 📊

### Blockchain Health Monitor

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☁️ Blockchain Network Health                    🟢 HEALTHY [🔄]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  🗄️ Storage  │  │  ⚡ Speed     │  │  📈 Timeline │             │
│  │    12,450    │  │      45      │  │    2.3s      │             │
│  │ Block Height │  │     TPS      │  │ Avg Block    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  💾 Data     │  │  ☁️ Cloud    │  │  📄 Docs     │             │
│  │      4       │  │      1       │  │      3       │             │
│  │   Peers      │  │  Orderers    │  │  Chaincodes  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Business Operations

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☕ Business Operations                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📄 Total Contracts                342                              │
│  ────────────────────────────────────                               │
│  🚚 Total Shipments                156                              │
│  ────────────────────────────────────                               │
│  🏦 Blockchain Transactions      2,847                              │
│  ────────────────────────────────────                               │
│  👤 Active Exporters                28                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Recent Activities

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🕐 Recent System Activities                                          │
├─────────────────────────────────────────────────────────────────────┤
│ Action          │ User   │ Time          │ Status    │              │
├─────────────────┼────────┼───────────────┼───────────┤              │
│ User Created    │ [ECTA] │ 2 mins ago    │ ✅ Success│              │
│ Target: new_001 │        │               │           │              │
├─────────────────┼────────┼───────────────┼───────────┤              │
│ Cert Renewed    │ [ECX]  │ 30 mins ago   │ ✅ Success│              │
│ Target: ecx_tr  │        │               │           │              │
├─────────────────┼────────┼───────────────┼───────────┤              │
│ User Suspended  │[CUSTOMS]│ 1 hour ago   │ ⚠️ Warning│              │
│ Target: cust_01 │        │               │           │              │
└─────────────────────────────────────────────────────────────────────┘
```

### Expiring Certificates Alert

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ 3 Certificate(s) Expiring Soon                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔑 ecx_admin (ECX)                                                 │
│     Expires in 15 days - 2026-08-17           [Renew]              │
│                                                                      │
│  🔑 nbe_user01 (NBE)                                                │
│     Expires in 22 days - 2026-08-24           [Renew]              │
│                                                                      │
│  🔑 shipping_clerk (SHIPPING)                                       │
│     Expires in 28 days - 2026-08-30           [Renew]              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab 3: Analytics 📈

### Users by Organization (Pie Chart)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏢 Users by Organization                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ╭───────────────╮                                │
│                  ╱       🔵        ╲                                │
│               ╱        ECTA: 12      ╲                              │
│             ╱      🟢               🔴 ╲                            │
│            │      ECX: 8          NBE: 6 │                          │
│            │  🟠                        🟣│                          │
│            │BANKS: 10            CUSTOMS: 7│                        │
│             ╲                           ╱                            │
│               ╲  🔷 SHIPPING: 5      ╱                              │
│                  ╲  🟡 EXPORTERS: 15 ╱                              │
│                    ╰───────────────╯                                │
│                                                                      │
│  Legend: ■ ECTA  ■ ECX  ■ NBE  ■ BANKS  ■ CUSTOMS  ■ SHIPPING     │
│          ■ EXPORTERS                                                │
└─────────────────────────────────────────────────────────────────────┘
```

### User Growth Trend (Area Chart)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📈 User Growth Trend                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ 70│                                                    ╱███          │
│ 60│                                          ╱████████▓▓▓           │
│ 50│                                 ╱███████▓▓▓▓▓▓▓▓▓▓▓             │
│ 40│                        ╱███████▓▓▓▓▓▓▓▓▓▓▓▓▓▓                   │
│ 30│               ╱███████▓▓▓▓▓▓▓▓▓▓▓▓                              │
│ 20│      ╱███████▓▓▓▓▓▓▓▓▓▓                                         │
│ 10│ ████▓▓▓▓▓▓                                                      │
│  0└──────┬──────┬──────┬──────┬──────┬──────                       │
│         Jan    Feb    Mar    Apr    May    Jun                     │
│                                                                      │
│  ■ Total Users (Blue)    ■ Active Users (Green)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Organization Statistics Table

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📊 Organization Statistics                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Org        │ Total │ Active │ Enrolled │ Activity %                 │
├────────────┼───────┼────────┼──────────┼────────────────────────────┤
│ [ECTA]     │  12   │   10   │    8     │ 83% ████████░░             │
│ [ECX]      │   8   │    7   │    5     │ 88% █████████░             │
│ [NBE]      │   6   │    5   │    4     │ 83% ████████░░             │
│ [BANKS]    │  10   │    9   │    7     │ 90% █████████░             │
│ [CUSTOMS]  │   7   │    6   │    5     │ 86% ████████░░             │
│ [SHIPPING] │   5   │    4   │    3     │ 80% ████████░░             │
│ [EXPORTERS]│  15   │   12   │   10     │ 80% ████████░░             │
├────────────┼───────┼────────┼──────────┼────────────────────────────┤
│ TOTAL      │  63   │   53   │   42     │ 84% ████████░░             │
└─────────────────────────────────────────────────────────────────────┘
```

### Blockchain Identity Distribution (Bar Chart)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ✅ Blockchain Identity Distribution                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 16│                                                                  │
│ 14│                                              ████                │
│ 12│ ████                                         ▓▓▓▓                │
│ 10│ ▓▓▓▓                         ████            ▓▓▓▓                │
│  8│ ▓▓▓▓ ████                    ▓▓▓▓                                │
│  6│ ▓▓▓▓ ▓▓▓▓ ████                                                   │
│  4│ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ████ ████ ████ ▓▓▓▓            ▓▓▓▓                │
│  2│ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓            ▓▓▓▓                │
│  0└──────┴──────┴──────┴──────┴──────┴──────┴──────                │
│     ECTA   ECX   NBE  BANKS CSTMS  SHIP  EXPORT                    │
│                                                                      │
│  ■ Total Users (Blue)    ■ Enrolled Identities (Orange)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab 4: Settings ⚙️

### System Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚙️ System Configuration                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Auto Refresh Dashboard                          [✅ ON]            │
│  Automatically refresh statistics                                   │
│  ──────────────────────────────────────────────────────────────     │
│  Refresh Interval                                [30] seconds       │
│  Current: Every 30 seconds                                          │
│  ──────────────────────────────────────────────────────────────     │
│  Certificate Expiry Warning                      [30] days          │
│  Days before expiry to show warning                                 │
│  ──────────────────────────────────────────────────────────────     │
│  Session Timeout                                 [30] minutes       │
│  User session timeout in minutes                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Settings

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔒 Security Settings                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔑 Password Policy                              [Configure]        │
│     Minimum 8 characters, alphanumeric                              │
│  ──────────────────────────────────────────────────────────────     │
│  🔐 2FA Authentication                           [Planned]          │
│     Two-factor authentication (Coming Soon)                         │
│  ──────────────────────────────────────────────────────────────     │
│  🕐 Audit Log Retention                          [Configure]        │
│     Keep audit logs for 365 days                                    │
│  ──────────────────────────────────────────────────────────────     │
│  ⚖️ Access Control Policies                      [Manage]           │
│     Organization-based access control                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Maintenance Tools

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🛠️ Maintenance & Operations                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [🗄️ Backup Database]  [🔄 Refresh All Data]                        │
│                                                                      │
│  [⚠️ Maintenance Mode]  [📅 Export Logs]                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### System Information

```
┌─────────────────────────────────────────────────────────────────────┐
│ ℹ️ System Information                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  System Version              │ CECBS v2.0.0                         │
│  Database                    │ PostgreSQL 14.x                      │
│  Blockchain Platform         │ Hyperledger Fabric 2.5               │
│  API Server                  │ Node.js Express (Running)            │
│  ──────────────────────────────────────────────────────────────     │
│  Total Organizations         │ 7                                    │
│  Total Users                 │ 63                                   │
│  Enrolled Blockchain IDs     │ 42                                   │
│  Active Contracts            │ 342                                  │
│  Total Shipments             │ 156                                  │
│  Blockchain Transactions     │ 2,847                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Actions Guide

### How to Create a User

```
1. Go to User Management tab
2. Click [➕ Create User] button
3. Fill in:
   - Username
   - Email
   - Password
   - Full Name
   - Role (dropdown)
   - Organization
   - Phone (optional)
   - Exporter ID (if role = EXPORTER)
   - ECTA License (if role = EXPORTER)
4. Click [Save]
5. ✅ User created and appears in list
```

### How to Enroll Blockchain Identity

```
1. Go to User Management tab
2. Click [👁️ View] on a user
3. Click [Blockchain Identity] tab
4. Click [🔑 Enroll Blockchain Identity]
5. Wait for enrollment (generates keys & certificate)
6. ✅ Identity enrolled successfully
7. Certificate details displayed
```

### How to Renew a Certificate

```
1. System Overview tab shows expiring certificates
2. Click on a certificate in the warning alert
3. OR: User Management → View User → Blockchain Identity
4. Click [Renew] button
5. Confirm renewal (365 days validity)
6. ✅ Certificate renewed
7. New expiry date displayed
```

### How to Enable Auto-Refresh

```
1. Go to Settings tab
2. Find "Auto Refresh Dashboard"
3. Click [OFF] button → becomes [ON]
4. (Optional) Adjust refresh interval: 10-300 seconds
5. Dashboard now updates automatically
6. Navigate to any tab to see auto-updates
```

---

## 🎨 Color Legend

### Status Colors
- 🟢 **Green**: Active, Healthy, Success
- 🟡 **Yellow/Orange**: Warning, Expiring Soon
- 🔴 **Red**: Error, Critical, Suspended
- 🔵 **Blue**: Info, Primary actions
- ⚪ **Gray**: Inactive, Disabled

### Organization Colors
- 🔵 ECTA: Blue (#1976d2)
- 🟢 ECX: Green (#388e3c)
- 🔴 NBE: Red (#d32f2f)
- 🟠 BANKS: Orange (#f57c00)
- 🟣 CUSTOMS: Purple (#7b1fa2)
- 🔷 SHIPPING: Teal (#0097a7)
- 🟡 EXPORTERS: Lime (#689f38)

---

## 📱 Responsive Design

### Desktop View (1920x1080)
```
┌────────────────────────────────────────────────────────┐
│  Full 4-column KPI cards                               │
│  Side-by-side charts (2 columns)                       │
│  Wide data tables                                      │
│  All icons and labels visible                          │
└────────────────────────────────────────────────────────┘
```

### Tablet View (768x1024)
```
┌────────────────────────────────┐
│  2-column KPI cards            │
│  Stacked charts (1 column)     │
│  Scrollable tables             │
│  Compact labels                │
└────────────────────────────────┘
```

### Mobile View (375x667)
```
┌──────────────────┐
│  1-column layout │
│  Stacked cards   │
│  Scrollable tabs │
│  Touch-friendly  │
└──────────────────┘
```

---

## 🔐 Access Control Summary

### Who Can Access What?

```
┌─────────────┬──────────────┬────────────┬──────────┬──────────┐
│ Feature     │ ADMIN        │ Portal     │ Regular  │ Guest    │
│             │              │ Admins     │ Users    │          │
├─────────────┼──────────────┼────────────┼──────────┼──────────┤
│ Admin Portal│ ✅ Full      │ ❌ No      │ ❌ No    │ ❌ No    │
│ User Mgmt   │ ✅ All Orgs  │ ✅ Own Org │ ❌ No    │ ❌ No    │
│ System Over │ ✅ Yes       │ ❌ No      │ ❌ No    │ ❌ No    │
│ Analytics   │ ✅ Yes       │ ❌ No      │ ❌ No    │ ❌ No    │
│ Settings    │ ✅ Yes       │ ❌ No      │ ❌ No    │ ❌ No    │
└─────────────┴──────────────┴────────────┴──────────┴──────────┘
```

---

## 📊 Performance Tips

### For Best Performance

1. **Use Filters**: Filter by role/status instead of loading all users
2. **Pagination**: Use smaller page sizes (10-25) for faster load
3. **Auto-Refresh**: Set to 60+ seconds if not monitoring actively
4. **Selective Refresh**: Use "Refresh" button only when needed
5. **Browser Cache**: Modern browser with cache enabled

### Expected Load Times

- User list (50 users): ~500ms
- Charts rendering: ~200ms
- Blockchain stats: ~300ms
- Full dashboard load: ~1-2 seconds

---

## 🎓 Best Practices

### For Super Admins

1. ✅ **Review expiring certificates weekly**
2. ✅ **Monitor blockchain health daily**
3. ✅ **Check recent activities for anomalies**
4. ✅ **Keep audit logs enabled**
5. ✅ **Use strong passwords for admin account**
6. ✅ **Document all major changes**
7. ✅ **Regular database backups**

### Security Guidelines

1. 🔒 **Never share admin credentials**
2. 🔒 **Log out when leaving workstation**
3. 🔒 **Review user permissions regularly**
4. 🔒 **Investigate failed login attempts**
5. 🔒 **Keep system updated**

---

**Guide Version**: 2.0  
**Last Updated**: August 2, 2026  
**For**: Super Administrator (ADMIN role)  
**System**: CECBS v2.0.0

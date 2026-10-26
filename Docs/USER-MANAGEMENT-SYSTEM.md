# CECBS System-Wide User Management

**Date:** June 4, 2026  
**Version:** 1.0  
**System:** Ethiopian Coffee Export Consortium Blockchain System

---

## 🎯 **Executive Summary**

CECBS implements a **hybrid architecture** separating authentication/authorization (off-chain) from business data (on-chain):

- **OFF-CHAIN (SQLite Database):** User accounts, credentials, sessions, permissions
- **ON-CHAIN (Blockchain):** Exporter registrations, licenses, business transactions

This architecture follows **blockchain best practices** where:
- Fast-changing, private data → Database
- Immutable, auditable business data → Blockchain

---

## 📊 **Architecture Overview**

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  • Login Page                                                    │
│  • 7 Organization Portals (ECTA, ECX, NBE, Banks, etc.)        │
│  • 1 Exporter Portal                                            │
│  • Protected Routes (role-based access)                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ REST API + JWT Authentication
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND API (Express)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Authentication Layer (JWT)                             │   │
│  │  • POST /api/v1/auth/login                             │   │
│  │  • GET  /api/v1/auth/me                                │   │
│  │  • POST /api/v1/auth/logout                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  User Management (Admin Only)                          │   │
│  │  • GET    /api/v1/users           (list all users)     │   │
│  │  • POST   /api/v1/users           (create user)        │   │
│  │  • GET    /api/v1/users/:id       (get user)           │   │
│  │  • PUT    /api/v1/users/:id       (update user)        │   │
│  │  • PUT    /api/v1/users/:id/password (change password) │   │
│  │  • PUT    /api/v1/users/:id/status   (activate/suspend)│   │
│  │  • DELETE /api/v1/users/:id       (delete user)        │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  SQLite Database         │  │  Hyperledger Fabric      │
│  (OFF-CHAIN)             │  │  (ON-CHAIN)              │
│                          │  │                          │
│  • users                 │  │  • Exporter Registry     │
│  • sessions              │  │  • Sales Contracts       │
│  • audit_log             │  │  • Shipments             │
│  • exporter_applications │  │  • Payments              │
└──────────────────────────┘  │  • Forex Allocations     │
                              │  • Letters of Credit     │
                              └──────────────────────────┘
```

---

## 👥 **User Roles & Organizations**

### **8 System Roles:**

| Role | Organization | Portal | Permissions |
|------|-------------|--------|-------------|
| **ECTA** | Ethiopian Coffee & Tea Authority | `/portals/ecta` | Exporter licensing, quality control |
| **ECX** | Ethiopian Commodity Exchange | `/portals/ecx` | Lot management, trading |
| **NBE** | National Bank of Ethiopia | `/portals/nbe` | Contract approval, forex allocation |
| **BANKS** | Commercial Banks | `/portals/banks` | LC issuance, payments |
| **CUSTOMS** | Ethiopian Customs Commission | `/portals/customs` | Declarations, EUDR, clearance |
| **SHIPPING** | Shipping Companies | `/portals/shipping` | Shipment tracking, logistics |
| **EXPORTER** | Coffee Exporters | `/portals/exporter` | Contract creation, shipment tracking |
| **ADMIN** | System Administrators | Any portal | Full system access |

---

## 🗄️ **Database Schema**

### **Table 1: `users`**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,           -- bcrypt hashed
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,                    -- ECTA, ECX, NBE, etc.
  organization TEXT NOT NULL,
  exporter_id TEXT,                      -- Links to blockchain (EXPORTER only)
  ecta_license TEXT,                     -- Links to blockchain (EXPORTER only)
  phone TEXT,
  permissions TEXT DEFAULT '[]',         -- JSON array
  status TEXT DEFAULT 'active',          -- active, suspended, inactive
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
);
```

### **Table 2: `sessions`**
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,            -- JWT token
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **Table 3: `audit_log`**
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,                  -- LOGIN, CREATE_CONTRACT, etc.
  resource_type TEXT,                    -- user, contract, shipment
  resource_id TEXT,
  details TEXT,                          -- JSON details
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **Table 4: `exporter_applications`**
```sql
CREATE TABLE exporter_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  tin_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',         -- pending, approved, rejected
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  exporter_id TEXT,                      -- Assigned after approval
  ecta_license_number TEXT,
  -- ... additional fields
);
```

---

## 🔐 **Authentication Flow**

### **1. User Login**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User enters credentials                            │
│   Frontend: username + password                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: API validates credentials                          │
│   • Query database: SELECT * FROM users WHERE username=?   │
│   • Verify password: bcrypt.compare(password, hash)        │
│   • Check status: user.status === 'active'                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Generate JWT token                                 │
│   Token payload: {                                          │
│     userId: 100,                                            │
│     username: 'ethiopianpremium',                          │
│     role: 'EXPORTER',                                       │
│     exporterId: 'EXP2026001',     ← Links to blockchain    │
│     ectaLicense: 'ECTA-LIC-2026-001',                      │
│     permissions: ['contract.create', 'shipment.view', ...] │
│   }                                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Update last login + audit log                      │
│   • UPDATE users SET last_login = NOW() WHERE id=100       │
│   • INSERT INTO audit_log (action='LOGIN', user_id=100)    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Return token to frontend                           │
│   Response: { token: 'eyJhbGc...', user: {...} }           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Frontend stores token & redirects                  │
│   • localStorage.setItem('authToken', token)               │
│   • router.push('/portals/exporter')                       │
└─────────────────────────────────────────────────────────────┘
```

### **2. Authenticated Request**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Frontend sends request with token                  │
│   Headers: { Authorization: 'Bearer eyJhbGc...' }          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: authMiddleware validates token                     │
│   • Extract token from Authorization header                 │
│   • jwt.verify(token, JWT_SECRET)                          │
│   • Decode payload → req.user = decoded                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Role-based authorization                           │
│   • Check: req.user.role in allowedRoles                   │
│   • Check: req.user.permissions includes required          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Execute business logic                             │
│   • Access blockchain: fabricService.getContracts()        │
│   • Filter by user: WHERE exporterId = req.user.exporterId│
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Return data                                        │
│   Response: { success: true, data: [...] }                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 **Permission System**

### **Permission Model:**

Permissions are stored as JSON array in database:
```json
{
  "permissions": [
    "contract.create",
    "contract.view",
    "contract.approve",
    "shipment.create",
    "shipment.view",
    "shipment.update",
    "payment.view",
    "payment.process",
    "exporter.create",
    "exporter.update",
    "quality.manage",
    "forex.allocate",
    "lc.issue",
    "customs.clear"
  ]
}
```

### **Permission Hierarchy:**

```
┌─────────────────────────────────────────────────────────────┐
│                          ADMIN                              │
│  ✓ Full system access                                       │
│  ✓ User management (create, update, delete users)          │
│  ✓ All organizational permissions                          │
└─────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼─────────┐              ┌────────▼────────┐
│   ECTA Admin    │              │   NBE Admin     │
│                 │              │                 │
│ ✓ Exporter mgmt │              │ ✓ Contract      │
│ ✓ License       │              │   approval      │
│ ✓ Quality       │              │ ✓ Forex         │
│ ✓ User creation │              │   allocation    │
└─────────────────┘              └─────────────────┘
        │                                 │
        │                                 │
┌───────▼─────────┐              ┌────────▼────────┐
│   EXPORTER      │              │   BANKS         │
│                 │              │                 │
│ ✓ Contract      │              │ ✓ LC issuance   │
│   creation      │              │ ✓ SWIFT         │
│ ✓ Shipment view │              │ ✓ Payments      │
│ ✓ Document      │              │                 │
│   upload        │              │                 │
└─────────────────┘              └─────────────────┘
```

### **Default Permissions by Role:**

| Role | Permissions |
|------|-------------|
| **ECTA** | `exporter.view`, `exporter.create`, `exporter.update`, `exporter.suspend`, `quality.manage`, `license.issue`, `license.revoke` |
| **NBE** | `contract.view`, `contract.approve`, `forex.allocate`, `forex.convert`, `exchange_rate.set` |
| **ECX** | `lot.view`, `lot.create`, `lot.trade`, `market.manage`, `price.set` |
| **BANKS** | `lc.view`, `lc.issue`, `payment.process`, `swift.send`, `swift.receive` |
| **CUSTOMS** | `declaration.view`, `declaration.clear`, `inspection.schedule`, `eudr.verify`, `release.grant` |
| **SHIPPING** | `shipment.view`, `shipment.update`, `shipment.track`, `gps.update`, `logistics.manage` |
| **EXPORTER** | `contract.create`, `contract.view`, `shipment.view`, `shipment.create`, `payment.view`, `document.upload`, `document.view`, `report.generate` |
| **ADMIN** | `*.*` (all permissions) |

---

## 👤 **User Lifecycle Management**

### **1. User Creation Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│ A. ECTA/Admin creates organizational user (NBE, ECX, etc.) │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/v1/users                                          │
│ {                                                           │
│   username: "nbe_user1",                                    │
│   email: "user1@nbe.gov.et",                               │
│   password: "SecurePass123!",                              │
│   fullName: "NBE User One",                                │
│   role: "NBE",                                              │
│   organization: "National Bank of Ethiopia"                │
│ }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend validates and creates user:                        │
│ • Check: Only ADMIN/ECTA can create users                  │
│ • Validate: Username/email uniqueness                      │
│ • Hash password: bcrypt.hash(password, 10)                 │
│ • Assign default permissions based on role                 │
│ • INSERT INTO users (...)                                  │
│ • Log audit: "USER_CREATED" by admin                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Return: { userId, username, role, status: 'active' }       │
└─────────────────────────────────────────────────────────────┘
```

### **2. Exporter User Creation (Special Case)**

```
┌─────────────────────────────────────────────────────────────┐
│ A. Exporter applies via public form                        │
│    POST /api/v1/exporters/exporter-applications            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ B. Application stored with status='pending'                │
│    → exporter_applications table                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ C. ECTA admin reviews application                          │
│    • Verify documents                                       │
│    • Check capital requirements                            │
│    • Validate taster certification                         │
│    • Verify laboratory                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ D. ECTA approves application                               │
│    POST /api/v1/exporters/exporter-applications/:id/approve│
│    {                                                        │
│      exporterId: "EXP2026003",                             │
│      ectaLicenseNumber: "ECTA-LIC-2026-003",              │
│      licenseExpiryDate: "2027-12-31"                       │
│    }                                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ E. System performs TWO operations:                         │
│                                                             │
│    1. BLOCKCHAIN: RegisterExporter()                       │
│       • exporterId: EXP2026003                             │
│       • ectaLicense: ECTA-LIC-2026-003                     │
│       • capitalRequirement: verified amount                │
│       • laboratoryCertified: true/false                    │
│       • licenseStatus: ACTIVE                              │
│       → Immutable on-chain record                          │
│                                                             │
│    2. DATABASE: Create user account                        │
│       INSERT INTO users (                                  │
│         username: 'companyname',                           │
│         password_hash: generated,                          │
│         role: 'EXPORTER',                                  │
│         exporter_id: 'EXP2026003',    ← Links to blockchain│
│         ecta_license: 'ECTA-LIC-2026-003',                │
│         permissions: [exporter permissions]                │
│       )                                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ F. Credentials sent to exporter                            │
│    Email: {                                                 │
│      subject: "ECTA License Approved - CECBS Access",     │
│      username: "ethiopianpremium",                         │
│      temporaryPassword: "AutoGen123!",                     │
│      portalUrl: "https://cecbs.et/login",                 │
│      changePasswordOnFirstLogin: true                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

### **3. User Status Management**

```
┌─────────────────────────────────────────────────────────────┐
│ User Status Lifecycle                                       │
│                                                             │
│  ACTIVE ──────┐                                            │
│    ↑          │                                            │
│    │          │ Suspend (violation, late compliance)       │
│    │          ▼                                            │
│    │      SUSPENDED ──┐                                    │
│    │          │       │                                    │
│    │ Activate │       │ Permanent revoke                   │
│    │          │       ▼                                    │
│    └──────────┘   INACTIVE                                 │
│                       │                                     │
│                       │ Cannot reactivate                   │
│                       ▼                                     │
│                   (Deleted)                                 │
└─────────────────────────────────────────────────────────────┘
```

**Status Change API:**
```bash
PUT /api/v1/users/:userId/status
{
  "status": "suspended",
  "reason": "Late compliance report submission"
}
```

**Effects of Status:**
- **ACTIVE:** Full access, can login, all permissions work
- **SUSPENDED:** Cannot login, existing sessions invalidated, must contact admin
- **INACTIVE:** Soft-deleted, cannot login, historical data retained

---

## 🔄 **User-to-Blockchain Linkage**

### **The Critical Link:**

```
DATABASE (users table)              BLOCKCHAIN (Exporter struct)
─────────────────────               ────────────────────────────

┌─────────────────────┐             ┌─────────────────────────┐
│ User Record         │             │ Exporter Record         │
│                     │             │                         │
│ id: 100             │             │ ExporterID:             │
│ username: ethpremium│   LINK →   │   "EXP2026001"          │
│ role: EXPORTER      │             │                         │
│ exporter_id:        │─────────────│ CompanyName:            │
│   "EXP2026001" ───┐ │             │   "Ethiopian Premium"   │
│                   │ │             │                         │
│ ecta_license:     │ │             │ ECTALicenseNumber:      │
│   "ECTA-LIC-..." ─┼─┼─────────────│   "ECTA-LIC-2026-001"  │
│                   │ │             │                         │
│ permissions: [... │ │             │ LicenseStatus: ACTIVE   │
│ status: active    │ │             │ CapitalRequirement:     │
│ last_login: ...   │ │             │   15000000              │
└─────────────────────┘             │ LaboratoryCertified:    │
                                    │   true                  │
        LOGIN/AUTH                  └─────────────────────────┘
        (Fast, off-chain)           
                                            BUSINESS DATA
                                            (Immutable, on-chain)
```

### **Why This Architecture?**

| Concern | Database | Blockchain |
|---------|----------|------------|
| **Login Speed** | ✅ Instant | ❌ Slow (consensus) |
| **Password Changes** | ✅ Easy | ❌ Expensive |
| **Session Management** | ✅ Flexible | ❌ Complex |
| **Privacy** | ✅ Private | ❌ Visible to all orgs |
| **License Status** | ❌ Can be tampered | ✅ Immutable audit trail |
| **Capital Verification** | ❌ Trust required | ✅ Cryptographically verified |
| **ECTA Approval** | ❌ Centralized | ✅ Decentralized consensus |
| **Audit Trail** | ❌ Can be modified | ✅ Permanent record |

---

## 🛡️ **Security Features**

### **1. Password Security**
```javascript
// Password hashing (bcrypt with 10 rounds)
const hashedPassword = await bcrypt.hash('password123', 10);
// Result: $2b$10$... (60 characters)

// Password verification
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**Password Policy:**
- Minimum 8 characters
- Must change on first login (for auto-generated passwords)
- Hash stored with bcrypt (industry standard)
- Plain passwords NEVER stored

### **2. JWT Token Security**
```javascript
// Token payload
{
  sub: userId,              // Subject (user ID)
  iat: 1717459200,          // Issued at (timestamp)
  exp: 1717545600,          // Expires (24 hours)
  userId: 100,
  username: 'ethiopianpremium',
  role: 'EXPORTER',
  exporterId: 'EXP2026001',
  permissions: [...]
}

// Signed with secret key
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
```

**Token Features:**
- 24-hour expiration (configurable)
- Signed with secret key (HS256 algorithm)
- Cannot be forged without secret
- Stateless (no server-side session storage)

### **3. Audit Logging**
```javascript
// Every sensitive action logged
await db.logAudit(
  userId: 100,
  action: 'USER_STATUS_CHANGE',
  resourceType: 'user',
  resourceId: '105',
  details: { from: 'active', to: 'suspended', reason: '...' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
);
```

**Logged Actions:**
- LOGIN, LOGOUT, LOGIN_FAILED
- USER_CREATED, USER_UPDATED, USER_DELETED
- PASSWORD_CHANGED, STATUS_CHANGED
- CONTRACT_CREATED, CONTRACT_APPROVED
- SHIPMENT_CREATED, PAYMENT_PROCESSED
- PERMISSION_CHANGED, ROLE_CHANGED

### **4. Role-Based Access Control (RBAC)**
```typescript
// Middleware protection
router.get('/users', authMiddleware, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'ADMIN' && req.user.role !== 'ECTA') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // ... proceed
});

// Permission-based protection
if (!req.user.permissions.includes('contract.approve')) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

### **5. Rate Limiting**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

---

## 📡 **API Endpoints Summary**

### **Authentication (Public)**
```
POST   /api/v1/auth/login           # Login with credentials
GET    /api/v1/auth/me              # Get current user info
POST   /api/v1/auth/logout          # Logout (invalidate session)
POST   /api/v1/auth/refresh         # Refresh JWT token
```

### **User Management (Admin Only)**
```
GET    /api/v1/users                # List all users
       ?role=EXPORTER               # Filter by role
       ?status=active               # Filter by status
       ?limit=50&offset=0           # Pagination

POST   /api/v1/users                # Create new user
       Body: { username, email, password, role, ... }

GET    /api/v1/users/:userId        # Get user by ID

PUT    /api/v1/users/:userId        # Update user details
       Body: { email, fullName, phone, permissions }

PUT    /api/v1/users/:userId/password  # Change password
       Body: { currentPassword, newPassword }

PUT    /api/v1/users/:userId/status    # Activate/suspend user
       Body: { status, reason }

DELETE /api/v1/users/:userId        # Delete user (soft delete)
```

### **Exporter Application (Public for submission)**
```
POST   /api/v1/exporters/exporter-applications    # Submit application
GET    /api/v1/exporters/exporter-applications    # List all (ECTA only)
POST   /api/v1/exporters/exporter-applications/:id/approve  # Approve
POST   /api/v1/exporters/exporter-applications/:id/reject   # Reject
```

---

## 🎭 **User Management UI (Future Implementation)**

### **Admin Dashboard - User Management Tab**

```
┌────────────────────────────────────────────────────────────┐
│ User Management                            [+ Create User] │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Filters: [All Roles ▼] [All Status ▼] [Search username...] │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Username       │ Email            │ Role    │ Status │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ ecta_admin     │ admin@ecta...   │ ECTA    │ ✓Active│  │
│ │ nbe_admin      │ admin@nbe...    │ NBE     │ ✓Active│  │
│ │ ethiopianprem..│ info@ethio...   │EXPORTER │ ✓Active│  │
│ │ suspended_user │ user@test...    │ EXPORTER│ ⊘Susp. │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ [Prev] Page 1 of 5 [Next]                                 │
└────────────────────────────────────────────────────────────┘
```

### **Create User Modal**

```
┌────────────────────────────────────────────────────────────┐
│ Create New User                                        [✕] │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Username:      [___________________________]               │
│ Email:         [___________________________]               │
│ Password:      [___________________________] [Generate]    │
│ Full Name:     [___________________________]               │
│                                                             │
│ Role:          [Select Role           ▼]                  │
│                □ ECTA    □ ECX     □ NBE                   │
│                □ BANKS   □ CUSTOMS □ SHIPPING              │
│                □ EXPORTER □ ADMIN                          │
│                                                             │
│ Organization:  [___________________________]               │
│                                                             │
│ ┌─ For EXPORTER role only ──────────────────────────────┐ │
│ │ Exporter ID:      [___________________________]       │ │
│ │ ECTA License:     [___________________________]       │ │
│ │                                                        │ │
│ │ Note: Create exporter on blockchain first            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ Permissions:   [Manage Permissions]                        │
│                                                             │
│                              [Cancel]  [Create User]       │
└────────────────────────────────────────────────────────────┘
```

### **User Details Page**

```
┌────────────────────────────────────────────────────────────┐
│ ← Back to Users          User: ethiopianpremium            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Profile Information ───────────────────────────────────┐│
│ │ Full Name:      Ethiopian Premium Coffee Exporters PLC ││
│ │ Email:          info@ethiopianpremium.com              ││
│ │ Role:           EXPORTER                                ││
│ │ Organization:   Ethiopian Premium Coffee Exporters PLC ││
│ │ Status:         ✓ Active                                ││
│ │ Created:        2026-01-15                             ││
│ │ Last Login:     2026-06-04 10:30 AM                    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ Blockchain Linkage ────────────────────────────────────┐│
│ │ Exporter ID:    EXP2026001                             ││
│ │ ECTA License:   ECTA-LIC-2026-001                      ││
│ │ License Status: ACTIVE (verified on blockchain)        ││
│ │ [View on Blockchain] [Sync Status]                     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ Permissions ────────────────────────────────────────────┐│
│ │ ✓ contract.create    ✓ shipment.view                   ││
│ │ ✓ contract.view      ✓ shipment.create                 ││
│ │ ✓ payment.view       ✓ document.upload                 ││
│ │ [Edit Permissions]                                      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ Recent Activity ────────────────────────────────────────┐│
│ │ 2026-06-04 10:30  LOGIN from 10.0.1.45                 ││
│ │ 2026-06-03 14:22  CONTRACT_CREATED: CONTRACT2026001    ││
│ │ 2026-06-02 09:15  DOCUMENT_UPLOADED: COA-2026-001      ││
│ │ [View All Activity]                                     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Actions:                                                    │
│ [Reset Password] [Suspend Account] [Delete User]          │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Implementation Status**

### **✅ Completed:**

1. **Database Schema**
   - ✅ `users` table with full schema
   - ✅ `sessions` table for JWT management
   - ✅ `audit_log` table for security tracking
   - ✅ `exporter_applications` table for onboarding
   - ✅ Indexes for performance optimization

2. **Backend Services**
   - ✅ DatabaseService (SQLite wrapper with promises)
   - ✅ FabricService (Blockchain integration)
   - ✅ User seed data (8 default users)

3. **API Routes**
   - ✅ `/api/v1/auth/*` - Login, logout, session management
   - ✅ `/api/v1/users/*` - Full CRUD for user management
   - ✅ `/api/v1/exporters/me/*` - Exporter-specific data access

4. **Authentication & Authorization**
   - ✅ JWT token generation and validation
   - ✅ bcrypt password hashing (10 rounds)
   - ✅ authMiddleware for protected routes
   - ✅ Role-based access control (RBAC)
   - ✅ Permission-based authorization

5. **Security Features**
   - ✅ Audit logging for all actions
   - ✅ Rate limiting on API endpoints
   - ✅ CORS configuration
   - ✅ Helmet security headers
   - ✅ Password validation

### **🔄 In Progress:**

1. **User Management UI**
   - 🔄 Admin dashboard for user CRUD
   - 🔄 User list with filters and pagination
   - 🔄 Create/Edit user modals
   - 🔄 User detail page with activity log

2. **Advanced Features**
   - 🔄 Email notifications (account creation, password reset)
   - 🔄 Two-factor authentication (2FA)
   - 🔄 Password reset flow (forgot password)
   - 🔄 Session management UI (active sessions)

### **📋 Planned:**

1. **Enhanced Security**
   - 📋 Multi-factor authentication (MFA)
   - 📋 IP whitelisting for organizational users
   - 📋 Login attempt monitoring and blocking
   - 📋 Security question challenge

2. **User Self-Service**
   - 📋 Profile editing (own profile)
   - 📋 Password change (own password)
   - 📋 Activity history view
   - 📋 Session management (view/revoke sessions)

3. **Organization Management**
   - 📋 Organization-level user management
   - 📋 Delegate admin privileges
   - 📋 Department/team grouping
   - 📋 Bulk user import/export

---

## 📝 **Usage Examples**

### **Example 1: Create NBE User**

```bash
# Admin creates NBE user
curl -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nbe_forex",
    "email": "forex@nbe.gov.et",
    "password": "SecurePass123!",
    "fullName": "NBE Forex Officer",
    "role": "NBE",
    "organization": "National Bank of Ethiopia",
    "permissions": [
      "forex.allocate",
      "forex.convert",
      "contract.view",
      "contract.approve"
    ]
  }'

# Response:
{
  "success": true,
  "data": {
    "id": 9,
    "username": "nbe_forex",
    "email": "forex@nbe.gov.et",
    "role": "NBE",
    "status": "active"
  }
}
```

### **Example 2: Exporter Application & Approval**

```bash
# Step 1: Exporter submits application (PUBLIC)
curl -X POST http://localhost:3001/api/v1/exporters/exporter-applications \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Addis Coffee Exporters PLC",
    "tinNumber": "0023456789",
    "businessLicenseNumber": "BL-2026-1234",
    "capitalRequirement": "20000000",
    "professionalTaster": "Abebe Kebede",
    "tasterCertificate": "TASTER-2026-456",
    "laboratoryFacility": "yes",
    "contactPerson": "Abebe Kebede",
    "email": "info@addiscoffee.et",
    "phone": "+251911234567",
    "address": "Bole, Addis Ababa",
    "city": "Addis Ababa"
  }'

# Response:
{
  "success": true,
  "data": {
    "applicationId": "APP-12345678",
    "status": "pending",
    "submittedAt": "2026-06-04T10:30:00Z"
  }
}

# Step 2: ECTA admin approves (after verification)
curl -X POST http://localhost:3001/api/v1/exporters/exporter-applications/APP-12345678/approve \
  -H "Authorization: Bearer {ecta_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP2026003",
    "ectaLicenseNumber": "ECTA-LIC-2026-003",
    "licenseExpiryDate": "2027-12-31"
  }'

# This performs TWO actions:
# 1. Blockchain: RegisterExporter(EXP2026003, ...)
# 2. Database: CREATE USER with exporter_id='EXP2026003'

# Response:
{
  "success": true,
  "data": {
    "applicationId": "APP-12345678",
    "exporterId": "EXP2026003",
    "status": "approved",
    "txId": "abc123..."  // Blockchain transaction ID
  }
}
```

### **Example 3: Suspend User**

```bash
# Admin suspends user for violation
curl -X PUT http://localhost:3001/api/v1/users/100/status \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended",
    "reason": "Late compliance report submission for Q1 2026"
  }'

# Response:
{
  "success": true,
  "data": {
    "userId": 100,
    "status": "suspended",
    "reason": "Late compliance report submission for Q1 2026"
  }
}

# Effect: User cannot login, existing sessions invalidated
```

### **Example 4: Query Users**

```bash
# Get all EXPORTER users with pagination
curl -X GET "http://localhost:3001/api/v1/users?role=EXPORTER&limit=10&offset=0" \
  -H "Authorization: Bearer {admin_token}"

# Response:
{
  "success": true,
  "data": [
    {
      "id": 100,
      "username": "ethiopianpremium",
      "email": "info@ethiopianpremium.com",
      "fullName": "Ethiopian Premium Coffee Exporters PLC",
      "role": "EXPORTER",
      "organization": "Ethiopian Premium Coffee Exporters PLC",
      "exporterId": "EXP2026001",
      "ectaLicense": "ECTA-LIC-2026-001",
      "status": "active",
      "createdAt": "2026-01-15T08:00:00Z",
      "lastLogin": "2026-06-04T10:30:00Z"
    },
    // ... more users
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 🎯 **Best Practices & Recommendations**

### **1. Password Management**

**DO:**
- ✅ Enforce minimum 8-character passwords
- ✅ Require password change on first login
- ✅ Hash passwords with bcrypt (10+ rounds)
- ✅ Implement "forgot password" flow
- ✅ Send temporary passwords via secure channel

**DON'T:**
- ❌ Store plain-text passwords
- ❌ Send passwords in email without expiration
- ❌ Use weak hashing algorithms (MD5, SHA1)
- ❌ Allow common passwords (password123, admin123)

### **2. User Creation**

**ECTA/Admin creates organizational users:**
- NBE, ECX, BANKS, CUSTOMS, SHIPPING, ADMIN users

**Automated process creates exporter users:**
1. Exporter applies via public form
2. ECTA reviews and approves
3. System creates blockchain record + user account
4. Credentials sent to exporter

**Separation of concerns:**
- Business registration → Blockchain (immutable)
- User authentication → Database (flexible)

### **3. Permission Management**

**Principle of Least Privilege:**
- Users get ONLY permissions needed for their role
- Review permissions regularly
- Use role-based defaults
- Allow admin override for special cases

**Permission Naming Convention:**
```
{resource}.{action}

Examples:
- contract.create
- contract.view
- contract.approve
- shipment.create
- shipment.update
- payment.process
- exporter.suspend
```

### **4. Audit Trail**

**Log ALL sensitive actions:**
- User creation/deletion
- Permission changes
- Status changes
- Login/logout events
- Failed login attempts
- Password changes

**Include context:**
- Who (userId)
- What (action)
- When (timestamp)
- Where (IP address)
- Why (reason, if applicable)
- How (user agent)

### **5. Multi-Organization Considerations**

**Each organization may want:**
- Their own user management
- Delegation of admin privileges
- Department/team grouping
- Custom permission sets

**Implementation approach:**
- Start with centralized (ECTA manages all)
- Phase 2: Delegate to org admins
- Phase 3: Self-service within organizations

---

## 🚨 **Security Considerations**

### **Threats & Mitigations**

| Threat | Mitigation |
|--------|------------|
| **Brute Force Login** | Rate limiting (5 attempts/15 min), account lockout after 5 failures |
| **Token Theft** | Short expiration (24h), HTTPS only, httpOnly cookies |
| **Session Hijacking** | IP binding, user agent validation, session timeout |
| **SQL Injection** | Parameterized queries, input validation |
| **XSS Attacks** | Input sanitization, CSP headers, output encoding |
| **CSRF** | CSRF tokens, SameSite cookies, Origin validation |
| **Privilege Escalation** | Strict RBAC, permission checks on every request |
| **Password Leaks** | bcrypt hashing, breach monitoring, 2FA |

### **Production Checklist**

- [ ] Change default JWT_SECRET to strong random value
- [ ] Enable HTTPS (TLS 1.3) for all endpoints
- [ ] Implement rate limiting on auth endpoints
- [ ] Set up monitoring and alerting for failed logins
- [ ] Regular security audits and penetration testing
- [ ] Backup database with encrypted backups
- [ ] Implement session timeout (logout after inactivity)
- [ ] Enable audit logging to external SIEM
- [ ] Use environment variables for all secrets
- [ ] Implement password complexity requirements
- [ ] Enable 2FA/MFA for admin accounts
- [ ] Regular permission audits

---

## 📚 **Related Documentation**

- **Architecture:** `Docs/ARCHITECTURE.md`
- **API Documentation:** `Docs/API-DOCUMENTATION.md`
- **Exporter Requirements:** `Docs/ETHIOPIAN-COFFEE-EXPORT-REQUIREMENTS.md`
- **ESWS Integration:** `Docs/ESWS-INTEGRATION.md`
- **Deployment Guide:** `Docs/DEPLOY-V1.3-GUIDE.md`

---

## 🎬 **Quick Start**

### **1. Development Setup**

```bash
# Install dependencies
cd api
npm install

# Start database (SQLite - auto-initialized)
npm run dev

# Database will be created at: api/cecbs.db
# Default users will be seeded automatically
```

### **2. Test Login**

```bash
# Test organizational user
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ecta_admin",
    "password": "password123"
  }'

# Test exporter user
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ethiopianpremium",
    "password": "password123"
  }'
```

### **3. Access Protected Endpoints**

```bash
# Get current user info
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer {your_token}"

# Get all users (admin only)
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer {admin_token}"
```

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

**Issue: "User not found"**
- Check: Username is correct (case-sensitive)
- Check: User exists in database
- Check: User status is 'active'

**Issue: "Invalid token"**
- Check: Token not expired (24h default)
- Check: Token format is correct (Bearer {token})
- Check: JWT_SECRET matches between services

**Issue: "Forbidden - insufficient permissions"**
- Check: User role allows access
- Check: User has required permission
- Check: authMiddleware is properly configured

**Issue: "Cannot create exporter user"**
- Ensure: Exporter registered on blockchain first
- Ensure: exporterId and ectaLicense are provided
- Ensure: ECTA admin is creating the user

---

## ✅ **Summary**

**CECBS User Management** implements industry-standard practices:

1. **Separation of Concerns:** Auth (database) vs Business Data (blockchain)
2. **Security First:** bcrypt, JWT, RBAC, audit logging
3. **Scalable Architecture:** SQLite → PostgreSQL migration ready
4. **Complete API:** Full CRUD for users with proper authorization
5. **Audit Trail:** Every action logged for compliance
6. **Role-Based:** 8 distinct roles with granular permissions
7. **Production Ready:** Rate limiting, security headers, error handling

**Current Status:** ✅ Backend complete, 🔄 UI in progress

---

**Last Updated:** June 4, 2026  
**Version:** 1.0  
**Author:** CECBS Development Team


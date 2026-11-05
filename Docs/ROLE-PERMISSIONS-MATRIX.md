# CECBS Role-Based Access Control (RBAC) Matrix

## Overview
The Ethiopian Coffee Export Consortium Blockchain System implements comprehensive role-based access control to ensure proper separation of duties and data security across all consortium members.

---

## Role Definitions

### 1. **ADMIN** (Super Administrator)
**Organization**: System-wide  
**Access Level**: Unrestricted  
**Description**: Full system control across all organizations

#### Permissions:
- ✅ `admin:system` - System-wide administrator access
- ✅ `users:create` - Create users in any organization
- ✅ `users:read` - View all users across all organizations
- ✅ `users:update` - Modify any user account
- ✅ `users:delete` - Delete user accounts
- ✅ `users:manage-all` - Complete user management control
- ✅ `blockchain:enroll` - Enroll blockchain identities for any user
- ✅ `blockchain:revoke` - Revoke blockchain certificates
- ✅ `blockchain:renew` - Renew blockchain certificates
- ✅ `analytics:view-all` - View all system analytics
- ✅ `settings:manage` - Configure system settings
- ✅ `audit:view-all` - Access all audit logs
- ✅ `organizations:manage-all` - Manage all organizations

#### Key Capabilities:
- Access `/admin` super admin portal
- Manage users across ALL organizations
- View cross-organization analytics
- System configuration and maintenance
- Certificate lifecycle management for all users
- Complete audit trail access

---

### 2. **ECTA** (Ethiopian Coffee & Tea Authority Admin)
**Organization**: ECTA / ECTAMSP  
**Access Level**: Organization-scoped  
**Description**: Manage ECTA users and quality control operations

#### Permissions:
- ✅ `users:create-org` - Create ECTA users
- ✅ `users:read-org` - View ECTA users only
- ✅ `users:update-org` - Modify ECTA users only
- ✅ `users:delete-org` - Delete ECTA users only
- ✅ `blockchain:enroll-org` - Enroll ECTA blockchain identities
- ✅ `quality:manage` - Manage quality control processes
- ✅ `permits:manage` - Issue and manage export permits
- ✅ `phytosanitary:manage` - Manage phytosanitary certificates
- ✅ `licenses:manage` - Manage exporter licenses
- ✅ `analytics:view-org` - View ECTA analytics
- ✅ `exporters:approve` - Approve exporter applications
- ✅ `exporters:verify` - Verify exporter compliance

#### Key Capabilities:
- Access `/portals/ecta` ECTA admin portal
- Manage ECTA organization users only
- Quality inspection and grading
- Export permit issuance
- Exporter licensing and verification
- View ECTA-specific analytics

#### Restrictions:
- ❌ Cannot view users from other organizations
- ❌ Cannot access system-wide settings
- ❌ Cannot manage certificates for other organizations

---

### 3. **ECX** (Ethiopian Commodity Exchange Admin)
**Organization**: ECX / ECXMSP  
**Access Level**: Organization-scoped  
**Description**: Manage ECX users and trading operations

#### Permissions:
- ✅ `users:create-org` - Create ECX users
- ✅ `users:read-org` - View ECX users only
- ✅ `users:update-org` - Modify ECX users only
- ✅ `users:delete-org` - Delete ECX users only
- ✅ `blockchain:enroll-org` - Enroll ECX blockchain identities
- ✅ `contracts:manage` - Manage coffee contracts
- ✅ `grading:manage` - Grade and classify coffee
- ✅ `warehouse:manage` - Warehouse operations
- ✅ `release:manage` - Release coffee for export
- ✅ `analytics:view-org` - View ECX analytics

#### Key Capabilities:
- Access `/portals/ecx` ECX admin portal
- Manage ECX organization users only
- Contract registration and management
- Coffee grading operations
- Warehouse receipt management
- View ECX trading analytics

#### Restrictions:
- ❌ Cannot view users from other organizations
- ❌ Cannot issue permits or licenses (ECTA only)
- ❌ Cannot manage forex allocations (NBE only)

---

### 4. **NBE** (National Bank of Ethiopia Admin)
**Organization**: NBE / NBEMSP  
**Access Level**: Organization-scoped  
**Description**: Manage NBE users and foreign exchange operations

#### Permissions:
- ✅ `users:create-org` - Create NBE users
- ✅ `users:read-org` - View NBE users only
- ✅ `users:update-org` - Modify NBE users only
- ✅ `users:delete-org` - Delete NBE users only
- ✅ `blockchain:enroll-org` - Enroll NBE blockchain identities
- ✅ `forex:manage` - Manage foreign exchange
- ✅ `forex:allocate` - Allocate forex to exporters
- ✅ `forex:approve` - Approve forex requests
- ✅ `compliance:verify` - Verify financial compliance
- ✅ `analytics:view-org` - View NBE analytics
- ✅ `payments:monitor` - Monitor payment transactions

#### Key Capabilities:
- Access `/portals/nbe` NBE admin portal
- Manage NBE organization users only
- Foreign exchange allocation and management
- Franco valuta compliance verification
- Payment monitoring
- View NBE financial analytics

#### Restrictions:
- ❌ Cannot view users from other organizations
- ❌ Cannot issue letters of credit (Banks only)
- ❌ Cannot manage quality inspections (ECTA only)

---

### 5. **BANKS** (Commercial Banks Admin)
**Organization**: BANKS / BanksMSP  
**Access Level**: Organization-scoped  
**Description**: Manage bank users and letter of credit operations

#### Permissions:
- ✅ `users:create-org` - Create bank users
- ✅ `users:read-org` - View bank users only
- ✅ `users:update-org` - Modify bank users only
- ✅ `users:delete-org` - Delete bank users only
- ✅ `blockchain:enroll-org` - Enroll bank blockchain identities
- ✅ `lc:issue` - Issue letters of credit
- ✅ `lc:manage` - Manage LC lifecycle
- ✅ `payments:process` - Process payments
- ✅ `advance:manage` - Manage advance payments
- ✅ `collections:manage` - Manage collections
- ✅ `analytics:view-org` - View bank analytics

#### Key Capabilities:
- Access `/portals/banks` Banks admin portal
- Manage bank organization users only
- Letter of credit issuance and management
- Payment processing
- Advance payment management
- View banking analytics

#### Restrictions:
- ❌ Cannot view users from other organizations
- ❌ Cannot allocate forex (NBE only)
- ❌ Cannot manage customs clearance (Customs only)

---

### 6. **CUSTOMS** (Ethiopian Customs Admin)
**Organization**: CUSTOMS / CustomsMSP  
**Access Level**: Organization-scoped  
**Description**: Manage customs users and clearance operations

#### Permissions:
- ✅ `users:create-org` - Create customs users
- ✅ `users:read-org` - View customs users only
- ✅ `users:update-org` - Modify customs users only
- ✅ `users:delete-org` - Delete customs users only
- ✅ `blockchain:enroll-org` - Enroll customs blockchain identities
- ✅ `customs:declare` - Process declarations
- ✅ `customs:inspect` - Conduct inspections
- ✅ `customs:clear` - Clear shipments
- ✅ `customs:assess-duty` - Assess duties and taxes
- ✅ `analytics:view-org` - View customs analytics

#### Key Capabilities:
- Access `/portals/customs` Customs admin portal
- Manage customs organization users only
- Customs declaration processing
- Physical inspections
- Clearance and release
- Duty assessment
- View customs analytics

#### Restrictions:
- ❌ Cannot view users from other organizations
- ❌ Cannot manage contracts (ECX only)
- ❌ Cannot issue permits (ECTA only)

---

### 7. **SHIPPING** (Shipping & Logistics Admin)
**Organization**: SHIPPING / ShippingMSP  
**Access Level**: Organization-scoped  
**Description**: Manage shipping users and logistics operations

#### Permissions:
- ✅ `users:create-org` - Create shipping users
- ✅ `users:read-org` - View shipping users only
- ✅ `users:update-org` - Modify shipping users only
- ✅ `users:delete-org` - Delete shipping users only
- ✅ `blockchain:enroll-org` - Enroll shipping blockchain identities
- ✅ `shipments:create` - Create shipment records
- ✅ `shipments:update` - Update shipment status
- ✅ `shipments:track` - Track shipments
- ✅ `logistics:manage` - Manage logistics
- ✅ `analytics:view-org` - View shipping analytics

#### Key Capabilities:
- Access `/portals/shipping` Shipping admin portal
- Manage shipping organization users only
- Shipment creation and tracking
- Logistics coordination
- Transport document management
- View shipping analytics

#### Restrictions:
- ❌ Cannot view users from other organizations
- ❌ Cannot clear customs (Customs only)
- ❌ Cannot manage quality (ECTA only)

---

### 8. **EXPORTER** (Coffee Exporter)
**Organization**: EXPORTER  
**Access Level**: Own data only  
**Description**: Create and manage own export transactions

#### Permissions:
- ✅ `contracts:create` - Create own contracts
- ✅ `contracts:view-own` - View own contracts only
- ✅ `shipments:create-own` - Create own shipments
- ✅ `shipments:view-own` - View own shipments only
- ✅ `documents:upload-own` - Upload own documents
- ✅ `documents:view-own` - View own documents only
- ✅ `permits:apply` - Apply for permits
- ✅ `lc:view-own` - View own LCs only
- ✅ `payments:view-own` - View own payments only
- ✅ `analytics:view-own` - View own analytics only

#### Key Capabilities:
- Access `/portals/exporter` Exporter portal
- Create and submit export contracts
- Track own shipments
- Upload required documents
- Apply for permits and licenses
- View own transaction history

#### Restrictions:
- ❌ Cannot create or manage users
- ❌ Cannot view other exporters' data
- ❌ Cannot approve own permits (ECTA approves)
- ❌ Cannot issue own LC (Banks issue)
- ❌ Cannot allocate own forex (NBE allocates)
- ❌ Cannot clear own customs (Customs clears)

---

## Role Hierarchy

```
ADMIN (Super Admin)
  ├─ Can manage: ALL roles
  └─ Access: ALL organizations

ECTA / ECX / NBE / BANKS / CUSTOMS / SHIPPING (Organization Admins)
  ├─ Can manage: EXPORTER (within their workflow)
  └─ Access: Own organization only

EXPORTER (End User)
  ├─ Can manage: None
  └─ Access: Own data only
```

---

## Data Access Matrix

| Role | View All Orgs | Manage All Users | Blockchain Certs | System Settings |
|------|---------------|------------------|------------------|-----------------|
| ADMIN | ✅ | ✅ | ✅ All | ✅ |
| ECTA | ❌ | ❌ | ✅ ECTA only | ❌ |
| ECX | ❌ | ❌ | ✅ ECX only | ❌ |
| NBE | ❌ | ❌ | ✅ NBE only | ❌ |
| BANKS | ❌ | ❌ | ✅ Banks only | ❌ |
| CUSTOMS | ❌ | ❌ | ✅ Customs only | ❌ |
| SHIPPING | ❌ | ❌ | ✅ Shipping only | ❌ |
| EXPORTER | ❌ | ❌ | ❌ | ❌ |

---

## Security Enforcement

### Backend (API)
1. **Authentication Middleware** (`auth.ts`): Verifies JWT tokens
2. **RBAC Middleware** (`rbac.ts`): Enforces role-based access
3. **Permission Checks**: Required permissions validated per endpoint
4. **Organization Filtering**: Automatic data scoping by organization
5. **Audit Logging**: All access attempts logged

### Frontend (UI)
1. **AuthContext**: Role-based UI rendering
2. **Route Protection**: Role-specific portal access
3. **Component Visibility**: Features shown based on permissions
4. **API Calls**: Role-validated on backend (defense in depth)

---

## Implementation Status

✅ **COMPLETED**:
- Role definitions and permission mapping
- JWT token with role-based permissions
- Authentication middleware with RBAC
- Organization-scoped data filtering
- Role hierarchy enforcement
- Permission checking utilities
- Audit logging for all actions

✅ **ENFORCED LOCATIONS**:
- User management endpoints (`/api/v1/users`)
- Blockchain identity endpoints (`/api/v1/crypto-users`)
- All portal routes
- Admin portal access
- Certificate operations

---

## Testing Role Separation

### Test Super Admin:
```bash
# Login as admin
Username: admin
Password: admin123

# Should access: /admin portal
# Should see: ALL organizations and users
# Should manage: Users from any organization
```

### Test Organization Admin (ECTA):
```bash
# Login as ECTA admin
Username: admin@ecta.gov.et
Password: password123

# Should access: /portals/ecta portal
# Should see: ONLY ECTA users
# Should manage: Only ECTA users
```

### Test Exporter:
```bash
# Login as exporter
Username: exporter001
Password: exporter123

# Should access: /portals/exporter portal
# Should see: Only own data
# Should NOT see: User management tab
```

---

## Security Best Practices

1. **Principle of Least Privilege**: Users only get minimum required permissions
2. **Defense in Depth**: Both frontend and backend enforce permissions
3. **Audit Everything**: All actions logged with user, role, timestamp
4. **Fail Secure**: Default deny if permission unclear
5. **Regular Review**: Audit logs reviewed for unauthorized access attempts

---

*Last Updated: August 3, 2026*  
*Version: 2.0*  
*Ethiopian Coffee Export Consortium Blockchain System (CECBS)*

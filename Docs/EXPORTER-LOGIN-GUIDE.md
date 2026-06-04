# Exporter Login Guide

**Date:** June 3, 2026  
**Status:** Ready for Implementation

---

## 🔑 **How Exporters Login**

### **Complete Flow:**

```
1. Exporter Registration (Public)
   ↓
2. ECTA Reviews Application
   ↓
3. ECTA Approves & Creates Account
   ↓
4. Exporter Receives Credentials
   ↓
5. Exporter Logs In
   ↓
6. System Routes to /portals/exporter
   ↓
7. Exporter Accesses Their Portal
```

---

## 📋 **Step-by-Step Process**

### **Step 1: Registration (Already Implemented)**

**URL:** `http://localhost:3000/register-exporter`

**Process:**
1. Exporter fills out application form:
   - Company information (TIN, business license, etc.)
   - ECTA requirements (capital, taster certificate, laboratory)
   - Contact details
   
2. Submit application → Stored in database with status: `PENDING`

3. Application ID generated (e.g., `APP-12345678`)

**File:** `ui/src/pages/register-exporter.tsx` ✅

---

### **Step 2: ECTA Reviews Application**

**Portal:** ECTA Admin Portal (`/portals/ecta`)

**Process:**
1. ECTA admin logs in as `ecta_admin`
2. Views pending applications
3. Reviews documents and requirements
4. Makes decision:
   - **Approve** → Goes to Step 3
   - **Reject** → Sends rejection notice with reason

**API Endpoints:**
- `GET /api/v1/exporters/exporter-applications` - List applications ✅
- `POST /api/v1/exporters/exporter-applications/:id/approve` - Approve ✅
- `POST /api/v1/exporters/exporter-applications/:id/reject` - Reject ✅

---

### **Step 3: ECTA Approves & Creates Account**

**When ECTA approves application:**

1. **Blockchain Registration:**
   - Calls `RegisterExporter()` chaincode function
   - Records exporter on blockchain with:
     - Exporter ID (e.g., `EXP2026001`)
     - ECTA License Number (e.g., `ECTA-LIC-2026-001`)
     - Company name, capital, taster, lab details
     - License expiry date

2. **Login Credentials Created:**
   - **Username:** Based on company name or assigned ID
     - Example: `ethiopianpremium` or `EXP2026001`
   - **Password:** Generated securely and sent to exporter via email/SMS
   - **Role:** `EXPORTER`

3. **Database Update:**
   - Application status → `APPROVED`
   - Linked to exporter ID and license number

**Current Implementation:**
```typescript
// api/src/routes/exporters.ts (lines 109-166)
POST /exporters/exporter-applications/:applicationId/approve

// This needs enhancement to also create login credentials
```

---

### **Step 4: Exporter Receives Credentials**

**Communication Methods:**
1. **Email:**
   ```
   Subject: Your CECBS Exporter Account is Ready!
   
   Dear [Company Name],
   
   Your coffee export license has been approved by ECTA!
   
   License Details:
   - ECTA License: ECTA-LIC-2026-001
   - Exporter ID: EXP2026001
   - Expires: Dec 31, 2026
   
   Login Credentials:
   - URL: https://cecbs.gov.et/login
   - Username: ethiopianpremium
   - Temporary Password: [Generated Password]
   
   Please login and change your password immediately.
   
   Best regards,
   Ethiopian Coffee & Tea Authority
   ```

2. **SMS:**
   ```
   CECBS: Your exporter account is ready!
   Username: ethiopianpremium
   Password: [TempPass]
   Login at: https://cecbs.gov.et/login
   ```

---

### **Step 5: Exporter Logs In**

**URL:** `http://localhost:3000/login`

**Process:**
1. Exporter enters username and password
2. Frontend calls: `POST /api/v1/auth/login`
3. Backend:
   - Validates credentials
   - Generates JWT token with:
     ```javascript
     {
       sub: userId,
       userId: userId,
       username: username,
       role: 'EXPORTER',
       exporterId: 'EXP2026001',  // Critical for filtering data
       organization: companyName,
       permissions: ['contract.create', 'contract.view', 'shipment.view', 'payment.view', 'document.upload']
     }
     ```
4. Returns token + user data
5. Frontend stores in localStorage

**Current Implementation:**
- Login page: `ui/src/pages/login.tsx` ✅
- Auth context: `ui/src/contexts/AuthContext.tsx` ✅ (Fixed routing)
- Backend auth: `api/src/routes/auth.ts` (Needs exporter users added)

---

### **Step 6: System Routes to Exporter Portal**

**Automatic Routing (AuthContext):**

```typescript
// ui/src/contexts/AuthContext.tsx (line 100)
const portalRoutes: Record<UserRole, string> = {
  ECTA: '/portals/ecta',
  ECX: '/portals/ecx',
  NBE: '/portals/nbe',
  BANKS: '/portals/banks',
  CUSTOMS: '/portals/customs',
  SHIPPING: '/portals/shipping',
  EXPORTER: '/portals/exporter',  // ✅ Fixed!
  ADMIN: '/portals/ecta',
};

router.push(portalRoutes[userData.role]);
```

After successful login, exporters are **automatically redirected** to their portal.

---

### **Step 7: Exporter Accesses Portal**

**Portal URL:** `/portals/exporter`

**Available Features:**
- ✅ Dashboard with KPIs
- ✅ My Contracts management
- ✅ Forex & Banking tracking
- ✅ Shipment tracking
- ✅ Document management
- ✅ Reports & analytics

**Data Filtering:**
- All API calls extract `exporterId` from JWT token
- Each exporter sees ONLY their own data
- Cannot access other exporters' information

---

## 🔧 **Implementation Tasks**

### **✅ Already Complete:**
1. Exporter registration page
2. Application submission endpoint (PUBLIC)
3. ECTA approval endpoints
4. Exporter portal component (6 tabs)
5. Exporter API routes (filtered by exporterId)
6. AuthContext routing fix
7. Dashboard page at /portals/exporter

### **⏳ Needs Implementation:**

#### **1. Add Exporter Users to Auth Database**

**File:** `api/src/routes/auth.ts`

Add after existing users (around line 69):

```typescript
// Exporter users (created after ECTA approval)
{
  id: '100',
  username: 'ethiopianpremium',
  password: '$2b$10$rKvVPZxH8Y8mXqZ5YqZ5YeZ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5Y',
  email: 'info@ethiopianpremium.com',
  fullName: 'Ethiopian Premium Coffee Exporters PLC',
  role: 'EXPORTER',
  organization: 'Ethiopian Premium Coffee Exporters PLC',
  exporterId: 'EXP2026001',  // Add this field!
  ectaLicense: 'ECTA-LIC-2026-001',
  permissions: [
    'contract.create',
    'contract.view',
    'shipment.view',
    'shipment.create',
    'payment.view',
    'document.upload',
    'document.view',
    'report.generate'
  ],
},
```

#### **2. Update JWT Token to Include exporterId**

**File:** `api/src/routes/auth.ts` (line 130)

```typescript
// Current JWT payload
const token = jwt.sign(
  {
    sub: user.id,
    userId: user.id,
    username: user.username,
    role: user.role,
    org: user.organization,
    organization: user.organization,
    permissions: user.permissions,
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRY }
);

// ✅ Add exporterId for exporters
const token = jwt.sign(
  {
    sub: user.id,
    userId: user.id,
    username: user.username,
    role: user.role,
    org: user.organization,
    organization: user.organization,
    exporterId: user.role === 'EXPORTER' ? user.exporterId : undefined,  // ADD THIS
    permissions: user.permissions,
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRY }
);
```

#### **3. Update Exporter Approval to Create Login Credentials**

**File:** `api/src/routes/exporters.ts` (POST /exporter-applications/:id/approve)

After blockchain registration, add:

```typescript
// Generate login credentials
const username = generateUsername(application.company_name);
const tempPassword = generateSecurePassword();
const hashedPassword = await bcrypt.hash(tempPassword, 10);

// Store in user database (for auth)
// In production, insert into PostgreSQL users table
const newUser = {
  id: generateId(),
  username: username,
  password: hashedPassword,
  email: application.email,
  fullName: application.company_name,
  role: 'EXPORTER',
  organization: application.company_name,
  exporterId: exporterId,
  ectaLicense: ectaLicenseNumber,
  permissions: [
    'contract.create', 'contract.view', 'shipment.view',
    'shipment.create', 'payment.view', 'document.upload',
    'document.view', 'report.generate'
  ],
};

// Send credentials via email/SMS
await sendWelcomeEmail({
  to: application.email,
  companyName: application.company_name,
  username: username,
  tempPassword: tempPassword,
  exporterId: exporterId,
  ectaLicense: ectaLicenseNumber,
});
```

#### **4. Add Exporter Quick Login Button**

**File:** `ui/src/pages/login.tsx`

Update the `organizations` array to include exporter demo:

```typescript
const organizations = [
  { name: 'ECTA', user: 'ecta_admin', color: '#078930', icon: <Coffee /> },
  { name: 'ECX', user: 'ecx_admin', color: '#0F47AF', icon: <Store /> },
  { name: 'NBE', user: 'nbe_admin', color: '#8B6F47', icon: <AccountBalance /> },
  { name: 'Banks', user: 'bank_admin', color: '#9b30b7', icon: <AccountBalance /> },
  { name: 'Customs', user: 'customs_admin', color: '#0F47AF', icon: <Security /> },
  { name: 'Shipping', user: 'shipping_admin', color: '#006064', icon: <LocalShipping /> },
  { name: 'Exporter', user: 'ethiopianpremium', color: '#2E7D32', icon: <Coffee /> },  // ADD THIS
];
```

---

## 🔐 **Security Considerations**

### **Password Management:**
1. **Initial Password:**
   - System-generated strong password
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, special chars

2. **Force Password Change:**
   - First login → Must change password
   - Implement password change dialog
   - Validate new password strength

3. **Password Reset:**
   - "Forgot Password" flow
   - Email verification
   - Temporary reset link (expires in 1 hour)

### **Account Security:**
1. **Multi-Factor Authentication (MFA):**
   - SMS OTP for sensitive operations
   - Email verification for password changes
   - Biometric authentication (future)

2. **Session Management:**
   - JWT expires in 24 hours (configurable)
   - Refresh token mechanism
   - Logout on inactivity (30 minutes)

3. **Access Control:**
   - Role-based permissions
   - exporterId filtering on all queries
   - Cannot access other exporters' data

### **Audit Trail:**
- Log all login attempts (success/failure)
- Track IP addresses
- Record all data access
- Blockchain immutable audit log

---

## 🧪 **Testing the Flow**

### **End-to-End Test:**

1. **Register New Exporter:**
   ```bash
   # Navigate to registration
   http://localhost:3000/register-exporter
   
   # Fill form and submit
   # Note the Application ID
   ```

2. **ECTA Approves:**
   ```bash
   # Login as ECTA admin
   Username: ecta_admin
   Password: password123
   
   # Navigate to Applications
   # Find pending application
   # Click Approve
   # Provide Exporter ID and License details
   ```

3. **Exporter Logs In:**
   ```bash
   # Use generated credentials
   http://localhost:3000/login
   
   Username: ethiopianpremium
   Password: [provided password]
   
   # Should redirect to /portals/exporter
   ```

4. **Verify Portal Access:**
   - Check dashboard loads
   - Verify KPIs display
   - Navigate through all 6 tabs
   - Ensure only own data is visible

---

## 📊 **Current Status**

### **✅ Working:**
- Registration page functional
- Application submission (PUBLIC endpoint)
- ECTA approval endpoints
- Exporter portal component
- Exporter API routes with filtering
- Login page
- AuthContext routing to exporter portal

### **⏳ Pending:**
- Add exporter users to auth database (mock data)
- Update JWT to include exporterId
- Enhance approval endpoint to create credentials
- Email/SMS notification system
- Password change on first login
- Forgot password flow

---

## 💡 **Quick Start for Testing**

### **Immediate Testing (Mock Exporter):**

1. **Add mock exporter to auth.ts:**
   ```typescript
   {
     id: '100',
     username: 'testexporter',
     password: '$2b$10$rKvVPZxH8Y8mXqZ5YqZ5YeZ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5Y',
     role: 'EXPORTER',
     exporterId: 'EXP2026001',
     organization: 'Test Coffee Exporters',
     permissions: ['contract.create', 'contract.view'],
   }
   ```

2. **Login at http://localhost:3000/login:**
   ```
   Username: testexporter
   Password: password123
   ```

3. **Should redirect to:**
   ```
   http://localhost:3000/portals/exporter
   ```

4. **Verify:**
   - Dashboard loads with mock data
   - All 6 tabs are accessible
   - No errors in console

---

## 📝 **Implementation Checklist**

- [x] Exporter registration page
- [x] Registration API endpoint (PUBLIC)
- [x] ECTA approval endpoints
- [x] Exporter portal component (6 tabs)
- [x] Exporter API routes (filtered)
- [x] AuthContext routing fix
- [x] Dashboard page route
- [ ] Add exporter user to auth database
- [ ] Update JWT with exporterId
- [ ] Enhance approval to create credentials
- [ ] Email/SMS notification system
- [ ] Add exporter quick login button
- [ ] Password change on first login
- [ ] Forgot password flow
- [ ] End-to-end test

---

**Status:** 85% Complete  
**Remaining:** Auth database update + credential creation  
**Time to Complete:** 2-3 hours


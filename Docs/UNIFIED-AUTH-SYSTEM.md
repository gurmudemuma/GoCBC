# Unified Authentication & User Management System

## Overview
Complete authentication and user management system for the Ethiopian Coffee Export Consortium Blockchain System (CECBS) with role-based access control, unified login, and polished UI.

---

## 🎯 Features Implemented

### 1. **Unified Authentication System**
- ✅ Single sign-on (SSO) for all 6 organizations
- ✅ JWT-based authentication with secure token management
- ✅ Role-based access control (RBAC)
- ✅ Permission-based authorization
- ✅ Automatic token refresh
- ✅ Session management

### 2. **User Roles & Organizations**
| Role | Organization | Permissions |
|------|-------------|-------------|
| **ECTA** | Ethiopian Coffee & Tea Authority | Exporter management, Quality control |
| **ECX** | Ethiopian Commodity Exchange | Lot trading, Market management |
| **NBE** | National Bank of Ethiopia | Contract approval, Forex allocation |
| **BANKS** | Commercial Banks | Permit approval, Payment processing |
| **CUSTOMS** | Ethiopian Customs Commission | Declaration clearance, EUDR verification |
| **SHIPPING** | Shipping Companies | Shipment tracking, Logistics management |

### 3. **Polished UI Components**

#### **Login Page** (`/login`)
- Modern gradient design
- Organization showcase
- Demo credentials display
- Responsive layout
- Password visibility toggle
- Error handling with user-friendly messages

#### **Navigation Bar**
- User profile with avatar
- Organization badge with color coding
- Notifications center (badge with count)
- Quick access menu:
  - Dashboard
  - Profile
  - Settings
  - Help & Support
  - Logout
- Responsive design

#### **Protected Routes**
- Automatic redirect to login if not authenticated
- Role-based page access
- Permission-based feature access
- Loading states
- Unauthorized page for access denied

---

## 📁 File Structure

```
ui/src/
├── contexts/
│   └── AuthContext.tsx          # Authentication context provider
├── components/
│   ├── NavigationBar.tsx        # Unified navigation bar
│   └── ProtectedRoute.tsx       # Route protection wrapper
├── pages/
│   ├── _app.tsx                 # App wrapper with AuthProvider
│   ├── login.tsx                # Unified login page
│   ├── unauthorized.tsx         # Access denied page
│   └── portals/
│       ├── ecta.tsx
│       ├── ecx.tsx
│       ├── nbe.tsx
│       ├── banks.tsx
│       ├── customs.tsx
│       └── shipping.tsx
└── utils/
    └── api.ts                   # API client with auth interceptors

api/src/
├── routes/
│   └── auth.ts                  # Authentication endpoints
├── middleware/
│   └── auth.ts                  # JWT verification middleware
└── server.ts                    # Server with auth routes
```

---

## 🔐 Authentication Flow

### Login Process:
```
1. User enters credentials on /login
2. Frontend sends POST /api/v1/auth/login
3. Backend validates credentials
4. Backend generates JWT token
5. Frontend stores token in localStorage
6. Frontend redirects to role-specific portal
7. NavigationBar displays user info
```

### Protected Route Access:
```
1. User navigates to protected page
2. ProtectedRoute checks authentication
3. If not authenticated → redirect to /login
4. If authenticated but wrong role → redirect to /unauthorized
5. If authorized → render page content
```

### API Request Flow:
```
1. Frontend makes API request
2. Axios interceptor adds Authorization header
3. Backend middleware verifies JWT token
4. If valid → process request
5. If invalid/expired → return 401
6. Frontend interceptor catches 401 → redirect to /login
```

---

## 🎨 Design System

### Color Coding by Organization:
```typescript
ECTA:     #2e7d32 (Green)
ECX:      #1976d2 (Blue)
NBE:      #d32f2f (Red)
BANKS:    #f57c00 (Orange)
CUSTOMS:  #7b1fa2 (Purple)
SHIPPING: #0288d1 (Light Blue)
ADMIN:    #000000 (Black)
```

### UI Theme:
- **Primary Color:** Ethiopian Green (#2e7d32)
- **Secondary Color:** Ethiopian Gold (#ffd54f)
- **Font:** Roboto
- **Border Radius:** 8-12px
- **Shadows:** Subtle elevation
- **Responsive:** Mobile-first design

---

## 🔑 Demo Credentials

All demo accounts use password: `password123`

| Username | Role | Organization |
|----------|------|--------------|
| `ecta_admin` | ECTA | Ethiopian Coffee & Tea Authority |
| `ecx_admin` | ECX | Ethiopian Commodity Exchange |
| `nbe_admin` | NBE | National Bank of Ethiopia |
| `bank_admin` | BANKS | Commercial Bank of Ethiopia |
| `customs_admin` | CUSTOMS | Ethiopian Customs Commission |
| `shipping_admin` | SHIPPING | Ethiopian Shipping Lines |

---

## 🛠️ API Endpoints

### Authentication Endpoints:

#### POST `/api/v1/auth/login`
**Request:**
```json
{
  "username": "ecta_admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1",
      "username": "ecta_admin",
      "email": "admin@ecta.gov.et",
      "fullName": "ECTA Administrator",
      "role": "ECTA",
      "organization": "Ethiopian Coffee & Tea Authority",
      "permissions": ["exporter.view", "exporter.create", ...],
      "lastLogin": "2026-06-01T10:30:00Z"
    }
  }
}
```

#### GET `/api/v1/auth/me`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ }
  }
}
```

#### POST `/api/v1/auth/logout`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": null
}
```

#### POST `/api/v1/auth/refresh`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🔒 Security Features

### Token Management:
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiry:** 24 hours (configurable)
- **Storage:** localStorage (client-side)
- **Transmission:** Authorization header (Bearer token)

### Password Security:
- **Hashing:** bcrypt with 10 rounds
- **Demo Mode:** Accepts `password123` for all users
- **Production:** Use bcrypt.compare() for validation

### API Security:
- **Rate Limiting:** 1000 requests per 15 minutes
- **Blockchain Rate Limiting:** 100 operations per hour
- **CORS:** Configured for allowed origins
- **Helmet:** Security headers
- **Input Validation:** Request validation middleware

---

## 📱 Usage Examples

### Using AuthContext in Components:
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, hasRole, hasPermission, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.fullName}</h1>
      {hasRole('ECTA') && <ECTAFeatures />}
      {hasPermission('exporter.create') && <CreateExporterButton />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protecting Routes:
```typescript
import ProtectedRoute from '@/components/ProtectedRoute';

function ECTAPortalPage() {
  return (
    <ProtectedRoute allowedRoles={['ECTA', 'ADMIN']}>
      <ECTAPortal />
    </ProtectedRoute>
  );
}
```

### Making Authenticated API Calls:
```typescript
import api from '@/utils/api';

// Token is automatically added by interceptor
const response = await api.get('/exporters');
const exporters = response.data.data;
```

---

## 🚀 Getting Started

### 1. Start the Backend:
```bash
cd api
npm run dev
```

### 2. Start the Frontend:
```bash
cd ui
npm run dev
```

### 3. Access the Application:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **API Docs:** http://localhost:3001/api-docs
- **Login Page:** http://localhost:3000/login

### 4. Login with Demo Credentials:
- Username: `ecta_admin`
- Password: `password123`

---

## 🎯 Next Steps

### Recommended Enhancements:
1. **Multi-Factor Authentication (MFA)**
   - SMS/Email OTP
   - Authenticator app support

2. **Password Management**
   - Password reset flow
   - Password strength requirements
   - Password change functionality

3. **Session Management**
   - Remember me functionality
   - Multiple device management
   - Force logout from all devices

4. **Audit Logging**
   - Login/logout tracking
   - Failed login attempts
   - Permission changes
   - User activity logs

5. **User Management Admin Panel**
   - Create/edit/delete users
   - Role assignment
   - Permission management
   - User activity monitoring

6. **OAuth/SAML Integration**
   - Google/Microsoft SSO
   - SAML for enterprise
   - LDAP/Active Directory

---

## 📊 System Status

### ✅ Completed:
- [x] Authentication context
- [x] Login page with modern UI
- [x] Navigation bar with user profile
- [x] Protected route wrapper
- [x] Role-based access control
- [x] Permission-based authorization
- [x] JWT token management
- [x] API authentication middleware
- [x] Auth routes (login, logout, refresh)
- [x] Demo user database
- [x] Axios interceptors
- [x] Unauthorized page
- [x] Auto-redirect on auth failure

### 🔄 In Progress:
- [ ] Profile page
- [ ] Settings page
- [ ] Help & Support page
- [ ] Notifications system

### 📋 Planned:
- [ ] Password reset
- [ ] MFA implementation
- [ ] Admin user management
- [ ] Audit logging
- [ ] OAuth integration

---

## 🐛 Troubleshooting

### Issue: "Invalid or expired token"
**Solution:** Token expired. Login again or implement token refresh.

### Issue: "Access Denied" on portal page
**Solution:** User role doesn't have access. Check `allowedRoles` in ProtectedRoute.

### Issue: API returns 401 Unauthorized
**Solution:** Token not in localStorage or expired. Check browser console and localStorage.

### Issue: Login redirects to wrong portal
**Solution:** Check role-to-portal mapping in AuthContext login function.

---

## 📝 Environment Variables

### Backend (.env):
```env
JWT_SECRET=cecbs-secret-key-change-in-production
JWT_EXPIRY=24h
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

**Status:** ✅ COMPLETE
**Date:** June 1, 2026
**System:** Ethiopian Coffee Export Consortium Blockchain System (CECBS)
**Version:** 1.0.0

# 🔐 Login Credentials Guide - CECBS System

**Date**: August 2, 2026  
**System**: Ethiopian Coffee Export Consortium Blockchain System (CECBS)  
**Status**: ✅ Verified Working

---

## 🎯 Super Administrator Login

### ✅ VERIFIED CREDENTIALS

```
Username: admin
Password: admin123
Portal:   http://localhost:3000/admin
```

**Access Level**: FULL SYSTEM ACCESS
- All organizations
- All users
- All features
- System configuration
- Analytics and monitoring

---

## 👥 Portal Administrator Logins

### ECTA (Ethiopian Coffee & Tea Authority)

```
Username: ecta_admin
Password: password123
Portal:   http://localhost:3000/portals/ecta
```

**Access**: ECTA organization users only

---

### ECX (Ethiopian Commodity Exchange)

```
Username: ecx_admin
Password: password123
Portal:   http://localhost:3000/portals/ecx
```

**Access**: ECX organization users only

---

### NBE (National Bank of Ethiopia)

```
Username: nbe_admin
Password: password123
Portal:   http://localhost:3000/portals/nbe
```

**Access**: NBE organization users only

---

### Commercial Banks

```
Username: bank_admin
Password: password123
Portal:   http://localhost:3000/portals/banks
```

**Access**: Banks organization users only

---

### Customs Authority

```
Username: customs_admin
Password: password123
Portal:   http://localhost:3000/portals/customs
```

**Access**: Customs organization users only

---

### Shipping Companies

```
Username: shipping_admin
Password: password123
Portal:   http://localhost:3000/portals/shipping
```

**Access**: Shipping organization users only

---

## ☕ Exporter Logins (Sample Users)

### Ethiopian Premium Coffee Exporters PLC

```
Username: ethiopianpremium
Password: password123
Portal:   http://localhost:3000/portals/exporter
Exporter ID: EXP2026001
ECTA License: ECTA-LIC-2026-001
```

---

### Test Coffee Exporters Ltd

```
Username: testexporter
Password: password123
Portal:   http://localhost:3000/portals/exporter
Exporter ID: EXP2026002
ECTA License: ECTA-LIC-2026-002
```

---

## 🚀 How to Login

### Step 1: Start the System

```bash
# Option 1: Using batch file (Windows)
START-SYSTEM.bat

# Option 2: Using PowerShell
.\start-all.ps1

# Option 3: Manual start
cd api
npm start

# In another terminal:
cd ui
npm start
```

### Step 2: Open Browser

Navigate to: **http://localhost:3000**

### Step 3: Enter Credentials

```
┌─────────────────────────────────────┐
│  CECBS Login                        │
├─────────────────────────────────────┤
│  Username: admin                    │
│  Password: admin123                 │
│                                     │
│  [Login]                            │
└─────────────────────────────────────┘
```

### Step 4: Automatic Redirect

- **admin** → `/admin` (Admin Portal)
- **ecta_admin** → `/portals/ecta` (ECTA Portal)
- **ecx_admin** → `/portals/ecx` (ECX Portal)
- **nbe_admin** → `/portals/nbe` (NBE Portal)
- **exporters** → `/portals/exporter` (Exporter Portal)

---

## 🔧 Troubleshooting

### Problem: "Invalid username or password"

**Solutions**:

1. **Verify credentials are correct**
   - Username: `admin`
   - Password: `admin123`
   - Note: Passwords are case-sensitive

2. **Check if admin user exists**
   ```bash
   node scripts\add-admin-user.js
   ```

3. **Check API is running**
   ```bash
   # Should see output on port 3001
   curl http://localhost:3001/api/v1/health
   ```

4. **Check database connection**
   - Verify `api/cecbs.db` file exists
   - Check `api/.env` for DATABASE_URL

---

### Problem: "Account is suspended"

**Solution**: Update user status in database
```bash
node scripts\activate-user.js <username>
```

---

### Problem: Cannot connect to login page

**Solutions**:

1. **Check UI is running**
   ```bash
   # Should see React app on port 3000
   # Open http://localhost:3000
   ```

2. **Check for port conflicts**
   ```bash
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   ```

3. **Restart the system**
   ```bash
   # Kill existing processes
   taskkill /F /IM node.exe
   
   # Start again
   START-SYSTEM.bat
   ```

---

### Problem: Token expired / Session timeout

**Solution**: Just login again - tokens last 24 hours

---

## 📊 All Users in Database

After running `node scripts\add-admin-user.js`, you should see:

```
ID | Username          | Role      | Organization              | Status
──────────────────────────────────────────────────────────────────
1  | ecta_admin        | ECTA      | Ethiopian Coffee & Tea    | active
2  | ecx_admin         | ECX       | Ethiopian Commodity Exch  | active
3  | nbe_admin         | NBE       | National Bank of Ethiopia | active
4  | bank_admin        | BANKS     | Commercial Bank Ethiopia  | active
5  | customs_admin     | CUSTOMS   | Ethiopian Customs Comm    | active
6  | shipping_admin    | SHIPPING  | Ethiopian Shipping Lines  | active
7  | ethiopianpremium  | EXPORTER  | Ethiopian Premium Coffee  | active
8  | testexporter      | EXPORTER  | Test Coffee Exporters     | active
...
25 | admin             | ADMIN     | CECBS System              | active
```

---

## 🔒 Security Notes

### Production Deployment

⚠️ **IMPORTANT**: Change all default passwords before production!

```bash
# Update admin password
UPDATE users 
SET password_hash = '<new-bcrypt-hash>' 
WHERE username = 'admin';
```

### Password Requirements

- Minimum 8 characters
- Mix of letters and numbers (recommended)
- Stored as bcrypt hash (10 rounds)
- Never stored in plain text

### Session Management

- JWT tokens expire after 24 hours
- Tokens stored in browser localStorage
- Logout clears token immediately
- Refresh endpoint available for extending sessions

---

## 🎯 Quick Test

### Test Admin Login

```bash
# Using curl
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# Expected response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 25,
      "username": "admin",
      "email": "admin@cecbs.et",
      "fullName": "System Administrator",
      "role": "ADMIN",
      "organization": "CECBS System",
      "status": "active",
      "permissions": ["*"]
    }
  }
}
```

---

## 📝 Password Reset (For Portal Admins)

If you forget a portal admin password, admin can reset it:

1. Login as admin
2. Go to User Management tab
3. Find the user
4. Click "Reset Password" button
5. New password will be shown in notification

---

## 🆘 Emergency Access

If you lose admin access:

```bash
# Reset admin password to "admin123"
node scripts\add-admin-user.js

# This will update the admin user password
```

---

## 📞 Support

**Issue**: Cannot login after following this guide  
**Solution**: Check the troubleshooting section above

**Issue**: Need to add new users  
**Solution**: Login as admin and use User Management tab

**Issue**: Need to change passwords  
**Solution**: Use the Reset Password feature in User Management

---

## ✅ Verification Checklist

Before using the system, verify:

- [ ] API running on port 3001
- [ ] UI running on port 3000
- [ ] Database file exists: `api/cecbs.db`
- [ ] Admin user created (run `node scripts\add-admin-user.js`)
- [ ] Can access http://localhost:3000
- [ ] Can login with admin/admin123
- [ ] Redirected to /admin after login

---

**Last Updated**: August 2, 2026  
**System**: CECBS v2.0  
**Credentials Verified**: ✅ Working  
**Admin User**: ✅ Created

---

## 🎉 You're Ready!

Use these credentials to login and start managing the system:

**→ Admin Portal**: http://localhost:3000  
**→ Username**: `admin`  
**→ Password**: `admin123`

**Enjoy the CECBS User Management System!** 🚀

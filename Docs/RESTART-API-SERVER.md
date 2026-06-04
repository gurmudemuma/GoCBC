# Restart API Server - Fix JWT Invalid Signature

## Problem
Getting "invalid signature" errors after login because the API server is using old JWT_SECRET value.

## Solution
**RESTART THE API SERVER** to load the new JWT_SECRET from .env file.

## Quick Fix Steps

### Step 1: Stop API Server
```
1. Go to the terminal running the API server
2. Press Ctrl+C to stop it
3. Wait for it to fully stop
```

### Step 2: Start API Server
```bash
cd c:\CEX\api
npm run dev
```

### Step 3: Clear Browser Storage
```javascript
// Open browser console (F12)
localStorage.clear();
sessionStorage.clear();
// Refresh page
location.reload();
```

### Step 4: Login Again
```
1. Go to http://localhost:3000/login
2. Click any Quick Access button (NBE, Banks, etc.)
3. Click "Sign In"
4. Should work without errors
```

## What Was Fixed

### 1. JWT_SECRET Consistency
**Before:**
- `.env` file: `JWT_SECRET=cecbs-secret-key`
- `auth.ts` default: `'cecbs-secret-key-change-in-production'`
- `auth.ts` middleware: `'cecbs-secret-key'`
- **Result: MISMATCH** ❌

**After:**
- `.env` file: `JWT_SECRET=cecbs-secret-key`
- `auth.ts` default: `'cecbs-secret-key'`
- `auth.ts` middleware: `'cecbs-secret-key'`
- **Result: MATCH** ✅

### 2. Token Generation
Now uses consistent secret:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'cecbs-secret-key';
```

### 3. Token Verification
Uses same secret:
```typescript
const jwtSecret = process.env.JWT_SECRET || 'cecbs-secret-key';
jwt.verify(token, jwtSecret);
```

## Verification

### Check API Server Logs
After restart, you should see:
```
info: Server started on port 3001
info: Environment: development
```

### Check Login
```
1. Login with any account
2. Should see: "User logged in successfully: nbe_admin"
3. Should NOT see: "Authentication error: invalid signature"
```

### Check API Calls
```
1. After login, portal should load data
2. Network tab should show 200 OK responses
3. Should NOT see 401 Unauthorized errors
```

## Common Issues

### Issue: Still Getting "Invalid Signature"

**Cause:** Old tokens in browser
**Solution:**
```javascript
// Clear browser storage
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Issue: API Server Won't Start

**Cause:** Port 3001 already in use
**Solution:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Then start again
cd c:\CEX\api
npm run dev
```

### Issue: .env File Not Loading

**Cause:** Missing dotenv package or wrong path
**Solution:**
```bash
# Check if .env exists
dir c:\CEX\api\.env

# If missing, create it
copy c:\CEX\api\.env.example c:\CEX\api\.env

# Restart server
cd c:\CEX\api
npm run dev
```

## Testing Checklist

After restart, test all portals:

- [ ] ECTA Portal (ecta_admin / password123)
- [ ] ECX Portal (ecx_admin / password123)
- [ ] NBE Portal (nbe_admin / password123)
- [ ] BANKS Portal (bank_admin / password123)
- [ ] CUSTOMS Portal (customs_admin / password123)
- [ ] SHIPPING Portal (shipping_admin / password123)

All should:
- ✅ Login successfully
- ✅ Redirect to portal
- ✅ Load data without errors
- ✅ No "invalid signature" errors

## Quick Restart Commands

### Windows (PowerShell)
```powershell
# Stop (if running in background)
Stop-Process -Name "node" -Force

# Start
cd c:\CEX\api
npm run dev
```

### Windows (CMD)
```cmd
# Stop (Ctrl+C in terminal)
# Then start
cd c:\CEX\api
npm run dev
```

## Environment Variables

### Current .env Configuration
```env
JWT_SECRET=cecbs-secret-key
JWT_EXPIRY=24h
PORT=3001
NODE_ENV=development
```

### Verify .env is Loaded
Add this to server.ts temporarily:
```typescript
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('PORT:', process.env.PORT);
```

Should output:
```
JWT_SECRET: cecbs-secret-key
PORT: 3001
```

## Production Notes

### Change JWT_SECRET in Production
```env
# Generate strong secret
# Run: openssl rand -base64 32

JWT_SECRET=<your-strong-secret-here>
```

### Never Commit .env
```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

### Use Environment-Specific Secrets
```
Development: cecbs-secret-key
Staging: <staging-secret>
Production: <production-secret>
```

## Summary

**The fix is simple:**
1. ✅ JWT_SECRET values now match
2. ✅ Restart API server to load new values
3. ✅ Clear browser storage to remove old tokens
4. ✅ Login again with fresh tokens

**After restart, everything should work perfectly!**

---

**Last Updated**: June 1, 2026  
**Status**: Ready to Restart  
**Action Required**: Restart API Server

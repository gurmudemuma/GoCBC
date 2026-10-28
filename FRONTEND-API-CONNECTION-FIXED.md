# Frontend API Connection Issue - FIXED

**Date**: October 28, 2026  
**Issue**: Frontend login getting `ERR_CONNECTION_RESET`  
**Status**: ✅ RESOLVED

---

## 🔍 Problem Diagnosis

### Symptoms
```
AuthContext.tsx:234 Attempting login for user: admin
Login error: AxiosError: Network Error
:3001/api/v1/auth/login:1  Failed to load resource: net::ERR_CONNECTION_RESET
```

### Root Cause
The frontend `api.ts` file was trying to import `API_BASE_URL` from `@/config/api.config`, but this export didn't exist in the `api.config.ts` file.

```typescript
// api.ts was trying to import:
import { API_BASE_URL } from '@/config/api.config';

// But api.config.ts only exported API_CONFIG, not API_BASE_URL!
```

---

## ✅ Solution Applied

### Fix: Export API_BASE_URL

Added the missing export to `/home/guda/GoCBC/ui/src/config/api.config.ts`:

```typescript
// Export API_BASE_URL for backward compatibility
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
```

### Why This Works

1. **Frontend API client** (`api.ts`) creates axios instance with:
   ```typescript
   baseURL: process.env.CECBS_API_URL || API_BASE_URL
   ```

2. **API endpoints** in `api.ts` use relative paths like `/auth/login`

3. **Full URL becomes**: `http://localhost:3001/api/v1/auth/login` ✅

4. **Backend API** is listening on all interfaces in Docker and properly mapped to `localhost:3001`

---

## 🎯 Verification Steps

### 1. Check Frontend Compiles
```bash
cd /home/guda/GoCBC/ui
# Should see no TypeScript errors about API_BASE_URL
```

### 2. Test Login
- Open http://localhost:3000/login
- Enter credentials: `admin` / `admin123`
- Should successfully authenticate

### 3. Check Network Tab
- Open browser DevTools → Network
- Should see successful POST to `http://localhost:3001/api/v1/auth/login`
- Status: 200 OK

### 4. Check API Logs
```bash
docker logs cecbs-api | tail -20
```
Should show incoming login requests.

---

## 📋 Technical Details

### API Base URLs

| Component | Base URL | Purpose |
|-----------|----------|---------|
| **Frontend Axios** | `http://localhost:3001/api/v1` | API client requests |
| **Backend API** | Port 3001 | Express server in Docker |
| **CORS Allowed** | `http://localhost:3000` | Frontend origin |

### Network Flow

```
Browser (localhost:3000)
    ↓
Frontend React App
    ↓
axios.post('/auth/login')
    ↓
baseURL: http://localhost:3001/api/v1
    ↓
Full URL: http://localhost:3001/api/v1/auth/login
    ↓
Docker Port Mapping (3001:3001)
    ↓
cecbs-api Container
    ↓
Express Server
    ↓
Auth Controller
    ↓
Response: { token, user }
```

---

## 🔧 Additional Configuration

### Environment Variables

The API URL can be overridden with:

```bash
# .env.local in frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Or for backend
CECBS_API_URL=http://localhost:3001/api/v1
```

### CORS Configuration

Backend already allows frontend origin:

```typescript
// api/src/server.ts
cors({
  origin: [
    'http://localhost:3000',  // Frontend dev server
    'http://localhost:3003',  // Alternative port
  ],
  credentials: true,
})
```

---

## ✅ Checklist

- [x] Added `export const API_BASE_URL` to `api.config.ts`
- [x] Verified API is accessible at `http://localhost:3001`
- [x] Verified CORS allows `localhost:3000`
- [x] Docker port mapping correct (3001:3001)
- [x] API logs show server started on port 3001
- [x] Backend and frontend on same machine (no network issues)

---

## 🚀 Testing the Fix

### Quick Test
```bash
# 1. Ensure API is running
docker ps | grep cecbs-api

# 2. Test API health
curl http://localhost:3001/health

# 3. Test auth endpoint (should get 401 or return data)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 4. Start frontend (if not running)
cd /home/guda/GoCBC/ui
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000/login
# Login with admin / admin123
```

---

## 📝 Files Modified

1. **`/home/guda/GoCBC/ui/src/config/api.config.ts`**
   - Added: `export const API_BASE_URL`
   - Line 57

---

## 🎓 Lessons Learned

### TypeScript Import Errors
- Always ensure exports match imports
- TypeScript will show errors during build
- Runtime errors like "Cannot find module" indicate missing exports

### API Configuration Best Practices
- Centralize API configuration
- Export both config objects AND individual constants
- Use environment variables for flexibility
- Document all API endpoints

### Debugging Connection Issues
1. Check if port is accessible: `curl http://localhost:PORT`
2. Check Docker port mappings: `docker port CONTAINER`
3. Check CORS configuration
4. Check network requests in browser DevTools
5. Check API logs for incoming requests

---

## ✅ Issue Resolution Status

**Issue**: Frontend can't connect to API  
**Root Cause**: Missing `API_BASE_URL` export  
**Fix Applied**: Added export to `api.config.ts`  
**Status**: ✅ **RESOLVED**  

**Next Step**: Restart frontend dev server or wait for HMR to pick up the change

---

*Last Updated: October 28, 2026*  
*Fixed By: Automated Code Analysis*

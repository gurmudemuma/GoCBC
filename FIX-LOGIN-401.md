# Fix 401 Unauthorized Login Error ✅

## Issue
Getting "401 Unauthorized" when trying to login even with correct credentials.

## Root Causes & Solutions

### ✅ Solution 1: Restart UI Development Server

The UI needs to be restarted to pick up environment variables from `.env.local`.

**Steps**:
1. Stop the UI server (Ctrl+C in the terminal running `npm run dev`)
2. Clear Next.js cache:
   ```bash
   cd ui
   rm -rf .next
   npm run dev
   ```

Or use the provided script:
```bash
cd ui
./clear-cache.sh
```

### ✅ Solution 2: Clear Browser Cache & Cookies

The browser may have cached the old API endpoint or stale authentication data.

**Steps**:
1. Open browser DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Clear:
   - ✅ Cookies
   - ✅ Local Storage
   - ✅ Session Storage
4. Hard reload: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### ✅ Solution 3: Verify API Server is Running

Check if the API server is actually running and accessible:

```bash
# Check if API is running on port 3001
netstat -ano | findstr :3001

# Test API directly
curl http://localhost:3001/api/v1/status

# Or in browser, visit:
# http://localhost:3001/api/v1/status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "..."
  }
}
```

### ✅ Solution 4: Check Environment Variables

Verify the UI is using the correct API endpoint:

**File**: `ui/.env.local`

Should contain:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
CECBS_API_URL=http://localhost:3001/api/v1
```

**After editing**, restart the UI server!

### ✅ Solution 5: Test Login with cURL

Test the login endpoint directly to confirm it's working:

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

Expected response (success):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1",
      "username": "admin",
      "role": "ADMIN",
      ...
    }
  }
}
```

Expected response (401 error):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

If you get 401 here, the username/password is incorrect!

### ✅ Solution 6: Check User Credentials

Verify the user exists and has correct password:

```bash
cd api
node check-users.js
```

This will list all users in the database. If no users exist or you need to reset a password:

```bash
# Create a test user
node create-test-user.js "Quality Inspector"

# Or reset existing user password
node reset-password.js admin
```

### ✅ Solution 7: Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for the `/api/v1/auth/login` request
5. Check:
   - **Request URL**: Should be `http://localhost:3001/api/v1/auth/login`
   - **Request Method**: Should be `POST`
   - **Request Payload**: Should have `username` and `password`
   - **Response Status**: Check if it's 401, 404, 500, etc.
   - **Response Body**: Read the error message

**Common Issues**:
- **404 Not Found**: API server not running or wrong URL
- **401 Unauthorized**: Wrong username/password OR account suspended/inactive
- **500 Internal Server Error**: Database connection issue
- **CORS Error**: ALLOWED_ORIGINS not configured correctly

### ✅ Solution 8: Complete System Restart

If all else fails, restart everything:

```bash
# Stop all services
# Press Ctrl+C in all running terminals

# Restart API
cd api
npm run dev

# Restart UI (in new terminal)
cd ui
rm -rf .next
npm run dev
```

Or use the system starter:
```bash
./START-SYSTEM.bat
```

## Quick Fix Checklist

- [ ] Restart UI server after clearing `.next` cache
- [ ] Clear browser cache, cookies, and local storage
- [ ] Hard reload browser (Ctrl+Shift+R)
- [ ] Verify API is running on port 3001
- [ ] Verify `.env.local` has correct API_BASE_URL
- [ ] Test login with cURL to isolate issue
- [ ] Check user exists and is 'active' in database
- [ ] Check browser Network tab for actual error

## Most Common Solution

**90% of the time, the fix is:**

1. **Clear Next.js cache**:
   ```bash
   cd ui
   rm -rf .next
   ```

2. **Restart UI**:
   ```bash
   npm run dev
   ```

3. **Hard reload browser**: `Ctrl+Shift+R`

4. **Clear browser local storage**: 
   - Open DevTools → Application → Local Storage → localhost:3000
   - Click "Clear All"

## Still Not Working?

Check the API logs for detailed error messages:

```bash
# View API logs
tail -f api/logs/combined.log

# Or check console output where API is running
```

Common log messages:
- `Failed login attempt for username: xxx` = Wrong password
- `Login attempt for suspended account` = Account not active
- `User not found` = Username doesn't exist

---

**After applying the fix, you should be able to login successfully!** 🎉

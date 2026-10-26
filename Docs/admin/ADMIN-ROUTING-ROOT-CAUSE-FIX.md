# 🔧 Admin Routing - Root Cause & Complete Fix

**Issue**: Admin user (admin/admin123) redirects to ECTA portal instead of Admin portal  
**Root Cause**: Next.js cached build + browser localStorage cache  
**Status**: Requires clean rebuild

---

## 🎯 Root Cause Analysis

### Issue Confirmed:
1. ✅ Database: Admin user has `role = 'ADMIN'` (correct)
2. ✅ Code: `AuthContext.tsx` has `ADMIN: '/admin'` (correct)
3. ✅ Code: `pages/index.tsx` has `ADMIN: '/admin'` (correct)
4. ❌ Runtime: Still redirecting to `/portals/ecta`

### Why It's Happening:

**Problem 1: Next.js Build Cache**
- Next.js caches compiled code in `.next` folder
- Your running server is using OLD cached version
- Even though source code is fixed, cache has old code
- Hot Module Replacement (HMR) didn't reload this file properly

**Problem 2: Browser LocalStorage Cache**
- Browser has cached user object from old login
- This cached data is being reused
- Need to force fresh authentication

---

## ✅ Complete Fix (3 Steps)

### Step 1: Stop UI Server

In your terminal where UI is running:
```
Press: Ctrl + C
```

###  Step 2: Delete .next Cache

#### Option A: Run the batch file (Easiest)
```bash
cd c:\goCBC
FIX-ADMIN-ROUTING-COMPLETE.bat
```

#### Option B: Manual commands
```bash
cd c:\goCBC\ui
rmdir /s /q .next
npm run dev
```

### Step 3: Clear Browser Cache & Login

1. Open browser: http://localhost:3000
2. Press **F12** (DevTools)
3. Go to **Application** tab
4. Expand **Local Storage** → Click `http://localhost:3000`
5. Right-click → **Clear**
6. Close DevTools
7. Login: `admin` / `admin123`
8. **Should now go to `/admin`** ✅

---

## 🔍 Verification Steps

After following the fix:

### Check 1: URL is correct
```
Expected: http://localhost:3000/admin
NOT:      http://localhost:3000/portals/ecta
```

### Check 2: Header is correct
```
Expected: "System Administrator Portal"
NOT:      "ECTA Portal" or "Ethiopian Coffee & Tea Authority"
```

### Check 3: Content is correct
```
Expected: 4 tabs (User Management, System Overview, Analytics, Settings)
NOT:      ECTA-specific tabs (Applications, Exporters, Quality Control)
```

### Check 4: Badge shows SUPER ADMIN
```
Expected: Red badge saying "SUPER ADMIN"
NOT:      Any other role badge
```

---

## 🐛 If Still Not Working

### Debug Step 1: Check what code is running

1. Open browser DevTools (F12)
2. Go to **Sources** tab
3. Navigate to: `webpack-internal:///./src/contexts/AuthContext.tsx`
4. Search for "ADMIN" (Ctrl+F)
5. Find line with `ADMIN:`
6. **Should show**: `ADMIN: '/admin',`
7. **If shows**: `ADMIN: '/portals/ecta',` → Cache not cleared properly

### Debug Step 2: Check localStorage

In browser console (F12), run:
```javascript
localStorage.getItem('user')
```

You should see `null` (after clearing) or a user object with `"role":"ADMIN"`

### Debug Step 3: Check login response

1. Open **Network** tab in DevTools
2. Clear network log
3. Login with admin/admin123
4. Find `login` request
5. Click it → **Response** tab
6. Check: `data.user.role` should be `"ADMIN"`

### Debug Step 4: Check routing decision

Add console.log to see what's happening:

In AuthContext.tsx, after line 164, add:
```typescript
console.log('User role:', userData.role);
console.log('Target route:', roleRoute);
console.log('Portal routes:', portalRoutes);
```

Then check browser console after login.

---

## 📝 Technical Explanation

### Why Clearing .next is Necessary

Next.js uses incremental compilation:
1. First time: Compiles all files
2. Saves compiled code in `.next/`
3. Next time: Uses cached version (faster)
4. HMR: Only reloads changed files

**Problem**: Sometimes HMR doesn't catch all dependencies, especially in context files that affect routing.

**Solution**: Delete `.next` folder forces full recompilation from source files.

### Why Clearing localStorage is Necessary

Authentication flow:
1. Login → API returns user object
2. Store in localStorage for persistence
3. On page reload: Check localStorage first
4. If found: Restore session without API call

**Problem**: Old user object cached before code fix.

**Solution**: Clear localStorage forces fresh login with new routing logic.

---

## 🎯 Expected Flow After Fix

```
1. User opens http://localhost:3000
   ↓
2. Not authenticated → Redirect to /login
   ↓
3. Enter: admin / admin123
   ↓
4. Click Login
   ↓
5. API: POST /api/v1/auth/login
   Response: { user: { role: "ADMIN", ... }, token: "..." }
   ↓
6. AuthContext.tsx: login() function
   - Stores token & user in localStorage
   - Checks portalRoutes[ADMIN] = '/admin'
   - Calls router.push('/admin')
   ↓
7. Browser navigates to: http://localhost:3000/admin
   ↓
8. pages/admin/index.tsx loads
   ↓
9. Renders: AdminPortal component
   ↓
10. User sees: "System Administrator Portal" ✅
```

---

## 🚀 Automated Fix Script

I've created: `FIX-ADMIN-ROUTING-COMPLETE.bat`

This script:
1. Stops UI server
2. Deletes .next cache
3. Restarts with fresh build
4. Shows instructions for clearing localStorage

**To run**:
```bash
cd c:\goCBC
FIX-ADMIN-ROUTING-COMPLETE.bat
```

---

## ✅ Success Criteria

After applying the fix, confirm:

- [ ] UI server restarted (npm run dev)
- [ ] .next folder was deleted and recreated
- [ ] Browser localStorage cleared
- [ ] Fresh login with admin/admin123
- [ ] URL shows `/admin`
- [ ] Page header shows "System Administrator Portal"
- [ ] Badge shows "SUPER ADMIN"
- [ ] 4 tabs visible
- [ ] No ECTA-specific content

---

## 📊 Files Checked

✅ `ui/src/contexts/AuthContext.tsx` - ADMIN: '/admin' ✓  
✅ `ui/src/pages/index.tsx` - ADMIN: '/admin' ✓  
✅ `api/cecbs.db` - admin user role = 'ADMIN' ✓  
❌ `ui/.next/` - Cached old version (needs deletion)  
❌ Browser localStorage - Cached old user object (needs clearing)

---

## 🎉 Summary

**The code is correct, but cached versions are running!**

**Solution**: 
1. Delete `.next` folder (force rebuild)
2. Clear localStorage (force re-login)
3. Login again → Should work!

---

**Run now**:
```bash
FIX-ADMIN-ROUTING-COMPLETE.bat
```

Then clear localStorage and login!

---

**Last Updated**: August 2, 2026  
**Status**: ⏳ Awaiting cache clear & rebuild  
**Expected Result**: Admin → `/admin` portal ✅

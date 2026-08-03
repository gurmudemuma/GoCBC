# 🔧 Force Admin Redirect Fix - Step by Step

**Issue**: Admin still redirects to ECTA portal after login  
**Cause**: Cached user data in browser localStorage  
**Solution**: Clear cache and force fresh login

---

## 🎯 Quick Fix (Do This Now!)

### Step 1: Open Browser DevTools
Press **F12** (or right-click → Inspect)

### Step 2: Go to Application Tab
Click on **"Application"** tab in DevTools

### Step 3: Clear Local Storage
1. In left sidebar, expand **"Local Storage"**
2. Click on **"http://localhost:3000"**
3. You'll see stored items like:
   - `authToken`
   - `user`
4. **Right-click** on the domain → **"Clear"**
5. Or select each item and press **Delete** key

### Step 4: Hard Refresh
Press **Ctrl + Shift + R** (Windows)  
Or **Cmd + Shift + R** (Mac)

### Step 5: Login Again
1. You'll be redirected to login page
2. Login with:
   ```
   Username: admin
   Password: admin123
   ```
3. **Should now redirect to `/admin`** ✅

---

## 🔍 Alternative Method (If Above Doesn't Work)

### Method 2: Console Command

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Paste this command and press Enter:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
4. Login again with admin/admin123

---

## 🔍 Verify the Fix is Applied

Before clearing cache, let's verify the code change is there:

1. Open DevTools (F12)
2. Go to **Sources** tab
3. Navigate to: `src → contexts → AuthContext.tsx`
4. Search for "ADMIN" (Ctrl+F)
5. Look for line with `ADMIN:` 
6. **Should say**: `ADMIN: '/admin'` ✅
7. **Should NOT say**: `ADMIN: '/portals/ecta'` ❌

If it still shows `/portals/ecta`, the file didn't reload. Try:
- Stop UI server (Ctrl+C)
- Start again: `npm start`

---

## 🐛 Advanced Debugging

If it still doesn't work, let's check what's happening:

### Check 1: What user object is stored?

Open Console (F12) and type:
```javascript
JSON.parse(localStorage.getItem('user'))
```

Look at the `role` field. Should be: `"ADMIN"`

### Check 2: Test the routing logic

In Console, type:
```javascript
const portalRoutes = {
  ECTA: '/portals/ecta',
  ECX: '/portals/ecx',
  NBE: '/portals/nbe',
  BANKS: '/portals/banks',
  CUSTOMS: '/portals/customs',
  SHIPPING: '/portals/shipping',
  EXPORTER: '/portals/exporter',
  ADMIN: '/admin'
};
console.log('ADMIN should go to:', portalRoutes.ADMIN);
```

Should print: `ADMIN should go to: /admin`

### Check 3: Inspect login response

1. Open **Network** tab in DevTools
2. Clear network log
3. Login with admin/admin123
4. Find the **login** request
5. Click on it → **Response** tab
6. Check the `user.role` field
7. Should be: `"ADMIN"`

---

## ✅ Expected Behavior

### After Clearing Cache:

**Step 1: Login**
```
URL: http://localhost:3000/login
Enter: admin / admin123
Click: Login
```

**Step 2: Authentication**
```
API Call: POST /api/v1/auth/login
Response: { user: { role: "ADMIN", ... }, token: "..." }
```

**Step 3: Routing Decision**
```
AuthContext.tsx: portalRoutes[ADMIN] = '/admin'
router.push('/admin') is called
```

**Step 4: Redirect**
```
URL changes to: http://localhost:3000/admin
Page loads: System Administrator Portal
Header shows: "System Administrator Portal"
Badge shows: "SUPER ADMIN"
```

---

## 🚨 If Still Not Working

### Nuclear Option: Full Reset

```bash
# 1. Stop UI server (Ctrl+C in terminal)

# 2. Clear browser completely
# - Close ALL browser tabs
# - Clear browsing data (Ctrl+Shift+Del)
#   ✅ Cached images and files
#   ✅ Cookies and site data
#   ✅ Hosted app data
# - Close browser completely

# 3. Delete node_modules cache (optional)
cd ui
rm -rf .next
npm run build

# 4. Restart everything
npm start

# 5. Open fresh browser window
# 6. Navigate to http://localhost:3000
# 7. Login with admin/admin123
```

---

## 📱 Browser-Specific Instructions

### Chrome/Edge
1. F12 → Application → Local Storage → Clear
2. Ctrl+Shift+R to hard refresh

### Firefox
1. F12 → Storage → Local Storage → Clear
2. Ctrl+Shift+R to hard refresh

### Safari
1. Cmd+Option+C → Storage → Local Storage → Clear
2. Cmd+Shift+R to hard refresh

---

## 🎯 Success Checklist

After clearing cache and logging in, you should see:

- [ ] URL is `http://localhost:3000/admin` (not `/portals/ecta`)
- [ ] Header says "System Administrator Portal" (not "ECTA Portal")
- [ ] User badge shows "SUPER ADMIN"
- [ ] 4 tabs visible: User Management, System Overview, Analytics, Settings
- [ ] Statistics cards showing: Total Users, Organizations, Identities, Expiring Certs
- [ ] No ECTA-specific content (applications, pending exports, etc.)

---

## 💡 Why This Happens

When you first logged in:
1. Old code had: `ADMIN: '/portals/ecta'`
2. Login stored user object in localStorage
3. This cached data is reused on page reload
4. Even after fixing the code, old cache is used

**Solution**: Clear cache forces fresh authentication with new routing logic!

---

## 📞 Still Need Help?

If after clearing localStorage you still see ECTA portal:

1. **Share screenshot** of:
   - Browser URL bar (showing the URL)
   - Page header (showing portal name)
   - DevTools Console (any errors?)

2. **Check browser console** for:
   ```javascript
   localStorage.getItem('user')
   // Should show role: "ADMIN"
   ```

3. **Verify file was saved**:
   - Check `ui/src/contexts/AuthContext.tsx`
   - Line with `ADMIN:` should be `ADMIN: '/admin',`

---

**Quick Command to Run Now**:

Open browser console (F12) and run:
```javascript
localStorage.clear(); 
location.href = '/login';
```

Then login again with `admin` / `admin123`!

---

**Status**: ⏳ Waiting for cache clear  
**Expected Result**: Admin Portal at `/admin` ✅

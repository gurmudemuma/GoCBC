# 🎯 Easy Forex Allocation Test Guide

## Option 1: Get Me Your Auth Token (Fastest)

### Steps:
1. Open browser: http://localhost:3000
2. Login as bank user (CBE)
3. Press **F12** to open DevTools
4. Click **Console** tab
5. Type this and press Enter:
   ```javascript
   localStorage.getItem('authToken')
   ```
6. Copy the token (looks like: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
7. Give me the token
8. I'll run: `node test-forex-allocation.js YOUR_TOKEN`

## Option 2: Test Manually in UI (Recommended)

### Step-by-Step Visual Test:

#### 🏦 Part 1: Issue an LC
1. ✅ Login as bank user (CBE)
2. ✅ Go to **Banks Portal**
3. ✅ Click **Payment Methods** tab
4. ✅ Select **Letter of Credit** sub-tab
5. ✅ Click **"Create New Letter of Credit"** button
   - 📌 **EXPECT**: Contract selector dialog opens
   - ❌ **IF ERROR**: Contract selector doesn't open → Tell me
6. ✅ Select any approved contract from the list
7. ✅ Click **"Continue"** button
   - 📌 **EXPECT**: LC form opens with pre-filled data
8. ✅ Fill in remaining fields if needed
9. ✅ Click **"Submit"** / **"Issue LC"** button
   - 📌 **EXPECT**: Success message
   - 📌 **EXPECT**: LC disappears from this tab

#### 💱 Part 2: Check Forex Allocation Tab
10. ✅ Click **"Banking Operations"** tab (at top)
11. ✅ Click **"3. Forex Allocation"** sub-tab
    - 📌 **EXPECT**: Should show "Showing 1 of 1 allocations"
    - ❌ **IF**: Shows "Showing 0 of 0 allocations" → API needs restart

#### If Forex Shows (SUCCESS):
12. ✅ You should see a table with:
    - Forex ID (with `_v2` at the end)
    - LC Reference
    - Exporter ID
    - Amount
    - Status: **REQUESTED**
    - **"Allocate Forex"** button

13. ✅ Click **"Allocate Forex"** button
14. ✅ Fill in the forex allocation form:
    - Exchange Rate: `57.50`
    - Expiry Date: (pick a future date)
    - Bank Officer: (your name)
    - Approval Ref: `FOREX-TEST-001`
15. ✅ Click **"Submit"**
    - 📌 **EXPECT**: Success message
    - 📌 **EXPECT**: Forex disappears from this tab

#### 📄 Part 3: Verify LC Returns
16. ✅ Go back to **Payment Methods** tab
17. ✅ Check **Letter of Credit** sub-tab
    - 📌 **EXPECT**: LC reappears (no longer hidden)
    - 📌 **EXPECT**: Shows next workflow step

## ✅ Success Checklist

- [ ] Contract selector opens when creating LC
- [ ] LC disappears after issuance
- [ ] Forex appears in Banking Operations → Forex Allocation
- [ ] Forex has `_v2` in ID
- [ ] Allocate Forex button works
- [ ] LC reappears after forex allocation

## ❌ Troubleshooting

### Problem: "Showing 0 of 0 allocations" in Forex tab

**Cause**: API not restarted after code changes

**Fix**:
```bash
# Stop API (Ctrl+C if running in terminal)
cd c:\goCBC\api
npm start
```

Then repeat the test from step 1.

### Problem: Contract selector doesn't open

**Cause**: Browser cache has old UI code

**Fix**:
- Press **Ctrl+Shift+R** (hard refresh)
- Or clear browser cache
- Try again

### Problem: Error when issuing LC

**Possible Causes**:
1. Exporter not registered
2. Contract not approved
3. Blockchain not synced

**Fix**: Share the error message with me

## 📸 What to Share If Issues

If something doesn't work, share screenshots of:
1. The error message
2. The Forex Allocation tab (showing 0 or X allocations)
3. Browser console (F12 → Console tab)
4. API terminal logs

## Need Help?

Just tell me:
- ✅ "Step X works" 
- ❌ "Step X failed with error: ..."
- 🤔 "Step X showed: ..." (unexpected result)

I'll help fix it immediately!

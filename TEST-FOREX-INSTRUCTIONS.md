# Forex Allocation Testing Instructions

## Prerequisites
1. ✅ API server running on http://localhost:3001
2. ✅ Have a valid authentication token from logging into the system
3. ✅ Node.js installed

## How to Get Your Auth Token

### Option 1: From Browser (Easiest)
1. Open your application in browser (http://localhost:3000)
2. Login as a bank user (CBE)
3. Open Browser DevTools (F12)
4. Go to **Console** tab
5. Type: `localStorage.getItem('authToken')`
6. Press Enter
7. Copy the token (long string of characters)

### Option 2: From Network Tab
1. Login to the application
2. Open Browser DevTools (F12)
3. Go to **Network** tab
4. Make any action (refresh page)
5. Click on any API request
6. Look for **Authorization** header: `Bearer YOUR_TOKEN_HERE`
7. Copy the token part (after "Bearer ")

## Running the Test

```bash
# Navigate to project directory
cd c:\goCBC

# Run the test script with your token
node test-forex-allocation.js YOUR_AUTH_TOKEN_HERE
```

## Example Output

### ✅ Successful Test (Forex with _v2 suffix):
```
🧪 Testing Forex Allocation Workflow

============================================================

📊 Step 1: Query Forex Allocations
------------------------------------------------------------
✅ Forex query successful
   Found 5 forex allocation(s)

   Forex Records:
   1. FOREX_LC1737570123456_1737570150000_v2
      - LC: LC1737570123456
      - Exporter: EXP001
      - Amount: USD 170000
      - Status: REQUESTED
      - Has _v2 suffix: ✅ YES
```

### ⚠️ Warning (No Forex Found):
```
📊 Step 1: Query Forex Allocations
------------------------------------------------------------
✅ Forex query successful
   Found 0 forex allocation(s)
   ⚠️  No forex allocations found
   💡 This could mean:
      1. No LCs have been issued yet
      2. Forex auto-creation failed during LC issuance
      3. Only old forex records exist (without _v2 suffix)
```

## What to Look For

### ✅ Good Signs:
- Forex records have `_v2` suffix in their ID
- Number of forex requests matches number of issued LCs
- Status shows "REQUESTED" for pending allocations

### ❌ Problems:
- No forex allocations found despite having issued LCs
- Forex IDs don't have `_v2` suffix
- API returns errors

## Troubleshooting

### Problem: No forex allocations found
**Solution**: 
1. Restart API server: `cd api && npm start`
2. Issue a NEW LC through the UI
3. Run test again

### Problem: Forex without _v2 suffix
**Solution**:
1. These are old records
2. Restart API to load new code
3. Issue a NEW LC (old LCs won't be updated)

### Problem: Test script fails with connection error
**Solution**:
1. Verify API is running: Check http://localhost:3001/health
2. Check your auth token is correct
3. Make sure you're using the right port number

## Next Steps After Test

If test shows forex with _v2 suffix:
1. ✅ Open browser to http://localhost:3000
2. ✅ Login as bank user (CBE)
3. ✅ Go to Banks Portal → Banking Operations tab
4. ✅ Click "3. Forex Allocation" subtab
5. ✅ You should see the forex request(s) from the test
6. ✅ Click "Allocate Forex" button to test the allocation dialog

## Manual UI Test Checklist

After running the script successfully:

- [ ] Login to application as bank user
- [ ] Go to Payment Methods → Letter of Credit
- [ ] Click "Create New LC" - contract selector should open
- [ ] Select a contract and fill LC form
- [ ] Submit LC - should disappear from Payment Methods tab
- [ ] Go to Banking Operations → 3. Forex Allocation
- [ ] Verify forex request appears here
- [ ] Click "Allocate Forex" button
- [ ] Fill forex allocation form and submit
- [ ] Verify forex disappears after allocation
- [ ] Go back to Payment Methods → check if LC reappeared

## Need Help?

If you see any errors or unexpected behavior, share:
1. The output from this test script
2. Screenshot of the Forex Allocation tab
3. Any error messages from browser console

# Troubleshooting: Exporter Registration Not Appearing in ECTA Portal

**Date**: July 13, 2026  
**Exporter ID**: EXP1803244

---

## Problem

Exporter registered successfully but doesn't appear in ECTA Portal for approval.

---

## Root Cause

The exporter registration workflow has two stages:

1. **Application Stage** (Database) - Exporter submits application → Stored in `exporter_applications` table with status `PENDING`
2. **Approval Stage** (Blockchain) - ECTA approves → Registered to blockchain as active exporter

**The ECTA Portal needs to load PENDING applications from the database, not from the blockchain.**

---

## Solution Steps

### Step 1: Refresh ECTA Portal
1. Open ECTA Portal at `http://localhost:3002`
2. Log in as ECTA admin
3. Press **F5** or **Ctrl+R** to refresh the page
4. Go to **"Exporter Applications"** tab (or similar tab that shows pending applications)

### Step 2: Check for Pending Applications
Look for:
- **Exporter ID**: EXP1803244
- **Status**: PENDING
- **Application ID**: APP-XXXXXXXX (8-digit number)

### Step 3: If Still Not Visible

#### Check API Endpoint
Open browser DevTools (F12) → Network tab → Look for:
```
GET /api/v1/exporters/exporter-applications?status=pending
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "applicationId": "APP-12345678",
      "exporterId": "EXP1803244",
      "companyName": "...",
      "status": "PENDING",
      ...
    }
  ]
}
```

#### Check Database Directly
If you have database access:
```bash
# Check if application exists
sqlite3 api/cecbs.db "SELECT * FROM exporter_applications WHERE exporterId='EXP1803244';"

# Check all pending applications
sqlite3 api/cecbs.db "SELECT applicationId, exporterId, companyName, status FROM exporter_applications WHERE status='pending';"
```

#### Check API Logs
```bash
# View recent API activity
docker logs cecbs-api --tail 100 | grep EXP1803244

# Or if API running in terminal
# Check terminal 21 output for any errors
```

---

## Common Issues & Fixes

### Issue 1: Application Status Not "pending"
**Symptom**: Application exists but has different status  
**Cause**: Registration set status to "APPROVED" or "REGISTERED"  
**Fix**: 
```sql
UPDATE exporter_applications 
SET status='pending' 
WHERE exporterId='EXP1803244';
```

### Issue 2: UI Not Rendering Applications
**Symptom**: API returns data but UI shows empty table  
**Cause**: Frontend state not updating or filter applied  
**Fix**:
- Clear any search/filter inputs
- Check browser console (F12) for JavaScript errors
- Hard refresh: Ctrl+Shift+R (clears cache)

### Issue 3: Wrong Tab Selected
**Symptom**: Looking at wrong tab in ECTA Portal  
**Cause**: ECTA Portal has multiple tabs (Exporters, Applications, Quality, etc.)  
**Fix**: Make sure you're on the **"Exporter Applications"** or **"Pending Applications"** tab, NOT the "Registered Exporters" tab

### Issue 4: Wrong User Role
**Symptom**: Logged in as different organization  
**Cause**: User might be logged in as Exporter, not ECTA  
**Fix**: 
- Logout
- Login as ECTA admin
- ECTA users should see ECTA Portal with approval options

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EXPORTER REGISTRATION                                     │
│    (Exporter Portal)                                         │
│                                                              │
│    Fill Form → Submit Application                           │
│         ↓                                                    │
│    Database: INSERT INTO exporter_applications              │
│    Status: "PENDING"                                        │
│    Exporter ID: EXP1803244                                  │
│    Application ID: APP-XXXXXXXX                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ECTA REVIEW                                               │
│    (ECTA Portal)                                             │
│                                                              │
│    Load: GET /api/v1/exporters/exporter-applications?       │
│          status=pending                                      │
│         ↓                                                    │
│    Display Table: Pending Applications                      │
│    - Application ID                                         │
│    - Exporter ID: EXP1803244                               │
│    - Company Name                                           │
│    - Actions: [Approve] [Reject]                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ECTA APPROVAL                                             │
│    (ECTA Portal)                                             │
│                                                              │
│    Click [Approve] Button                                   │
│         ↓                                                    │
│    API: POST /api/v1/exporters/approve                     │
│         ↓                                                    │
│    Blockchain: RegisterExporter(EXP1803244, ...)           │
│         ↓                                                    │
│    Database: UPDATE status='APPROVED'                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EXPORTER ACTIVE                                           │
│                                                              │
│    Blockchain: Exporter registered                          │
│    Database: Status "APPROVED"                              │
│    Exporter Portal: Can now register contracts             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Debug Commands

```bash
# 1. Check if API is running
curl http://localhost:3001/health

# 2. Check if application exists (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/exporters/exporter-applications?status=pending

# 3. Check API logs for registration
grep "EXP1803244" api/logs/combined.log

# 4. Restart API if needed
cd api && npm start

# 5. Restart UI if needed
cd ui && npm run dev
```

---

## Expected ECTA Portal View

```
┌────────────────────────────────────────────────────────────────┐
│ ECTA Portal - Exporter Applications                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Tabs: [Applications] [Registered] [Quality] [Permits]          │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Pending Applications (1)                                  │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │ App ID      │ Exporter ID │ Company    │ Date  │ Actions │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │ APP-0377... │ EXP1803244  │ Your Co.   │ 07/13 │ [View]  │  │
│ │             │             │            │       │ [Approve│  │
│ │             │             │            │       │ [Reject]│  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## If Problem Persists

1. **Check browser console** (F12 → Console tab) for JavaScript errors
2. **Check Network tab** (F12 → Network) to see if API call succeeds
3. **Verify user role**: Make sure you're logged in as ECTA, not Exporter
4. **Clear browser cache**: Ctrl+Shift+Del → Clear cache
5. **Try different browser**: Test in Chrome/Firefox/Edge

---

## Contact Information

If you continue to face issues:
- Check API logs: `docker logs cecbs-api --tail 100`
- Check UI logs: Check terminal where `npm run dev` is running
- Database query: Check `exporter_applications` table directly

---

**Status**: PENDING RESOLUTION  
**Next Action**: Refresh ECTA Portal and check "Exporter Applications" tab

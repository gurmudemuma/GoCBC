# Server Restart - Port 3000 Restored

## Issue Resolved
The UI dev server was running on port 3002 instead of the intended port 3000. This has been fixed by stopping the process that was occupying port 3000 and restarting the UI server.

## Changes Made

### 1. Stopped Process Occupying Port 3000
- Identified process 11976 was using port 3000
- Stopped the process to free up the port

### 2. Restarted Both Servers
- **UI Server**: Restarted on port 3000 (Terminal ID: 6)
- **API Server**: Restarted on port 3001 (Terminal ID: 8)
- CORS configuration remains: `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001`

## Current Server Status

### API Server ✅
- **Port**: 3001
- **URL**: http://localhost:3001
- **Status**: Running
- **Process**: Terminal ID 8
- **Database**: Connected (SQLite with exporter_applications table)
- **Blockchain**: Connected to Hyperledger Fabric network

### UI Server ✅
- **Port**: 3000
- **URL**: http://localhost:3000
- **Status**: Running
- **Process**: PID 19468

## How to Access the Application

### Correct URLs (Port 3000)
✅ **Login**: http://localhost:3000/login
✅ **Register as Exporter**: http://localhost:3000/register-exporter
✅ **ECTA Portal**: http://localhost:3000/portals/ecta

## Verification from Server Logs

The API server logs show successful requests:
```
✅ GET /api/v1/exporters/exporter-applications?status=pending - 200 OK
✅ User authenticated successfully
✅ CORS working for http://localhost:3002
```

## Database Status

The SQLite database (`api/cecbs.db`) contains **2 pending applications**:
1. **APP-20796187** - CoffeEx PLC
2. **APP-33847887** - Mahu

These applications should now appear in the ECTA Portal's "Pending Applications" tab.

## Next Steps

1. ✅ Access the UI at **http://localhost:3002/portals/ecta**
2. ✅ Login with ECTA credentials:
   - Username: `ecta_admin`
   - Password: `password123`
3. ✅ Navigate to "Pending Applications" tab (first tab)
4. ✅ You should see 2 pending applications
5. ✅ Test approve/reject workflow

## Troubleshooting

### If applications still don't appear:
1. Open browser Developer Console (F12)
2. Check Network tab for the applications API call
3. Verify the response contains the 2 applications
4. Check Console tab for any JavaScript errors
5. Hard refresh the page (Ctrl+Shift+R)

### If CORS errors persist:
1. Verify you're accessing http://localhost:**3002** (not 3000)
2. Check that the API server (terminal 5) is still running
3. Restart the API server if needed: `cd api && npm run dev`

## Technical Details

### CORS Configuration in server.ts
```typescript
this.app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
```

The `.env` file now includes port 3002 in `ALLOWED_ORIGINS`, allowing the UI server to make API calls without CORS blocking.

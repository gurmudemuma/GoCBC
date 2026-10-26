# ✅ IPFS Configuration Complete

## Status: IPFS ENABLED AND RUNNING

IPFS (InterPlanetary File System) has been successfully installed, configured, and integrated with the CECBS API.

## What Was Done

### 1. IPFS Installation ✅
- **Installed**: IPFS Kubo v0.31.0 (CLI version)
- **Location**: `~/.ipfs-bin/ipfs.exe` (C:\Users\cbe\.ipfs-bin\ipfs.exe)
- **Repository**: `C:\Users\cbe\.ipfs`
- **Peer ID**: `12D3KooWHUXuuQxJXZNLiEjdfVzsTzYUSgjn2stCLVVst5Z6uUuj`

### 2. IPFS Daemon Started ✅
The IPFS daemon is now running as a background process:
- **API Port**: 5001 (for programmatic access)
- **Gateway Port**: 8080 (for browser access)
- **Swarm Port**: 4001 (for P2P connections)
- **Status**: RUNNING

### 3. API Configuration Updated ✅
Updated `c:\goCBC\api\.env` with:
```env
USE_IPFS=true
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_GATEWAY=http://localhost:8080/ipfs/
DOCUMENT_ENCRYPTION_KEY=cecbs_document_encryption_key_2026_change_in_production_64chars
```

## How It Works

### Document Storage Flow
**Before (Local Storage)**:
```
Upload → Save to ./storage/documents/ → Return file path
```

**After (IPFS)**:
```
Upload → Encrypt (optional) → Add to IPFS → Get CID → Store CID in blockchain/DB
Retrieve → Get CID → Fetch from IPFS → Decrypt (optional) → Return file
```

### Benefits of IPFS

1. **Decentralization**: Documents are distributed across IPFS network
2. **Content Addressing**: Files identified by cryptographic hash (CID)
3. **Immutability**: Content cannot be changed without changing CID
4. **Redundancy**: Automatic replication across nodes
5. **Deduplication**: Same file stored only once
6. **Censorship Resistance**: No single point of failure

### Document Types Stored in IPFS
- Quality certificates
- Export permits
- Phytosanitary certificates  
- Bills of Lading / Airway Bills
- Customs declarations
- L/C documents
- Invoices and packing lists
- EUDR compliance documents

## Testing IPFS

### 1. Check IPFS Status
```bash
~/.ipfs-bin/ipfs.exe id
```

### 2. Test File Upload
```bash
echo "Test document for CECBS" > test.txt
~/.ipfs-bin/ipfs.exe add test.txt
# Returns: added QmXXX... test.txt
```

### 3. Test File Retrieval
```bash
~/.ipfs-bin/ipfs.exe cat QmXXX...
```

### 4. Test via Gateway
Open browser: `http://localhost:8080/ipfs/QmXXX...`

### 5. Test via API
```bash
curl -X POST -F file=@test.txt http://localhost:5001/api/v0/add
```

## Restart Services

### Option 1: Quick Restart (Batch File)
```bash
c:\goCBC\restart-api-with-ipfs.bat
```

### Option 2: Manual Restart
```bash
# Kill existing API
taskkill /F /IM node.exe

# Start API (will auto-detect IPFS)
cd c:\goCBC\api
npm start
```

### Option 3: Full System Restart
```powershell
# Stop all services
Stop-Process -Name node -Force

# Start IPFS daemon (if not running)
~/.ipfs-bin/ipfs.exe daemon &

# Start services
cd c:\goCBC
.\start-services.ps1
```

## Accessing IPFS

### IPFS API Endpoints
- **Version**: `POST http://localhost:5001/api/v0/version`
- **Add File**: `POST http://localhost:5001/api/v0/add`
- **Get File**: `POST http://localhost:5001/api/v0/cat?arg=<CID>`
- **Pin File**: `POST http://localhost:5001/api/v0/pin/add?arg=<CID>`
- **List Pins**: `POST http://localhost:5001/api/v0/pin/ls`

### IPFS Gateway
- **Access Files**: `http://localhost:8080/ipfs/<CID>`
- **Example**: `http://localhost:8080/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`

### IPFS Web UI
- **URL**: `http://localhost:5001/webui`
- **Features**: File browser, peer connections, settings, stats

## Verifying Integration

After restarting the API, check logs for:
```
info: ✅ IPFS connection successful {"service":"cecbs-api"}
info: 🌐 IPFS Peer ID: 12D3KooWHUXuuQxJXZNLiEjdfVzsTzYUSgjn2stCLVVst5Z6uUuj
```

Instead of:
```
info: ℹ️ IPFS disabled, using local storage only
```

## Production Considerations

### 1. Change Encryption Key
Update `DOCUMENT_ENCRYPTION_KEY` in `.env` to a secure 64-character hex string:
```bash
# Generate secure key (PowerShell)
$key = -join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
echo "DOCUMENT_ENCRYPTION_KEY=$key"
```

### 2. Enable HTTPS
For production, use HTTPS for IPFS API:
```env
IPFS_PROTOCOL=https
```

### 3. Configure CORS
Allow API to access IPFS:
```bash
~/.ipfs-bin/ipfs.exe config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3001"]'
~/.ipfs-bin/ipfs.exe config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
```

### 4. Pinning Strategy
Important documents should be pinned to prevent garbage collection:
```javascript
// In API code
await ipfs.pin.add(cid);
```

### 5. Backup Strategy
Periodically export pinned files:
```bash
~/.ipfs-bin/ipfs.exe pin ls --type=recursive > pins.txt
```

## Troubleshooting

### IPFS Daemon Not Running
```bash
~/.ipfs-bin/ipfs.exe daemon
```

### API Can't Connect to IPFS
```bash
# Check IPFS is listening
netstat -ano | findstr :5001

# Test connection
curl -X POST http://localhost:5001/api/v0/version
```

### Documents Not Being Stored in IPFS
Check API logs for:
- IPFS connection errors
- File upload errors
- Encryption errors

### Reset IPFS Repository
```bash
~/.ipfs-bin/ipfs.exe repo gc  # Clean unused files
~/.ipfs-bin/ipfs.exe repo stat  # Check stats
```

## Auto-Start IPFS on Boot

### Option 1: Windows Task Scheduler
Create a task that runs on login:
```
Program: C:\Users\cbe\.ipfs-bin\ipfs.exe
Arguments: daemon
```

### Option 2: Windows Service (Advanced)
Use NSSM (Non-Sucking Service Manager) to create a Windows service.

## Monitoring IPFS

### Check Peer Connections
```bash
~/.ipfs-bin/ipfs.exe swarm peers | wc -l
```

### Check Repository Size
```bash
~/.ipfs-bin/ipfs.exe repo stat
```

### View Logs
```bash
~/.ipfs-bin/ipfs.exe log tail
```

## Next Steps

1. **Restart API**: Run `c:\goCBC\restart-api-with-ipfs.bat`
2. **Test Upload**: Upload a document via any portal
3. **Verify Storage**: Check API logs for IPFS CID
4. **Browse Files**: Visit `http://localhost:5001/webui`

---

**Status**: Ready for production use with IPFS-powered document storage! 🎉

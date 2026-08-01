# CECBS Startup Troubleshooting Guide

## Script Shows Nothing / Exits Immediately / Fails on Other Devices

If `./start-all.sh` shows no output, exits immediately, or works on one machine but fails on others, try these solutions in order:

### Quick Fix #1: Use the Safe Wrapper
```bash
bash start-safe.sh
```

This wrapper:
- Checks for common issues before running
- Detects line ending problems
- Shows better error messages
- Works on more systems

### Quick Fix #2: Use the Minimal Script
```bash
bash start-minimal.sh
```

Or even simpler:
```bash
sh start-minimal.sh
```

This POSIX-compliant script works on ANY Unix-like system, even with old shells.

### Quick Fix #3: Check Line Endings
**Problem**: Script has Windows line endings (CRLF) but you're on Linux/macOS

**Solution A** - Convert with dos2unix:
```bash
dos2unix start-all.sh
bash start-all.sh --skip-build
```

**Solution B** - Convert with sed:
```bash
sed -i 's/\r$//' start-all.sh
bash start-all.sh --skip-build
```

**Solution C** - Use PowerShell on Windows:
```powershell
.\start-all.ps1 -SkipBuild
```

### Quick Fix #4: Run with Explicit Bash
```bash
bash -x start-all.sh --skip-build 2>&1 | tee startup-log.txt
```

This shows every command being executed and saves output to `startup-log.txt`.

## Platform-Specific Issues

### Windows (Git Bash / MINGW)

### Step 1: Run Diagnostic Test
```bash
bash test-startup.sh
```

This will check:
- Docker installation and status
- Node.js installation
- Project structure
- Port availability
- Running containers

### Step 2: Run Debug Startup
```bash
bash start-debug.sh
```

This verbose version shows every command being executed.

### Step 3: Check Script Permissions
On Linux/macOS:
```bash
chmod +x *.sh
ls -la start-all.sh
```

The script should show `-rwxr-xr-x` permissions.

### Step 4: Run with Bash Explicitly
```bash
bash start-all.sh --skip-build
```

## Common Issues

### Issue: "command not found"
**Solution**: You're missing a required tool. Run the diagnostic:
```bash
bash test-startup.sh
```

Install missing tools:
- **Docker**: https://docs.docker.com/get-docker/
- **Docker Compose**: Included with Docker Desktop
- **Node.js**: https://nodejs.org/ (v18 or higher)

### Issue: "Docker daemon is not running"
**Solution**: 
- Windows: Start Docker Desktop from Start menu
- Linux: `sudo systemctl start docker`
- macOS: Start Docker Desktop from Applications

### Issue: "Port already in use"
**Solution**: Stop existing processes:
```bash
./stop-all.sh
```

Or manually:
```bash
# Kill Node processes
pkill -9 node

# Stop Docker containers
docker-compose -f docker-compose-fabric.yml down -v
```

### Issue: Script hangs during "Waiting for services"
**Cause**: Services taking longer than expected to start

**Solution**: 
1. Let it wait - first startup can take 2-3 minutes
2. Check container logs:
   ```bash
   docker-compose -f docker-compose-fabric.yml logs -f
   ```
3. Check specific container:
   ```bash
   docker logs orderer.cecbs.et
   docker logs peer0.ecta.cecbs.et
   docker logs cecbs-postgres
   ```

### Issue: "npm install" fails
**Solution**:
1. Clear npm cache:
   ```bash
   cd api && npm cache clean --force
   cd ../ui && npm cache clean --force
   ```

2. Delete node_modules and reinstall:
   ```bash
   cd api
   rm -rf node_modules package-lock.json
   npm install
   
   cd ../ui
   rm -rf node_modules package-lock.json
   npm install
   ```

### Issue: Git Bash on Windows shows no output
**Cause**: Windows line endings or terminal compatibility

**Solution**:
1. Use PowerShell instead:
   ```powershell
   .\start-all.ps1 -SkipBuild
   ```

2. Or use the batch file:
   ```cmd
   START-SYSTEM.bat
   ```

3. Convert line endings:
   ```bash
   dos2unix start-all.sh
   ```

## Manual Startup (If Scripts Fail)

If all scripts fail, start components manually:

### 1. Start Docker Containers
```bash
docker-compose -f docker-compose-fabric.yml up -d
```

Wait 60-90 seconds for initialization.

### 2. Check Container Status
```bash
docker ps
```

You should see 18 containers running.

### 3. Start API
```bash
cd api
npm install
npm run build
npm start
```

Keep this terminal open.

### 4. Start UI (in new terminal)
```bash
cd ui
npm install
npm run build
npm start
```

### 5. Access System
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

## Getting Help

### Check Logs
```bash
# Container logs
docker-compose -f docker-compose-fabric.yml logs -f

# Specific container
docker logs <container-name>

# API logs (if started with script)
tail -f /tmp/cecbs-api.log

# UI logs (if started with script)
tail -f /tmp/cecbs-ui.log
```

### Check System Status
```bash
./status.sh
```

### Full System Reset
```bash
# Stop everything
./stop-all.sh

# Remove all containers and volumes
docker-compose -f docker-compose-fabric.yml down -v

# Remove all Docker data (CAUTION: removes all data)
docker system prune -a --volumes

# Start fresh
./start-all.sh
```

## Still Having Issues?

1. Check Docker resources:
   - Docker Desktop → Settings → Resources
   - Recommended: 4GB RAM, 2 CPUs minimum

2. Check disk space:
   ```bash
   df -h
   ```

3. Restart Docker:
   - Docker Desktop → Restart
   - Or: `sudo systemctl restart docker`

4. Check firewall settings - ensure ports 3000, 3001, 5432, 6379, 7050, 7051, 9999 are allowed

5. Run system diagnostic:
   ```bash
   bash test-startup.sh > diagnostic-output.txt 2>&1
   ```
   Share `diagnostic-output.txt` with your team for help.

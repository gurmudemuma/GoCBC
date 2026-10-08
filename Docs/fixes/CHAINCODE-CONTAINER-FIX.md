# Chaincode Container Fix Guide

## Issue
The chaincode container is not running, which is preventing blockchain transactions from working properly.

## Quick Fix (Run These Commands)

Open a terminal and run:

```bash
cd /home/guda/GoCBC

# Step 1: Check what's currently running
docker ps | grep coffee

# Step 2: Check if container exists but stopped
docker ps -a | grep coffee

# Step 3: Check the network name
docker network ls | grep cecbs

# Step 4: Remove any old chaincode container
docker rm -f coffee-chaincode 2>/dev/null

# Step 5: Build the chaincode image
docker build -t coffee-chaincode:1.9-tls chaincodes/coffee

# Step 6: Find the correct network name (likely one of these)
# - cecbs_cecbs
# - GoCBC_cecbs  
# - gocbc_cecbs
NETWORK_NAME=$(docker network ls --format "{{.Name}}" | grep cecbs | head -1)
echo "Using network: $NETWORK_NAME"

# Step 7: Start the chaincode container
docker run -d \
  --name coffee-chaincode \
  --network $NETWORK_NAME \
  --restart unless-stopped \
  -p 9999:9999 \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.9_tls:2b094adc2b1d5c848eacf297c7ab1c1bcd2af67cb7f763f8f11c8e303a951db4" \
  -e CORE_CHAINCODE_LOGGING_LEVEL=INFO \
  coffee-chaincode:1.9-tls

# Step 8: Wait and verify
sleep 5
docker ps | grep coffee

# Step 9: Check logs
docker logs coffee-chaincode

# Step 10: Test the port
curl http://localhost:9999 2>&1 || echo "Port responding"
```

## Expected Output

After running the commands above, you should see:

```
coffee-chaincode   Up X seconds   0.0.0.0:9999->9999/tcp
```

## Verification

1. **Check container is running**:
   ```bash
   docker ps | grep coffee
   ```
   Should show: `coffee-chaincode` with status `Up`

2. **Check logs are healthy**:
   ```bash
   docker logs coffee-chaincode
   ```
   Should show: `Chaincode server started on 0.0.0.0:9999`

3. **Check port is open**:
   ```bash
   netstat -tuln | grep 9999
   ```
   Should show port 9999 listening

4. **Test from API**:
   ```bash
   curl http://localhost:3001/health
   ```
   Should show all services healthy

## Alternative: Use Docker Compose

If the manual approach doesn't work, try using docker-compose:

```bash
cd /home/guda/GoCBC

# Start just the chaincode service
docker-compose -f docker-compose-fabric.yml up -d coffee-chaincode

# Check status
docker-compose -f docker-compose-fabric.yml ps coffee-chaincode

# View logs
docker-compose -f docker-compose-fabric.yml logs -f coffee-chaincode
```

## Troubleshooting

### Issue 1: "network not found"

**Solution**: Find the correct network name:
```bash
docker network ls
# Look for a network with "cecbs" in the name
# Use that name in the docker run command
```

### Issue 2: "address already in use"

**Solution**: Port 9999 is already taken:
```bash
# Find what's using port 9999
sudo lsof -i :9999

# Kill the process or use a different port
docker rm -f coffee-chaincode
# Then try again
```

### Issue 3: Container starts but immediately stops

**Solution**: Check the logs:
```bash
docker logs coffee-chaincode 2>&1
```

Common causes:
- **Missing TLS certificates**: Check if `chaincodes/coffee/server-cert.pem` and `server-key.pem` exist
- **Build errors**: The Go binary might not have built correctly
- **Permissions**: The binary might not be executable

Fix:
```bash
cd /home/guda/GoCBC/chaincodes/coffee

# Check certificates
ls -la server-*.pem

# Rebuild manually
go build -tags notls -o coffee .

# Make executable
chmod +x coffee

# Rebuild docker image
cd /home/guda/GoCBC
docker build --no-cache -t coffee-chaincode:1.9-tls chaincodes/coffee
```

### Issue 4: Image won't build

**Error**: Build fails during `go build` step

**Solution**:
```bash
cd /home/guda/GoCBC/chaincodes/coffee

# Test build locally first
go build -tags notls -o coffee .

# If successful, check the binary
./coffee

# If local build works, retry docker build
cd /home/guda/GoCBC
docker build -t coffee-chaincode:1.9-tls chaincodes/coffee
```

## Complete Restart (Last Resort)

If nothing else works, restart all services:

```bash
cd /home/guda/GoCBC

# Stop everything
./stop-all.sh

# Wait for complete shutdown
sleep 10

# Start everything fresh
./start-all.sh
# Choose option 1 (Development mode)
```

## Verify System is Working

After the chaincode container is running:

1. **Check all containers**:
   ```bash
   docker ps
   ```
   Expected: 16 containers running (including coffee-chaincode)

2. **Test API**:
   ```bash
   curl http://localhost:3001/health
   ```

3. **Test UI**:
   ```bash
   curl http://localhost:3000
   ```

4. **Test blockchain transaction** (from UI):
   - Go to http://localhost:3000
   - Login as an exporter
   - Try to create a contract
   - Should succeed and show transaction ID

## Success Indicators

✅ Container shows "Up" status
✅ Port 9999 is listening
✅ Logs show "Chaincode server started"
✅ API health check returns all services connected
✅ UI can create blockchain transactions
✅ Transaction IDs appear in responses

## Get Help

If you're still having issues:

1. Collect diagnostics:
   ```bash
   cd /home/guda/GoCBC
   bash diagnose-chaincode.sh > chaincode-diagnostics.txt 2>&1
   ```

2. Check the diagnostics file for specific errors:
   ```bash
   cat chaincode-diagnostics.txt
   ```

3. Common solutions:
   - Network mismatch → Use correct network name
   - Port conflict → Kill process on port 9999
   - Build failure → Fix Go compilation errors
   - Certificate issues → Regenerate TLS certs

## Quick Health Check Script

Save this as `check-chaincode.sh`:

```bash
#!/bin/bash
echo "Chaincode Health Check"
echo "====================="
echo ""
echo "Container Status:"
docker ps | grep coffee || echo "❌ Container not running"
echo ""
echo "Port Status:"
netstat -tuln | grep 9999 || echo "❌ Port 9999 not listening"
echo ""
echo "Recent Logs:"
docker logs coffee-chaincode 2>&1 | tail -5 || echo "❌ Cannot read logs"
echo ""
echo "API Status:"
curl -s http://localhost:3001/health | jq '.services.blockchain' || echo "❌ API not responding"
```

Make executable and run:
```bash
chmod +x check-chaincode.sh
./check-chaincode.sh
```

---

## Summary

The chaincode container issue is typically resolved by:
1. Building the chaincode image
2. Starting the container with correct network name
3. Verifying it's running and accessible

Run the Quick Fix commands above and the system should be fully operational!

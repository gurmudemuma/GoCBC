# How to Restart the API Server

The API needs to be restarted to pick up the new database columns we added.

## Method 1: If Running with npm/node

```bash
# Find the API process
ps aux | grep -E "node.*api|ts-node.*api" | grep -v grep

# Kill it (replace PID with actual process ID from above)
kill <PID>

# Restart in development mode
cd /home/guda/GoCBC/api
npm run dev

# OR restart in production mode
npm run start
```

## Method 2: If Running with PM2

```bash
# List processes
pm2 list

# Restart API
pm2 restart cecbs-api

# OR restart all
pm2 restart all

# Check logs
pm2 logs cecbs-api
```

## Method 3: If Running as Systemd Service

```bash
# Restart service
sudo systemctl restart cecbs-api

# Check status
sudo systemctl status cecbs-api

# View logs
sudo journalctl -u cecbs-api -f
```

## Method 4: If Running in Docker

```bash
# List containers
docker ps | grep api

# Restart container
docker restart <container_name>

# OR rebuild and restart
cd /home/guda/GoCBC/api
docker-compose restart api
```

## Method 5: If Running in Terminal

If you have a terminal window with the API running:
1. Press `Ctrl + C` to stop
2. Run: `cd /home/guda/GoCBC/api && npm run dev`

## Verification

After restarting, test the endpoint:

```bash
# The approval-status endpoint should now return 200 instead of 500
curl -X GET http://localhost:3001/api/v1/health
```

Then refresh the browser and check for the 500 error - it should be gone!

# CECBS Production Deployment - Server 10.3.15.7
## Domain: coffeex.cbe.com.et | Quick Reference for Production Setup

---

## 🎯 Your Server Information

- **Server IP**: `10.3.15.7`
- **Domain**: `coffeex.cbe.com.et`
- **SSH Access**: `ssh root@10.3.15.7`
- **Services**: UI (3000), API (3001), IPFS (5001, 8080), Nginx (80, 443)

---

## 🚀 Quick Deployment Steps

### 1. Copy Files to Server
```bash
# From your local machine (Windows)
cd c:\goCBC
scp -r ui api nginx-configs root@10.3.15.7:/opt/cecbs/
```

### 2. Setup Environment Variables on Server
```bash
ssh root@10.3.15.7

# UI Environment
cd /opt/cecbs/ui
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://10.3.15.7/api/v1
NEXT_PUBLIC_WS_URL=ws://10.3.15.7/socket.io
NEXT_PUBLIC_IPFS_GATEWAY=http://10.3.15.7/ipfs/
NEXT_PUBLIC_ALLOWED_ORIGINS=http://10.3.15.7
NEXT_PUBLIC_APP_NAME=CECBS
NEXT_PUBLIC_APP_VERSION=1.2.0
NEXT_PUBLIC_ENABLE_IPFS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_DEFAULT_ORG=ECTA
EOF

# API Environment
cd /opt/cecbs/api
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3001
API_BASE_URL=http://10.3.15.7/api/v1
ALLOWED_ORIGINS=http://10.3.15.7
USE_IPFS=true
IPFS_GATEWAY=http://10.3.15.7/ipfs/
ENABLE_SWAGGER=false
ENABLE_WEBSOCKET=true
EOF

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
DOC_KEY=$(openssl rand -hex 32)

echo "JWT_SECRET=$JWT_SECRET" >> .env.production
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.production
echo "DOCUMENT_ENCRYPTION_KEY=$DOC_KEY" >> .env.production
```

### 3. Install Dependencies & Build
```bash
# UI
cd /opt/cecbs/ui
npm ci
npm run build

# API
cd /opt/cecbs/api
npm ci
```

### 4. Start Services
```bash
# Start IPFS daemon
ipfs daemon &

# Start API
cd /opt/cecbs/api
npm start &

# Start UI
cd /opt/cecbs/ui
npm start &
```

### 5. Deploy Nginx
```bash
cd /opt/cecbs/nginx-configs
chmod +x deploy-cecbs-nginx.sh
./deploy-cecbs-nginx.sh --ip 10.3.15.7
```

### 6. Verify Deployment
```bash
# Test from server
curl http://localhost/health
curl http://localhost/api/v1/health

# Test from outside (another machine)
curl http://10.3.15.7/health
```

### 7. Access in Browser
```
http://10.3.15.7/
```

---

## 🔐 Secrets Generated

When you run the setup, these secrets are auto-generated. **Save them securely!**

```bash
# View your generated secrets
cd /opt/cecbs/api
grep -E "(JWT_SECRET|SESSION_SECRET|DOCUMENT_ENCRYPTION_KEY)" .env.production
```

---

## 📋 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | `http://10.3.15.7/` | Main web application |
| **API** | `http://10.3.15.7/api/v1/` | Backend API |
| **Health Check** | `http://10.3.15.7/health` | System status |
| **API Health** | `http://10.3.15.7/api/v1/health` | API status |
| **IPFS Gateway** | `http://10.3.15.7/ipfs/<CID>` | Document access |

---

## 🔧 Service Management

### Check Service Status
```bash
# Check if services are running
ps aux | grep node | grep -E "(ui|api)"

# Check nginx
sudo systemctl status nginx

# Check IPFS
ipfs id
```

### Restart Services
```bash
# Restart UI
pkill -f "node.*ui"
cd /opt/cecbs/ui && npm start &

# Restart API
pkill -f "node.*api"
cd /opt/cecbs/api && npm start &

# Restart IPFS
pkill -f ipfs
ipfs daemon &

# Restart Nginx
sudo systemctl restart nginx
```

### View Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/cecbs-access.log
sudo tail -f /var/log/nginx/cecbs-error.log

# Application logs (if configured)
cd /opt/cecbs/api && tail -f logs/*.log
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Can access http://10.3.15.7/ in browser
- [ ] Health check returns "healthy": `curl http://10.3.15.7/health`
- [ ] API health check works: `curl http://10.3.15.7/api/v1/health`
- [ ] Can log in to the system
- [ ] Dashboard loads data correctly
- [ ] Document upload works
- [ ] IPFS documents are accessible
- [ ] WebSocket real-time updates work
- [ ] No console errors (F12 in browser)
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] UI is running on port 3000: `curl http://localhost:3000/`
- [ ] API is running on port 3001: `curl http://localhost:3001/api/v1/health`
- [ ] IPFS is running: `curl http://localhost:5001/api/v0/version`

---

## 🐛 Troubleshooting

### Problem: Can't access http://10.3.15.7/

**Check:**
```bash
# Is nginx running?
sudo systemctl status nginx

# Is firewall blocking?
sudo ufw status

# Can you access from server?
curl http://localhost/health
```

**Fix:**
```bash
# Start nginx if not running
sudo systemctl start nginx

# Open ports in firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Problem: API returns errors

**Check:**
```bash
# Is API running?
ps aux | grep "node.*api"

# Check API logs
cd /opt/cecbs/api && tail -f logs/error.log

# Test API directly
curl http://localhost:3001/api/v1/health
```

**Fix:**
```bash
# Restart API
pkill -f "node.*api"
cd /opt/cecbs/api && npm start &
```

### Problem: UI not loading

**Check:**
```bash
# Is UI running?
ps aux | grep "node.*ui"

# Can you access UI directly?
curl http://localhost:3000/
```

**Fix:**
```bash
# Restart UI
pkill -f "node.*ui"
cd /opt/cecbs/ui && npm start &
```

### Problem: Documents not loading

**Check:**
```bash
# Is IPFS running?
ipfs id

# Can you access IPFS gateway?
curl http://localhost:8080/ipfs/QmTest
```

**Fix:**
```bash
# Restart IPFS
pkill -f ipfs
ipfs daemon &
```

---

## 🔄 Update Deployment

### Update Application Code
```bash
# 1. Copy new files
scp -r ui api root@10.3.15.7:/opt/cecbs/

# 2. SSH to server
ssh root@10.3.15.7

# 3. Rebuild UI (if frontend changed)
cd /opt/cecbs/ui
npm ci
npm run build

# 4. Install API dependencies (if package.json changed)
cd /opt/cecbs/api
npm ci

# 5. Restart services
pkill -f "node.*ui"
pkill -f "node.*api"

cd /opt/cecbs/ui && npm start &
cd /opt/cecbs/api && npm start &

# 6. Reload nginx (if config changed)
sudo systemctl reload nginx
```

### Update Environment Variables
```bash
# 1. Edit environment file
nano /opt/cecbs/ui/.env.production
nano /opt/cecbs/api/.env.production

# 2. Rebuild UI if changed
cd /opt/cecbs/ui && npm run build

# 3. Restart services
pkill -f "node.*ui"
pkill -f "node.*api"

cd /opt/cecbs/ui && npm start &
cd /opt/cecbs/api && npm start &
```

---

## 📊 Monitoring

### Check System Resources
```bash
# CPU and Memory
htop

# Disk space
df -h

# Network connections
sudo netstat -tlnp | grep -E ':(80|443|3000|3001)'
```

### Check Application Health
```bash
# Quick health check script
cat > /root/health-check.sh << 'EOF'
#!/bin/bash
echo "=== CECBS Health Check ==="
echo ""
echo "Nginx: $(systemctl is-active nginx)"
echo "UI (3000): $(curl -s http://localhost:3000/ | head -c 20)..."
echo "API (3001): $(curl -s http://localhost:3001/api/v1/health)"
echo "IPFS: $(curl -s -X POST http://localhost:5001/api/v0/version | jq -r .Version)"
echo "Nginx Proxy: $(curl -s http://localhost/health)"
EOF

chmod +x /root/health-check.sh
/root/health-check.sh
```

---

## 🔒 Security Notes

### Firewall Status
```bash
# Check firewall
sudo ufw status

# Should show:
# 22/tcp  ALLOW (SSH)
# 80/tcp  ALLOW (HTTP)
# 443/tcp ALLOW (HTTPS)
```

### Exposed Ports
Only these ports should be accessible from outside:
- **22** - SSH
- **80** - HTTP
- **443** - HTTPS (after SSL setup)

Ports **3000**, **3001**, **5001**, **8080** should be localhost only!

### Check Port Exposure
```bash
# This should show ports listening on 0.0.0.0 or 10.3.15.7
sudo netstat -tlnp | grep -E ':(80|443)'

# This should show ports listening on 127.0.0.1 only
sudo netstat -tlnp | grep -E ':(3000|3001|5001|8080)'
```

---

## 🎓 Next Steps

### Add SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate (requires domain name)
sudo certbot --nginx -d coffee.cecbs.et

# Update environment variables to use HTTPS
nano /opt/cecbs/ui/.env.production
# Change: http://10.3.15.7 → https://coffee.cecbs.et

nano /opt/cecbs/api/.env.production
# Change: http://10.3.15.7 → https://coffee.cecbs.et

# Rebuild and restart
cd /opt/cecbs/ui && npm run build
pkill -f node
cd /opt/cecbs/ui && npm start &
cd /opt/cecbs/api && npm start &
```

### Setup Process Manager (Recommended)
```bash
# Install PM2 for better process management
npm install -g pm2

# Start services with PM2
cd /opt/cecbs/ui
pm2 start npm --name "cecbs-ui" -- start

cd /opt/cecbs/api
pm2 start npm --name "cecbs-api" -- start

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Setup Monitoring (Recommended)
```bash
# Install monitoring tools
sudo apt install htop nethogs iotop -y

# Monitor in real-time
htop  # System resources
sudo nethogs  # Network usage
sudo iotop  # Disk I/O
```

---

## 📞 Quick Support Commands

```bash
# Full diagnostic
bash /opt/cecbs/nginx-configs/cecbs-diagnostic.sh > /root/diagnostic.txt

# Service status
systemctl status nginx
ps aux | grep node
ipfs id

# Recent errors
sudo tail -n 50 /var/log/nginx/cecbs-error.log

# Test endpoints
curl http://10.3.15.7/health
curl http://10.3.15.7/api/v1/health
```

---

**Deployment Date**: _______________  
**Server**: 10.3.15.7  
**Deployed By**: _______________  
**Status**: ✅ Production Ready

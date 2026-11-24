# CECBS Production Deployment Guide
## Server: 10.3.15.7 | Domain: coffeex.cbe.com.et

---

## 🎯 Deployment Overview

- **Server IP**: `10.3.15.7`
- **Domain**: `coffeex.cbe.com.et`
- **Services**: UI (3000), API (3001), IPFS (5001, 8080), Nginx (80, 443)
- **SSL**: Let's Encrypt (HTTPS)
- **Access URL**: `https://coffeex.cbe.com.et`

---

## 🚀 Complete Production Deployment

### Phase 1: Prepare Server Environment

#### 1.1 DNS Configuration (Complete Before Starting)
```bash
# Ensure DNS is pointing to your server
nslookup coffeex.cbe.com.et
# Should return: 10.3.15.7

# Or test with dig
dig coffeex.cbe.com.et A
# Should show: coffeex.cbe.com.et. IN A 10.3.15.7
```

#### 1.2 Copy Files to Server
```bash
# From your Windows machine (c:\goCBC)
# Option 1: Using SCP
scp -r ui api nginx-configs root@10.3.15.7:/opt/cecbs/

# Option 2: Using rsync (if available)
rsync -avz --exclude node_modules ui api nginx-configs root@10.3.15.7:/opt/cecbs/

# Option 3: Create tar and copy
tar -czf cecbs-deployment.tar.gz ui api nginx-configs
scp cecbs-deployment.tar.gz root@10.3.15.7:/opt/
ssh root@10.3.15.7 "cd /opt && tar -xzf cecbs-deployment.tar.gz && mv ui api nginx-configs /opt/cecbs/"
```

#### 1.3 SSH to Server and Setup Base Environment
```bash
ssh root@10.3.15.7

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl wget git htop nano ufw

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install IPFS (if not installed)
wget https://dist.ipfs.tech/kubo/v0.31.0/kubo_v0.31.0_linux-amd64.tar.gz
tar -xzf kubo_v0.31.0_linux-amd64.tar.gz
cd kubo && sudo bash install.sh
cd .. && rm -rf kubo kubo_v0.31.0_linux-amd64.tar.gz

# Verify installations
node --version
npm --version
ipfs --version
```

### Phase 2: Configure Environment Variables

#### 2.1 UI Configuration
```bash
cd /opt/cecbs/ui

# Create production environment file
cat > .env.production << 'EOF'
# CECBS UI Production Configuration
# Domain: coffeex.cbe.com.et (10.3.15.7)

NODE_ENV=production

# API Configuration (HTTPS)
NEXT_PUBLIC_API_BASE_URL=https://coffeex.cbe.com.et/api/v1

# WebSocket Configuration (WSS)
NEXT_PUBLIC_WS_URL=wss://coffeex.cbe.com.et/socket.io

# IPFS Configuration (HTTPS)
NEXT_PUBLIC_IPFS_GATEWAY=https://coffeex.cbe.com.et/ipfs/

# Security
NEXT_PUBLIC_ALLOWED_ORIGINS=https://coffeex.cbe.com.et

# Application Info
NEXT_PUBLIC_APP_NAME=CoffeeX CECBS
NEXT_PUBLIC_APP_VERSION=1.2.0
NEXT_PUBLIC_APP_DESCRIPTION=Ethiopian Coffee Export Consortium Blockchain System

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_QR_CODE=true
NEXT_PUBLIC_ENABLE_BLOCKCHAIN_EXPLORER=true
NEXT_PUBLIC_ENABLE_IPFS=true
NEXT_PUBLIC_DEFAULT_ORG=ECTA
NEXT_PUBLIC_SUPPORTED_ORGS=ECTA,ECX,NBE,BANKS,CUSTOMS,SHIPPING

# Session
NEXT_PUBLIC_SESSION_TIMEOUT=60
NEXT_PUBLIC_REMEMBER_ME_DAYS=30

# Theme
NEXT_PUBLIC_DEFAULT_THEME=light
NEXT_PUBLIC_ENABLE_THEME_SWITCHER=true

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=50
NEXT_PUBLIC_ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip

# Pagination
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=20
NEXT_PUBLIC_PAGE_SIZE_OPTIONS=10,20,50,100

# Date/Time
NEXT_PUBLIC_DATE_FORMAT=YYYY-MM-DD
NEXT_PUBLIC_TIME_FORMAT=HH:mm:ss
NEXT_PUBLIC_TIMEZONE=Africa/Addis_Ababa

# Blockchain
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=coffeechannel

# Localization
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,am
EOF

# Install dependencies
npm ci --production

# Build production application
npm run build
```

#### 2.2 API Configuration
```bash
cd /opt/cecbs/api

# Generate secure secrets first
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
DOC_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24)

# Create production environment file
cat > .env.production << EOF
# CECBS API Production Configuration
# Domain: coffeex.cbe.com.et (10.3.15.7)

NODE_ENV=production
PORT=3001

# API URLs (HTTPS)
API_BASE_URL=https://coffeex.cbe.com.et/api/v1

# CORS (HTTPS)
ALLOWED_ORIGINS=https://coffeex.cbe.com.et

# Security Secrets
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DOCUMENT_ENCRYPTION_KEY=$DOC_KEY
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=12

# Hyperledger Fabric
FABRIC_ENABLED=true
FABRIC_REQUIRED=false
FABRIC_AS_LOCALHOST=true
FABRIC_WALLET_PATH=./wallet
FABRIC_CCP_PATH=../blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json
FABRIC_CHANNEL_NAME=coffeechannel
FABRIC_CHAINCODE_NAME=coffee
FABRIC_MSP_ID=ECTAMSP
FABRIC_CA_URL=https://localhost:7054

# Database (SQLite for now, PostgreSQL recommended)
DATABASE_PATH=./cecbs_production.db

# Logging
LOG_LEVEL=warn
LOG_DIR=./logs
LOG_MAX_FILES=60
LOG_MAX_SIZE=50

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip

# WebSocket
WS_PORT=3002
ENABLE_WEBSOCKET=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
BLOCKCHAIN_RATE_LIMIT_MAX=50

# Security
ENABLE_HELMET=true
FORCE_HTTPS=true

# Features
ENABLE_SWAGGER=false
ENABLE_FILE_UPLOAD=true
ENABLE_BLOCKCHAIN_EXPLORER=false
ENABLE_METRICS=true

# IPFS
USE_IPFS=true
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_GATEWAY=https://coffeex.cbe.com.et/ipfs/

# External Services
SMTP_ENABLED=false
REDIS_ENABLED=false

# Backup
AUTO_BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_SCHEDULE=0 3 * * *

# Internationalization
DEFAULT_LOCALE=en
SUPPORTED_LOCALES=en,am
TIMEZONE=Africa/Addis_Ababa
EOF

# Install dependencies
npm ci --production

# Create required directories
mkdir -p logs uploads backups
```

#### 2.3 Save Generated Secrets
```bash
# IMPORTANT: Save these secrets securely!
echo "=== CECBS Production Secrets ===" > /root/cecbs-secrets.txt
echo "Generated on: $(date)" >> /root/cecbs-secrets.txt
echo "" >> /root/cecbs-secrets.txt
echo "JWT_SECRET=$JWT_SECRET" >> /root/cecbs-secrets.txt
echo "SESSION_SECRET=$SESSION_SECRET" >> /root/cecbs-secrets.txt
echo "DOCUMENT_ENCRYPTION_KEY=$DOC_KEY" >> /root/cecbs-secrets.txt
echo "DB_PASSWORD=$DB_PASSWORD" >> /root/cecbs-secrets.txt
echo "" >> /root/cecbs-secrets.txt
echo "Domain: coffeex.cbe.com.et" >> /root/cecbs-secrets.txt
echo "Server: 10.3.15.7" >> /root/cecbs-secrets.txt

# Secure the file
chmod 600 /root/cecbs-secrets.txt
echo "✓ Secrets saved to /root/cecbs-secrets.txt"
```

### Phase 3: Deploy Services

#### 3.1 Initialize IPFS
```bash
# Initialize IPFS (if first time)
ipfs init

# Configure IPFS
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080

# Start IPFS daemon
nohup ipfs daemon > /var/log/ipfs.log 2>&1 &

# Verify IPFS is running
sleep 5
curl http://localhost:5001/api/v0/version
curl http://localhost:8080/ipfs/QmTest 2>/dev/null || echo "IPFS Gateway ready (404 expected for test)"
```

#### 3.2 Start API Server
```bash
cd /opt/cecbs/api

# Start API in background
nohup npm start > /var/log/cecbs-api.log 2>&1 &

# Verify API is running
sleep 10
curl http://localhost:3001/api/v1/health
echo "✓ API server started"
```

#### 3.3 Start UI Server
```bash
cd /opt/cecbs/ui

# Start UI in background
nohup npm start > /var/log/cecbs-ui.log 2>&1 &

# Verify UI is running
sleep 15
curl -I http://localhost:3000/
echo "✓ UI server started"
```

### Phase 4: Deploy Nginx with SSL

#### 4.1 Deploy Nginx Configuration
```bash
cd /opt/cecbs/nginx-configs

# Make deployment script executable
chmod +x deploy-cecbs-nginx.sh

# Deploy with Let's Encrypt SSL
./deploy-cecbs-nginx.sh --ip 10.3.15.7 --domain coffeex.cbe.com.et --ssl letsencrypt
```

#### 4.2 Verify SSL Certificate
```bash
# Check certificate
openssl s_client -connect coffeex.cbe.com.et:443 -servername coffeex.cbe.com.et < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Test auto-renewal
certbot renew --dry-run
```

### Phase 5: System Verification

#### 5.1 Health Checks
```bash
# System health check
echo "=== CECBS System Health Check ==="

# Check services
echo -n "Nginx: "
systemctl is-active nginx

echo -n "UI (3000): "
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

echo -n "API (3001): "
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health

echo -n "IPFS (5001): "
curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/v0/version

echo -n "HTTPS Frontend: "
curl -s -o /dev/null -w "%{http_code}" https://coffeex.cbe.com.et/health

echo -n "HTTPS API: "
curl -s -o /dev/null -w "%{http_code}" https://coffeex.cbe.com.et/api/v1/health

echo ""
echo "All services should show '200' or 'active'"
```

#### 5.2 Process Check
```bash
# Check running processes
ps aux | grep -E "(node|ipfs|nginx)" | grep -v grep

# Check listening ports
netstat -tlnp | grep -E ":(80|443|3000|3001|5001|8080)"

# Check logs for errors
tail -n 20 /var/log/nginx/cecbs-error.log
tail -n 20 /var/log/cecbs-api.log
tail -n 20 /var/log/cecbs-ui.log
```

#### 5.3 Browser Test
```bash
echo "=== Manual Browser Tests ==="
echo ""
echo "1. Open browser and navigate to: https://coffeex.cbe.com.et"
echo "2. Verify SSL certificate is valid (green lock)"
echo "3. Test login functionality"
echo "4. Check console for JavaScript errors (F12)"
echo "5. Test file upload functionality"
echo "6. Test real-time updates (if applicable)"
echo ""
echo "Expected results:"
echo "✓ No certificate warnings"
echo "✓ Login works properly"  
echo "✓ No console errors"
echo "✓ File uploads work"
echo "✓ All portal functions work"
```

---

## 🛠️ System Management

### Service Management Commands

#### Start Services
```bash
# Start all services
cd /opt/cecbs

# IPFS
nohup ipfs daemon > /var/log/ipfs.log 2>&1 &

# API
cd api && nohup npm start > /var/log/cecbs-api.log 2>&1 &

# UI
cd ../ui && nohup npm start > /var/log/cecbs-ui.log 2>&1 &

# Nginx
systemctl start nginx
```

#### Stop Services
```bash
# Stop services
pkill -f "ipfs daemon"
pkill -f "node.*api"
pkill -f "node.*ui"
systemctl stop nginx
```

#### Restart Services
```bash
# Restart script
cat > /root/restart-cecbs.sh << 'EOF'
#!/bin/bash
echo "Restarting CECBS services..."

# Stop services
pkill -f "node.*ui" 2>/dev/null
pkill -f "node.*api" 2>/dev/null
pkill -f "ipfs daemon" 2>/dev/null

# Wait for processes to stop
sleep 5

# Start services
nohup ipfs daemon > /var/log/ipfs.log 2>&1 &
sleep 3

cd /opt/cecbs/api
nohup npm start > /var/log/cecbs-api.log 2>&1 &
sleep 5

cd /opt/cecbs/ui  
nohup npm start > /var/log/cecbs-ui.log 2>&1 &
sleep 5

# Reload nginx
systemctl reload nginx

echo "Services restarted. Checking status..."
sleep 10

# Check status
curl -s http://localhost:3001/api/v1/health && echo " - API OK"
curl -s http://localhost:3000/ >/dev/null && echo " - UI OK"
curl -s http://localhost:5001/api/v0/version >/dev/null && echo " - IPFS OK"
systemctl is-active nginx && echo " - Nginx OK"

echo "CECBS restart complete!"
EOF

chmod +x /root/restart-cecbs.sh
```

#### Service Status
```bash
# Quick status check
cat > /root/cecbs-status.sh << 'EOF'
#!/bin/bash
echo "=== CECBS Service Status ==="
echo ""

echo -n "Nginx: "
systemctl is-active nginx

echo -n "UI (localhost:3000): "
timeout 5 curl -s http://localhost:3000/ >/dev/null && echo "Running" || echo "Down"

echo -n "API (localhost:3001): "
timeout 5 curl -s http://localhost:3001/api/v1/health >/dev/null && echo "Running" || echo "Down"

echo -n "IPFS (localhost:5001): "
timeout 5 curl -s http://localhost:5001/api/v0/version >/dev/null && echo "Running" || echo "Down"

echo -n "Public HTTPS: "
timeout 10 curl -s https://coffeex.cbe.com.et/health >/dev/null && echo "OK" || echo "Down"

echo ""
echo "Process List:"
ps aux | grep -E "(node.*ui|node.*api|ipfs daemon|nginx: master)" | grep -v grep || echo "No processes found"

echo ""
echo "Port Usage:"
netstat -tlnp 2>/dev/null | grep -E ":(80|443|3000|3001|5001|8080)" | head -10

echo ""
echo "Recent Errors:"
echo "--- Nginx ---"
tail -n 3 /var/log/nginx/cecbs-error.log 2>/dev/null || echo "No errors"
echo "--- API ---"  
tail -n 3 /var/log/cecbs-api.log 2>/dev/null | grep -i error || echo "No errors"
echo "--- UI ---"
tail -n 3 /var/log/cecbs-ui.log 2>/dev/null | grep -i error || echo "No errors"
EOF

chmod +x /root/cecbs-status.sh
```

### Log Management

#### View Logs
```bash
# Real-time logs
tail -f /var/log/nginx/cecbs-access.log    # Nginx access
tail -f /var/log/nginx/cecbs-error.log     # Nginx errors  
tail -f /var/log/cecbs-api.log             # API logs
tail -f /var/log/cecbs-ui.log              # UI logs
tail -f /var/log/ipfs.log                  # IPFS logs

# Recent logs
tail -n 100 /var/log/nginx/cecbs-error.log
tail -n 100 /var/log/cecbs-api.log | grep -i error
journalctl -u nginx -n 50

# Log rotation (setup)
cat > /etc/logrotate.d/cecbs << 'EOF'
/var/log/cecbs-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

### SSL Certificate Management

#### Certificate Status
```bash
# Check certificate expiry
certbot certificates

# Check certificate details
openssl x509 -in /etc/letsencrypt/live/coffeex.cbe.com.et/fullchain.pem -text -noout | grep -A2 "Validity"

# Test renewal
certbot renew --dry-run
```

#### Manual Certificate Renewal
```bash
# Renew certificate
certbot renew

# Force renewal (if needed)
certbot renew --force-renewal

# Restart nginx after renewal
systemctl restart nginx
```

---

## 🔧 Update Procedures

### Application Updates

#### Update Code
```bash
# 1. Backup current deployment
cd /opt
tar -czf cecbs-backup-$(date +%Y%m%d-%H%M%S).tar.gz cecbs/

# 2. Copy new files from development machine
# (Use same scp/rsync commands as initial deployment)

# 3. Update UI
cd /opt/cecbs/ui
npm ci --production
npm run build

# 4. Update API  
cd /opt/cecbs/api
npm ci --production

# 5. Restart services
/root/restart-cecbs.sh

# 6. Verify deployment
/root/cecbs-status.sh
```

#### Update Environment Variables
```bash
# Edit environment files
nano /opt/cecbs/ui/.env.production
nano /opt/cecbs/api/.env.production

# Rebuild UI if UI environment changed
cd /opt/cecbs/ui && npm run build

# Restart services
/root/restart-cecbs.sh
```

#### Update Nginx Configuration
```bash
# Backup current config
cp /etc/nginx/sites-available/cecbs /etc/nginx/sites-available/cecbs.backup

# Copy new config
cp /opt/cecbs/nginx-configs/cecbs-production.conf /etc/nginx/sites-available/cecbs

# Update server name if needed
sed -i "s/coffeex.cbe.com.et 10.3.15.7/coffeex.cbe.com.et 10.3.15.7/g" /etc/nginx/sites-available/cecbs

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. SSL Certificate Issues
```bash
# Symptoms: Certificate warnings, HTTPS not working
# Check certificate
certbot certificates

# Renew if expired
certbot renew --force-renewal
systemctl restart nginx

# Check DNS
nslookup coffeex.cbe.com.et
```

#### 2. API Connection Errors
```bash
# Symptoms: UI shows "Failed to fetch" errors
# Check API status
curl http://localhost:3001/api/v1/health

# Check API logs
tail -n 50 /var/log/cecbs-api.log

# Check environment variables
grep "API_BASE_URL" /opt/cecbs/ui/.env.production
grep "ALLOWED_ORIGINS" /opt/cecbs/api/.env.production

# Restart API
pkill -f "node.*api"
cd /opt/cecbs/api && nohup npm start > /var/log/cecbs-api.log 2>&1 &
```

#### 3. IPFS Document Access Issues
```bash
# Symptoms: Documents won't load, IPFS errors
# Check IPFS status
curl http://localhost:5001/api/v0/version
curl http://localhost:8080/ipfs/QmTest

# Restart IPFS
pkill -f "ipfs daemon"
nohup ipfs daemon > /var/log/ipfs.log 2>&1 &

# Check configuration
ipfs config show | grep -A5 Addresses
```

#### 4. WebSocket Connection Issues  
```bash
# Symptoms: Real-time updates not working
# Check WebSocket endpoint
curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3001/socket.io/

# Check nginx WebSocket proxy
tail -f /var/log/nginx/cecbs-error.log

# Check API WebSocket config
grep "WS_PORT\|ENABLE_WEBSOCKET" /opt/cecbs/api/.env.production
```

#### 5. High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Restart services if needed
/root/restart-cecbs.sh

# Check for memory leaks
top -p $(pgrep -f "node.*ui"),$(pgrep -f "node.*api")
```

### Emergency Recovery

#### Complete Service Restart
```bash
# Nuclear option - restart everything
systemctl stop nginx
pkill -f node
pkill -f ipfs

sleep 10

# Start IPFS
nohup ipfs daemon > /var/log/ipfs.log 2>&1 &
sleep 5

# Start API
cd /opt/cecbs/api && nohup npm start > /var/log/cecbs-api.log 2>&1 &
sleep 10

# Start UI
cd /opt/cecbs/ui && nohup npm start > /var/log/cecbs-ui.log 2>&1 &
sleep 10

# Start Nginx
systemctl start nginx

# Verify
/root/cecbs-status.sh
```

#### Restore from Backup
```bash
# List available backups
ls -la /opt/cecbs-backup-*.tar.gz

# Restore (example with specific backup)
cd /opt
systemctl stop nginx
pkill -f node
pkill -f ipfs

# Backup current (broken) state
mv cecbs cecbs-broken-$(date +%Y%m%d-%H%M%S)

# Restore from backup
tar -xzf cecbs-backup-YYYYMMDD-HHMMSS.tar.gz

# Start services
/root/restart-cecbs.sh
```

---

## 📋 Production Checklist

### Initial Deployment
- [ ] DNS points coffeex.cbe.com.et to 10.3.15.7
- [ ] Files copied to server successfully
- [ ] Node.js and npm installed and working
- [ ] IPFS installed and initialized
- [ ] UI environment configured with HTTPS URLs
- [ ] API environment configured with secure secrets
- [ ] IPFS daemon running on ports 5001/8080
- [ ] API server running on port 3001
- [ ] UI server running on port 3000
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained via Let's Encrypt
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] https://coffeex.cbe.com.et loads without certificate warnings
- [ ] API health check works: https://coffeex.cbe.com.et/api/v1/health
- [ ] Login functionality works
- [ ] File upload works through IPFS
- [ ] WebSocket real-time updates work
- [ ] No browser console errors
- [ ] All portal functions tested

### Security Checklist
- [ ] Generated new JWT_SECRET (32+ chars)
- [ ] Generated new SESSION_SECRET (32+ chars)
- [ ] Generated new DOCUMENT_ENCRYPTION_KEY (64 hex chars)
- [ ] Generated strong database password
- [ ] Secrets saved securely in /root/cecbs-secrets.txt
- [ ] FORCE_HTTPS=true in API config
- [ ] Only necessary ports exposed (22, 80, 443)
- [ ] UFW or firewalld properly configured
- [ ] Swagger disabled in production (ENABLE_SWAGGER=false)
- [ ] SSL certificate auto-renewal tested
- [ ] All default passwords changed
- [ ] Rate limiting enabled

### Monitoring Setup
- [ ] Service status script created (/root/cecbs-status.sh)
- [ ] Service restart script created (/root/restart-cecbs.sh)
- [ ] Log rotation configured
- [ ] Backup script scheduled (optional)
- [ ] Certificate expiry monitoring setup
- [ ] Disk space monitoring (>10GB free recommended)
- [ ] Memory usage monitoring
- [ ] Error log monitoring

### Documentation
- [ ] Production secrets documented securely
- [ ] Service management commands tested
- [ ] Update procedures documented
- [ ] Emergency contacts configured
- [ ] Troubleshooting guide accessible

---

## 📞 Quick Reference Commands

```bash
# Service Status
/root/cecbs-status.sh

# Restart All Services  
/root/restart-cecbs.sh

# Check Logs
tail -f /var/log/nginx/cecbs-error.log
tail -f /var/log/cecbs-api.log

# Test Endpoints
curl https://coffeex.cbe.com.et/health
curl https://coffeex.cbe.com.et/api/v1/health

# Certificate Info
certbot certificates
openssl x509 -in /etc/letsencrypt/live/coffeex.cbe.com.et/fullchain.pem -text -noout | grep -A2 "Validity"

# System Resources
free -h
df -h
htop
```

---

**Domain**: coffeex.cbe.com.et  
**Server**: 10.3.15.7  
**SSL**: Let's Encrypt  
**Deployment Date**: _______________  
**Status**: ✅ Production Ready

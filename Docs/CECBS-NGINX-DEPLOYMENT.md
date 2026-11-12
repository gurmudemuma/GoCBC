# CECBS Nginx Deployment Guide
## Coffee Export Consortium Blockchain System

**Production-Ready Configuration for Your Actual System**

---

## 📋 System Overview

### Your CECBS Architecture

```
Internet/Network
    ↓
[Nginx Reverse Proxy] (Port 80/443)
    ↓
    ├─→ Next.js UI (Port 3000) → Frontend Application
    ├─→ Node.js API (Port 3001) → Backend API Server
    ├─→ IPFS Gateway (Port 8080) → Distributed Storage
    └─→ IPFS API (Port 5001) → IPFS Management
```

### Port Mapping

| Service | Internal Port | External Access | Description |
|---------|---------------|-----------------|-------------|
| **Next.js UI** | 3000 | Via Nginx (/) | Main web interface |
| **API Server** | 3001 | Via Nginx (/api/v1/) | Blockchain API |
| **IPFS Gateway** | 8080 | Via Nginx (/ipfs/) | Document access |
| **IPFS API** | 5001 | Restricted | IPFS management |
| **Nginx** | 80, 443 | Public | Reverse proxy |

---

## 🚀 Quick Deployment

### Prerequisites
- Server running Ubuntu 20.04+, Debian 11+, or RHEL/CentOS 8+
- Root or sudo access
- Your CECBS application files deployed
- Server IP address (e.g., 10.3.45.67)

### One-Command Deployment

```bash
# 1. Copy files to server
scp nginx-configs/cecbs-production.conf root@10.3.xx.xx:/root/
scp nginx-configs/deploy-cecbs-nginx.sh root@10.3.xx.xx:/root/

# 2. SSH to server
ssh root@10.3.xx.xx

# 3. Run deployment (replace with your IP)
chmod +x deploy-cecbs-nginx.sh
./deploy-cecbs-nginx.sh --ip 10.3.45.67
```

### With Domain and SSL

```bash
# With Let's Encrypt SSL (recommended for production)
./deploy-cecbs-nginx.sh --ip 10.3.45.67 --domain coffee.cecbs.et --ssl letsencrypt

# With self-signed SSL (for testing)
./deploy-cecbs-nginx.sh --ip 10.3.45.67 --ssl selfsigned
```

---

## 📝 Manual Deployment Steps

### Step 1: Install Nginx

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx -y
```

**RHEL/CentOS/Rocky:**
```bash
sudo yum install epel-release -y
sudo yum install nginx -y
```

### Step 2: Deploy Configuration

**Ubuntu/Debian:**
```bash
# Copy configuration
sudo cp cecbs-production.conf /etc/nginx/sites-available/cecbs

# Update server name (replace XX.XX with your IP)
sudo sed -i 's/SERVER_NAME_PLACEHOLDER/10.3.XX.XX/g' /etc/nginx/sites-available/cecbs

# Enable site
sudo ln -s /etc/nginx/sites-available/cecbs /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

**RHEL/CentOS/Rocky:**
```bash
# Copy configuration
sudo cp cecbs-production.conf /etc/nginx/conf.d/cecbs.conf

# Update server name
sudo sed -i 's/SERVER_NAME_PLACEHOLDER/10.3.XX.XX/g' /etc/nginx/conf.d/cecbs.conf

# Disable default server
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
```

### Step 3: Test and Start

```bash
# Test configuration
sudo nginx -t

# Enable and start nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### Step 4: Configure Firewall

**UFW (Ubuntu/Debian):**
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

**Firewalld (RHEL/CentOS):**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

---

## 🔒 SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu/Debian
# OR
sudo yum install certbot python3-certbot-nginx -y  # RHEL/CentOS

# Obtain certificate (replace with your domain)
sudo certbot --nginx -d coffee.cecbs.et

# Test auto-renewal
sudo certbot renew --dry-run
```

### Option 2: Self-Signed Certificate (Testing)

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/cecbs.key \
  -out /etc/nginx/ssl/cecbs.crt \
  -subj "/C=ET/ST=Addis Ababa/L=Addis Ababa/O=CECBS/CN=10.3.XX.XX"

# Set permissions
sudo chmod 600 /etc/nginx/ssl/cecbs.key
sudo chmod 644 /etc/nginx/ssl/cecbs.crt
```

Then edit `/etc/nginx/sites-available/cecbs` and uncomment the HTTPS server block.

---

## ✅ Verification & Testing

### 1. Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### 2. Test Backend Services
```bash
# From the server
curl http://localhost:3000/  # UI should respond
curl http://localhost:3001/api/v1/health  # API health check
curl http://localhost:8080/ipfs/QmTest  # IPFS gateway (will 404 but should connect)
```

### 3. Test Reverse Proxy
```bash
# From server
curl http://localhost/health
curl http://localhost/api/v1/health

# From another machine (replace with your IP)
curl http://10.3.XX.XX/health
curl http://10.3.XX.XX/api/v1/health
```

### 4. Test in Browser
```
http://10.3.XX.XX/
http://10.3.XX.XX/api/v1/health
```

### 5. Check Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/cecbs-access.log

# Error logs
sudo tail -f /var/log/nginx/cecbs-error.log

# Nginx service logs
sudo journalctl -u nginx -f
```

---

## 🔧 Configuration Details

### Rate Limiting

Your configuration includes built-in rate limiting:

| Zone | Rate | Burst | Purpose |
|------|------|-------|---------|
| **api_limit** | 100/min | 20 | General API calls |
| **auth_limit** | 10/min | 5 | Login/auth endpoints |
| **upload_limit** | 20/min | 10 | Document uploads |

### Timeout Settings

| Endpoint Type | Timeout | Reason |
|---------------|---------|---------|
| **Health checks** | 5s | Fast monitoring |
| **Authentication** | 60s | Standard auth |
| **File uploads** | 180s | Large documents |
| **General API** | 90s | Blockchain operations |
| **WebSockets** | 7 days | Persistent connections |

### Caching Strategy

| Content Type | Cache Duration | Notes |
|--------------|----------------|-------|
| **IPFS content** | 1 year | Immutable by design |
| **Static assets** | 30 days | Images, fonts, etc. |
| **Next.js static** | 1 year | Hashed filenames |
| **JS/CSS** | No cache (dev) | Enable in production |

---

## 🛠️ Common Commands

### Nginx Control
```bash
sudo systemctl start nginx      # Start
sudo systemctl stop nginx       # Stop
sudo systemctl restart nginx    # Full restart
sudo systemctl reload nginx     # Reload config (no downtime)
sudo systemctl status nginx     # Check status
```

### Configuration Testing
```bash
sudo nginx -t                   # Test config
sudo nginx -T                   # Test and show full config
```

### Log Management
```bash
# Real-time logs
sudo tail -f /var/log/nginx/cecbs-access.log
sudo tail -f /var/log/nginx/cecbs-error.log

# Last 100 lines
sudo tail -n 100 /var/log/nginx/cecbs-error.log

# Search for errors
sudo grep -i error /var/log/nginx/cecbs-error.log
```

### Quick Fixes
```bash
# Restart everything
sudo systemctl restart nginx

# Test configuration without restarting
sudo nginx -t

# Reload configuration without downtime
sudo systemctl reload nginx
```

---

## 🐛 Troubleshooting

### Issue 1: 502 Bad Gateway

**Symptoms**: Nginx shows 502 error  
**Cause**: Backend services (UI/API) not running

**Solution**:
```bash
# Check if services are running
curl http://localhost:3000/  # UI
curl http://localhost:3001/api/v1/health  # API

# Check process status
ps aux | grep node

# Restart your services
cd /path/to/cecbs/ui && npm run dev &
cd /path/to/cecbs/api && npm start &
```

### Issue 2: 504 Gateway Timeout

**Symptoms**: Requests timeout after 90 seconds  
**Cause**: Backend operation takes too long

**Solution**: Increase timeouts in config
```nginx
# Edit /etc/nginx/sites-available/cecbs
location /api/v1/ {
    proxy_connect_timeout 180s;  # Increase from 90s
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;
    # ... rest of config
}
```

Then reload: `sudo systemctl reload nginx`

### Issue 3: Connection Refused

**Symptoms**: "Connection refused" in error log  
**Cause**: Backend not listening on expected port

**Solution**:
```bash
# Check which ports are listening
sudo ss -tlnp | grep -E ':(3000|3001)'
sudo netstat -tlnp | grep -E ':(3000|3001)'

# Start missing services
cd /path/to/cecbs/ui && npm run dev
cd /path/to/cecbs/api && npm start
```

### Issue 4: 403 Forbidden

**Symptoms**: Nginx returns 403 error  
**Cause**: File permissions or missing index

**Solution**:
```bash
# Check nginx error log
sudo tail -f /var/log/nginx/cecbs-error.log

# Verify backend is responding
curl http://localhost:3000/
```

### Issue 5: Static Files Not Loading

**Symptoms**: CSS/JS files not loading  
**Cause**: Caching or proxy issues

**Solution**:
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Check nginx error log
sudo tail -f /var/log/nginx/cecbs-error.log

# Verify UI is serving files
curl http://localhost:3000/_next/static/
```

---

## 📊 Monitoring

### Real-Time Monitoring
```bash
# Watch access log
sudo tail -f /var/log/nginx/cecbs-access.log

# Watch error log
sudo tail -f /var/log/nginx/cecbs-error.log

# Watch both
sudo tail -f /var/log/nginx/cecbs-access.log /var/log/nginx/cecbs-error.log
```

### Nginx Status Page
```bash
# Access from server
curl http://localhost/nginx_status

# Shows:
# - Active connections
# - Requests per second
# - Connection statistics
```

### System Resources
```bash
# Check nginx process
ps aux | grep nginx

# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
top
# Or
htop
```

---

## 🔄 Updates & Maintenance

### Update Nginx
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade nginx -y

# RHEL/CentOS
sudo yum update nginx -y

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### Backup Configuration
```bash
# Backup nginx config
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz \
    /etc/nginx/

# Backup with SSL certs
sudo tar -czf cecbs-nginx-full-backup-$(date +%Y%m%d).tar.gz \
    /etc/nginx/ \
    /etc/letsencrypt/
```

### Restore from Backup
```bash
# Restore configuration
sudo tar -xzf nginx-backup-20260707.tar.gz -C /

# Test configuration
sudo nginx -t

# Reload if OK
sudo systemctl reload nginx
```

---

## 🔐 Security Checklist

- [ ] Nginx installed and running
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] SSL/TLS certificates installed (production)
- [ ] Rate limiting enabled
- [ ] Backend services only accessible via localhost
- [ ] Access logs enabled
- [ ] Error logs enabled
- [ ] Regular backups scheduled
- [ ] Security headers configured (with SSL)
- [ ] Hidden files blocked (.env, .git, etc.)
- [ ] IPFS API restricted to localhost
- [ ] IPFS WebUI restricted to internal network

---

## 📚 Service URLs

After deployment, your services are accessible at:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | `http://10.3.XX.XX/` | Main web application |
| **API** | `http://10.3.XX.XX/api/v1/` | Backend API endpoints |
| **Health Check** | `http://10.3.XX.XX/health` | System status |
| **API Health** | `http://10.3.XX.XX/api/v1/health` | API status |
| **IPFS Gateway** | `http://10.3.XX.XX/ipfs/<CID>` | Document access |
| **Nginx Status** | `http://10.3.XX.XX/nginx_status` | Server stats (internal only) |

---

## 🆘 Emergency Procedures

### Completely Restart Everything
```bash
# Stop nginx
sudo systemctl stop nginx

# Stop your services (adjust paths)
pkill -f "node.*ui"
pkill -f "node.*api"

# Start services
cd /path/to/cecbs/ui && npm run dev &
cd /path/to/cecbs/api && npm start &

# Wait 10 seconds
sleep 10

# Start nginx
sudo systemctl start nginx
```

### Check Everything is Running
```bash
# Nginx status
sudo systemctl status nginx

# Backend services
curl http://localhost:3000/
curl http://localhost:3001/api/v1/health

# IPFS
curl http://localhost:5001/api/v0/version

# Reverse proxy
curl http://localhost/health
```

---

## 📞 Support Information

Before asking for help, collect this diagnostic information:

```bash
#!/bin/bash
echo "=== CECBS Diagnostic Report ==="
echo ""
echo "System Info:"
uname -a
cat /etc/os-release
echo ""
echo "Nginx Status:"
sudo systemctl status nginx
sudo nginx -t
echo ""
echo "Backend Services:"
curl -s http://localhost:3000/ | head -c 100
curl -s http://localhost:3001/api/v1/health
echo ""
echo "Port Status:"
sudo ss -tlnp | grep -E ':(80|443|3000|3001|5001|8080)'
echo ""
echo "Recent Nginx Errors:"
sudo tail -n 20 /var/log/nginx/cecbs-error.log
echo ""
echo "=== End Report ==="
```

Save as `cecbs-diagnostic.sh` and run: `bash cecbs-diagnostic.sh > diagnostic-report.txt`

---

## 🎯 Performance Tuning

For high-traffic production deployments, edit `/etc/nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Keep existing http settings
    # Add these for better performance:
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Include site configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

Then: `sudo systemctl reload nginx`

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-07  
**System**: CECBS (Coffee Export Consortium Blockchain System)  
**Configuration File**: cecbs-production.conf

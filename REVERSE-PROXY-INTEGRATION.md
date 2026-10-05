# Reverse Proxy Integration Guide

## Overview

The CECBS system has a complete **nginx reverse proxy** configuration ready for production deployment. The reverse proxy is **optional** and primarily used for:

1. **Production deployments** - External access with proper security
2. **SSL/TLS termination** - HTTPS support
3. **Load balancing** - Future scalability
4. **Security** - Rate limiting, access control, DDoS protection
5. **Unified access point** - Single URL for UI and API

## Current Status

### ✅ What You Have
- **Complete nginx configuration**: `nginx-configs/cecbs-production.conf`
- **Automated deployment script**: `nginx-configs/deploy-cecbs-nginx.sh`
- **Full documentation**: `nginx-configs/CECBS-NGINX-DEPLOYMENT.md`
- **Quick reference**: `nginx-configs/CECBS-QUICK-REFERENCE.md`
- **Deployment checklist**: `nginx-configs/DEPLOYMENT-CHECKLIST.md`

### 🔧 Current Architecture

**Development/Testing (Current - No Nginx):**
```
User → UI (localhost:3000)
User → API (localhost:3001)
```

**Production (With Nginx):**
```
Internet → Nginx (Port 80/443)
             ├─→ UI (localhost:3000)
             ├─→ API (localhost:3001)
             └─→ IPFS (localhost:8080)
```

## When to Use Nginx

### ✅ Use Nginx When:
- **Production deployment** - Deploying to a server for real users
- **SSL required** - Need HTTPS for security
- **Multiple users** - Need rate limiting and DDoS protection
- **External access** - Users accessing from outside localhost
- **Domain name** - Have a domain like `coffee.cecbs.et`

### ❌ Don't Use Nginx When:
- **Development** - Working on localhost
- **Testing** - Running automated tests
- **Single user** - Just you on your machine
- **Using start-all.sh locally** - The script works fine without nginx

## Quick Start Options

### Option 1: Development (No Nginx - Current Setup)
Just use `start-all.sh` as you've been doing:

```bash
./start-all.sh
# Access:
# - UI: http://localhost:3000
# - API: http://localhost:3001
```

✅ **No nginx needed!** This is what you're doing now and it works perfectly.

### Option 2: Production with Nginx (Manual Setup)

**Step 1:** Deploy the application to your server
```bash
# On your production server
cd /home/guda/GoCBC
./start-all.sh
```

**Step 2:** Deploy nginx
```bash
cd /home/guda/GoCBC/nginx-configs
sudo ./deploy-cecbs-nginx.sh --ip 10.3.15.7
```

**Step 3:** Access via nginx
```
# Public URL: http://10.3.15.7/
# - Nginx forwards to UI on port 3000
# - API accessible at /api/v1/
```

### Option 3: Production with SSL (Recommended for Public Deployments)

```bash
cd /home/guda/GoCBC/nginx-configs
sudo ./deploy-cecbs-nginx.sh \
  --ip 10.3.15.7 \
  --domain coffee.cecbs.et \
  --ssl letsencrypt
```

Access: `https://coffee.cecbs.et/`

## Integration with start-all.sh

### Current Design (Recommended)
The nginx reverse proxy is **intentionally separate** from `start-all.sh` because:

1. **Nginx is optional** - Not everyone needs it
2. **Different environments** - Dev vs Production
3. **Requires root** - Nginx needs sudo, start-all.sh doesn't
4. **Production-only** - Typically deployed once, not restarted frequently

### If You Want Automatic Nginx Startup

I can add an optional flag to `start-all.sh` to check if nginx should start. Here are the options:

#### Option A: Add `--with-nginx` flag to start-all.sh
```bash
./start-all.sh --with-nginx
```

Would:
- Start all backend services
- Check if nginx is installed
- Start nginx service
- Verify reverse proxy is working

#### Option B: Separate script for production
```bash
./start-production.sh
```

Would:
- Run start-all.sh
- Deploy/restart nginx
- Verify full stack

#### Option C: Keep them separate (Current - Recommended)
```bash
# Step 1: Start backend
./start-all.sh

# Step 2: If nginx needed, start it separately
sudo systemctl start nginx
```

## Detailed Setup for Production

### 1. Prepare Your Server

```bash
# Install prerequisites (if not already installed)
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Clone/copy your project
cd /home/guda
git clone <your-repo> GoCBC
# OR: scp -r GoCBC user@server:/home/guda/
```

### 2. Start Backend Services

```bash
cd /home/guda/GoCBC
./start-all.sh
```

Wait for completion (~115 seconds). Verify:
```bash
curl http://localhost:3000/  # UI should respond
curl http://localhost:3001/api/v1/health  # API health check
```

### 3. Deploy Nginx

```bash
cd /home/guda/GoCBC/nginx-configs

# For IP-only access
sudo ./deploy-cecbs-nginx.sh --ip 10.3.15.7

# OR for domain with SSL
sudo ./deploy-cecbs-nginx.sh \
  --ip 10.3.15.7 \
  --domain coffee.cecbs.et \
  --ssl letsencrypt
```

### 4. Verify Nginx

```bash
# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Test from server
curl http://localhost/health

# Test from another machine
curl http://10.3.15.7/health
```

### 5. Access Your System

**Without domain:**
```
http://10.3.15.7/
http://10.3.15.7/api/v1/health
```

**With domain and SSL:**
```
https://coffee.cecbs.et/
https://coffee.cecbs.et/api/v1/health
```

## Nginx Configuration Highlights

### Rate Limiting
```nginx
# API calls: 100/minute (burst 20)
limit_req zone=api_limit burst=20 nodelay;

# Authentication: 10/minute (burst 5)
limit_req zone=auth_limit burst=5 nodelay;

# File uploads: 20/minute (burst 10)
limit_req zone=upload_limit burst=10 nodelay;
```

### Security Features
- Hidden file access blocked (`.env`, `.git`)
- IPFS API restricted to localhost
- Security headers (when SSL enabled)
- Connection limits to prevent DOS
- Request size limits (50MB max)

### Timeouts
- Health checks: 5 seconds
- Authentication: 60 seconds
- File uploads: 180 seconds
- General API: 90 seconds
- WebSockets: 7 days

### URL Routing
```nginx
/                      → UI (Next.js on port 3000)
/api/v1/*              → API (Node.js on port 3001)
/ipfs/<CID>            → IPFS Gateway (port 8080)
/health                → API health check
```

## Managing Nginx

### Start/Stop/Restart
```bash
# Start nginx
sudo systemctl start nginx

# Stop nginx
sudo systemctl stop nginx

# Restart nginx
sudo systemctl restart nginx

# Reload config (no downtime)
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

### View Logs
```bash
# Access log (all requests)
sudo tail -f /var/log/nginx/cecbs-access.log

# Error log
sudo tail -f /var/log/nginx/cecbs-error.log

# Last 100 errors
sudo tail -n 100 /var/log/nginx/cecbs-error.log
```

### Test Configuration
```bash
# Test config for syntax errors
sudo nginx -t

# Test and reload if OK
sudo nginx -t && sudo systemctl reload nginx
```

### SSL Certificate Renewal (Let's Encrypt)
```bash
# Manual renewal
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Auto-renewal (should be automatic)
sudo systemctl status certbot.timer
```

## Troubleshooting

### Problem: 502 Bad Gateway
**Cause:** Backend services not running

**Solution:**
```bash
# Check if services are running
curl http://localhost:3000/
curl http://localhost:3001/api/v1/health

# If not, restart backend
cd /home/guda/GoCBC
./start-all.sh
```

### Problem: 504 Gateway Timeout
**Cause:** Backend taking too long to respond

**Solution:** Increase timeouts in nginx config
```bash
sudo nano /etc/nginx/sites-available/cecbs
# Increase proxy_read_timeout values
sudo nginx -t && sudo systemctl reload nginx
```

### Problem: Cannot Access Externally
**Cause:** Firewall blocking ports

**Solution:**
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status

# RHEL/CentOS
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

### Problem: SSL Certificate Error
**Cause:** Certificate expired or not found

**Solution:**
```bash
# Check certificate
sudo certbot certificates

# Renew if needed
sudo certbot renew --force-renewal

# Restart nginx
sudo systemctl restart nginx
```

## Daily Operations

### Morning Checks
```bash
# Check nginx is running
sudo systemctl status nginx

# Check backend services
curl http://localhost:3000/ > /dev/null && echo "UI OK"
curl http://localhost:3001/api/v1/health | jq .

# Check recent errors
sudo tail -n 20 /var/log/nginx/cecbs-error.log
```

### Weekly Maintenance
```bash
# Check disk space
df -h

# Check SSL certificate expiry
sudo certbot certificates

# Review logs for issues
sudo tail -n 100 /var/log/nginx/cecbs-error.log

# Verify rate limiting is working
sudo grep "limiting requests" /var/log/nginx/cecbs-error.log
```

### Monthly Tasks
```bash
# Update nginx
sudo apt update && sudo apt upgrade nginx

# Test config after update
sudo nginx -t

# Backup configuration
sudo tar -czf ~/nginx-backup-$(date +%Y%m%d).tar.gz \
  /etc/nginx/sites-available/cecbs \
  /etc/nginx/sites-enabled/cecbs \
  /etc/nginx/ssl/

# Restart nginx
sudo systemctl restart nginx
```

## Complete Production Deployment Workflow

### One-Time Setup (New Server)

```bash
# 1. Prepare server
ssh root@10.3.15.7
apt update && apt upgrade -y
apt install -y docker docker-compose nodejs npm nginx certbot

# 2. Deploy application
cd /home/guda
git clone <repo> GoCBC
cd GoCBC

# 3. Start backend services
./start-all.sh
# Wait ~115 seconds for completion

# 4. Deploy nginx with SSL
cd nginx-configs
./deploy-cecbs-nginx.sh \
  --ip 10.3.15.7 \
  --domain coffee.cecbs.et \
  --ssl letsencrypt

# 5. Verify
curl https://coffee.cecbs.et/health
```

### Daily Restart (If Needed)

```bash
# Restart backend only
cd /home/guda/GoCBC
./stop-all.sh
./start-all.sh

# Nginx stays running, no need to restart
```

### Full System Restart

```bash
# Stop everything
cd /home/guda/GoCBC
./stop-all.sh
sudo systemctl stop nginx

# Start backend
./start-all.sh
# Wait for completion

# Start nginx
sudo systemctl start nginx

# Verify
curl http://localhost/health
```

## Recommendation

### For Your Current Setup (Development/Testing):
**✅ Keep using `start-all.sh` without nginx**
- It works perfectly as-is
- No additional complexity
- Easier to develop and debug

### For Production Deployment:
**✅ Use nginx separately**
1. Deploy application with `start-all.sh`
2. Deploy nginx with `deploy-cecbs-nginx.sh`
3. Keep them as separate services

### Why Keep Them Separate?
1. **Flexibility** - Can restart backend without touching nginx
2. **Simplicity** - Each script does one thing well
3. **Permissions** - start-all.sh doesn't need root, nginx does
4. **Environment** - Dev doesn't need nginx, production does

## Would You Like Me To...?

I can help you with any of these:

### Option 1: Add nginx support to start-all.sh
- Add `--with-nginx` flag
- Check if nginx is installed
- Start/reload nginx after backend starts
- Unified startup for production

### Option 2: Create start-production.sh script
- Wrapper that calls start-all.sh
- Then deploys/starts nginx
- Single command for production deployment

### Option 3: Keep current design (Recommended)
- Leave them separate (most flexible)
- Document the two-step process
- Add verification script to check both

### Option 4: Setup nginx now
- Deploy nginx on your current machine
- Test reverse proxy locally
- Practice production workflow

## Quick Reference Card

```bash
# ==========================================
# CECBS Quick Commands
# ==========================================

# --- Development (No Nginx) ---
./start-all.sh              # Start everything
./stop-all.sh               # Stop everything
http://localhost:3000       # UI
http://localhost:3001       # API

# --- Production (With Nginx) ---
./start-all.sh              # Start backend
sudo systemctl start nginx  # Start nginx
http://your-server-ip/      # Public access
https://your-domain/        # With SSL

# --- Nginx Management ---
sudo systemctl status nginx     # Check status
sudo systemctl reload nginx     # Reload config
sudo nginx -t                   # Test config
sudo tail -f /var/log/nginx/cecbs-error.log  # View logs

# --- Full Restart ---
./stop-all.sh && ./start-all.sh           # Backend
sudo systemctl restart nginx               # Nginx

# --- Troubleshooting ---
curl http://localhost:3000/                # Test UI
curl http://localhost:3001/api/v1/health  # Test API
curl http://localhost/health               # Test nginx
```

---

## Summary

**Current Status:** ✅ Your system works perfectly without nginx for development/testing

**Nginx Files:** ✅ Complete and ready in `nginx-configs/` directory

**When to use:**
- **Now (Development):** No nginx needed, keep using start-all.sh
- **Production deployment:** Add nginx for security, SSL, and unified access

**How to add nginx:**
```bash
cd nginx-configs
sudo ./deploy-cecbs-nginx.sh --ip <your-server-ip>
```

**Need help deciding?** Let me know your deployment scenario and I can recommend the best approach!

# CECBS Nginx Configuration Files

**Production-ready nginx reverse proxy configuration for the Coffee Export Consortium Blockchain System (CECBS)**

---

## 📦 What's Included

This directory contains everything you need to deploy nginx as a reverse proxy for your CECBS system:

| File | Purpose | Use When |
|------|---------|----------|
| **cecbs-production.conf** | Main nginx configuration | Manual deployment |
| **deploy-cecbs-nginx.sh** | Automated deployment script | Quick setup |
| **CECBS-NGINX-DEPLOYMENT.md** | Complete deployment guide | Full instructions |
| **CECBS-QUICK-REFERENCE.md** | Quick command reference | Daily operations |
| **README.md** | This file | Getting started |

---

## 🎯 Quick Start

### For Production Server

**Step 1**: Copy files to server
```bash
scp cecbs-production.conf root@10.3.XX.XX:/root/
scp deploy-cecbs-nginx.sh root@10.3.XX.XX:/root/
```

**Step 2**: SSH and deploy
```bash
ssh root@10.3.XX.XX
chmod +x deploy-cecbs-nginx.sh
./deploy-cecbs-nginx.sh --ip 10.3.XX.XX
```

**Step 3**: Access your system
```
http://10.3.XX.XX/
```

### With SSL (Recommended)

```bash
./deploy-cecbs-nginx.sh --ip 10.3.XX.XX --domain coffee.cecbs.et --ssl letsencrypt
```

---

## 🏗️ Architecture

Your CECBS system architecture:

```
[Internet] → [Nginx :80] → [UI :3000] (Next.js)
                         → [API :3001] (Node.js)
                         → [IPFS :8080] (Gateway)
```

**Key Differences from Generic Config:**
- ✅ Single unified API on port 3001 (not microservices)
- ✅ Next.js UI on port 3000 (not 5173)
- ✅ IPFS integration on ports 5001/8080
- ✅ Optimized for your actual system

---

## 📋 System Requirements

### Server
- Ubuntu 20.04+, Debian 11+, or RHEL/CentOS 8+
- Minimum 4GB RAM, 2 CPU cores
- 50GB disk space
- Root or sudo access

### Services Running
Before deploying nginx, ensure these are running:
- ✅ Next.js UI on port 3000
- ✅ Node.js API on port 3001
- ✅ IPFS daemon on ports 5001 (API) and 8080 (Gateway)

### Network
- Server IP accessible (e.g., 10.3.45.67)
- Ports 80 and 443 open in firewall
- Domain name (optional, for SSL)

---

## 🚀 Deployment Options

### Option 1: Automated Script (Recommended)

**Advantages:**
- One command deployment
- Automatic configuration
- Built-in error checking
- Firewall setup included

**Usage:**
```bash
./deploy-cecbs-nginx.sh --ip 10.3.XX.XX [--domain coffee.cecbs.et] [--ssl letsencrypt]
```

### Option 2: Manual Deployment

**Advantages:**
- Full control over each step
- Better for learning
- Easier to troubleshoot

**Follow:** `CECBS-NGINX-DEPLOYMENT.md`

---

## 📚 Documentation Structure

### For First-Time Deployment
1. Start with: **CECBS-NGINX-DEPLOYMENT.md**
   - Complete step-by-step guide
   - SSL setup instructions
   - Troubleshooting section

### For Daily Operations
2. Refer to: **CECBS-QUICK-REFERENCE.md**
   - Common commands
   - Quick fixes
   - Status checks

### Configuration File
3. Customize: **cecbs-production.conf**
   - Main nginx config
   - Well-commented
   - Production-ready

---

## ⚙️ Configuration Highlights

### Rate Limiting
- API calls: 100/minute (burst 20)
- Authentication: 10/minute (burst 5)
- File uploads: 20/minute (burst 10)

### Timeouts
- Health checks: 5 seconds
- Authentication: 60 seconds
- File uploads: 180 seconds
- General API: 90 seconds
- WebSockets: 7 days

### Security
- Rate limiting on all endpoints
- Hidden file access blocked
- IPFS API restricted to localhost
- IPFS WebUI restricted to internal network
- SSL/TLS support (Let's Encrypt or self-signed)
- Security headers (when SSL enabled)

### Caching
- IPFS content: 1 year (immutable)
- Static assets: 30 days
- Next.js static: 1 year
- API responses: No cache

---

## 🔧 Customization

### Change Server IP
```bash
# In cecbs-production.conf
sed -i 's/SERVER_NAME_PLACEHOLDER/10.3.45.67/g' cecbs-production.conf
```

### Add Domain Name
```nginx
server_name 10.3.45.67 coffee.cecbs.et;
```

### Adjust Rate Limits
```nginx
# In cecbs-production.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/m;  # Increase from 100
```

### Enable Production Caching
```nginx
# For JS/CSS files, change from:
add_header Cache-Control "no-cache";

# To:
expires 7d;
add_header Cache-Control "public, max-age=604800";
```

---

## ✅ Verification

After deployment, verify everything works:

```bash
# 1. Nginx status
sudo systemctl status nginx

# 2. Configuration test
sudo nginx -t

# 3. Backend connectivity
curl http://localhost:3000/      # UI
curl http://localhost:3001/api/v1/health  # API

# 4. Reverse proxy
curl http://localhost/health
curl http://localhost/api/v1/health

# 5. External access (from another machine)
curl http://10.3.XX.XX/health
```

---

## 🐛 Troubleshooting

### Problem: 502 Bad Gateway
**Solution**: Backend services not running
```bash
# Check services
curl http://localhost:3000/
curl http://localhost:3001/api/v1/health

# Restart if needed
cd /path/to/ui && npm run dev &
cd /path/to/api && npm start &
```

### Problem: 504 Gateway Timeout
**Solution**: Increase timeouts in config
```nginx
proxy_read_timeout 180s;
```

### Problem: SSL Certificate Error
**Solution**: Check certificate validity
```bash
sudo certbot certificates
sudo openssl x509 -in /etc/nginx/ssl/cecbs.crt -text -noout
```

### Problem: Can't Access Externally
**Solution**: Check firewall
```bash
# Ubuntu/Debian
sudo ufw status

# RHEL/CentOS
sudo firewall-cmd --list-all
```

---

## 📊 Monitoring

### Check Logs
```bash
# Real-time access log
sudo tail -f /var/log/nginx/cecbs-access.log

# Real-time error log
sudo tail -f /var/log/nginx/cecbs-error.log

# Last 100 errors
sudo tail -n 100 /var/log/nginx/cecbs-error.log
```

### Nginx Status
```bash
# From server
curl http://localhost/nginx_status

# Shows:
# - Active connections
# - Requests per second
# - Connection statistics
```

---

## 🔄 Updates

### Update Nginx
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade nginx -y

# RHEL/CentOS
sudo yum update nginx -y

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### Update Configuration
```bash
# Edit config
sudo nano /etc/nginx/sites-available/cecbs

# Test changes
sudo nginx -t

# Apply without downtime
sudo systemctl reload nginx
```

---

## 💾 Backup

### Backup Configuration
```bash
sudo tar -czf cecbs-nginx-backup-$(date +%Y%m%d).tar.gz \
    /etc/nginx/sites-available/cecbs \
    /etc/nginx/sites-enabled/cecbs \
    /etc/nginx/ssl/ \
    /etc/letsencrypt/
```

### Restore from Backup
```bash
sudo tar -xzf cecbs-nginx-backup-20260707.tar.gz -C /
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🆘 Emergency Procedures

### Complete System Restart
```bash
#!/bin/bash
# Stop everything
sudo systemctl stop nginx
pkill -f "node"

# Start backend services
cd /path/to/cecbs/ui && npm run dev &
cd /path/to/cecbs/api && npm start &

# Wait for services
sleep 10

# Start nginx
sudo systemctl start nginx

# Verify
curl http://localhost/health
```

### Rollback to Previous Config
```bash
# If you have a backup
sudo cp /etc/nginx/sites-available/cecbs /etc/nginx/sites-available/cecbs.broken
sudo cp cecbs-backup-last-good.conf /etc/nginx/sites-available/cecbs
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📞 Support

### Collect Diagnostic Info
```bash
# System info
uname -a
cat /etc/os-release

# Nginx info
sudo systemctl status nginx
sudo nginx -t

# Backend status
curl http://localhost:3000/ 2>&1 | head -c 100
curl http://localhost:3001/api/v1/health

# Port status
sudo ss -tlnp | grep -E ':(80|443|3000|3001)'

# Recent errors
sudo tail -n 50 /var/log/nginx/cecbs-error.log
```

---

## 🎓 Learn More

- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **CECBS Project**: [Your project documentation]

---

## 📄 File Overview

### cecbs-production.conf
**Size**: ~15KB  
**Purpose**: Complete nginx reverse proxy configuration  
**Features**:
- Upstream definitions for UI, API, IPFS
- Rate limiting for security
- Optimized timeout settings
- Caching strategies
- WebSocket support
- IPFS integration
- Security hardening

### deploy-cecbs-nginx.sh
**Size**: ~8KB  
**Purpose**: Automated deployment script  
**Features**:
- OS detection (Ubuntu/Debian/RHEL/CentOS)
- Automatic nginx installation
- Configuration deployment
- SSL certificate setup (Let's Encrypt or self-signed)
- Firewall configuration
- Service verification
- Colored output for better UX

### CECBS-NGINX-DEPLOYMENT.md
**Size**: ~20KB  
**Purpose**: Complete deployment documentation  
**Contents**:
- Architecture overview
- Step-by-step installation
- SSL/TLS setup guide
- Security checklist
- Troubleshooting guide
- Performance tuning
- Monitoring setup

### CECBS-QUICK-REFERENCE.md
**Size**: ~3KB  
**Purpose**: Quick command reference  
**Contents**:
- Common commands
- Port mappings
- Quick fixes
- Service URLs
- Emergency procedures

---

## ✨ What Makes This Special

### Tailored for Your System
- ❌ **Not a generic config** - specifically for CECBS
- ✅ **Correct ports** - UI:3000, API:3001 (not the generic 5173/3000)
- ✅ **IPFS integrated** - full support for distributed storage
- ✅ **Single API** - not microservices architecture

### Production-Ready
- ✅ Rate limiting to prevent abuse
- ✅ Proper timeout settings for blockchain operations
- ✅ SSL/TLS support (Let's Encrypt or self-signed)
- ✅ Security headers and access restrictions
- ✅ Caching for performance
- ✅ WebSocket support for real-time features

### Easy to Deploy
- ✅ One-command deployment script
- ✅ Automatic OS detection
- ✅ Built-in error checking
- ✅ Clear success/failure messages
- ✅ Complete documentation

### Easy to Maintain
- ✅ Well-commented configuration
- ✅ Quick reference guide
- ✅ Troubleshooting section
- ✅ Monitoring commands
- ✅ Backup/restore procedures

---

## 🎯 Next Steps

1. **Review**: Read `CECBS-NGINX-DEPLOYMENT.md`
2. **Prepare**: Ensure backend services are running
3. **Deploy**: Run `deploy-cecbs-nginx.sh`
4. **Verify**: Test all endpoints
5. **Monitor**: Check logs regularly
6. **Secure**: Add SSL certificate (production)
7. **Maintain**: Keep nginx updated

---

## 📝 Notes

- Replace `10.3.XX.XX` with your actual server IP
- Replace `coffee.cecbs.et` with your actual domain
- Update paths in scripts to match your directory structure
- Test SSL certificates before deploying to production
- Keep regular backups of configuration files

---

**Version**: 1.0  
**Last Updated**: 2026-07-07  
**Tested On**: Ubuntu 22.04, RHEL 8, CentOS 8  
**License**: MIT (adjust as needed)

---

## 🎉 Ready to Deploy!

Your CECBS nginx configuration is complete and ready for production deployment. Good luck! 🚀

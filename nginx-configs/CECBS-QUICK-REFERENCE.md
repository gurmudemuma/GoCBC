# CECBS Quick Reference Card
## Coffee Export Consortium Blockchain System - Nginx

---

## 🚀 One-Line Deployment

```bash
./deploy-cecbs-nginx.sh --ip 10.3.XX.XX
```

With SSL:
```bash
./deploy-cecbs-nginx.sh --ip 10.3.XX.XX --domain coffee.cecbs.et --ssl letsencrypt
```

---

## 📋 Your System Ports

| Service | Port | Access |
|---------|------|--------|
| **UI** | 3000 | via Nginx |
| **API** | 3001 | via Nginx |
| **IPFS Gateway** | 8080 | via Nginx (/ipfs/) |
| **IPFS API** | 5001 | localhost only |
| **Nginx** | 80, 443 | public |

---

## 🔧 Common Commands

### Nginx Control
```bash
sudo systemctl start nginx      # Start
sudo systemctl stop nginx       # Stop
sudo systemctl restart nginx    # Restart
sudo systemctl reload nginx     # Reload (no downtime)
sudo systemctl status nginx     # Status
```

### Configuration
```bash
sudo nginx -t                   # Test config
sudo nginx -T                   # Show full config
```

### Logs
```bash
sudo tail -f /var/log/nginx/cecbs-access.log  # Access
sudo tail -f /var/log/nginx/cecbs-error.log   # Errors
```

---

## ✅ Quick Test

```bash
# From server
curl http://localhost/health
curl http://localhost/api/v1/health

# From outside
curl http://10.3.XX.XX/health
```

---

## 🐛 Quick Fixes

### 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:3000/
curl http://localhost:3001/api/v1/health

# Restart services
cd /path/to/ui && npm run dev &
cd /path/to/api && npm start &
```

### 504 Timeout
```bash
# Increase timeouts in config
sudo nano /etc/nginx/sites-available/cecbs
# Change: proxy_read_timeout 180s;
sudo systemctl reload nginx
```

### Can't Connect
```bash
# Check if nginx is running
sudo systemctl status nginx

# Check which ports are listening
sudo ss -tlnp | grep -E ':(80|3000|3001)'
```

---

## 🔍 Diagnostic Commands

```bash
# Full status check
sudo systemctl status nginx
curl http://localhost:3000/
curl http://localhost:3001/api/v1/health
curl http://localhost:5001/api/v0/version
sudo ss -tlnp | grep -E ':(80|443|3000|3001)'

# View recent errors
sudo tail -n 50 /var/log/nginx/cecbs-error.log

# Test config
sudo nginx -t
```

---

## 📊 Service URLs

| Purpose | URL |
|---------|-----|
| Frontend | `http://10.3.XX.XX/` |
| API | `http://10.3.XX.XX/api/v1/` |
| Health | `http://10.3.XX.XX/health` |
| IPFS | `http://10.3.XX.XX/ipfs/<CID>` |

---

## 🔒 SSL Setup (Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d coffee.cecbs.et

# Test renewal
sudo certbot renew --dry-run
```

---

## 🛡️ Firewall (Quick)

**Ubuntu/Debian:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**RHEL/CentOS:**
```bash
sudo firewall-cmd --permanent --add-service={http,https,ssh}
sudo firewall-cmd --reload
```

---

## 📁 Config File Locations

**Ubuntu/Debian:**
- Config: `/etc/nginx/sites-available/cecbs`
- Enabled: `/etc/nginx/sites-enabled/cecbs`
- Logs: `/var/log/nginx/cecbs-*.log`

**RHEL/CentOS:**
- Config: `/etc/nginx/conf.d/cecbs.conf`
- Logs: `/var/log/nginx/cecbs-*.log`

---

## 🆘 Emergency Restart

```bash
# Stop everything
sudo systemctl stop nginx
pkill -f "node.*ui"
pkill -f "node.*api"

# Start backend
cd /path/to/ui && npm run dev &
cd /path/to/api && npm start &
sleep 10

# Start nginx
sudo systemctl start nginx
```

---

## 💡 Remember

✅ **UI on port 3000** (not 5173)  
✅ **API on port 3001** (not 3000)  
✅ **IPFS on ports 5001 & 8080**  
✅ **Test config before restart**: `sudo nginx -t`  
✅ **Reload without downtime**: `sudo systemctl reload nginx`

---

**Need Help?** Run: `bash cecbs-diagnostic.sh`

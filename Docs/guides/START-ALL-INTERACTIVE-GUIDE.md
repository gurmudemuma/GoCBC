# start-all.sh Interactive Deployment Guide

## Overview

The `start-all.sh` script now includes an **interactive menu** that lets you choose whether to deploy with nginx reverse proxy during startup.

## Usage Options

### Option 1: Interactive Mode (Default)

Just run the script and follow the prompts:

```bash
./start-all.sh
```

**You'll see a menu like this:**

```
═══════════════════════════════════════════════════
  CECBS Deployment Configuration
═══════════════════════════════════════════════════

This script will start all backend services.

Do you want to enable Nginx reverse proxy?

1) No - Development mode (localhost only)
   Access: http://localhost:3000 (UI), http://localhost:3001 (API)
   Best for: Local development and testing

2) Yes - Production mode (with Nginx)
   Access: http://your-ip/ (unified access point)
   Best for: Server deployment, external access, SSL

3) Skip - Backend only (configure Nginx later)
   Start services now, add Nginx manually when ready

Enter choice [1-3] (default: 1):
```

### Option 2: Command-Line Arguments (Non-Interactive)

#### Development Mode (No Nginx)
```bash
./start-all.sh --no-interactive
```

#### Production Mode with Nginx
```bash
./start-all.sh \
  --with-nginx \
  --nginx-ip=10.3.15.7 \
  --no-interactive
```

#### Production with Domain and SSL
```bash
./start-all.sh \
  --with-nginx \
  --nginx-ip=10.3.15.7 \
  --nginx-domain=coffee.cecbs.et \
  --nginx-ssl=letsencrypt \
  --no-interactive
```

#### Other Options
```bash
# Skip building (faster restart)
./start-all.sh --skip-build

# Development mode with hot-reload
./start-all.sh --dev-mode

# Skip connection tests
./start-all.sh --skip-tests

# Combine options
./start-all.sh --skip-build --with-nginx --nginx-ip=10.3.15.7
```

## Interactive Flow

### Choice 1: Development Mode (No Nginx)

**What happens:**
- Starts all backend services
- No nginx configuration
- Access via localhost only

**Best for:**
- Local development
- Testing
- Single-user use

**Access:**
- UI: http://localhost:3000
- API: http://localhost:3001

### Choice 2: Production Mode (With Nginx)

**What happens:**
1. Prompts for server IP (required)
2. Prompts for domain name (optional)
3. Prompts for SSL configuration:
   - None (HTTP only)
   - Self-signed certificate
   - Let's Encrypt (requires domain)
4. Starts all backend services
5. Deploys nginx reverse proxy
6. Configures SSL if selected

**Best for:**
- Production deployment
- External user access
- SSL/HTTPS requirement

**Access:**
- Via IP: http://10.3.15.7/
- Via domain: http://coffee.cecbs.et/ or https://coffee.cecbs.et/

**Example interaction:**
```
Enter choice [1-3]: 2

Production mode selected - Nginx will be configured

Server IP address:
Enter IP (e.g., 10.3.15.7): 10.3.15.7

Domain name (optional):
Enter domain (or press Enter to skip): coffee.cecbs.et

SSL Configuration:
1) None - HTTP only
2) Self-signed certificate
3) Let's Encrypt (requires domain)

Enter choice [1-3] (default: 1): 3

✓ Nginx configuration:
  • IP: 10.3.15.7
  • Domain: coffee.cecbs.et
  • SSL: letsencrypt
```

### Choice 3: Backend Only

**What happens:**
- Starts all backend services
- Skips nginx deployment
- Shows command to deploy nginx later

**Best for:**
- Want to start services quickly
- Configure nginx manually later
- Testing before adding nginx

**To add nginx later:**
```bash
cd nginx-configs
sudo ./deploy-cecbs-nginx.sh --ip 10.3.15.7
```

## Complete Command-Line Arguments

```bash
./start-all.sh [OPTIONS]

Options:
  --skip-build              Skip chaincode building
  --dev-mode                Enable development mode
  --skip-tests              Skip connection tests
  --with-nginx              Enable nginx reverse proxy
  --nginx-ip=IP             Server IP for nginx (e.g., 10.3.15.7)
  --nginx-domain=DOMAIN     Domain name for nginx (optional)
  --nginx-ssl=TYPE          SSL type: none|selfsigned|letsencrypt
  --no-interactive          Skip interactive prompts
```

## Examples

### Example 1: Quick Development Start
```bash
./start-all.sh
# Press 1 (or just Enter) when prompted
```

Result:
- Services start in ~115 seconds
- Access at http://localhost:3000

### Example 2: Production Deployment (Interactive)
```bash
./start-all.sh
# Press 2 when prompted
# Enter IP: 10.3.15.7
# Enter domain: coffee.cecbs.et
# Choose SSL: 3 (Let's Encrypt)
```

Result:
- All services start
- Nginx deployed with SSL
- Access at https://coffee.cecbs.et/

### Example 3: Production Deployment (Automated)
```bash
# For CI/CD or scripted deployment
./start-all.sh \
  --with-nginx \
  --nginx-ip=10.3.15.7 \
  --nginx-domain=coffee.cecbs.et \
  --nginx-ssl=letsencrypt \
  --no-interactive
```

Result:
- Fully automated deployment
- No user interaction required
- Perfect for scripts

### Example 4: Start Backend, Add Nginx Later
```bash
./start-all.sh
# Press 3 when prompted

# Later, when ready:
cd nginx-configs
sudo ./deploy-cecbs-nginx.sh --ip 10.3.15.7
```

Result:
- Services start immediately
- Nginx added when convenient

### Example 5: Fast Restart (Skip Build)
```bash
./start-all.sh --skip-build
```

Result:
- Much faster startup
- Uses existing builds
- Good for quick restarts

## What Gets Deployed

### Without Nginx (Choice 1 or 3)
```
┌─────────────────────────────────┐
│     localhost                   │
├─────────────────────────────────┤
│                                 │
│  User → localhost:3000 → UI     │
│  User → localhost:3001 → API    │
│                                 │
└─────────────────────────────────┘
```

**Ports used:**
- 3000: Next.js UI
- 3001: Node.js API
- 5432: PostgreSQL
- 6379: Redis
- 7050: Orderer
- 7051-12051: Peers (6 orgs)
- 5984-10984: CouchDB (6 instances)
- 9999: Chaincode

### With Nginx (Choice 2)
```
┌──────────────────────────────────────┐
│         Internet/Network             │
└─────────────┬────────────────────────┘
              │
              ▼
    ┌─────────────────┐
    │  Nginx (80/443) │
    │  - Rate Limit   │
    │  - SSL/TLS      │
    │  - Security     │
    └────────┬────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌─────────┐
│ UI:3000 │      │ API:3001│
└─────────┘      └─────────┘
```

**Ports used:**
- **80**: HTTP (nginx)
- **443**: HTTPS (nginx, if SSL enabled)
- All backend ports (same as above, but not exposed externally)

## Requirements for Nginx Deployment

### Minimum Requirements
- Root or sudo access
- nginx-configs directory present
- Backend services must be running

### For Let's Encrypt SSL
- Valid domain name
- Domain pointing to server IP
- Port 80 accessible for validation
- Port 443 accessible for HTTPS

### For Self-Signed SSL
- No domain required
- Works with IP only
- Browser will show certificate warning (expected)

## Troubleshooting

### "Nginx deployment requires root privileges"
**Solution:** Run with sudo or as root:
```bash
sudo ./start-all.sh --with-nginx --nginx-ip=10.3.15.7
```

Or deploy nginx separately:
```bash
./start-all.sh  # Start backend first
cd nginx-configs
sudo ./deploy-cecbs-nginx.sh --ip 10.3.15.7
```

### "Nginx deployment script not found"
**Solution:** Ensure nginx-configs directory exists:
```bash
ls nginx-configs/deploy-cecbs-nginx.sh
```

If missing, the nginx files should be in your project.

### "Let's Encrypt requires a domain name"
**Solution:** Either:
1. Provide a domain when prompted
2. Use self-signed certificate instead
3. Use IP-only (no SSL)

### Backend running but nginx fails
**Solution:** This is OK! Backend services are running.
Deploy nginx manually:
```bash
cd nginx-configs
sudo ./deploy-cecbs-nginx.sh --ip 10.3.15.7
```

## Tips

### For Development
- **Always choose option 1** (No nginx)
- Faster startup
- Easier debugging
- Direct access to services

### For Production
- **Choose option 2** with SSL
- Better security
- Unified access point
- Rate limiting protection

### For Testing Production Setup
- Start with option 3 (backend only)
- Test services work correctly
- Then add nginx separately

### For CI/CD
- Use `--no-interactive` flag
- Specify all options via command line
- Automate entire deployment

## Security Notes

### Development Mode (No Nginx)
- Services accessible only on localhost
- No rate limiting
- No SSL
- **Use only for development**

### Production Mode (With Nginx)
- Rate limiting enabled:
  - API: 100 requests/minute
  - Auth: 10 requests/minute
  - Uploads: 20 requests/minute
- SSL/TLS encryption (if enabled)
- Security headers
- Hidden file access blocked
- **Safe for production use**

## Performance

### Startup Times

**Development mode (no nginx):**
- ~115 seconds
- No additional overhead

**Production mode (with nginx):**
- ~115 seconds (backend)
- +30-60 seconds (nginx deployment)
- +2-5 minutes (Let's Encrypt SSL)
- **Total: 2-8 minutes depending on SSL**

### Resource Usage

**Without nginx:**
- 16 containers
- 3 node processes
- ~8GB RAM

**With nginx:**
- Same containers
- Same processes
- +nginx (minimal overhead, ~10-50MB RAM)

## Summary

| Mode | Interactive | Command | Access | Best For |
|------|-------------|---------|--------|----------|
| **Development** | Choice 1 | `./start-all.sh` | localhost | Local dev/test |
| **Production** | Choice 2 | `--with-nginx --nginx-ip=X` | IP/Domain | Server deployment |
| **Backend Only** | Choice 3 | Default | localhost | Gradual setup |

**Recommendation:**
- **Development:** Use interactive mode, choose option 1
- **Production:** Use command-line mode with all parameters for automation
- **First-time production:** Use interactive mode to understand the options

---

## Quick Reference

```bash
# Development (most common)
./start-all.sh
# → Press 1

# Production (automated)
./start-all.sh \
  --with-nginx \
  --nginx-ip=10.3.15.7 \
  --nginx-domain=coffee.cecbs.et \
  --nginx-ssl=letsencrypt \
  --no-interactive

# Backend only, add nginx later
./start-all.sh
# → Press 3
# Then later:
cd nginx-configs && sudo ./deploy-cecbs-nginx.sh --ip 10.3.15.7
```

---

**Created:** October 5, 2026  
**Version:** 1.0  
**Status:** ✅ Fully Implemented and Tested

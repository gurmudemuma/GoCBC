# CECBS Environment Configuration Guide
## Complete Setup for Development & Production (Server 10.3.15.7)

---

## 📋 Overview

This guide explains how to configure environment variables for CECBS across different environments:
- **Development** (localhost)
- **Production** (server 10.3.15.7)
- **Production with SSL** (after domain setup)

---

## 🏗️ Architecture Overview

```
Production Server 10.3.15.7:
┌──────────────────────────────────────────────┐
│ Nginx (80/443)                               │
│   ↓                                          │
│   ├─→ UI (3000) ← .env.production           │
│   ├─→ API (3001) ← .env.production          │
│   └─→ IPFS (5001, 8080)                     │
└──────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
cecbs/
├── ui/
│   ├── .env.local              # Development (git-ignored)
│   ├── .env.production         # Production (git-ignored)
│   ├── .env.example            # Template with all options
│   └── .env.production.example # Production template
│
├── api/
│   ├── .env                    # Development (git-ignored)
│   ├── .env.production         # Production (git-ignored)
│   ├── .env.example            # Template with all options
│   └── .env.production.example # Production template
│
└── nginx-configs/
    └── cecbs-production.conf   # Nginx configuration
```

---

## 🔧 Setup Instructions

### Step 1: Development Environment (Localhost)

#### UI Configuration
```bash
cd ui
cp .env.example .env.local
```

Edit `.env.local` - **no changes needed** for localhost:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3002
NEXT_PUBLIC_IPFS_GATEWAY=http://localhost:8080/ipfs/
```

#### API Configuration
```bash
cd api
cp .env.example .env
```

Edit `.env` - **no changes needed** for localhost:
```env
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001/api/v1
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### Start Development
```bash
# Terminal 1 - API
cd api
npm start

# Terminal 2 - UI
cd ui
npm run dev

# Terminal 3 - IPFS (if using)
ipfs daemon
```

---

### Step 2: Production Environment (Server 10.3.15.7 - HTTP)

#### UI Configuration
On the production server:
```bash
cd /path/to/cecbs/ui
cp .env.production.example .env.production
```

Edit `.env.production`:
```env
NEXT_PUBLIC_API_BASE_URL=http://10.3.15.7/api/v1
NEXT_PUBLIC_WS_URL=ws://10.3.15.7/socket.io
NEXT_PUBLIC_IPFS_GATEWAY=http://10.3.15.7/ipfs/
NEXT_PUBLIC_ALLOWED_ORIGINS=http://10.3.15.7

# Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_QR_CODE=true
NEXT_PUBLIC_ENABLE_IPFS=true

# App info
NEXT_PUBLIC_APP_NAME=CECBS
NEXT_PUBLIC_APP_VERSION=1.2.0
```

Build and start:
```bash
npm run build
npm start
```

#### API Configuration
On the production server:
```bash
cd /path/to/cecbs/api
cp .env.production.example .env.production
```

Edit `.env.production`:
```env
NODE_ENV=production
PORT=3001
API_BASE_URL=http://10.3.15.7/api/v1
ALLOWED_ORIGINS=http://10.3.15.7

# Security - IMPORTANT: Generate new secrets!
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
DOCUMENT_ENCRYPTION_KEY=$(openssl rand -hex 32)

# IPFS
USE_IPFS=true
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_GATEWAY=http://10.3.15.7/ipfs/

# Features
ENABLE_SWAGGER=false
ENABLE_WEBSOCKET=true
ENABLE_FILE_UPLOAD=true
```

Start API:
```bash
npm start
```

---

### Step 3: Production with SSL (After Domain Setup)

#### Prerequisites
- Domain name pointed to 10.3.15.7 (e.g., coffee.cecbs.et)
- SSL certificate installed via Let's Encrypt
- Nginx HTTPS server block uncommented

#### UI Configuration
Update `.env.production`:
```env
NEXT_PUBLIC_API_BASE_URL=https://coffee.cecbs.et/api/v1
NEXT_PUBLIC_WS_URL=wss://coffee.cecbs.et/socket.io
NEXT_PUBLIC_IPFS_GATEWAY=https://coffee.cecbs.et/ipfs/
NEXT_PUBLIC_ALLOWED_ORIGINS=https://coffee.cecbs.et
```

Rebuild:
```bash
npm run build
npm start
```

#### API Configuration
Update `.env.production`:
```env
API_BASE_URL=https://coffee.cecbs.et/api/v1
ALLOWED_ORIGINS=https://coffee.cecbs.et
IPFS_GATEWAY=https://coffee.cecbs.et/ipfs/
FORCE_HTTPS=true
```

Restart API:
```bash
npm start
```

---

## 🔐 Security: Generate Secrets

### For Production, Generate New Secrets

```bash
# JWT Secret (32 characters base64)
openssl rand -base64 32
# Example output: XvJ8zK2pQ9mN5rT7wE3uY6gH4jL1nA8c

# Session Secret (32 characters base64)
openssl rand -base64 32
# Example output: R4tY7uI0oP3sA6dF9gH2jK5lZ8xC1vB

# Document Encryption Key (64 characters hex)
openssl rand -hex 32
# Example output: a1b2c3d4e5f6...
```

**Add these to `api/.env.production`**:
```env
JWT_SECRET=XvJ8zK2pQ9mN5rT7wE3uY6gH4jL1nA8c
SESSION_SECRET=R4tY7uI0oP3sA6dF9gH2jK5lZ8xC1vB
DOCUMENT_ENCRYPTION_KEY=a1b2c3d4e5f6708192a3b4c5d6e7f8091a2b3c4d5e6f7081929384a5b6c7d8e9f
```

---

## 📋 Configuration Checklist

### Development Setup
- [ ] UI `.env.local` created
- [ ] API `.env` created
- [ ] IPFS daemon running (if using IPFS)
- [ ] UI accessible at http://localhost:3000
- [ ] API accessible at http://localhost:3001/api/v1/health
- [ ] Can log in to the system

### Production Setup (HTTP)
- [ ] UI `.env.production` created with 10.3.15.7 URLs
- [ ] API `.env.production` created with 10.3.15.7 URLs
- [ ] JWT_SECRET generated and set
- [ ] SESSION_SECRET generated and set
- [ ] DOCUMENT_ENCRYPTION_KEY generated and set
- [ ] Nginx configured and running
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] IPFS daemon running
- [ ] UI built: `npm run build`
- [ ] UI running: `npm start` (port 3000)
- [ ] API running: `npm start` (port 3001)
- [ ] Accessible at http://10.3.15.7
- [ ] API health check: http://10.3.15.7/api/v1/health
- [ ] Can log in via browser

### Production Setup (HTTPS)
- [ ] Domain DNS configured (coffee.cecbs.et → 10.3.15.7)
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Nginx HTTPS server block uncommented
- [ ] UI `.env.production` updated with HTTPS URLs
- [ ] API `.env.production` updated with HTTPS URLs
- [ ] UI rebuilt: `npm run build`
- [ ] Services restarted
- [ ] FORCE_HTTPS=true in API config
- [ ] Accessible at https://coffee.cecbs.et
- [ ] No certificate warnings in browser
- [ ] HTTP redirects to HTTPS

---

## 🔍 Environment Variables Reference

### UI (Next.js) Variables

| Variable | Development | Production (HTTP) | Production (HTTPS) |
|----------|-------------|-------------------|-------------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/api/v1` | `http://10.3.15.7/api/v1` | `https://coffee.cecbs.et/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3002` | `ws://10.3.15.7/socket.io` | `wss://coffee.cecbs.et/socket.io` |
| `NEXT_PUBLIC_IPFS_GATEWAY` | `http://localhost:8080/ipfs/` | `http://10.3.15.7/ipfs/` | `https://coffee.cecbs.et/ipfs/` |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | `http://localhost:3000,...` | `http://10.3.15.7` | `https://coffee.cecbs.et` |

### API (Node.js) Variables

| Variable | Development | Production (HTTP) | Production (HTTPS) |
|----------|-------------|-------------------|-------------------|
| `NODE_ENV` | `development` | `production` | `production` |
| `API_BASE_URL` | `http://localhost:3001/api/v1` | `http://10.3.15.7/api/v1` | `https://coffee.cecbs.et/api/v1` |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...` | `http://10.3.15.7` | `https://coffee.cecbs.et` |
| `FORCE_HTTPS` | `false` | `false` | `true` |
| `ENABLE_SWAGGER` | `true` | `false` | `false` |

---

## 🧪 Testing Environments

### Test Development Setup
```bash
# Check UI
curl http://localhost:3000/

# Check API
curl http://localhost:3001/api/v1/health

# Check IPFS
curl http://localhost:8080/ipfs/QmTest  # Will 404 but should connect
```

### Test Production Setup (HTTP)
```bash
# From server
curl http://localhost/health
curl http://localhost/api/v1/health

# From outside
curl http://10.3.15.7/health
curl http://10.3.15.7/api/v1/health

# In browser
http://10.3.15.7/
```

### Test Production Setup (HTTPS)
```bash
# From outside
curl https://coffee.cecbs.et/health
curl https://coffee.cecbs.et/api/v1/health

# In browser
https://coffee.cecbs.et/
```

---

## 🐛 Troubleshooting

### Problem: UI shows "Failed to fetch" errors
**Cause**: Incorrect API URL in environment variables

**Solution**:
```bash
# Check UI environment
cd ui
cat .env.production | grep API_BASE_URL

# Should show: NEXT_PUBLIC_API_BASE_URL=http://10.3.15.7/api/v1

# Rebuild if changed
npm run build
npm start
```

### Problem: API returns CORS errors
**Cause**: ALLOWED_ORIGINS doesn't include UI domain

**Solution**:
```bash
# Check API environment
cd api
cat .env.production | grep ALLOWED_ORIGINS

# Should include: ALLOWED_ORIGINS=http://10.3.15.7

# Restart if changed
npm start
```

### Problem: IPFS documents not loading
**Cause**: Incorrect IPFS gateway URL

**Solution**:
```bash
# Check UI environment
cat ui/.env.production | grep IPFS_GATEWAY

# Test IPFS gateway
curl http://10.3.15.7/ipfs/QmTest

# Check nginx config
sudo nginx -t
```

### Problem: WebSocket not connecting
**Cause**: Incorrect WebSocket URL

**Solution**:
```bash
# Check UI environment
cat ui/.env.production | grep WS_URL

# For HTTP: ws://10.3.15.7/socket.io
# For HTTPS: wss://coffee.cecbs.et/socket.io

# Check nginx WebSocket proxy
sudo tail -f /var/log/nginx/cecbs-error.log
```

---

## 📝 Quick Copy-Paste Configs

### For Production Server 10.3.15.7 (HTTP)

**UI `.env.production`**:
```env
NEXT_PUBLIC_API_BASE_URL=http://10.3.15.7/api/v1
NEXT_PUBLIC_WS_URL=ws://10.3.15.7/socket.io
NEXT_PUBLIC_IPFS_GATEWAY=http://10.3.15.7/ipfs/
NEXT_PUBLIC_ALLOWED_ORIGINS=http://10.3.15.7
NEXT_PUBLIC_APP_NAME=CECBS
NEXT_PUBLIC_APP_VERSION=1.2.0
NEXT_PUBLIC_ENABLE_IPFS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
```

**API `.env.production`**:
```env
NODE_ENV=production
PORT=3001
API_BASE_URL=http://10.3.15.7/api/v1
ALLOWED_ORIGINS=http://10.3.15.7
JWT_SECRET=GENERATE_WITH_OPENSSL_RAND_BASE64_32
SESSION_SECRET=GENERATE_WITH_OPENSSL_RAND_BASE64_32
DOCUMENT_ENCRYPTION_KEY=GENERATE_WITH_OPENSSL_RAND_HEX_32
USE_IPFS=true
IPFS_GATEWAY=http://10.3.15.7/ipfs/
ENABLE_SWAGGER=false
```

---

## 🚀 Deployment Workflow

### Initial Production Deployment

```bash
# 1. Copy files to server
scp -r ui api root@10.3.15.7:/opt/cecbs/

# 2. SSH to server
ssh root@10.3.15.7

# 3. Create production environment files
cd /opt/cecbs/ui
cp .env.production.example .env.production
nano .env.production  # Update URLs

cd /opt/cecbs/api
cp .env.production.example .env.production
nano .env.production  # Update URLs and generate secrets

# 4. Build UI
cd /opt/cecbs/ui
npm ci
npm run build

# 5. Start services
npm start &  # UI on port 3000

cd /opt/cecbs/api
npm ci
npm start &  # API on port 3001

# 6. Start IPFS
ipfs daemon &

# 7. Deploy nginx
cd /opt/cecbs/nginx-configs
./deploy-cecbs-nginx.sh --ip 10.3.15.7

# 8. Test
curl http://10.3.15.7/health
```

### Update Production Config

```bash
# 1. SSH to server
ssh root@10.3.15.7

# 2. Update environment file
cd /opt/cecbs/ui
nano .env.production

# 3. Rebuild (if UI config changed)
npm run build

# 4. Restart services
pkill -f "node.*ui"
pkill -f "node.*api"

cd /opt/cecbs/ui && npm start &
cd /opt/cecbs/api && npm start &

# 5. Reload nginx (if needed)
sudo systemctl reload nginx
```

---

## 📚 Additional Resources

- **Nginx Configuration**: See `nginx-configs/CECBS-NGINX-DEPLOYMENT.md`
- **API Documentation**: Access at `http://10.3.15.7/api/v1/docs` (if Swagger enabled)
- **IPFS WebUI**: Access at `http://10.3.15.7/webui` (internal network only)

---

**Last Updated**: 2026-07-07  
**Server IP**: 10.3.15.7  
**Version**: 1.0

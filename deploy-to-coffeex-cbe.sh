#!/bin/bash
# ============================================================
# CECBS Quick Deployment Script
# Domain: coffeex.cbe.com.et (Server: 10.3.15.7)
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="10.3.15.7"
DOMAIN="coffeex.cbe.com.et"
SERVER_USER="root"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  CECBS Deployment to coffeex.cbe.com.et${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${GREEN}Target Server:${NC} $SERVER_IP"
echo -e "${GREEN}Domain:${NC} $DOMAIN"
echo -e "${GREEN}User:${NC} $SERVER_USER"
echo ""

# Check if we can reach the server
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to server via SSH${NC}"
    echo "Please ensure:"
    echo "1. Server is accessible at $SERVER_IP"
    echo "2. SSH key is configured or password authentication is enabled"
    echo "3. User '$SERVER_USER' exists on the server"
    exit 1
fi

# Check DNS resolution
echo -e "${YELLOW}Testing DNS resolution...${NC}"
if nslookup $DOMAIN | grep -q $SERVER_IP; then
    echo -e "${GREEN}✓ DNS correctly points $DOMAIN to $SERVER_IP${NC}"
else
    echo -e "${YELLOW}⚠ DNS may not be configured yet${NC}"
    echo "Please ensure DNS A record: $DOMAIN → $SERVER_IP"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# Step 1: Copy files to server
echo -e "${YELLOW}[1/5] Copying files to server...${NC}"

# Create deployment package
echo "Creating deployment package..."
tar -czf cecbs-deploy.tar.gz ui api nginx-configs \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.next \
    --exclude=logs \
    --exclude=uploads \
    --exclude=.env \
    --exclude=.env.local \
    --exclude=.env.production

# Copy to server
echo "Uploading to server..."
scp cecbs-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Extract on server
echo "Extracting on server..."
ssh $SERVER_USER@$SERVER_IP "
    mkdir -p /opt/cecbs
    cd /tmp && tar -xzf cecbs-deploy.tar.gz
    cp -r ui api nginx-configs /opt/cecbs/
    rm -f cecbs-deploy.tar.gz
    echo 'Files copied successfully'
"

# Clean up local package
rm cecbs-deploy.tar.gz

echo -e "${GREEN}✓ Files copied to server${NC}"
echo ""

# Step 2: Setup environment on server
echo -e "${YELLOW}[2/5] Configuring environment on server...${NC}"

ssh $SERVER_USER@$SERVER_IP "
# Update system
apt update >/dev/null 2>&1

# Install Node.js if not present
if ! command -v node >/dev/null 2>&1; then
    echo 'Installing Node.js...'
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >/dev/null 2>&1
    apt install -y nodejs >/dev/null 2>&1
fi

# Install IPFS if not present
if ! command -v ipfs >/dev/null 2>&1; then
    echo 'Installing IPFS...'
    cd /tmp
    wget -q https://dist.ipfs.tech/kubo/v0.31.0/kubo_v0.31.0_linux-amd64.tar.gz
    tar -xzf kubo_v0.31.0_linux-amd64.tar.gz >/dev/null 2>&1
    cd kubo && bash install.sh >/dev/null 2>&1
    cd .. && rm -rf kubo kubo_v0.31.0_linux-amd64.tar.gz
fi

# Verify installations
echo \"Node.js: \$(node --version)\"
echo \"NPM: \$(npm --version)\"
echo \"IPFS: \$(ipfs --version 2>/dev/null || echo 'not found')\"
"

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Step 3: Create production environment files
echo -e "${YELLOW}[3/5] Creating production configuration...${NC}"

ssh $SERVER_USER@$SERVER_IP "
# Generate secure secrets
JWT_SECRET=\$(openssl rand -base64 32)
SESSION_SECRET=\$(openssl rand -base64 32)
DOC_KEY=\$(openssl rand -hex 32)

# Create UI production config
cat > /opt/cecbs/ui/.env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://$DOMAIN/api/v1
NEXT_PUBLIC_WS_URL=wss://$DOMAIN/socket.io
NEXT_PUBLIC_IPFS_GATEWAY=https://$DOMAIN/ipfs/
NEXT_PUBLIC_ALLOWED_ORIGINS=https://$DOMAIN
NEXT_PUBLIC_APP_NAME=CoffeeX CECBS
NEXT_PUBLIC_APP_VERSION=1.2.0
NEXT_PUBLIC_ENABLE_IPFS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_DEFAULT_ORG=ECTA
NEXT_PUBLIC_SUPPORTED_ORGS=ECTA,ECX,NBE,BANKS,CUSTOMS,SHIPPING
NEXT_PUBLIC_SESSION_TIMEOUT=60
NEXT_PUBLIC_DEFAULT_THEME=light
NEXT_PUBLIC_MAX_FILE_SIZE=50
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=coffeechannel
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_TIMEZONE=Africa/Addis_Ababa
EOF

# Create API production config
cat > /opt/cecbs/api/.env.production << EOF
NODE_ENV=production
PORT=3001
API_BASE_URL=https://$DOMAIN/api/v1
ALLOWED_ORIGINS=https://$DOMAIN
JWT_SECRET=\$JWT_SECRET
SESSION_SECRET=\$SESSION_SECRET
DOCUMENT_ENCRYPTION_KEY=\$DOC_KEY
JWT_EXPIRY=24h
BCRYPT_ROUNDS=12
FABRIC_ENABLED=true
FABRIC_REQUIRED=false
FABRIC_AS_LOCALHOST=true
FABRIC_WALLET_PATH=./wallet
FABRIC_CCP_PATH=../blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json
FABRIC_CHANNEL_NAME=coffeechannel
FABRIC_CHAINCODE_NAME=coffee
FABRIC_MSP_ID=ECTAMSP
DATABASE_PATH=./cecbs_production.db
LOG_LEVEL=warn
LOG_DIR=./logs
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
WS_PORT=3002
ENABLE_WEBSOCKET=true
RATE_LIMIT_MAX_REQUESTS=500
ENABLE_HELMET=true
FORCE_HTTPS=true
ENABLE_SWAGGER=false
ENABLE_FILE_UPLOAD=true
USE_IPFS=true
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_GATEWAY=https://$DOMAIN/ipfs/
AUTO_BACKUP_ENABLED=true
BACKUP_DIR=./backups
DEFAULT_LOCALE=en
TIMEZONE=Africa/Addis_Ababa
EOF

# Save secrets securely
cat > /root/cecbs-secrets.txt << EOF
=== CECBS Production Secrets ===
Generated: \$(date)
Domain: $DOMAIN
Server: $SERVER_IP

JWT_SECRET=\$JWT_SECRET
SESSION_SECRET=\$SESSION_SECRET
DOCUMENT_ENCRYPTION_KEY=\$DOC_KEY
EOF

chmod 600 /root/cecbs-secrets.txt

echo 'Production configuration created'
echo 'Secrets saved to /root/cecbs-secrets.txt'
"

echo -e "${GREEN}✓ Production configuration created${NC}"
echo ""

# Step 4: Build and start services
echo -e "${YELLOW}[4/5] Building and starting services...${NC}"

ssh $SERVER_USER@$SERVER_IP "
# Create required directories
mkdir -p /opt/cecbs/api/logs /opt/cecbs/api/uploads /opt/cecbs/api/backups

# Initialize IPFS if needed
if [ ! -d ~/.ipfs ]; then
    echo 'Initializing IPFS...'
    ipfs init >/dev/null 2>&1
fi

# Configure IPFS
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001 >/dev/null 2>&1
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080 >/dev/null 2>&1

# Stop existing services
pkill -f 'node.*ui' 2>/dev/null || true
pkill -f 'node.*api' 2>/dev/null || true
pkill -f 'ipfs daemon' 2>/dev/null || true

# Start IPFS
echo 'Starting IPFS...'
nohup ipfs daemon >/var/log/ipfs.log 2>&1 &
sleep 5

# Install and start API
echo 'Building API...'
cd /opt/cecbs/api
npm ci --production --silent
nohup npm start >/var/log/cecbs-api.log 2>&1 &
sleep 10

# Install and start UI
echo 'Building UI...'
cd /opt/cecbs/ui
npm ci --production --silent
npm run build --silent
nohup npm start >/var/log/cecbs-ui.log 2>&1 &
sleep 15

echo 'Services started successfully'
"

echo -e "${GREEN}✓ Services built and started${NC}"
echo ""

# Step 5: Deploy Nginx with SSL
echo -e "${YELLOW}[5/5] Deploying Nginx with SSL...${NC}"

ssh $SERVER_USER@$SERVER_IP "
cd /opt/cecbs/nginx-configs
chmod +x deploy-cecbs-nginx.sh
./deploy-cecbs-nginx.sh --ip $SERVER_IP --domain $DOMAIN --ssl letsencrypt
"

echo -e "${GREEN}✓ Nginx deployed with SSL${NC}"
echo ""

# Final verification
echo -e "${YELLOW}Verifying deployment...${NC}"

# Wait a moment for services to fully start
sleep 10

# Test endpoints
echo -n "Testing HTTPS frontend: "
if curl -s --max-time 10 https://$DOMAIN/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo -n "Testing HTTPS API: "
if curl -s --max-time 10 https://$DOMAIN/api/v1/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo ""

# Success message
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Deployment Complete! 🎉${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${BLUE}Your CECBS system is now available at:${NC}"
echo -e "  🌐 ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo "  Frontend: https://$DOMAIN/"
echo "  API: https://$DOMAIN/api/v1/"
echo "  Health: https://$DOMAIN/health"
echo "  IPFS: https://$DOMAIN/ipfs/<CID>"
echo ""
echo -e "${BLUE}Management Commands (on server):${NC}"
echo "  Service Status: /root/cecbs-status.sh"
echo "  Restart Services: /root/restart-cecbs.sh"
echo "  View Secrets: cat /root/cecbs-secrets.txt"
echo "  View Logs: tail -f /var/log/nginx/cecbs-error.log"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open https://$DOMAIN in your browser"
echo "  2. Verify SSL certificate is valid"
echo "  3. Test login functionality"
echo "  4. Test file upload and IPFS integration"
echo "  5. Configure monitoring and backups"
echo ""
echo -e "${GREEN}Deployment successful! ✅${NC}"

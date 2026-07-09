#!/bin/bash
# ============================================================
# CECBS Nginx Deployment Script
# Automated deployment for Coffee Export Blockchain System
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SERVER_IP=""
DOMAIN=""
SSL_TYPE="none"
INSTALL_NGINX=true

# Script usage
usage() {
    echo "Usage: $0 --ip <server_ip> [OPTIONS]"
    echo ""
    echo "Required:"
    echo "  --ip <ip>           Server IP address (e.g., 10.3.45.67)"
    echo ""
    echo "Optional:"
    echo "  --domain <domain>   Domain name (e.g., coffee.example.com)"
    echo "  --ssl <type>        SSL type: none|selfsigned|letsencrypt (default: none)"
    echo "  --skip-install      Skip nginx installation (if already installed)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --ip 10.3.15.7"
    echo "  $0 --ip 10.3.15.7 --domain coffeex.cbe.com.et --ssl letsencrypt"
    echo "  $0 --ip 10.3.15.7 --ssl selfsigned"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ip)
            SERVER_IP="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --ssl)
            SSL_TYPE="$2"
            shift 2
            ;;
        --skip-install)
            INSTALL_NGINX=false
            shift
            ;;
        --help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Validate required parameters
if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}Error: Server IP is required${NC}"
    usage
fi

# Set server name
if [ -z "$DOMAIN" ]; then
    SERVER_NAME="$SERVER_IP"
else
    SERVER_NAME="$DOMAIN $SERVER_IP"
fi

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  CECBS Nginx Deployment${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo "  Server IP: $SERVER_IP"
echo "  Server Name: $SERVER_NAME"
echo "  SSL Type: $SSL_TYPE"
echo "  Install Nginx: $INSTALL_NGINX"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root or with sudo${NC}"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo -e "${RED}Error: Cannot detect OS${NC}"
    exit 1
fi

echo -e "${GREEN}Detected OS: $OS $VERSION${NC}"
echo ""

# ============================================================
# Step 1: Install Nginx
# ============================================================

if [ "$INSTALL_NGINX" = true ]; then
    echo -e "${YELLOW}[1/6] Installing Nginx...${NC}"
    
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        apt update
        apt install -y nginx
        NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
        NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
        CONFIG_FILE="$NGINX_SITES_AVAILABLE/cecbs"
    elif [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rocky" ]]; then
        yum install -y epel-release
        yum install -y nginx
        CONFIG_FILE="/etc/nginx/conf.d/cecbs.conf"
    else
        echo -e "${RED}Unsupported OS: $OS${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Nginx installed${NC}"
else
    echo -e "${YELLOW}[1/6] Skipping Nginx installation...${NC}"
    
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
        NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
        CONFIG_FILE="$NGINX_SITES_AVAILABLE/cecbs"
    else
        CONFIG_FILE="/etc/nginx/conf.d/cecbs.conf"
    fi
fi

echo ""

# ============================================================
# Step 2: Deploy Configuration
# ============================================================

echo -e "${YELLOW}[2/6] Deploying Nginx configuration...${NC}"

# Copy configuration file
cp cecbs-production.conf "$CONFIG_FILE"

# Replace placeholders
sed -i "s/SERVER_NAME_PLACEHOLDER/$SERVER_NAME/g" "$CONFIG_FILE"

# For Ubuntu/Debian, create symlink
if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    ln -sf "$CONFIG_FILE" "$NGINX_SITES_ENABLED/cecbs"
    # Remove default site
    rm -f "$NGINX_SITES_ENABLED/default"
fi

echo -e "${GREEN}✓ Configuration deployed${NC}"
echo ""

# ============================================================
# Step 3: Create SSL Certificates (if requested)
# ============================================================

echo -e "${YELLOW}[3/6] Setting up SSL...${NC}"

if [ "$SSL_TYPE" == "selfsigned" ]; then
    echo "Creating self-signed SSL certificate..."
    
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/cecbs.key \
        -out /etc/nginx/ssl/cecbs.crt \
        -subj "/C=ET/ST=Addis Ababa/L=Addis Ababa/O=CECBS/CN=$SERVER_NAME"
    
    chmod 600 /etc/nginx/ssl/cecbs.key
    chmod 644 /etc/nginx/ssl/cecbs.crt
    
    echo -e "${GREEN}✓ Self-signed certificate created${NC}"
    echo -e "${YELLOW}Note: Browsers will show security warnings for self-signed certificates${NC}"
    
elif [ "$SSL_TYPE" == "letsencrypt" ]; then
    if [ -z "$DOMAIN" ]; then
        echo -e "${RED}Error: Domain name is required for Let's Encrypt${NC}"
        exit 1
    fi
    
    echo "Installing Certbot..."
    
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        apt install -y certbot python3-certbot-nginx
    else
        yum install -y certbot python3-certbot-nginx
    fi
    
    # Create webroot directory
    mkdir -p /var/www/certbot
    
    echo "Obtaining Let's Encrypt certificate..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN
    
    echo -e "${GREEN}✓ Let's Encrypt certificate obtained${NC}"
    
else
    echo -e "${GREEN}✓ SSL not configured (HTTP only)${NC}"
fi

echo ""

# ============================================================
# Step 4: Configure Firewall
# ============================================================

echo -e "${YELLOW}[4/6] Configuring firewall...${NC}"

if command -v ufw &> /dev/null; then
    echo "Configuring UFW firewall..."
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    echo "y" | ufw enable
    ufw status
    echo -e "${GREEN}✓ UFW configured${NC}"
    
elif command -v firewall-cmd &> /dev/null; then
    echo "Configuring firewalld..."
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
    firewall-cmd --list-all
    echo -e "${GREEN}✓ Firewalld configured${NC}"
    
else
    echo -e "${YELLOW}No firewall detected. Please configure manually:${NC}"
    echo "  - Allow port 22 (SSH)"
    echo "  - Allow port 80 (HTTP)"
    echo "  - Allow port 443 (HTTPS)"
fi

echo ""

# ============================================================
# Step 5: Test Configuration
# ============================================================

echo -e "${YELLOW}[5/6] Testing Nginx configuration...${NC}"

nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Configuration test passed${NC}"
else
    echo -e "${RED}✗ Configuration test failed${NC}"
    exit 1
fi

echo ""

# ============================================================
# Step 6: Start Nginx
# ============================================================

echo -e "${YELLOW}[6/6] Starting Nginx...${NC}"

systemctl enable nginx
systemctl restart nginx

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx failed to start${NC}"
    echo "Check logs: journalctl -u nginx -n 50"
    exit 1
fi

echo ""

# ============================================================
# Deployment Complete
# ============================================================

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${BLUE}Access your CECBS system at:${NC}"

if [ "$SSL_TYPE" != "none" ]; then
    echo -e "  🌐 ${GREEN}https://$SERVER_NAME${NC}"
else
    echo -e "  🌐 ${GREEN}http://$SERVER_NAME${NC}"
fi

echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo "  Frontend: http://$SERVER_NAME/"
echo "  API: http://$SERVER_NAME/api/v1/"
echo "  Health: http://$SERVER_NAME/health"
echo "  IPFS Gateway: http://$SERVER_NAME/ipfs/<CID>"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Ensure your backend services are running:"
echo "     - UI on port 3000"
echo "     - API on port 3001"
echo "     - IPFS on ports 5001 (API) and 8080 (Gateway)"
echo ""
echo "  2. Test the deployment:"
echo "     curl http://$SERVER_NAME/health"
echo "     curl http://$SERVER_NAME/api/v1/health"
echo ""
echo "  3. Check Nginx logs:"
echo "     tail -f /var/log/nginx/cecbs-access.log"
echo "     tail -f /var/log/nginx/cecbs-error.log"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  Restart Nginx: systemctl restart nginx"
echo "  Reload config: systemctl reload nginx"
echo "  Test config: nginx -t"
echo "  View logs: journalctl -u nginx -f"
echo ""

if [ "$SSL_TYPE" == "letsencrypt" ]; then
    echo -e "${YELLOW}SSL Certificate Auto-Renewal:${NC}"
    echo "  Let's Encrypt certificates will auto-renew"
    echo "  Test renewal: certbot renew --dry-run"
    echo ""
fi

echo -e "${GREEN}Deployment successful! 🎉${NC}"

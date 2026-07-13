#!/bin/bash
# ============================================================
# CECBS Pre-Deployment Preparation Script
# Handles all pre-deployment checklist items
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="10.3.15.7"
DOMAIN="coffeex.cbe.com.et"
SERVER_USER="root"
SECRETS_FILE="production-secrets.txt"

# Print header
print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

# Print step
print_step() {
    echo -e "${CYAN}${BOLD}[$1]${NC} $2"
}

# Print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Print info
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Ask yes/no question
ask_yes_no() {
    while true; do
        read -p "$1 (y/n): " -n 1 -r
        echo
        case $REPLY in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer y or n.";;
        esac
    done
}

# Display menu
show_menu() {
    clear
    print_header "CECBS Pre-Deployment Preparation"
    echo -e "${BOLD}Target Server:${NC} $SERVER_IP"
    echo -e "${BOLD}Domain:${NC} $DOMAIN"
    echo ""
    echo "Select an option:"
    echo ""
    echo "  ${CYAN}1${NC}) Check DNS Configuration"
    echo "  ${CYAN}2${NC}) Generate Production Secrets"
    echo "  ${CYAN}3${NC}) Check/Prepare Server"
    echo "  ${CYAN}4${NC}) Configure Firewall"
    echo "  ${CYAN}5${NC}) Run Full Pre-Deployment Check"
    echo "  ${CYAN}6${NC}) Deploy to Production (runs deploy-to-coffeex-cbe.sh)"
    echo ""
    echo "  ${CYAN}7${NC}) View Generated Secrets"
    echo "  ${CYAN}8${NC}) Settings (change IP/Domain)"
    echo ""
    echo "  ${CYAN}0${NC}) Exit"
    echo ""
    echo -e "${YELLOW}Tip: Run option 5 first to check everything, then option 6 to deploy${NC}"
    echo ""
}

# Check DNS configuration
check_dns() {
    print_header "Step 1: DNS Configuration Check"
    
    print_step "1/2" "Checking if domain resolves..."
    
    if command -v nslookup >/dev/null 2>&1; then
        DNS_RESULT=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
        
        if [ "$DNS_RESULT" == "$SERVER_IP" ]; then
            print_success "DNS correctly configured: $DOMAIN → $SERVER_IP"
            return 0
        else
            print_warning "DNS does not point to correct IP"
            print_info "Expected: $SERVER_IP"
            print_info "Current: $DNS_RESULT (or not configured)"
            echo ""
            echo "To configure DNS, add this A record in your DNS provider:"
            echo "  Name: coffeex.cbe.com.et"
            echo "  Type: A"
            echo "  Value: $SERVER_IP"
            echo "  TTL: 3600 (or default)"
            echo ""
            print_warning "DNS propagation can take 5 minutes to 48 hours"
            return 1
        fi
    else
        print_warning "nslookup not found, cannot verify DNS"
        print_info "Install: sudo apt install dnsutils (Ubuntu) or bind-utils (RHEL)"
        return 1
    fi
}

# Generate production secrets
generate_secrets() {
    print_header "Step 2: Generate Production Secrets"
    
    if [ -f "$SECRETS_FILE" ]; then
        print_warning "Secrets file already exists: $SECRETS_FILE"
        if ask_yes_no "Do you want to regenerate secrets? (This will overwrite existing)"; then
            rm -f "$SECRETS_FILE"
        else
            print_info "Using existing secrets"
            return 0
        fi
    fi
    
    print_step "1/4" "Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)
    print_success "JWT secret generated"
    
    print_step "2/4" "Generating session secret..."
    SESSION_SECRET=$(openssl rand -base64 32)
    print_success "Session secret generated"
    
    print_step "3/4" "Generating document encryption key..."
    DOCUMENT_ENCRYPTION_KEY=$(openssl rand -hex 32)
    print_success "Document encryption key generated"
    
    print_step "4/4" "Generating database password..."
    DB_PASSWORD=$(openssl rand -base64 24)
    print_success "Database password generated"
    
    # Save to file
    cat > "$SECRETS_FILE" << EOF
# ============================================================
# CECBS Production Secrets
# Generated: $(date)
# Target Server: $SERVER_IP
# Domain: $DOMAIN
# ============================================================
# 
# IMPORTANT: 
# - Keep this file secure and private
# - Do NOT commit to git
# - Store in secure password manager
# - Share only via secure channels
#
# ============================================================

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=24h

# Session Configuration
SESSION_SECRET=$SESSION_SECRET

# Document Encryption
DOCUMENT_ENCRYPTION_KEY=$DOCUMENT_ENCRYPTION_KEY

# Database Password (if using PostgreSQL)
DB_PASSWORD=$DB_PASSWORD

# Redis Password (if using Redis)
REDIS_PASSWORD=$(openssl rand -base64 24)

# ============================================================
# API Environment Variables (.env.production)
# ============================================================

NODE_ENV=production
PORT=3001
API_BASE_URL=https://$DOMAIN/api/v1
ALLOWED_ORIGINS=https://$DOMAIN

JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=24h
SESSION_SECRET=$SESSION_SECRET
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

USE_IPFS=true
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_GATEWAY=https://$DOMAIN/ipfs/
DOCUMENT_ENCRYPTION_KEY=$DOCUMENT_ENCRYPTION_KEY

AUTO_BACKUP_ENABLED=true
BACKUP_DIR=./backups
DEFAULT_LOCALE=en
TIMEZONE=Africa/Addis_Ababa

# ============================================================
# UI Environment Variables (.env.production)
# ============================================================

# Copy these to ui/.env.production
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

# ============================================================
# Quick Copy Commands
# ============================================================

# To copy to server:
# scp $SECRETS_FILE $SERVER_USER@$SERVER_IP:/root/cecbs-secrets.txt
# ssh $SERVER_USER@$SERVER_IP "chmod 600 /root/cecbs-secrets.txt"

EOF

    chmod 600 "$SECRETS_FILE"
    
    echo ""
    print_success "Production secrets generated and saved to: $SECRETS_FILE"
    print_warning "Keep this file secure! Do NOT commit to git."
    echo ""
    print_info "File permissions set to 600 (owner read/write only)"
    
    if ask_yes_no "Do you want to view the secrets now?"; then
        echo ""
        cat "$SECRETS_FILE"
        echo ""
    fi
}

# Check server preparation
check_server() {
    print_header "Step 3: Server Preparation Check"
    
    print_step "1/8" "Testing SSH connection..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_IP "echo 'SSH OK'" 2>/dev/null; then
        print_success "SSH connection successful"
    else
        print_error "Cannot connect to server via SSH"
        echo ""
        print_info "Possible issues:"
        echo "  1. Server not accessible at $SERVER_IP"
        echo "  2. SSH key not configured"
        echo "  3. User '$SERVER_USER' does not exist"
        echo ""
        print_info "To fix:"
        echo "  • Check server is online and accessible"
        echo "  • Configure SSH key: ssh-copy-id $SERVER_USER@$SERVER_IP"
        echo "  • Or use password authentication"
        return 1
    fi
    
    print_step "2/8" "Checking Docker..."
    if ssh $SERVER_USER@$SERVER_IP "command -v docker" >/dev/null 2>&1; then
        DOCKER_VERSION=$(ssh $SERVER_USER@$SERVER_IP "docker --version" 2>/dev/null)
        print_success "Docker installed: $DOCKER_VERSION"
    else
        print_warning "Docker not installed"
        print_info "Install: curl -fsSL https://get.docker.com | sudo sh"
    fi
    
    print_step "3/8" "Checking Docker Compose..."
    if ssh $SERVER_USER@$SERVER_IP "command -v docker-compose" >/dev/null 2>&1; then
        COMPOSE_VERSION=$(ssh $SERVER_USER@$SERVER_IP "docker-compose --version" 2>/dev/null)
        print_success "Docker Compose installed: $COMPOSE_VERSION"
    else
        print_warning "Docker Compose not installed"
        print_info "Install: sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
    fi
    
    print_step "4/8" "Checking Node.js..."
    if ssh $SERVER_USER@$SERVER_IP "command -v node" >/dev/null 2>&1; then
        NODE_VERSION=$(ssh $SERVER_USER@$SERVER_IP "node --version" 2>/dev/null)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_warning "Node.js not installed"
        print_info "Install: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash - && sudo apt install -y nodejs"
    fi
    
    print_step "5/8" "Checking Nginx..."
    if ssh $SERVER_USER@$SERVER_IP "command -v nginx" >/dev/null 2>&1; then
        NGINX_VERSION=$(ssh $SERVER_USER@$SERVER_IP "nginx -v" 2>&1)
        print_success "Nginx installed: $NGINX_VERSION"
    else
        print_warning "Nginx not installed"
        print_info "Install: sudo apt install -y nginx"
    fi
    
    print_step "6/8" "Checking IPFS..."
    if ssh $SERVER_USER@$SERVER_IP "command -v ipfs" >/dev/null 2>&1; then
        IPFS_VERSION=$(ssh $SERVER_USER@$SERVER_IP "ipfs --version" 2>/dev/null)
        print_success "IPFS installed: $IPFS_VERSION"
    else
        print_warning "IPFS not installed"
        print_info "Install: wget https://dist.ipfs.tech/kubo/v0.31.0/kubo_v0.31.0_linux-amd64.tar.gz && tar -xzf kubo_v0.31.0_linux-amd64.tar.gz && cd kubo && sudo bash install.sh"
    fi
    
    print_step "7/8" "Checking server resources..."
    SERVER_INFO=$(ssh $SERVER_USER@$SERVER_IP "echo 'CPU Cores:' \$(nproc); echo 'RAM:' \$(free -h | awk '/^Mem/ {print \$2}'); echo 'Disk:' \$(df -h / | awk 'NR==2 {print \$4\" available\"}')" 2>/dev/null)
    if [ $? -eq 0 ]; then
        print_success "Server resources:"
        echo "$SERVER_INFO" | while read line; do echo "    $line"; done
    else
        print_warning "Could not check server resources"
    fi
    
    print_step "8/8" "Checking open ports..."
    OPEN_PORTS=$(ssh $SERVER_USER@$SERVER_IP "netstat -tuln 2>/dev/null | grep LISTEN | awk '{print \$4}' | grep -E ':(80|443|3000|3001|5001|8080)$' || echo 'netstat not available'" 2>/dev/null)
    if echo "$OPEN_PORTS" | grep -q "netstat not available"; then
        print_warning "Cannot check open ports (netstat not installed)"
    else
        print_info "Currently listening ports (80, 443, 3000, 3001, 5001, 8080):"
        echo "$OPEN_PORTS" | while read line; do echo "    $line"; done
    fi
    
    echo ""
}

# Configure firewall
configure_firewall() {
    print_header "Step 4: Firewall Configuration"
    
    print_step "1/3" "Checking firewall status..."
    
    # Check which firewall is available
    if ssh $SERVER_USER@$SERVER_IP "command -v ufw" >/dev/null 2>&1; then
        FIREWALL="ufw"
        print_info "Detected firewall: UFW (Ubuntu/Debian)"
    elif ssh $SERVER_USER@$SERVER_IP "command -v firewall-cmd" >/dev/null 2>&1; then
        FIREWALL="firewalld"
        print_info "Detected firewall: firewalld (RHEL/CentOS)"
    else
        print_warning "No supported firewall detected (UFW or firewalld)"
        print_info "Consider installing: sudo apt install ufw (Ubuntu) or sudo yum install firewalld (RHEL)"
        return 1
    fi
    
    print_step "2/3" "Current firewall rules:"
    if [ "$FIREWALL" == "ufw" ]; then
        ssh $SERVER_USER@$SERVER_IP "sudo ufw status" 2>/dev/null || print_warning "Could not check UFW status"
    else
        ssh $SERVER_USER@$SERVER_IP "sudo firewall-cmd --list-all" 2>/dev/null || print_warning "Could not check firewalld status"
    fi
    
    echo ""
    print_step "3/3" "Required ports:"
    echo "  • Port 22 (SSH) - for remote access"
    echo "  • Port 80 (HTTP) - for Let's Encrypt validation"
    echo "  • Port 443 (HTTPS) - for production access"
    echo ""
    
    if ask_yes_no "Do you want to configure firewall now?"; then
        echo ""
        print_info "Configuring firewall..."
        
        if [ "$FIREWALL" == "ufw" ]; then
            ssh $SERVER_USER@$SERVER_IP "
                sudo ufw allow 22/tcp comment 'SSH' &&
                sudo ufw allow 80/tcp comment 'HTTP' &&
                sudo ufw allow 443/tcp comment 'HTTPS' &&
                echo 'y' | sudo ufw enable &&
                sudo ufw status
            "
        else
            ssh $SERVER_USER@$SERVER_IP "
                sudo firewall-cmd --permanent --add-service=ssh &&
                sudo firewall-cmd --permanent --add-service=http &&
                sudo firewall-cmd --permanent --add-service=https &&
                sudo firewall-cmd --reload &&
                sudo firewall-cmd --list-all
            "
        fi
        
        if [ $? -eq 0 ]; then
            print_success "Firewall configured successfully"
        else
            print_error "Firewall configuration failed"
            return 1
        fi
    else
        print_info "Skipping firewall configuration"
        print_warning "Remember to configure firewall manually before going to production"
    fi
}

# Run full pre-deployment check
full_check() {
    print_header "Full Pre-Deployment Check"
    
    CHECKS_PASSED=0
    CHECKS_FAILED=0
    
    # DNS Check
    echo ""
    if check_dns; then
        ((CHECKS_PASSED++))
    else
        ((CHECKS_FAILED++))
    fi
    
    echo ""
    read -p "Press Enter to continue..."
    
    # Secrets Check
    echo ""
    print_header "Step 2: Production Secrets"
    if [ -f "$SECRETS_FILE" ]; then
        print_success "Production secrets file exists: $SECRETS_FILE"
        ((CHECKS_PASSED++))
    else
        print_warning "Production secrets not generated"
        if ask_yes_no "Do you want to generate secrets now?"; then
            generate_secrets
            if [ $? -eq 0 ]; then
                ((CHECKS_PASSED++))
            else
                ((CHECKS_FAILED++))
            fi
        else
            ((CHECKS_FAILED++))
        fi
    fi
    
    echo ""
    read -p "Press Enter to continue..."
    
    # Server Check
    echo ""
    if check_server; then
        ((CHECKS_PASSED++))
    else
        ((CHECKS_FAILED++))
    fi
    
    echo ""
    read -p "Press Enter to continue..."
    
    # Firewall Check
    echo ""
    configure_firewall
    if [ $? -eq 0 ]; then
        ((CHECKS_PASSED++))
    else
        ((CHECKS_FAILED++))
    fi
    
    # Summary
    echo ""
    print_header "Pre-Deployment Check Summary"
    echo ""
    print_info "Checks Passed: $CHECKS_PASSED"
    print_info "Checks Failed: $CHECKS_FAILED"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        print_success "All checks passed! System is ready for deployment."
        echo ""
        print_info "Next step: Run option 6 to deploy to production"
        echo "           or run: bash deploy-to-coffeex-cbe.sh"
    else
        print_warning "Some checks failed. Please resolve issues before deployment."
        echo ""
        print_info "Review the output above and fix any issues, then run this check again."
    fi
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Deploy to production
deploy_production() {
    print_header "Deploy to Production"
    
    if [ ! -f "deploy-to-coffeex-cbe.sh" ]; then
        print_error "Deployment script not found: deploy-to-coffeex-cbe.sh"
        print_info "Make sure you're running this from the project root directory"
        read -p "Press Enter to continue..."
        return 1
    fi
    
    print_warning "This will deploy CECBS to production server"
    echo ""
    print_info "Target: $SERVER_IP ($DOMAIN)"
    print_info "Script: deploy-to-coffeex-cbe.sh"
    echo ""
    
    if ask_yes_no "Are you ready to deploy to production?"; then
        echo ""
        print_info "Starting deployment..."
        echo ""
        bash deploy-to-coffeex-cbe.sh
    else
        print_info "Deployment cancelled"
    fi
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# View generated secrets
view_secrets() {
    print_header "View Generated Secrets"
    
    if [ ! -f "$SECRETS_FILE" ]; then
        print_error "Secrets file not found: $SECRETS_FILE"
        print_info "Run option 2 to generate secrets first"
    else
        cat "$SECRETS_FILE"
        echo ""
        print_warning "Keep these secrets secure!"
    fi
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Settings
settings() {
    print_header "Settings"
    
    echo "Current configuration:"
    echo ""
    echo "  Server IP: $SERVER_IP"
    echo "  Domain: $DOMAIN"
    echo "  Server User: $SERVER_USER"
    echo ""
    
    if ask_yes_no "Do you want to change these settings?"; then
        echo ""
        read -p "Enter server IP [$SERVER_IP]: " NEW_IP
        SERVER_IP=${NEW_IP:-$SERVER_IP}
        
        read -p "Enter domain [$DOMAIN]: " NEW_DOMAIN
        DOMAIN=${NEW_DOMAIN:-$DOMAIN}
        
        read -p "Enter server user [$SERVER_USER]: " NEW_USER
        SERVER_USER=${NEW_USER:-$SERVER_USER}
        
        echo ""
        print_success "Settings updated"
        print_warning "Regenerate secrets (option 2) to use new domain in configuration"
    fi
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Main menu loop
main() {
    while true; do
        show_menu
        read -p "Select option: " choice
        echo ""
        
        case $choice in
            1) check_dns; echo ""; read -p "Press Enter to continue...";;
            2) generate_secrets; echo ""; read -p "Press Enter to continue...";;
            3) check_server; echo ""; read -p "Press Enter to continue...";;
            4) configure_firewall; echo ""; read -p "Press Enter to continue...";;
            5) full_check;;
            6) deploy_production;;
            7) view_secrets;;
            8) settings;;
            0) echo "Goodbye!"; exit 0;;
            *) print_error "Invalid option. Please try again."; sleep 2;;
        esac
    done
}

# Run main menu
main

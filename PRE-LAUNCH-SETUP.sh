#!/bin/bash

# ============================================================================
# GoCBC Pre-Launch Setup Script
# ============================================================================
# Setup monitoring and backups before launch
# These are RECOMMENDED but NOT BLOCKING for launch
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
}

print_step() { echo -e "${BLUE}▶${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

print_header "GoCBC PRE-LAUNCH SETUP"
echo ""
echo "This script will setup:"
echo "  1. Monitoring and alerts"
echo "  2. Automated backups"
echo "  3. Health check scripts"
echo ""
echo "Time required: ~30 minutes"
echo "Can be done in parallel with soft launch"
echo ""

read -p "Press Enter to continue..."

# ============================================================================
# STEP 1: Setup Monitoring
# ============================================================================
print_header "STEP 1: MONITORING SETUP"

print_step "Creating health check script..."

cat > /home/guda/GoCBC/health-check.sh << 'EOF'
#!/bin/bash

# Quick health check for all GoCBC services
echo "=== GoCBC Health Check ==="
echo ""

# Check containers
echo "1. Docker Containers:"
RUNNING=$(docker ps --format "{{.Names}}" | wc -l)
echo "   Running: $RUNNING containers"

# Check API
echo "2. API Health:"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "   ✓ API responding"
else
    echo "   ✗ API not responding"
fi

# Check new features
echo "3. New Features:"
for endpoint in repatriation inspection bordercrossing banking; do
    if curl -s http://localhost:3000/api/$endpoint/health > /dev/null 2>&1; then
        echo "   ✓ $endpoint OK"
    else
        echo "   ✗ $endpoint FAILED"
    fi
done

# Check database
echo "4. Database:"
if docker exec $(docker ps -q -f name=postgres) psql -U cecbs -d cecbs -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✓ PostgreSQL accessible"
else
    echo "   ✗ PostgreSQL not accessible"
fi

# Check chaincode
echo "5. Chaincode:"
if docker ps | grep -q coffee-chaincode; then
    echo "   ✓ Chaincode container running"
else
    echo "   ✗ Chaincode container not running"
fi

echo ""
echo "Health check complete."
EOF

chmod +x /home/guda/GoCBC/health-check.sh
print_success "Health check script created"

# ============================================================================
# STEP 2: Setup Automated Backups
# ============================================================================
print_header "STEP 2: BACKUP SETUP"

print_step "Creating backup directory..."
mkdir -p /home/guda/GoCBC/backups
print_success "Backup directory created"

print_step "Creating backup script..."

cat > /home/guda/GoCBC/backup-system.sh << 'EOF'
#!/bin/bash

# GoCBC System Backup Script
# Backs up PostgreSQL database and important files

BACKUP_DIR="/home/guda/GoCBC/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="gocbc_backup_$DATE"

echo "=== GoCBC Backup Starting ==="
echo "Backup: $BACKUP_NAME"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup PostgreSQL database
echo "1. Backing up PostgreSQL database..."
docker exec $(docker ps -q -f name=postgres) pg_dump -U cecbs cecbs > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
if [ $? -eq 0 ]; then
    echo "   ✓ Database backup complete"
else
    echo "   ✗ Database backup failed"
    exit 1
fi

# Backup .env file
echo "2. Backing up configuration..."
cp /home/guda/GoCBC/.env "$BACKUP_DIR/$BACKUP_NAME/.env" 2>/dev/null || echo "   ⚠ .env not found"

# Backup docker-compose files
cp /home/guda/GoCBC/docker-compose*.yml "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null

# Create backup info
cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << BACKUP_INFO
GoCBC System Backup
Date: $(date)
Version: 1.21
Database: cecbs
Size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
BACKUP_INFO

# Compress backup
echo "3. Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo ""
echo "=== Backup Complete ==="
echo "Location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "Size: $(du -sh "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)"

# Keep only last 7 backups
echo ""
echo "Cleaning old backups (keeping last 7)..."
ls -t "$BACKUP_DIR"/gocbc_backup_*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null
echo "Done."
EOF

chmod +x /home/guda/GoCBC/backup-system.sh
print_success "Backup script created"

print_step "Testing backup script..."
if /home/guda/GoCBC/backup-system.sh; then
    print_success "Backup script works!"
else
    print_warning "Backup script test failed (check manually)"
fi

# ============================================================================
# STEP 3: Setup Cron Jobs (Optional)
# ============================================================================
print_header "STEP 3: AUTOMATION (OPTIONAL)"

echo "Would you like to setup automated daily backups?"
echo "This will add a cron job to run backups at 2 AM daily."
read -p "Setup automated backups? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Setting up cron job..."
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "backup-system.sh"; then
        print_warning "Cron job already exists"
    else
        # Add cron job (runs at 2 AM daily)
        (crontab -l 2>/dev/null; echo "0 2 * * * /home/guda/GoCBC/backup-system.sh >> /home/guda/GoCBC/backups/backup.log 2>&1") | crontab -
        print_success "Cron job added (daily at 2 AM)"
    fi
else
    print_step "Skipping cron job setup"
    echo "To backup manually, run: ./backup-system.sh"
fi

# ============================================================================
# STEP 4: Create Monitoring Dashboard Script
# ============================================================================
print_header "STEP 4: MONITORING DASHBOARD"

print_step "Creating monitoring dashboard..."

cat > /home/guda/GoCBC/monitor-system.sh << 'EOF'
#!/bin/bash

# GoCBC System Monitor - Real-time dashboard
# Press Ctrl+C to exit

while true; do
    clear
    echo "=========================================="
    echo "   GoCBC SYSTEM MONITOR"
    echo "   $(date)"
    echo "=========================================="
    echo ""
    
    # Container status
    echo "📦 CONTAINERS:"
    RUNNING=$(docker ps --format "{{.Names}}" | wc -l)
    echo "   Running: $RUNNING containers"
    echo ""
    
    # API Status
    echo "🔌 API STATUS:"
    for endpoint in health repatriation/health inspection/health bordercrossing/health banking/health; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/$endpoint 2>&1 | grep -q "200"; then
            echo "   ✓ /api/$endpoint"
        else
            echo "   ✗ /api/$endpoint"
        fi
    done
    echo ""
    
    # Database
    echo "💾 DATABASE:"
    if docker exec $(docker ps -q -f name=postgres) psql -U cecbs -d cecbs -c "SELECT 1;" > /dev/null 2>&1; then
        echo "   ✓ PostgreSQL OK"
    else
        echo "   ✗ PostgreSQL FAILED"
    fi
    echo ""
    
    # Chaincode
    echo "⛓️  CHAINCODE:"
    if docker ps | grep -q coffee-chaincode; then
        echo "   ✓ Container running"
    else
        echo "   ✗ Container not running"
    fi
    echo ""
    
    # Resources
    echo "📊 RESOURCES:"
    echo "   CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
    echo "   Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
    echo "   Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
    echo ""
    
    echo "=========================================="
    echo "Refreshing in 5 seconds... (Ctrl+C to exit)"
    sleep 5
done
EOF

chmod +x /home/guda/GoCBC/monitor-system.sh
print_success "Monitoring dashboard created"

# ============================================================================
# STEP 5: Test Everything
# ============================================================================
print_header "STEP 5: TESTING SETUP"

print_step "Running health check..."
/home/guda/GoCBC/health-check.sh

print_step "Checking backup exists..."
LATEST_BACKUP=$(ls -t /home/guda/GoCBC/backups/gocbc_backup_*.tar.gz 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    print_success "Backup found: $(basename $LATEST_BACKUP)"
else
    print_warning "No backup found (run ./backup-system.sh)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
print_header "SETUP COMPLETE!"
echo ""
echo "Scripts created:"
echo "  ✓ ./health-check.sh       - Quick health check"
echo "  ✓ ./backup-system.sh      - Manual backup"
echo "  ✓ ./monitor-system.sh     - Real-time monitoring"
echo ""
echo "Usage:"
echo "  Health check:   ./health-check.sh"
echo "  Backup now:     ./backup-system.sh"
echo "  Monitor live:   ./monitor-system.sh"
echo ""

if crontab -l 2>/dev/null | grep -q "backup-system.sh"; then
    echo "Automated backups: ✓ Enabled (daily at 2 AM)"
else
    echo "Automated backups: ✗ Not enabled"
    echo "  To enable: ./backup-system.sh (then setup cron manually)"
fi

echo ""
print_success "System is ready for launch!"
echo ""

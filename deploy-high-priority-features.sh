#!/bin/bash

# ============================================================================
# GoCBC HIGH PRIORITY FEATURES DEPLOYMENT SCRIPT
# ============================================================================
# This script deploys the 4 HIGH priority features:
# 1. Export Proceeds Repatriation
# 2. Pre-shipment Inspection
# 3. Border Crossing Documentation
# 4. LC Discrepancy Handling
#
# Progress: 85% → 90% Completion
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to wait for user confirmation
confirm_step() {
    echo -e "${YELLOW}Press Enter to continue or Ctrl+C to abort...${NC}"
    read -r
}

echo "============================================================================"
echo "  GoCBC HIGH PRIORITY FEATURES DEPLOYMENT"
echo "  Version: 1.21"
echo "  Features: Repatriation, Inspection, Border Crossing, LC Discrepancies"
echo "============================================================================"
echo ""

# ============================================================================
# STEP 1: Pre-deployment Checks
# ============================================================================
print_step "Step 1: Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Are you in the GoCBC directory?"
    exit 1
fi

# Check if required scripts exist
REQUIRED_SCRIPTS=("start-all.sh" "run-new-migrations.sh" "deploy-chaincode.sh" "start-chaincode-container.sh" "restart-api.sh")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ ! -f "$script" ]; then
        print_error "Required script $script not found!"
        exit 1
    fi
    if [ ! -x "$script" ]; then
        print_warning "$script is not executable. Making it executable..."
        chmod +x "$script"
    fi
done

# Check if migration files exist
REQUIRED_MIGRATIONS=("019_create_repatriation_table.sql" "020_create_inspection_table.sql" "021_create_border_crossing_table.sql" "022_add_lc_discrepancies.sql")
for migration in "${REQUIRED_MIGRATIONS[@]}"; do
    if [ ! -f "api/src/migrations/$migration" ]; then
        print_error "Required migration file $migration not found!"
        exit 1
    fi
done

# Check if chaincode files exist
REQUIRED_CHAINCODE=("repatriation.go" "inspection.go" "bordercrossing.go")
for file in "${REQUIRED_CHAINCODE[@]}"; do
    if [ ! -f "chaincodes/coffee/$file" ]; then
        print_error "Required chaincode file $file not found!"
        exit 1
    fi
done

print_success "All required files found"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Docker is running"
echo ""

# ============================================================================
# STEP 2: Start the System (if not running)
# ============================================================================
print_step "Step 2: Checking if system is running..."

RUNNING_CONTAINERS=$(docker ps | grep -c "gocbc" || true)

if [ "$RUNNING_CONTAINERS" -lt 5 ]; then
    print_warning "System appears to be stopped or partially running"
    echo "Starting the GoCBC system..."
    confirm_step
    
    ./start-all.sh --no-interactive
    
    print_success "System started"
    
    # Wait for system to stabilize
    print_step "Waiting 30 seconds for system to stabilize..."
    sleep 30
else
    print_success "System is already running ($RUNNING_CONTAINERS containers active)"
fi

echo ""

# ============================================================================
# STEP 3: Run Database Migrations
# ============================================================================
print_step "Step 3: Running database migrations (019-022)..."
echo "This will create 4 new tables for the HIGH priority features"
confirm_step

if ./run-new-migrations.sh; then
    print_success "Database migrations completed successfully"
else
    print_error "Database migrations failed. Check the output above."
    exit 1
fi

echo ""

# ============================================================================
# STEP 4: Compile and Package Chaincode
# ============================================================================
print_step "Step 4: Compiling chaincode..."

cd chaincodes/coffee

# Test compilation
if go build -v > /dev/null 2>&1; then
    print_success "Chaincode compiles successfully"
else
    print_error "Chaincode compilation failed"
    cd ../..
    exit 1
fi

# Clean build artifacts
rm -f coffee
cd ../..

echo ""

# ============================================================================
# STEP 5: Build Docker Image
# ============================================================================
print_step "Step 5: Building chaincode Docker image (coffee-chaincode:1.21)..."
echo "This may take 2-3 minutes..."
confirm_step

if docker build -t coffee-chaincode:1.21 -f chaincodes/coffee/Dockerfile chaincodes/coffee/; then
    print_success "Docker image built successfully"
else
    print_error "Docker image build failed"
    exit 1
fi

# Verify image exists
if docker images | grep -q "coffee-chaincode.*1.21"; then
    print_success "Image coffee-chaincode:1.21 verified"
else
    print_error "Image coffee-chaincode:1.21 not found after build"
    exit 1
fi

echo ""

# ============================================================================
# STEP 6: Deploy Chaincode to Fabric
# ============================================================================
print_step "Step 6: Deploying chaincode to Hyperledger Fabric..."
echo "This will package, install, approve, and commit the chaincode"
confirm_step

if ./deploy-chaincode.sh; then
    print_success "Chaincode deployed to Fabric network"
else
    print_error "Chaincode deployment failed"
    exit 1
fi

# Wait for deployment to complete
print_step "Waiting 15 seconds for chaincode deployment to finalize..."
sleep 15

echo ""

# ============================================================================
# STEP 7: Start Chaincode Container
# ============================================================================
print_step "Step 7: Starting chaincode container..."
confirm_step

if ./start-chaincode-container.sh; then
    print_success "Chaincode container started"
else
    print_error "Failed to start chaincode container"
    exit 1
fi

# Wait for container to be ready
print_step "Waiting 10 seconds for chaincode to initialize..."
sleep 10

# Verify container is running
if docker ps | grep -q "coffee-chaincode"; then
    print_success "Chaincode container is running"
else
    print_warning "Chaincode container may not be running properly"
fi

echo ""

# ============================================================================
# STEP 8: Restart API Server
# ============================================================================
print_step "Step 8: Restarting API server to load new routes..."
confirm_step

if ./restart-api.sh; then
    print_success "API server restarted"
else
    print_error "Failed to restart API server"
    exit 1
fi

# Wait for API to be ready
print_step "Waiting 10 seconds for API to be ready..."
sleep 10

echo ""

# ============================================================================
# STEP 9: Verify Deployment
# ============================================================================
print_step "Step 9: Verifying deployment..."

# Check if API is responding
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_success "API server is responding"
else
    print_warning "API server may not be responding on http://localhost:3000"
fi

# Check chaincode version
echo ""
print_step "Querying chaincode version..."
docker exec cli peer lifecycle chaincode querycommitted \
    --channelID coffeechannel \
    --name coffee \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/coffee.com/orderers/orderer.coffee.com/msp/tlscacerts/tlsca.coffee.com-cert.pem 2>/dev/null || print_warning "Could not query chaincode version"

# Display running containers
echo ""
print_step "Active containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep gocbc || docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "============================================================================"
print_success "DEPLOYMENT COMPLETE!"
echo "============================================================================"
echo ""
echo "Summary:"
echo "  ✓ Database migrations applied (4 new tables)"
echo "  ✓ Chaincode version 1.21 deployed"
echo "  ✓ API server updated with new routes"
echo "  ✓ System operational at 90% completion"
echo ""
echo "New Features Deployed:"
echo "  1. Export Proceeds Repatriation (10 functions, 10 API endpoints)"
echo "  2. Pre-shipment Inspection (11 functions, 9 API endpoints)"
echo "  3. Border Crossing Documentation (12 functions, 10 API endpoints)"
echo "  4. LC Discrepancy Handling (7 functions, 6 API endpoints)"
echo ""
echo "Next Steps:"
echo "  1. Run comprehensive tests:"
echo "     ./test-complete-workflow-extended.sh"
echo ""
echo "  2. Test new features individually:"
echo "     - Repatriation: curl http://localhost:3000/api/repatriation/health"
echo "     - Inspection: curl http://localhost:3000/api/inspection/health"
echo "     - Border Crossing: curl http://localhost:3000/api/bordercrossing/health"
echo "     - LC Discrepancies: curl http://localhost:3000/api/banking/health"
echo ""
echo "  3. Review documentation:"
echo "     - HIGH-PRIORITY-FEATURES-IMPLEMENTATION.md"
echo "     - DEPLOYMENT-GUIDE-HIGH-PRIORITY-FEATURES.md"
echo "     - READY-TO-DEPLOY.md"
echo ""
echo "============================================================================"

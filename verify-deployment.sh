#!/bin/bash

echo "=========================================="
echo "🔍 CECBS Deployment Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
WARNINGS=0
ERRORS=0

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((SUCCESS++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Check Docker containers
echo "1. Checking Docker Containers..."
RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" | wc -l)
if [ "$RUNNING_CONTAINERS" -ge 18 ]; then
    print_success "All containers running ($RUNNING_CONTAINERS/18)"
else
    print_error "Only $RUNNING_CONTAINERS/18 containers running"
fi
echo ""

# Check chaincode container
echo "2. Checking Chaincode Container..."
if docker ps | grep -q coffee-chaincode; then
    print_success "Coffee chaincode container is running"
else
    print_error "Coffee chaincode container is NOT running"
fi
echo ""

# Check external builder scripts
echo "3. Checking External Builder Scripts..."
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et; do
    if docker exec $peer test -x /builders/ccaas/bin/detect 2>/dev/null; then
        print_success "$peer has executable builder scripts"
    else
        print_error "$peer missing or non-executable builder scripts"
    fi
done
echo ""

# Check if chaincode is installed
echo "4. Checking Chaincode Installation..."
INSTALLED=$(docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
peer lifecycle chaincode queryinstalled 2>&1
" | grep "coffee_1.0" || echo "")

if [ -n "$INSTALLED" ]; then
    PACKAGE_ID=$(echo "$INSTALLED" | grep -oP 'Package ID: \K[^,]+')
    print_success "Chaincode installed: $PACKAGE_ID"
else
    print_error "Chaincode NOT installed on peer0.ecta.cecbs.et"
fi
echo ""

# Check if chaincode is committed
echo "5. Checking Chaincode Commitment..."
COMMITTED=$(docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
peer lifecycle chaincode querycommitted -C coffeechannel 2>&1
" | grep "coffee" || echo "")

if [ -n "$COMMITTED" ]; then
    print_success "Chaincode committed to coffeechannel"
    echo "$COMMITTED" | grep "Version\|Sequence"
else
    print_error "Chaincode NOT committed to coffeechannel"
fi
echo ""

# Check channel membership
echo "6. Checking Channel Membership..."
CHANNELS=$(docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
peer channel list 2>&1
" | grep "coffeechannel" || echo "")

if [ -n "$CHANNELS" ]; then
    print_success "Peers have joined coffeechannel"
else
    print_error "Peers have NOT joined coffeechannel"
fi
echo ""

# Check API and UI
echo "7. Checking Application Services..."
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    print_success "API server responding on port 3001"
else
    print_warning "API server not responding on port 3001"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>&1 | grep -q "200\|301\|302"; then
    print_success "UI server responding on port 3000"
else
    print_warning "UI server not responding on port 3000"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Verification Summary"
echo "=========================================="
echo -e "${GREEN}Successes: $SUCCESS${NC}"
echo -e "${YELLOW}Warnings:  $WARNINGS${NC}"
echo -e "${RED}Errors:    $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some critical checks failed. Please review errors above.${NC}"
    exit 1
fi

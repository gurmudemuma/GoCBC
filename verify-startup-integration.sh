#!/usr/bin/env bash
# Verify that start-all.sh properly calls all required scripts

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }
info() { echo -e "${YELLOW}ℹ${NC} $*"; }

echo ""
echo "============================================================================"
echo "  Verifying Startup Integration"
echo "============================================================================"
echo ""

ERRORS=0

# Test 1: Main script exists
if [ -f "start-all.sh" ]; then
    ok "start-all.sh exists"
else
    err "start-all.sh NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: Required scripts exist
info "Checking required scripts..."
for script in init-blockchain.sh join-peers-to-channel.sh deploy-chaincode-complete.sh; do
    if [ -f "scripts/$script" ]; then
        ok "  scripts/$script exists"
    else
        err "  scripts/$script NOT FOUND"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test 3: start-all.sh calls the scripts
info "Verifying script calls in start-all.sh..."
if grep -q "scripts/init-blockchain.sh" start-all.sh; then
    ok "  start-all.sh calls init-blockchain.sh"
else
    err "  start-all.sh does NOT call init-blockchain.sh"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "scripts/deploy-chaincode-complete.sh" start-all.sh; then
    ok "  start-all.sh calls deploy-chaincode-complete.sh"
else
    err "  start-all.sh does NOT call deploy-chaincode-complete.sh"
    ERRORS=$((ERRORS + 1))
fi

# Test 4: init-blockchain.sh calls required scripts
info "Verifying script calls in init-blockchain.sh..."
if grep -q "join-peers-to-channel.sh" scripts/init-blockchain.sh; then
    ok "  init-blockchain.sh calls join-peers-to-channel.sh"
else
    err "  init-blockchain.sh does NOT call join-peers-to-channel.sh"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "deploy-chaincode-complete.sh" scripts/init-blockchain.sh; then
    ok "  init-blockchain.sh calls deploy-chaincode-complete.sh"
else
    err "  init-blockchain.sh does NOT call deploy-chaincode-complete.sh"
    ERRORS=$((ERRORS + 1))
fi

# Test 5: Channel block exists
info "Checking blockchain artifacts..."
if [ -f "blockchain/channel-artifacts/coffeechannel.block" ]; then
    ok "  Channel block exists"
else
    err "  Channel block NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Test 6: Docker compose file exists
if [ -f "docker-compose-fabric.yml" ]; then
    ok "  docker-compose-fabric.yml exists"
else
    err "  docker-compose-fabric.yml NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Test 7: Application directories exist
info "Checking application structure..."
for dir in api ui chaincodes/coffee blockchain scripts; do
    if [ -d "$dir" ]; then
        ok "  Directory $dir exists"
    else
        err "  Directory $dir NOT FOUND"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test 8: Verify script permissions
info "Checking script permissions..."
for script in start-all.sh scripts/init-blockchain.sh scripts/join-peers-to-channel.sh scripts/deploy-chaincode-complete.sh; do
    if [ -x "$script" ] || [ -r "$script" ]; then
        ok "  $script is readable/executable"
    else
        err "  $script is NOT readable/executable"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "============================================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}  ✓ All Integration Tests Passed!${NC}"
    echo "============================================================================"
    echo ""
    echo "Startup Integration: VERIFIED ✓"
    echo ""
    echo "You can now start the system:"
    echo "  bash start-all.sh              # Full system with API/UI"
    echo "  bash start-all.sh --no-services  # Infrastructure only"
    echo ""
    exit 0
else
    echo -e "${RED}  ✗ $ERRORS Test(s) Failed${NC}"
    echo "============================================================================"
    echo ""
    echo "Please fix the issues above before starting the system."
    echo ""
    exit 1
fi

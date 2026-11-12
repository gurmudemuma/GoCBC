#!/bin/bash

# SWIFT Implementation Build Verification Script
# Verifies all SWIFT components are properly integrated

echo "=========================================="
echo "SWIFT Implementation Build Verification"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if running from project root
if [ ! -f "package.json" ] && [ ! -d "ui" ]; then
    echo -e "${RED}✗ Please run this script from the project root directory${NC}"
    exit 1
fi

echo "Checking SWIFT Backend Components..."
echo "--------------------------------------"

# Check chaincode
if [ -f "chaincodes/coffee/swift.go" ]; then
    echo -e "${GREEN}✓ swift.go chaincode found${NC}"
else
    echo -e "${RED}✗ swift.go chaincode missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check API routes
if [ -f "api/src/routes/swift.ts" ]; then
    echo -e "${GREEN}✓ swift.ts API routes found${NC}"
else
    echo -e "${RED}✗ swift.ts API routes missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check server integration
if grep -q "swiftRouter" "api/src/server.ts"; then
    echo -e "${GREEN}✓ SWIFT routes registered in server.ts${NC}"
else
    echo -e "${YELLOW}⚠ SWIFT routes not found in server.ts${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Checking SWIFT UI Components..."
echo "--------------------------------------"

# Bank components
components=(
    "ui/src/components/bank/SWIFTDashboard.tsx"
    "ui/src/components/bank/SWIFTMessageDetail.tsx"
    "ui/src/components/bank/SWIFTNotifications.tsx"
    "ui/src/components/bank/SWIFTStatistics.tsx"
    "ui/src/components/bank/CreateSWIFTMessage.tsx"
    "ui/src/components/bank/SWIFTDashboardWrapper.tsx"
)

for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        echo -e "${GREEN}✓ $(basename $component)${NC}"
    else
        echo -e "${RED}✗ $(basename $component) missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# Exporter components
if [ -f "ui/src/components/exporter/SWIFTMessagesView.tsx" ]; then
    echo -e "${GREEN}✓ SWIFTMessagesView.tsx${NC}"
else
    echo -e "${RED}✗ SWIFTMessagesView.tsx missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "ui/src/components/exporter/SWIFTMessagesViewWrapper.tsx" ]; then
    echo -e "${GREEN}✓ SWIFTMessagesViewWrapper.tsx${NC}"
else
    echo -e "${RED}✗ SWIFTMessagesViewWrapper.tsx missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# NBE components
if [ -f "ui/src/components/nbe/SWIFTMonitoring.tsx" ]; then
    echo -e "${GREEN}✓ SWIFTMonitoring.tsx${NC}"
else
    echo -e "${RED}✗ SWIFTMonitoring.tsx missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "ui/src/components/nbe/SWIFTMonitoringWrapper.tsx" ]; then
    echo -e "${GREEN}✓ SWIFTMonitoringWrapper.tsx${NC}"
else
    echo -e "${RED}✗ SWIFTMonitoringWrapper.tsx missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking Services and Hooks..."
echo "--------------------------------------"

# WebSocket service
if [ -f "ui/src/services/swiftWebSocket.ts" ]; then
    echo -e "${GREEN}✓ swiftWebSocket.ts service${NC}"
else
    echo -e "${RED}✗ swiftWebSocket.ts service missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# WebSocket hook
if [ -f "ui/src/hooks/useSWIFTWebSocket.ts" ]; then
    echo -e "${GREEN}✓ useSWIFTWebSocket.ts hook${NC}"
else
    echo -e "${RED}✗ useSWIFTWebSocket.ts hook missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# API service
if [ -f "ui/src/services/swiftApi.ts" ]; then
    echo -e "${GREEN}✓ swiftApi.ts service${NC}"
else
    echo -e "${RED}✗ swiftApi.ts service missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking Portal Integration..."
echo "--------------------------------------"

# Banks Portal
if grep -q "SWIFTDashboardWrapper" "ui/src/components/portals/BanksPortal.tsx"; then
    echo -e "${GREEN}✓ Banks Portal integrated${NC}"
else
    echo -e "${YELLOW}⚠ Banks Portal not integrated${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Exporter Portal
if grep -q "SWIFTMessagesViewWrapper" "ui/src/components/portals/ExporterPortal.tsx"; then
    echo -e "${GREEN}✓ Exporter Portal integrated${NC}"
else
    echo -e "${YELLOW}⚠ Exporter Portal not integrated${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# NBE Portal
if grep -q "SWIFTMonitoringWrapper" "ui/src/components/portals/NBEPortal.tsx"; then
    echo -e "${GREEN}✓ NBE Portal integrated${NC}"
else
    echo -e "${YELLOW}⚠ NBE Portal not integrated${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Checking Configuration..."
echo "--------------------------------------"

# Environment file
if [ -f "ui/.env.example" ]; then
    if grep -q "NEXT_PUBLIC_SWIFT_WS_URL" "ui/.env.example"; then
        echo -e "${GREEN}✓ SWIFT WebSocket config in .env.example${NC}"
    else
        echo -e "${YELLOW}⚠ SWIFT WebSocket config missing in .env.example${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ .env.example not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check if .env.local exists
if [ -f "ui/.env.local" ]; then
    echo -e "${GREEN}✓ .env.local exists${NC}"
else
    echo -e "${YELLOW}⚠ .env.local not found (copy from .env.example)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! SWIFT implementation is complete.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "Review warnings above. System should still work."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "Fix errors before deployment."
    exit 1
fi

#!/bin/bash

# CECBS Document Signature System - Quick Deployment Script
# Deploys signature system components and validates integration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CECBS Document Signature System - Quick Deploy             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Install API dependencies
echo -e "${BLUE}[1/6]${NC} Installing API dependencies..."
cd api
if npm install --silent; then
    echo -e "${GREEN}✅ API dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install API dependencies${NC}"
    exit 1
fi

# Check for pdf-lib
if npm list pdf-lib >/dev/null 2>&1; then
    echo -e "${GREEN}✅ pdf-lib is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Installing pdf-lib...${NC}"
    npm install pdf-lib@1.17.1 --save
fi

cd ..

# Step 2: Run database migration
echo -e "${BLUE}[2/6]${NC} Running database migration..."
cd api
if node run-signature-migration.js; then
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi
cd ..

# Step 3: Deploy chaincode
echo -e "${BLUE}[3/6]${NC} Deploying signature chaincode..."
cd blockchain

# Check if blockchain is running
if ! docker ps | grep -q "peer0.ecx.cecbs.et"; then
    echo -e "${YELLOW}⚠️  Blockchain network not running${NC}"
    echo -e "${YELLOW}   Starting blockchain network...${NC}"
    docker-compose -f ../docker-compose-fabric.yml up -d
    echo -e "${YELLOW}   Waiting for network to stabilize (30s)...${NC}"
    sleep 30
fi

# Deploy chaincode
if bash deploy-chaincode.sh; then
    echo -e "${GREEN}✅ Chaincode deployed successfully${NC}"
else
    echo -e "${RED}❌ Chaincode deployment failed${NC}"
    echo -e "${YELLOW}   You may need to deploy manually${NC}"
fi

cd ..

# Step 4: Verify UI components
echo -e "${BLUE}[4/6]${NC} Verifying UI components..."
MISSING_COMPONENTS=0

if [ -f "ui/src/components/documents/DocumentManagementPanel.tsx" ]; then
    echo -e "${GREEN}✅ DocumentManagementPanel exists${NC}"
else
    echo -e "${RED}❌ DocumentManagementPanel not found${NC}"
    MISSING_COMPONENTS=1
fi

if [ -f "ui/src/components/documents/SignDocumentButton.tsx" ]; then
    echo -e "${GREEN}✅ SignDocumentButton exists${NC}"
else
    echo -e "${RED}❌ SignDocumentButton not found${NC}"
    MISSING_COMPONENTS=1
fi

if [ -f "ui/src/components/documents/DocumentSignatureTracker.tsx" ]; then
    echo -e "${GREEN}✅ DocumentSignatureTracker exists${NC}"
else
    echo -e "${RED}❌ DocumentSignatureTracker not found${NC}"
    MISSING_COMPONENTS=1
fi

if [ $MISSING_COMPONENTS -eq 1 ]; then
    echo -e "${RED}❌ Some UI components are missing${NC}"
    exit 1
fi

# Step 5: Verify portal integrations
echo -e "${BLUE}[5/6]${NC} Verifying portal integrations..."
PORTALS=(
    "ui/src/components/portals/ExporterPortal.tsx"
    "ui/src/components/portals/ECTAPortal.tsx"
    "ui/src/components/portals/BanksPortal.tsx"
    "ui/src/components/portals/NBEPortal.tsx"
    "ui/src/components/portals/CustomsPortal.tsx"
    "ui/src/components/portals/ShippingPortal.tsx"
)

INTEGRATION_ISSUES=0
for portal in "${PORTALS[@]}"; do
    portal_name=$(basename "$portal" .tsx)
    if grep -q "DocumentManagementPanel" "$portal"; then
        echo -e "${GREEN}✅ $portal_name integrated${NC}"
    else
        echo -e "${YELLOW}⚠️  $portal_name may need integration${NC}"
        INTEGRATION_ISSUES=1
    fi
done

if [ $INTEGRATION_ISSUES -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Some portals may need manual integration${NC}"
    echo -e "${YELLOW}   See PORTAL-INTEGRATION-GUIDE.md for details${NC}"
fi

# Step 6: Run validation
echo -e "${BLUE}[6/6]${NC} Running system validation..."
if bash validate-system.sh; then
    echo -e "${GREEN}✅ System validation passed${NC}"
else
    echo -e "${YELLOW}⚠️  System validation completed with warnings${NC}"
fi

# Final summary
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    DEPLOYMENT SUMMARY                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Document signature system deployed${NC}"
echo ""
echo "Next steps:"
echo "1. Start API server:  cd api && npm run dev"
echo "2. Start UI server:   cd ui && npm run dev"
echo "3. Run tests:         node tests/test-signature-system-integration.js"
echo "4. Open browser:      http://localhost:3000"
echo ""
echo "Documentation:"
echo "- Full guide:         SIGNATURE-SYSTEM-INTEGRATION-COMPLETE.md"
echo "- Portal guide:       PORTAL-INTEGRATION-GUIDE.md"
echo "- Deployment guide:   DEPLOYMENT-CHECKLIST.md"
echo ""
echo -e "${GREEN}System ready for testing!${NC}"

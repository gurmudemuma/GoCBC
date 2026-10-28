#!/bin/bash

################################################################################
# Fix Permissions Script for GoCBC
# Fixes common permission issues in the project
################################################################################

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║                    Fixing GoCBC Permissions                          ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Get current user
CURRENT_USER=$(whoami)
echo "Current user: $CURRENT_USER"
echo ""

# Fix API dist directory
echo "Fixing api/dist/ permissions..."
if [ -d "api/dist" ]; then
    sudo chown -R $CURRENT_USER:$CURRENT_USER api/dist/
    chmod -R u+w api/dist/
    echo "✓ api/dist/ permissions fixed"
else
    echo "ℹ api/dist/ doesn't exist yet (will be created on build)"
fi

# Fix UI .next directory
echo "Fixing ui/.next/ permissions..."
if [ -d "ui/.next" ]; then
    sudo chown -R $CURRENT_USER:$CURRENT_USER ui/.next/
    chmod -R u+w ui/.next/
    echo "✓ ui/.next/ permissions fixed"
else
    echo "ℹ ui/.next/ doesn't exist yet (will be created on build)"
fi

# Fix logs directory
echo "Fixing logs/ permissions..."
if [ -d "logs" ]; then
    sudo chown -R $CURRENT_USER:$CURRENT_USER logs/
    chmod -R u+w logs/
    echo "✓ logs/ permissions fixed"
else
    mkdir -p logs
    echo "✓ logs/ directory created"
fi

# Fix node_modules
echo "Fixing node_modules permissions..."
if [ -d "api/node_modules" ]; then
    sudo chown -R $CURRENT_USER:$CURRENT_USER api/node_modules/
    echo "✓ api/node_modules/ permissions fixed"
fi
if [ -d "ui/node_modules" ]; then
    sudo chown -R $CURRENT_USER:$CURRENT_USER ui/node_modules/
    echo "✓ ui/node_modules/ permissions fixed"
fi

# Fix scripts
echo "Making scripts executable..."
chmod +x *.sh 2>/dev/null || true
chmod +x scripts/**/*.sh 2>/dev/null || true
echo "✓ Scripts are executable"

# Fix blockchain directories
echo "Fixing blockchain directories..."
if [ -d "blockchain" ]; then
    sudo chown -R $CURRENT_USER:$CURRENT_USER blockchain/
    chmod -R u+w blockchain/
    echo "✓ blockchain/ permissions fixed"
fi

# Fix wallet directories
echo "Fixing wallet directories..."
if [ -d "api/wallet" ]; then
    sudo chown -R $CURRENT_USER:$CURRENT_USER api/wallet/
    chmod -R u+w api/wallet/
    echo "✓ api/wallet/ permissions fixed"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║                    ✓ Permissions Fixed Successfully                  ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "You can now run: ./start-all.sh"
echo ""

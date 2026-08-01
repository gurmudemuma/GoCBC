#!/bin/bash
# Simple diagnostic script to test startup components

echo "==============================================="
echo "CECBS Startup Diagnostic Test"
echo "==============================================="
echo ""

# Test 1: Check if script can run
echo "✓ Script is executable"
echo ""

# Test 2: Check current directory
echo "Current directory: $(pwd)"
echo ""

# Test 3: Check Docker
echo "Testing Docker..."
if command -v docker &> /dev/null; then
    echo "✓ Docker found: $(docker --version)"
    if docker ps &> /dev/null; then
        echo "✓ Docker daemon is running"
    else
        echo "✗ Docker daemon is NOT running"
    fi
else
    echo "✗ Docker not found"
fi
echo ""

# Test 4: Check Docker Compose
echo "Testing Docker Compose..."
if command -v docker-compose &> /dev/null; then
    echo "✓ Docker Compose found: $(docker-compose --version)"
else
    echo "✗ Docker Compose not found"
fi
echo ""

# Test 5: Check Node.js
echo "Testing Node.js..."
if command -v node &> /dev/null; then
    echo "✓ Node.js found: $(node --version)"
else
    echo "✗ Node.js not found"
fi
echo ""

# Test 6: Check directories
echo "Testing project structure..."
for dir in api ui chaincodes/coffee; do
    if [ -d "$dir" ]; then
        echo "✓ Found: $dir"
    else
        echo "✗ Missing: $dir"
    fi
done
echo ""

# Test 7: Check docker-compose file
echo "Testing docker-compose file..."
if [ -f "docker-compose-fabric.yml" ]; then
    echo "✓ Found: docker-compose-fabric.yml"
    echo ""
    echo "Validating docker-compose configuration..."
    docker-compose -f docker-compose-fabric.yml config > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ docker-compose configuration is valid"
    else
        echo "✗ docker-compose configuration has errors"
        echo ""
        echo "Run this to see details:"
        echo "  docker-compose -f docker-compose-fabric.yml config"
    fi
else
    echo "✗ Missing: docker-compose-fabric.yml"
fi
echo ""

# Test 8: Check for running containers
echo "Checking for running containers..."
RUNNING=$(docker ps -q | wc -l)
if [ "$RUNNING" -gt 0 ]; then
    echo "⚠ Found $RUNNING running container(s)"
    echo ""
    echo "Running containers:"
    docker ps --format "  {{.Names}} - {{.Status}}"
    echo ""
    echo "You may want to stop them first:"
    echo "  ./stop-all.sh"
else
    echo "✓ No containers currently running"
fi
echo ""

# Test 9: Check ports
echo "Checking if required ports are available..."
for port in 3000 3001 5432 6379 7050 7051 9999; do
    if nc -z localhost $port 2>/dev/null || timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null; then
        echo "⚠ Port $port is already in use"
    else
        echo "✓ Port $port is available"
    fi
done
echo ""

echo "==============================================="
echo "Diagnostic complete!"
echo "==============================================="
echo ""
echo "To start the system, run:"
echo "  ./start-all.sh --skip-build"
echo ""

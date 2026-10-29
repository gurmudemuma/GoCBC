#!/bin/bash

################################################################################
# Fix API Container Script
# Diagnoses and fixes common API container startup issues
################################################################################

set -e

# Colors
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_BLUE='\033[0;34m'

write_step() {
    echo -e "${COLOR_BLUE}▶${COLOR_RESET} ${1}"
}

write_success() {
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} ${1}"
}

write_error() {
    echo -e "${COLOR_RED}✗${COLOR_RESET} ${1}"
}

write_warning() {
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} ${1}"
}

echo ""
echo "================================"
echo "  API Container Diagnostics"
echo "================================"
echo ""

# Check if container exists
write_step "Checking if cecbs-api container exists..."
if docker ps -a --format '{{.Names}}' | grep -q '^cecbs-api$'; then
    write_success "Container exists"
    
    # Get container status
    STATUS=$(docker inspect cecbs-api --format='{{.State.Status}}' 2>/dev/null)
    write_step "Container status: $STATUS"
    
    # Show last 50 lines of logs
    write_step "Recent container logs:"
    echo "----------------------------------------"
    docker logs cecbs-api --tail 50 2>&1
    echo "----------------------------------------"
    
    # Check if port is accessible
    write_step "Checking if API port 3001 is accessible..."
    if curl -s --max-time 3 "http://localhost:3001/health" 2>/dev/null; then
        write_success "API is responding"
    else
        write_error "API is not responding on port 3001"
        
        # Check if port is bound
        write_step "Checking port binding..."
        docker port cecbs-api 2>/dev/null || write_warning "No port bindings found"
    fi
    
    # Check container environment
    write_step "Container environment variables:"
    docker exec cecbs-api env 2>/dev/null | grep -E "PORT|DATABASE|FABRIC" | head -20 || write_warning "Cannot read environment"
    
    # Offer to restart
    echo ""
    read -p "Do you want to restart the container? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        write_step "Restarting container..."
        docker restart cecbs-api
        write_success "Container restarted"
        
        write_step "Waiting for API to start (30 seconds)..."
        sleep 30
        
        write_step "Testing API health..."
        if curl -s --max-time 5 "http://localhost:3001/health" 2>/dev/null; then
            write_success "API is now responding!"
        else
            write_error "API still not responding"
            write_step "Recent logs after restart:"
            docker logs cecbs-api --tail 30 2>&1
        fi
    fi
    
    # Offer to recreate
    echo ""
    read -p "Do you want to recreate the container? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        write_step "Stopping and removing container..."
        docker stop cecbs-api 2>/dev/null || true
        docker rm cecbs-api 2>/dev/null || true
        
        write_step "Recreating container with docker-compose..."
        cd /home/guda/GoCBC
        docker-compose -f docker-compose-fabric.yml up -d cecbs-api
        
        write_success "Container recreated"
        write_step "Waiting for API to start (30 seconds)..."
        sleep 30
        
        write_step "Testing API health..."
        if curl -s --max-time 5 "http://localhost:3001/health" 2>/dev/null; then
            write_success "API is now responding!"
        else
            write_error "API still not responding"
            write_step "Recent logs:"
            docker logs cecbs-api --tail 50 2>&1
        fi
    fi
else
    write_warning "Container does not exist"
    write_step "Creating container with docker-compose..."
    
    cd /home/guda/GoCBC
    docker-compose -f docker-compose-fabric.yml up -d cecbs-api
    
    write_success "Container created"
    write_step "Waiting for API to start (30 seconds)..."
    sleep 30
    
    write_step "Testing API health..."
    if curl -s --max-time 5 "http://localhost:3001/health" 2>/dev/null; then
        write_success "API is responding!"
    else
        write_warning "API not responding yet"
        write_step "Check logs: docker logs cecbs-api"
    fi
fi

echo ""
write_step "Diagnosis complete"
echo ""

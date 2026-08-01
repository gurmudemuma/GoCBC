#!/bin/bash
# Debug version of start script - shows everything that happens

# Turn on verbose mode
set -x

echo ""
echo "=========================================="
echo "CECBS DEBUG STARTUP"
echo "=========================================="
echo ""

# Check we're in the right directory
echo "Current directory: $(pwd)"
ls -la

# Check Docker
echo ""
echo "Checking Docker..."
docker --version
docker ps

# Check docker-compose file exists
echo ""
echo "Checking docker-compose-fabric.yml..."
ls -la docker-compose-fabric.yml

# Try to start just the Docker containers
echo ""
echo "Starting Docker containers..."
docker-compose -f docker-compose-fabric.yml down -v
docker-compose -f docker-compose-fabric.yml up -d

# Show what's running
echo ""
echo "Container status:"
docker ps

echo ""
echo "Waiting 20 seconds for services to initialize..."
sleep 20

# Check if containers are still running
echo ""
echo "Checking container health:"
docker ps

# Check logs of key containers
echo ""
echo "Last 20 lines of orderer logs:"
docker logs orderer.cecbs.et --tail 20

echo ""
echo "Last 20 lines of peer logs:"
docker logs peer0.ecta.cecbs.et --tail 20

echo ""
echo "Last 20 lines of postgres logs:"
docker logs cecbs-postgres --tail 20

echo ""
echo "=========================================="
echo "Debug startup complete!"
echo "=========================================="
echo ""
echo "Containers running: $(docker ps -q | wc -l)"
echo ""

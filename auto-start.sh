#!/bin/bash
# Auto-start wrapper for GoCBC that selects development mode automatically

# Clean up any existing containers first
echo "Cleaning up existing containers..."
docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null

# Run start-all.sh with automatic selection of option 1 (Development mode)
echo "1" | bash start-all.sh

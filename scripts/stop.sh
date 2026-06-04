#!/bin/bash

echo "Stopping CECBS Blockchain System..."

docker-compose -f docker-compose-fabric.yml down -v

echo "System stopped successfully!"
echo ""
echo "To clean up completely, run:"
echo "  rm -rf blockchain/organizations blockchain/channel-artifacts *.tar.gz"
echo ""

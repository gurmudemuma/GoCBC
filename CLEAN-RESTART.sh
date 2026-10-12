#!/bin/bash
# FULL CLEAN RESTART - DELETES ALL DATA
# Use only when you want to reset everything

echo "⚠️  WARNING: This will DELETE ALL DATA!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

docker-compose -f docker-compose-fabric.yml down -v
bash start-all.sh

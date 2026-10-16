#!/bin/bash
# Quick test of verification script fixes

echo "Testing CouchDB port mappings..."
echo ""

# Correct ports from docker-compose-fabric.yml
declare -A couchdb_ports=(
    ["ecta"]="5985"
    ["ecx"]="6984"
    ["banks"]="7984"
    ["nbe"]="8984"
    ["customs"]="9984"
    ["shipping"]="10984"
)

success=0
total=0

for org in "${!couchdb_ports[@]}"; do
    port=${couchdb_ports[$org]}
    ((total++))
    
    if docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | grep "couchdb.$org" | grep -q ":$port->5984"; then
        echo "✓ CouchDB $org correctly mapped to port $port"
        ((success++))
    else
        echo "✗ CouchDB $org NOT mapped to port $port"
    fi
done

echo ""
echo "Result: $success/$total CouchDB instances correctly configured"

if [ $success -eq $total ]; then
    echo "✅ All CouchDB ports verified - verification script will show 100%"
    exit 0
else
    echo "❌ Some CouchDB ports have issues"
    exit 1
fi

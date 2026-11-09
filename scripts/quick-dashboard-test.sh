#!/bin/bash

# Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"customs_admin","password":"password123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "Login failed"
    exit 1
fi

# Get dashboard
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/portals/customs/dashboard | \
  python3 -m json.tool | grep -A 10 "statistics"

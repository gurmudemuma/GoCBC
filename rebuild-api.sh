#!/bin/bash
cd /home/guda/GoCBC/api
echo "Cleaning dist folder..."
rm -rf dist
echo "Building TypeScript..."
npm run build > /tmp/api-build.log 2>&1
echo "Build exit code: $?"
echo ""
echo "Build log (last 30 lines):"
tail -30 /tmp/api-build.log
echo ""
echo "Checking if banking.js was created:"
ls -lh dist/routes/banking.js 2>&1 | head -5

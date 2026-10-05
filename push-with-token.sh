#!/bin/bash

echo "============================================"
echo "Push GoCBC Fixes to GitHub"
echo "============================================"
echo ""
echo "This script will push your committed changes to GitHub."
echo ""
echo "You will need:"
echo "  - Your GitHub username: gurmudemuma"
echo "  - Your Personal Access Token (as password)"
echo ""
echo "Get a token from: https://github.com/settings/tokens"
echo ""
echo "Press Enter when ready to push..."
read

cd /home/guda/GoCBC

echo ""
echo "Pushing to GitHub..."
echo ""

git push origin features

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✅ Successfully pushed to GitHub!"
    echo "============================================"
    echo ""
    echo "View your changes at:"
    echo "https://github.com/gurmudemuma/GoCBC/tree/features"
    echo ""
else
    echo ""
    echo "============================================"
    echo "❌ Push failed"
    echo "============================================"
    echo ""
    echo "Common issues:"
    echo "  - Wrong token or expired token"
    echo "  - Token doesn't have 'repo' scope"
    echo "  - Network connection issue"
    echo ""
    echo "Get a new token from:"
    echo "https://github.com/settings/tokens"
    echo ""
fi

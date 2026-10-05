#!/bin/bash

echo "🚀 Pushing to GitHub with optimized settings..."
echo ""

cd /home/guda/GoCBC

# Try pushing with progress
git push origin features --progress 2>&1 | tee /tmp/git-push-output.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "View at: https://github.com/gurmudemuma/GoCBC/tree/features"
else
    echo ""
    echo "❌ Push failed. Trying alternative method..."
    echo ""
    
    # Try with reduced pack size
    git config pack.windowMemory "10m"
    git config pack.packSizeLimit "20m"
    
    echo "Retrying with smaller chunks..."
    git push origin features --progress
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Push succeeded on retry!"
    else
        echo ""
        echo "❌ Still failing. The repository is too large."
        echo ""
        echo "Recommended: Use SSH instead of HTTPS"
        echo "Or: Push smaller commits incrementally"
    fi
fi

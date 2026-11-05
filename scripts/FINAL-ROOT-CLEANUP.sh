#!/bin/bash

echo "Final root directory cleanup..."

# Move start.sh, stop.sh, status.sh to scripts if they're duplicates
if [ -f start.sh ] && [ -f start-all.sh ]; then
    echo "Moving duplicate start.sh to scripts/"
    mv start.sh scripts/
fi

if [ -f stop.sh ] && [ -f stop-all.sh ]; then
    echo "Moving duplicate stop.sh to scripts/"
    mv stop.sh scripts/
fi

if [ -f status.sh ]; then
    echo "Moving status.sh to scripts/"
    mv status.sh scripts/
fi

# Merge capital Docs into lowercase docs if it exists
if [ -d Docs ] && [ -d docs ]; then
    echo "Merging Docs/ into docs/..."
    find Docs -type f -exec mv {} docs/ \;
    rmdir Docs 2>/dev/null && echo "✓ Removed empty Docs directory"
fi

# Remove C: directory if it's the empty Windows path artifact
if [ -d "C:" ]; then
    echo "Checking C: directory..."
    if [ -z "$(find 'C:' -type f)" ]; then
        echo "Removing empty C: directory artifact..."
        rm -rf "C:"
    fi
fi

echo ""
echo "✓ Final cleanup complete!"
echo ""
echo "Root directory now contains only:"
ls -1 | grep -v "^[a-z]" | sort

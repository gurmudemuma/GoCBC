#!/bin/bash

echo "Consolidating documentation into Docs/ (capital D)..."

# Create Docs if it doesn't exist
mkdir -p Docs

# Move everything from lowercase docs/ to capital Docs/
if [ -d docs ]; then
    echo "Moving contents from docs/ to Docs/..."
    find docs -type f -exec mv {} Docs/ \;
    rmdir docs 2>/dev/null && echo "✓ Removed lowercase docs directory"
fi

# Move FINAL-ROOT-CLEANUP.sh to scripts
if [ -f FINAL-ROOT-CLEANUP.sh ]; then
    mv FINAL-ROOT-CLEANUP.sh scripts/
fi

echo ""
echo "✓ Consolidation complete!"
echo ""
echo "Documentation files in Docs/:"
ls -1 Docs/ | wc -l
echo "files"

#!/bin/bash
##################################################################
# Cleanup Old Chaincode Packages
# Keeps only the 2 most recent packages
##################################################################

cd /home/guda/GoCBC/chaincodes/coffee

echo "Chaincode Package Cleanup"
echo "========================="
echo ""

BEFORE=$(ls -1 coffee_*.{tgz,tar.gz} 2>/dev/null | wc -l)
echo "Before: $BEFORE packages"
echo ""

# List all packages with dates
echo "Current packages:"
ls -lht coffee_*.{tgz,tar.gz} 2>/dev/null | awk '{print $9, $6, $7, $8}'
echo ""

# Remove all but 2 most recent .tgz files
echo "Removing old .tgz packages (keeping 2 most recent)..."
ls -t coffee_*.tgz 2>/dev/null | tail -n +3 | xargs -r rm -v

# Remove all .tar.gz files (legacy format)
echo "Removing all .tar.gz packages..."
ls -t coffee_*.tar.gz 2>/dev/null | xargs -r rm -v

echo ""
AFTER=$(ls -1 coffee_*.tgz 2>/dev/null | wc -l)
echo "After: $AFTER packages"
echo "Cleaned: $((BEFORE - AFTER)) packages"
echo ""

echo "Remaining packages:"
ls -lht coffee_*.tgz 2>/dev/null | awk '{print $9, $6, $7, $8}'

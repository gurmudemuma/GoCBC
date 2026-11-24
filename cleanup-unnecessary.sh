#!/bin/bash
# ============================================================
# CECBS Cleanup Unnecessary Files
# Identifies and optionally removes unnecessary files
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header "CECBS Cleanup - Identify Unnecessary Files"

echo "This script will identify files that can be safely removed:"
echo ""
echo "  ${YELLOW}1. Backup files${NC} (.bak, .backup)"
echo "  ${YELLOW}2. Zip archives${NC} (ipfs-kubo.zip, UsersCBE*.zip)"
echo "  ${YELLOW}3. Temporary output files${NC} (*.txt logs)"
echo "  ${YELLOW}4. Docker backup files${NC} (.yml.bak)"
echo ""

# Arrays to hold files
BACKUP_FILES=()
ZIP_FILES=()
TXT_FILES=()
OTHER_FILES=()

# Find backup files
if [ -f "docker-compose-fabric.yml.bak" ]; then
    BACKUP_FILES+=("docker-compose-fabric.yml.bak")
fi

# Find zip files
if [ -f "ipfs-kubo.zip" ]; then
    ZIP_FILES+=("ipfs-kubo.zip")
fi
if [ -f "UsersCBEDownloadsipfs-kubo.zip" ]; then
    ZIP_FILES+=("UsersCBEDownloadsipfs-kubo.zip")
fi

# Find temporary txt files
if [ -f "payment-result.txt" ]; then
    TXT_FILES+=("payment-result.txt")
fi
if [ -f "portal-check.txt" ]; then
    TXT_FILES+=("portal-check.txt")
fi
if [ -f "test-doc.txt" ]; then
    TXT_FILES+=("test-doc.txt")
fi
if [ -f "test-upload.txt" ]; then
    TXT_FILES+=("test-upload.txt")
fi
if [ -f "workflow-result.txt" ]; then
    TXT_FILES+=("workflow-result.txt")
fi
if [ -f "CgoCBCscriptscc-status.txt" ]; then
    TXT_FILES+=("CgoCBCscriptscc-status.txt")
fi

# Find test document (should be in tests folder after organization)
if [ -f "test-document.pdf" ]; then
    OTHER_FILES+=("test-document.pdf")
fi

# Calculate total
TOTAL_COUNT=$((${#BACKUP_FILES[@]} + ${#ZIP_FILES[@]} + ${#TXT_FILES[@]} + ${#OTHER_FILES[@]}))

if [ $TOTAL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ No unnecessary files found!${NC}"
    echo ""
    echo "Your codebase is clean."
    exit 0
fi

echo -e "${YELLOW}Found $TOTAL_COUNT unnecessary file(s):${NC}"
echo ""

# Show backup files
if [ ${#BACKUP_FILES[@]} -gt 0 ]; then
    echo -e "${BLUE}Backup Files (${#BACKUP_FILES[@]}):${NC}"
    for file in "${BACKUP_FILES[@]}"; do
        SIZE=$(du -h "$file" 2>/dev/null | cut -f1)
        echo "  • $file ($SIZE)"
    done
    echo ""
fi

# Show zip files
if [ ${#ZIP_FILES[@]} -gt 0 ]; then
    echo -e "${BLUE}Zip Archives (${#ZIP_FILES[@]}):${NC}"
    for file in "${ZIP_FILES[@]}"; do
        SIZE=$(du -h "$file" 2>/dev/null | cut -f1)
        echo "  • $file ($SIZE)"
    done
    echo ""
fi

# Show txt files
if [ ${#TXT_FILES[@]} -gt 0 ]; then
    echo -e "${BLUE}Temporary Output Files (${#TXT_FILES[@]}):${NC}"
    for file in "${TXT_FILES[@]}"; do
        SIZE=$(du -h "$file" 2>/dev/null | cut -f1)
        echo "  • $file ($SIZE)"
    done
    echo ""
fi

# Show other files
if [ ${#OTHER_FILES[@]} -gt 0 ]; then
    echo -e "${BLUE}Other Files (${#OTHER_FILES[@]}):${NC}"
    for file in "${OTHER_FILES[@]}"; do
        SIZE=$(du -h "$file" 2>/dev/null | cut -f1)
        echo "  • $file ($SIZE)"
    done
    echo ""
fi

# Calculate total size
TOTAL_SIZE=0
for file in "${BACKUP_FILES[@]}" "${ZIP_FILES[@]}" "${TXT_FILES[@]}" "${OTHER_FILES[@]}"; do
    if [ -f "$file" ]; then
        FILE_SIZE=$(du -k "$file" 2>/dev/null | cut -f1)
        TOTAL_SIZE=$((TOTAL_SIZE + FILE_SIZE))
    fi
done

TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024))
echo -e "${YELLOW}Total size: ${TOTAL_SIZE_MB}MB${NC}"
echo ""

# Ask what to do
echo "What would you like to do?"
echo ""
echo "  1) Delete all unnecessary files"
echo "  2) Move to 'cleanup' folder (for review)"
echo "  3) Do nothing (just show report)"
echo ""
read -p "Select option (1-3): " CHOICE

case $CHOICE in
    1)
        echo ""
        print_warning "This will PERMANENTLY DELETE the files listed above."
        read -p "Are you sure? (type 'yes' to confirm): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            echo ""
            echo "Deleting files..."
            for file in "${BACKUP_FILES[@]}" "${ZIP_FILES[@]}" "${TXT_FILES[@]}" "${OTHER_FILES[@]}"; do
                if [ -f "$file" ]; then
                    rm "$file"
                    echo -e "${GREEN}✓${NC} Deleted: $file"
                fi
            done
            echo ""
            echo -e "${GREEN}✓ Cleanup complete! Freed ${TOTAL_SIZE_MB}MB${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    2)
        echo ""
        echo "Moving files to 'cleanup' folder..."
        mkdir -p cleanup
        for file in "${BACKUP_FILES[@]}" "${ZIP_FILES[@]}" "${TXT_FILES[@]}" "${OTHER_FILES[@]}"; do
            if [ -f "$file" ]; then
                mv "$file" "cleanup/"
                echo -e "${GREEN}✓${NC} Moved: $file → cleanup/"
            fi
        done
        echo ""
        echo -e "${GREEN}✓ Files moved to 'cleanup/' folder${NC}"
        echo "Review them, then delete the folder when ready: rm -rf cleanup/"
        ;;
    3)
        echo ""
        echo "No action taken. Files remain as they are."
        ;;
    *)
        echo ""
        echo "Invalid option. No action taken."
        ;;
esac

echo ""

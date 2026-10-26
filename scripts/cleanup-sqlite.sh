#!/bin/bash
# Cleanup Script - Remove SQLite Files and Old Scripts
# Run: bash scripts/cleanup-sqlite.sh

echo "═══════════════════════════════════════════════════"
echo "   CECBS SQLite Cleanup Script"
echo "═══════════════════════════════════════════════════"
echo ""

# Confirm with user
read -p "⚠️  This will delete all SQLite files and old scripts. Continue? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo ""
echo "🔄 Starting cleanup..."
echo ""

# Remove SQLite database files
echo "📁 Removing SQLite database files..."
find . -name "*.db" -type f -not -path "*/node_modules/*" | while read file; do
    echo "   🗑️  Deleting: $file"
    rm -f "$file"
done

find . -name "*.db.backup*" -type f -not -path "*/node_modules/*" | while read file; do
    echo "   🗑️  Deleting: $file"
    rm -f "$file"
done

# Remove old SQLite scripts
echo ""
echo "📁 Removing old SQLite scripts..."

OLD_SCRIPTS=(
    "scripts/migrate-db.js"
    "scripts/check-admin-role.js"
    "scripts/add-admin-user.js"
    "scripts/update-old-applications.js"
    "api/scripts/add-bank-columns.js"
    "api/scripts/add-new-columns.js"
)

for script in "${OLD_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "   🗑️  Deleting: $script"
        rm -f "$script"
    else
        echo "   ⏭️  Not found: $script"
    fi
done

# Check for SQLite npm packages
echo ""
echo "📦 Checking for SQLite npm packages..."
cd api 2>/dev/null

if npm list sqlite3 >/dev/null 2>&1; then
    echo "   🗑️  Uninstalling sqlite3..."
    npm uninstall sqlite3
fi

if npm list better-sqlite3 >/dev/null 2>&1; then
    echo "   🗑️  Uninstalling better-sqlite3..."
    npm uninstall better-sqlite3
fi

cd ..

# Summary
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Cleanup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📋 What was removed:"
echo "   • All .db files (SQLite databases)"
echo "   • All .db.backup* files"
echo "   • Old SQLite migration scripts"
echo "   • SQLite npm packages"
echo ""
echo "✅ Your system now uses:"
echo "   • PostgreSQL (off-chain data)"
echo "   • Hyperledger Fabric + CouchDB (blockchain)"
echo ""
echo "🎉 Migration complete!"
echo ""

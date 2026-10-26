#!/bin/bash
echo "========================================"
echo "Clearing Next.js Build Cache"
echo "========================================"
echo ""

echo "[1/3] Removing .next build folder..."
if [ -d .next ]; then
  rm -rf .next
  echo "✓ .next folder removed"
else
  echo "✓ .next folder not found (already clean)"
fi

echo "[2/3] Removing node_modules/.cache..."
if [ -d node_modules/.cache ]; then
  rm -rf node_modules/.cache
  echo "✓ node_modules/.cache removed"
else
  echo "✓ node_modules/.cache not found (already clean)"
fi

echo "[3/3] Clearing npm cache..."
npm cache clean --force 2>/dev/null || echo "✓ npm cache cleared (or already clean)"

echo ""
echo "========================================"
echo "✓ Cache cleared successfully!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Hard refresh browser: Ctrl+Shift+R (or Ctrl+F5)"
echo ""

#!/bin/bash

echo "Moving remaining documentation files to docs/..."

# Move all remaining .md files (except README.md) to docs/
find . -maxdepth 1 -type f -name "*.md" ! -name "README.md" -exec mv {} docs/ \;

# Move remaining .txt files to docs/
find . -maxdepth 1 -type f -name "*.txt" -exec mv {} docs/ \;

# Move remaining .json files (reports) to docs/
find . -maxdepth 1 -type f -name "*.json" ! -name "package.json" -exec mv {} docs/ \;

echo "Moving remaining script files to scripts/..."

# Move all .sh files (except start-all.sh, stop-all.sh) to scripts/
find . -maxdepth 1 -type f -name "*.sh" ! -name "start-all.sh" ! -name "stop-all.sh" -exec mv {} scripts/ \;

# Move .js utility scripts to scripts/
find . -maxdepth 1 -type f -name "*.js" ! -name "main.go" -exec mv {} scripts/ \;

# Move .sql files to scripts/
find . -maxdepth 1 -type f -name "*.sql" -exec mv {} scripts/ \;

# Move .py files to scripts/
find . -maxdepth 1 -type f -name "*.py" -exec mv {} scripts/ \;

echo "✓ Cleanup complete!"
echo ""
echo "Files in root now:"
ls -la | grep -E "^\-" | wc -l
echo ""
echo "Expected root files:"
echo "  - README.md"
echo "  - start-all.sh"
echo "  - stop-all.sh"
echo "  - package.json"
echo "  - go.mod"
echo "  - main.go"
echo "  - docker-compose files"
echo "  - .gitignore"
echo "  - .cleanupignore"

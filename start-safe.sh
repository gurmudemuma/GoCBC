#!/usr/bin/env bash
# Safe wrapper for start-all.sh that catches immediate failures

# Enable error reporting
set -e
set -o pipefail

echo "================================================================"
echo "CECBS Safe Startup Wrapper"
echo "================================================================"
echo ""
echo "This wrapper catches common startup issues."
echo ""

# Check if running in bash
if [ -z "$BASH_VERSION" ]; then
    echo "ERROR: This script requires bash"
    echo "Try: bash start-safe.sh"
    exit 1
fi

echo "✓ Running in bash version: $BASH_VERSION"
echo ""

# Check current directory
CURRENT_DIR="$(pwd)"
echo "Current directory: $CURRENT_DIR"

# Check if start-all.sh exists
if [ ! -f "start-all.sh" ]; then
    echo "ERROR: start-all.sh not found in current directory"
    echo "Please run this script from the project root (goCBC directory)"
    exit 1
fi

echo "✓ Found start-all.sh"
echo ""

# Check if start-all.sh is readable
if [ ! -r "start-all.sh" ]; then
    echo "ERROR: start-all.sh exists but is not readable"
    echo "Try: chmod +r start-all.sh"
    exit 1
fi

echo "✓ start-all.sh is readable"
echo ""

# Try to detect line ending issues
if command -v file >/dev/null 2>&1; then
    FILE_TYPE=$(file start-all.sh)
    echo "File type: $FILE_TYPE"
    
    if echo "$FILE_TYPE" | grep -q "CRLF"; then
        echo ""
        echo "⚠ WARNING: Detected Windows line endings (CRLF)"
        echo "This may cause issues on Linux/macOS"
        echo ""
        
        if command -v dos2unix >/dev/null 2>&1; then
            echo "Converting to Unix line endings..."
            dos2unix start-all.sh 2>/dev/null || true
            echo "✓ Converted"
        else
            echo "To fix, install dos2unix or run:"
            echo "  sed -i 's/\r$//' start-all.sh"
        fi
        echo ""
    fi
fi

# Make executable
chmod +x start-all.sh 2>/dev/null || true
echo "✓ Set executable permissions"
echo ""

# Parse arguments
ARGS="$@"
if [ -z "$ARGS" ]; then
    ARGS="--skip-build"
    echo "No arguments provided, using: --skip-build"
    echo ""
fi

# Run with full error output
echo "================================================================"
echo "Starting CECBS..."
echo "================================================================"
echo ""
echo "Running: bash start-all.sh $ARGS"
echo ""

# Capture both stdout and stderr
if bash start-all.sh $ARGS 2>&1; then
    echo ""
    echo "================================================================"
    echo "✓ Startup completed successfully"
    echo "================================================================"
    exit 0
else
    EXIT_CODE=$?
    echo ""
    echo "================================================================"
    echo "✗ Startup failed with exit code: $EXIT_CODE"
    echo "================================================================"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check the error messages above"
    echo "2. Run: bash test-startup.sh"
    echo "3. Run: bash start-debug.sh"
    echo "4. See: TROUBLESHOOTING.md"
    echo ""
    exit $EXIT_CODE
fi

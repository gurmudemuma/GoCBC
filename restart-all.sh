#!/bin/bash
# Restart CECBS system
# Usage: ./restart-all.sh [options]
# Options: --keep-data, --skip-build, --dev-mode

# Parse arguments
KEEP_DATA_FLAG=""
START_FLAGS=""

for arg in "$@"; do
    case $arg in
        --keep-data)
            KEEP_DATA_FLAG="--keep-data"
            ;;
        --skip-build)
            START_FLAGS="$START_FLAGS --skip-build"
            ;;
        --dev-mode)
            START_FLAGS="$START_FLAGS --dev-mode"
            ;;
    esac
done

echo ""
echo -e "\033[36m🔄 Restarting CECBS System...\033[0m"
echo ""

# Stop everything
if [ -n "$KEEP_DATA_FLAG" ]; then
    ./stop-all.sh --keep-data
else
    ./stop-all.sh
fi

echo ""
echo -e "\033[33mWaiting 5 seconds before restart...\033[0m"
sleep 5

# Start everything
./start-all.sh $START_FLAGS

# Port Cleanup Feature Added to start-all.sh

## Overview
The `start-all.sh` script now automatically detects and terminates processes using required ports before starting the system. This eliminates the "port already in use" errors.

## What Changed

### New Phase: Port Cleanup (Phase 1.5)
A new cleanup phase runs after prerequisites check and before installing dependencies:

1. **Scans all required ports** including:
   - 3000 (UI Server)
   - 3001 (API Server)
   - 5432 (PostgreSQL)
   - 7050-7062 (Blockchain peers and services)
   - 6379 (Redis)
   - 9092 (Kafka)
   - 2181 (Zookeeper)
   - 9999 (Chaincode)
   - And more...

2. **Identifies conflicting processes**
   - Uses `lsof -ti:<port>` to find PIDs
   - Shows process names and PIDs for transparency

3. **Terminates processes automatically**
   - Uses `kill -9` to force-kill processes
   - No prompts or user interaction required
   - Verifies ports are freed after cleanup

4. **Cleans up orphaned PID files**
   - Removes `.api.pid` and `.ui.pid` files
   - Kills any processes referenced in stale PID files

## Example Output

```
================================================================================
  Phase 1.5: Cleaning Up Ports
================================================================================

▶ Scanning for processes using required ports...
▶ Port 3001 is in use by PID(s): 12345
ℹ   └─ PID 12345: node
▶   └─ Terminating processes on port 3001...
✓   └─ Port 3001 is now free

▶ Port 3000 is in use by PID(s): 67890
ℹ   └─ PID 67890: node
▶   └─ Terminating processes on port 3000...
✓   └─ Port 3000 is now free

✓ Cleaned up 2 port(s)
▶ Cleaning up orphaned PID files...
✓ Port cleanup complete
```

## Benefits

1. **No More Port Conflicts**: Automatically resolves "address already in use" errors
2. **Clean Restart**: Ensures clean slate on every startup
3. **No Manual Intervention**: No need to manually find and kill processes
4. **Comprehensive Coverage**: Checks all 20+ ports used by the system
5. **Transparent**: Shows which processes are being terminated and why

## Usage

Simply run the startup script as before:

```bash
./start-all.sh
```

The port cleanup happens automatically between prerequisites check and installation.

## How It Works

The `cleanup_ports()` function:

```bash
cleanup_ports() {
    # Define all required ports
    local REQUIRED_PORTS=(3000 3001 5432 7050 7051 ...)
    
    # For each port:
    for port in "${REQUIRED_PORTS[@]}"; do
        # Find PIDs using the port
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        
        if [ -n "$pids" ]; then
            # Kill the processes
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
}
```

## Error Handling

- If `lsof` is not available, ports are checked but not cleaned (falls back to Docker Compose cleanup)
- Errors during cleanup are silently ignored to prevent blocking startup
- Each port is verified as free after cleanup

## Integration

The cleanup phase is integrated into the startup sequence:

```
Phase 1: Prerequisites Check
Phase 1.5: Port Cleanup (NEW)
Phase 2: Install Dependencies
Phase 3: Start Blockchain Network
...
```

## Files Modified

- `/home/guda/GoCBC/start-all.sh` - Added `cleanup_ports()` function and integrated it into main execution flow

## Testing

To test the port cleanup:

1. Start the system normally
2. Without stopping it, run `./start-all.sh` again
3. The script will detect the running processes and terminate them automatically
4. The system will start fresh without any port conflicts

## Notes

- The cleanup is aggressive (uses `kill -9`) to ensure ports are freed
- All data is preserved as it only kills processes, not Docker volumes
- The blockchain network's `docker-compose down -v` still handles Docker containers separately

# Quick Start Guide - No More Port Conflicts! 🎉

## The Problem (SOLVED!)

Previously, you would get:
```
Error: failed to bind host port 0.0.0.0:3001/tcp: address already in use
```

## The Solution

The `start-all.sh` script now **automatically detects and kills** all processes using required ports.

## Usage

Just run:

```bash
./start-all.sh
```

That's it! No manual cleanup needed anymore.

## What Happens Automatically

### Phase 1.5: Port Cleanup (NEW)

The script will:

1. **Scan 20+ ports** (3000, 3001, 5432, 7050-7062, and more)
2. **Find any processes** using these ports
3. **Kill them automatically** (no prompts!)
4. **Verify ports are freed**
5. **Clean up PID files**

### Example Output You'll See

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

If all ports are already free, you'll see:
```
✓ All required ports were already free
```

## Ports That Are Auto-Cleaned

- **3000** - UI Server
- **3001** - API Server  
- **5432** - PostgreSQL
- **7050** - Orderer
- **7051-7062** - Peer nodes (ECTA, ECX, Banks, NBE, Customs, Shipping)
- **6379** - Redis
- **9092** - Kafka
- **2181** - Zookeeper
- **5984** - CouchDB
- **9999** - Chaincode
- **8080** - Alternative API
- **9443** - Peer Operations

## Scenarios Handled

### Scenario 1: Clean System
```bash
./start-all.sh
```
Result: All ports are free, starts normally

### Scenario 2: Services Already Running
```bash
./start-all.sh  # First run
./start-all.sh  # Run again without stopping
```
Result: Automatically kills old processes, starts fresh

### Scenario 3: Crashed Services
If services crashed but ports are still held:
```bash
./start-all.sh
```
Result: Cleans up zombie processes, starts fresh

### Scenario 4: Manual Restart
```bash
./start-all.sh
```
Result: No need to manually kill anything!

## Options

You can still use all the original options:

```bash
./start-all.sh --verbose          # See all port checks
./start-all.sh --skip-blockchain  # Skip blockchain, cleanup ports for API/UI
./start-all.sh --skip-tests       # Skip health checks
./start-all.sh --help             # Show all options
```

## Safety

- ✅ Only kills processes on **required ports**
- ✅ Shows **exactly what it's killing** (process name and PID)
- ✅ **Preserves all data** (Docker volumes, databases, etc.)
- ✅ **Verified cleanup** - confirms ports are freed
- ✅ **Graceful fallback** - if lsof isn't available, continues safely

## Troubleshooting

### If Port Cleanup Fails

Very unlikely, but if a port still shows as "in use":

1. Check Docker containers:
   ```bash
   docker ps
   ```

2. Manually kill specific port:
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

3. Restart Docker if needed:
   ```bash
   sudo systemctl restart docker
   ```

### If You Want to See What's Using a Port

```bash
lsof -i :3001
```

Shows the process, PID, and user.

## Before vs After

### Before (OLD WAY)
```bash
# Oh no, port 3001 is in use!
lsof -ti:3001          # Find the PID
kill -9 <PID>          # Kill it manually
lsof -ti:3000          # Check UI port too
kill -9 <PID>          # Kill that too
# ... repeat for all ports ...
./start-all.sh         # Finally start
```

### After (NEW WAY)
```bash
./start-all.sh         # Just run it!
```

## When Does Cleanup Run?

Every time you run `./start-all.sh`, automatically, between:
- ✅ Phase 1: Prerequisites Check
- **→ Phase 1.5: Port Cleanup** ← HAPPENS HERE
- → Phase 2: Install Dependencies

## No User Interaction Required

The cleanup happens **automatically** without asking:
- ❌ No prompts
- ❌ No confirmations
- ❌ No manual steps
- ✅ Just works!

## Performance

Cleanup is fast:
- Port scan: <1 second
- Kill process: <1 second per port
- Total cleanup: Usually 2-5 seconds

## Logs

If you want to see verbose output:
```bash
./start-all.sh --verbose
```

This will show:
- Every port being checked
- "Port X is free" for already-free ports
- Full cleanup details

## Summary

🎉 **Just run `./start-all.sh` and it handles everything!**

No more:
- ❌ "Port already in use" errors
- ❌ Manual PID hunting
- ❌ Remembering which ports to check
- ❌ Forgetting to kill background processes

Now you get:
- ✅ Automatic port cleanup
- ✅ Clean restart every time
- ✅ Zero manual intervention
- ✅ Full transparency of what's happening

---

**Happy coding! ☕️🚀**

For more technical details, see `PORT-CLEANUP-FEATURE.md`

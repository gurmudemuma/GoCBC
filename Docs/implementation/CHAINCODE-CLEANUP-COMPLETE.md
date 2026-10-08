# Chaincode Package Cleanup - Complete

**Date**: October 7, 2026  
**Status**: ✅ IMPLEMENTED

## Problem

67 old chaincode packages cluttering `/home/guda/GoCBC/chaincodes/coffee/`:
- coffee_1.0.tgz through coffee_1.97.tgz
- Various .tar.gz files (legacy format)
- Taking up disk space
- Making it confusing which version is current

## Solution Implemented

### Updated `deploy-chaincode.sh`

Added automatic cleanup BEFORE packaging new version:

```bash
# Clean up old chaincode packages before creating new one
echo "Cleaning old chaincode packages..."
cd chaincodes/coffee
OLD_COUNT=$(ls -1 coffee_*.{tgz,tar.gz} 2>/dev/null | wc -l)
if [ "$OLD_COUNT" -gt 2 ]; then
    echo "  Found $OLD_COUNT old packages, keeping only 2 most recent..."
    # Keep only 2 most recent .tgz files
    ls -t coffee_*.tgz 2>/dev/null | tail -n +3 | xargs -r rm -f
    # Remove all .tar.gz files (legacy)
    ls -t coffee_*.tar.gz 2>/dev/null | xargs -r rm -f
    NEW_COUNT=$(ls -1 coffee_*.tgz 2>/dev/null | wc -l)
    echo "  ✅ Cleaned $((OLD_COUNT - NEW_COUNT)) old packages"
else
    echo "  ✅ Only $OLD_COUNT packages found, no cleanup needed"
fi
cd ../..
```

## How It Works

1. **Before packaging**: Counts existing packages
2. **If more than 2**: 
   - Keeps 2 most recent .tgz files (current + previous)
   - Removes all older .tgz files
   - Removes ALL .tar.gz files (old format)
3. **Then**: Creates new package
4. **Result**: Never more than 2-3 packages at a time

## Benefits

✅ **Automatic**: No manual cleanup needed  
✅ **Safe**: Keeps current + 1 backup  
✅ **Clean**: Removes old formats (.tar.gz)  
✅ **Efficient**: Runs every deployment  
✅ **Expert**: Professional package management

## Manual Cleanup (If Needed)

If you want to clean up now before next deployment:

```bash
cd /home/guda/GoCBC/chaincodes/coffee

# Remove all but 2 most recent
ls -t coffee_*.tgz | tail -n +3 | xargs -r rm -f

# Remove old format
rm -f coffee_*.tar.gz

# Check what's left
ls -lh coffee_*.tgz
```

## File Modified

**`/home/guda/GoCBC/deploy-chaincode.sh`**
- Added cleanup before line 64 (packaging section)
- Keeps only 2 most recent packages
- Removes legacy .tar.gz files

## Next Deployment

When you run `./start-all.sh` or `./deploy-chaincode.sh`, it will:

1. Check for old packages
2. Clean up automatically
3. Show how many were removed
4. Create new package
5. Leave only 2-3 packages total

## Example Output

```
Cleaning old chaincode packages...
  Found 67 old packages, keeping only 2 most recent...
  ✅ Cleaned 65 old packages

Building CCAAS chaincode package...
✅ CCAAS Package created: coffee_1.0.tgz
```

## Why Keep 2 Packages?

1. **Current version**: Active deployment
2. **Previous version**: Quick rollback if needed
3. **Older versions**: Not needed (can rebuild from git if necessary)

## Production Consideration

In production, you might want to:
- Keep more versions (last 5)
- Archive to separate location
- Track versions in database
- Use proper version control

For development, keeping 2 is perfect.

---

**Status**: ✅ Implemented and ready  
**Testing**: Will clean on next deployment  
**Impact**: Saves disk space, cleaner directory

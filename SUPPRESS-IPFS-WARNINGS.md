# Suppress IPFS Warnings (Optional)

## The warnings are harmless but if you want to suppress them:

### Option 1: Disable mDNS (Simplest)

Edit IPFS config to disable local peer discovery:

```bash
# Stop IPFS first
ipfs shutdown

# Disable mDNS
ipfs config --json Discovery.MDNS.Enabled false

# Start IPFS again
ipfs daemon
```

**Result**: No more mDNS warnings

---

### Option 2: Ignore Version Warning

The version warning appears once per day. To suppress:

```bash
ipfs config --json Version.SwarmCheckEnabled false
```

---

### Option 3: Keep Warnings (Recommended)

**Why keep them:**
- They're informational, not errors
- mDNS warnings don't affect document storage
- Version warnings remind you to update eventually
- Helps with troubleshooting if issues arise

**Your system works perfectly with these warnings**

---

## Verify IPFS is Working

Test that IPFS can store documents:

```bash
# Test file upload
echo "test document" > test.txt
ipfs add test.txt

# Should return:
# added QmXXXXX... test.txt

# Test retrieval
ipfs cat QmXXXXX...

# Should show: test document
```

---

## Current Configuration

Your documentStorageService is configured to:
1. **Try IPFS** if `USE_IPFS=true` in .env
2. **Fallback to local storage** if IPFS unavailable
3. **Always encrypt** sensitive documents
4. **Store hash on blockchain** for verification

The warnings don't affect any of this functionality.

---

## Recommendation

✅ **IGNORE THE WARNINGS**

They're cosmetic and don't impact:
- Document upload
- Document storage
- Document retrieval
- Blockchain integration
- System performance

Focus on testing the actual document upload workflow instead!

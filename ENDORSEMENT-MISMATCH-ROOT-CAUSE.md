# Endorsement Mismatch Root Cause Analysis

**Error**: `ProposalResponsePayloads do not match`

## Root Cause

The error occurs because **peers have inconsistent ledger state** when trying to commit chaincode. Different peers return different sequence numbers during the commit proposal:

- Some peers: sequence `0x1b` (27 in decimal)
- Other peers: different sequences (`0xce`, `0xcf`, `0xd0`, `0xd1`, `0xd2`, `0xd3`)

This happens when:
1. Network is restarted with existing volumes (old ledger data)
2. Channel is recreated but ledger state is inconsistent  
3. Different organizations have different approval history

## The Problem with Current deploy-chaincode.sh

Current script:
```bash
# Detects "latest" version dynamically
# BUT: Doesn't clean inconsistent state
# Result: Peers have different histories
```

## Expert Solution

### Option 1: Clean Restart (Recommended)
```bash
# 1. Stop everything
./stop-all.sh

# 2. Clean ALL ledger data
docker-compose -f docker-compose-fabric.yml down -v

# 3. Start from scratch
./start-all.sh
```

### Option 2: Fix deploy-chaincode.sh
Add state validation before approval:
```bash
# Before approving, check all peers are at same sequence
# If not: ERROR and require clean restart
```

##Fix Implemented

Updated `deploy-chaincode.sh` to:
1. ✅ Check if channel exists
2. ✅ Check peer consistency
3. ✅ Fail fast if inconsistent
4. ✅ Require explicit sequence parameter
5. ✅ Validate all orgs before commit

## Prevention

To prevent this in production:
1. **Never** restart network without cleaning volumes if state is inconsistent
2. **Always** use sequence management carefully
3. **Monitor** peer synchronization
4. **Backup** ledger before upgrades
5. **Test** in staging first

## Immediate Fix

```bash
cd /home/guda/GoCBC
./stop-all.sh
docker-compose -f docker-compose-fabric.yml down -v
./start-all.sh
```

This ensures ALL peers start with IDENTICAL state.

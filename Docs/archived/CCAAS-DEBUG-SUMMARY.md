# CCAAS Chaincode Deployment Debugging Summary

## Date: October 1, 2026
## Status: CCAAS gRPC Connection FAILING

---

## Problem Statement

Hyperledger Fabric peers are timing out (5 minutes) when trying to invoke chaincode deployed via CCAAS (Chaincode as a Service) external builder. The chaincode server starts successfully and listens on port 9999, but NO gRPC connections are ever established from the peers.

---

## Environment

- **Fabric Version**: v2.5.16 (Fabric 2.5 peer image)
- **Chaincode Shim**: fabric-chaincode-go v0.0.0-20230228194215-b84622ba6a7a (2023)
- **Chaincode Library**: fabric-contract-api-go v1.2.1
- **Network**: cecbs-network (Docker bridge network)
- **Organizations**: 6 orgs (ECTA, ECX, Banks, NBE, Customs, Shipping)
- **Channel**: coffeechannel

---

## What Works ✓

1. **External Builder Scripts**: All 4 scripts (detect, build, release, run) execute successfully
2. **Connection.json Extraction**: Peers correctly extract connection.json from CCAAS package
3. **Chaincode Container**: Starts and runs without errors
4. **gRPC Server Creation**: `shim.ChaincodeServer` successfully creates listening socket on 0.0.0.0:9999
5. **Network Connectivity**: Both chaincode and peers are on same Docker network (cecbs-network)
6. **DNS Resolution**: Chaincode container resolves as "coffee-chaincode" in network
7. **Run Script Persistence**: External builder run script stays alive (infinite loop)
8. **Chaincode Approval**: All 6 orgs approve and commit chaincode definition successfully

---

## What Fails ✗

1. **gRPC Connection**: Peers never establish gRPC connection to chaincode:9999
2. **Chaincode Registration**: Timeout after 300 seconds (5 minutes)
3. **Transaction Execution**: All contract creation attempts fail with "chaincode registration failed"

---

## Evidence from Logs

### Peer Logs (peer0.ecta.cecbs.et)
```
[INFO] RUN: CCAAS chaincode is already running externally at coffee-chaincode:9999
[INFO] RUN: Chaincode registered, keeping run script alive
... 5 minutes later ...
[WARN] could not launch chaincode: timeout expired while starting chaincode
[ERROR] failed to invoke chaincode coffee, error: chaincode registration failed: timeout
```

### Chaincode Logs (coffee-chaincode container)
```
2026/10/01 20:18:20 Starting Coffee Chaincode (CCAAS Server Mode) 
2026/10/01 20:18:20 CCID: coffee_1.8:4f2b5772badc5bd71e2ae5a94d50e7e09d863e9a7a02f41eaad646790fe56007
2026/10/01 20:18:20 Address: 0.0.0.0:9999
2026/10/01 20:18:20 Chaincode: &{...} [200+ functions listed]
[THEN server.Start() is called and blocks - NO CONNECTION ATTEMPTS LOGGED]
```

**Key Observation**: server.Start() blocks indefinitely waiting for connections that NEVER arrive.

### Connection.json (Verified in Peer)
```json
{
  "address": "coffee-chaincode:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
```

Also tried with IP address (172.18.0.6:9999) - SAME RESULT.

---

## Deployment History

### Versions Deployed
- **v1.5 - v1.6**: CCAAS without proper connection.json structure
- **v1.7**: First version with correct connection.json (hostname)
- **v1.8**: Current version with connection.json (IP address)

All versions show identical behavior: timeout after 5 minutes.

---

## Debugging Steps Attempted

1. ✓ Verified external builder scripts exist and execute
2. ✓ Verified connection.json is extracted correctly
3. ✓ Checked network connectivity (same Docker network)
4. ✓ Verified DNS resolution works
5. ✓ Tried both hostname and IP address in connection.json
6. ✓ Added maximum gRPC verbosity logging
7. ✓ Verified chaincode binary is properly compiled
8. ✓ Confirmed TLS is disabled in both chaincode and connection.json
9. ✓ Checked peer environment variables (CCAAS builder enabled)
10. ✓ Verified Fabric version compatibility (2.5 supports CCAAS)
11. ✗ NO GRPC CONNECTION ATTEMPTS APPEAR IN ANY LOGS

---

## Root Cause Analysis

The issue appears to be that Fabric 2.5 peers, after executing the external builder "run" script, are NOT actually attempting to dial the chaincode at the address specified in connection.json.

### Possible Causes:

1. **CCAAS Mode Mismatch**: Fabric 2.5 might expect a different CCAAS implementation
   - Possibility: Peer expects chaincode to connect TO it (not vice versa)
   - Fabric docs are ambiguous about direction of connection

2. **Missing Peer Configuration**: Additional peer configuration might be required
   - `core.yaml` might need specific CCAAS settings beyond external builder

3. **gRPC Protocol Issue**: Version mismatch between peer's gRPC client and chaincode's gRPC server
   - Fabric 2.5 uses specific gRPC version
   - Chaincode compiled with fabric-chaincode-go from 2023

4. **External Builder Lifecycle**: Run script completes successfully, but peer doesn't proceed to "dial" phase
   - Run script creates PID file correctly
   - But peer never transitions to connecting

---

## Recommended Solutions

### Option A: Switch to Traditional Chaincode Deployment (RECOMMENDED)

**Pros:**
- Well-tested, proven approach
- Fabric manages chaincode lifecycle automatically
- No external builder complexity
- Works out-of-box with Fabric 2.5

**Cons:**
- Peers need to have Go compiler and build tools
- Slower deployment (compilation on each peer)
- Less control over chaincode environment

**Implementation:**
1. Package chaincode source code (not pre-built binary)
2. Remove connection.json
3. Let Fabric peers build and launch chaincode automatically

### Option B: Investigate Fabric 2.5 CCAAS Requirements

**Actions:**
1. Check Fabric 2.5 release notes for CCAAS changes
2. Review Fabric test-network CCAAS examples
3. Check if additional peer configuration is needed
4. Verify if `shim.ChaincodeServer` is correct approach for Fabric 2.5

### Option C: Hybrid Approach - Docker-based Traditional Deployment

**Description:**
- Use Docker-based chaincode deployment
- Let Fabric manage Docker lifecycle
- Don't use external CCAAS builder

---

## Next Steps

### Immediate (Option A):
1. Create traditional chaincode package (source code)
2. Deploy using standard `peer lifecycle chaincode install`
3. Test end-to-end workflow

### Alternative (Option B):
1. Search Hyperledger Fabric GitHub for v2.5 CCAAS examples
2. Check fabric-samples repository for working CCAAS implementations
3. Compare our implementation with official examples
4. Identify any missing configuration or code changes

---

## Files Modified for CCAAS Attempt

- `/home/guda/GoCBC/chaincodes/coffee/main.go` - Added CCAAS server mode
- `/home/guda/GoCBC/builders/ccaas/bin/*` - External builder scripts
- `/home/guda/GoCBC/coffee_1.7.tgz` - CCAAS package with connection.json (hostname)
- `/home/guda/GoCBC/coffee_1.8.tgz` - CCAAS package with connection.json (IP)
- `/home/guda/GoCBC/deploy-chaincode.sh` - Auto-deployment script

---

## Conclusion

After extensive debugging, CCAAS deployment with external chaincode is not working with our Fabric 2.5 setup. The chaincode server starts correctly, but Fabric peers never attempt to connect to it. 

**Recommendation**: Switch to traditional chaincode deployment to unblock end-to-end testing. CCAAS can be revisited later if pre-built binary deployment is required.

---

## Contact & References

- Fabric CCAAS Docs: https://hyperledger-fabric.readthedocs.io/en/release-2.5/cc_launcher.html
- Fabric GitHub Issues: Search "CCAAS" + "timeout" + "v2.5"
- Test Network CCAAS: fabric-samples/test-network/ccaas


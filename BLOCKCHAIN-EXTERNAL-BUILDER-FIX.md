# Blockchain External Builder Configuration - FIXED

## Date: October 23, 2026

## Problem Identified
The chaincode connection timeout was caused by missing **external builder configuration** for Chaincode-as-a-Service (CCAAS) deployment pattern.

## Root Cause
Hyperledger Fabric 2.5 peers need explicit external builder configuration to connect to chaincode containers running as services. Without this:
- Peer cannot detect CCAAS packages (containing connection.json)
- Peer cannot build/release the chaincode metadata
- Connection to chaincode:9999 times out despite network connectivity

## Solution Implemented

### 1. Created External Builder Scripts
Created `/home/guda/GoCBC/builders/ccaas/bin/` with three scripts:

**detect** - Identifies CCAAS packages by checking for connection.json:
```bash
#!/bin/bash
set -euo pipefail
METADIR=$2
if [ -f "$METADIR/connection.json" ]; then
   exit 0
fi
exit 1
```

**build** - Copies package metadata to build output:
```bash
#!/bin/bash
set -euo pipefail
BUILD_OUTPUT_DIR=$3
cp -a $2/* $BUILD_OUTPUT_DIR/
exit 0
```

**release** - Copies build output to release directory:
```bash
#!/bin/bash
set -euo pipefail
BUILD_OUTPUT_DIR=$2
RELEASE_OUTPUT_DIR=$3
cp -a $BUILD_OUTPUT_DIR/* $RELEASE_OUTPUT_DIR/
exit 0
```

### 2. Created core.yaml Configuration
Created `/home/guda/GoCBC/config/core.yaml`:
```yaml
chaincode:
  externalBuilders:
    - name: ccaas_builder
      path: /builders/ccaas
      propagateEnvironment:
        - CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG
```

### 3. Updated docker-compose-fabric.yml
Added to ALL peer services:

**Environment variables:**
```yaml
- CORE_CHAINCODE_BUILDER=ccaas_builder
- CORE_CHAINCODE_EXTERNALBUILDERS=[{name: ccaas_builder, path: /builders/ccaas, propagateEnvironment: [CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG]}]
```

**Volume mounts:**
```yaml
volumes:
  - ./builders:/builders
  - ./config/core.yaml:/etc/hyperledger/fabric/core.yaml
```

### 4. Made Scripts Executable
```bash
chmod +x /home/guda/GoCBC/builders/ccaas/bin/*
```

### 5. Restarted All Containers
```bash
docker-compose -f /home/guda/GoCBC/docker-compose-fabric.yml down
docker-compose -f /home/guda/GoCBC/docker-compose-fabric.yml up -d
```

## Current Status

### ✅ Completed
1. External builder scripts created and made executable
2. Configuration files created (core.yaml)
3. All 6 peer configurations updated with external builder support
4. Containers restarted with new configuration
5. Builders directory properly mounted in all peers
6. Chaincode invoke command executed without connection timeout

### 🔄 In Progress
- Verifying chaincode transactions are being recorded
- Testing query operations
- Validating blockchain state

## Next Steps

1. **Verify initLedger Success**
   ```bash
   docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
       -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
       peer0.ecta.cecbs.et peer chaincode query \
       -C coffeechannel -n coffee \
       -c '{"function":"getAllCoffee","Args":[]}'
   ```

2. **Check Channel Height**
   ```bash
   docker exec peer0.ecta.cecbs.et peer channel getinfo -c coffeechannel
   ```

3. **Test Transaction Creation**
   ```bash
   docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
       -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
       peer0.ecta.cecbs.et peer chaincode invoke \
       -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
       --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
       -C coffeechannel -n coffee \
       --peerAddresses peer0.ecta.cecbs.et:7051 \
       --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
       --peerAddresses peer0.nbe.cecbs.et:10051 \
       --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
       -c '{"function":"createCoffee","Args":["TEST001","100","Yirgacheffe","Ethiopia","Washed","Arabica","ECTA","Available"]}' \
       --waitForEvent
   ```

4. **Integrate with Web Portals**
   - Update portal backends to use User1 client identity (not Admin)
   - Configure MSP paths: `/etc/hyperledger/fabric/users/User1@<org>.cecbs.et/msp`
   - Test each portal's blockchain integration

## Technical Notes

### Why External Builder is Required
- **CCAAS Pattern**: Chaincode runs as external service, not inside peer
- **Package Format**: Contains connection.json instead of compiled code
- **Detection**: Peer needs custom logic to identify CCAAS packages
- **Connection**: Peer uses connection.json to dial chaincode gRPC endpoint

### Affected Peers
All 6 organizational peers updated:
- peer0.ecta.cecbs.et (ECTA)
- peer0.ecx.cecbs.et (ECX)  
- peer0.banks.cecbs.et (Banks)
- peer0.nbe.cecbs.et (NBE)
- peer0.customs.cecbs.et (Customs)
- peer0.shipping.cecbs.et (Shipping)

### Key Files
- External builders: `/home/guda/GoCBC/builders/ccaas/bin/*`
- Core config: `/home/guda/GoCBC/config/core.yaml`
- Docker compose: `/home/guda/GoCBC/docker-compose-fabric.yml`
- Test script: `/home/guda/GoCBC/test-blockchain.sh`

## References
- Hyperledger Fabric Documentation: External Builders and Launchers
- CCAAS Deployment Pattern: https://hyperledger-fabric.readthedocs.io/en/release-2.5/cc_service.html
- GitHub Sample: fabric-samples/asset-transfer-basic/chaincode-external

---
**Status**: External builder configuration complete. Chaincode connection established. Ready for transaction testing.

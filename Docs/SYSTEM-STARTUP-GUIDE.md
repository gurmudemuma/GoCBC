# GoCBC System Startup Guide

## Quick Start

```bash
# Start entire system (blockchain + portals)
./start-all.sh

# Stop entire system  
./stop-all.sh
```

## System Architecture

### Blockchain Layer (Hyperledger Fabric 2.5)
- **1 Orderer**: orderer.cecbs.et (Port 7050)
- **6 Organizational Peers**:
  - peer0.ecta.cecbs.et (Port 7051)
  - peer0.ecx.cecbs.et (Port 8051)
  - peer0.banks.cecbs.et (Port 9051)
  - peer0.nbe.cecbs.et (Port 10051)
  - peer0.customs.cecbs.et (Port 11051)
  - peer0.shipping.cecbs.et (Port 12051)
- **1 Chaincode Container**: coffee-chaincode (Port 9999)
- **6 CouchDB Instances**: State databases for each peer

### Application Layer
- **7 Web Portals**: Next.js applications (Ports 3001-3007)
  - ECTA Portal (3001) - Ethiopian Coffee & Tea Authority
  - ECX Portal (3002) - Ethiopia Commodity Exchange
  - Banks Portal (3003) - Banking institutions
  - NBE Portal (3004) - National Bank of Ethiopia
  - Customs Portal (3005) - Ethiopian Customs Authority
  - Shipping Portal (3006) - Shipping companies
  - Exporters Portal (3007) - Coffee exporters

### Support Services
- **PostgreSQL**: Relational database (Port 5432)
- **Redis**: Cache and session store (Port 6379)
- **Kafka**: Event streaming (Port 9092)
- **Zookeeper**: Kafka coordination (Port 2181)

## Critical Configuration

### External Builder for Chaincode-as-a-Service

The blockchain uses **Chaincode-as-a-Service** (CCAAS) deployment pattern instead of traditional Docker-based chaincode. This requires:

1. **External Builder Scripts** (`/home/guda/GoCBC/builders/ccaas/bin/`):
   - `detect`: Identifies CCAAS packages by checking for connection.json
   - `build`: Copies package metadata to build directory
   - `release`: Copies built package to release directory

2. **Core Configuration** (each peer's `core.yaml`):
   ```yaml
   chaincode:
       externalBuilders:
          - name: ccaas_builder
            path: /builders/ccaas
            propagateEnvironment:
              - CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG
   ```

3. **Docker Volume Mounts** (in `docker-compose-fabric.yml`):
   - `./builders:/builders` - External builder scripts
   - Peer organization directories mounted to `/etc/hyperledger/fabric`

### MSP Identity for Chaincode Invocation

**IMPORTANT**: Chaincode operations must use **client** identities, NOT admin or peer identities.

❌ **Wrong**: `Admin@ecta.cecbs.et/msp`  
✅ **Correct**: `User1@ecta.cecbs.et/msp`

Reason: Channel Writers policy requires `ECTAMSP.admin` or `ECTAMSP.client` roles. Peer identities are excluded from direct chaincode invocation.

## Manual Startup Steps

If `start-all.sh` doesn't work, follow these steps:

### 1. Start Blockchain Infrastructure

```bash
cd /home/guda/GoCBC

# Ensure external builders exist
mkdir -p builders/ccaas/bin
chmod +x builders/ccaas/bin/*

# Start containers
docker-compose -f docker-compose-fabric.yml up -d

# Wait for startup
sleep 15

# Verify
docker ps | grep -E "(peer|orderer|chaincode)"
```

### 2. Join Orderer to Channel (if needed)

```bash
# Check if orderer has channel
docker exec orderer.cecbs.et osnadmin channel list \
  -o localhost:7053 \
  --ca-file /var/hyperledger/orderer/tls/ca.crt \
  --client-cert /var/hyperledger/orderer/tls/server.crt \
  --client-key /var/hyperledger/orderer/tls/server.key

# If not, join using Python script
python3 join-orderer.py
```

### 3. Deploy Chaincode (if needed)

```bash
# Check if chaincode is committed
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel

# If not, run deployment
./FINAL-CHAINCODE-DEPLOY.sh
```

### 4. Test Chaincode

```bash
# Test invoke
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
    -c '{"function":"initLedger","Args":[]}' \
    --waitForEvent
```

### 5. Start Web Portals

```bash
# Start each portal in background
cd ecta-portal && npm run dev > /tmp/ecta-portal.log 2>&1 &
cd ../ecx-portal && npm run dev > /tmp/ecx-portal.log 2>&1 &
cd ../banks-portal && npm run dev > /tmp/banks-portal.log 2>&1 &
cd ../nbe-portal && npm run dev > /tmp/nbe-portal.log 2>&1 &
cd ../customs-portal && npm run dev > /tmp/customs-portal.log 2>&1 &
cd ../shipping-portal && npm run dev > /tmp/shipping-portal.log 2>&1 &
cd ../exporters-portal && npm run dev > /tmp/exporters-portal.log 2>&1 &
```

## Troubleshooting

### Peers Not Starting

**Symptom**: Peers exit with code 1  
**Cause**: Missing or incorrect core.yaml  
**Solution**:
```bash
# Ensure minimal core.yaml exists
cat > minimal-core.yaml << 'EOF'
chaincode:
    externalBuilders:
       - name: ccaas_builder
         path: /builders/ccaas
         propagateEnvironment:
           - CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG
EOF

# Copy to all peers
for peer_dir in blockchain/organizations/peerOrganizations/*/peers/peer0.*/; do
    cp minimal-core.yaml "${peer_dir}core.yaml"
done

# Restart peers
docker-compose -f docker-compose-fabric.yml restart \
    peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et \
    peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et
```

### Chaincode Connection Timeout

**Symptom**: `error cannot create connection... context deadline exceeded`  
**Cause**: External builder not configured  
**Solution**: Follow "Peers Not Starting" fix above

### ACL Policy Failure

**Symptom**: `implicit policy evaluation failed - 0 sub-policies were satisfied`  
**Cause**: Using Admin or peer MSP instead of client MSP  
**Solution**: Always use `User1@<org>.cecbs.et/msp` for chaincode operations

### Orderer Not in Channel

**Symptom**: `NOT_FOUND` when fetching blocks  
**Cause**: Orderer not joined via Channel Participation API  
**Solution**:
```bash
python3 join-orderer.py
```

### Portals Not Connecting to Blockchain

**Symptom**: Portal shows connection errors  
**Cause**: Backend using wrong MSP or incorrect TLS certificates  
**Solution**:
1. Update portal backend to use `User1@<org>.cecbs.et/msp`
2. Verify TLS certificate paths in portal configuration
3. Check peer endpoints are accessible from portal container

## Key Files

- `start-all.sh` - Complete system startup
- `stop-all.sh` - Complete system shutdown  
- `docker-compose-fabric.yml` - Container orchestration
- `join-orderer.py` - Orderer channel join (Python)
- `FINAL-CHAINCODE-DEPLOY.sh` - Chaincode deployment
- `minimal-core.yaml` - Peer external builder config
- `builders/ccaas/bin/*` - External builder scripts
- `blockchain/channel-artifacts/coffeechannel_genesis.block` - Genesis block
- `blockchain/channel-artifacts/coffee_1.73.tgz` - Chaincode package
- `chaincodes/coffee/connection.json` - Chaincode connection info

## Monitoring

```bash
# View all container logs
docker-compose -f docker-compose-fabric.yml logs -f

# View specific peer
docker logs peer0.ecta.cecbs.et -f

# View chaincode logs
docker logs coffee-chaincode -f

# View portal logs
tail -f /tmp/*-portal.log

# Check channel height
docker exec peer0.ecta.cecbs.et peer channel getinfo -c coffeechannel

# Query committed chaincode
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel
```

## System Verification Checklist

- [ ] All 18 containers running (6 peers, 1 orderer, 1 chaincode, 6 CouchDB, 4 support)
- [ ] Orderer joined to coffeechannel
- [ ] All peers joined to coffeechannel
- [ ] Chaincode committed with 100% approval
- [ ] External builders configured on all peers
- [ ] Chaincode invoke succeeds without timeout
- [ ] All 7 portals accessible via browser
- [ ] Portal blockchain integration working

## Production Considerations

1. **Security**:
   - Change default CouchDB passwords
   - Enable TLS for all portal communications
   - Implement proper authentication/authorization
   - Secure private keys with HSM

2. **Performance**:
   - Increase peer resources (CPU/RAM)
   - Configure block cutting parameters
   - Optimize chaincode queries
   - Implement caching layer

3. **Monitoring**:
   - Set up Prometheus metrics
   - Configure log aggregation (ELK/Splunk)
   - Implement health checks
   - Set up alerting

4. **Backup**:
   - Regular blockchain state backup
   - Database backups
   - Configuration version control
   - Disaster recovery plan

---

**Last Updated**: October 23, 2026  
**Version**: 1.0  
**Status**: Development Environment

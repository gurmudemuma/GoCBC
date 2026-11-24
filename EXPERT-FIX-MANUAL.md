# Expert Fix: Manual Steps

The issue is that containers are restarting in the wrong order, causing the orderer to not be ready when peers try to connect.

## Run These Commands in Order

```bash
cd /home/guda/GoCBC

# 1. Stop everything
docker compose -f docker-compose-fabric.yml down
sleep 5

# 2. Start databases first
docker compose -f docker-compose-fabric.yml up -d cecbs-postgres cecbs-redis
sleep 10

# 3. Start CouchDB instances
docker compose -f docker-compose-fabric.yml up -d \
    couchdb.ecta couchdb.ecx couchdb.banks \
    couchdb.nbe couchdb.customs couchdb.shipping
sleep 10

# 4. Start orderer ALONE and wait
docker compose -f docker-compose-fabric.yml up -d orderer.cecbs.et
echo "Waiting 30s for orderer..."
sleep 30

# 5. Verify orderer is ready
docker logs orderer.cecbs.et 2>&1 | tail -20 | grep "Beginning to serve"

# 6. Start ALL peers together
docker compose -f docker-compose-fabric.yml up -d \
    peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et \
    peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et
sleep 20

# 7. Start chaincode server
docker compose -f docker-compose-fabric.yml up -d coffee-chaincode
sleep 15

# 8. Start API
docker compose -f docker-compose-fabric.yml up -d cecbs-api
sleep 10

# 9. TEST
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee -c '{"Args":["QueryAllExporters"]}'
```

## Expected Result

You should see: `[]` (empty array of exporters)

## If Still Failing

Check these logs:

```bash
# Orderer
docker logs orderer.cecbs.et --tail 30

# Peer
docker logs peer0.ecta.cecbs.et --tail 30 | grep -i error

# Chaincode
docker logs coffee-chaincode --tail 30
```

## Why This Works

1. **Orderer First**: Must be fully ready before peers connect
2. **30s Wait**: Orderer needs time to initialize the channel
3. **Peers Together**: All peers start after orderer is ready
4. **Chaincode Last**: Server registers after peers are connected
5. **Proper Order**: Eliminates `SERVICE_UNAVAILABLE` errors

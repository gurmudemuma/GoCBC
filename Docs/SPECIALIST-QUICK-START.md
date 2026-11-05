# Hyperledger Fabric Specialist - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Check Current State
```bash
cd /home/guda/GoCBC

# View all running containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check if peers are in channel
docker exec peer0.ecta.cecbs.et peer channel list
docker exec peer0.nbe.cecbs.et peer channel list
docker exec peer0.banks.cecbs.et peer channel list

# Check chaincode installed
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
```

### 2. Review Key Configuration Files
```bash
# Orderer configuration
cat blockchain/configtx.yaml

# Peer configuration (check one peer)
docker exec peer0.ecta.cecbs.et cat /etc/hyperledger/fabric/core.yaml | grep -A 20 "msp:"

# MSP config
cat blockchain/organizations/peerOrganizations/ecta.cecbs.et/msp/config.yaml
```

### 3. Test Orderer Connectivity
```bash
# From peer container
docker exec peer0.ecta.cecbs.et \
  peer channel fetch config /tmp/test.block \
  -o orderer.cecbs.et:7050 \
  -c coffeechannel
```

### 4. Check Orderer Logs
```bash
docker logs orderer.cecbs.et 2>&1 | tail -100
```

---

## 🎯 Your Mission

**Fix these 3 issues:**
1. Orderer not accepting transactions (system channel error)
2. MSP admin identity not recognized after restart
3. Complete chaincode approval + commit

**When fixed, this should work:**
```bash
docker exec peer0.ecta.cecbs.et \
  peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"queryAllCoffee","Args":[]}'
```

---

## 🔑 Critical Paths

### Package ID
```
coffee_1.73:1a98e2ff3a0091d86552052d62684f2f861f9bef69a6ce218e79540245c5438b
```

### Chaincode Package
```
/home/guda/GoCBC/blockchain/channel-artifacts/coffee_1.73.tgz
```

### Organizations
- ECTA (peer0.ecta.cecbs.et:7051)
- NBE (peer0.nbe.cecbs.et:10051)
- Banks (peer0.banks.cecbs.et:9051)
- ECX (peer0.ecx.cecbs.et:8051) - not joined yet
- Customs (peer0.customs.cecbs.et:11051) - not joined yet
- Shipping (peer0.shipping.cecbs.et:12051) - not joined yet

### Orderer
- orderer.cecbs.et:7050

### Channel
- coffeechannel

---

## 📝 Quick Approval Commands (for after fix)

```bash
# Set package ID
export PACKAGE_ID="coffee_1.73:1a98e2ff3a0091d86552052d62684f2f861f9bef69a6ce218e79540245c5438b"

# Approve for ECTA
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
  -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --package-id $PACKAGE_ID \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Approve for NBE
docker exec \
  -e CORE_PEER_LOCALMSPID=NBEMSP \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
  -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
  peer0.nbe.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --package-id $PACKAGE_ID \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Approve for Banks
docker exec \
  -e CORE_PEER_LOCALMSPID=BanksMSP \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
  -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 \
  peer0.banks.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --package-id $PACKAGE_ID \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Check commit readiness
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1

# Commit chaincode
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
  -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt
```

---

## 🐛 Common Issues You'll Likely Find

### 1. Orderer Genesis Block Wrong Type
- **Symptom:** "system channel not defined" error
- **Fix:** Orderer needs to be bootstrapped without system channel for Fabric 2.5
- **Check:** `docker logs orderer.cecbs.et | grep -i "system"`

### 2. MSP config.yaml Not Mounted
- **Symptom:** Admin OU not recognized after restart
- **Fix:** Add config.yaml to volume mounts in docker-compose-fabric.yml
- **Check:** `docker exec peer0.ecta.cecbs.et cat /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp/config.yaml`

### 3. TLS Certificate Mismatch
- **Symptom:** Connection timeout or TLS handshake errors
- **Fix:** Verify orderer TLS cert in peer's orderer tlscacerts
- **Check:** Orderer logs for TLS errors

---

## 📊 Verification Checklist

When you're done, verify:

- [ ] Orderer accepting transactions without system channel error
- [ ] MSP admin identities recognized after `docker restart peer0.ecta.cecbs.et`
- [ ] Chaincode approved for 3 orgs: `peer lifecycle chaincode queryapproved`
- [ ] Chaincode committed: `peer lifecycle chaincode querycommitted`
- [ ] Query works: `peer chaincode query -C coffeechannel -n coffee -c '{"function":"queryAllCoffee","Args":[]}'`
- [ ] Invoke works: Test transaction succeeds

---

## 💡 Pro Tips

1. **Don't regenerate crypto** - Current crypto is fine, MSPs are properly configured
2. **Focus on orderer** - It's the bottleneck, not the peers
3. **Check orderer genesis block** - Likely created with wrong method for Fabric 2.5
4. **Mount config.yaml** - Add to docker-compose volumes for persistence
5. **Use osnadmin** - May need osnadmin channel join for Fabric 2.5 orderer

---

## 📧 Report Back

When complete, provide:
1. What was wrong (root cause)
2. What you changed (files modified)
3. Verification output (query result)
4. Time spent
5. Invoice details

---

**Ready? Let's do this! 🚀**

# Hyperledger Fabric 2.5 Deployment Issue - Technical Brief

## 🎯 Objective
Complete the chaincode approval and commit process for a Hyperledger Fabric 2.5 network with 6 organizations on application channel `coffeechannel`.

**Estimated Time:** 4-6 hours  
**Compensation:** $500-1000 (negotiable based on expertise)  
**Urgency:** High - blocking production deployment

---

## 📋 Current Status

### ✅ What's Working
- 6 peer organizations (ECTA, ECX, Banks, NBE, Customs, Shipping)
- 1 orderer node (etcdraft consensus)
- Channel created: coffeechannel
- 3 peers joined to channel
- Chaincode installed on all 3 peers
- Package ID: coffee_1.73:1a98e2ff3a0091d86552052d62684f2f861f9bef69a6ce218e79540245c5438b

### ❌ What's Broken
- Chaincode approval fails
- Chaincode commit fails
- MSP admin identity not recognized after restart
- Orderer connection timeouts

---

## 🔴 Primary Error Messages

### Error 1: System Channel Issue
```
Error: failed to send transaction: got unexpected status: BAD_REQUEST 
-- channel creation request not allowed because the orderer system 
channel is not defined
```

### Error 2: MSP OU Admin Not Recognized
```
Error: Failed verifying that proposal's creator satisfies local MSP 
principal: The identity does not contain OU [ADMIN]
```

### Error 3: Orderer Connection Timeout
```
Error: failed to connect to orderer.cecbs.et:7050: context deadline exceeded
```

---

## 🛠️ What Needs To Be Fixed

1. **Configure Orderer for Fabric 2.5 Application Channels**
   - Enable orderer to process transactions without system channel
   - Join orderer to coffeechannel properly

2. **Fix MSP NodeOU Persistence**
   - Ensure admin identities recognized after restart
   - Mount config.yaml files correctly

3. **Approve and Commit Chaincode**
   - Approve for 3 orgs (ECTA, NBE, Banks)
   - Commit to channel
   - Verify with query

---

## ✅ Success Criteria

This command returns `[]` without errors:
```bash
docker exec peer0.ecta.cecbs.et \
  peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"queryAllCoffee","Args":[]}'
```

---

## 📁 All Files Located At
`/home/guda/GoCBC/`

- `blockchain/configtx.yaml` - Channel configuration
- `blockchain/crypto-config.yaml` - Cryptogen config
- `docker-compose-fabric.yml` - Container definitions
- `blockchain/organizations/` - All crypto material
- `HYPERLEDGER-FABRIC-SPECIALIST-BRIEF.md` - Full technical details

---

## 📞 To Engage

**Requirements:**
- Fabric 2.5 experience
- MSP NodeOU knowledge
- Available for 4-6 hour session

**Compensation:** $500-1000 based on actual hours

**Contact:** Review full brief in this file and confirm availability

---

See full technical details above for architecture, error logs, and all attempted solutions.

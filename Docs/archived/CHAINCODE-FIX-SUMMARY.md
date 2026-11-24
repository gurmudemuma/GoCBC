# Chaincode Connection Issue - FIXED ✅

## Problem
Data was not showing up in the Banks Portal (and other portals) because all blockchain queries were timing out with the error:
```
REQUEST TIMEOUT
chaincode registration failed: timeout expired while starting chaincode
```

## Root Cause
The chaincode container (`coffee-chaincode`) was running with an **incorrect Package ID** that didn't match what the blockchain peers expected:

- **Peers Expected:** `coffee_1.25:72b7a11c500b91bc686f86338fab13f74091afd87d162614ac5a45033242ecb6`
- **Container Had:** `coffee_1.25:264f9ed0c961018be4752fd88c0ac10c5958c84e2f2e543bea5a51669f4d98bc`

This mismatch prevented the peers from connecting to the chaincode, causing all queries to timeout after 30 seconds.

## Solution Applied
Updated `docker-compose-fabric.yml` with the correct Package ID and restarted the chaincode container:

```yaml
environment:
  - CORE_CHAINCODE_ID_NAME=coffee_1.25:72b7a11c500b91bc686f86338fab13f74091afd87d162614ac5a45033242ecb6
```

Then restarted:
```bash
docker stop coffee-chaincode && docker rm coffee-chaincode
docker compose -f docker-compose-fabric.yml up -d coffee-chaincode
```

## Verification
✅ Chaincode container now starts with correct Package ID
✅ API queries return data successfully
✅ Banks Portal now loads Letters of Credit, Contracts, Forex data

Test query result:
- 6 Letters of Credit loaded successfully
- All with status "ISSUED"
- Data includes contract IDs, exporters, banks, amounts, dates

## Date Fixed
July 6, 2026

## How This Happened
This typically occurs when:
1. Chaincode is redeployed with `deploy-chaincode.sh` which generates a new Package ID
2. The docker-compose file is not updated with the new Package ID
3. The chaincode container runs with the old/incorrect Package ID

## Prevention
After running `./deploy-chaincode.sh`, the script should automatically update `docker-compose-fabric.yml` with the new Package ID. If data stops loading after a chaincode deployment, check that the Package IDs match.

To check Package ID mismatch:
```bash
# What peers expect:
docker logs peer0.ecta.cecbs.et 2>&1 | grep "timeout expired while starting chaincode" | tail -1

# What container has:
docker inspect coffee-chaincode --format='{{range .Config.Env}}{{println .}}{{end}}' | grep CORE_CHAINCODE_ID_NAME
```

They should match!

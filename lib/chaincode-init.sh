#!/bin/bash
##################################################################
# Chaincode Initialization Library
# Handles chaincode initialization silently and robustly
# Can be sourced by any script that needs chaincode operations
##################################################################

# Ensure chaincode is initialized and operational
# Returns: 0 if operational, 1 if failed
ensure_chaincode_initialized() {
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        # Test if chaincode responds
        local query_result=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
            -C coffeechannel \
            -n coffee \
            -c '{"Args":["GetBlockchainInfo"]}' 2>&1)
        
        if echo "$query_result" | grep -q "Channel"; then
            return 0  # Success
        fi
        
        # Not initialized - try to initialize
        docker exec peer0.ecta.cecbs.et peer chaincode invoke \
            -o orderer.cecbs.et:7050 \
            --tls \
            --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
            -C coffeechannel \
            -n coffee \
            --peerAddresses peer0.ecta.cecbs.et:7051 \
            --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
            -c '{"function":"InitLedger","Args":[]}' >/dev/null 2>&1
        
        # Wait for initialization
        sleep 3
        
        ((retry_count++))
    done
    
    # Failed after all retries
    return 1
}

# Quick check if chaincode is responding
# Returns: 0 if responding, 1 if not
is_chaincode_responding() {
    local query_result=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
        -C coffeechannel \
        -n coffee \
        -c '{"Args":["GetBlockchainInfo"]}' 2>&1)
    
    if echo "$query_result" | grep -q "Channel"; then
        return 0
    fi
    return 1
}

# Initialize chaincode if needed (silent)
# Returns: 0 if now operational, 1 if failed
init_chaincode_silent() {
    if is_chaincode_responding; then
        return 0  # Already operational
    fi
    
    # Need to initialize
    docker exec peer0.ecta.cecbs.et peer chaincode invoke \
        -o orderer.cecbs.et:7050 \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        -C coffeechannel \
        -n coffee \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
        -c '{"function":"InitLedger","Args":[]}' >/dev/null 2>&1
    
    sleep 3
    
    # Verify it worked
    if is_chaincode_responding; then
        return 0
    fi
    return 1
}

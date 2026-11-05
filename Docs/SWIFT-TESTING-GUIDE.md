# SWIFT Message Management - Testing Guide

## 🧪 Testing Strategy

This guide provides comprehensive testing procedures for the SWIFT message management system.

## Test Environment Setup

### Prerequisites
```bash
# 1. Ensure chaincode is deployed
cd chaincodes/coffee
go build
# Deploy using your Fabric network scripts

# 2. Start API server
cd api
npm install
npm run dev

# 3. Get authentication token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bank_user",
    "password": "your_password"
  }'

# Save the token
export TOKEN="your_jwt_token_here"
```

## 🧪 Unit Tests

### Test 1: BIC Code Validation

```bash
# Valid BIC (8 characters)
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_BIC_8",
    "messageType": "MT103",
    "swiftReference": "TESTBIC8",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "1000",
    "currency": "USD"
  }'
# Expected: Success (201)

# Valid BIC (11 characters)
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_BIC_11",
    "messageType": "MT103",
    "swiftReference": "TESTBIC11",
    "senderBIC": "CBETETAAXXX",
    "receiverBIC": "DEUTDEFFXXX",
    "amount": "1000",
    "currency": "USD"
  }'
# Expected: Success (201)

# Invalid BIC (wrong length)
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_BIC_INVALID",
    "messageType": "MT103",
    "swiftReference": "TESTBICBAD",
    "senderBIC": "CBETE",
    "receiverBIC": "DEUTDEFF",
    "amount": "1000",
    "currency": "USD"
  }'
# Expected: Error (400) - Invalid BIC format
```

### Test 2: SWIFT Reference Validation

```bash
# Valid reference
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_REF_VALID",
    "messageType": "MT103",
    "swiftReference": "REF2026001",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "1000",
    "currency": "USD"
  }'
# Expected: Success (201)

# Invalid reference (too long)
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_REF_LONG",
    "messageType": "MT103",
    "swiftReference": "VERYLONGREFERENCE12345678",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "1000",
    "currency": "USD"
  }'
# Expected: Error (400) - Reference too long
```

### Test 3: Amount Validation

```bash
# Valid amount
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_AMT_VALID",
    "messageType": "MT103",
    "swiftReference": "TESTAMT001",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "250000.50",
    "currency": "USD"
  }'
# Expected: Success (201)

# Zero amount
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_AMT_ZERO",
    "messageType": "MT103",
    "swiftReference": "TESTAMT002",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "0",
    "currency": "USD"
  }'
# Expected: Error (400) - Amount must be positive

# Negative amount
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_AMT_NEG",
    "messageType": "MT103",
    "swiftReference": "TESTAMT003",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "-1000",
    "currency": "USD"
  }'
# Expected: Error (400) - Amount must be positive
```

## 🔄 Integration Tests

### Test 4: Complete MT700 Workflow

```bash
# Step 1: Create MT700
curl -X POST http://localhost:3001/api/v1/swift/messages/mt700 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_MT700_001",
    "lcID": "LC_TEST_001",
    "swiftReference": "LC001TEST",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "applicant": "Test Buyer Inc",
    "beneficiary": "Test Exporter Ltd",
    "amount": "100000.00",
    "currency": "USD",
    "expiryDate": "2026-12-31",
    "loadingPort": "Djibouti",
    "dischargePort": "Hamburg",
    "latestShipDate": "2026-11-30"
  }' | jq .
# Expected: Status 201, message created

# Step 2: Validate
curl -X POST http://localhost:3001/api/v1/swift/messages/TEST_MT700_001/validate \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: isValid: true, no errors

# Step 3: Approve
curl -X POST http://localhost:3001/api/v1/swift/messages/TEST_MT700_001/approve \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: Status APPROVED

# Step 4: Send
curl -X POST http://localhost:3001/api/v1/swift/messages/TEST_MT700_001/send \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: Status SENT

# Step 5: Receive
curl -X POST http://localhost:3001/api/v1/swift/messages/TEST_MT700_001/receive \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: Status RECEIVED

# Step 6: Process
curl -X POST http://localhost:3001/api/v1/swift/messages/TEST_MT700_001/process \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: Status PROCESSING

# Step 7: Settle
curl -X POST http://localhost:3001/api/v1/swift/messages/TEST_MT700_001/settle \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: Status SETTLED

# Step 8: Verify final state
curl -X GET http://localhost:3001/api/v1/swift/messages/TEST_MT700_001 \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: Full message with status SETTLED
```

### Test 5: Complete Payment Workflow

```bash
# Create MT103 payment
curl -X POST http://localhost:3001/api/v1/swift/messages/mt103 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_MT103_001",
    "swiftReference": "PAY001TEST",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "paymentID": "PAY_TEST_001",
    "orderingCustomer": "Test Buyer Inc",
    "beneficiary": "Test Exporter Ltd",
    "beneficiaryAccount": "1234567890",
    "amount": "100000.00",
    "currency": "USD",
    "valueDate": "260715",
    "remittanceInfo": "Payment for LC_TEST_001",
    "chargeCode": "SHA"
  }' | jq .

# Go through workflow (approve, send, receive, process, settle)
# ... (same steps as MT700)
```

### Test 6: Discrepancy Workflow

```bash
# Create MT750 discrepancy
curl -X POST http://localhost:3001/api/v1/swift/messages/mt750 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_MT750_001",
    "lcID": "LC_TEST_001",
    "swiftReference": "DISC001TEST",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "discrepancyDetails": "Test discrepancies found",
    "discrepancyList": [
      "Test discrepancy 1",
      "Test discrepancy 2"
    ]
  }' | jq .

# Create MT752 authorization despite discrepancies
curl -X POST http://localhost:3001/api/v1/swift/messages/mt752 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_MT752_001",
    "lcID": "LC_TEST_001",
    "swiftReference": "AUTH001TEST",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "amount": "100000.00",
    "currency": "USD"
  }' | jq .
```

## 🔍 Query Tests

### Test 7: Query Operations

```bash
# Get all messages
curl -X GET http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" | jq .

# Filter by type
curl -X GET "http://localhost:3001/api/v1/swift/messages?type=MT700" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Filter by status
curl -X GET "http://localhost:3001/api/v1/swift/messages?status=SENT" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Filter by LC ID
curl -X GET "http://localhost:3001/api/v1/swift/messages?lcId=LC_TEST_001" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Filter by BIC
curl -X GET "http://localhost:3001/api/v1/swift/messages?bic=CBETETAA&direction=RECEIVED" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Get statistics
curl -X GET http://localhost:3001/api/v1/swift/statistics \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## ❌ Error Handling Tests

### Test 8: Status Transition Errors

```bash
# Try to send a DRAFT message without approval
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_STATUS_ERR",
    "messageType": "MT103",
    "swiftReference": "STATUSERR",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "1000",
    "currency": "USD"
  }'

curl -X POST http://localhost:3001/api/v1/swift/messages/TEST_STATUS_ERR/send \
  -H "Authorization: Bearer $TOKEN"
# Expected: Error (400) - can only send APPROVED messages
```

### Test 9: Duplicate Message ID

```bash
# Create message
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_DUPLICATE",
    "messageType": "MT103",
    "swiftReference": "DUPLICATE01",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "1000",
    "currency": "USD"
  }'

# Try to create again with same ID
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_DUPLICATE",
    "messageType": "MT103",
    "swiftReference": "DUPLICATE02",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "2000",
    "currency": "USD"
  }'
# Expected: Error (400) - Message already exists
```

## 🏋️ Load Tests

### Test 10: Concurrent Message Creation

```bash
# Create a script to send 100 messages concurrently
cat > load_test.sh << 'EOF'
#!/bin/bash
TOKEN="$1"
for i in {1..100}; do
  (curl -s -X POST http://localhost:3001/api/v1/swift/messages \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"messageID\": \"LOAD_TEST_$i\",
      \"messageType\": \"MT103\",
      \"swiftReference\": \"LOAD$i\",
      \"senderBIC\": \"CBETETAA\",
      \"receiverBIC\": \"DEUTDEFF\",
      \"amount\": \"$i\",
      \"currency\": \"USD\"
    }" &)
done
wait
echo "Load test complete"
EOF

chmod +x load_test.sh
./load_test.sh "$TOKEN"

# Check results
curl -X GET "http://localhost:3001/api/v1/swift/messages?status=DRAFT" \
  -H "Authorization: Bearer $TOKEN" | jq '. | length'
# Expected: 100 messages created
```

## 📊 Test Results Template

```markdown
# SWIFT Test Results

## Test Date: YYYY-MM-DD
## Tester: [Name]
## Environment: [Development/Staging/Production]

### Unit Tests
- [ ] BIC Validation (8 char) - PASS/FAIL
- [ ] BIC Validation (11 char) - PASS/FAIL
- [ ] BIC Validation (invalid) - PASS/FAIL
- [ ] SWIFT Reference Valid - PASS/FAIL
- [ ] SWIFT Reference Too Long - PASS/FAIL
- [ ] Amount Validation - PASS/FAIL
- [ ] Zero Amount Error - PASS/FAIL
- [ ] Negative Amount Error - PASS/FAIL

### Integration Tests
- [ ] MT700 Complete Workflow - PASS/FAIL
- [ ] MT103 Payment Workflow - PASS/FAIL
- [ ] MT750 Discrepancy - PASS/FAIL
- [ ] MT752 Authorization - PASS/FAIL
- [ ] MT707 Amendment - PASS/FAIL

### Query Tests
- [ ] Get All Messages - PASS/FAIL
- [ ] Filter by Type - PASS/FAIL
- [ ] Filter by Status - PASS/FAIL
- [ ] Filter by LC ID - PASS/FAIL
- [ ] Filter by BIC - PASS/FAIL
- [ ] Get Statistics - PASS/FAIL

### Error Handling
- [ ] Invalid Status Transition - PASS/FAIL
- [ ] Duplicate Message ID - PASS/FAIL
- [ ] Missing Required Fields - PASS/FAIL

### Load Tests
- [ ] 100 Concurrent Creates - PASS/FAIL
- [ ] Query Performance - PASS/FAIL

### Notes
[Any additional observations or issues]
```

## 🔍 Debugging Tips

### Enable Debug Logging
```bash
# In API
export DEBUG=swift:*
npm run dev

# Check chaincode logs
kubectl logs -f <chaincode-pod> -c chaincode
```

### Common Issues

1. **"Message not found"**
   - Check message ID is correct
   - Verify chaincode is deployed
   - Check blockchain connection

2. **"Invalid BIC format"**
   - Verify BIC is 8 or 11 characters
   - Check it's alphanumeric only
   - Ensure proper format (AAAABBCCDDD)

3. **"Invalid status transition"**
   - Check current message status
   - Follow proper workflow sequence
   - Review state machine diagram

## ✅ Test Checklist

Before marking implementation as complete:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All query tests pass
- [ ] Error handling works correctly
- [ ] Load test passes with acceptable performance
- [ ] Documentation is accurate
- [ ] API endpoints respond correctly
- [ ] Blockchain integration works
- [ ] Authentication works
- [ ] Validation catches all errors

---

**Version**: 1.0  
**Last Updated**: July 10, 2026  
**Status**: Ready for Testing

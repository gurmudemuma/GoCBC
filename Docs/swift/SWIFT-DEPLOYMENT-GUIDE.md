# SWIFT Message Management - Deployment & Verification Guide

## 🚀 Step-by-Step Deployment

This guide walks you through deploying and verifying the SWIFT message management system.

---

## ✅ Pre-Deployment Checklist

### 1. **Verify Files Exist**
```bash
# Chaincode
ls chaincodes/coffee/swift.go
# Should show: swift.go exists

# API Routes
ls api/src/routes/swift.ts
# Should show: swift.ts exists

# Server Integration
grep -n "swiftRoutes" api/src/server.ts
# Should show: import and use statements
```

### 2. **Check Dependencies**
```bash
# Go dependencies (if any new ones added)
cd chaincodes/coffee
go mod tidy

# Node dependencies (already installed)
cd ../../api
npm list express express-validator
```

### 3. **Environment Variables**
```bash
# Verify .env file has necessary configs
cat api/.env | grep -E "PORT|BLOCKCHAIN"
```

---

## 📦 Step 1: Deploy Chaincode

### Option A: Using Existing Deployment Script

```bash
cd chaincodes/coffee

# Build the chaincode
go build

# Deploy using your existing script
cd ../..
./deploy-chaincode.sh

# Or if using chaincode.sh
./chaincode.sh deploy coffee
```

### Option B: Manual Fabric Deployment

```bash
# Package chaincode
peer lifecycle chaincode package coffee.tar.gz \
  --path chaincodes/coffee \
  --lang golang \
  --label coffee_1.0

# Install on peers
peer lifecycle chaincode install coffee.tar.gz

# Get package ID
peer lifecycle chaincode queryinstalled

# Approve for your org
peer lifecycle chaincode approveformyorg \
  --channelID cecbs \
  --name coffee \
  --version 1.0 \
  --package-id <PACKAGE_ID> \
  --sequence 1

# Commit chaincode
peer lifecycle chaincode commit \
  --channelID cecbs \
  --name coffee \
  --version 1.0 \
  --sequence 1
```

### Verify Chaincode Deployment

```bash
# Query chaincode to verify it's running
peer chaincode query \
  -C cecbs \
  -n coffee \
  -c '{"function":"QueryAllSWIFTMessages","Args":[]}'

# Expected: Empty array [] or existing messages
```

---

## 🌐 Step 2: Start API Server

### Development Mode

```bash
cd api

# Install dependencies (if not done)
npm install

# Start development server
npm run dev

# Server should start on port 3001
# Look for: "🚀 CECBS API Gateway started on port 3001"
```

### Production Mode

```bash
cd api

# Build TypeScript
npm run build

# Start production server
npm start

# Or use PM2
pm2 start npm --name "cecbs-api" -- start
pm2 save
```

### Verify API Server

```bash
# Check health
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-07-10T...",
  "services": {
    "database": true,
    "blockchain": true
  }
}

# Check SWIFT routes are registered
curl http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should get 401 if no token, or empty array if authenticated
```

---

## 🔐 Step 3: Set Up Authentication

### Create Test Users

```bash
# Create bank user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cbe_bank_officer",
    "password": "SecurePassword123!",
    "email": "officer@cbe.et",
    "role": "BANK_OFFICER",
    "organization": "CBETETAA"
  }'

# Login to get token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cbe_bank_officer",
    "password": "SecurePassword123!"
  }'

# Save the token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🧪 Step 4: Verify SWIFT Functionality

### Test 1: Create a SWIFT Message

```bash
curl -X POST http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "SWIFT_TEST_001",
    "messageType": "MT103",
    "swiftReference": "TEST001",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "1000",
    "currency": "USD",
    "valueDate": "260710",
    "beneficiary": "Test Beneficiary",
    "remittanceInfo": "Test payment"
  }'

# Expected: Status 201 Created
{
  "success": true,
  "data": {
    "messageID": "SWIFT_TEST_001",
    "messageType": "MT103",
    "swiftReference": "TEST001"
  },
  "txId": "...",
  "timestamp": "2026-07-10T..."
}
```

### Test 2: Query the Message

```bash
curl http://localhost:3001/api/v1/swift/messages/SWIFT_TEST_001 \
  -H "Authorization: Bearer $TOKEN"

# Expected: Full message details
{
  "success": true,
  "data": {
    "messageID": "SWIFT_TEST_001",
    "messageType": "MT103",
    "status": "DRAFT",
    ...
  }
}
```

### Test 3: Approve and Send

```bash
# Approve
curl -X POST http://localhost:3001/api/v1/swift/messages/SWIFT_TEST_001/approve \
  -H "Authorization: Bearer $TOKEN"

# Expected: Status APPROVED

# Send
curl -X POST http://localhost:3001/api/v1/swift/messages/SWIFT_TEST_001/send \
  -H "Authorization: Bearer $TOKEN"

# Expected: Status SENT
```

### Test 4: Create MT700 (LC)

```bash
curl -X POST http://localhost:3001/api/v1/swift/messages/mt700 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "SWIFT_MT700_TEST",
    "lcID": "LC_TEST_001",
    "swiftReference": "LCTEST001",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "applicant": "Test Buyer GmbH",
    "beneficiary": "Test Exporter Ltd",
    "amount": "50000.00",
    "currency": "USD",
    "expiryDate": "2026-12-31",
    "loadingPort": "Djibouti",
    "dischargePort": "Hamburg",
    "latestShipDate": "2026-11-30"
  }'

# Expected: Status 201 Created
```

### Test 5: Query All Messages

```bash
curl http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array with both test messages
{
  "success": true,
  "data": [
    { "messageID": "SWIFT_TEST_001", ... },
    { "messageID": "SWIFT_MT700_TEST", ... }
  ],
  "count": 2
}
```

### Test 6: Query by Type

```bash
curl "http://localhost:3001/api/v1/swift/messages?type=MT700" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Only MT700 messages
```

### Test 7: Get Statistics

```bash
curl http://localhost:3001/api/v1/swift/statistics \
  -H "Authorization: Bearer $TOKEN"

# Expected:
{
  "success": true,
  "data": {
    "totalMessages": 2,
    "byType": {
      "MT103": 1,
      "MT700": 1
    },
    "byStatus": {
      "DRAFT": 1,
      "SENT": 1
    }
  }
}
```

---

## ✅ Verification Checklist

### Backend Verification

- [ ] Chaincode deployed successfully
- [ ] API server starts without errors
- [ ] SWIFT routes accessible
- [ ] Authentication works
- [ ] Can create SWIFT messages
- [ ] Can query SWIFT messages
- [ ] Can approve messages
- [ ] Can send messages
- [ ] Message status updates correctly
- [ ] Query filters work
- [ ] Statistics endpoint works

### Blockchain Verification

```bash
# Check if SWIFT messages are on blockchain
peer chaincode query \
  -C cecbs \
  -n coffee \
  -c '{"function":"QueryAllSWIFTMessages","Args":[]}'

# Should show your test messages
```

### Database Verification (if using off-chain DB)

```bash
# Check if messages are in database (if applicable)
sqlite3 api/cecbs.db "SELECT * FROM swift_messages;"
# or
psql -d cecbs -c "SELECT * FROM swift_messages;"
```

---

## 🔍 Troubleshooting

### Issue 1: Chaincode Function Not Found

**Error:**
```
Error: chaincode function 'CreateSWIFTMessage' not found
```

**Solution:**
```bash
# Verify swift.go is included in chaincode
ls chaincodes/coffee/swift.go

# Rebuild and redeploy
cd chaincodes/coffee
go build
# Redeploy chaincode
```

### Issue 2: Route Not Found

**Error:**
```
404 Not Found: /api/v1/swift/messages
```

**Solution:**
```bash
# Check server.ts has swift routes
grep "swiftRoutes" api/src/server.ts

# Should see:
# import swiftRoutes from './routes/swift';
# apiV1.use('/swift', authMiddleware, swiftRoutes);

# If not, add them and restart server
npm run dev
```

### Issue 3: Authentication Failed

**Error:**
```
401 Unauthorized
```

**Solution:**
```bash
# Ensure you have a valid token
# Login again
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_user","password":"your_pass"}'

# Use the token in subsequent requests
export TOKEN="new_token_here"
```

### Issue 4: Invalid BIC Format

**Error:**
```
400 Bad Request: invalid BIC format
```

**Solution:**
```bash
# BIC must be 8 or 11 characters
# Valid: CBETETAA (8) or CBETETAAXXX (11)
# Invalid: CBETE (5)

# Use proper BIC codes:
# Ethiopian: CBETETAA, AWINETAA, DASHETAA
# Foreign: DEUTDEFF, CHASUS33, HSBCHKHH
```

### Issue 5: Message Already Exists

**Error:**
```
400 Bad Request: message already exists
```

**Solution:**
```bash
# Use unique message IDs
# Include timestamp or increment counter
MESSAGE_ID="SWIFT_MSG_$(date +%s)"

curl -X POST ... -d "{\"messageID\":\"$MESSAGE_ID\", ...}"
```

---

## 📊 Performance Testing

### Test Message Creation Speed

```bash
# Create 10 messages and measure time
time for i in {1..10}; do
  curl -s -X POST http://localhost:3001/api/v1/swift/messages \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"messageID\": \"PERF_TEST_$i\",
      \"messageType\": \"MT103\",
      \"swiftReference\": \"PERF$i\",
      \"senderBIC\": \"CBETETAA\",
      \"receiverBIC\": \"DEUTDEFF\",
      \"amount\": \"$i\",
      \"currency\": \"USD\"
    }" > /dev/null
done

# Should complete in < 5 seconds
```

### Test Query Performance

```bash
# Measure query response time
time curl -s http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Should complete in < 1 second
```

---

## 🔒 Security Verification

### Test 1: Unauthenticated Access

```bash
# Should be rejected
curl http://localhost:3001/api/v1/swift/messages

# Expected: 401 Unauthorized
```

### Test 2: Invalid Token

```bash
# Should be rejected
curl http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Unauthorized
```

### Test 3: SQL Injection (if using database)

```bash
# Should be safely handled
curl "http://localhost:3001/api/v1/swift/messages?type=MT700'; DROP TABLE swift_messages;--" \
  -H "Authorization: Bearer $TOKEN"

# Should not drop any tables
```

---

## 📱 Integration Testing

### Test Complete LC Workflow

```bash
#!/bin/bash
# File: test-lc-workflow.sh

TOKEN="$1"
BASE_URL="http://localhost:3001/api/v1"

echo "=== Testing Complete LC Workflow ==="

# Step 1: Create MT700
echo "1. Creating MT700 (Issue LC)..."
MT700_RESPONSE=$(curl -s -X POST $BASE_URL/swift/messages/mt700 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_LC_WORKFLOW_MT700",
    "lcID": "LC_WORKFLOW_001",
    "swiftReference": "WORKFLOW700",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "applicant": "Test Buyer",
    "beneficiary": "Test Exporter",
    "amount": "100000.00",
    "currency": "USD",
    "expiryDate": "2026-12-31",
    "loadingPort": "Djibouti",
    "dischargePort": "Hamburg",
    "latestShipDate": "2026-11-30"
  }')

echo "$MT700_RESPONSE" | jq .
sleep 1

# Step 2: Approve and Send MT700
echo "2. Approving MT700..."
curl -s -X POST $BASE_URL/swift/messages/TEST_LC_WORKFLOW_MT700/approve \
  -H "Authorization: Bearer $TOKEN" | jq .
sleep 1

echo "3. Sending MT700..."
curl -s -X POST $BASE_URL/swift/messages/TEST_LC_WORKFLOW_MT700/send \
  -H "Authorization: Bearer $TOKEN" | jq .
sleep 1

# Step 3: Receive MT700 (simulate)
echo "4. Receiving MT700..."
curl -s -X POST $BASE_URL/swift/messages/TEST_LC_WORKFLOW_MT700/receive \
  -H "Authorization: Bearer $TOKEN" | jq .
sleep 1

# Step 4: Create MT754 (Document Negotiation)
echo "5. Creating MT754 (Document Negotiation)..."
curl -s -X POST $BASE_URL/swift/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_LC_WORKFLOW_MT754",
    "messageType": "MT754",
    "swiftReference": "WORKFLOW754",
    "senderBIC": "CBETETAA",
    "receiverBIC": "DEUTDEFF",
    "amount": "100000",
    "currency": "USD"
  }' | jq .
sleep 1

# Step 5: Create MT752 (Authorization)
echo "6. Creating MT752 (Payment Authorization)..."
curl -s -X POST $BASE_URL/swift/messages/mt752 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_LC_WORKFLOW_MT752",
    "lcID": "LC_WORKFLOW_001",
    "swiftReference": "WORKFLOW752",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "amount": "100000.00",
    "currency": "USD"
  }' | jq .
sleep 1

# Step 6: Create MT103 (Payment)
echo "7. Creating MT103 (Payment)..."
curl -s -X POST $BASE_URL/swift/messages/mt103 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "TEST_LC_WORKFLOW_MT103",
    "swiftReference": "WORKFLOW103",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "paymentID": "PAY_WORKFLOW_001",
    "orderingCustomer": "Test Buyer",
    "beneficiary": "Test Exporter",
    "beneficiaryAccount": "1234567890",
    "amount": "100000.00",
    "currency": "USD",
    "valueDate": "260710",
    "remittanceInfo": "Payment for LC_WORKFLOW_001",
    "chargeCode": "SHA"
  }' | jq .
sleep 1

# Step 7: Query all messages for this LC
echo "8. Querying all messages for LC_WORKFLOW_001..."
curl -s "$BASE_URL/swift/messages?lcId=LC_WORKFLOW_001" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "=== Workflow Test Complete ==="
```

Usage:
```bash
chmod +x test-lc-workflow.sh
./test-lc-workflow.sh "$TOKEN"
```

---

## 📋 Deployment Verification Report

After completing all tests, fill out this report:

```markdown
# SWIFT Deployment Verification Report

**Date:** YYYY-MM-DD  
**Deployed By:** [Your Name]  
**Environment:** Development/Staging/Production

## Chaincode Deployment
- [ ] swift.go deployed successfully
- [ ] All SWIFT functions callable
- [ ] Query operations work
- **Package ID:** _______________
- **Channel:** _______________

## API Server
- [ ] Server starts without errors
- [ ] SWIFT routes accessible
- [ ] Authentication working
- **Port:** _______________
- **Version:** _______________

## Functionality Tests
- [ ] Create SWIFT message
- [ ] Query messages
- [ ] Approve messages
- [ ] Send messages
- [ ] Receive messages
- [ ] Process messages
- [ ] Settle messages
- [ ] Reject messages
- [ ] Filter by type
- [ ] Filter by status
- [ ] Filter by LC ID
- [ ] Statistics endpoint

## Performance
- [ ] Message creation < 2s
- [ ] Query response < 1s
- [ ] Can handle 100+ messages
- **Average Response Time:** _____ ms

## Security
- [ ] Authentication required
- [ ] Invalid tokens rejected
- [ ] BIC validation works
- [ ] Input validation works

## Issues Found
[List any issues encountered]

## Sign-off
**Deployed:** ☐ Yes ☐ No  
**Ready for UI:** ☐ Yes ☐ No  
**Production Ready:** ☐ Yes ☐ No

**Signature:** _________________  
**Date:** _________________
```

---

## 🎉 Success Indicators

You know the deployment is successful when:

✅ **All API endpoints respond correctly**  
✅ **Messages are stored on blockchain**  
✅ **Query operations return expected results**  
✅ **Status transitions work properly**  
✅ **Authentication is enforced**  
✅ **No error logs in server console**  
✅ **Performance meets requirements**  
✅ **Complete LC workflow can be executed**

---

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide first
2. Review logs: `api/logs/combined.log`
3. Check chaincode logs: `kubectl logs <pod>`
4. Consult documentation: `SWIFT-*.md` files
5. Contact: swift-support@cecbs.et

---

**Deployment Guide Version:** 1.0  
**Last Updated:** July 10, 2026  
**Status:** ✅ Ready for Use

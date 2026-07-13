# SWIFT Message Management - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- ✅ Chaincode deployed with SWIFT module (`swift.go`)
- ✅ API server running with SWIFT routes (`/api/v1/swift`)
- ✅ Valid authentication token (Bearer token)
- ✅ Bank organization with valid BIC code

## 📋 Common Workflows

### 1. Issue a Letter of Credit (MT700)

**Scenario**: Issuing bank sends LC to advising bank

```bash
# Step 1: Create MT700 message
curl -X POST http://localhost:3001/api/v1/swift/messages/mt700 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "SWIFT_MSG_LC_001",
    "lcID": "LC_2026_001",
    "swiftReference": "LC001REF2026",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "applicant": "German Coffee Importer GmbH\nBerlin, Germany",
    "beneficiary": "Ethiopian Coffee Cooperative\nAddis Ababa, Ethiopia",
    "amount": "250000.00",
    "currency": "USD",
    "expiryDate": "2026-12-31",
    "loadingPort": "Djibouti",
    "dischargePort": "Hamburg",
    "latestShipDate": "2026-11-30"
  }'

# Step 2: Approve message
curl -X POST http://localhost:3001/api/v1/swift/messages/SWIFT_MSG_LC_001/approve \
  -H "Authorization: Bearer YOUR_TOKEN"

# Step 3: Send message
curl -X POST http://localhost:3001/api/v1/swift/messages/SWIFT_MSG_LC_001/send \
  -H "Authorization: Bearer YOUR_TOKEN"

# Step 4: Receiver confirms receipt
curl -X POST http://localhost:3001/api/v1/swift/messages/SWIFT_MSG_LC_001/receive \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Make Payment for LC (MT103)

**Scenario**: Final payment transfer after document verification

```bash
# Create MT103 payment message
curl -X POST http://localhost:3001/api/v1/swift/messages/mt103 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "SWIFT_MSG_PAY_001",
    "swiftReference": "PAY001REF2026",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "paymentID": "PAY_2026_001",
    "orderingCustomer": "German Coffee Importer GmbH\nAccount: DE89370400440532013000",
    "beneficiary": "Ethiopian Coffee Cooperative",
    "beneficiaryAccount": "ET1234567890",
    "amount": "250000.00",
    "currency": "USD",
    "valueDate": "260715",
    "remittanceInfo": "Payment for LC_2026_001 Coffee Shipment",
    "chargeCode": "SHA"
  }'

# Approve, send, receive workflow (same as above)
```

### 3. Report Document Discrepancy (MT750)

**Scenario**: Issuing bank finds discrepancies in documents

```bash
curl -X POST http://localhost:3001/api/v1/swift/messages/mt750 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "SWIFT_MSG_DISC_001",
    "lcID": "LC_2026_001",
    "swiftReference": "DISC001REF2026",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "discrepancyDetails": "Following discrepancies found in documents",
    "discrepancyList": [
      "Bill of Lading dated after LC expiry date",
      "Invoice amount exceeds LC amount by USD 500",
      "Certificate of Origin missing stamp"
    ]
  }'
```

### 4. Authorize Payment Despite Discrepancies (MT752)

**Scenario**: Issuing bank authorizes payment after buyer accepts discrepancies

```bash
curl -X POST http://localhost:3001/api/v1/swift/messages/mt752 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "SWIFT_MSG_AUTH_001",
    "lcID": "LC_2026_001",
    "swiftReference": "AUTH001REF2026",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "amount": "250000.00",
    "currency": "USD"
  }'
```

### 5. Amend a Letter of Credit (MT707)

**Scenario**: Change LC amount or expiry date

```bash
curl -X POST http://localhost:3001/api/v1/swift/messages/mt707 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageID": "SWIFT_MSG_AMD_001",
    "lcID": "LC_2026_001",
    "swiftReference": "AMD001REF2026",
    "senderBIC": "DEUTDEFF",
    "receiverBIC": "CBETETAA",
    "amendmentReason": "Buyer requested amount increase and date extension",
    "newAmount": "275000.00",
    "newExpiryDate": "2027-01-31",
    "amendmentNumber": 1
  }'
```

## 🔍 Query Messages

### Get All Messages
```bash
curl -X GET http://localhost:3001/api/v1/swift/messages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter by Message Type
```bash
curl -X GET "http://localhost:3001/api/v1/swift/messages?type=MT700" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter by Status
```bash
curl -X GET "http://localhost:3001/api/v1/swift/messages?status=SENT" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter by LC ID
```bash
curl -X GET "http://localhost:3001/api/v1/swift/messages?lcId=LC_2026_001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter by Payment ID
```bash
curl -X GET "http://localhost:3001/api/v1/swift/messages?paymentId=PAY_2026_001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter by BIC (Sent/Received)
```bash
# All messages involving this BIC
curl -X GET "http://localhost:3001/api/v1/swift/messages?bic=CBETETAA" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Only messages sent by this BIC
curl -X GET "http://localhost:3001/api/v1/swift/messages?bic=CBETETAA&direction=SENT" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Only messages received by this BIC
curl -X GET "http://localhost:3001/api/v1/swift/messages?bic=CBETETAA&direction=RECEIVED" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Specific Message
```bash
curl -X GET http://localhost:3001/api/v1/swift/messages/SWIFT_MSG_LC_001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Statistics
```bash
curl -X GET http://localhost:3001/api/v1/swift/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Message Status Flow

```
DRAFT              → Created, not yet approved
    ↓
PENDING_APPROVAL   → Waiting for approval (future use)
    ↓
APPROVED           → Approved, ready to send
    ↓
SENT               → Sent to SWIFT network
    ↓
IN_TRANSIT         → In transit (optional state)
    ↓
RECEIVED           → Received by destination bank
    ↓
PROCESSING         → Being processed by receiver
    ↓
SETTLED            → Successfully completed
    ↓ (OR)
REJECTED           → Rejected with reason
```

## 🔐 BIC Code Examples

### Ethiopian Banks
- **CBETETAA** - Commercial Bank of Ethiopia
- **AWINETAA** - Awash Bank
- **DASHETAA** - Bank of Abyssinia (Dashen)
- **ABYSETAA** - Abay Bank
- **UNITETAA** - United Bank

### International Banks
- **DEUTDEFF** - Deutsche Bank, Frankfurt
- **CHASUS33** - JPMorgan Chase, New York
- **HSBCHKHH** - HSBC, Hong Kong
- **BNPAFRPP** - BNP Paribas, Paris
- **BARCGB22** - Barclays, London

## 💡 Best Practices

### 1. **SWIFT References**
- Use unique, sequential references
- Format: `[TYPE][NUMBER]REF[YEAR]`
- Examples: `LC001REF2026`, `PAY045REF2026`

### 2. **Message Validation**
- Always validate before sending:
```bash
curl -X POST http://localhost:3001/api/v1/swift/messages/SWIFT_MSG_LC_001/validate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. **Error Handling**
- Check response status codes
- Log all SWIFT operations
- Implement retry logic for network failures

### 4. **Charge Codes**
- **OUR** - Sender pays all charges (recommended for LCs)
- **SHA** - Charges shared (most common)
- **BEN** - Beneficiary pays all charges

### 5. **Security**
- Never log sensitive data (account numbers, amounts)
- Use HTTPS for all API calls
- Implement IP whitelisting
- Regular security audits

## 🐛 Troubleshooting

### Message Not Found
```json
{
  "success": false,
  "error": {
    "code": "MESSAGE_NOT_FOUND",
    "message": "message SWIFT_MSG_XXX not found"
  }
}
```
**Solution**: Check message ID, verify it was created

### Invalid BIC Code
```json
{
  "success": false,
  "error": {
    "code": "SWIFT_MESSAGE_CREATE_FAILED",
    "message": "invalid BIC format"
  }
}
```
**Solution**: Verify BIC is 8 or 11 characters, alphanumeric

### Invalid Status Transition
```json
{
  "success": false,
  "error": {
    "code": "APPROVE_FAILED",
    "message": "can only approve DRAFT messages"
  }
}
```
**Solution**: Check current message status, ensure proper workflow sequence

## 📞 Support

For questions or issues:
- 📧 Email: swift-support@cecbs.et
- 📱 Phone: +251-XXX-XXXX
- 📚 Full Documentation: `/docs/SWIFT-IMPLEMENTATION-COMPLETE.md`

---

**Version**: 1.0  
**Last Updated**: July 10, 2026  
**Status**: ✅ Production Ready

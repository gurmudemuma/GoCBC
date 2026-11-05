# SWIFT Message Processing Test

## Overview

The `swift-processing-test.sh` validates international banking communication for Ethiopian coffee exports using SWIFT (Society for Worldwide Interbank Financial Telecommunication) messages.

## Quick Start

```bash
cd /home/guda/GoCBC
./swift-processing-test.sh
```

Or via master runner:
```bash
./run-all-tests.sh --specific swift
```

## SWIFT Messages Tested

### 1. MT700 - Documentary Credit Issuance
**Purpose**: Issue Letter of Credit via SWIFT network

**Workflow**:
- Sending Bank: Commercial Bank of Ethiopia (BIC: CBEKETAA)
- Receiving Bank: Deutsche Bank AG (BIC: DEUTDEFF)
- Amount: USD 160,000
- Documents Required:
  - Bill of Lading
  - Commercial Invoice
  - Certificate of Origin
  - Quality Certificate
  - Phytosanitary Certificate

**API Endpoint**:
```
POST /api/v1/swift/messages
```

**Sample Request**:
```json
{
  "messageID": "MT700-1793720227",
  "messageType": "MT700",
  "swiftReference": "SWIFT-REF-1793720227",
  "senderBIC": "CBEKETAA",
  "receiverBIC": "DEUTDEFF",
  "linkedLcId": "LC-SWIFT-1793720227",
  "lcNumber": "LC-SWIFT-1793720227",
  "applicant": "Deutsche Kaffee Import GmbH",
  "beneficiary": "SWIFT Test Coffee Export Ltd",
  "amount": "160000",
  "currency": "USD",
  "lcExpiryDate": "2027-01-31",
  "loadingPort": "Djibouti",
  "dischargePort": "Hamburg",
  "latestShipDate": "2027-01-15"
}
```

---

### 2. MT707 - Documentary Credit Amendment
**Purpose**: Amend existing Letter of Credit terms

**Changes Tested**:
- Amount increase: USD 160,000 → USD 175,000 (+15,000)
- Expiry date extension: 2027-01-31 → 2027-02-15 (+15 days)
- Reason: Buyer requests additional quantity

**Workflow**:
- Sending Bank: Deutsche Bank AG (DEUTDEFF)
- Receiving Bank: Commercial Bank of Ethiopia (CBEKETAA)
- Amendment type: Amount and expiry date change

**Sample Request**:
```json
{
  "messageID": "MT707-1793720227",
  "messageType": "MT707",
  "swiftReference": "SWIFT-REF-1793720227-AMD",
  "senderBIC": "DEUTDEFF",
  "receiverBIC": "CBEKETAA",
  "linkedLcId": "LC-SWIFT-1793720227",
  "amount": "175000",
  "currency": "USD",
  "lcExpiryDate": "2027-02-15",
  "remittanceInfo": "LC amendment - increase amount and extend expiry"
}
```

---

### 3. MT103 - Customer Credit Transfer
**Purpose**: International payment transfer for coffee shipment

**Workflow**:
- Ordering Bank: Deutsche Bank AG (DEUTDEFF)
- Beneficiary Bank: Commercial Bank of Ethiopia (CBEKETAA)
- Intermediary Bank: Commerzbank London (COMMGB2L)
- Amount: USD 160,000
- Charge Code: OUR (all charges paid by ordering customer)

**API Endpoint**:
```
POST /api/v1/payments/:paymentID/swift/initiate
```

**Sample Request**:
```json
{
  "swiftReference": "SWIFT-REF-1793720227-PAY",
  "senderBIC": "DEUTDEFF",
  "receiverBIC": "CBEKETAA",
  "messageType": "MT103",
  "valueDate": "2026-11-03",
  "intermediary1": "COMMGB2L",
  "charges": "OUR",
  "remittanceInfo": "Payment for Ethiopian coffee shipment SHIP-SWIFT-1793720227"
}
```

---

### 4. MT103 Confirmation
**Purpose**: Confirm receipt of SWIFT payment

**Workflow**:
- Beneficiary bank confirms funds received
- Amount verified: USD 160,000
- Value date recorded
- Confirming officer logged

**API Endpoint**:
```
POST /api/v1/payments/:paymentID/swift/confirm
```

**Sample Request**:
```json
{
  "confirmationReference": "CONF-SWIFT-REF-1793720227",
  "receivedAmount": 160000,
  "receivedCurrency": "USD",
  "valueDate": "2026-11-03",
  "confirmingOfficer": "Bank Operations Manager"
}
```

---

### 5. MT910 - Confirmation of Credit
**Purpose**: Notify sender that funds have been credited to beneficiary

**Workflow**:
- Sending Bank: Commercial Bank of Ethiopia (CBEKETAA)
- Receiving Bank: Deutsche Bank AG (DEUTDEFF)
- Confirmation: Funds credited to beneficiary account

**Sample Request**:
```json
{
  "messageID": "MT910-1793720227",
  "messageType": "MT910",
  "swiftReference": "SWIFT-REF-1793720227-CONF",
  "senderBIC": "CBEKETAA",
  "receiverBIC": "DEUTDEFF",
  "amount": "160000",
  "currency": "USD",
  "valueDate": "2026-11-03",
  "remittanceInfo": "Confirmation of payment receipt for LC LC-SWIFT-1793720227"
}
```

---

### 6. SWIFT Message History Query
**Purpose**: Retrieve all SWIFT messages for an LC

**API Endpoint**:
```
GET /api/v1/swift/messages?lcNumber=LC-SWIFT-1793720227
```

**Response**: Array of all SWIFT messages (MT700, MT707, MT103, MT910) associated with the LC.

---

## Test Stages

1. **Authentication** - ECTA Admin & Bank Admin
2. **Setup** - Create exporter, contract, and LC
3. **Stage 1**: MT700 - LC Issuance via SWIFT
4. **Stage 2**: MT707 - LC Amendment via SWIFT
5. **Stage 3**: Payment Initiation
6. **Stage 4**: MT103 - Payment Transfer via SWIFT
7. **Stage 5**: MT103 Confirmation
8. **Stage 6**: MT910 - Confirmation Message
9. **Stage 7**: Query SWIFT Message History

## Banking Network

### Commercial Bank of Ethiopia (CBE)
- **BIC**: CBEKETAA
- **Role**: Advising bank (beneficiary's bank)
- **Location**: Addis Ababa, Ethiopia

### Deutsche Bank AG
- **BIC**: DEUTDEFF
- **Role**: Issuing bank (applicant's bank)
- **Location**: Frankfurt, Germany

### Commerzbank London
- **BIC**: COMMGB2L
- **Role**: Intermediary bank
- **Location**: London, UK

## SWIFT Standards

### ISO 15022
All SWIFT messages follow ISO 15022 financial messaging standards:
- Structured format
- Mandatory and optional fields
- BIC (Bank Identifier Code) for routing
- Message type indicators (MT)

### Message Type Categories
- **MT7xx** - Documentary Credits (LC)
- **MT1xx** - Customer Payments & Cheques
- **MT9xx** - Cash Management & Customer Status

## Business Value

### International Trade Facilitation
- Standardized communication between banks worldwide
- Secure, reliable message delivery
- Audit trail for all financial messages
- Compliance with international banking standards

### Ethiopian Coffee Export Context
- CBE connects Ethiopian exporters to global banking network
- SWIFT messages enable LC issuance from foreign buyers
- Payment transfers tracked end-to-end
- Essential for international trade finance

## Success Criteria

✅ MT700 message created and linked to LC  
✅ MT707 amendment processed  
✅ MT103 payment transfer initiated  
✅ Payment confirmation recorded  
✅ MT910 confirmation message sent  
✅ Message history retrievable  

## Troubleshooting

### SWIFT Message Creation Fails
```bash
# Check API logs
tail -50 /tmp/api.log | grep -i swift

# Verify blockchain connection
curl http://localhost:3001/api/v1/health
```

### BIC Code Errors
- Ensure BIC codes are valid (8 or 11 characters)
- CBEKETAA - Commercial Bank of Ethiopia
- DEUTDEFF - Deutsche Bank Frankfurt
- COMMGB2L - Commerzbank London

### Payment Not Confirmed
- Verify payment was recorded first
- Check payment ID exists
- Ensure Bank Admin authentication

## Integration with Main Workflow

The SWIFT test can be integrated into the complete E2E workflow:

1. **Happy Path Test** → Creates LC
2. **SWIFT Test** → Sends MT700 for LC issuance
3. **Payment Processing** → Uses MT103 for transfer
4. **Payment Confirmation** → MT910 confirms receipt

## References

- ISO 15022 Financial Messages: https://www.iso15022.org/
- SWIFT Standards: https://www.swift.com/standards
- UCP 600 (LC Rules): International Chamber of Commerce

## File Location

```
/home/guda/GoCBC/swift-processing-test.sh
```

## Execution Time

**~2-3 minutes**

## Test Output Example

```
╔════════════════════════════════════════════════════════════════╗
║ ✅ SWIFT PROCESSING TEST COMPLETED                            ║
╚════════════════════════════════════════════════════════════════╝

SWIFT Message Workflow Summary:
  ✓ MT700 - LC Issuance (CBEKETAA → DEUTDEFF)
  ✓ MT707 - LC Amendment (amount increase + expiry extension)
  ✓ MT103 - Payment Transfer (DEUTDEFF → CBEKETAA)
  ✓ MT103 - Payment Confirmation
  ✓ MT910 - Receipt Confirmation
  ✓ Message History Query

Banking Communication:
  Sending Bank:     Commercial Bank of Ethiopia (CBEKETAA)
  Receiving Bank:   Deutsche Bank AG (DEUTDEFF)
  Intermediary:     Commerzbank London (COMMGB2L)
  Amount:           USD 160,000

International SWIFT messaging validated!
```

## Summary

The SWIFT processing test validates end-to-end international banking communication for Ethiopian coffee exports, ensuring compliance with global financial messaging standards and successful integration with the blockchain-based export system.

**Status**: 🆕 **NEW** - Ready for testing  
**Priority**: **HIGH** - Critical for international trade finance  
**Coverage**: 5 SWIFT message types + query functionality

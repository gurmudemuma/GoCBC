# Payment Methods API Endpoints Documentation
**CECBS API - Payment Method Differentiation**

**Date**: June 26, 2026  
**Status**: ✅ **API Layer Complete**  
**Base URL**: `/api/v1/banking`

---

## Overview

New API endpoints to support payment method differentiation in CECBS. Each payment method (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE) now has unique workflow support.

---

## Payment Methods Supported

| Method | Description | Risk Profile | Bank Guarantee |
|--------|-------------|--------------|----------------|
| **LC** | Letter of Credit | LOW | ✅ YES |
| **CAD** | Cash Against Documents | MEDIUM | ❌ NO |
| **TT_ADVANCE** | Telegraphic Transfer (Advance) | LOW | ❌ NO |
| **TT_POST** | Telegraphic Transfer (Post-shipment) | HIGH | ❌ NO |
| **ADVANCE** | Advance Payment | LOW | ❌ NO |

---

## New Endpoints

### 1. Initiate Payment

**Endpoint**: `POST /api/v1/banking/payment/initiate`

**Description**: Initiate payment with specific payment method. Validates prerequisites based on method (e.g., LC must be issued for LC payments).

**Authentication**: Required

**Request Body**:
```json
{
  "paymentID": "PAYMENT_001",
  "contractID": "CONTRACT_001",
  "exporterID": "EXP123",
  "lcID": "LC_001",  // Required for LC method, optional for others
  "amount": 10000,
  "currency": "USD",
  "receivingBank": "Commercial Bank of Ethiopia",
  "receivingBankBIC": "CBETETAA",
  "beneficiaryName": "ABC Coffee Export",
  "beneficiaryAccount": "12345678",
  "paymentMethod": "LC"  // LC, CAD, TT_ADVANCE, TT_POST, or ADVANCE
}
```

**Validation**:
- All fields required except `lcID` (optional for non-LC methods)
- `paymentMethod` must be one of: LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
- If method is LC, `lcID` must reference an ISSUED Letter of Credit

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "paymentId": "PAYMENT_001",
    "status": "PENDING",
    "paymentMethod": "LC",
    "riskProfile": "LOW",
    "bankGuarantee": true
  },
  "txId": "abc123...",
  "metadata": {
    "paymentMethod": "LC",
    "riskProfile": "LOW",
    "bankGuarantee": true
  },
  "timestamp": "2026-06-26T10:00:00Z"
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_INITIATION_FAILED",
    "message": "payment method LC requires LC to be ISSUED (current status: PENDING)"
  },
  "timestamp": "2026-06-26T10:00:00Z"
}
```

---

### 2. Release Documents to Buyer

**Endpoint**: `POST /api/v1/banking/payment/:paymentID/release-documents`

**Description**: Release documents to buyer (CAD/LC only). Documents can only be released after payment is confirmed.

**Authentication**: Required (Bank role)

**URL Parameters**:
- `paymentID` - Payment ID

**Request Body**: None

**Validation**:
- Payment method must be CAD or LC
- Payment status must be PAYMENT_RECEIVED (CAD) or SETTLED/VERIFIED (LC)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "paymentId": "PAYMENT_001",
    "documentsHeldBy": "RELEASED",
    "documentReleaseDate": "2026-06-26T10:00:00Z"
  },
  "txId": "def456...",
  "message": "Documents released to buyer successfully",
  "timestamp": "2026-06-26T10:00:00Z"
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_RELEASE_FAILED",
    "message": "document release only applicable for CAD/LC (current method: TT_ADVANCE)"
  },
  "timestamp": "2026-06-26T10:00:00Z"
}
```

---

### 3. Receive Advance Payment

**Endpoint**: `POST /api/v1/banking/payment/:paymentID/receive-advance`

**Description**: Record advance payment (TT_ADVANCE/ADVANCE methods only). Tracks percentage and calculates balance.

**Authentication**: Required

**URL Parameters**:
- `paymentID` - Payment ID

**Request Body**:
```json
{
  "advancePercentage": 30,  // 30% advance
  "amountReceived": 3000    // $3,000 of $10,000 total
}
```

**Validation**:
- Payment method must be TT_ADVANCE or ADVANCE
- `advancePercentage` must be between 0 and 100
- `amountReceived` must be positive

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "paymentId": "PAYMENT_001",
    "paymentStage": "ADVANCE",
    "advancePercentage": 30,
    "advanceAmount": 3000,
    "balanceAmount": 7000,
    "status": "ADVANCE_RECEIVED"
  },
  "txId": "ghi789...",
  "message": "Advance payment of 30% received successfully",
  "timestamp": "2026-06-26T10:00:00Z"
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "ADVANCE_PAYMENT_FAILED",
    "message": "advance payment only for ADVANCE/TT_ADVANCE methods (current: LC)"
  },
  "timestamp": "2026-06-26T10:00:00Z"
}
```

---

### 4. Receive Balance Payment

**Endpoint**: `POST /api/v1/banking/payment/:paymentID/receive-balance`

**Description**: Record balance payment after advance. Completes the payment.

**Authentication**: Required

**URL Parameters**:
- `paymentID` - Payment ID

**Request Body**:
```json
{
  "amountReceived": 7000  // Remaining $7,000
}
```

**Validation**:
- Payment stage must be ADVANCE (advance already received)
- `amountReceived` must be positive

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "paymentId": "PAYMENT_001",
    "paymentStage": "BALANCE",
    "status": "BALANCE_RECEIVED",
    "totalReceived": 10000
  },
  "txId": "jkl012...",
  "message": "Balance payment received successfully",
  "timestamp": "2026-06-26T10:00:00Z"
}
```

---

### 5. Update Payment Status

**Endpoint**: `PUT /api/v1/banking/payment/:paymentID/status`

**Description**: Update payment status with automatic validation per payment method.

**Authentication**: Required

**URL Parameters**:
- `paymentID` - Payment ID

**Request Body**:
```json
{
  "status": "DOCUMENTS_SUBMITTED"
}
```

**Validation**:
- Status transition must be valid for payment method
- Example: CAD cannot go from PENDING to DOCUMENTS_SUBMITTED (must go through GOODS_SHIPPED first)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "paymentId": "PAYMENT_001",
    "oldStatus": "PENDING",
    "newStatus": "DOCUMENTS_SUBMITTED",
    "paymentMethod": "LC"
  },
  "txId": "mno345...",
  "message": "Payment status updated to DOCUMENTS_SUBMITTED",
  "timestamp": "2026-06-26T10:00:00Z"
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "STATUS_UPDATE_FAILED",
    "message": "invalid status transition from 'PENDING' to 'DOCUMENTS_SUBMITTED' for payment method CAD"
  },
  "timestamp": "2026-06-26T10:00:00Z"
}
```

---

### 6. Query Payments by Method

**Endpoint**: `GET /api/v1/banking/payment/by-method/:method`

**Description**: Get all payments using a specific payment method.

**Authentication**: Required

**URL Parameters**:
- `method` - Payment method (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "paymentId": "PAYMENT_001",
      "contractId": "CONTRACT_001",
      "amount": 10000,
      "currency": "USD",
      "paymentMethod": "LC",
      "status": "SETTLED",
      "riskProfile": "LOW",
      "bankGuarantee": true
    },
    {
      "paymentId": "PAYMENT_002",
      "contractId": "CONTRACT_002",
      "amount": 5000,
      "currency": "USD",
      "paymentMethod": "LC",
      "status": "PENDING"
    }
  ],
  "metadata": {
    "paymentMethod": "LC",
    "count": 2,
    "riskProfile": "LOW"
  },
  "timestamp": "2026-06-26T10:00:00Z"
}
```

---

### 7. Settle Payment

**Endpoint**: `POST /api/v1/banking/payment/:paymentID/settle`

**Description**: Settle payment with NBE retention policy and exchange rate.

**Authentication**: Required (Bank role)

**URL Parameters**:
- `paymentID` - Payment ID

**Request Body**:
```json
{
  "exchangeRate": 120.0,          // ETB per USD
  "retentionRate": 100.0,         // NBE FXD/01/2024: 100% retention allowed
  "payingBank": "Deutsche Bank",
  "payingBankBIC": "DEUTDEFF",
  "swiftReference": "FT23123456789",
  "nbeApprovalRef": "NBE2026001"  // Optional
}
```

**Validation**:
- Payment status must be SWIFT_RECEIVED or VERIFIED
- `exchangeRate` must be positive
- `retentionRate` must be between 0 and 100

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "paymentId": "PAYMENT_001",
    "status": "SETTLED",
    "exchangeRate": 120.0,
    "retentionRate": 100.0,
    "retainedAmount": 10000,      // $10,000 retained in forex
    "convertedAmount": 0,          // $0 converted to Birr
    "amountBirr": 0,
    "swiftReference": "FT23123456789"
  },
  "txId": "pqr678...",
  "message": "Payment settled successfully",
  "timestamp": "2026-06-26T10:00:00Z"
}
```

---

## Existing Endpoints (Updated)

### Submit Payment Documents

**Endpoint**: `POST /api/v1/banking/payment/:paymentID/submit-documents`

No changes. Works with all payment methods.

### Verify Payment Documents

**Endpoint**: `POST /api/v1/banking/payment/:paymentID/verify-documents`

No changes. Primarily for LC method (UCP 600 compliance).

---

## Workflow Examples

### Example 1: LC Payment Flow
```bash
# 1. Initiate LC payment (requires issued LC)
POST /api/v1/banking/payment/initiate
{
  "paymentMethod": "LC",
  "lcID": "LC_001",
  ...
}

# 2. Submit documents
POST /api/v1/banking/payment/PAYMENT_001/submit-documents
{
  "documents": ["Bill of Lading", "Commercial Invoice", "Quality Certificate"]
}

# 3. Bank verifies documents
POST /api/v1/banking/payment/PAYMENT_001/verify-documents
{
  "verifiedBy": "bank_officer",
  "comments": "All documents comply with LC terms"
}

# 4. Update to SWIFT initiated
PUT /api/v1/banking/payment/PAYMENT_001/status
{
  "status": "SWIFT_INITIATED"
}

# 5. Settle payment
POST /api/v1/banking/payment/PAYMENT_001/settle
{
  "exchangeRate": 120.0,
  "retentionRate": 100.0,
  ...
}

# 6. Release documents to buyer
POST /api/v1/banking/payment/PAYMENT_001/release-documents
```

### Example 2: CAD Payment Flow
```bash
# 1. Initiate CAD payment (no LC required)
POST /api/v1/banking/payment/initiate
{
  "paymentMethod": "CAD",
  "lcID": "",  // Not required
  ...
}

# 2. Update status: goods shipped
PUT /api/v1/banking/payment/PAYMENT_002/status
{
  "status": "GOODS_SHIPPED"
}

# 3. Update status: documents sent to bank
PUT /api/v1/banking/payment/PAYMENT_002/status
{
  "status": "DOCUMENTS_SENT_TO_BANK"
}

# 4. Update status: buyer notified
PUT /api/v1/banking/payment/PAYMENT_002/status
{
  "status": "BUYER_NOTIFIED"
}

# 5. Update status: payment received (buyer paid first)
PUT /api/v1/banking/payment/PAYMENT_002/status
{
  "status": "PAYMENT_RECEIVED"
}

# 6. Release documents (only after payment)
POST /api/v1/banking/payment/PAYMENT_002/release-documents

# 7. Settle
PUT /api/v1/banking/payment/PAYMENT_002/status
{
  "status": "SETTLED"
}
```

### Example 3: TT Advance Payment Flow (30% + 70%)
```bash
# 1. Initiate TT advance payment
POST /api/v1/banking/payment/initiate
{
  "paymentMethod": "TT_ADVANCE",
  "lcID": "",  // Not required
  ...
}

# 2. Request advance
PUT /api/v1/banking/payment/PAYMENT_003/status
{
  "status": "ADVANCE_REQUESTED"
}

# 3. Receive 30% advance
POST /api/v1/banking/payment/PAYMENT_003/receive-advance
{
  "advancePercentage": 30,
  "amountReceived": 3000
}

# 4. Ship goods (after advance received)
PUT /api/v1/banking/payment/PAYMENT_003/status
{
  "status": "GOODS_SHIPPED"
}

# 5. Request balance
PUT /api/v1/banking/payment/PAYMENT_003/status
{
  "status": "BALANCE_REQUESTED"
}

# 6. Receive 70% balance
POST /api/v1/banking/payment/PAYMENT_003/receive-balance
{
  "amountReceived": 7000
}

# 7. Settled (auto-updated)
GET /api/v1/banking/payment/PAYMENT_003
# Status: SETTLED
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `PAYMENT_INITIATION_FAILED` | Failed to initiate payment (e.g., prerequisite not met) |
| `DOCUMENT_RELEASE_FAILED` | Cannot release documents (wrong method or status) |
| `ADVANCE_PAYMENT_FAILED` | Cannot record advance (wrong method or invalid amount) |
| `BALANCE_PAYMENT_FAILED` | Cannot record balance (no advance received) |
| `STATUS_UPDATE_FAILED` | Invalid status transition for payment method |
| `SETTLEMENT_FAILED` | Payment settlement failed |
| `QUERY_FAILED` | Failed to query payments |
| `INTERNAL_ERROR` | Internal server error |

---

## Testing

### Test Payment Method Validation
```bash
# Should FAIL: LC without issued LC
curl -X POST http://localhost:3001/api/v1/banking/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "LC",
    "lcID": "NONEXISTENT",
    ...
  }'

# Expected: 400 Bad Request
# Error: "payment method LC requires valid Letter of Credit"
```

### Test Status Transition Validation
```bash
# Should FAIL: Invalid transition for CAD
curl -X PUT http://localhost:3001/api/v1/banking/payment/PAY_CAD/status \
  -H "Content-Type: application/json" \
  -d '{"status": "DOCUMENTS_SUBMITTED"}'

# Expected: 400 Bad Request
# Error: "invalid status transition from 'PENDING' to 'DOCUMENTS_SUBMITTED' for payment method CAD"
```

---

## Summary

**New Endpoints**: 7  
**Updated Endpoints**: 0  
**Total Payment Endpoints**: 9 (2 existing + 7 new)  
**Payment Methods Supported**: 5 (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)  

**Status**: ✅ API Layer Complete  
**Next**: UI Layer Implementation

# SWIFT Message Management Implementation Guide

## Overview
This document describes the comprehensive SWIFT (Society for Worldwide Interbank Financial Telecommunication) message implementation for the Ethiopian Coffee Export Consortium Blockchain System (CECBS).

## SWIFT Message Standards

### Message Type Categories

#### 1. **Customer Payments and Cheques (MT1xx)**
- **MT103** - Single Customer Credit Transfer
  - Used for: Final payment settlement from buyer to exporter
  - Required fields: Sender bank, receiver bank, beneficiary, amount, currency, value date
  - Use case: Final payment release after document verification

#### 2. **Bank Transfers (MT2xx)**
- **MT202** - General Financial Institution Transfer
  - Used for: Bank-to-bank transfers (cover payments)
  - Use case: When LC issuing bank transfers funds to advising bank

#### 3. **Treasury Markets - Foreign Exchange (MT3xx)**
- **MT300** - Foreign Exchange Confirmation
  - Used for: Confirming forex transactions
  - Use case: NBE forex allocation confirmations

#### 4. **Documentary Credits and Guarantees (MT7xx)**
- **MT700** - Issue of a Documentary Credit (LC issuance)
  - Required fields: LC number, applicant, beneficiary, amount, expiry date, required documents
  - Use case: Issuing bank sends LC to advising bank
  
- **MT701** - Amendment to a Documentary Credit
  - Use case: LC amendments (amount changes, date extensions)
  
- **MT707** - Amendment to a Documentary Credit
  - Alternative to MT701 for more complex amendments
  
- **MT710** - Advice of a Third Bank's Documentary Credit
  - Use case: Advising bank notifies beneficiary (exporter)
  
- **MT720** - Transfer of a Documentary Credit
  - Use case: Transferable LCs
  
- **MT730** - Acknowledgment
  - Use case: Confirmation of receipt of LC or amendment
  
- **MT740** - Authorization to Reimburse
  - Use case: Issuing bank authorizes reimbursing bank
  
- **MT750** - Discrepancy Report
  - Use case: Bank reports document discrepancies
  
- **MT752** - Authorization to Pay/Accept/Negotiate
  - Use case: Issuing bank confirms payment authorization
  
- **MT754** - Advice of Payment/Acceptance/Negotiation
  - Use case: Negotiating bank advises payment
  
- **MT756** - Advice of Reimbursement or Payment
  - Use case: Reimbursing bank confirms payment
  
- **MT760** - Guarantee
  - Use case: Bank guarantees

#### 5. **Collections (MT4xx)**
- **MT400** - Advice of Payment
  - Use case: Payment confirmations for collections

#### 6. **Common Group Messages (MT9xx)**
- **MT910** - Confirmation of Credit
  - Use case: Account credit confirmations
  
- **MT940** - Customer Statement Message
  - Use case: Bank statements
  
- **MT950** - Statement Message
  - Use case: Account statements

- **MT999** - Free Format Message
  - Use case: Unstructured messages between banks

## SWIFT Message Structure

### Basic Components
```
{1:Basic Header Block} - Contains sender/receiver info
{2:Application Header Block} - Message type, priority, delivery monitoring
{3:User Header Block} - Optional, validation flags
{4:Text Block} - Actual message content (fields)
{5:Trailer Block} - Checksums, authentication
```

### Field Structure
- **Mandatory fields**: Indicated with 'M'
- **Optional fields**: Indicated with 'O'
- **Field tags**: Format `:TAG:VALUE`

## Implementation Architecture

### 1. SWIFT Message Types (Enums)
```go
const (
    // Customer Payments
    MT103_SINGLE_CUSTOMER_CREDIT = "MT103"
    
    // Bank Transfers
    MT202_FI_TRANSFER = "MT202"
    
    // Documentary Credits
    MT700_ISSUE_LC = "MT700"
    MT701_AMEND_LC = "MT701"
    MT707_AMEND_LC_ALT = "MT707"
    MT710_ADVICE_LC = "MT710"
    MT730_ACKNOWLEDGMENT = "MT730"
    MT740_AUTH_REIMBURSE = "MT740"
    MT750_DISCREPANCY = "MT750"
    MT752_AUTH_PAYMENT = "MT752"
    MT754_ADVICE_PAYMENT = "MT754"
    MT756_ADVICE_REIMBURSE = "MT756"
    
    // Common messages
    MT910_CONFIRM_CREDIT = "MT910"
    MT940_STATEMENT = "MT940"
    MT999_FREE_FORMAT = "MT999"
)
```

### 2. Enhanced SWIFT Message Structure
```go
type SWIFTMessage struct {
    // Message Identification
    MessageType      string    `json:"messageType"`      // MT103, MT700, etc.
    SWIFTReference   string    `json:"swiftReference"`   // Unique reference
    RelatedReference string    `json:"relatedReference"` // Reference to previous message
    
    // Parties
    SenderBIC        string    `json:"senderBic"`        // Sending bank
    ReceiverBIC      string    `json:"receiverBic"`      // Receiving bank
    IntermediaryBIC1 string    `json:"intermediaryBic1"` // Optional intermediary
    IntermediaryBIC2 string    `json:"intermediaryBic2"` // Optional intermediary
    
    // Transaction Details
    ValueDate        string    `json:"valueDate"`        // Payment value date
    Currency         string    `json:"currency"`         // Currency code
    Amount           float64   `json:"amount"`           // Transaction amount
    ExchangeRate     float64   `json:"exchangeRate"`     // If applicable
    
    // Dates and Timing
    SentDate         time.Time `json:"sentDate"`         // When sent
    ReceivedDate     string    `json:"receivedDate"`     // When received
    ProcessedDate    string    `json:"processedDate"`    // When processed
    
    // Parties in Transaction
    OrderingCustomer string    `json:"orderingCustomer"` // Buyer/Applicant
    Beneficiary      string    `json:"beneficiary"`      // Seller/Exporter
    BeneficiaryBank  string    `json:"beneficiaryBank"`  // Exporter's bank
    
    // Payment Details
    Charges          string    `json:"charges"`          // OUR/SHA/BEN
    RemittanceInfo   string    `json:"remittanceInfo"`   // Payment reference
    PurposeCode      string    `json:"purposeCode"`      // Payment purpose
    
    // LC-Specific Fields (MT7xx)
    LCNumber         string    `json:"lcNumber"`         // LC reference
    LCIssueDate      string    `json:"lcIssueDate"`      // LC issue date
    LCExpiryDate     string    `json:"lcExpiryDate"`     // LC expiry
    LCExpiryPlace    string    `json:"lcExpiryPlace"`    // Where LC expires
    LCApplicant      string    `json:"lcApplicant"`      // Buyer info
    PartialShipment  string    `json:"partialShipment"`  // Allowed/Not Allowed
    Transhipment     string    `json:"transhipment"`     // Allowed/Not Allowed
    LoadingPort      string    `json:"loadingPort"`      // Port of loading
    DischargePort    string    `json:"dischargePort"`    // Port of discharge
    LatestShipDate   string    `json:"latestShipDate"`   // Last date to ship
    Documents        []string  `json:"documents"`        // Required documents
    
    // Status and Tracking
    Status           string    `json:"status"`           // DRAFT, SENT, RECEIVED, PROCESSED, SETTLED, REJECTED
    ProcessingStatus string    `json:"processingStatus"` // Detailed status
    RejectionReason  string    `json:"rejectionReason"`  // If rejected
    ErrorCode        string    `json:"errorCode"`        // SWIFT error code
    
    // Validation
    Authenticated    bool      `json:"authenticated"`    // Authentication status
    ValidationFlags  []string  `json:"validationFlags"`  // Validation checks
    
    // Audit Trail
    CreatedBy        string    `json:"createdBy"`        // Who created
    ProcessedBy      string    `json:"processedBy"`      // Who processed
    ApprovedBy       string    `json:"approvedBy"`       // Who approved
    
    // Raw Message (for reference)
    RawMessage       string    `json:"rawMessage"`       // Original SWIFT format
    MessageHash      string    `json:"messageHash"`      // For integrity
    
    CreatedAt        time.Time `json:"createdAt"`
    UpdatedAt        time.Time `json:"updatedAt"`
}
```

### 3. SWIFT Message Workflows

#### Workflow 1: LC Issuance
```
1. MT700 (Issuing Bank → Advising Bank)
   - Issuing bank sends LC details
   
2. MT710 (Advising Bank → Beneficiary/Exporter)
   - Advising bank notifies exporter
   
3. MT730 (Advising Bank → Issuing Bank)
   - Acknowledgment of LC receipt
```

#### Workflow 2: LC Amendment
```
1. MT707 (Issuing Bank → Advising Bank)
   - Amendment details
   
2. MT730 (Advising Bank → Issuing Bank)
   - Acknowledgment
```

#### Workflow 3: Document Presentation and Payment
```
1. Exporter ships goods, presents documents to advising bank

2. MT754 (Advising Bank → Issuing Bank)
   - Advice of negotiation/document presentation
   
3. MT750 (Issuing Bank → Advising Bank) - IF DISCREPANCIES
   - Report discrepancies
   - OR -
   MT752 (Issuing Bank → Advising Bank) - IF CLEAN
   - Authorization to pay

4. MT103 (Issuing Bank → Advising Bank)
   - Final payment transfer
   
5. MT910 (Advising Bank → Internal)
   - Confirmation of credit to exporter account
```

#### Workflow 4: CAD (Cash Against Documents)
```
1. MT400 (Exporter Bank → Buyer Bank)
   - Advice of documents arrival
   
2. MT103 (Buyer Bank → Exporter Bank)
   - Payment after buyer accepts documents
```

## Key Features to Implement

### 1. Message Validation
- BIC code format validation (8 or 11 characters)
- Currency code validation (ISO 4217)
- Amount format validation
- Date format validation
- Required field checks per message type
- Field length validations

### 2. Message State Machine
```
DRAFT → PENDING_APPROVAL → APPROVED → SENT → IN_TRANSIT → 
RECEIVED → PROCESSING → SETTLED/REJECTED
```

### 3. Error Handling
- Network errors
- Validation errors
- Rejection codes
- Repair mechanisms
- Duplicate detection

### 4. Security
- Message authentication
- Integrity checks (hashing)
- Non-repudiation
- Encryption in transit
- Access control

### 5. Audit and Compliance
- Complete message history
- Tamper-proof audit trail
- Regulatory reporting
- Sanction screening integration
- AML/KYC checks

## Integration Points

### 1. With Letter of Credit Module
- LC issuance triggers MT700
- LC amendments trigger MT707
- Document verification triggers MT754

### 2. With Payment Module
- Payment settlement triggers MT103
- Forex transactions trigger MT300
- Account credits trigger MT910

### 3. With Compliance Module
- Sanction screening before sending
- AML checks on parties
- OFAC compliance
- EUDR verification

### 4. With Blockchain
- Store message hashes on-chain
- Immutable audit trail
- Multi-party consensus
- Smart contract triggers

## Error Codes Reference

### Common SWIFT Error Codes
- **G01**: Sequence error
- **G02**: Duplicate detection
- **G03**: Message incomplete
- **G04**: Field length error
- **G05**: Invalid field
- **D01**: Receiver not available
- **D02**: Message timeout
- **T01**: Invalid BIC
- **T02**: Invalid account

## Best Practices

1. **Always validate before sending**
   - Check all mandatory fields
   - Validate formats
   - Screen parties

2. **Handle errors gracefully**
   - Implement retry logic
   - Provide clear error messages
   - Log all attempts

3. **Maintain audit trail**
   - Record all state changes
   - Store original messages
   - Track processing time

4. **Security first**
   - Authenticate all messages
   - Encrypt sensitive data
   - Implement access controls

5. **Performance optimization**
   - Batch processing where possible
   - Asynchronous handling
   - Queue management

## Testing Strategy

### Unit Tests
- Message validation
- Field parsing
- Error handling
- State transitions

### Integration Tests
- End-to-end workflows
- Multi-bank scenarios
- Error recovery
- Timeout handling

### Performance Tests
- Message throughput
- Response times
- Concurrent processing
- Load testing

## Monitoring and Operations

### Metrics to Track
- Messages sent/received per hour
- Processing time per message type
- Error rates by type
- Settlement success rate
- Queue depths

### Alerts
- Failed messages
- Timeout exceeding threshold
- Rejected messages
- System errors
- Security violations

## Next Steps

1. ✅ Implement enhanced SWIFT message structure
2. ✅ Create validation functions for each message type
3. ✅ Build message parser and generator
4. ✅ Implement state machine
5. ✅ Add error handling and recovery
6. ✅ Create audit trail integration
7. ✅ Build monitoring dashboard
8. ✅ Write comprehensive tests
9. ✅ Deploy to test environment
10. ✅ User acceptance testing

---

**Document Version**: 1.0  
**Last Updated**: July 10, 2026  
**Author**: Coffee Export Consortium Blockchain Team  
**Status**: Implementation Ready

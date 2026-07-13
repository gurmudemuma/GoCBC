package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== SWIFT MESSAGE TYPES ====================

const (
	// Customer Payments (MT1xx)
	MT103_SINGLE_CUSTOMER_CREDIT = "MT103"

	// Bank Transfers (MT2xx)
	MT202_FI_TRANSFER = "MT202"

	// Foreign Exchange (MT3xx)
	MT300_FOREX_CONFIRMATION = "MT300"

	// Documentary Credits (MT7xx)
	MT700_ISSUE_LC        = "MT700"
	MT701_AMEND_LC        = "MT701"
	MT707_AMEND_LC_ALT    = "MT707"
	MT710_ADVICE_LC       = "MT710"
	MT730_ACKNOWLEDGMENT  = "MT730"
	MT740_AUTH_REIMBURSE  = "MT740"
	MT750_DISCREPANCY     = "MT750"
	MT752_AUTH_PAYMENT    = "MT752"
	MT754_ADVICE_PAYMENT  = "MT754"
	MT756_ADVICE_REIMBURSE = "MT756"

	// Collections (MT4xx)
	MT400_ADVICE_PAYMENT_COL = "MT400"

	// Common Messages (MT9xx)
	MT910_CONFIRM_CREDIT = "MT910"
	MT940_STATEMENT      = "MT940"
	MT999_FREE_FORMAT    = "MT999"
)

// SWIFT Message Status
const (
	SWIFT_STATUS_DRAFT            = "DRAFT"
	SWIFT_STATUS_PENDING_APPROVAL = "PENDING_APPROVAL"
	SWIFT_STATUS_APPROVED         = "APPROVED"
	SWIFT_STATUS_SENT             = "SENT"
	SWIFT_STATUS_IN_TRANSIT       = "IN_TRANSIT"
	SWIFT_STATUS_RECEIVED         = "RECEIVED"
)

const (
	SWIFT_STATUS_PROCESSING = "PROCESSING"
	SWIFT_STATUS_SETTLED    = "SETTLED"
	SWIFT_STATUS_REJECTED   = "REJECTED"
	SWIFT_STATUS_CANCELLED  = "CANCELLED"
	SWIFT_STATUS_FAILED     = "FAILED"
)

// Charge Codes
const (
	CHARGE_OUR = "OUR" // All charges borne by sender
	CHARGE_SHA = "SHA" // Charges shared
	CHARGE_BEN = "BEN" // All charges borne by beneficiary
)

// ==================== ENHANCED SWIFT MESSAGE STRUCTURE ====================

type SWIFTMessageEnhanced struct {
	// Message Identification
	MessageID        string    `json:"messageId"`        // System ID
	MessageType      string    `json:"messageType"`      // MT103, MT700, etc.
	SWIFTReference   string    `json:"swiftReference"`   // Unique SWIFT reference (20 chars)
	RelatedReference string    `json:"relatedReference"` // Reference to previous message

	// Parties (BIC Codes)
	SenderBIC        string `json:"senderBic"`        // 8 or 11 char BIC
	ReceiverBIC      string `json:"receiverBic"`      // 8 or 11 char BIC
	IntermediaryBIC1 string `json:"intermediaryBic1"` // Optional
	IntermediaryBIC2 string `json:"intermediaryBic2"` // Optional

	// Transaction Details
	ValueDate    string  `json:"valueDate"`    // YYMMDD format
	Currency     string  `json:"currency"`     // ISO 4217 (USD, EUR, ETB)
	Amount       float64 `json:"amount"`       // Transaction amount
	ExchangeRate float64 `json:"exchangeRate"` // If currency conversion

	// Dates and Timing
	SentDate      time.Time `json:"sentDate"`      // When sent
	ReceivedDate  string    `json:"receivedDate"`  // When received (ISO 8601)
	ProcessedDate string    `json:"processedDate"` // When processed

	// Transaction Parties
	OrderingCustomer      string `json:"orderingCustomer"`      // Buyer/Applicant (Field 50)
	OrderingInstitution   string `json:"orderingInstitution"`   // Buyer's bank
	Beneficiary           string `json:"beneficiary"`           // Seller/Exporter (Field 59)
	BeneficiaryBank       string `json:"beneficiaryBank"`       // Exporter's bank
	BeneficiaryAccount    string `json:"beneficiaryAccount"`    // Account number

	// Payment Details
	Charges         string `json:"charges"`         // OUR/SHA/BEN (Field 71A)
	RemittanceInfo  string `json:"remittanceInfo"`  // Payment details (Field 70)
	PurposeCode     string `json:"purposeCode"`     // Purpose of payment
	InstructionCode string `json:"instructionCode"` // Handling instructions

	// LC-Specific Fields (for MT7xx messages)
	LCNumber        string   `json:"lcNumber"`        // LC reference (Field 20)
	LCIssueDate     string   `json:"lcIssueDate"`     // Date LC issued
	LCExpiryDate    string   `json:"lcExpiryDate"`    // LC expiry date
	LCExpiryPlace   string   `json:"lcExpiryPlace"`   // Where LC expires
	LCApplicant     string   `json:"lcApplicant"`     // Buyer details (Field 50)
	LCAmount        float64  `json:"lcAmount"`        // LC amount
	LCCurrency      string   `json:"lcCurrency"`      // LC currency
	PartialShipment string   `json:"partialShipment"` // Allowed/Not Allowed
	Transhipment    string   `json:"transhipment"`    // Allowed/Not Allowed
	LoadingPort     string   `json:"loadingPort"`     // Port of loading
	DischargePort   string   `json:"dischargePort"`   // Port of discharge
	LatestShipDate  string   `json:"latestShipDate"`  // Latest shipment date
	Documents       []string `json:"documents"`       // Required documents list
	AdditionalInfo  string   `json:"additionalInfo"`  // Additional conditions

	// Amendment Fields (for MT707)
	AmendmentNumber int    `json:"amendmentNumber"` // Sequential amendment number
	AmendmentDate   string `json:"amendmentDate"`   // Date of amendment
	AmendmentReason string `json:"amendmentReason"` // Reason for change

	// Discrepancy Fields (for MT750)
	DiscrepancyDetails string   `json:"discrepancyDetails"` // Description of discrepancies
	DiscrepancyList    []string `json:"discrepancyList"`    // List of specific issues
	Action             string   `json:"action"`             // Required action

	// Status and Tracking
	Status           string   `json:"status"`           // DRAFT, SENT, RECEIVED, etc.
	ProcessingStatus string   `json:"processingStatus"` // Detailed processing state
	RejectionReason  string   `json:"rejectionReason"`  // Why rejected
	ErrorCode        string   `json:"errorCode"`        // SWIFT error code (G01, D01, etc.)
	RetryCount       int      `json:"retryCount"`       // Number of retries
	MaxRetries       int      `json:"maxRetries"`       // Maximum retry attempts

	// Validation and Security
	Authenticated   bool     `json:"authenticated"`   // Authentication status
	ValidationFlags []string `json:"validationFlags"` // Validation checks passed
	SecurityHash    string   `json:"securityHash"`    // Message integrity hash
	DigitalSign     string   `json:"digitalSign"`     // Digital signature
	Encrypted       bool     `json:"encrypted"`       // Encryption status

	// Audit Trail
	CreatedBy   string `json:"createdBy"`   // User who created
	ApprovedBy  string `json:"approvedBy"`  // User who approved
	SentBy      string `json:"sentBy"`      // User who sent
	ProcessedBy string `json:"processedBy"` // User who processed
	ReceivedBy  string `json:"receivedBy"`  // User who received

	// Raw and Hash
	RawMessage     string `json:"rawMessage"`     // Original SWIFT format
	MessageHash    string `json:"messageHash"`    // SHA-256 hash
	NetworkInfo    string `json:"networkInfo"`    // Network routing info
	PriorityCode   string `json:"priorityCode"`   // Normal/Urgent
	DeliveryMonitor string `json:"deliveryMonitor"` // Delivery notification level

	// Metadata
	LinkedPaymentID  string    `json:"linkedPaymentId"`  // Link to payment record
	LinkedLCID       string    `json:"linkedLcId"`       // Link to LC record
	LinkedContractID string    `json:"linkedContractId"` // Link to contract
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// ==================== VALIDATION FUNCTIONS ====================
// Note: ValidateBICCode is defined in validation.go

// ValidateSWIFTReference - Validate SWIFT reference format
// Reference: up to 16 alphanumeric characters
func ValidateSWIFTReference(ref string) error {
	if ref == "" {
		return fmt.Errorf("SWIFT reference cannot be empty")
	}

	ref = strings.TrimSpace(ref)
	if len(ref) > 16 {
		return fmt.Errorf("SWIFT reference too long: %d chars (max 16)", len(ref))
	}

	// Only alphanumeric allowed
	matched, err := regexp.MatchString(`^[A-Z0-9]+$`, strings.ToUpper(ref))

	if err != nil {
		return fmt.Errorf("reference validation error: %w", err)
	}
	if !matched {
		return fmt.Errorf("invalid SWIFT reference: %s (only alphanumeric allowed)", ref)
	}

	return nil
}

// ValidateMessageType - Validate SWIFT message type
func ValidateMessageType(msgType string) error {
	validTypes := map[string]bool{
		MT103_SINGLE_CUSTOMER_CREDIT: true,
		MT202_FI_TRANSFER:           true,
		MT300_FOREX_CONFIRMATION:    true,
		MT700_ISSUE_LC:              true,
		MT701_AMEND_LC:              true,
		MT707_AMEND_LC_ALT:          true,
		MT710_ADVICE_LC:             true,
		MT730_ACKNOWLEDGMENT:        true,
		MT740_AUTH_REIMBURSE:        true,
		MT750_DISCREPANCY:           true,
		MT752_AUTH_PAYMENT:          true,
		MT754_ADVICE_PAYMENT:        true,
		MT756_ADVICE_REIMBURSE:      true,
		MT400_ADVICE_PAYMENT_COL:    true,
		MT910_CONFIRM_CREDIT:        true,
		MT940_STATEMENT:             true,
		MT999_FREE_FORMAT:           true,
	}

	if !validTypes[msgType] {
		return fmt.Errorf("invalid SWIFT message type: %s", msgType)
	}
	return nil
}

// ValidateChargeCode - Validate charge code
func ValidateChargeCode(code string) error {
	if code == "" {
		return nil // Optional
	}
	validCodes := map[string]bool{
		CHARGE_OUR: true,
		CHARGE_SHA: true,
		CHARGE_BEN: true,
	}
	if !validCodes[code] {
		return fmt.Errorf("invalid charge code: %s (valid: OUR, SHA, BEN)", code)
	}
	return nil
}

// ComputeMessageHash - Compute SHA-256 hash of message content
func ComputeMessageHash(msg *SWIFTMessageEnhanced) string {
	// Create canonical representation for hashing
	data := fmt.Sprintf("%s|%s|%s|%s|%s|%.2f|%s|%s|%s",
		msg.MessageType,
		msg.SWIFTReference,
		msg.SenderBIC,
		msg.ReceiverBIC,
		msg.Currency,
		msg.Amount,
		msg.ValueDate,
		msg.Beneficiary,
		msg.RemittanceInfo)

	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// ==================== SWIFT MESSAGE OPERATIONS ====================

// CreateSWIFTMessage - Create a new SWIFT message
func (c *CoffeeContract) CreateSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID, messageType, swiftRef, senderBIC, receiverBIC,
	currency, amountStr, valueDate, beneficiary, remittanceInfo string) error {

	// Validate inputs
	if err := ValidateID(messageID, "messageID"); err != nil {
		return fmt.Errorf("CreateSWIFTMessage: %w", err)
	}

	if err := ValidateMessageType(messageType); err != nil {
		return fmt.Errorf("CreateSWIFTMessage: %w", err)
	}

	if err := ValidateSWIFTReference(swiftRef); err != nil {
		return fmt.Errorf("CreateSWIFTMessage: %w", err)
	}

	if err := ValidateBICCode(senderBIC); err != nil {
		return fmt.Errorf("CreateSWIFTMessage: invalid sender BIC: %w", err)
	}

	if err := ValidateBICCode(receiverBIC); err != nil {
		return fmt.Errorf("CreateSWIFTMessage: invalid receiver BIC: %w", err)
	}

	if err := ValidateCurrency(currency); err != nil {
		return fmt.Errorf("CreateSWIFTMessage: %w", err)
	}

	amount, err := parseFloat(amountStr)
	if err != nil {
		return fmt.Errorf("CreateSWIFTMessage: invalid amount: %w", err)
	}

	if err := ValidateAmount(amount, "amount"); err != nil {
		return fmt.Errorf("CreateSWIFTMessage: %w", err)
	}

	// Check if message already exists
	existing, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to check message existence: %w", err)
	}
	if existing != nil {
		return fmt.Errorf("SWIFT message %s already exists", messageID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Capture creator's MSP identity
	creatorMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get creator MSP ID: %w", err)
	}
	
	// Get creator's certificate ID
	creatorID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		creatorID = creatorMSP // Fallback to MSP if cert not available
	}

	// Create message
	msg := SWIFTMessageEnhanced{
		MessageID:       messageID,
		MessageType:     messageType,
		SWIFTReference:  swiftRef,
		SenderBIC:       senderBIC,
		ReceiverBIC:     receiverBIC,
		Currency:        currency,
		Amount:          amount,
		ValueDate:       valueDate,
		Beneficiary:     beneficiary,
		RemittanceInfo:  remittanceInfo,
		Status:          SWIFT_STATUS_DRAFT,
		Authenticated:   false,
		ValidationFlags: []string{},
		RetryCount:      0,
		MaxRetries:      3,
		CreatedBy:       creatorID,  // Record WHO created this
		CreatedAt:       txTime,
		UpdatedAt:       txTime,
	}

	// Compute hash
	msg.MessageHash = ComputeMessageHash(&msg)

	// Marshal and save
	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	err = ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
	if err != nil {
		return fmt.Errorf("failed to save message: %w", err)
	}

	fmt.Printf("CreateSWIFTMessage: Created %s message %s\n", messageType, messageID)
	return nil
}

// CreateMT700_IssueLC - Create MT700 message for LC issuance
func (c *CoffeeContract) CreateMT700_IssueLC(ctx contractapi.TransactionContextInterface,
	messageID, lcID, swiftRef, senderBIC, receiverBIC,
	applicant, beneficiary, amountStr, currency, expiryDate,
	loadingPort, dischargePort, latestShipDate string) error {

	// Validate
	if err := ValidateID(messageID, "messageID"); err != nil {
		return fmt.Errorf("CreateMT700: %w", err)
	}

	// Parse amount
	amount, err := parseFloat(amountStr)
	if err != nil {
		return fmt.Errorf("CreateMT700: invalid amount: %w", err)
	}

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Capture creator's MSP identity
	creatorMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get creator MSP ID: %w", err)
	}
	
	// Get creator's certificate ID
	creatorID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		creatorID = creatorMSP // Fallback to MSP if cert not available
	}

	// Create MT700 message
	msg := SWIFTMessageEnhanced{
		MessageID:       messageID,
		MessageType:     MT700_ISSUE_LC,
		SWIFTReference:  swiftRef,
		SenderBIC:       senderBIC,
		ReceiverBIC:     receiverBIC,
		LCNumber:        lcID,
		LCApplicant:     applicant,
		Beneficiary:     beneficiary,
		LCAmount:        amount,
		LCCurrency:      currency,
		Currency:        currency,
		Amount:          amount,
		LCExpiryDate:    expiryDate,
		LoadingPort:     loadingPort,
		DischargePort:   dischargePort,
		LatestShipDate:  latestShipDate,
		Status:          SWIFT_STATUS_DRAFT,
		LinkedLCID:      lcID,
		CreatedBy:       creatorID,  // Record WHO created this
		CreatedAt:       txTime,
		UpdatedAt:       txTime,
		Documents:       []string{},
		ValidationFlags: []string{},
	}

	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal MT700: %w", err)
	}

	err = ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
	if err != nil {
		return fmt.Errorf("failed to save MT700: %w", err)
	}

	fmt.Printf("CreateMT700: LC issuance message created for LC %s\n", lcID)
	return nil
}

// CreateMT707_AmendLC - Create MT707 message for LC amendment
func (c *CoffeeContract) CreateMT707_AmendLC(ctx contractapi.TransactionContextInterface,
	messageID, lcID, swiftRef, senderBIC, receiverBIC,
	amendmentReason, newAmountStr, newExpiryDate string, amendmentNumber int) error {

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	var newAmount float64
	if newAmountStr != "" {
		newAmount, err = parseFloat(newAmountStr)
		if err != nil {
			return fmt.Errorf("CreateMT707: invalid amount: %w", err)
		}
	}

	msg := SWIFTMessageEnhanced{
		MessageID:       messageID,
		MessageType:     MT707_AMEND_LC_ALT,
		SWIFTReference:  swiftRef,
		SenderBIC:       senderBIC,
		ReceiverBIC:     receiverBIC,
		LCNumber:        lcID,
		AmendmentNumber: amendmentNumber,
		AmendmentReason: amendmentReason,
		AmendmentDate:   txTime.Format(time.RFC3339),
		LCAmount:        newAmount,
		LCExpiryDate:    newExpiryDate,
		Status:          SWIFT_STATUS_DRAFT,
		LinkedLCID:      lcID,
		CreatedAt:       txTime,
		UpdatedAt:       txTime,
		ValidationFlags: []string{},
	}

	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal MT707: %w", err)
	}

	err = ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
	if err != nil {
		return fmt.Errorf("failed to save MT707: %w", err)
	}

	fmt.Printf("CreateMT707: LC amendment message created for LC %s\n", lcID)
	return nil
}

// CreateMT103_Payment - Create MT103 message for customer payment
func (c *CoffeeContract) CreateMT103_Payment(ctx contractapi.TransactionContextInterface,
	messageID, swiftRef, senderBIC, receiverBIC, paymentID,
	orderingCustomer, beneficiary, beneficiaryAccount,
	amountStr, currency, valueDate, remittanceInfo, chargeCode string) error {

	// Validate
	amount, err := parseFloat(amountStr)
	if err != nil {
		return fmt.Errorf("CreateMT103: invalid amount: %w", err)
	}

	if err := ValidateChargeCode(chargeCode); err != nil {
		return fmt.Errorf("CreateMT103: %w", err)
	}

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg := SWIFTMessageEnhanced{
		MessageID:         messageID,
		MessageType:       MT103_SINGLE_CUSTOMER_CREDIT,
		SWIFTReference:    swiftRef,
		SenderBIC:         senderBIC,
		ReceiverBIC:       receiverBIC,
		OrderingCustomer:  orderingCustomer,
		Beneficiary:       beneficiary,
		BeneficiaryAccount: beneficiaryAccount,
		Amount:            amount,
		Currency:          currency,
		ValueDate:         valueDate,
		RemittanceInfo:    remittanceInfo,
		Charges:           chargeCode,
		Status:            SWIFT_STATUS_DRAFT,
		LinkedPaymentID:   paymentID,
		CreatedAt:         txTime,
		UpdatedAt:         txTime,
		ValidationFlags:   []string{},
	}

	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal MT103: %w", err)
	}

	err = ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
	if err != nil {
		return fmt.Errorf("failed to save MT103: %w", err)
	}

	fmt.Printf("CreateMT103: Payment message created for payment %s\n", paymentID)
	return nil
}

// CreateMT750_Discrepancy - Create MT750 message for document discrepancy
func (c *CoffeeContract) CreateMT750_Discrepancy(ctx contractapi.TransactionContextInterface,
	messageID, lcID, swiftRef, senderBIC, receiverBIC,
	discrepancyDetails string, discrepancyList []string) error {

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg := SWIFTMessageEnhanced{
		MessageID:          messageID,
		MessageType:        MT750_DISCREPANCY,
		SWIFTReference:     swiftRef,
		SenderBIC:          senderBIC,
		ReceiverBIC:        receiverBIC,
		LCNumber:           lcID,
		DiscrepancyDetails: discrepancyDetails,
		DiscrepancyList:    discrepancyList,
		Action:             "REQUIRED",
		Status:             SWIFT_STATUS_DRAFT,
		LinkedLCID:         lcID,
		CreatedAt:          txTime,
		UpdatedAt:          txTime,
		ValidationFlags:    []string{},
	}

	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal MT750: %w", err)
	}

	err = ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
	if err != nil {
		return fmt.Errorf("failed to save MT750: %w", err)
	}

	fmt.Printf("CreateMT750: Discrepancy report created for LC %s\n", lcID)
	return nil
}

// CreateMT752_AuthPayment - Create MT752 message to authorize payment
func (c *CoffeeContract) CreateMT752_AuthPayment(ctx contractapi.TransactionContextInterface,
	messageID, lcID, swiftRef, senderBIC, receiverBIC,
	amountStr, currency string) error {

	amount, err := parseFloat(amountStr)
	if err != nil {
		return fmt.Errorf("CreateMT752: invalid amount: %w", err)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg := SWIFTMessageEnhanced{
		MessageID:       messageID,
		MessageType:     MT752_AUTH_PAYMENT,
		SWIFTReference:  swiftRef,
		SenderBIC:       senderBIC,
		ReceiverBIC:     receiverBIC,
		LCNumber:        lcID,
		Amount:          amount,
		Currency:        currency,
		Status:          SWIFT_STATUS_DRAFT,
		LinkedLCID:      lcID,
		CreatedAt:       txTime,
		UpdatedAt:       txTime,
		ValidationFlags: []string{},
	}

	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal MT752: %w", err)
	}

	err = ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
	if err != nil {
		return fmt.Errorf("failed to save MT752: %w", err)
	}

	fmt.Printf("CreateMT752: Payment authorization created for LC %s\n", lcID)
	return nil
}

// ==================== MESSAGE STATUS MANAGEMENT ====================

// ApproveSWIFTMessage - Approve message for sending
func (c *CoffeeContract) ApproveSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID, approvedBy string) error {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal message: %w", err)
	}

	if msg.Status != SWIFT_STATUS_DRAFT {
		return fmt.Errorf("can only approve DRAFT messages, current status: %s", msg.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg.Status = SWIFT_STATUS_APPROVED
	msg.ApprovedBy = approvedBy
	msg.UpdatedAt = txTime

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// SendSWIFTMessage - Send approved message
func (c *CoffeeContract) SendSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID, sentBy string) error {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal message: %w", err)
	}

	if msg.Status != SWIFT_STATUS_APPROVED {
		return fmt.Errorf("can only send APPROVED messages, current status: %s", msg.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg.Status = SWIFT_STATUS_SENT
	msg.SentBy = sentBy
	msg.SentDate = txTime
	msg.UpdatedAt = txTime

	// Emit event
	eventPayload := map[string]interface{}{
		"messageId":     messageID,
		"messageType":   msg.MessageType,
		"swiftRef":      msg.SWIFTReference,
		"senderBIC":     msg.SenderBIC,
		"receiverBIC":   msg.ReceiverBIC,
		"status":        msg.Status,
		"sentTimestamp": txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("SWIFTMessageSent", eventJSON)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	fmt.Printf("SendSWIFTMessage: %s message %s sent from %s to %s\n",
		msg.MessageType, messageID, msg.SenderBIC, msg.ReceiverBIC)
	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// ReceiveSWIFTMessage - Mark message as received
func (c *CoffeeContract) ReceiveSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID, receivedBy string) error {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal message: %w", err)
	}

	if msg.Status != SWIFT_STATUS_SENT && msg.Status != SWIFT_STATUS_IN_TRANSIT {
		return fmt.Errorf("invalid status for receiving: %s", msg.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg.Status = SWIFT_STATUS_RECEIVED
	msg.ReceivedBy = receivedBy
	msg.ReceivedDate = txTime.Format(time.RFC3339)
	msg.UpdatedAt = txTime

	// Emit event
	eventPayload := map[string]interface{}{
		"messageId":         messageID,
		"messageType":       msg.MessageType,
		"swiftRef":          msg.SWIFTReference,
		"receiverBIC":       msg.ReceiverBIC,
		"status":            msg.Status,
		"receivedTimestamp": txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("SWIFTMessageReceived", eventJSON)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	fmt.Printf("ReceiveSWIFTMessage: %s message %s received by %s\n",
		msg.MessageType, messageID, msg.ReceiverBIC)
	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// ProcessSWIFTMessage - Process received message
func (c *CoffeeContract) ProcessSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID, processedBy string) error {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal message: %w", err)
	}

	if msg.Status != SWIFT_STATUS_RECEIVED {
		return fmt.Errorf("can only process RECEIVED messages, current status: %s", msg.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg.Status = SWIFT_STATUS_PROCESSING
	msg.ProcessedBy = processedBy
	msg.ProcessedDate = txTime.Format(time.RFC3339)
	msg.UpdatedAt = txTime

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	fmt.Printf("ProcessSWIFTMessage: %s message %s now processing\n", msg.MessageType, messageID)
	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// SettleSWIFTMessage - Mark message as settled
func (c *CoffeeContract) SettleSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID string) error {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal message: %w", err)
	}

	if msg.Status != SWIFT_STATUS_PROCESSING {
		return fmt.Errorf("can only settle PROCESSING messages, current status: %s", msg.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg.Status = SWIFT_STATUS_SETTLED
	msg.UpdatedAt = txTime

	// Emit settlement event
	eventPayload := map[string]interface{}{
		"messageId":        messageID,
		"messageType":      msg.MessageType,
		"swiftRef":         msg.SWIFTReference,
		"amount":           msg.Amount,
		"currency":         msg.Currency,
		"status":           msg.Status,
		"settledTimestamp": txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("SWIFTMessageSettled", eventJSON)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	fmt.Printf("SettleSWIFTMessage: %s message %s settled\n", msg.MessageType, messageID)
	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// RejectSWIFTMessage - Reject message with reason
func (c *CoffeeContract) RejectSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID, reason, errorCode string) error {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal message: %w", err)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	msg.Status = SWIFT_STATUS_REJECTED
	msg.RejectionReason = reason
	msg.ErrorCode = errorCode
	msg.UpdatedAt = txTime

	// Emit rejection event
	eventPayload := map[string]interface{}{
		"messageId":   messageID,
		"messageType": msg.MessageType,
		"swiftRef":    msg.SWIFTReference,
		"reason":      reason,
		"errorCode":   errorCode,
		"status":      msg.Status,
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("SWIFTMessageRejected", eventJSON)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	fmt.Printf("RejectSWIFTMessage: %s message %s rejected: %s\n", msg.MessageType, messageID, reason)
	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// ==================== QUERY FUNCTIONS ====================

// ReadSWIFTMessage - Get message details
func (c *CoffeeContract) ReadSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID string) (*SWIFTMessageEnhanced, error) {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return nil, fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return nil, fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal message: %w", err)
	}

	// Ensure arrays are never nil
	if msg.Documents == nil {
		msg.Documents = []string{}
	}
	if msg.ValidationFlags == nil {
		msg.ValidationFlags = []string{}
	}
	if msg.DiscrepancyList == nil {
		msg.DiscrepancyList = []string{}
	}

	return &msg, nil
}

// QuerySWIFTMessagesByReference - Find message by SWIFT reference
func (c *CoffeeContract) QuerySWIFTMessagesByReference(ctx contractapi.TransactionContextInterface,
	swiftRef string) ([]*SWIFTMessageEnhanced, error) {

	queryString := fmt.Sprintf(`{"selector":{"swiftReference":"%s"}}`, swiftRef)
	return c.querySWIFTMessages(ctx, queryString)
}

// QuerySWIFTMessagesByType - Find messages by type
func (c *CoffeeContract) QuerySWIFTMessagesByType(ctx contractapi.TransactionContextInterface,
	messageType string) ([]*SWIFTMessageEnhanced, error) {

	queryString := fmt.Sprintf(`{"selector":{"messageType":"%s"}}`, messageType)
	return c.querySWIFTMessages(ctx, queryString)
}

// QuerySWIFTMessagesByStatus - Find messages by status
func (c *CoffeeContract) QuerySWIFTMessagesByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*SWIFTMessageEnhanced, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.querySWIFTMessages(ctx, queryString)
}

// QuerySWIFTMessagesByLC - Find all messages for an LC
func (c *CoffeeContract) QuerySWIFTMessagesByLC(ctx contractapi.TransactionContextInterface,
	lcID string) ([]*SWIFTMessageEnhanced, error) {

	queryString := fmt.Sprintf(`{"selector":{"linkedLcId":"%s"}}`, lcID)
	return c.querySWIFTMessages(ctx, queryString)
}

// QuerySWIFTMessagesByPayment - Find all messages for a payment
func (c *CoffeeContract) QuerySWIFTMessagesByPayment(ctx contractapi.TransactionContextInterface,
	paymentID string) ([]*SWIFTMessageEnhanced, error) {

	queryString := fmt.Sprintf(`{"selector":{"linkedPaymentId":"%s"}}`, paymentID)
	return c.querySWIFTMessages(ctx, queryString)
}

// QuerySWIFTMessagesByBIC - Find messages sent by or to a BIC
func (c *CoffeeContract) QuerySWIFTMessagesByBIC(ctx contractapi.TransactionContextInterface,
	bic string, direction string) ([]*SWIFTMessageEnhanced, error) {

	var queryString string
	if direction == "SENT" {
		queryString = fmt.Sprintf(`{"selector":{"senderBic":"%s"}}`, bic)
	} else if direction == "RECEIVED" {
		queryString = fmt.Sprintf(`{"selector":{"receiverBic":"%s"}}`, bic)
	} else {
		queryString = fmt.Sprintf(`{"selector":{"$or":[{"senderBic":"%s"},{"receiverBic":"%s"}]}}`, bic, bic)
	}
	return c.querySWIFTMessages(ctx, queryString)
}

// QueryAllSWIFTMessages - Get all SWIFT messages
func (c *CoffeeContract) QueryAllSWIFTMessages(ctx contractapi.TransactionContextInterface) ([]*SWIFTMessageEnhanced, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("SWIFT_", "SWIFT_~")
	if err != nil {
		return nil, fmt.Errorf("failed to query messages: %w", err)
	}
	defer resultsIterator.Close()

	var messages []*SWIFTMessageEnhanced
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %w", err)
		}

		var msg SWIFTMessageEnhanced
		if err := json.Unmarshal(queryResponse.Value, &msg); err != nil {
			return nil, fmt.Errorf("failed to unmarshal message: %w", err)
		}

		// Ensure arrays are never nil
		if msg.Documents == nil {
			msg.Documents = []string{}
		}
		if msg.ValidationFlags == nil {
			msg.ValidationFlags = []string{}
		}
		if msg.DiscrepancyList == nil {
			msg.DiscrepancyList = []string{}
		}

		messages = append(messages, &msg)
	}

	return messages, nil
}

// Helper function for querying messages
func (c *CoffeeContract) querySWIFTMessages(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*SWIFTMessageEnhanced, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query messages: %w", err)
	}
	defer resultsIterator.Close()

	var messages []*SWIFTMessageEnhanced
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %w", err)
		}

		var msg SWIFTMessageEnhanced
		if err := json.Unmarshal(queryResponse.Value, &msg); err != nil {
			continue
		}

		// Ensure arrays are never nil
		if msg.Documents == nil {
			msg.Documents = []string{}
		}
		if msg.ValidationFlags == nil {
			msg.ValidationFlags = []string{}
		}
		if msg.DiscrepancyList == nil {
			msg.DiscrepancyList = []string{}
		}

		messages = append(messages, &msg)
	}

	return messages, nil
}

// ==================== UTILITY FUNCTIONS ====================

// parseFloat - Helper to parse float with error handling
func parseFloat(s string) (float64, error) {
	if s == "" {
		return 0, fmt.Errorf("empty string")
	}
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}
	return val, nil
}

// GetSWIFTMessageStatistics - Get statistics for SWIFT messages
func (c *CoffeeContract) GetSWIFTMessageStatistics(ctx contractapi.TransactionContextInterface) (map[string]interface{}, error) {
	allMessages, err := c.QueryAllSWIFTMessages(ctx)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"totalMessages": len(allMessages),
		"byType":        make(map[string]int),
		"byStatus":      make(map[string]int),
	}

	byType := make(map[string]int)
	byStatus := make(map[string]int)

	for _, msg := range allMessages {
		byType[msg.MessageType]++
		byStatus[msg.Status]++
	}

	stats["byType"] = byType
	stats["byStatus"] = byStatus

	return stats, nil
}

// SWIFTValidationResult - Result of SWIFT message validation
type SWIFTValidationResult struct {
	IsValid bool     `json:"isValid"`
	Errors  []string `json:"errors"`
}

// ValidateSWIFTMessageComplete - Comprehensive validation before sending
func (c *CoffeeContract) ValidateSWIFTMessageComplete(ctx contractapi.TransactionContextInterface,
	messageID string) (*SWIFTValidationResult, error) {

	msg, err := c.ReadSWIFTMessage(ctx, messageID)
	if err != nil {
		return nil, err
	}

	var errors []string

	// Validate based on message type
	switch msg.MessageType {
	case MT103_SINGLE_CUSTOMER_CREDIT:
		if msg.OrderingCustomer == "" {
			errors = append(errors, "MT103: ordering customer required")
		}
		if msg.Beneficiary == "" {
			errors = append(errors, "MT103: beneficiary required")
		}
		if msg.BeneficiaryAccount == "" {
			errors = append(errors, "MT103: beneficiary account required")
		}
		if msg.Amount <= 0 {
			errors = append(errors, "MT103: valid amount required")
		}
		if msg.Currency == "" {
			errors = append(errors, "MT103: currency required")
		}

	case MT700_ISSUE_LC:
		if msg.LCNumber == "" {
			errors = append(errors, "MT700: LC number required")
		}
		if msg.LCApplicant == "" {
			errors = append(errors, "MT700: applicant required")
		}
		if msg.Beneficiary == "" {
			errors = append(errors, "MT700: beneficiary required")
		}
		if msg.LCAmount <= 0 {
			errors = append(errors, "MT700: LC amount required")
		}
		if msg.LCExpiryDate == "" {
			errors = append(errors, "MT700: expiry date required")
		}

	case MT707_AMEND_LC_ALT:
		if msg.LCNumber == "" {
			errors = append(errors, "MT707: LC number required")
		}
		if msg.AmendmentReason == "" {
			errors = append(errors, "MT707: amendment reason required")
		}

	case MT750_DISCREPANCY:
		if msg.LCNumber == "" {
			errors = append(errors, "MT750: LC number required")
		}
		if msg.DiscrepancyDetails == "" {
			errors = append(errors, "MT750: discrepancy details required")
		}

	case MT752_AUTH_PAYMENT:
		if msg.LCNumber == "" {
			errors = append(errors, "MT752: LC number required")
		}
		if msg.Amount <= 0 {
			errors = append(errors, "MT752: amount required")
		}
	}

	// Common validations
	if msg.SenderBIC == "" {
		errors = append(errors, "sender BIC required")
	}
	if msg.ReceiverBIC == "" {
		errors = append(errors, "receiver BIC required")
	}
	if msg.SWIFTReference == "" {
		errors = append(errors, "SWIFT reference required")
	}

	isValid := len(errors) == 0
	return &SWIFTValidationResult{
		IsValid: isValid,
		Errors:  errors,
	}, nil
}

// UpdateSWIFTMessageField - Update specific fields in a DRAFT message
func (c *CoffeeContract) UpdateSWIFTMessageField(ctx contractapi.TransactionContextInterface,
	messageID, fieldName, fieldValue string) error {

	msgJSON, err := ctx.GetStub().GetState("SWIFT_" + messageID)
	if err != nil {
		return fmt.Errorf("failed to read message: %w", err)
	}
	if msgJSON == nil {
		return fmt.Errorf("message %s not found", messageID)
	}

	var msg SWIFTMessageEnhanced
	if err := json.Unmarshal(msgJSON, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal message: %w", err)
	}

	// Only allow updates to DRAFT messages
	if msg.Status != SWIFT_STATUS_DRAFT {
		return fmt.Errorf("can only update DRAFT messages, current status: %s", msg.Status)
	}

	// Update field based on name
	switch fieldName {
	case "beneficiary":
		msg.Beneficiary = fieldValue
	case "remittanceInfo":
		msg.RemittanceInfo = fieldValue
	case "valueDate":
		msg.ValueDate = fieldValue
	case "charges":
		if err := ValidateChargeCode(fieldValue); err != nil {
			return err
		}
		msg.Charges = fieldValue
	case "orderingCustomer":
		msg.OrderingCustomer = fieldValue
	case "beneficiaryAccount":
		msg.BeneficiaryAccount = fieldValue
	default:
		return fmt.Errorf("field %s cannot be updated", fieldName)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	msg.UpdatedAt = txTime

	// Recompute hash
	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

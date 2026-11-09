package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
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
	MT700_ISSUE_LC         = "MT700"
	MT701_AMEND_LC         = "MT701"
	MT707_AMEND_LC_ALT     = "MT707"
	MT710_ADVICE_LC        = "MT710"
	MT730_ACKNOWLEDGMENT   = "MT730"
	MT740_AUTH_REIMBURSE   = "MT740"
	MT750_DISCREPANCY      = "MT750"
	MT752_AUTH_PAYMENT     = "MT752"
	MT754_ADVICE_PAYMENT   = "MT754"
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

// NBE_APPROVED is the regulatory pre-approval state: NBEApproveSWIFTMessage
// moves a DRAFT message here (AML + sanctions screening passed), and
// ApproveSWIFTMessage accepts DRAFT or NBE_APPROVED. The dedicated
// NBEApproval* fields below preserve the NBE decision after the message
// moves on to APPROVED.
const SWIFT_STATUS_NBE_APPROVED = "NBE_APPROVED"

// SWIFTDocument is one document attached to a SWIFT message by
// AddSWIFTDocuments. At least one of ID, Name, Hash must be non-empty.
type SWIFTDocument struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Hash string `json:"hash"`
}

// Charge Codes
const (
	CHARGE_OUR = "OUR" // All charges borne by sender
	CHARGE_SHA = "SHA" // Charges shared
	CHARGE_BEN = "BEN" // All charges borne by beneficiary
)

// ==================== ENHANCED SWIFT MESSAGE STRUCTURE ====================

type SWIFTMessageEnhanced struct {
	// Message Identification
	MessageID        string `json:"messageId"`        // System ID
	MessageType      string `json:"messageType"`      // MT103, MT700, etc.
	SWIFTReference   string `json:"swiftReference"`   // Unique SWIFT reference (20 chars)
	RelatedReference string `json:"relatedReference"` // Reference to previous message

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
	OrderingCustomer    string `json:"orderingCustomer"`    // Buyer/Applicant (Field 50)
	OrderingInstitution string `json:"orderingInstitution"` // Buyer's bank
	Beneficiary         string `json:"beneficiary"`         // Seller/Exporter (Field 59)
	BeneficiaryBank     string `json:"beneficiaryBank"`     // Exporter's bank
	BeneficiaryAccount  string `json:"beneficiaryAccount"`  // Account number

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
	Status           string `json:"status"`           // DRAFT, SENT, RECEIVED, etc.
	ProcessingStatus string `json:"processingStatus"` // Detailed processing state
	RejectionReason  string `json:"rejectionReason"`  // Why rejected
	ErrorCode        string `json:"errorCode"`        // SWIFT error code (G01, D01, etc.)
	RetryCount       int    `json:"retryCount"`       // Number of retries
	MaxRetries       int    `json:"maxRetries"`       // Maximum retry attempts

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

	// NBE regulatory approval (set by NBEApproveSWIFTMessage; survives the
	// later DRAFT/NBE_APPROVED -> APPROVED transition).
	NBEApprovedBy        string `json:"nbeApprovedBy"`
	NBEApprovalDate      string `json:"nbeApprovalDate"`
	NBEAMLCheck          string `json:"nbeAmlCheck"`          // PASS or FAIL
	NBESanctionScreening string `json:"nbeSanctionScreening"` // PASS or FAIL
	NBEApprovalComments  string `json:"nbeApprovalComments"`

	// Documents attached after creation (set by AddSWIFTDocuments).
	// Documents (above) remains the required-documents list from creation.
	AttachedDocuments []SWIFTDocument `json:"attachedDocuments"`

	// Raw and Hash
	RawMessage      string `json:"rawMessage"`      // Original SWIFT format
	MessageHash     string `json:"messageHash"`     // SHA-256 hash
	NetworkInfo     string `json:"networkInfo"`     // Network routing info
	PriorityCode    string `json:"priorityCode"`    // Normal/Urgent
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
		MT202_FI_TRANSFER:            true,
		MT300_FOREX_CONFIRMATION:     true,
		MT700_ISSUE_LC:               true,
		MT701_AMEND_LC:               true,
		MT707_AMEND_LC_ALT:           true,
		MT710_ADVICE_LC:              true,
		MT730_ACKNOWLEDGMENT:         true,
		MT740_AUTH_REIMBURSE:         true,
		MT750_DISCREPANCY:            true,
		MT752_AUTH_PAYMENT:           true,
		MT754_ADVICE_PAYMENT:         true,
		MT756_ADVICE_REIMBURSE:       true,
		MT400_ADVICE_PAYMENT_COL:     true,
		MT910_CONFIRM_CREDIT:         true,
		MT940_STATEMENT:              true,
		MT999_FREE_FORMAT:            true,
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
		CreatedBy:       creatorID, // Record WHO created this
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
		CreatedBy:       creatorID, // Record WHO created this
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	msg := SWIFTMessageEnhanced{
		MessageID:          messageID,
		MessageType:        MT103_SINGLE_CUSTOMER_CREDIT,
		SWIFTReference:     swiftRef,
		SenderBIC:          senderBIC,
		ReceiverBIC:        receiverBIC,
		OrderingCustomer:   orderingCustomer,
		Beneficiary:        beneficiary,
		BeneficiaryAccount: beneficiaryAccount,
		Amount:             amount,
		Currency:           currency,
		ValueDate:          valueDate,
		RemittanceInfo:     remittanceInfo,
		Charges:            chargeCode,
		Status:             SWIFT_STATUS_DRAFT,
		LinkedPaymentID:    paymentID,
		CreatedAt:          txTime,
		UpdatedAt:          txTime,
		ValidationFlags:    []string{},
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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

	// NBE approval is a pre-approval gate: a message may go DRAFT ->
	// APPROVED directly, or DRAFT -> NBE_APPROVED (NBEApproveSWIFTMessage)
	// -> APPROVED. The NBE decision itself is preserved in the
	// NBEApproval* fields, so it survives this transition.
	if msg.Status != SWIFT_STATUS_DRAFT && msg.Status != SWIFT_STATUS_NBE_APPROVED {
		return fmt.Errorf("can only approve DRAFT or NBE_APPROVED messages, current status: %s", msg.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	msg.Status = SWIFT_STATUS_APPROVED
	msg.ApprovedBy = approvedBy
	msg.UpdatedAt = txTime

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// NBEApproveSWIFTMessage - NBE regulatory approval for a SWIFT message.
//
// ORDERING (decided from swift.go's machine and the API flow in
// swift.ts): NBE approval is a pre-approval gate that applies to a
// message in DRAFT, BEFORE ApproveSWIFTMessage. The API drives
// create -> NBE approve -> (bank) approve -> send, and returns status
// NBE_APPROVED. The message moves DRAFT -> NBE_APPROVED here, and
// ApproveSWIFTMessage accepts DRAFT or NBE_APPROVED, so the gate is
// optional: a message that does not need NBE approval can still go
// DRAFT -> APPROVED directly. The NBE decision (approver, AML and
// sanctions results, comments) is recorded in the dedicated NBEApproval*
// fields, which survive the later transition to APPROVED — the Status
// field alone cannot carry it, because SendSWIFTMessage requires
// APPROVED.
//
// NOTE for the API owner: the statusManager SWIFT table has no
// NBE_APPROVED row yet (DRAFT lists only APPROVED/REJECTED); it needs
// DRAFT -> NBE_APPROVED and NBE_APPROVED -> APPROVED/REJECTED.
func (c *CoffeeContract) NBEApproveSWIFTMessage(ctx contractapi.TransactionContextInterface,
	messageID, approvedBy, amlCheck, sanctionScreening, comments, timestamp string) error {

	if err := ValidateID(messageID, "messageID"); err != nil {
		return fmt.Errorf("NBEApproveSWIFTMessage: %w", err)
	}
	if err := ValidateNonEmptyString(approvedBy, "approvedBy", MaxStringLen); err != nil {
		return fmt.Errorf("NBEApproveSWIFTMessage: %w", err)
	}
	if err := ValidateEnum(amlCheck, []string{"PASS", "FAIL"}, "amlCheck"); err != nil {
		return fmt.Errorf("NBEApproveSWIFTMessage: %w", err)
	}
	if err := ValidateEnum(sanctionScreening, []string{"PASS", "FAIL"}, "sanctionScreening"); err != nil {
		return fmt.Errorf("NBEApproveSWIFTMessage: %w", err)
	}
	if err := ValidateDate(timestamp); err != nil {
		return fmt.Errorf("NBEApproveSWIFTMessage: %w", err)
	}

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("NBEApproveSWIFTMessage: failed to get MSP ID: %w", err)
	}
	if mspID != "NBEMSP" {
		return fmt.Errorf("NBEApproveSWIFTMessage: unauthorized - only NBE can approve SWIFT messages, got: %s", mspID)
	}

	// A failed screening can never be approved, on-chain or off. The API
	// route rejects FAIL before invoking; this is the same rule enforced
	// at the ledger so a direct invoke cannot bypass it.
	if amlCheck == "FAIL" || sanctionScreening == "FAIL" {
		return fmt.Errorf("NBEApproveSWIFTMessage: message failed compliance screening (amlCheck=%s, sanctionScreening=%s)", amlCheck, sanctionScreening)
	}

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
		return fmt.Errorf("NBE approval applies to DRAFT messages only, current status: %s", msg.Status)
	}

	txTime, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("NBEApproveSWIFTMessage: failed to read Fabric transaction timestamp: %w", err)
	}

	msg.Status = SWIFT_STATUS_NBE_APPROVED
	msg.NBEApprovedBy = approvedBy
	msg.NBEApprovalDate = timestamp
	msg.NBEAMLCheck = amlCheck
	msg.NBESanctionScreening = sanctionScreening
	msg.NBEApprovalComments = comments
	msg.UpdatedAt = txTime

	// Recompute hash — the NBE approval fields are part of the message.
	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	eventPayload := map[string]interface{}{
		"messageId":         messageID,
		"messageType":       msg.MessageType,
		"swiftRef":          msg.SWIFTReference,
		"approvedBy":        approvedBy,
		"amlCheck":          amlCheck,
		"sanctionScreening": sanctionScreening,
		"status":            msg.Status,
		"approvalDate":      timestamp,
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("SWIFTMessageNBEApproved", eventJSON)

	fmt.Printf("NBEApproveSWIFTMessage: %s message %s NBE-approved by %s (AML %s, sanctions %s)\n",
		msg.MessageType, messageID, approvedBy, amlCheck, sanctionScreening)
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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

	// GUARD (status-transition audit §17): a SETTLED, REJECTED, CANCELLED
	// or FAILED message is terminal and cannot be rejected.
	if msg.Status == SWIFT_STATUS_SETTLED || msg.Status == SWIFT_STATUS_REJECTED ||
		msg.Status == SWIFT_STATUS_CANCELLED || msg.Status == SWIFT_STATUS_FAILED {
		return fmt.Errorf("cannot reject message in terminal status: %s", msg.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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

// GetSWIFTMessageStatistics - Get statistics for SWIFT messages
func (c *CoffeeContract) GetSWIFTMessageStatistics(ctx contractapi.TransactionContextInterface) (map[string]interface{}, error) {
	ledgerNow, err := ledgerTransactionTime(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetSWIFTMessageStatistics: failed to read Fabric transaction timestamp: %w", err)
	}

	allMessages, err := c.QueryAllSWIFTMessages(ctx)
	if err != nil {
		return nil, err
	}

	// Initialize counters
	totalMessages := len(allMessages)
	messagesToday := 0
	pendingApproval := 0
	settledToday := 0
	totalValue := 0.0
	sent := 0
	received := 0
	totalSettlementDays := 0.0
	settledCount := 0

	byType := make(map[string]int)
	byStatus := make(map[string]int)

	// Get today's date (YYYY-MM-DD format)
	now := ledgerNow
	today := now.Format("2006-01-02")

	// Get user's organization BIC to determine sent vs received
	userBIC := ""
	clientID, err := ctx.GetClientIdentity().GetID()
	if err == nil {
		// Extract organization from client ID if possible
		userBIC = clientID // Simplified - in production, extract BIC from cert attributes
	}

	// Process all messages
	for _, msg := range allMessages {
		// Count by type
		byType[msg.MessageType]++

		// Count by status
		byStatus[msg.Status]++

		// Count messages created today
		msgDate := msg.CreatedAt.Format("2006-01-02")
		if msgDate == today {
			messagesToday++
		}

		// Count pending approval
		if msg.Status == "PENDING_APPROVAL" {
			pendingApproval++
		}

		// Count settled today
		if msg.Status == "SETTLED" {
			// Check if ProcessedDate is today (closest we have to settled date)
			if msg.ProcessedDate != "" {
				settledTime, parseErr := time.Parse("2006-01-02T15:04:05Z07:00", msg.ProcessedDate)
				if parseErr == nil && settledTime.Format("2006-01-02") == today {
					settledToday++
				}
			}
		}

		// Sum total value (for payment messages)
		if msg.Amount > 0 {
			totalValue += msg.Amount
		}
		if msg.LCAmount > 0 {
			totalValue += msg.LCAmount
		}

		// Count sent vs received based on sender BIC
		if userBIC != "" {
			if strings.Contains(msg.SenderBIC, userBIC) || msg.SentBy == clientID {
				sent++
			} else if strings.Contains(msg.ReceiverBIC, userBIC) || msg.ReceivedBy == clientID {
				received++
			}
		} else {
			// If can't determine user, count based on SentBy field
			if msg.SentBy != "" {
				sent++
			}
			if msg.ReceivedBy != "" {
				received++
			}
		}

		// Calculate average settlement time (days between sent and processed/settled)
		if msg.Status == "SETTLED" && !msg.SentDate.IsZero() && msg.ProcessedDate != "" {
			processedTime, parseErr := time.Parse("2006-01-02T15:04:05Z07:00", msg.ProcessedDate)
			if parseErr == nil {
				days := processedTime.Sub(msg.SentDate).Hours() / 24
				if days >= 0 {
					totalSettlementDays += days
					settledCount++
				}
			}
		}
	}

	// Calculate average settlement time
	avgSettlementTime := 0.0
	if settledCount > 0 {
		avgSettlementTime = totalSettlementDays / float64(settledCount)
	}

	// Build statistics response
	stats := map[string]interface{}{
		"totalMessages":     totalMessages,
		"messagesToday":     messagesToday,
		"pendingApproval":   pendingApproval,
		"settledToday":      settledToday,
		"totalValue":        totalValue,
		"sent":              sent,
		"received":          received,
		"avgSettlementTime": avgSettlementTime,
		"byType":            byType,
		"byStatus":          byStatus,
	}

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
	msg.UpdatedAt = txTime

	// Recompute hash
	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// LinkSWIFTMessageToLC - Link a SWIFT message to an LC
func (c *CoffeeContract) LinkSWIFTMessageToLC(ctx contractapi.TransactionContextInterface,
	messageID, lcID string) error {

	// Validate inputs
	if messageID == "" {
		return fmt.Errorf("message ID is required")
	}
	if lcID == "" {
		return fmt.Errorf("LC ID is required")
	}

	// Get SWIFT message
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

	// Verify LC exists (optional validation)
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC: %w", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s not found", lcID)
	}

	// Link the LC to the message
	msg.LinkedLCID = lcID

	// Update timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
	msg.UpdatedAt = txTime

	// Recompute hash
	msg.MessageHash = ComputeMessageHash(&msg)

	// Save updated message
	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	if err := ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON); err != nil {
		return fmt.Errorf("failed to save message: %w", err)
	}

	return nil
}

// AddSWIFTDocuments - Attach documents to a SWIFT message.
// Called by POST /swift/messages (fire-and-forget) with
// (messageID, JSON(documents)) right after the message is created.
// documentsJSON must be a JSON array; each entry is either an object
// with at least one of id / name / hash, or a bare string (treated as
// the document name). Entries are appended to AttachedDocuments (the
// structured list) and their display name (name, else id, else hash) is
// also appended to the legacy Documents list so existing consumers of
// that list see them. Only DRAFT and NBE_APPROVED messages accept new
// documents — once a message is approved and sent, its document set is
// frozen.
func (c *CoffeeContract) AddSWIFTDocuments(ctx contractapi.TransactionContextInterface,
	messageID, documentsJSON string) error {

	if err := ValidateID(messageID, "messageID"); err != nil {
		return fmt.Errorf("AddSWIFTDocuments: %w", err)
	}
	if strings.TrimSpace(documentsJSON) == "" {
		return fmt.Errorf("AddSWIFTDocuments: documents JSON is required")
	}

	var rawDocs []json.RawMessage
	if err := json.Unmarshal([]byte(documentsJSON), &rawDocs); err != nil {
		return fmt.Errorf("AddSWIFTDocuments: documents must be a JSON array: %w", err)
	}
	if len(rawDocs) == 0 {
		return fmt.Errorf("AddSWIFTDocuments: documents array must not be empty")
	}
	docs := make([]SWIFTDocument, 0, len(rawDocs))
	for i, raw := range rawDocs {
		// Bare string entry: treat it as the document name.
		var name string
		if err := json.Unmarshal(raw, &name); err == nil {
			name = strings.TrimSpace(name)
			if name == "" {
				return fmt.Errorf("AddSWIFTDocuments: document at index %d must not be an empty string", i)
			}
			docs = append(docs, SWIFTDocument{Name: name})
			continue
		}
		var doc SWIFTDocument
		if err := json.Unmarshal(raw, &doc); err != nil {
			return fmt.Errorf("AddSWIFTDocuments: document at index %d is not an object or string: %w", i, err)
		}
		doc.ID = strings.TrimSpace(doc.ID)
		doc.Name = strings.TrimSpace(doc.Name)
		doc.Hash = strings.TrimSpace(doc.Hash)
		if doc.ID == "" && doc.Name == "" && doc.Hash == "" {
			return fmt.Errorf("AddSWIFTDocuments: document at index %d must have at least one of id, name, hash", i)
		}
		docs = append(docs, doc)
	}

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

	if msg.Status != SWIFT_STATUS_DRAFT && msg.Status != SWIFT_STATUS_NBE_APPROVED {
		return fmt.Errorf("AddSWIFTDocuments: documents can only be added to DRAFT or NBE_APPROVED messages, current status: %s", msg.Status)
	}

	txTime, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("AddSWIFTDocuments: failed to read Fabric transaction timestamp: %w", err)
	}

	for _, doc := range docs {
		msg.AttachedDocuments = append(msg.AttachedDocuments, doc)
		display := doc.Name
		if display == "" {
			display = doc.ID
		}
		if display == "" {
			display = doc.Hash
		}
		msg.Documents = append(msg.Documents, display)
	}
	msg.UpdatedAt = txTime
	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	fmt.Printf("AddSWIFTDocuments: %d document(s) attached to message %s\n", len(docs), messageID)
	return ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON)
}

// LinkSWIFTMessageToPayment - Link a SWIFT message to a payment record.
// Modelled on LinkSWIFTMessageToLC: both records must exist, and the link
// is set on both — LinkedPaymentID on the message and
// LinkedSWIFTMessageID on the payment — so either side can be queried
// for the other. Called by POST /swift/messages (fire-and-forget) with
// (messageID, linkedPaymentId).
func (c *CoffeeContract) LinkSWIFTMessageToPayment(ctx contractapi.TransactionContextInterface,
	messageID, linkedPaymentId string) error {

	if messageID == "" {
		return fmt.Errorf("message ID is required")
	}
	if linkedPaymentId == "" {
		return fmt.Errorf("payment ID is required")
	}

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

	payment, err := c.ReadPayment(ctx, linkedPaymentId)
	if err != nil {
		return fmt.Errorf("LinkSWIFTMessageToPayment: %w", err)
	}

	txTime, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("LinkSWIFTMessageToPayment: failed to read Fabric transaction timestamp: %w", err)
	}

	msg.LinkedPaymentID = linkedPaymentId
	msg.UpdatedAt = txTime
	msg.MessageHash = ComputeMessageHash(&msg)

	msgJSON, err = json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}
	if err := ctx.GetStub().PutState("SWIFT_"+messageID, msgJSON); err != nil {
		return fmt.Errorf("failed to save message: %w", err)
	}

	payment.LinkedSWIFTMessageID = messageID
	payment.UpdatedAt = txTime

	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %w", err)
	}
	if err := ctx.GetStub().PutState("PAYMENT_"+linkedPaymentId, paymentJSON); err != nil {
		return fmt.Errorf("LinkSWIFTMessageToPayment: failed to save payment: %w", err)
	}

	fmt.Printf("LinkSWIFTMessageToPayment: message %s linked to payment %s\n", messageID, linkedPaymentId)
	return nil
}

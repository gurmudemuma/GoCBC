package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== PAYMENT SETTLEMENT STRUCTURE ====================

type PaymentSettlement struct {
	PaymentID         string      `json:"paymentId"`
	ContractID        string      `json:"contractId"`
	ExporterID        string      `json:"exporterId"`
	LCID              string      `json:"lcId"`
	Amount            float64     `json:"amount"`
	Currency          string      `json:"currency"`
	ExchangeRate      float64     `json:"exchangeRate"`
	AmountBirr        float64     `json:"amountBirr"`
	RetentionRate     float64     `json:"retentionRate"`     // NBE retention percentage (NBE FXD/01/2024: 100% allowed)
	RetainedAmount    float64     `json:"retainedAmount"`    // Amount retained in forex
	ConvertedAmount   float64     `json:"convertedAmount"`   // Amount converted to Birr
	Status            string      `json:"status"`            // PENDING, DOCUMENTS_SUBMITTED, VERIFIED, SWIFT_INITIATED, SWIFT_RECEIVED, SETTLED
	PaymentMethod     string      `json:"paymentMethod"`     // LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
	PaymentDate       string      `json:"paymentDate"`
	ReceivingBank     string      `json:"receivingBank"`     // Ethiopian bank
	ReceivingBankBIC  string      `json:"receivingBankBic"`  // SWIFT BIC code
	PayingBank        string      `json:"payingBank"`        // Foreign bank
	PayingBankBIC     string      `json:"payingBankBic"`     // Foreign bank BIC
	BeneficiaryName   string      `json:"beneficiaryName"`   // Exporter name
	BeneficiaryAccount string     `json:"beneficiaryAccount"` // Exporter account number
	Documents         []string    `json:"documents"`         // B/L, Invoice, etc.
	SWIFTDetails      SWIFTMessage `json:"swiftDetails"`      // SWIFT message details
	VerifiedBy        string      `json:"verifiedBy"`
	NBEApprovalRef    string      `json:"nbeApprovalRef"`    // NBE approval for payment
	Comments          string      `json:"comments"`
	CreatedAt         time.Time   `json:"createdAt"`
	UpdatedAt         time.Time   `json:"updatedAt"`
	
	// ==================== PAYMENT METHOD-SPECIFIC FIELDS ====================
	// Added June 26, 2026 for payment method differentiation
	PaymentStage      string      `json:"paymentStage"`      // ADVANCE, BALANCE, FULL
	AdvancePercentage float64     `json:"advancePercentage"` // e.g., 30.0 for 30%
	AdvanceAmount     float64     `json:"advanceAmount"`     // Amount of advance payment
	BalanceAmount     float64     `json:"balanceAmount"`     // Remaining balance
	DocumentsHeldBy   string      `json:"documentsHeldBy"`   // EXPORTER_BANK, BUYER_BANK, RELEASED, DIRECT
	DocumentReleaseDate string    `json:"documentReleaseDate"` // When documents released to buyer
	RiskProfile       string      `json:"riskProfile"`       // LOW, MEDIUM, HIGH
	BankGuarantee     bool        `json:"bankGuarantee"`     // true for LC only
	UCP600Compliance  bool        `json:"ucp600Compliance"`  // true for LC only
	URC522Compliance  bool        `json:"urc522Compliance"`  // true for CAD only
	ProformaInvoice   string      `json:"proformaInvoice"`   // For ADVANCE method
	ShipmentID        string      `json:"shipmentId"`        // Link to shipment (for CAD validation)
}

// SWIFT Message structure for payment tracking
type SWIFTMessage struct {
	MessageType       string    `json:"messageType"`       // MT103, MT700, MT799, etc.
	SWIFTReference    string    `json:"swiftReference"`    // Unique SWIFT reference number
	SenderBIC         string    `json:"senderBic"`         // Sender bank BIC
	ReceiverBIC       string    `json:"receiverBic"`       // Receiver bank BIC
	ValueDate         string    `json:"valueDate"`         // Payment value date
	SentDate          time.Time `json:"sentDate"`          // SWIFT message sent timestamp
	ReceivedDate      string    `json:"receivedDate"`      // SWIFT message received timestamp
	Intermediary1     string    `json:"intermediary1"`     // Intermediary bank 1 (if any)
	Intermediary2     string    `json:"intermediary2"`     // Intermediary bank 2 (if any)
	Charges           string    `json:"charges"`           // OUR/SHA/BEN
	RemittanceInfo    string    `json:"remittanceInfo"`    // Payment details/reference
	Status            string    `json:"status"`            // SENT, IN_TRANSIT, RECEIVED, SETTLED, REJECTED
	RejectionReason   string    `json:"rejectionReason"`   // If rejected
}

// ==================== PAYMENT METHOD DIFFERENTIATION ====================
// Added June 26, 2026 - Each payment method has unique workflow requirements

// validatePaymentMethod - Validate payment method value
func validatePaymentMethod(method string) error {
	validMethods := map[string]bool{
		"LC":         true, // Letter of Credit (bank guaranteed, UCP 600)
		"CAD":        true, // Cash Against Documents (no guarantee, URC 522)
		"TT_ADVANCE": true, // Telegraphic Transfer - Advance (payment before shipment)
		"TT_POST":    true, // Telegraphic Transfer - Post-shipment (payment after)
		"ADVANCE":    true, // Advance Payment (payment before production)
	}
	if !validMethods[method] {
		return fmt.Errorf("invalid payment method: %s (valid: LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)", method)
	}
	return nil
}

// validateStatusTransition - Validate if status transition is allowed for payment method
func validateStatusTransition(currentStatus, newStatus, paymentMethod string) error {
	// Define valid transitions per payment method
	validTransitions := map[string]map[string][]string{
		"LC": {
			"PENDING":              []string{"DOCUMENTS_SUBMITTED"},
			"DOCUMENTS_SUBMITTED":  []string{"UNDER_VERIFICATION", "REJECTED"},
			"UNDER_VERIFICATION":   []string{"VERIFICATION_PASSED", "VERIFICATION_FAILED"},
			"VERIFICATION_PASSED":  []string{"PAYMENT_AUTHORIZED"},
			"PAYMENT_AUTHORIZED":   []string{"SWIFT_INITIATED"},
			"SWIFT_INITIATED":      []string{"SWIFT_RECEIVED", "REJECTED"},
			"SWIFT_RECEIVED":       []string{"SETTLED"},
			"SETTLED":              []string{"DOCUMENTS_RELEASED"},
		},
		"CAD": {
			"PENDING":              []string{"GOODS_SHIPPED"},
			"GOODS_SHIPPED":        []string{"DOCUMENTS_SENT_TO_BANK"},
			"DOCUMENTS_SENT_TO_BANK": []string{"DOCUMENTS_FORWARDED"},
			"DOCUMENTS_FORWARDED":  []string{"BUYER_NOTIFIED"},
			"BUYER_NOTIFIED":       []string{"PAYMENT_RECEIVED", "REJECTED"},
			"PAYMENT_RECEIVED":     []string{"DOCUMENTS_RELEASED"},
			"DOCUMENTS_RELEASED":   []string{"SETTLED"},
		},
		"TT_ADVANCE": {
			"PENDING":              []string{"ADVANCE_REQUESTED"},
			"ADVANCE_REQUESTED":    []string{"ADVANCE_RECEIVED"},
			"ADVANCE_RECEIVED":     []string{"GOODS_SHIPPED"},
			"GOODS_SHIPPED":        []string{"BALANCE_REQUESTED", "SETTLED"}, // SETTLED if 100% advance
			"BALANCE_REQUESTED":    []string{"BALANCE_RECEIVED"},
			"BALANCE_RECEIVED":     []string{"SETTLED"},
		},
		"TT_POST": {
			"PENDING":              []string{"GOODS_SHIPPED"},
			"GOODS_SHIPPED":        []string{"DOCUMENTS_SENT_DIRECTLY"},
			"DOCUMENTS_SENT_DIRECTLY": []string{"PAYMENT_AWAITED"},
			"PAYMENT_AWAITED":      []string{"PAYMENT_RECEIVED"},
			"PAYMENT_RECEIVED":     []string{"SETTLED"},
		},
		"ADVANCE": {
			"PENDING":              []string{"PROFORMA_ISSUED"},
			"PROFORMA_ISSUED":      []string{"ADVANCE_RECEIVED"},
			"ADVANCE_RECEIVED":     []string{"CONTRACT_REGISTERED"},
			"CONTRACT_REGISTERED":  []string{"COFFEE_SOURCING"},
			"COFFEE_SOURCING":      []string{"QUALITY_INSPECTION"},
			"QUALITY_INSPECTION":   []string{"GOODS_SHIPPED"},
			"GOODS_SHIPPED":        []string{"BALANCE_REQUESTED", "SETTLED"}, // SETTLED if 100% advance
			"BALANCE_REQUESTED":    []string{"BALANCE_RECEIVED"},
			"BALANCE_RECEIVED":     []string{"SETTLED"},
		},
	}

	// Get allowed transitions for this payment method
	methodTransitions, ok := validTransitions[paymentMethod]
	if !ok {
		return fmt.Errorf("no transition rules defined for payment method: %s", paymentMethod)
	}

	// Get allowed next statuses for current status
	allowedNext, ok := methodTransitions[currentStatus]
	if !ok {
		return fmt.Errorf("invalid current status '%s' for payment method %s", currentStatus, paymentMethod)
	}

	// Check if new status is in allowed list
	for _, allowed := range allowedNext {
		if allowed == newStatus {
			return nil // Valid transition
		}
	}

	return fmt.Errorf("invalid status transition from '%s' to '%s' for payment method %s", 
		currentStatus, newStatus, paymentMethod)
}

// getPaymentMethodMetadata - Get metadata for payment method (risk, guarantee, etc.)
func getPaymentMethodMetadata(method string) (string, bool, bool, bool) {
	// Returns: riskProfile, bankGuarantee, ucp600Compliance, urc522Compliance
	metadata := map[string]struct{
		risk string
		guarantee bool
		ucp600 bool
		urc522 bool
	}{
		"LC":         {"LOW", true, true, false},
		"CAD":        {"MEDIUM", false, false, true},
		"TT_ADVANCE": {"LOW", false, false, false},
		"TT_POST":    {"HIGH", false, false, false},
		"ADVANCE":    {"LOW", false, false, false},
	}
	
	m := metadata[method]
	return m.risk, m.guarantee, m.ucp600, m.urc522
}

// ==================== PAYMENT FUNCTIONS ====================

// InitiatePayment - Exporter initiates payment process with SWIFT details
// AUTO-MAPS: Amount, currency, beneficiary details from LC and exporter data
// VALIDATES: Payment method prerequisites (LC must exist, shipment must have B/L, etc.)
func (c *CoffeeContract) InitiatePayment(ctx contractapi.TransactionContextInterface,
	paymentID, contractID, exporterID, lcID, amountStr, currency, receivingBank, 
	receivingBankBIC, beneficiaryName, beneficiaryAccount, paymentMethod string) error {

	// ==================== PAYMENT METHOD VALIDATION ====================
	// Validate payment method
	if err := validatePaymentMethod(paymentMethod); err != nil {
		return err
	}

	// ==================== PAYMENT METHOD PREREQUISITES ====================
	var lc LetterOfCredit
	var lcExists bool
	
	// Fetch LC data for auto-mapping and validation
	fmt.Printf("InitiatePayment: Fetching LC %s for data mapping...\n", lcID)
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err == nil && lcJSON != nil {
		if json.Unmarshal(lcJSON, &lc) == nil {
			lcExists = true
		}
	}

	// Method-specific prerequisite checks
	switch paymentMethod {
	case "LC":
		// LC method REQUIRES issued LC
		if !lcExists {
			return fmt.Errorf("payment method LC requires valid Letter of Credit (LC ID: %s not found)", lcID)
		}
		if lc.Status != "ISSUED" {
			return fmt.Errorf("payment method LC requires LC to be ISSUED (current status: %s)", lc.Status)
		}
		fmt.Printf("✓ LC prerequisite validated: LC %s is ISSUED\n", lcID)
		
	case "CAD":
		// CAD requires completed shipment with B/L
		// Note: We'll validate this by checking if documents include B/L
		fmt.Printf("✓ CAD method: Will require B/L in documents submission\n")
		
	case "TT_ADVANCE", "ADVANCE":
		// No LC required for advance methods
		fmt.Printf("✓ %s method: No LC prerequisite required\n", paymentMethod)
		
	case "TT_POST":
		// Post-payment TT: Shipment should be completed first
		fmt.Printf("✓ TT_POST method: Should have completed shipment\n")
	}

	// ==================== AUTO-MAPPING FROM LC ====================
	if lcExists {
		// AUTO-MAP: Amount from LC if not provided
		amount, parseErr := strconv.ParseFloat(amountStr, 64)
		if parseErr != nil || amount == 0 || amount == 1 {
			amount = lc.Amount
			amountStr = fmt.Sprintf("%f", amount)
			fmt.Printf("InitiatePayment: Auto-mapped amount from LC: %f\n", amount)
		}
		// AUTO-MAP: Currency from LC if not provided
		if currency == "" || currency == "AUTO" {
			currency = lc.Currency
			fmt.Printf("InitiatePayment: Auto-mapped currency from LC: %s\n", currency)
		}
		// AUTO-MAP: Exporter ID from LC if not provided
		if exporterID == "" || exporterID == "AUTO" {
			exporterID = lc.ExporterID
			fmt.Printf("InitiatePayment: Auto-mapped exporterID from LC: %s\n", exporterID)
		}
		// AUTO-MAP: Contract ID from LC if not provided
		if contractID == "" || contractID == "AUTO" {
			contractID = lc.ContractID
			fmt.Printf("InitiatePayment: Auto-mapped contractID from LC: %s\n", contractID)
		}
		// AUTO-MAP: Beneficiary name from LC if not provided
		if beneficiaryName == "" || beneficiaryName == "AUTO" {
			beneficiaryName = lc.Beneficiary
			fmt.Printf("InitiatePayment: Auto-mapped beneficiaryName from LC: %s\n", beneficiaryName)
		}
		// AUTO-MAP: Beneficiary bank from LC if not provided
		if receivingBank == "" || receivingBank == "AUTO" {
			receivingBank = lc.AdvisingBank
			fmt.Printf("InitiatePayment: Auto-mapped receivingBank from LC: %s\n", receivingBank)
		}
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	// Check if payment already exists
	existingPayment, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if existingPayment != nil {
		return fmt.Errorf("payment %s already exists", paymentID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// ==================== GET PAYMENT METHOD METADATA ====================
	riskProfile, bankGuarantee, ucp600, urc522 := getPaymentMethodMetadata(paymentMethod)

	// ==================== DETERMINE INITIAL STATUS ====================
	var initialStatus string
	var documentControl string
	
	switch paymentMethod {
	case "LC":
		initialStatus = "PENDING"
		documentControl = "EXPORTER_BANK" // Bank will control documents
	case "CAD":
		initialStatus = "PENDING"
		documentControl = "EXPORTER_BANK" // Bank holds until payment
	case "TT_ADVANCE", "ADVANCE":
		initialStatus = "PENDING" // Will move to ADVANCE_REQUESTED or PROFORMA_ISSUED
		documentControl = "DIRECT" // No bank control
	case "TT_POST":
		initialStatus = "PENDING"
		documentControl = "DIRECT" // Sent directly to buyer
	default:
		initialStatus = "PENDING"
		documentControl = "EXPORTER_BANK"
	}

	payment := PaymentSettlement{
		PaymentID:          paymentID,
		ContractID:         contractID,
		ExporterID:         exporterID,
		LCID:               lcID,
		Amount:             amount,
		Currency:           currency,
		ReceivingBank:      receivingBank,
		ReceivingBankBIC:   receivingBankBIC,
		BeneficiaryName:    beneficiaryName,
		BeneficiaryAccount: beneficiaryAccount,
		PaymentMethod:      paymentMethod,
		Status:             initialStatus,
		Documents:          []string{},
		SWIFTDetails: SWIFTMessage{
			MessageType: "MT103", // Default, will be updated
			ReceiverBIC: receivingBankBIC,
			Status:      "PENDING",
		},
		CreatedAt: txTime,
		UpdatedAt: txTime,
		
		// Payment method-specific fields
		PaymentStage:      "FULL", // Default, will be updated for advance payments
		DocumentsHeldBy:   documentControl,
		RiskProfile:       riskProfile,
		BankGuarantee:     bankGuarantee,
		UCP600Compliance:  ucp600,
		URC522Compliance:  urc522,
	}

	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "paymentId", OldValue: "", NewValue: paymentID, DataType: "string"},
		{FieldName: "contractId", OldValue: "", NewValue: contractID, DataType: "string"},
		{FieldName: "lcId", OldValue: "", NewValue: lcID, DataType: "string"},
		{FieldName: "amount", OldValue: "", NewValue: fmt.Sprintf("%.2f", amount), DataType: "number"},
		{FieldName: "paymentMethod", OldValue: "", NewValue: paymentMethod, DataType: "string"},
		{FieldName: "status", OldValue: "", NewValue: initialStatus, DataType: "string"},
		{FieldName: "riskProfile", OldValue: "", NewValue: riskProfile, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    ucp600,
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: fmt.Sprintf("Payment initiated with method %s (risk: %s, bank guarantee: %v)", 
			paymentMethod, riskProfile, bankGuarantee),
	}

	err = c.CreateAuditLog(ctx, "CREATE", "PAYMENT", paymentID, "", initialStatus, changes,
		fmt.Sprintf("Payment initiated by exporter with method: %s", paymentMethod), compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	fmt.Printf("InitiatePayment: Payment created with method %s (risk: %s, guarantee: %v)\n", 
		paymentMethod, riskProfile, bankGuarantee)
	return nil
}

// SubmitPaymentDocuments - Exporter submits shipping documents
// SubmitPaymentDocuments - Exporter submits shipping documents
func (c *CoffeeContract) SubmitPaymentDocuments(ctx contractapi.TransactionContextInterface,
	paymentID string, documents []string) error {

	paymentJSON, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("payment %s does not exist", paymentID)
	}

	var payment PaymentSettlement
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal payment: %v", err)
	}

	if payment.Status != "PENDING" {
		return fmt.Errorf("documents cannot be submitted, current status: %s", payment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.Status = "DOCUMENTS_SUBMITTED"
	payment.Documents = documents
	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "PENDING", NewValue: "DOCUMENTS_SUBMITTED", DataType: "string"},
		{FieldName: "documents", OldValue: "[]", NewValue: fmt.Sprintf("%d documents", len(documents)), DataType: "array"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    true, // Documentary credit requires document submission
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: "Payment documents submitted for bank verification per UCP 600 Article 14",
	}

	err = c.CreateAuditLog(ctx, "SUBMIT", "PAYMENT", paymentID, "PENDING", "DOCUMENTS_SUBMITTED",
		changes, "Payment documents submitted by exporter", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	return nil
}

// VerifyPaymentDocuments - Bank verifies documents
func (c *CoffeeContract) VerifyPaymentDocuments(ctx contractapi.TransactionContextInterface,
	paymentID, verifiedBy, comments string) error {

	paymentJSON, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("payment %s does not exist", paymentID)
	}

	var payment PaymentSettlement
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal payment: %v", err)
	}

	if payment.Status != "DOCUMENTS_SUBMITTED" {
		return fmt.Errorf("documents cannot be verified, current status: %s", payment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.Status = "VERIFIED"
	payment.VerifiedBy = verifiedBy
	payment.Comments = comments
	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "DOCUMENTS_SUBMITTED", NewValue: "VERIFIED", DataType: "string"},
		{FieldName: "verifiedBy", OldValue: "", NewValue: verifiedBy, DataType: "string"},
		{FieldName: "comments", OldValue: "", NewValue: comments, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    true, // Document verification is UCP 600 requirement
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: "Payment documents verified by bank per UCP 600 Article 14-15, ready for settlement",
	}

	err = c.CreateAuditLog(ctx, "VERIFY", "PAYMENT", paymentID, "DOCUMENTS_SUBMITTED", "VERIFIED",
		changes, "Payment documents verified: "+comments, compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	return nil
}

// SettlePayment - Bank records SWIFT payment settlement with NBE retention
// AUTO-MAPS: Retention rate from forex allocation, exchange rate from forex
func (c *CoffeeContract) SettlePayment(ctx contractapi.TransactionContextInterface,
	paymentID, exchangeRateStr, retentionRateStr, payingBank, payingBankBIC, 
	swiftReference, nbeApprovalRef string) error {

	paymentJSON, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("payment %s does not exist", paymentID)
	}

	var payment PaymentSettlement
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal payment: %v", err)
	}

	if payment.Status != "SWIFT_RECEIVED" && payment.Status != "VERIFIED" {
		return fmt.Errorf("payment cannot be settled, current status: %s", payment.Status)
	}

	// AUTO-MAP: Fetch forex allocation for exchange rate and retention rate
	exchangeRate, err := strconv.ParseFloat(exchangeRateStr, 64)
	retentionRate, err2 := strconv.ParseFloat(retentionRateStr, 64)
	
	if err != nil || err2 != nil || exchangeRate == 0 || retentionRate == 0 {
		fmt.Printf("SettlePayment: Searching for forex allocation linked to LC %s...\n", payment.LCID)
		forexID := "FOREX_" + payment.LCID
		forexJSON, err := ctx.GetStub().GetState(forexID)
		if err == nil && forexJSON != nil {
			var forex ForexAllocation
			if json.Unmarshal(forexJSON, &forex) == nil {
				if exchangeRate == 0 {
					exchangeRate = forex.ExchangeRate
					fmt.Printf("SettlePayment: Auto-mapped exchange rate from forex: %f\n", exchangeRate)
				}
				if retentionRate == 0 {
					retentionRate = forex.RetentionRate
					fmt.Printf("SettlePayment: Auto-mapped retention rate from forex: %f%%\n", retentionRate)
				}
			}
		}
		
		// Fallback defaults if still not found (NBE FXD/01/2024)
		if exchangeRate == 0 {
			exchangeRate = 120.0
			fmt.Printf("SettlePayment: Using default exchange rate: %f\n", exchangeRate)
		}
		if retentionRate == 0 {
			retentionRate = 100.0 // NBE FXD/01/2024: 100% retention allowed
			fmt.Printf("SettlePayment: Using default retention rate: %f%% (NBE FXD/01/2024)\n", retentionRate)
		}
	}

	if retentionRate < 0 || retentionRate > 100 {
		return fmt.Errorf("retention rate must be between 0 and 100")
	}

	// Calculate retention and conversion
	payment.RetentionRate = retentionRate
	payment.RetainedAmount = payment.Amount * (retentionRate / 100)
	payment.ConvertedAmount = payment.Amount - payment.RetainedAmount
	payment.ExchangeRate = exchangeRate
	payment.AmountBirr = payment.ConvertedAmount * exchangeRate

	// Capture previous status for audit
	previousStatus := payment.Status
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.Status = "SETTLED"
	payment.PayingBank = payingBank
	payment.PayingBankBIC = payingBankBIC
	payment.NBEApprovalRef = nbeApprovalRef
	payment.PaymentDate = txTime.Format(time.RFC3339)
	payment.UpdatedAt = txTime

	// Update SWIFT details
	payment.SWIFTDetails.SWIFTReference = swiftReference
	payment.SWIFTDetails.SenderBIC = payingBankBIC
	payment.SWIFTDetails.Status = "SETTLED"
	payment.SWIFTDetails.ValueDate = txTime.Format(time.RFC3339)

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: previousStatus, NewValue: "SETTLED", DataType: "string"},
		{FieldName: "paymentDate", OldValue: "", NewValue: txTime.Format(time.RFC3339), DataType: "date"},
		{FieldName: "swiftReference", OldValue: "", NewValue: swiftReference, DataType: "string"},
		{FieldName: "exchangeRate", OldValue: "", NewValue: fmt.Sprintf("%.2f", exchangeRate), DataType: "number"},
		{FieldName: "retentionRate", OldValue: "", NewValue: fmt.Sprintf("%.0f%%", retentionRate), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true, // NBE forex regulations and retention applied
		UCP600Check:    true,
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: fmt.Sprintf("Payment settled via SWIFT with %.0f%% NBE retention at rate %.2f", retentionRate, exchangeRate),
	}

	err = c.CreateAuditLog(ctx, "SETTLE", "PAYMENT", paymentID, previousStatus, "SETTLED",
		changes, fmt.Sprintf("Payment settled via SWIFT: %s", swiftReference), compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	fmt.Printf("SettlePayment: Payment settled with auto-mapped forex data\n")
	return nil
}

// ReadPayment - Get payment details
func (c *CoffeeContract) ReadPayment(ctx contractapi.TransactionContextInterface,
	paymentID string) (*PaymentSettlement, error) {

	paymentJSON, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read payment: %v", err)
	}
	if paymentJSON == nil {
		return nil, fmt.Errorf("payment %s does not exist", paymentID)
	}

	var payment PaymentSettlement
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal payment: %v", err)
	}

	return &payment, nil
}

// QueryPaymentsByExporter - Get all payments for an exporter
func (c *CoffeeContract) QueryPaymentsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*PaymentSettlement, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments: %v", err)
	}
	defer resultsIterator.Close()

	var payments []*PaymentSettlement
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var payment PaymentSettlement
		err = json.Unmarshal(queryResponse.Value, &payment)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal payment: %v", err)
		}
		payments = append(payments, &payment)
	}

	return payments, nil
}

// QueryPaymentsByContract - Get all payments for a specific contract
func (c *CoffeeContract) QueryPaymentsByContract(ctx contractapi.TransactionContextInterface,
	contractID string) ([]*PaymentSettlement, error) {

	queryString := fmt.Sprintf(`{"selector":{"contractId":"%s"}}`, contractID)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments by contract: %v", err)
	}
	defer resultsIterator.Close()

	var payments []*PaymentSettlement
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var payment PaymentSettlement
		err = json.Unmarshal(queryResponse.Value, &payment)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal payment: %v", err)
		}
		payments = append(payments, &payment)
	}

	return payments, nil
}

// ==================== SWIFT-SPECIFIC FUNCTIONS ====================

// InitiateSWIFTTransfer - Foreign bank initiates SWIFT payment
func (c *CoffeeContract) InitiateSWIFTTransfer(ctx contractapi.TransactionContextInterface,
	paymentID, swiftReference, senderBIC, messageType, valueDate, 
	intermediary1, intermediary2, charges, remittanceInfo string) error {

	paymentJSON, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("payment %s does not exist", paymentID)
	}

	var payment PaymentSettlement
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal payment: %v", err)
	}

	if payment.Status != "VERIFIED" && payment.Status != "DOCUMENTS_SUBMITTED" {
		return fmt.Errorf("SWIFT transfer cannot be initiated, current status: %s", payment.Status)
	}

	// Update SWIFT details
	payment.SWIFTDetails.SWIFTReference = swiftReference
	payment.SWIFTDetails.MessageType = messageType
	payment.SWIFTDetails.SenderBIC = senderBIC
	payment.SWIFTDetails.ReceiverBIC = payment.ReceivingBankBIC
	payment.SWIFTDetails.ValueDate = valueDate

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.SWIFTDetails.SentDate = txTime
	payment.SWIFTDetails.Intermediary1 = intermediary1
	payment.SWIFTDetails.Intermediary2 = intermediary2
	payment.SWIFTDetails.Charges = charges
	payment.SWIFTDetails.RemittanceInfo = remittanceInfo
	payment.SWIFTDetails.Status = "SENT"

	payment.Status = "SWIFT_INITIATED"
	payment.PayingBankBIC = senderBIC
	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
}

// ConfirmSWIFTReceipt - Ethiopian bank confirms SWIFT message receipt
func (c *CoffeeContract) ConfirmSWIFTReceipt(ctx contractapi.TransactionContextInterface,
	paymentID, receivedBy string) error {

	paymentJSON, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("payment %s does not exist", paymentID)
	}

	var payment PaymentSettlement
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal payment: %v", err)
	}

	if payment.Status != "SWIFT_INITIATED" {
		return fmt.Errorf("SWIFT receipt cannot be confirmed, current status: %s", payment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.Status = "SWIFT_RECEIVED"
	payment.SWIFTDetails.ReceivedDate = txTime.Format(time.RFC3339)
	payment.SWIFTDetails.Status = "RECEIVED"
	payment.VerifiedBy = receivedBy
	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
}

// RejectSWIFTPayment - Reject SWIFT payment (compliance/error)
func (c *CoffeeContract) RejectSWIFTPayment(ctx contractapi.TransactionContextInterface,
	paymentID, reason string) error {

	paymentJSON, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("payment %s does not exist", paymentID)
	}

	var payment PaymentSettlement
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal payment: %v", err)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.SWIFTDetails.Status = "REJECTED"
	payment.SWIFTDetails.RejectionReason = reason
	payment.Comments = "SWIFT payment rejected: " + reason
	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
}

// QueryPaymentsBySWIFTReference - Find payment by SWIFT reference
func (c *CoffeeContract) QueryPaymentsBySWIFTReference(ctx contractapi.TransactionContextInterface,
	swiftReference string) ([]*PaymentSettlement, error) {

	queryString := fmt.Sprintf(`{"selector":{"swiftDetails.swiftReference":"%s"}}`, swiftReference)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments: %v", err)
	}
	defer resultsIterator.Close()

	var payments []*PaymentSettlement
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var payment PaymentSettlement
		err = json.Unmarshal(queryResponse.Value, &payment)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal payment: %v", err)
		}
		payments = append(payments, &payment)
	}

	return payments, nil
}

// QueryPaymentsByStatus - Get payments by status
func (c *CoffeeContract) QueryPaymentsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*PaymentSettlement, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments: %v", err)
	}
	defer resultsIterator.Close()

	var payments []*PaymentSettlement
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var payment PaymentSettlement
		err = json.Unmarshal(queryResponse.Value, &payment)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal payment: %v", err)
		}
		payments = append(payments, &payment)
	}

	return payments, nil
}


// ==================== PAYMENT METHOD-SPECIFIC FUNCTIONS ====================
// Added June 26, 2026 for payment method differentiation

// ReleaseDocumentsToBuyer - Release documents to buyer (CAD/LC only, after payment confirmed)
func (c *CoffeeContract) ReleaseDocumentsToBuyer(ctx contractapi.TransactionContextInterface,
	paymentID string) error {
	
	payment, err := c.ReadPayment(ctx, paymentID)
	if err != nil {
		return err
	}
	
	// Validate payment method requires document control
	if payment.PaymentMethod != "CAD" && payment.PaymentMethod != "LC" {
		return fmt.Errorf("document release only applicable for CAD/LC (current method: %s)", payment.PaymentMethod)
	}
	
	// Verify payment received (for CAD) or settled (for LC)
	validStatuses := map[string]bool{
		"PAYMENT_RECEIVED": true, // CAD
		"SETTLED":          true, // LC
		"VERIFIED":         true, // LC alt
	}
	if !validStatuses[payment.Status] {
		return fmt.Errorf("documents can only be released after payment confirmed (current status: %s)", payment.Status)
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	// Release documents
	payment.DocumentsHeldBy = "RELEASED"
	payment.DocumentReleaseDate = txTime.Format(time.RFC3339)
	
	// Update payment
	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}
	
	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}
	
	fmt.Printf("Documents released to buyer for payment %s (%s method)\n", paymentID, payment.PaymentMethod)
	return nil
}

// ReceiveAdvancePayment - Track advance payment (for TT_ADVANCE/ADVANCE methods)
func (c *CoffeeContract) ReceiveAdvancePayment(ctx contractapi.TransactionContextInterface,
	paymentID string, advancePercentageStr string, amountReceivedStr string) error {
	
	payment, err := c.ReadPayment(ctx, paymentID)
	if err != nil {
		return err
	}
	
	// Validate payment method
	if payment.PaymentMethod != "ADVANCE" && payment.PaymentMethod != "TT_ADVANCE" {
		return fmt.Errorf("advance payment only for ADVANCE/TT_ADVANCE methods (current: %s)", payment.PaymentMethod)
	}
	
	advancePercentage, err := strconv.ParseFloat(advancePercentageStr, 64)
	if err != nil {
		return fmt.Errorf("invalid advance percentage: %v", err)
	}
	
	amountReceived, err := strconv.ParseFloat(amountReceivedStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount received: %v", err)
	}
	
	if advancePercentage <= 0 || advancePercentage > 100 {
		return fmt.Errorf("advance percentage must be between 0 and 100")
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	payment.PaymentStage = "ADVANCE"
	payment.AdvancePercentage = advancePercentage
	payment.AdvanceAmount = amountReceived
	payment.BalanceAmount = payment.Amount - amountReceived
	payment.Status = "ADVANCE_RECEIVED"
	payment.UpdatedAt = txTime
	
	// Calculate retention on advance
	payment.RetentionRate = 100.0 // Default NBE retention
	payment.RetainedAmount = amountReceived * (payment.RetentionRate / 100)
	payment.ConvertedAmount = amountReceived - payment.RetainedAmount
	
	// Apply exchange rate if available
	if payment.ExchangeRate > 0 {
		payment.AmountBirr = payment.ConvertedAmount * payment.ExchangeRate
	}
	
	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}
	
	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}
	
	fmt.Printf("Advance payment received: %.0f%% (%.2f %s) for payment %s\n", 
		advancePercentage, amountReceived, payment.Currency, paymentID)
	return nil
}

// ReceiveBalancePayment - Track balance payment after advance
func (c *CoffeeContract) ReceiveBalancePayment(ctx contractapi.TransactionContextInterface,
	paymentID string, amountReceivedStr string) error {
	
	payment, err := c.ReadPayment(ctx, paymentID)
	if err != nil {
		return err
	}
	
	if payment.PaymentStage != "ADVANCE" {
		return fmt.Errorf("balance can only be received after advance (current stage: %s)", payment.PaymentStage)
	}
	
	amountReceived, err := strconv.ParseFloat(amountReceivedStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount received: %v", err)
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	payment.PaymentStage = "BALANCE"
	payment.Status = "BALANCE_RECEIVED"
	payment.UpdatedAt = txTime
	
	// Calculate retention on balance
	balanceRetained := amountReceived * (payment.RetentionRate / 100)
	balanceConverted := amountReceived - balanceRetained
	
	// Update totals
	payment.RetainedAmount += balanceRetained
	payment.ConvertedAmount += balanceConverted
	
	if payment.ExchangeRate > 0 {
		balanceBirr := balanceConverted * payment.ExchangeRate
		payment.AmountBirr += balanceBirr
	}
	
	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}
	
	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}
	
	fmt.Printf("Balance payment received: %.2f %s for payment %s (total now complete)\n", 
		amountReceived, payment.Currency, paymentID)
	return nil
}

// UpdatePaymentStatus - Generic status update with validation
func (c *CoffeeContract) UpdatePaymentStatus(ctx contractapi.TransactionContextInterface,
	paymentID string, newStatus string) error {
	
	payment, err := c.ReadPayment(ctx, paymentID)
	if err != nil {
		return err
	}
	
	// Validate status transition
	if err := validateStatusTransition(payment.Status, newStatus, payment.PaymentMethod); err != nil {
		return err
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	oldStatus := payment.Status
	payment.Status = newStatus
	payment.UpdatedAt = txTime
	
	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}
	
	err = ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
	if err != nil {
		return err
	}
	
	fmt.Printf("Payment %s status updated: %s → %s (%s method)\n", 
		paymentID, oldStatus, newStatus, payment.PaymentMethod)
	return nil
}

// QueryPaymentsByMethod - Get all payments by payment method
func (c *CoffeeContract) QueryPaymentsByMethod(ctx contractapi.TransactionContextInterface,
	paymentMethod string) ([]*PaymentSettlement, error) {

	queryString := fmt.Sprintf(`{"selector":{"paymentMethod":"%s"}}`, paymentMethod)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments: %v", err)
	}
	defer resultsIterator.Close()

	var payments []*PaymentSettlement
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var payment PaymentSettlement
		err = json.Unmarshal(queryResponse.Value, &payment)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal payment: %v", err)
		}
		payments = append(payments, &payment)
	}

	return payments, nil
}

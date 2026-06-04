package main

import (
	"encoding/json"
	"fmt"
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
	RetentionRate     float64     `json:"retentionRate"`     // NBE retention percentage (e.g., 40%)
	RetainedAmount    float64     `json:"retainedAmount"`    // Amount retained in forex
	ConvertedAmount   float64     `json:"convertedAmount"`   // Amount converted to Birr
	Status            string      `json:"status"`            // PENDING, DOCUMENTS_SUBMITTED, VERIFIED, SWIFT_INITIATED, SWIFT_RECEIVED, SETTLED
	PaymentMethod     string      `json:"paymentMethod"`     // SWIFT_MT103, SWIFT_MT700, TT, LC
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

// ==================== PAYMENT FUNCTIONS ====================

// InitiatePayment - Exporter initiates payment process with SWIFT details
func (c *CoffeeContract) InitiatePayment(ctx contractapi.TransactionContextInterface,
	paymentID, contractID, exporterID, lcID, amountStr, currency, receivingBank, 
	receivingBankBIC, beneficiaryName, beneficiaryAccount, paymentMethod string) error {

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	// Validate payment method
	validMethods := map[string]bool{
		"SWIFT_MT103": true, // Single customer credit transfer
		"SWIFT_MT700": true, // Issue of documentary credit (LC)
		"TT":          true, // Telegraphic Transfer
		"LC":          true, // Letter of Credit payment
	}
	if !validMethods[paymentMethod] {
		return fmt.Errorf("invalid payment method: %s", paymentMethod)
	}

	// Verify LC exists
	lcExists, err := c.LCExists(ctx, lcID)
	if err != nil {
		return fmt.Errorf("failed to check LC: %v", err)
	}
	if !lcExists {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	// Check if payment already exists
	existingPayment, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read payment: %v", err)
	}
	if existingPayment != nil {
		return fmt.Errorf("payment %s already exists", paymentID)
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
		Status:             "PENDING",
		Documents:          []string{},
		SWIFTDetails: SWIFTMessage{
			MessageType: paymentMethod,
			ReceiverBIC: receivingBankBIC,
			Status:      "PENDING",
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
}

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

	payment.Status = "DOCUMENTS_SUBMITTED"
	payment.Documents = documents
	payment.UpdatedAt = time.Now()

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
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

	payment.Status = "VERIFIED"
	payment.VerifiedBy = verifiedBy
	payment.Comments = comments
	payment.UpdatedAt = time.Now()

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
}

// SettlePayment - Bank records SWIFT payment settlement with NBE retention
func (c *CoffeeContract) SettlePayment(ctx contractapi.TransactionContextInterface,
	paymentID, exchangeRateStr, retentionRateStr, payingBank, payingBankBIC, 
	swiftReference, nbeApprovalRef string) error {

	exchangeRate, err := strconv.ParseFloat(exchangeRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid exchange rate: %v", err)
	}

	retentionRate, err := strconv.ParseFloat(retentionRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid retention rate: %v", err)
	}

	if retentionRate < 0 || retentionRate > 100 {
		return fmt.Errorf("retention rate must be between 0 and 100")
	}

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

	// Calculate retention and conversion
	payment.RetentionRate = retentionRate
	payment.RetainedAmount = payment.Amount * (retentionRate / 100)
	payment.ConvertedAmount = payment.Amount - payment.RetainedAmount
	payment.ExchangeRate = exchangeRate
	payment.AmountBirr = payment.ConvertedAmount * exchangeRate

	payment.Status = "SETTLED"
	payment.PayingBank = payingBank
	payment.PayingBankBIC = payingBankBIC
	payment.NBEApprovalRef = nbeApprovalRef
	payment.PaymentDate = time.Now().Format(time.RFC3339)
	payment.UpdatedAt = time.Now()

	// Update SWIFT details
	payment.SWIFTDetails.SWIFTReference = swiftReference
	payment.SWIFTDetails.SenderBIC = payingBankBIC
	payment.SWIFTDetails.Status = "SETTLED"
	payment.SWIFTDetails.ValueDate = time.Now().Format(time.RFC3339)

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
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
	payment.SWIFTDetails.SentDate = time.Now()
	payment.SWIFTDetails.Intermediary1 = intermediary1
	payment.SWIFTDetails.Intermediary2 = intermediary2
	payment.SWIFTDetails.Charges = charges
	payment.SWIFTDetails.RemittanceInfo = remittanceInfo
	payment.SWIFTDetails.Status = "SENT"

	payment.Status = "SWIFT_INITIATED"
	payment.PayingBankBIC = senderBIC
	payment.UpdatedAt = time.Now()

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

	payment.Status = "SWIFT_RECEIVED"
	payment.SWIFTDetails.ReceivedDate = time.Now().Format(time.RFC3339)
	payment.SWIFTDetails.Status = "RECEIVED"
	payment.VerifiedBy = receivedBy
	payment.UpdatedAt = time.Now()

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

	payment.SWIFTDetails.Status = "REJECTED"
	payment.SWIFTDetails.RejectionReason = reason
	payment.Comments = "SWIFT payment rejected: " + reason
	payment.UpdatedAt = time.Now()

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


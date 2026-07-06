package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== ADVANCE PAYMENT STRUCTURE ====================

type AdvancePayment struct {
	PaymentID          string    `json:"paymentId"`
	ContractID         string    `json:"contractId"`
	ExporterID         string    `json:"exporterId"`
	PermitID           string    `json:"permitId"`
	Amount             float64   `json:"amount"`
	Currency           string    `json:"currency"`
	CreditAdviceNumber string    `json:"creditAdviceNumber"` // Bank credit advice reference
	ReceivingBank      string    `json:"receivingBank"`      // Ethiopian bank
	ReceivingBankBIC   string    `json:"receivingBankBic"`
	PayingBank         string    `json:"payingBank"` // Foreign bank
	PayingBankBIC      string    `json:"payingBankBic"`
	SWIFTReference     string    `json:"swiftReference"`
	BeneficiaryName    string    `json:"beneficiaryName"` // Exporter
	BeneficiaryAccount string    `json:"beneficiaryAccount"`
	Status             string    `json:"status"` // RECEIVED, PERMIT_ISSUED, SHIPPED, SETTLED
	ReceivedDate       time.Time `json:"receivedDate"`
	PermitIssueDate    string    `json:"permitIssueDate"`
	ShipmentDate       string    `json:"shipmentDate"`
	SettlementDate     string    `json:"settlementDate"`
	ShipmentID         string    `json:"shipmentId"` // Link to actual shipment
	ShippedQuantity    float64   `json:"shippedQuantity"`
	ShippedValue       float64   `json:"shippedValue"`
	BalanceAmount      float64   `json:"balanceAmount"` // If shipment < advance
	RefundAmount       float64   `json:"refundAmount"`  // Amount to refund if over-payment
	Remarks            string    `json:"remarks"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// ==================== ADVANCE PAYMENT FUNCTIONS ====================

// RecordAdvancePayment - Bank records receipt of advance payment
func (c *CoffeeContract) RecordAdvancePayment(ctx contractapi.TransactionContextInterface,
	paymentID, contractID, exporterID, amountStr, currency, creditAdviceNumber,
	receivingBank, receivingBankBIC, payingBank, payingBankBIC, swiftReference,
	beneficiaryName, beneficiaryAccount string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only Banks can record advance payments
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can record advance payments (caller: %s)", mspID)
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	if amount <= 0 {
		return fmt.Errorf("amount must be greater than zero")
	}

	// Verify contract exists
	contract, err := c.ReadSalesContract(ctx, contractID)
	if err != nil {
		return fmt.Errorf("contract not found: %v", err)
	}
	if contract.ContractStatus != "APPROVED" {
		return fmt.Errorf("contract must be approved, current status: %s", contract.ContractStatus)
	}

	// Verify exporter exists
	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("exporter not found: %v", err)
	}
	if exporter.LicenseStatus != "ACTIVE" {
		return fmt.Errorf("exporter license is %s, cannot process advance payment", exporter.LicenseStatus)
	}

	// Check if payment already exists
	existingPayment, err := ctx.GetStub().GetState("ADVANCE_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read advance payment: %v", err)
	}
	if existingPayment != nil {
		return fmt.Errorf("advance payment %s already exists", paymentID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment := AdvancePayment{
		PaymentID:          paymentID,
		ContractID:         contractID,
		ExporterID:         exporterID,
		Amount:             amount,
		Currency:           currency,
		CreditAdviceNumber: creditAdviceNumber,
		ReceivingBank:      receivingBank,
		ReceivingBankBIC:   receivingBankBIC,
		PayingBank:         payingBank,
		PayingBankBIC:      payingBankBIC,
		SWIFTReference:     swiftReference,
		BeneficiaryName:    beneficiaryName,
		BeneficiaryAccount: beneficiaryAccount,
		Status:             "RECEIVED",
		ReceivedDate:       txTime,
		CreatedAt:          txTime,
		UpdatedAt:          txTime,
	}

	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal advance payment: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":  "AdvancePaymentReceived",
		"paymentID":  paymentID,
		"exporterID": exporterID,
		"amount":     amount,
		"currency":   currency,
		"swiftRef":   swiftReference,
		"timestamp":  txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("AdvancePaymentReceived", eventJSON)

	return ctx.GetStub().PutState("ADVANCE_"+paymentID, paymentJSON)
}

// IssuePermitForAdvance - Bank issues export permit for advance payment
func (c *CoffeeContract) IssuePermitForAdvance(ctx contractapi.TransactionContextInterface,
	paymentID, permitID, permitNumber string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only Banks can issue permits
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can issue permits")
	}

	paymentJSON, err := ctx.GetStub().GetState("ADVANCE_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read advance payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("advance payment %s does not exist", paymentID)
	}

	var payment AdvancePayment
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal advance payment: %v", err)
	}

	if payment.Status != "RECEIVED" {
		return fmt.Errorf("permit can only be issued for received payments, current status: %s", payment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Create export permit
	currentYear, currentMonth, _ := txTime.Date()
	expiryDate := time.Date(currentYear, currentMonth+1, 0, 23, 59, 59, 0, txTime.Location())

	// Get contract for description
	contract, err := c.ReadSalesContract(ctx, payment.ContractID)
	description := "Coffee Export (Advance Payment)"
	destination := "Unknown"
	if err == nil {
		description = fmt.Sprintf("%s - %s", contract.CoffeeType, "Advance Payment")
		destination = contract.BuyerCountry
	}

	clientID, err := ctx.GetClientIdentity().GetID()
	approvedBy := "Bank Officer"
	if err == nil {
		approvedBy = clientID
	}

	permit := ExportPermit{
		PermitID:          permitID,
		PermitNumber:      permitNumber,
		ContractID:        payment.ContractID,
		ExporterID:        payment.ExporterID,
		LCID:              "",
		PaymentMethod:     "ADVANCE",
		Amount:            payment.Amount,
		Currency:          payment.Currency,
		Description:       description,
		Destination:       destination,
		CommercialInvoice: payment.CreditAdviceNumber,
		Status:            "ISSUED",
		Outstanding:       true,
		ApprovalLevel:     "STANDARD",
		ApprovedBy:        approvedBy,
		IssueDate:         txTime,
		ExpiryDate:        expiryDate.Format(time.RFC3339),
		BankBranch:        payment.ReceivingBank,
		Remarks:           fmt.Sprintf("Advance payment permit - SWIFT: %s", payment.SWIFTReference),
		CreatedAt:         txTime,
		UpdatedAt:         txTime,
	}

	permitJSON, err := json.Marshal(permit)
	if err != nil {
		return fmt.Errorf("failed to marshal permit: %v", err)
	}

	err = ctx.GetStub().PutState("PERMIT_"+permitID, permitJSON)
	if err != nil {
		return fmt.Errorf("failed to save permit: %v", err)
	}

	// Update advance payment status
	payment.Status = "PERMIT_ISSUED"
	payment.PermitID = permitID
	payment.PermitIssueDate = txTime.Format(time.RFC3339)
	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal advance payment: %v", err)
	}

	return ctx.GetStub().PutState("ADVANCE_"+paymentID, paymentJSON)
}

// LinkShipmentToAdvance - Link actual shipment to advance payment
func (c *CoffeeContract) LinkShipmentToAdvance(ctx contractapi.TransactionContextInterface,
	paymentID, shipmentID string) error {

	paymentJSON, err := ctx.GetStub().GetState("ADVANCE_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read advance payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("advance payment %s does not exist", paymentID)
	}

	var payment AdvancePayment
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal advance payment: %v", err)
	}

	if payment.Status != "PERMIT_ISSUED" {
		return fmt.Errorf("shipment can only be linked after permit issuance, current status: %s", payment.Status)
	}

	// Verify shipment exists
	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("shipment not found: %v", err)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.Status = "SHIPPED"
	payment.ShipmentID = shipmentID
	payment.ShipmentDate = txTime.Format(time.RFC3339)
	payment.ShippedQuantity = shipment.Quantity
	payment.ShippedValue = shipment.ValueUSD

	// Calculate balance (if shipped value < advance amount)
	if payment.ShippedValue < payment.Amount {
		payment.BalanceAmount = payment.Amount - payment.ShippedValue
		payment.Remarks = fmt.Sprintf("Shipment value (%.2f %s) less than advance (%.2f %s). Balance outstanding.",
			payment.ShippedValue, payment.Currency, payment.Amount, payment.Currency)
	} else if payment.ShippedValue > payment.Amount {
		payment.Remarks = fmt.Sprintf("Shipment value (%.2f %s) exceeds advance (%.2f %s).",
			payment.ShippedValue, payment.Currency, payment.Amount, payment.Currency)
	}

	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal advance payment: %v", err)
	}

	// Utilize the permit
	err = c.UtilizeExportPermit(ctx, payment.PermitID)
	if err != nil {
		fmt.Printf("Warning: failed to utilize permit: %v\n", err)
	}

	return ctx.GetStub().PutState("ADVANCE_"+paymentID, paymentJSON)
}

// SettleAdvancePayment - Settle advance payment after shipment
func (c *CoffeeContract) SettleAdvancePayment(ctx contractapi.TransactionContextInterface,
	paymentID string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only Banks can settle advance payments
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can settle advance payments")
	}

	paymentJSON, err := ctx.GetStub().GetState("ADVANCE_" + paymentID)
	if err != nil {
		return fmt.Errorf("failed to read advance payment: %v", err)
	}
	if paymentJSON == nil {
		return fmt.Errorf("advance payment %s does not exist", paymentID)
	}

	var payment AdvancePayment
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal advance payment: %v", err)
	}

	if payment.Status != "SHIPPED" {
		return fmt.Errorf("payment can only be settled after shipment, current status: %s", payment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.Status = "SETTLED"
	payment.SettlementDate = txTime.Format(time.RFC3339)
	payment.UpdatedAt = txTime

	// If there's a balance payment due from buyer
	if payment.BalanceAmount > 0 {
		payment.Remarks += fmt.Sprintf(" Balance payment of %.2f %s awaited from buyer.",
			payment.BalanceAmount, payment.Currency)
	}

	// If overpayment needs refund
	if payment.ShippedValue < payment.Amount {
		payment.RefundAmount = payment.Amount - payment.ShippedValue
		payment.Remarks += fmt.Sprintf(" Potential refund of %.2f %s to buyer.",
			payment.RefundAmount, payment.Currency)
	}

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal advance payment: %v", err)
	}

	// Settle the export permit
	if payment.PermitID != "" {
		err = c.SettleExportPermit(ctx, payment.PermitID, fmt.Sprintf("%.2f", payment.ShippedValue))
		if err != nil {
			fmt.Printf("Warning: failed to settle permit: %v\n", err)
		}
	}

	// Emit settlement event
	event := map[string]interface{}{
		"eventType":     "AdvancePaymentSettled",
		"paymentID":     paymentID,
		"exporterID":    payment.ExporterID,
		"shippedValue":  payment.ShippedValue,
		"balanceAmount": payment.BalanceAmount,
		"timestamp":     txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("AdvancePaymentSettled", eventJSON)

	return ctx.GetStub().PutState("ADVANCE_"+paymentID, paymentJSON)
}

// ReadAdvancePayment - Get advance payment details
func (c *CoffeeContract) ReadAdvancePayment(ctx contractapi.TransactionContextInterface,
	paymentID string) (*AdvancePayment, error) {

	paymentJSON, err := ctx.GetStub().GetState("ADVANCE_" + paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read advance payment: %v", err)
	}
	if paymentJSON == nil {
		return nil, fmt.Errorf("advance payment %s does not exist", paymentID)
	}

	var payment AdvancePayment
	err = json.Unmarshal(paymentJSON, &payment)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal advance payment: %v", err)
	}

	return &payment, nil
}

// QueryAdvancePaymentsByExporter - Get all advance payments for exporter
func (c *CoffeeContract) QueryAdvancePaymentsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*AdvancePayment, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryAdvancePayments(ctx, queryString)
}

// QueryAdvancePaymentsByStatus - Get advance payments by status
func (c *CoffeeContract) QueryAdvancePaymentsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*AdvancePayment, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryAdvancePayments(ctx, queryString)
}

// QueryAllAdvancePayments - Get all advance payments
func (c *CoffeeContract) QueryAllAdvancePayments(ctx contractapi.TransactionContextInterface) ([]*AdvancePayment, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("ADVANCE_", "ADVANCE_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var payments []*AdvancePayment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var payment AdvancePayment
		err = json.Unmarshal(queryResponse.Value, &payment)
		if err != nil {
			return nil, err
		}
		payments = append(payments, &payment)
	}

	return payments, nil
}

// Helper function
func (c *CoffeeContract) queryAdvancePayments(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*AdvancePayment, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query advance payments: %v", err)
	}
	defer resultsIterator.Close()

	var payments []*AdvancePayment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var payment AdvancePayment
		err = json.Unmarshal(queryResponse.Value, &payment)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal advance payment: %v", err)
		}
		payments = append(payments, &payment)
	}

	return payments, nil
}

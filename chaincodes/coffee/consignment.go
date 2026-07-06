package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== CONSIGNMENT PAYMENT STRUCTURE ====================

type ConsignmentPayment struct {
	ConsignmentID     string           `json:"consignmentId"`
	ExporterID        string           `json:"exporterId"`
	PermitID          string           `json:"permitId"`
	CommodityType     string           `json:"commodityType"` // Only: FRUITS, FLOWERS, MEAT
	Description       string           `json:"description"`
	Destination       string           `json:"destination"`
	BuyerName         string           `json:"buyerName"`
	BuyerAddress      string           `json:"buyerAddress"`
	PermitAmount      float64          `json:"permitAmount"` // Initial permit amount
	Currency          string           `json:"currency"`
	ShippedValue      float64          `json:"shippedValue"`      // Total value shipped
	SettledAmount     float64          `json:"settledAmount"`     // Amount repatriated
	OutstandingAmount float64          `json:"outstandingAmount"` // Awaiting repatriation
	Status            string           `json:"status"`            // PERMIT_ISSUED, SHIPPED, PARTIAL, SETTLED
	ShippedDate       string           `json:"shippedDate"`
	PartialPayments   []PartialPayment `json:"partialPayments"` // Track multiple payments
	BankBranch        string           `json:"bankBranch"`
	Remarks           string           `json:"remarks"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
}

// Track individual payments for consignment
type PartialPayment struct {
	PaymentDate    string  `json:"paymentDate"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	SWIFTReference string  `json:"swiftReference"`
	ReceivedBy     string  `json:"receivedBy"`
}

// ==================== CONSIGNMENT PAYMENT FUNCTIONS ====================

// IssueConsignmentPermit - Bank issues permit for consignment sale
func (c *CoffeeContract) IssueConsignmentPermit(ctx contractapi.TransactionContextInterface,
	consignmentID, permitID, permitNumber, exporterID, commodityType, description,
	destination, buyerName, buyerAddress, permitAmountStr, currency, bankBranch string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only Banks can issue consignment permits
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can issue consignment permits (caller: %s)", mspID)
	}

	permitAmount, err := strconv.ParseFloat(permitAmountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid permit amount: %v", err)
	}

	if permitAmount <= 0 {
		return fmt.Errorf("permit amount must be greater than zero")
	}

	// Validate commodity type - CBE only allows specific commodities for consignment
	validCommodities := map[string]bool{
		"FRUITS":  true,
		"FLOWERS": true,
		"MEAT":    true,
	}
	if !validCommodities[commodityType] {
		return fmt.Errorf("invalid commodity type: %s. Consignment only allowed for FRUITS, FLOWERS, or MEAT", commodityType)
	}

	// Verify exporter exists and is active
	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("exporter not found: %v", err)
	}
	if exporter.LicenseStatus != "ACTIVE" {
		return fmt.Errorf("exporter license is %s, cannot issue consignment permit", exporter.LicenseStatus)
	}

	// Check if consignment already exists
	existingConsignment, err := ctx.GetStub().GetState("CONSIGN_" + consignmentID)
	if err != nil {
		return fmt.Errorf("failed to read consignment: %v", err)
	}
	if existingConsignment != nil {
		return fmt.Errorf("consignment %s already exists", consignmentID)
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

	clientID, err := ctx.GetClientIdentity().GetID()
	approvedBy := "Bank Officer"
	if err == nil {
		approvedBy = clientID
	}

	permit := ExportPermit{
		PermitID:          permitID,
		PermitNumber:      permitNumber,
		ContractID:        "",
		ExporterID:        exporterID,
		LCID:              "",
		PaymentMethod:     "CONSIGNMENT",
		Amount:            permitAmount,
		Currency:          currency,
		Description:       fmt.Sprintf("%s - %s", commodityType, description),
		Destination:       destination,
		CommercialInvoice: "",
		Status:            "ISSUED",
		Outstanding:       true,
		ApprovalLevel:     "STANDARD",
		ApprovedBy:        approvedBy,
		IssueDate:         txTime,
		ExpiryDate:        expiryDate.Format(time.RFC3339),
		BankBranch:        bankBranch,
		Remarks:           fmt.Sprintf("Consignment permit for %s to %s", commodityType, destination),
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

	// Create consignment record
	consignment := ConsignmentPayment{
		ConsignmentID:     consignmentID,
		ExporterID:        exporterID,
		PermitID:          permitID,
		CommodityType:     commodityType,
		Description:       description,
		Destination:       destination,
		BuyerName:         buyerName,
		BuyerAddress:      buyerAddress,
		PermitAmount:      permitAmount,
		Currency:          currency,
		ShippedValue:      0,
		SettledAmount:     0,
		OutstandingAmount: 0,
		Status:            "PERMIT_ISSUED",
		PartialPayments:   []PartialPayment{},
		BankBranch:        bankBranch,
		CreatedAt:         txTime,
		UpdatedAt:         txTime,
	}

	consignmentJSON, err := json.Marshal(consignment)
	if err != nil {
		return fmt.Errorf("failed to marshal consignment: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":     "ConsignmentPermitIssued",
		"consignmentID": consignmentID,
		"permitID":      permitID,
		"exporterID":    exporterID,
		"commodityType": commodityType,
		"permitAmount":  permitAmount,
		"timestamp":     txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ConsignmentPermitIssued", eventJSON)

	return ctx.GetStub().PutState("CONSIGN_"+consignmentID, consignmentJSON)
}

// RecordConsignmentShipment - Record shipment for consignment
func (c *CoffeeContract) RecordConsignmentShipment(ctx contractapi.TransactionContextInterface,
	consignmentID, shippedValueStr string) error {

	shippedValue, err := strconv.ParseFloat(shippedValueStr, 64)
	if err != nil {
		return fmt.Errorf("invalid shipped value: %v", err)
	}

	consignmentJSON, err := ctx.GetStub().GetState("CONSIGN_" + consignmentID)
	if err != nil {
		return fmt.Errorf("failed to read consignment: %v", err)
	}
	if consignmentJSON == nil {
		return fmt.Errorf("consignment %s does not exist", consignmentID)
	}

	var consignment ConsignmentPayment
	err = json.Unmarshal(consignmentJSON, &consignment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal consignment: %v", err)
	}

	if consignment.Status != "PERMIT_ISSUED" {
		return fmt.Errorf("shipment can only be recorded after permit issuance, current status: %s", consignment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	consignment.Status = "SHIPPED"
	consignment.ShippedValue = shippedValue
	consignment.OutstandingAmount = shippedValue
	consignment.ShippedDate = txTime.Format(time.RFC3339)
	consignment.UpdatedAt = txTime

	// Utilize the permit
	if consignment.PermitID != "" {
		err = c.UtilizeExportPermit(ctx, consignment.PermitID)
		if err != nil {
			fmt.Printf("Warning: failed to utilize permit: %v\n", err)
		}
	}

	consignmentJSON, err = json.Marshal(consignment)
	if err != nil {
		return fmt.Errorf("failed to marshal consignment: %v", err)
	}

	return ctx.GetStub().PutState("CONSIGN_"+consignmentID, consignmentJSON)
}

// RecordPartialPayment - Record partial payment received for consignment
func (c *CoffeeContract) RecordPartialPayment(ctx contractapi.TransactionContextInterface,
	consignmentID, amountStr, swiftReference, receivedBy string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only Banks can record payments
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can record consignment payments")
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	if amount <= 0 {
		return fmt.Errorf("amount must be greater than zero")
	}

	consignmentJSON, err := ctx.GetStub().GetState("CONSIGN_" + consignmentID)
	if err != nil {
		return fmt.Errorf("failed to read consignment: %v", err)
	}
	if consignmentJSON == nil {
		return fmt.Errorf("consignment %s does not exist", consignmentID)
	}

	var consignment ConsignmentPayment
	err = json.Unmarshal(consignmentJSON, &consignment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal consignment: %v", err)
	}

	if consignment.Status != "SHIPPED" && consignment.Status != "PARTIAL" {
		return fmt.Errorf("payment can only be recorded after shipment, current status: %s", consignment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Add partial payment record
	partialPayment := PartialPayment{
		PaymentDate:    txTime.Format(time.RFC3339),
		Amount:         amount,
		Currency:       consignment.Currency,
		SWIFTReference: swiftReference,
		ReceivedBy:     receivedBy,
	}
	consignment.PartialPayments = append(consignment.PartialPayments, partialPayment)

	// Update totals
	consignment.SettledAmount += amount
	consignment.OutstandingAmount = consignment.ShippedValue - consignment.SettledAmount

	// Update status
	if consignment.OutstandingAmount <= 0.01 { // Allow small rounding differences
		consignment.Status = "SETTLED"
		consignment.OutstandingAmount = 0

		// Settle the permit
		if consignment.PermitID != "" {
			err = c.SettleExportPermit(ctx, consignment.PermitID, fmt.Sprintf("%.2f", consignment.SettledAmount))
			if err != nil {
				fmt.Printf("Warning: failed to settle permit: %v\n", err)
			}
		}
	} else {
		consignment.Status = "PARTIAL"
	}

	consignment.UpdatedAt = txTime

	consignmentJSON, err = json.Marshal(consignment)
	if err != nil {
		return fmt.Errorf("failed to marshal consignment: %v", err)
	}

	// Emit event
	eventType := "ConsignmentPartialPayment"
	if consignment.Status == "SETTLED" {
		eventType = "ConsignmentFullySettled"
	}

	event := map[string]interface{}{
		"eventType":         eventType,
		"consignmentID":     consignmentID,
		"exporterID":        consignment.ExporterID,
		"paymentAmount":     amount,
		"settledAmount":     consignment.SettledAmount,
		"outstandingAmount": consignment.OutstandingAmount,
		"timestamp":         txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent(eventType, eventJSON)

	return ctx.GetStub().PutState("CONSIGN_"+consignmentID, consignmentJSON)
}

// ReadConsignmentPayment - Get consignment details
func (c *CoffeeContract) ReadConsignmentPayment(ctx contractapi.TransactionContextInterface,
	consignmentID string) (*ConsignmentPayment, error) {

	consignmentJSON, err := ctx.GetStub().GetState("CONSIGN_" + consignmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read consignment: %v", err)
	}
	if consignmentJSON == nil {
		return nil, fmt.Errorf("consignment %s does not exist", consignmentID)
	}

	var consignment ConsignmentPayment
	err = json.Unmarshal(consignmentJSON, &consignment)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal consignment: %v", err)
	}

	return &consignment, nil
}

// QueryConsignmentsByExporter - Get all consignments for exporter
func (c *CoffeeContract) QueryConsignmentsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*ConsignmentPayment, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryConsignments(ctx, queryString)
}

// QueryConsignmentsByStatus - Get consignments by status
func (c *CoffeeContract) QueryConsignmentsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ConsignmentPayment, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryConsignments(ctx, queryString)
}

// QueryOutstandingConsignments - Get all consignments with outstanding payments
func (c *CoffeeContract) QueryOutstandingConsignments(ctx contractapi.TransactionContextInterface) ([]*ConsignmentPayment, error) {

	queryString := `{"selector":{"status":{"$in":["SHIPPED","PARTIAL"]}}}`
	return c.queryConsignments(ctx, queryString)
}

// QueryAllConsignments - Get all consignment payments
func (c *CoffeeContract) QueryAllConsignments(ctx contractapi.TransactionContextInterface) ([]*ConsignmentPayment, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("CONSIGN_", "CONSIGN_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var consignments []*ConsignmentPayment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var consignment ConsignmentPayment
		err = json.Unmarshal(queryResponse.Value, &consignment)
		if err != nil {
			return nil, err
		}
		consignments = append(consignments, &consignment)
	}

	return consignments, nil
}

// Helper function
func (c *CoffeeContract) queryConsignments(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*ConsignmentPayment, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query consignments: %v", err)
	}
	defer resultsIterator.Close()

	var consignments []*ConsignmentPayment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var consignment ConsignmentPayment
		err = json.Unmarshal(queryResponse.Value, &consignment)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal consignment: %v", err)
		}
		consignments = append(consignments, &consignment)
	}

	return consignments, nil
}

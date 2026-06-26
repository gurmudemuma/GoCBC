package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== CUSTOMS DECLARATION STRUCTURE ====================

type CustomsDeclaration struct {
	DeclarationID     string    `json:"declarationId"`
	ContractID        string    `json:"contractId"`
	ExporterID        string    `json:"exporterId"`
	LCID              string    `json:"lcId"`
	ForexID           string    `json:"forexId"`
	Quantity          float64   `json:"quantity"`
	TotalValue        float64   `json:"totalValue"`
	Currency          string    `json:"currency"`
	Destination       string    `json:"destination"`
	PortOfExit        string    `json:"portOfExit"`
	Status            string    `json:"status"` // SUBMITTED, UNDER_INSPECTION, UNDER_REVIEW, CLEARED, HELD, REJECTED
	SubmissionDate    time.Time `json:"submissionDate"`
	ReviewDate        string    `json:"reviewDate"`
	ClearanceDate     string    `json:"clearanceDate"`
	ClearanceNumber   string    `json:"clearanceNumber"`
	CustomsOfficer    string    `json:"customsOfficer"`
	Documents         []string  `json:"documents"` // Document hashes
	InspectionNotes   string    `json:"inspectionNotes"`
	DutiesAmount      float64   `json:"dutiesAmount"`
	RejectionReason   string    `json:"rejectionReason"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// ==================== CUSTOMS FUNCTIONS ====================

// SubmitDeclaration - Exporter submits customs declaration
// AUTO-MAPS: Data from shipment, contract, LC, and forex allocation
func (c *CoffeeContract) SubmitDeclaration(ctx contractapi.TransactionContextInterface,
	declarationID, contractID, exporterID, lcID, forexID, quantityStr, totalValueStr,
	currency, destination, portOfExit string, documents []string) error {

	// Fetch contract data for auto-mapping
	fmt.Printf("SubmitDeclaration: Fetching contract %s for data mapping...\n", contractID)
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err == nil && contractJSON != nil {
		var contract SalesContract
		if json.Unmarshal(contractJSON, &contract) == nil {
			// AUTO-MAP: Exporter ID from contract if not provided
			if exporterID == "" || exporterID == "AUTO" {
				exporterID = contract.ExporterID
				fmt.Printf("SubmitDeclaration: Auto-mapped exporterID: %s\n", exporterID)
			}
			// AUTO-MAP: Currency from contract if not provided
			if currency == "" || currency == "AUTO" {
				currency = contract.Currency
				fmt.Printf("SubmitDeclaration: Auto-mapped currency: %s\n", currency)
			}
			// AUTO-MAP: Destination from contract if not provided
			if destination == "" || destination == "AUTO" {
				destination = contract.BuyerCountry
				fmt.Printf("SubmitDeclaration: Auto-mapped destination: %s\n", destination)
			}
		}
	}

	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity: %v", err)
	}

	totalValue, err := strconv.ParseFloat(totalValueStr, 64)
	if err != nil {
		return fmt.Errorf("invalid total value: %v", err)
	}

	// Verify prerequisites
	lcExists, err := c.LCExists(ctx, lcID)
	if err != nil {
		return fmt.Errorf("failed to check LC: %v", err)
	}
	if !lcExists {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	forexExists, err := c.ForexExists(ctx, forexID)
	if err != nil {
		return fmt.Errorf("failed to check forex: %v", err)
	}
	if !forexExists {
		return fmt.Errorf("forex %s does not exist", forexID)
	}

	// Check if declaration already exists
	existingDecl, err := ctx.GetStub().GetState("DECL_" + declarationID)
	if err != nil {
		return fmt.Errorf("failed to read declaration: %v", err)
	}
	if existingDecl != nil {
		return fmt.Errorf("declaration %s already exists", declarationID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	declaration := CustomsDeclaration{
		DeclarationID:  declarationID,
		ContractID:     contractID,
		ExporterID:     exporterID,
		LCID:           lcID,
		ForexID:        forexID,
		Quantity:       quantity,
		TotalValue:     totalValue,
		Currency:       currency,
		Destination:    destination,
		PortOfExit:     portOfExit,
		Status:         "SUBMITTED",
		SubmissionDate: txTime,
		Documents:      documents,
		CreatedAt:      txTime,
		UpdatedAt:      txTime,
	}

	declarationJSON, err := json.Marshal(declaration)
	if err != nil {
		return fmt.Errorf("failed to marshal declaration: %v", err)
	}

	fmt.Printf("SubmitDeclaration: Declaration created with auto-mapped data\n")
	return ctx.GetStub().PutState("DECL_"+declarationID, declarationJSON)
}

// ReviewDeclaration - Customs officer starts physical inspection
func (c *CoffeeContract) ReviewDeclaration(ctx contractapi.TransactionContextInterface,
	declarationID, customsOfficer, inspectionNotes string) error {

	declarationJSON, err := ctx.GetStub().GetState("DECL_" + declarationID)
	if err != nil {
		return fmt.Errorf("failed to read declaration: %v", err)
	}
	if declarationJSON == nil {
		return fmt.Errorf("declaration %s does not exist", declarationID)
	}

	var declaration CustomsDeclaration
	err = json.Unmarshal(declarationJSON, &declaration)
	if err != nil {
		return fmt.Errorf("failed to unmarshal declaration: %v", err)
	}

	if declaration.Status != "SUBMITTED" {
		return fmt.Errorf("declaration cannot be reviewed, current status: %s", declaration.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	declaration.Status = "UNDER_INSPECTION"
	declaration.CustomsOfficer = customsOfficer
	declaration.InspectionNotes = inspectionNotes
	declaration.ReviewDate = txTime.Format(time.RFC3339)
	declaration.UpdatedAt = txTime

	declarationJSON, err = json.Marshal(declaration)
	if err != nil {
		return fmt.Errorf("failed to marshal declaration: %v", err)
	}

	return ctx.GetStub().PutState("DECL_"+declarationID, declarationJSON)
}

// CompleteInspection - Customs officer completes physical inspection
func (c *CoffeeContract) CompleteInspection(ctx contractapi.TransactionContextInterface,
	declarationID, inspectionNotes string) error {

	declarationJSON, err := ctx.GetStub().GetState("DECL_" + declarationID)
	if err != nil {
		return fmt.Errorf("failed to read declaration: %v", err)
	}
	if declarationJSON == nil {
		return fmt.Errorf("declaration %s does not exist", declarationID)
	}

	var declaration CustomsDeclaration
	err = json.Unmarshal(declarationJSON, &declaration)
	if err != nil {
		return fmt.Errorf("failed to unmarshal declaration: %v", err)
	}

	if declaration.Status != "UNDER_INSPECTION" {
		return fmt.Errorf("declaration not under inspection, current status: %s", declaration.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	declaration.Status = "UNDER_REVIEW"
	declaration.InspectionNotes = inspectionNotes
	declaration.UpdatedAt = txTime

	declarationJSON, err = json.Marshal(declaration)
	if err != nil {
		return fmt.Errorf("failed to marshal declaration: %v", err)
	}

	return ctx.GetStub().PutState("DECL_"+declarationID, declarationJSON)
}

// ClearDeclaration - Customs clears the declaration
func (c *CoffeeContract) ClearDeclaration(ctx contractapi.TransactionContextInterface,
	declarationID, clearanceNumber, dutiesAmountStr string) error {

	dutiesAmount, err := strconv.ParseFloat(dutiesAmountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid duties amount: %v", err)
	}

	declarationJSON, err := ctx.GetStub().GetState("DECL_" + declarationID)
	if err != nil {
		return fmt.Errorf("failed to read declaration: %v", err)
	}
	if declarationJSON == nil {
		return fmt.Errorf("declaration %s does not exist", declarationID)
	}

	var declaration CustomsDeclaration
	err = json.Unmarshal(declarationJSON, &declaration)
	if err != nil {
		return fmt.Errorf("failed to unmarshal declaration: %v", err)
	}

	if declaration.Status != "UNDER_REVIEW" {
		return fmt.Errorf("declaration cannot be cleared, current status: %s", declaration.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	declaration.Status = "CLEARED"
	declaration.ClearanceNumber = clearanceNumber
	declaration.DutiesAmount = dutiesAmount
	declaration.ClearanceDate = txTime.Format(time.RFC3339)
	declaration.UpdatedAt = txTime

	declarationJSON, err = json.Marshal(declaration)
	if err != nil {
		return fmt.Errorf("failed to marshal declaration: %v", err)
	}

	err = ctx.GetStub().PutState("DECL_"+declarationID, declarationJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "UNDER_REVIEW", NewValue: "CLEARED", DataType: "string"},
		{FieldName: "clearanceNumber", OldValue: "", NewValue: clearanceNumber, DataType: "string"},
		{FieldName: "dutiesAmount", OldValue: "", NewValue: fmt.Sprintf("%.2f", dutiesAmount), DataType: "number"},
		{FieldName: "clearanceDate", OldValue: "", NewValue: txTime.Format(time.RFC3339), DataType: "date"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    false,
		EUDRCompliance: false, // EUDR tracked at shipment level
		ICOCompliance:  true,
		ComplianceNote: fmt.Sprintf("Customs cleared: %s, duties: %.2f ETB", clearanceNumber, dutiesAmount),
	}

	err = c.CreateAuditLog(ctx, "CLEAR", "DECLARATION", declarationID, "UNDER_REVIEW", "CLEARED",
		changes, fmt.Sprintf("Customs clearance granted: %s", clearanceNumber), compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	return nil
}

// RejectDeclaration - Customs rejects the declaration
func (c *CoffeeContract) RejectDeclaration(ctx contractapi.TransactionContextInterface,
	declarationID, reason string) error {

	declarationJSON, err := ctx.GetStub().GetState("DECL_" + declarationID)
	if err != nil {
		return fmt.Errorf("failed to read declaration: %v", err)
	}
	if declarationJSON == nil {
		return fmt.Errorf("declaration %s does not exist", declarationID)
	}

	var declaration CustomsDeclaration
	err = json.Unmarshal(declarationJSON, &declaration)
	if err != nil {
		return fmt.Errorf("failed to unmarshal declaration: %v", err)
	}

	if declaration.Status == "CLEARED" {
		return fmt.Errorf("cannot reject cleared declaration")
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	declaration.Status = "REJECTED"
	declaration.RejectionReason = reason
	declaration.UpdatedAt = txTime

	declarationJSON, err = json.Marshal(declaration)
	if err != nil {
		return fmt.Errorf("failed to marshal declaration: %v", err)
	}

	return ctx.GetStub().PutState("DECL_"+declarationID, declarationJSON)
}

// ReadDeclaration - Get declaration details
func (c *CoffeeContract) ReadDeclaration(ctx contractapi.TransactionContextInterface,
	declarationID string) (*CustomsDeclaration, error) {

	declarationJSON, err := ctx.GetStub().GetState("DECL_" + declarationID)
	if err != nil {
		return nil, fmt.Errorf("failed to read declaration: %v", err)
	}
	if declarationJSON == nil {
		return nil, fmt.Errorf("declaration %s does not exist", declarationID)
	}

	var declaration CustomsDeclaration
	err = json.Unmarshal(declarationJSON, &declaration)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal declaration: %v", err)
	}

	return &declaration, nil
}

// QueryDeclarationsByExporter - Get all declarations for an exporter
func (c *CoffeeContract) QueryDeclarationsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*CustomsDeclaration, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryDeclarations(ctx, queryString)
}

// QueryDeclarationsByStatus - Get all declarations with specific status
func (c *CoffeeContract) QueryDeclarationsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*CustomsDeclaration, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryDeclarations(ctx, queryString)
}

// DeclarationExists - Check if declaration exists
func (c *CoffeeContract) DeclarationExists(ctx contractapi.TransactionContextInterface,
	declarationID string) (bool, error) {

	declarationJSON, err := ctx.GetStub().GetState("DECL_" + declarationID)
	if err != nil {
		return false, fmt.Errorf("failed to read declaration: %v", err)
	}
	return declarationJSON != nil, nil
}

// Helper function for querying declarations
func (c *CoffeeContract) queryDeclarations(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*CustomsDeclaration, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query declarations: %v", err)
	}
	defer resultsIterator.Close()

	var declarations []*CustomsDeclaration
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var declaration CustomsDeclaration
		err = json.Unmarshal(queryResponse.Value, &declaration)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal declaration: %v", err)
		}
		declarations = append(declarations, &declaration)
	}

	return declarations, nil
}

package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== LETTER OF CREDIT STRUCTURE ====================

type LetterOfCredit struct {
	LCID              string    `json:"lcId"`
	ContractID        string    `json:"contractId"`
	ExporterID        string    `json:"exporterId"`
	BankName          string    `json:"bankName"`
	IssuingBank       string    `json:"issuingBank"`
	BeneficiaryBank   string    `json:"beneficiaryBank"`
	Beneficiary       string    `json:"beneficiary"`
	Amount            float64   `json:"amount"`
	Currency          string    `json:"currency"`
	Status            string    `json:"status"` // REQUESTED, APPROVED, ISSUED, UTILIZED, EXPIRED
	ExpiryDate        string    `json:"expiryDate"`
	RequestDate       time.Time `json:"requestDate"`
	ApprovalDate      string    `json:"approvalDate"`
	IssueDate         string    `json:"issueDate"`
	UtilizationDate   string    `json:"utilizationDate"`
	Documents         []string  `json:"documents"` // Required documents
	Terms             string    `json:"terms"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// ==================== LC FUNCTIONS ====================

// RequestLC - Exporter requests Letter of Credit from bank
func (c *CoffeeContract) RequestLC(ctx contractapi.TransactionContextInterface,
	lcID, contractID, exporterID, bankName, amountStr, currency, expiryDate string) error {

	// Parse amount
	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	// Validate amount
	if amount <= 0 {
		return fmt.Errorf("amount must be greater than zero")
	}

	// Verify contract exists
	contractExists, err := c.SalesContractExists(ctx, contractID)
	if err != nil {
		return fmt.Errorf("failed to check contract existence: %v", err)
	}
	if !contractExists {
		return fmt.Errorf("contract %s does not exist", contractID)
	}

	// Verify exporter exists
	exporterExists, err := c.ExporterExists(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("failed to check exporter existence: %v", err)
	}
	if !exporterExists {
		return fmt.Errorf("exporter %s does not exist", exporterID)
	}

	// Check if LC already exists
	existingLC, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if existingLC != nil {
		return fmt.Errorf("LC %s already exists", lcID)
	}

	// Create LC
	lc := LetterOfCredit{
		LCID:        lcID,
		ContractID:  contractID,
		ExporterID:  exporterID,
		BankName:    bankName,
		Amount:      amount,
		Currency:    currency,
		Status:      "REQUESTED",
		ExpiryDate:  expiryDate,
		RequestDate: time.Now(),
		Documents:   []string{},
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	lcJSON, err := json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	return ctx.GetStub().PutState("LC_"+lcID, lcJSON)
}

// ApproveLC - Bank approves the Letter of Credit
func (c *CoffeeContract) ApproveLC(ctx contractapi.TransactionContextInterface,
	lcID, issuingBank, beneficiaryBank, beneficiary string) error {

	// Read existing LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("failed to unmarshal LC: %v", err)
	}

	// Validate status
	if lc.Status != "REQUESTED" {
		return fmt.Errorf("LC cannot be approved, current status: %s", lc.Status)
	}

	// Update LC
	lc.Status = "APPROVED"
	lc.IssuingBank = issuingBank
	lc.BeneficiaryBank = beneficiaryBank
	lc.Beneficiary = beneficiary
	lc.ApprovalDate = time.Now().Format(time.RFC3339)
	lc.UpdatedAt = time.Now()

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	return ctx.GetStub().PutState("LC_"+lcID, lcJSON)
}

// IssueLC - Bank issues the Letter of Credit
func (c *CoffeeContract) IssueLC(ctx contractapi.TransactionContextInterface,
	lcID, terms string) error {

	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("failed to unmarshal LC: %v", err)
	}

	if lc.Status != "APPROVED" {
		return fmt.Errorf("LC cannot be issued, current status: %s", lc.Status)
	}

	lc.Status = "ISSUED"
	lc.Terms = terms
	lc.IssueDate = time.Now().Format(time.RFC3339)
	lc.UpdatedAt = time.Now()

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	return ctx.GetStub().PutState("LC_"+lcID, lcJSON)
}

// ReadLC - Get Letter of Credit details
func (c *CoffeeContract) ReadLC(ctx contractapi.TransactionContextInterface,
	lcID string) (*LetterOfCredit, error) {

	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return nil, fmt.Errorf("failed to read LC: %v", err)
	}
	if lcJSON == nil {
		return nil, fmt.Errorf("LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal LC: %v", err)
	}

	return &lc, nil
}

// UpdateLCStatus - Update LC status
func (c *CoffeeContract) UpdateLCStatus(ctx contractapi.TransactionContextInterface,
	lcID, newStatus string) error {

	validStatuses := map[string]bool{
		"REQUESTED": true, "APPROVED": true, "ISSUED": true,
		"UTILIZED": true, "EXPIRED": true,
	}
	if !validStatuses[newStatus] {
		return fmt.Errorf("invalid status: %s", newStatus)
	}

	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("failed to unmarshal LC: %v", err)
	}

	lc.Status = newStatus
	if newStatus == "UTILIZED" {
		lc.UtilizationDate = time.Now().Format(time.RFC3339)
	}
	lc.UpdatedAt = time.Now()

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	return ctx.GetStub().PutState("LC_"+lcID, lcJSON)
}

// QueryLCsByExporter - Get all LCs for an exporter
func (c *CoffeeContract) QueryLCsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*LetterOfCredit, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryLCs(ctx, queryString)
}

// QueryLCsByStatus - Get all LCs with specific status
func (c *CoffeeContract) QueryLCsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*LetterOfCredit, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryLCs(ctx, queryString)
}

// LCExists - Check if LC exists
func (c *CoffeeContract) LCExists(ctx contractapi.TransactionContextInterface,
	lcID string) (bool, error) {

	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return false, fmt.Errorf("failed to read LC: %v", err)
	}
	return lcJSON != nil, nil
}

// Helper function for querying LCs
func (c *CoffeeContract) queryLCs(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*LetterOfCredit, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query LCs: %v", err)
	}
	defer resultsIterator.Close()

	var lcs []*LetterOfCredit
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var lc LetterOfCredit
		err = json.Unmarshal(queryResponse.Value, &lc)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal LC: %v", err)
		}
		lcs = append(lcs, &lc)
	}

	return lcs, nil
}

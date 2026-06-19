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
	IssuingBank       string    `json:"issuingBank"`       // Buyer's bank (opens LC)
	AdvisingBank      string    `json:"advisingBank"`      // Exporter's bank (receives LC)
	Beneficiary       string    `json:"beneficiary"`       // Exporter company name
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
// AUTO-MAPS: Contract details, issuing bank (buyer's bank), advising bank (exporter's bank)
func (c *CoffeeContract) RequestLC(ctx contractapi.TransactionContextInterface,
	lcID, contractID, exporterID, bankName, amountStr, currency, expiryDate string) error {

	fmt.Printf("=== RequestLC called: lcID=%s, contractID=%s ===\n", lcID, contractID)

	// Parse amount
	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		fmt.Printf("RequestLC ERROR: invalid amount: %v\n", err)
		return fmt.Errorf("invalid amount: %v", err)
	}

	// Validate amount
	if amount <= 0 {
		fmt.Printf("RequestLC ERROR: amount must be greater than zero\n")
		return fmt.Errorf("amount must be greater than zero")
	}

	// Fetch contract data for auto-mapping
	fmt.Printf("RequestLC: Fetching contract %s for data mapping...\n", contractID)
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to read contract: %v\n", err)
		return fmt.Errorf("failed to read contract: %v", err)
	}
	if contractJSON == nil {
		fmt.Printf("RequestLC ERROR: contract %s does not exist\n", contractID)
		return fmt.Errorf("contract %s does not exist", contractID)
	}

	var contract SalesContract
	err = json.Unmarshal(contractJSON, &contract)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to unmarshal contract: %v\n", err)
		return fmt.Errorf("failed to unmarshal contract: %v", err)
	}
	fmt.Printf("RequestLC: Contract verified and data loaded\n")

	// AUTO-MAP: Exporter ID from contract
	mappedExporterID := exporterID
	if mappedExporterID == "" || mappedExporterID == "AUTO" {
		mappedExporterID = contract.ExporterID
		fmt.Printf("RequestLC: Auto-mapped exporterID from contract: %s\n", mappedExporterID)
	}

	// AUTO-MAP: Amount and currency from contract
	mappedAmount := amount
	mappedCurrency := currency
	if mappedAmount == 0 || mappedAmount == 1 {
		mappedAmount = contract.TotalValue
		mappedCurrency = contract.Currency
		fmt.Printf("RequestLC: Auto-mapped amount and currency from contract: %f %s\n", mappedAmount, mappedCurrency)
	}

	// AUTO-MAP: Issuing bank (buyer's bank) and Advising bank (exporter's bank) from contract
	issuingBank := contract.BuyerBank    // Buyer's bank opens the LC
	advisingBank := contract.ExporterBank // Exporter's bank receives/advises the LC
	
	// Fallback if banks not set in contract
	if issuingBank == "" {
		issuingBank = "Foreign Bank - " + contract.BuyerCountry
		fmt.Printf("RequestLC: Using fallback issuing bank: %s\n", issuingBank)
	} else {
		fmt.Printf("RequestLC: Auto-mapped issuing bank from contract: %s\n", issuingBank)
	}
	
	if advisingBank == "" {
		advisingBank = bankName // Use the bank name provided (Ethiopian bank)
		if advisingBank == "" {
			advisingBank = "Commercial Bank of Ethiopia"
		}
		fmt.Printf("RequestLC: Using fallback advising bank: %s\n", advisingBank)
	} else {
		fmt.Printf("RequestLC: Auto-mapped advising bank from contract: %s\n", advisingBank)
	}

	// VALIDATION: Ensure issuing and advising banks are different
	if issuingBank == advisingBank {
		return fmt.Errorf("issuing bank and advising bank must be different institutions")
	}

	// Verify exporter exists
	fmt.Printf("RequestLC: Verifying exporter %s exists...\n", mappedExporterID)
	exporterExists, err := c.ExporterExists(ctx, mappedExporterID)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to check exporter existence: %v\n", err)
		return fmt.Errorf("failed to check exporter existence: %v", err)
	}
	if !exporterExists {
		fmt.Printf("RequestLC ERROR: exporter %s does not exist\n", mappedExporterID)
		return fmt.Errorf("exporter %s does not exist", mappedExporterID)
	}

	// Check if LC already exists
	fmt.Printf("RequestLC: Checking if LC %s already exists...\n", lcID)
	existingLC, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to read LC: %v\n", err)
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if existingLC != nil {
		fmt.Printf("RequestLC ERROR: LC %s already exists\n", lcID)
		return fmt.Errorf("LC %s already exists", lcID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to get tx timestamp: %v\n", err)
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	// Create LC with properly mapped banks
	lc := LetterOfCredit{
		LCID:         lcID,
		ContractID:   contractID,
		ExporterID:   mappedExporterID,
		IssuingBank:  issuingBank,    // Buyer's bank
		AdvisingBank: advisingBank,   // Exporter's bank
		Amount:       mappedAmount,
		Currency:     mappedCurrency,
		Status:       "REQUESTED",
		ExpiryDate:   expiryDate,
		RequestDate:  txTime,
		Documents:    []string{},
		CreatedAt:    txTime,
		UpdatedAt:    txTime,
	}

	lcJSON, err := json.Marshal(lc)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to marshal LC: %v\n", err)
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	fmt.Printf("RequestLC: Saving LC with IssuingBank=%s, AdvisingBank=%s\n", issuingBank, advisingBank)
	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to save LC: %v\n", err)
		return err
	}

	fmt.Printf("=== RequestLC completed: Issuing Bank (%s) ≠ Advising Bank (%s) ===\n", issuingBank, advisingBank)
	return nil
}

// ApproveLC - Bank approves the Letter of Credit and auto-triggers forex allocation
// AUTO-MAPS: Beneficiary name from exporter, validates bank separation
func (c *CoffeeContract) ApproveLC(ctx contractapi.TransactionContextInterface,
	lcID, issuingBank, beneficiaryBank, beneficiary string) error {

	fmt.Printf("=== ApproveLC called: lcID=%s ===\n", lcID)

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

	// AUTO-MAP: Fetch exporter data for beneficiary name if not provided
	mappedBeneficiary := beneficiary
	if mappedBeneficiary == "" || mappedBeneficiary == "AUTO" {
		exporterJSON, err := ctx.GetStub().GetState("EXPORTER_" + lc.ExporterID)
		if err == nil && exporterJSON != nil {
			var exporter Exporter
			if json.Unmarshal(exporterJSON, &exporter) == nil {
				mappedBeneficiary = exporter.CompanyName
				fmt.Printf("ApproveLC: Auto-mapped beneficiary from exporter: %s\n", mappedBeneficiary)
			}
		}
		if mappedBeneficiary == "" || mappedBeneficiary == "AUTO" {
			mappedBeneficiary = lc.ExporterID
		}
	}

	// Banks are already set in LC from RequestLC, keep them
	// Issuing bank and advising bank should remain as set during LC request
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Update LC
	lc.Status = "APPROVED"
	lc.Beneficiary = mappedBeneficiary
	lc.ApprovalDate = txTime.Format(time.RFC3339)
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("failed to save LC: %v", err)
	}

	fmt.Printf("ApproveLC: LC approved with IssuingBank=%s, AdvisingBank=%s\n", lc.IssuingBank, lc.AdvisingBank)

	// AUTO-TRIGGER: Create forex allocation
	forexID := "FOREX_" + lcID
	
	exchangeRate := 120.0
	rateObj, err := c.GetCurrentExchangeRate(ctx, lc.Currency)
	if err == nil && rateObj != nil {
		exchangeRate = rateObj.MidRate
	}

	retentionRate := 40.0
	policy, err := c.GetCurrentRetentionPolicy(ctx, "COFFEE")
	if err == nil && policy != nil {
		retentionRate = policy.RetentionRate
	}

	expiryDays := 90
	expiryDate := txTime.AddDate(0, 0, expiryDays).Format(time.RFC3339)

	forex := ForexAllocation{
		ForexID:           forexID,
		ContractID:        lc.ContractID,
		ExporterID:        lc.ExporterID,
		LCID:              lcID,
		RequestedAmount:   lc.Amount,
		AllocatedAmount:   lc.Amount,
		Currency:          lc.Currency,
		ExchangeRate:      exchangeRate,
		OfficialRate:      exchangeRate,
		RetentionRate:     retentionRate,
		Status:            "ALLOCATED",
		RequestDate:       txTime,
		AllocationDate:    txTime.Format(time.RFC3339),
		ExpiryDate:        expiryDate,
		NBEOfficer:        "AUTO_SYSTEM",
		NBEApprovalRef:    "LC_AUTO_" + lcID,
		Comments:          fmt.Sprintf("Auto-allocated for LC with Issuing Bank: %s, Advising Bank: %s", lc.IssuingBank, lc.AdvisingBank),
		CreatedAt:         txTime,
		UpdatedAt:         txTime,
	}

	forexJSON, err := json.Marshal(forex)
	if err != nil {
		fmt.Printf("ApproveLC WARNING: failed to marshal forex: %v\n", err)
	} else {
		err = ctx.GetStub().PutState(forexID, forexJSON)
		if err != nil {
			fmt.Printf("ApproveLC WARNING: failed to save forex: %v\n", err)
		} else {
			fmt.Printf("ApproveLC: Forex allocated successfully\n")
		}
	}

	fmt.Printf("=== ApproveLC completed ===\n")
	return nil
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

// QueryAllLCs - Get all Letters of Credit
func (c *CoffeeContract) QueryAllLCs(ctx contractapi.TransactionContextInterface) ([]*LetterOfCredit, error) {
	// Use GetStateByRange to get all LC records
	resultsIterator, err := ctx.GetStub().GetStateByRange("LC_", "LC_~")
	if err != nil {
		return nil, fmt.Errorf("failed to query all LCs: %v", err)
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

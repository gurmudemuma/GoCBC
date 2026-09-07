package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== LETTER OF CREDIT STRUCTURE ====================

type LetterOfCredit struct {
	LCID            string                   `json:"lcId"`
	ContractID      string                   `json:"contractId"`
	ExporterID      string                   `json:"exporterId"`
	IssuingBank     string                   `json:"issuingBank"`  // Buyer's bank (opens LC)
	AdvisingBank    string                   `json:"advisingBank"` // Exporter's bank (receives LC)
	Beneficiary     string                   `json:"beneficiary"`  // Exporter company name
	Amount          float64                  `json:"amount"`
	Currency        string                   `json:"currency"`
	Status          string                   `json:"status"` // REQUESTED, APPROVED, ISSUED, UTILIZED, EXPIRED
	ExpiryDate      string                   `json:"expiryDate"`
	RequestDate     time.Time                `json:"requestDate"`
	ApprovalDate    string                   `json:"approvalDate"`
	IssueDate       string                   `json:"issueDate"`
	UtilizationDate string                   `json:"utilizationDate"`
	Documents       []string                 `json:"documents"` // Required documents
	Terms           string                   `json:"terms"`
	// LC Amendments (real-world LCs frequently amended)
	Amendments      []LCAmendment            `json:"amendments"` // Amendment history
	AmendmentCount  int                      `json:"amendmentCount"` // Total amendments
	// Document Discrepancies (common in LC negotiations)
	Discrepancies   []LCDiscrepancy          `json:"discrepancies"` // Document issues
	DiscrepancyResolved bool                 `json:"discrepancyResolved"` // All resolved?
	// Negotiation Status
	NegotiationStatus string                 `json:"negotiationStatus"` // NOT_STARTED, UNDER_NEGOTIATION, ACCEPTED, REJECTED
	NegotiationDate   string                 `json:"negotiationDate"` // Date negotiation started
	NegotiatingBank   string                 `json:"negotiatingBank"` // Bank negotiating documents
	// ✅ MSP Identity Fields
	ApprovedBy      string                   `json:"approvedBy"`      // X.509 certificate of approver
	ApprovedByMSP   string                   `json:"approvedByMsp"`   // MSP ID of approver
	IssuedBy        string                   `json:"issuedBy"`        // X.509 certificate of issuer
	IssuedByMSP     string                   `json:"issuedByMsp"`     // MSP ID of issuer
	LastUpdatedBy   string                   `json:"lastUpdatedBy"`   // X.509 certificate of last updater
	LastUpdatedByMSP string                  `json:"lastUpdatedByMsp"` // MSP ID of last updater
	CreatedAt       time.Time                `json:"createdAt"`
	UpdatedAt       time.Time                `json:"updatedAt"`
}

// LC Amendment structure
type LCAmendment struct {
	AmendmentNo   int       `json:"amendmentNo"`
	AmendmentDate time.Time `json:"amendmentDate"`
	Changes       string    `json:"changes"` // Description of changes
	Status        string    `json:"status"`  // PENDING, ACCEPTED, REJECTED
	RequestedBy   string    `json:"requestedBy"` // Buyer or Seller
	ApprovedBy    string    `json:"approvedBy"` // Bank officer
}

// LC Discrepancy structure
type LCDiscrepancy struct {
	DiscrepancyID string    `json:"discrepancyId"`
	Document      string    `json:"document"` // Which document has issue
	Issue         string    `json:"issue"` // Description of problem
	ReportedDate  time.Time `json:"reportedDate"`
	ResolvedDate  string    `json:"resolvedDate"` // ISO date when resolved
	Resolution    string    `json:"resolution"` // How it was resolved
	Status        string    `json:"status"` // OPEN, RESOLVED, WAIVED
}

// ==================== LC FUNCTIONS ====================

// RequestLC - Exporter requests Letter of Credit from bank
// AUTO-MAPS: Contract details, issuing bank (buyer's bank), advising bank (exporter's bank)
func (c *CoffeeContract) RequestLC(ctx contractapi.TransactionContextInterface,
	lcID, contractID, exporterID, bankName, amountStr, currency, expiryDate string) error {

	fmt.Printf("=== RequestLC called: lcID=%s, contractID=%s ===\n", lcID, contractID)

	// VALIDATION: IDs
	if err := ValidateID(lcID, "lcID"); err != nil {
		return fmt.Errorf("RequestLC: %w", err)
	}
	if err := ValidateID(contractID, "contractID"); err != nil {
		return fmt.Errorf("RequestLC: %w", err)
	}

	// Parse amount
	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		fmt.Printf("RequestLC ERROR: invalid amount: %v\n", err)
		return fmt.Errorf("RequestLC: invalid amount: %w", err)
	}

	// VALIDATION: Amount
	if err := ValidateAmount(amount, "amount"); err != nil {
		fmt.Printf("RequestLC ERROR: %v\n", err)
		return fmt.Errorf("RequestLC: %w", err)
	}

	// VALIDATION: Currency
	if err := ValidateCurrency(currency); err != nil {
		return fmt.Errorf("RequestLC: %w", err)
	}

	// VALIDATION: Expiry date
	if expiryDate != "" {
		if err := ValidateDate(expiryDate); err != nil {
			return fmt.Errorf("RequestLC: %w", err)
		}
	}

	// Fetch contract data for auto-mapping
	fmt.Printf("RequestLC: Fetching contract %s for data mapping...\n", contractID)
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to read contract: %v\n", err)
		return fmt.Errorf("RequestLC: failed to read contract %s: %w", contractID, err)
	}
	if contractJSON == nil {
		fmt.Printf("RequestLC ERROR: contract %s does not exist\n", contractID)
		return fmt.Errorf("RequestLC: contract %s does not exist", contractID)
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
	issuingBank := contract.BuyerBank     // Buyer's bank opens the LC
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
		IssuingBank:  issuingBank,  // Buyer's bank
		AdvisingBank: advisingBank, // Exporter's bank
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

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "lcId", OldValue: "", NewValue: lcID, DataType: "string"},
		{FieldName: "contractId", OldValue: "", NewValue: contractID, DataType: "string"},
		{FieldName: "amount", OldValue: "", NewValue: fmt.Sprintf("%.2f", mappedAmount), DataType: "number"},
		{FieldName: "status", OldValue: "", NewValue: "REQUESTED", DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  false, // NBE monitors, doesn't approve LCs
		UCP600Check:    true,  // LC follows UCP 600
		EUDRCompliance: contract.EUDRRequired,
		ICOCompliance:  true,
		ComplianceNote: "LC requested. Requires bank approval, then bank allocates forex per NBE policy (50% retention).",
	}

	err = c.CreateAuditLog(ctx, "CREATE", "LC", lcID, "", "REQUESTED", changes,
		"Letter of Credit requested by exporter", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	fmt.Printf("=== RequestLC completed: Issuing Bank (%s) ≠ Advising Bank (%s) ===\n", issuingBank, advisingBank)
	return nil
}

// ApproveLC - Bank approves the Letter of Credit and auto-triggers forex allocation
// AUTO-MAPS: Beneficiary name from exporter, validates bank separation
func (c *CoffeeContract) ApproveLC(ctx contractapi.TransactionContextInterface,
	lcID, issuingBank, beneficiaryBank, beneficiary string) error {

	fmt.Printf("=== ApproveLC called: lcID=%s ===\n", lcID)

	// ✅ CAPTURE MSP IDENTITY of approver
	approverMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ApproveLC: failed to get approver MSP ID: %w", err)
	}
	
	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		approverID = approverMSP // Fallback to MSP if cert not available
	}
	
	fmt.Printf("ApproveLC: LC being approved by %s (MSP: %s)\n", approverID, approverMSP)

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
	lc.ApprovedBy = approverID      // ✅ Record WHO approved (X.509 cert)
	lc.ApprovedByMSP = approverMSP  // ✅ Record approver's MSP
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("failed to save LC: %v", err)
	}

	fmt.Printf("ApproveLC: LC approved by %s with IssuingBank=%s, AdvisingBank=%s\n", 
		approverMSP, lc.IssuingBank, lc.AdvisingBank)

	// NOTE: Forex allocation is now MANUAL via separate forex allocation tab
	// Banks must explicitly allocate forex in the Forex Allocations tab after LC approval
	fmt.Printf("ApproveLC: LC approved. Forex allocation must be done manually by bank.\n")

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "REQUESTED", NewValue: "APPROVED", DataType: "string"},
		{FieldName: "beneficiary", OldValue: "", NewValue: mappedBeneficiary, DataType: "string"},
		{FieldName: "approvalDate", OldValue: "", NewValue: txTime.Format(time.RFC3339), DataType: "date"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  false, // Forex must be allocated manually by bank
		UCP600Check:    true,
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: "LC approved by bank. Bank must manually allocate forex in Forex Allocations tab per NBE policy (50% retention).",
	}

	err = c.CreateAuditLog(ctx, "APPROVE", "LC", lcID, "REQUESTED", "APPROVED", changes,
		"Letter of Credit approved by bank. Forex allocation pending in Forex Allocations tab.", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	fmt.Printf("=== ApproveLC completed ===\n")
	return nil
}

// IssueLC - Bank issues the Letter of Credit
func (c *CoffeeContract) IssueLC(ctx contractapi.TransactionContextInterface,
	lcID, terms string) error {

	// ✅ CAPTURE MSP IDENTITY of issuer
	issuerMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("IssueLC: failed to get issuer MSP ID: %w", err)
	}
	
	issuerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		issuerID = issuerMSP // Fallback to MSP if cert not available
	}
	
	fmt.Printf("IssueLC: LC being issued by %s (MSP: %s)\n", issuerID, issuerMSP)

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

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	lc.Status = "ISSUED"
	lc.Terms = terms
	lc.IssueDate = txTime.Format(time.RFC3339)
	lc.IssuedBy = issuerID       // ✅ Record WHO issued (X.509 cert)
	lc.IssuedByMSP = issuerMSP   // ✅ Record issuer's MSP
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "APPROVED", NewValue: "ISSUED", DataType: "string"},
		{FieldName: "issueDate", OldValue: "", NewValue: txTime.Format(time.RFC3339), DataType: "date"},
		{FieldName: "terms", OldValue: "", NewValue: terms, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    true, // LC follows UCP 600 documentary credit rules
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: "LC issued by bank, ready for shipment and payment",
	}

	err = c.CreateAuditLog(ctx, "ISSUE", "LC", lcID, "APPROVED", "ISSUED", changes,
		"Letter of Credit issued by bank", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	return nil
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

	// Ensure Amendments is never nil (backward compatibility)
	if lc.Amendments == nil {
		lc.Amendments = []LCAmendment{}
	}
	// Ensure Discrepancies is never nil
	if lc.Discrepancies == nil {
		lc.Discrepancies = []LCDiscrepancy{}
	}
	// Ensure Documents is never nil (backward compatibility)
	if lc.Documents == nil {
		lc.Documents = []string{}
	}

	return &lc, nil
}

// UpdateLCStatus - Update LC status
func (c *CoffeeContract) UpdateLCStatus(ctx contractapi.TransactionContextInterface,
	lcID, newStatus string) error {

	// ✅ CAPTURE MSP IDENTITY of updater
	updaterMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("UpdateLCStatus: failed to get updater MSP ID: %w", err)
	}
	
	updaterID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		updaterID = updaterMSP // Fallback to MSP if cert not available
	}

	validStatuses := map[string]bool{
		"REQUESTED": true, "APPROVED": true, "ISSUED": true,
		"FOREX_ALLOCATED": true, "UTILIZED": true, "PAYMENT_RELEASED": true, "SETTLED": true, "EXPIRED": true,
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
		// Get transaction timestamp
		txTimestamp, err := ctx.GetStub().GetTxTimestamp()
		if err != nil {
			return fmt.Errorf("failed to get tx timestamp: %v", err)
		}
		txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
		lc.UtilizationDate = txTime.Format(time.RFC3339)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	lc.LastUpdatedBy = updaterID       // ✅ Record WHO updated (X.509 cert)
	lc.LastUpdatedByMSP = updaterMSP   // ✅ Record updater's MSP
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	return ctx.GetStub().PutState("LC_"+lcID, lcJSON)
}

// AmendLC - Amend Letter of Credit (amount, expiry date, terms)
// Common amendments per UCP 600 Article 10
func (c *CoffeeContract) AmendLC(ctx contractapi.TransactionContextInterface,
	lcID, amendmentReason, newAmountStr, newExpiryDate, newTerms, amendedBy string) error {

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

	// Can only amend LCs in ISSUED status
	if lc.Status != "ISSUED" {
		return fmt.Errorf("cannot amend LC in status %s - must be ISSUED", lc.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Track what changed
	var changesDescription string

	// Update amount if provided
	if newAmountStr != "" {
		newAmount, err := strconv.ParseFloat(newAmountStr, 64)
		if err != nil {
			return fmt.Errorf("invalid amount: %v", err)
		}
		if newAmount <= 0 {
			return fmt.Errorf("amount must be positive")
		}
		changesDescription += fmt.Sprintf("Amount changed from %.2f to %.2f %s; ", lc.Amount, newAmount, lc.Currency)
		lc.Amount = newAmount
	}

	// Update expiry date if provided
	if newExpiryDate != "" {
		// Validate date format
		_, err := time.Parse("2006-01-02", newExpiryDate)
		if err != nil {
			return fmt.Errorf("invalid expiry date format (use YYYY-MM-DD): %v", err)
		}
		changesDescription += fmt.Sprintf("Expiry changed from %s to %s; ", lc.ExpiryDate, newExpiryDate)
		lc.ExpiryDate = newExpiryDate
	}

	// Update terms if provided
	if newTerms != "" {
		changesDescription += fmt.Sprintf("Terms updated; ")
		lc.Terms = newTerms
	}

	// Create amendment record
	amendment := LCAmendment{
		AmendmentNo:   lc.AmendmentCount + 1,
		AmendmentDate: txTime,
		Changes:       changesDescription,
		Status:        "ACCEPTED", // Auto-accepted in this implementation
		RequestedBy:   amendedBy,
		ApprovedBy:    amendedBy,
	}

	// Add amendment to history
	lc.Amendments = append(lc.Amendments, amendment)
	lc.AmendmentCount = lc.AmendmentCount + 1
	lc.UpdatedAt = txTime

	// Save amended LC
	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("failed to save amended LC: %v", err)
	}

	// Create audit log entry
	auditEntry := map[string]interface{}{
		"action":       "LC_AMENDED",
		"lcID":         lcID,
		"amendedBy":    amendedBy,
		"reason":       amendmentReason,
		"amendmentNum": len(lc.Amendments),
		"timestamp":    txTime.Format(time.RFC3339),
	}

	auditJSON, _ := json.Marshal(auditEntry)
	fmt.Printf("LC Amendment: %s\n", string(auditJSON))

	return nil
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
		
		// Ensure Amendments is never nil (backward compatibility)
		if lc.Amendments == nil {
			lc.Amendments = []LCAmendment{}
		}
		// Ensure Discrepancies is never nil
		if lc.Discrepancies == nil {
			lc.Discrepancies = []LCDiscrepancy{}
		}
		// Ensure Documents is never nil (backward compatibility)
		if lc.Documents == nil {
			lc.Documents = []string{}
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

// DeleteLC - Delete a Letter of Credit (ADMIN ONLY - for fixing duplicates)
// ⚠️ WARNING: This is a destructive operation. Use only for cleanup.
func (c *CoffeeContract) DeleteLC(ctx contractapi.TransactionContextInterface, lcID string) error {
	// ✅ CAPTURE MSP IDENTITY - Only BANKS or ECTA can delete
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("DeleteLC: failed to get MSP ID: %w", err)
	}
	
	// Only BANKS or ECTA can delete LCs (for cleanup purposes)
	if mspID != "BanksMSP" && mspID != "ECTAMSP" && mspID != "NBEMSP" {
		return fmt.Errorf("DeleteLC: only Banks, ECTA, or NBE can delete LCs (for duplicate cleanup), got: %s", mspID)
	}
	
	fmt.Printf("=== DeleteLC called by %s: lcID=%s ===\n", mspID, lcID)

	// Check if LC exists
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	// Parse LC to log details before deletion
	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("failed to unmarshal LC: %v", err)
	}

	fmt.Printf("DeleteLC: Deleting LC %s (Status: %s, Contract: %s, Amount: %.2f %s)\n", 
		lcID, lc.Status, lc.ContractID, lc.Amount, lc.Currency)

	// Delete the LC
	err = ctx.GetStub().DelState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to delete LC: %v", err)
	}

	// ✅ CREATE AUDIT LOG for deletion
	changes := []FieldChange{
		{FieldName: "lcId", OldValue: lcID, NewValue: "DELETED", DataType: "string"},
		{FieldName: "status", OldValue: lc.Status, NewValue: "DELETED", DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  false,
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("LC deleted by %s for duplicate cleanup", mspID),
	}

	err = c.CreateAuditLog(ctx, "DELETE", "LC", lcID, lc.Status, "DELETED", changes,
		fmt.Sprintf("LC deleted by %s (duplicate cleanup)", mspID), compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log for LC deletion: %v", err)
	}

	fmt.Printf("=== DeleteLC completed: %s ===\n", lcID)
	return nil
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


// ExamineLCDocuments - Bank examines shipping documents against LC terms
// Workflow: Bank verifies document compliance (UCP 600 Article 14)
func (c *CoffeeContract) ExamineLCDocuments(ctx contractapi.TransactionContextInterface,
	lcID string, compliant string, discrepancies string, examinationDate string, examiner string) error {

	fmt.Printf("=== ExamineLCDocuments called: lcID=%s, compliant=%s ===\n", lcID, compliant)

	// Validate inputs
	if err := ValidateID(lcID, "lcID"); err != nil {
		return fmt.Errorf("ExamineLCDocuments: %w", err)
	}

	// Fetch LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC %s: %w", lcID, err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	if err := json.Unmarshal(lcJSON, &lc); err != nil {
		return fmt.Errorf("failed to unmarshal LC: %w", err)
	}

	// Only ISSUED or FOREX_ALLOCATED LCs can have documents examined
	// (FOREX_ALLOCATED is set after forex allocation; LC is still eligible for examination)
	if lc.Status != "ISSUED" && lc.Status != "FOREX_ALLOCATED" {
		return fmt.Errorf("LC must be in ISSUED or FOREX_ALLOCATED status for document examination (current: %s)", lc.Status)
	}

	// Update LC with examination results - move to UTILIZED if compliant
	if compliant == "true" {
		lc.Status = "UTILIZED" // Documents verified, ready for payment
		fmt.Printf("ExamineLCDocuments: Documents COMPLIANT for LC %s, status set to UTILIZED\n", lcID)
	} else {
		// Keep current status (ISSUED or FOREX_ALLOCATED) if discrepant, exporter must resubmit
		fmt.Printf("ExamineLCDocuments: Documents DISCREPANT for LC %s: %s (status remains %s)\n", lcID, discrepancies, lc.Status)
	}

	lc.UpdatedAt = time.Now()

	// Save updated LC
	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %w", err)
	}

	if err := ctx.GetStub().PutState("LC_"+lcID, lcJSON); err != nil {
		return fmt.Errorf("failed to update LC: %w", err)
	}

	// Emit event
	eventPayload := map[string]interface{}{
		"lcID":            lcID,
		"compliant":       compliant,
		"discrepancies":   discrepancies,
		"examinationDate": examinationDate,
		"examiner":        examiner,
		"status":          lc.Status,
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("DocumentExaminationCompleted", eventJSON)

	fmt.Printf("ExamineLCDocuments: LC %s documents examined, status=%s\n", lcID, lc.Status)
	return nil
}

// ReleaseLCPayment - Bank releases payment to exporter after document compliance
// Workflow: Final step - bank transfers funds via SWIFT (UCP 600 Article 7)
func (c *CoffeeContract) ReleaseLCPayment(ctx contractapi.TransactionContextInterface,
	lcID string, amount string, currency string, paymentDate string, payingBank string) error {

	fmt.Printf("=== ReleaseLCPayment called: lcID=%s, amount=%s %s ===\n", lcID, amount, currency)

	// Validate inputs
	if err := ValidateID(lcID, "lcID"); err != nil {
		return fmt.Errorf("ReleaseLCPayment: %w", err)
	}

	paymentAmount, err := strconv.ParseFloat(amount, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %w", err)
	}

	if err := ValidateAmount(paymentAmount, "amount"); err != nil {
		return fmt.Errorf("ReleaseLCPayment: %w", err)
	}

	if err := ValidateCurrency(currency); err != nil {
		return fmt.Errorf("ReleaseLCPayment: %w", err)
	}

	// Fetch LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC %s: %w", lcID, err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	if err := json.Unmarshal(lcJSON, &lc); err != nil {
		return fmt.Errorf("failed to unmarshal LC: %w", err)
	}

	// Only UTILIZED LCs can proceed to payment (documents already verified)
	if lc.Status != "UTILIZED" {
		return fmt.Errorf("LC must be UTILIZED (documents verified) before payment release (current status: %s)", lc.Status)
	}

	// Verify amount does not exceed LC amount
	if paymentAmount > lc.Amount {
		return fmt.Errorf("payment amount (%.2f) exceeds LC amount (%.2f)", paymentAmount, lc.Amount)
	}

	// Documents were verified (UTILIZED); releasing payment moves LC to PAYMENT_RELEASED
	// so the Settlements tab / KPIs can pick it up. Settlement will later move it to SETTLED.
	lc.Status = "PAYMENT_RELEASED"
	lc.UtilizationDate = paymentDate
	lc.UpdatedAt = time.Now()

	// Save updated LC
	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %w", err)
	}

	if err := ctx.GetStub().PutState("LC_"+lcID, lcJSON); err != nil {
		return fmt.Errorf("failed to update LC: %w", err)
	}

	// BRIDGE: Create a Payment entity so the Payment lifecycle (SettlePayment) can
	// later cascade this LC to SETTLED. PaymentID is deterministic: "PAY_<lcID>".
	paymentID := "PAY_" + lcID
	existingPayment, getErr := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if getErr == nil && existingPayment == nil {
		txTimestamp, tsErr := ctx.GetStub().GetTxTimestamp()
		var txTime time.Time
		if tsErr == nil {
			txTime = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
		} else {
			txTime = time.Now()
		}

		// Fetch exporter MSP for initiator field
		initiatorMSP, _ := ctx.GetClientIdentity().GetMSPID()
		initiatorID, idErr := ctx.GetClientIdentity().GetID()
		if idErr != nil {
			initiatorID = initiatorMSP
		}

		payment := PaymentSettlement{
			PaymentID:          paymentID,
			ContractID:         lc.ContractID,
			ExporterID:         lc.ExporterID,
			LCID:               lcID,
			Amount:             paymentAmount,
			Currency:           currency,
			ReceivingBank:      lc.AdvisingBank,
			PayingBank:         payingBank,
			BeneficiaryName:    lc.Beneficiary,
			PaymentMethod:      "LC",
			Status:             "VERIFIED", // Documents already verified (LC was UTILIZED)
			PaymentDate:        paymentDate,
			Documents:          lc.Documents,
			InitiatedBy:        initiatorID,
			DocumentsHeldBy:    "EXPORTER_BANK",
			RiskProfile:        "LOW",
			BankGuarantee:      true,
			UCP600Compliance:   true,
			CreatedAt:          txTime,
			UpdatedAt:          txTime,
		}

		paymentJSON, marshalErr := json.Marshal(payment)
		if marshalErr == nil {
			if putErr := ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON); putErr != nil {
				log.Printf("WARNING: ReleaseLCPayment failed to create Payment entity: %v", putErr)
			} else {
				fmt.Printf("ReleaseLCPayment: Created Payment entity %s linked to LC %s\n", paymentID, lcID)
			}
		}
	}

	// Emit payment event
	eventPayload := map[string]interface{}{
		"lcID":        lcID,
		"paymentID":   paymentID,
		"amount":      paymentAmount,
		"currency":    currency,
		"paymentDate": paymentDate,
		"payingBank":  payingBank,
		"status":      "PAID",
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("LCPaymentReleased", eventJSON)

	fmt.Printf("ReleaseLCPayment: Payment released for LC %s: %s %.2f\n", lcID, currency, paymentAmount)
	return nil
}


// LinkShipmentToLC - Update LC status when exporter creates shipment
// This moves LC from FOREX_ALLOCATED to SHIPPED status
func (c *CoffeeContract) LinkShipmentToLC(ctx contractapi.TransactionContextInterface,
	lcID, shipmentID string) error {
	
	// Read LC
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

	// Only update if LC has forex allocated
	if lc.Status != "FOREX_ALLOCATED" && lc.Status != "ISSUED" {
		return fmt.Errorf("LC status must be FOREX_ALLOCATED or ISSUED to link shipment, current: %s", lc.Status)
	}

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Keep LC status as ISSUED - do NOT change to SHIPPED (SHIPPED is not a valid LC status)
	// LC status should remain ISSUED until documents are submitted (then UTILIZED)
	// lc.Status = "SHIPPED" // ❌ REMOVED - Invalid LC status
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("failed to save LC: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":  "LCShipmentCreated",
		"lcID":       lcID,
		"shipmentID": shipmentID,
		"timestamp":  txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("LCShipmentCreated", eventJSON)

	fmt.Printf("LinkShipmentToLC: LC %s linked to shipment %s, status remains %s\n", lcID, shipmentID, lc.Status)
	return nil
}

// SubmitLCDocuments - Update LC status when exporter submits shipping documents
// This moves LC from SHIPPED to DOCUMENTS_SUBMITTED status
func (c *CoffeeContract) SubmitLCDocuments(ctx contractapi.TransactionContextInterface,
	lcID string, documentIDs []string) error {
	
	// Read LC
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

	// Only update if LC is ISSUED (documents can be submitted after shipment is linked)
	if lc.Status != "ISSUED" && lc.Status != "FOREX_ALLOCATED" {
		return fmt.Errorf("LC status must be ISSUED to submit documents, current: %s", lc.Status)
	}

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Update LC status and attach documents
	// Keep status as ISSUED - documents submitted but not yet verified
	// lc.Status remains "ISSUED"
	lc.Documents = documentIDs
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("failed to save LC: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":     "LCDocumentsSubmitted",
		"lcID":          lcID,
		"documentCount": len(documentIDs),
		"timestamp":     txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("LCDocumentsSubmitted", eventJSON)

	fmt.Printf("SubmitLCDocuments: LC %s documents submitted, status updated to DOCUMENTS_SUBMITTED\n", lcID)
	return nil
}


// QueryLCsByContract - Get all LCs for a specific contract
func (c *CoffeeContract) QueryLCsByContract(ctx contractapi.TransactionContextInterface,
	contractID string) ([]*LetterOfCredit, error) {

	queryString := fmt.Sprintf(`{"selector":{"contractId":"%s"}}`, contractID)
	
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
		
		// Ensure arrays are never nil
		if lc.Amendments == nil {
			lc.Amendments = []LCAmendment{}
		}
		if lc.Discrepancies == nil {
			lc.Discrepancies = []LCDiscrepancy{}
		}
		if lc.Documents == nil {
			lc.Documents = []string{}
		}
		
		lcs = append(lcs, &lc)
	}

	return lcs, nil
}

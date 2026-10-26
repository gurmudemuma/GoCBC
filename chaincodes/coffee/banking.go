package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== LETTER OF CREDIT STRUCTURE ====================

type LetterOfCredit struct {
	LCID            string    `json:"lcId"`
	ContractID      string    `json:"contractId"`
	ExporterID      string    `json:"exporterId"`
	IssuingBank     string    `json:"issuingBank"`  // Buyer's bank (opens LC)
	AdvisingBank    string    `json:"advisingBank"` // Exporter's bank (receives LC)
	Beneficiary     string    `json:"beneficiary"`  // Exporter company name
	Amount          float64   `json:"amount"`
	Currency        string    `json:"currency"`
	Status          string    `json:"status"` // REQUESTED, APPROVED, ISSUED, UTILIZED, REJECTED, EXPIRED
	ExpiryDate      string    `json:"expiryDate"`
	RequestDate     time.Time `json:"requestDate"`
	ApprovalDate    string    `json:"approvalDate"`
	IssueDate       string    `json:"issueDate"`
	UtilizationDate string    `json:"utilizationDate"`
	Documents       []string  `json:"documents"` // Required documents
	Terms           string    `json:"terms"`
	// LC Amendments (real-world LCs frequently amended)
	Amendments     []LCAmendment `json:"amendments"`     // Amendment history
	AmendmentCount int           `json:"amendmentCount"` // Total amendments
	// Document Discrepancies (common in LC negotiations)
	Discrepancies       []LCDiscrepancy `json:"discrepancies"`       // Document issues
	DiscrepancyResolved bool            `json:"discrepancyResolved"` // All resolved?
	// Negotiation Status
	NegotiationStatus string `json:"negotiationStatus"` // NOT_STARTED, UNDER_NEGOTIATION, ACCEPTED, REJECTED
	NegotiationDate   string `json:"negotiationDate"`   // Date negotiation started
	NegotiatingBank   string `json:"negotiatingBank"`   // Bank negotiating documents
	// ✅ MSP Identity Fields
	ApprovedBy              string    `json:"approvedBy"`       // X.509 certificate of approver
	ApprovedByMSP           string    `json:"approvedByMsp"`    // MSP ID of approver
	IssuedBy                string    `json:"issuedBy"`         // X.509 certificate of issuer
	IssuedByMSP             string    `json:"issuedByMsp"`      // MSP ID of issuer
	LastUpdatedBy           string    `json:"lastUpdatedBy"`    // X.509 certificate of last updater
	LastUpdatedByMSP        string    `json:"lastUpdatedByMsp"` // MSP ID of last updater
	RejectionReason         string    `json:"rejectionReason,omitempty"`
	RejectedBy              string    `json:"rejectedBy,omitempty"`
	RejectedByMSP           string    `json:"rejectedByMsp,omitempty"`
	RejectionDate           string    `json:"rejectionDate,omitempty"`
	DocumentRejectionReason string    `json:"documentRejectionReason,omitempty"`
	DocumentRejectedBy      string    `json:"documentRejectedBy,omitempty"`
	DocumentRejectedByMSP   string    `json:"documentRejectedByMsp,omitempty"`
	DocumentRejectionDate   string    `json:"documentRejectionDate,omitempty"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

// LC Amendment structure
type LCAmendment struct {
	AmendmentNo   int       `json:"amendmentNo"`
	AmendmentDate time.Time `json:"amendmentDate"`
	Changes       string    `json:"changes"`     // Description of changes
	Status        string    `json:"status"`      // PENDING, ACCEPTED, REJECTED
	RequestedBy   string    `json:"requestedBy"` // Buyer or Seller
	ApprovedBy    string    `json:"approvedBy"`  // Bank officer
}

// LC Discrepancy structure
type LCDiscrepancy struct {
	DiscrepancyID     string    `json:"discrepancyId"`
	DiscrepancyType   string    `json:"discrepancyType,omitempty"`
	Severity          string    `json:"severity,omitempty"`
	Document          string    `json:"document"` // Which document has issue
	Issue             string    `json:"issue"`    // Description of problem
	AffectedClauses   string    `json:"affectedClauses,omitempty"`
	RecommendedAction string    `json:"recommendedAction,omitempty"`
	ReportedDate      time.Time `json:"reportedDate"`
	ReportedBy        string    `json:"reportedBy,omitempty"`
	ReportedByMSP     string    `json:"reportedByMsp,omitempty"`
	ResolvedDate      string    `json:"resolvedDate"` // ISO date when resolved
	Resolution        string    `json:"resolution"`   // How it was resolved
	ResolvedBy        string    `json:"resolvedBy,omitempty"`
	ResolvedByMSP     string    `json:"resolvedByMsp,omitempty"`
	Status            string    `json:"status"` // OPEN, RESOLVED, WAIVED, REJECTED
}

func isBankMSP(mspID string) bool {
	switch mspID {
	case "BanksMSP", "BankMSP", "CommercialBankOfEthiopiaMSP", "AwashBankMSP", "DashenBankMSP":
		return true
	default:
		return false
	}
}

// ==================== LC FUNCTIONS ====================

// RequestLC - Exporter requests Letter of Credit from bank
// AUTO-MAPS: Contract details, issuing bank (buyer's bank), advising bank (exporter's bank)
func (c *CoffeeContract) RequestLC(ctx contractapi.TransactionContextInterface,
	lcID, contractID, exporterID, bankName, amountStr, currency, expiryDate string) error {

	fmt.Printf("=== RequestLC called: lcID=%s, contractID=%s ===\n", lcID, contractID)
	requesterMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RequestLC: failed to get requester MSP ID: %w", err)
	}
	if requesterMSP != "ECTAMSP" {
		return fmt.Errorf("RequestLC: unauthorized - exporter LC requests must be submitted through ECTA, got: %s", requesterMSP)
	}

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

	// ✅ CRITICAL VALIDATION: Contract must be APPROVED before LC can be requested
	if contract.ContractStatus != "APPROVED" {
		fmt.Printf("RequestLC ERROR: contract %s status is %s, must be APPROVED\n", contractID, contract.ContractStatus)
		return fmt.Errorf("RequestLC: contract %s must be APPROVED before LC request (current status: %s)", contractID, contract.ContractStatus)
	}
	fmt.Printf("RequestLC: Contract verified (status: APPROVED) and data loaded\n")

	// AUTO-MAP: Exporter ID from contract
	mappedExporterID := strings.TrimSpace(exporterID)
	if mappedExporterID == "" || mappedExporterID == "AUTO" {
		mappedExporterID = contract.ExporterID
		fmt.Printf("RequestLC: Auto-mapped exporterID from contract: %s\n", mappedExporterID)
	} else if mappedExporterID != contract.ExporterID {
		return fmt.Errorf("RequestLC: exporter %s does not own contract %s", mappedExporterID, contractID)
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

	if mappedCurrency != contract.Currency {
		return fmt.Errorf("RequestLC: LC currency %s must match contract currency %s", mappedCurrency, contract.Currency)
	}
	if mappedAmount > contract.TotalValue {
		return fmt.Errorf("RequestLC: LC amount %.2f exceeds contract value %.2f", mappedAmount, contract.TotalValue)
	}

	// Verify exporter exists and holds an active export license.
	fmt.Printf("RequestLC: Verifying exporter %s exists...\n", mappedExporterID)
	exporter, err := c.ReadExporter(ctx, mappedExporterID)
	if err != nil {
		fmt.Printf("RequestLC ERROR: failed to check exporter existence: %v\n", err)
		return fmt.Errorf("failed to check exporter existence: %v", err)
	}
	if exporter.LicenseStatus != "ACTIVE" {
		return fmt.Errorf("RequestLC: exporter license is %s, cannot request an LC", exporter.LicenseStatus)
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
		ComplianceNote: "LC requested. Requires bank approval, then bank allocates forex under the active NBE ledger policy.",
	}

	err = c.CreateAuditLog(ctx, "CREATE", "LC", lcID, "", "REQUESTED", changes,
		"Letter of Credit requested by exporter", compliance)
	if err != nil {
		return fmt.Errorf("RequestLC: failed to create audit log: %w", err)
	}

	fmt.Printf("=== RequestLC completed: Issuing Bank (%s) ≠ Advising Bank (%s) ===\n", issuingBank, advisingBank)
	return nil
}

// ApproveLC - Bank approves the Letter of Credit and auto-triggers forex allocation
// AUTO-MAPS: Beneficiary name from exporter, validates bank separation
func (c *CoffeeContract) ApproveLC(ctx contractapi.TransactionContextInterface,
	lcID, issuingBank, beneficiaryBank, beneficiary string) error {

	fmt.Printf("=== ApproveLC called: lcID=%s ===\n", lcID)

	approverMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ApproveLC: failed to get approver MSP ID: %w", err)
	}
	if !isBankMSP(approverMSP) {
		return fmt.Errorf("ApproveLC: unauthorized - only bank members can approve LCs, got: %s", approverMSP)
	}
	// ✅ CAPTURE MSP IDENTITY of approver
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Update LC
	lc.Status = "APPROVED"
	lc.Beneficiary = mappedBeneficiary
	lc.ApprovalDate = txTime.Format(time.RFC3339)
	lc.ApprovedBy = approverID     // ✅ Record WHO approved (X.509 cert)
	lc.ApprovedByMSP = approverMSP // ✅ Record approver's MSP
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
		ComplianceNote: "LC approved by bank. Bank must manually allocate forex in the Forex Allocations tab under the active NBE ledger policy.",
	}

	err = c.CreateAuditLog(ctx, "APPROVE", "LC", lcID, "REQUESTED", "APPROVED", changes,
		"Letter of Credit approved by bank. Forex allocation pending in Forex Allocations tab.", compliance)
	if err != nil {
		return fmt.Errorf("ApproveLC: failed to create audit log: %w", err)
	}

	fmt.Printf("=== ApproveLC completed ===\n")
	return nil
}

// RejectLC rejects a pending letter of credit request. The signer must belong
// to the banking consortium MSP; the API-provided organization name is never
// used as proof of authority.
func (c *CoffeeContract) RejectLC(ctx contractapi.TransactionContextInterface,
	lcID, rejectionReason string) error {
	if err := ValidateID(lcID, "lcID"); err != nil {
		return fmt.Errorf("RejectLC: %w", err)
	}
	reason := strings.TrimSpace(rejectionReason)
	if len(reason) < 10 || len(reason) > MaxStringLen {
		return fmt.Errorf("RejectLC: rejection reason must be between 10 and %d characters", MaxStringLen)
	}

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RejectLC: failed to get MSP ID: %w", err)
	}
	if mspID != "BanksMSP" {
		return fmt.Errorf("RejectLC: unauthorized - only bank members can reject LC requests, got: %s", mspID)
	}
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RejectLC: failed to get client identity: %w", err)
	}

	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("RejectLC: failed to read LC: %w", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("RejectLC: LC %s does not exist", lcID)
	}
	var lc LetterOfCredit
	if err := json.Unmarshal(lcJSON, &lc); err != nil {
		return fmt.Errorf("RejectLC: failed to unmarshal LC: %w", err)
	}
	if lc.Status != "REQUESTED" {
		return fmt.Errorf("RejectLC: only REQUESTED LCs can be rejected, current status: %s", lc.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("RejectLC: failed to get transaction timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
	formattedTime := txTime.Format(time.RFC3339)
	lc.Status = "REJECTED"
	lc.RejectionReason = reason
	lc.RejectedBy = clientID
	lc.RejectedByMSP = mspID
	lc.RejectionDate = formattedTime
	lc.LastUpdatedBy = clientID
	lc.LastUpdatedByMSP = mspID
	lc.UpdatedAt = txTime

	updatedLC, err := json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("RejectLC: failed to marshal LC: %w", err)
	}
	if err := ctx.GetStub().PutState("LC_"+lcID, updatedLC); err != nil {
		return fmt.Errorf("RejectLC: failed to save LC: %w", err)
	}

	changes := []FieldChange{
		{FieldName: "status", OldValue: "REQUESTED", NewValue: "REJECTED", DataType: "string"},
		{FieldName: "rejectionReason", OldValue: "", NewValue: reason, DataType: "string"},
		{FieldName: "rejectedByMsp", OldValue: "", NewValue: mspID, DataType: "string"},
		{FieldName: "rejectionDate", OldValue: "", NewValue: formattedTime, DataType: "date"},
	}
	compliance := ComplianceMetadata{
		UCP600Check:    true,
		ComplianceNote: "LC request rejected by an authenticated bank consortium member.",
	}
	if err := c.CreateAuditLog(ctx, "REJECT", "LC", lcID, "REQUESTED", "REJECTED", changes, reason, compliance); err != nil {
		return fmt.Errorf("RejectLC: failed to create audit log: %w", err)
	}
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
	if !isBankMSP(issuerMSP) {
		return fmt.Errorf("IssueLC: unauthorized - only bank members can issue LCs, got: %s", issuerMSP)
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	lc.Status = "ISSUED"
	lc.Terms = terms
	lc.IssueDate = txTime.Format(time.RFC3339)
	lc.IssuedBy = issuerID     // ✅ Record WHO issued (X.509 cert)
	lc.IssuedByMSP = issuerMSP // ✅ Record issuer's MSP
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
		return fmt.Errorf("IssueLC: failed to create audit log: %w", err)
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
	if updaterMSP != "BanksMSP" && updaterMSP != "NBEMSP" {
		return fmt.Errorf("UpdateLCStatus: unauthorized - only bank or NBE members can update LC status, got: %s", updaterMSP)
	}

	updaterID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		updaterID = updaterMSP // Fallback to MSP if cert not available
	}

	newStatus = strings.ToUpper(strings.TrimSpace(newStatus))

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
	previousStatus := lc.Status
	allowedTransitions := map[string]map[string]bool{
		"REQUESTED":        {"APPROVED": true, "REJECTED": true},
		"APPROVED":         {"ISSUED": true, "EXPIRED": true},
		"ISSUED":           {"FOREX_ALLOCATED": true, "UTILIZED": true, "EXPIRED": true},
		"FOREX_ALLOCATED":  {"UTILIZED": true, "EXPIRED": true},
		"AMENDED":          {"ISSUED": true, "FOREX_ALLOCATED": true, "UTILIZED": true, "EXPIRED": true},
		"UTILIZED":         {"PAYMENT_RELEASED": true},
		"PAYMENT_RELEASED": {"SETTLED": true},
	}
	if !allowedTransitions[previousStatus][newStatus] {
		return fmt.Errorf("UpdateLCStatus: invalid transition from %s to %s", previousStatus, newStatus)
	}

	lc.Status = newStatus
	if newStatus == "UTILIZED" {
		// Get transaction timestamp
		txTimestamp, err := ctx.GetStub().GetTxTimestamp()
		if err != nil {
			return fmt.Errorf("failed to get tx timestamp: %v", err)
		}
		txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
		lc.UtilizationDate = txTime.Format(time.RFC3339)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
	lc.LastUpdatedBy = updaterID     // ✅ Record WHO updated (X.509 cert)
	lc.LastUpdatedByMSP = updaterMSP // ✅ Record updater's MSP
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("failed to save LC: %v", err)
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: previousStatus, NewValue: newStatus, DataType: "string"},
		{FieldName: "lastUpdatedBy", OldValue: "", NewValue: updaterID, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true, // NBE monitors LC lifecycle
		UCP600Check:    true, // UCP 600 rules apply
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("LC status updated by %s from %s to %s", updaterMSP, previousStatus, newStatus),
	}

	auditErr := c.CreateAuditLog(ctx, "UPDATE", "LC", lcID, previousStatus, newStatus, changes,
		fmt.Sprintf("LC status updated to %s by %s", newStatus, updaterMSP), compliance)
	if auditErr != nil {
		return fmt.Errorf("UpdateLCStatus: failed to create audit log: %w", auditErr)
	}

	return nil
}

// AmendLC - Amend Letter of Credit (amount, expiry date, terms)
// Common amendments per UCP 600 Article 10
func (c *CoffeeContract) AmendLC(ctx contractapi.TransactionContextInterface,
	lcID, amendmentReason, newAmountStr, newExpiryDate, newTerms, amendedBy string) error {
	amenderMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("AmendLC: failed to get amender MSP ID: %w", err)
	}
	if !isBankMSP(amenderMSP) {
		return fmt.Errorf("AmendLC: unauthorized - only bank members can request LC amendments, got: %s", amenderMSP)
	}
	amenderID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("AmendLC: failed to get amender identity: %w", err)
	}
	amendmentReason = strings.TrimSpace(amendmentReason)
	if amendmentReason == "" || len(amendmentReason) > MaxStringLen {
		return fmt.Errorf("AmendLC: amendment reason is required and cannot exceed %d characters", MaxStringLen)
	}
	amendedBy = amenderID

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "amendmentCount", OldValue: fmt.Sprintf("%d", lc.AmendmentCount-1), NewValue: fmt.Sprintf("%d", lc.AmendmentCount), DataType: "number"},
		{FieldName: "changes", OldValue: "", NewValue: changesDescription, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true,
		UCP600Check:    true, // UCP 600 Article 10 governs amendments
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("LC amendment #%d: %s", lc.AmendmentCount, amendmentReason),
	}

	auditErr := c.CreateAuditLog(ctx, "AMEND", "LC", lcID, "ISSUED", "ISSUED", changes,
		fmt.Sprintf("LC amended by %s: %s", amendedBy, amendmentReason), compliance)
	if auditErr != nil {
		return fmt.Errorf("AmendLC: failed to create audit log: %w", auditErr)
	}

	return nil
}

// QueryLCsByExporter - Get all LCs for an exporter
func (c *CoffeeContract) QueryLCsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*LetterOfCredit, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryLCs(ctx, queryString)
}

// QueryAllLCs - Get all Letters of Credit (optimized with CouchDB selector)
func (c *CoffeeContract) QueryAllLCs(ctx contractapi.TransactionContextInterface) ([]*LetterOfCredit, error) {
	// Use CouchDB rich query to filter only actual LC documents (not audit logs)
	// This is much faster than GetStateByRange which iterates through all keys
	queryString := `{
		"selector": {
			"$and": [
				{"lcId": {"$exists": true}},
				{"_id": {"$regex": "^LC_LC"}}
			]
		},
		"limit": 1000
	}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		// Fallback to GetStateByRange if rich query fails
		return c.queryLCsByRange(ctx)
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
			continue // Skip invalid documents
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

// queryLCsByRange - Fallback method using GetStateByRange
func (c *CoffeeContract) queryLCsByRange(ctx contractapi.TransactionContextInterface) ([]*LetterOfCredit, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("LC_LC", "LC_LC~")
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
			continue
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
		return fmt.Errorf("DeleteLC: failed to create audit log: %w", err)
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
	ledgerNow, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("ExamineLCDocuments: failed to read Fabric transaction timestamp: %w", err)
	}

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

	lc.UpdatedAt = ledgerNow

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
	ledgerNow, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("ReleaseLCPayment: failed to read Fabric transaction timestamp: %w", err)
	}

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
	lc.UpdatedAt = ledgerNow

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
	existingPayment, err := ctx.GetStub().GetState("PAYMENT_" + paymentID)
	if err != nil {
		return fmt.Errorf("ReleaseLCPayment: failed to check existing payment %s: %w", paymentID, err)
	}
	if existingPayment != nil {
		return fmt.Errorf("ReleaseLCPayment: payment %s already exists", paymentID)
	}

	// Fetch exporter MSP for initiator field.
	initiatorMSP, _ := ctx.GetClientIdentity().GetMSPID()
	initiatorID, idErr := ctx.GetClientIdentity().GetID()
	if idErr != nil {
		initiatorID = initiatorMSP
	}

	payment := PaymentSettlement{
		PaymentID:        paymentID,
		ContractID:       lc.ContractID,
		ExporterID:       lc.ExporterID,
		LCID:             lcID,
		Amount:           paymentAmount,
		Currency:         currency,
		ReceivingBank:    lc.AdvisingBank,
		PayingBank:       payingBank,
		BeneficiaryName:  lc.Beneficiary,
		PaymentMethod:    "LC",
		Status:           "VERIFIED", // Documents already verified (LC was UTILIZED)
		PaymentDate:      paymentDate,
		Documents:        lc.Documents,
		InitiatedBy:      initiatorID,
		DocumentsHeldBy:  "EXPORTER_BANK",
		RiskProfile:      "LOW",
		BankGuarantee:    true,
		UCP600Compliance: true,
		CreatedAt:        ledgerNow,
		UpdatedAt:        ledgerNow,
	}

	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("ReleaseLCPayment: failed to marshal payment: %w", err)
	}
	if err := ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON); err != nil {
		return fmt.Errorf("ReleaseLCPayment: failed to create payment %s: %w", paymentID, err)
	}

	changes := []FieldChange{
		{FieldName: "status", OldValue: "UTILIZED", NewValue: "PAYMENT_RELEASED", DataType: "string"},
		{FieldName: "paymentId", OldValue: "", NewValue: paymentID, DataType: "string"},
		{FieldName: "amount", OldValue: "", NewValue: amount, DataType: "number"},
		{FieldName: "currency", OldValue: "", NewValue: currency, DataType: "string"},
		{FieldName: "payingBank", OldValue: "", NewValue: payingBank, DataType: "string"},
	}
	if err := c.CreateAuditLog(ctx, "RELEASE_PAYMENT", "LC", lcID, "UTILIZED", "PAYMENT_RELEASED", changes,
		fmt.Sprintf("Payment %s released by %s", paymentID, payingBank), ComplianceMetadata{UCP600Check: true}); err != nil {
		return fmt.Errorf("ReleaseLCPayment: failed to create audit log: %w", err)
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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

// ==================== LC DISCREPANCY HANDLING FUNCTIONS ====================
// UCP 600 Article 14: Bank has 5 banking days to examine documents
// Discrepancies are common: incorrect dates, missing signatures, description mismatches, etc.

// ReportLCDiscrepancy - Bank reports document discrepancy
// TRIGGER: During document examination, bank finds issues
func (c *CoffeeContract) ReportLCDiscrepancy(ctx contractapi.TransactionContextInterface,
	lcID, discrepancyID, discrepancyType, severity, document, issue, affectedClauses, recommendedAction string) error {

	fmt.Printf("=== ReportLCDiscrepancy called: lcID=%s, discrepancyID=%s ===\n", lcID, discrepancyID)

	// Get existing LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to read LC: %w", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("ReportLCDiscrepancy: LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to unmarshal LC: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to get MSP ID: %w", err)
	}

	// RBAC: Only banks can report discrepancies
	if !isBankMSP(mspID) {
		return fmt.Errorf("ReportLCDiscrepancy: unauthorized - only banks can report discrepancies (caller MSP: %s)", mspID)
	}
	if err := ValidateID(discrepancyID, "discrepancyID"); err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: %w", err)
	}
	if lc.Status != "ISSUED" && lc.Status != "FOREX_ALLOCATED" && lc.Status != "UTILIZED" && lc.Status != "AMENDED" {
		return fmt.Errorf("ReportLCDiscrepancy: documents can only be examined for active issued LCs, current status: %s", lc.Status)
	}
	discrepancyType = strings.TrimSpace(discrepancyType)
	severity = strings.ToUpper(strings.TrimSpace(severity))
	document = strings.TrimSpace(document)
	issue = strings.TrimSpace(issue)
	if discrepancyType == "" || document == "" || len(issue) < 10 || len(issue) > MaxStringLen {
		return fmt.Errorf("ReportLCDiscrepancy: type and document are required and issue must be between 10 and %d characters", MaxStringLen)
	}
	if severity != "MINOR" && severity != "MAJOR" && severity != "CRITICAL" {
		return fmt.Errorf("ReportLCDiscrepancy: severity must be MINOR, MAJOR, or CRITICAL")
	}
	for _, current := range lc.Discrepancies {
		if current.DiscrepancyID == discrepancyID {
			return fmt.Errorf("ReportLCDiscrepancy: discrepancy %s already exists", discrepancyID)
		}
	}
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to get transaction timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Create new discrepancy
	discrepancy := LCDiscrepancy{
		DiscrepancyID:     discrepancyID,
		DiscrepancyType:   discrepancyType,
		Severity:          severity,
		Document:          document,
		Issue:             issue,
		AffectedClauses:   strings.TrimSpace(affectedClauses),
		RecommendedAction: strings.TrimSpace(recommendedAction),
		ReportedDate:      txTime,
		ReportedBy:        clientID,
		ReportedByMSP:     mspID,
		Status:            "OPEN",
	}

	// Add to LC discrepancies
	lc.Discrepancies = append(lc.Discrepancies, discrepancy)
	lc.DiscrepancyResolved = false

	// Update LC status to indicate issues
	if lc.NegotiationStatus != "UNDER_NEGOTIATION" {
		lc.NegotiationStatus = "UNDER_NEGOTIATION"
		lc.NegotiationDate = txTime.Format(time.RFC3339)
		lc.NegotiatingBank = mspID
	}

	lc.LastUpdatedBy = clientID
	lc.LastUpdatedByMSP = mspID
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to update state: %w", err)
	}

	log.Printf("⚠ LC Discrepancy reported: %s - Document: %s - Issue: %s\n", lcID, document, issue)
	changes := []FieldChange{
		{FieldName: "discrepancyId", OldValue: "", NewValue: discrepancyID, DataType: "string"},
		{FieldName: "discrepancyType", OldValue: "", NewValue: discrepancyType, DataType: "string"},
		{FieldName: "severity", OldValue: "", NewValue: severity, DataType: "string"},
		{FieldName: "document", OldValue: "", NewValue: document, DataType: "string"},
		{FieldName: "issue", OldValue: "", NewValue: issue, DataType: "string"},
	}
	compliance := ComplianceMetadata{UCP600Check: true, ComplianceNote: "Bank reported an LC document discrepancy."}
	if err := c.CreateAuditLog(ctx, "REPORT_DISCREPANCY", "LC_DISCREPANCY", lcID+"::"+discrepancyID, "", "OPEN", changes, issue, compliance); err != nil {
		return fmt.Errorf("ReportLCDiscrepancy: failed to create audit log: %w", err)
	}

	return nil
}

// ResolveLCDiscrepancy - Exporter/Bank resolves discrepancy
// METHODS: Document correction, waiver request, LC amendment
func (c *CoffeeContract) ResolveLCDiscrepancy(ctx contractapi.TransactionContextInterface,
	lcID, discrepancyID, resolution string) error {

	fmt.Printf("=== ResolveLCDiscrepancy called: lcID=%s, discrepancyID=%s ===\n", lcID, discrepancyID)

	// Get existing LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to read LC: %w", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("ResolveLCDiscrepancy: LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to unmarshal LC: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to get MSP ID: %w", err)
	}
	if !isBankMSP(mspID) {
		return fmt.Errorf("ResolveLCDiscrepancy: unauthorized - only banks can resolve discrepancies (caller MSP: %s)", mspID)
	}
	resolution = strings.TrimSpace(resolution)
	if resolution == "" || len(resolution) > MaxStringLen {
		return fmt.Errorf("ResolveLCDiscrepancy: resolution is required and cannot exceed %d characters", MaxStringLen)
	}
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to get transaction timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Find and update discrepancy
	discrepancyFound := false
	for i, disc := range lc.Discrepancies {
		if disc.DiscrepancyID == discrepancyID {
			if disc.Status != "OPEN" {
				return fmt.Errorf("ResolveLCDiscrepancy: discrepancy %s is not open", discrepancyID)
			}
			lc.Discrepancies[i].Status = "RESOLVED"
			lc.Discrepancies[i].Resolution = resolution
			lc.Discrepancies[i].ResolvedDate = txTime.Format(time.RFC3339)
			lc.Discrepancies[i].ResolvedBy = clientID
			lc.Discrepancies[i].ResolvedByMSP = mspID
			discrepancyFound = true
			break
		}
	}

	if !discrepancyFound {
		return fmt.Errorf("ResolveLCDiscrepancy: discrepancy %s not found in LC %s", discrepancyID, lcID)
	}

	// Check if all discrepancies are resolved
	allResolved := true
	for _, disc := range lc.Discrepancies {
		if disc.Status == "OPEN" {
			allResolved = false
			break
		}
	}

	if allResolved {
		lc.DiscrepancyResolved = true
		lc.NegotiationStatus = "ACCEPTED"
		log.Printf("✅ All LC discrepancies resolved: %s\n", lcID)
	}

	lc.LastUpdatedBy = clientID
	lc.LastUpdatedByMSP = mspID
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to update state: %w", err)
	}

	fmt.Printf("✅ LC Discrepancy resolved: %s - %s\n", discrepancyID, resolution)
	changes := []FieldChange{
		{FieldName: "discrepancyStatus", OldValue: "OPEN", NewValue: "RESOLVED", DataType: "string"},
		{FieldName: "resolution", OldValue: "", NewValue: resolution, DataType: "string"},
	}
	if err := c.CreateAuditLog(ctx, "RESOLVE_DISCREPANCY", "LC_DISCREPANCY", lcID+"::"+discrepancyID, "OPEN", "RESOLVED", changes, resolution, ComplianceMetadata{UCP600Check: true, ComplianceNote: "Bank resolved an LC document discrepancy."}); err != nil {
		return fmt.Errorf("ResolveLCDiscrepancy: failed to create audit log: %w", err)
	}

	return nil
}

// WaiveLCDiscrepancy - Bank waives discrepancy (accepts documents despite issue)
// DECISION: Buyer/Bank decides to proceed despite minor discrepancy
func (c *CoffeeContract) WaiveLCDiscrepancy(ctx contractapi.TransactionContextInterface,
	lcID, discrepancyID, waiverReason string) error {

	fmt.Printf("=== WaiveLCDiscrepancy called: lcID=%s, discrepancyID=%s ===\n", lcID, discrepancyID)

	// Get existing LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to read LC: %w", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("WaiveLCDiscrepancy: LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to unmarshal LC: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to get MSP ID: %w", err)
	}
	if !isBankMSP(mspID) {
		return fmt.Errorf("WaiveLCDiscrepancy: unauthorized - only banks can waive discrepancies")
	}
	waiverReason = strings.TrimSpace(waiverReason)
	if waiverReason == "" || len(waiverReason) > MaxStringLen {
		return fmt.Errorf("WaiveLCDiscrepancy: waiver reason is required and cannot exceed %d characters", MaxStringLen)
	}
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to get transaction timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Find and waive discrepancy
	discrepancyFound := false
	for i, disc := range lc.Discrepancies {
		if disc.DiscrepancyID == discrepancyID {
			if disc.Status != "OPEN" {
				return fmt.Errorf("WaiveLCDiscrepancy: discrepancy %s is not open", discrepancyID)
			}
			lc.Discrepancies[i].Status = "WAIVED"
			lc.Discrepancies[i].Resolution = "WAIVED: " + waiverReason
			lc.Discrepancies[i].ResolvedDate = txTime.Format(time.RFC3339)
			lc.Discrepancies[i].ResolvedBy = clientID
			lc.Discrepancies[i].ResolvedByMSP = mspID
			discrepancyFound = true
			break
		}
	}

	if !discrepancyFound {
		return fmt.Errorf("WaiveLCDiscrepancy: discrepancy %s not found in LC %s", discrepancyID, lcID)
	}

	// Check if all discrepancies are resolved or waived
	allResolved := true
	for _, disc := range lc.Discrepancies {
		if disc.Status == "OPEN" {
			allResolved = false
			break
		}
	}

	if allResolved {
		lc.DiscrepancyResolved = true
		lc.NegotiationStatus = "ACCEPTED"
		log.Printf("✅ All LC discrepancies resolved/waived: %s\n", lcID)
	}

	lc.LastUpdatedBy = clientID
	lc.LastUpdatedByMSP = mspID
	lc.UpdatedAt = txTime

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to update state: %w", err)
	}

	fmt.Printf("✅ LC Discrepancy waived: %s - Reason: %s\n", discrepancyID, waiverReason)
	changes := []FieldChange{
		{FieldName: "discrepancyStatus", OldValue: "OPEN", NewValue: "WAIVED", DataType: "string"},
		{FieldName: "waiverReason", OldValue: "", NewValue: waiverReason, DataType: "string"},
	}
	if err := c.CreateAuditLog(ctx, "WAIVE_DISCREPANCY", "LC_DISCREPANCY", lcID+"::"+discrepancyID, "OPEN", "WAIVED", changes, waiverReason, ComplianceMetadata{UCP600Check: true, ComplianceNote: "Bank waived an LC document discrepancy."}); err != nil {
		return fmt.Errorf("WaiveLCDiscrepancy: failed to create audit log: %w", err)
	}

	return nil
}

// RejectLCDocuments - Bank rejects LC documents due to unresolved discrepancies
// FINAL DECISION: Payment will not be released
func (c *CoffeeContract) RejectLCDocuments(ctx contractapi.TransactionContextInterface,
	lcID, rejectionReason string) error {

	fmt.Printf("=== RejectLCDocuments called: lcID=%s ===\n", lcID)

	// Get existing LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to read LC: %w", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("RejectLCDocuments: LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to unmarshal LC: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to get MSP ID: %w", err)
	}

	// RBAC: Only banks can reject documents
	if mspID != "BanksMSP" && mspID != "BankMSP" && mspID != "CommercialBankOfEthiopiaMSP" &&
		mspID != "AwashBankMSP" && mspID != "DashenBankMSP" {
		return fmt.Errorf("RejectLCDocuments: unauthorized - only banks can reject documents")
	}
	rejectionReason = strings.TrimSpace(rejectionReason)
	if len(rejectionReason) < 10 || len(rejectionReason) > MaxStringLen {
		return fmt.Errorf("RejectLCDocuments: rejection reason must be between 10 and %d characters", MaxStringLen)
	}
	if lc.Status != "ISSUED" && lc.Status != "FOREX_ALLOCATED" && lc.Status != "UTILIZED" && lc.Status != "AMENDED" {
		return fmt.Errorf("RejectLCDocuments: documents can only be rejected for active issued LCs, current status: %s", lc.Status)
	}

	// Update LC status
	previousStatus := lc.Status
	previousNegotiationStatus := lc.NegotiationStatus
	lc.NegotiationStatus = "REJECTED"
	lc.Status = "EXPIRED" // LC cannot be used for payment
	lc.DocumentRejectionReason = rejectionReason
	lc.DocumentRejectedBy = clientID
	lc.DocumentRejectedByMSP = mspID
	lc.LastUpdatedBy = clientID
	lc.LastUpdatedByMSP = mspID
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to get transaction timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
	lc.UpdatedAt = txTime

	// Add rejection as system comment
	for i := range lc.Discrepancies {
		if lc.Discrepancies[i].Status == "OPEN" {
			lc.Discrepancies[i].Status = "REJECTED"
			lc.Discrepancies[i].Resolution = "REJECTED: " + rejectionReason
			lc.Discrepancies[i].ResolvedDate = txTime.Format(time.RFC3339)
			lc.Discrepancies[i].ResolvedBy = clientID
			lc.Discrepancies[i].ResolvedByMSP = mspID
		}
	}
	lc.DiscrepancyResolved = true
	lc.DocumentRejectionDate = txTime.Format(time.RFC3339)

	lcJSON, err = json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, lcJSON)
	if err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to update state: %w", err)
	}

	log.Printf("❌ LC Documents rejected: %s - Reason: %s\n", lcID, rejectionReason)
	changes := []FieldChange{
		{FieldName: "status", OldValue: previousStatus, NewValue: "EXPIRED", DataType: "string"},
		{FieldName: "negotiationStatus", OldValue: previousNegotiationStatus, NewValue: "REJECTED", DataType: "string"},
		{FieldName: "documentRejectionReason", OldValue: "", NewValue: rejectionReason, DataType: "string"},
	}
	if err := c.CreateAuditLog(ctx, "REJECT_DOCUMENTS", "LC", lcID, previousStatus, "EXPIRED", changes, rejectionReason, ComplianceMetadata{UCP600Check: true, ComplianceNote: "Documents rejected; LC cannot be used for payment."}); err != nil {
		return fmt.Errorf("RejectLCDocuments: failed to create audit log: %w", err)
	}

	return nil
}

// GetLCDiscrepancies - Query all discrepancies for an LC
func (c *CoffeeContract) GetLCDiscrepancies(ctx contractapi.TransactionContextInterface,
	lcID string) ([]LCDiscrepancy, error) {

	// Get existing LC
	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return nil, fmt.Errorf("GetLCDiscrepancies: failed to read LC: %w", err)
	}
	if lcJSON == nil {
		return nil, fmt.Errorf("GetLCDiscrepancies: LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return nil, fmt.Errorf("GetLCDiscrepancies: failed to unmarshal LC: %w", err)
	}

	if lc.Discrepancies == nil {
		return []LCDiscrepancy{}, nil
	}
	return lc.Discrepancies, nil
}

// QueryLCsWithDiscrepancies - Get all LCs that have unresolved discrepancies
func (c *CoffeeContract) QueryLCsWithDiscrepancies(ctx contractapi.TransactionContextInterface) ([]*LetterOfCredit, error) {

	queryString := `{"selector":{"discrepancyResolved":false,"negotiationStatus":"UNDER_NEGOTIATION"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("QueryLCsWithDiscrepancies: query failed: %w", err)
	}
	defer resultsIterator.Close()

	var lcs []*LetterOfCredit

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var lc LetterOfCredit
		err = json.Unmarshal(queryResponse.Value, &lc)
		if err != nil {
			return nil, err
		}

		lcs = append(lcs, &lc)
	}

	return lcs, nil
}

// UpdateLC - Full LC update function (for forex allocation and complex updates)
// This function allows updating any LC fields including forex allocation data
func (c *CoffeeContract) UpdateLC(ctx contractapi.TransactionContextInterface, lcID string, lcDataJSON string) error {
	log.Printf("=== UpdateLC called for LC: %s ===", lcID)

	// ✅ CAPTURE MSP IDENTITY of updater
	updaterMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("UpdateLC: failed to get updater MSP ID: %w", err)
	}

	updaterID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		updaterID = updaterMSP // Fallback to MSP if cert not available
	}

	// Check if LC exists
	existingLCJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if existingLCJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	// Parse existing LC
	var existingLC LetterOfCredit
	err = json.Unmarshal(existingLCJSON, &existingLC)
	if err != nil {
		return fmt.Errorf("failed to unmarshal existing LC: %v", err)
	}

	// Parse the updated LC data
	var updatedLC LetterOfCredit
	err = json.Unmarshal([]byte(lcDataJSON), &updatedLC)
	if err != nil {
		return fmt.Errorf("failed to unmarshal LC data: %v", err)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Update audit fields
	updatedLC.LastUpdatedBy = updaterID
	updatedLC.LastUpdatedByMSP = updaterMSP
	updatedLC.UpdatedAt = txTime

	// Preserve creation metadata
	updatedLC.RequestDate = existingLC.RequestDate
	updatedLC.CreatedAt = existingLC.CreatedAt

	// Save updated LC
	updatedLCJSON, err := json.Marshal(updatedLC)
	if err != nil {
		return fmt.Errorf("failed to marshal updated LC: %v", err)
	}

	err = ctx.GetStub().PutState("LC_"+lcID, updatedLCJSON)
	if err != nil {
		return fmt.Errorf("failed to save updated LC: %v", err)
	}

	// ✅ CREATE AUDIT LOG
	changes := []FieldChange{
		{FieldName: "status", OldValue: existingLC.Status, NewValue: updatedLC.Status, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true,
		UCP600Check:    true,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("LC updated by %s. Status: %s -> %s", updaterMSP, existingLC.Status, updatedLC.Status),
	}

	auditErr := c.CreateAuditLog(ctx, "UPDATE", "LC", lcID, existingLC.Status, updatedLC.Status, changes,
		fmt.Sprintf("LC updated by %s", updaterMSP), compliance)
	if auditErr != nil {
		return fmt.Errorf("UpdateLC: failed to create audit log: %w", auditErr)
	}

	log.Printf("✅ LC %s updated successfully. Status: %s", lcID, updatedLC.Status)
	return nil
}

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== EXPORT PROCEEDS REPATRIATION STRUCTURE ====================
// NBE Directive: Export proceeds must be repatriated within specific timeframes
// Coffee exports: 40% retention in FCY, 60% mandatory conversion to Birr
// Compliance deadline: 120 days from shipment date

type ExportProceedsRepatriation struct {
	RepatriationID      string    `json:"repatriationId"`
	PaymentID           string    `json:"paymentId"`           // Link to payment settlement
	ContractID          string    `json:"contractId"`          // Link to sales contract
	ShipmentID          string    `json:"shipmentId"`          // Link to shipment
	ExporterID          string    `json:"exporterId"`
	ExportAmount        float64   `json:"exportAmount"`        // Total export value (USD)
	Currency            string    `json:"currency"`            // USD, EUR, etc.
	
	// Repatriation Requirements (NBE FXD/01/2024)
	RequiredRetention   float64   `json:"requiredRetention"`   // 40% must be repatriated
	RequiredConversion  float64   `json:"requiredConversion"`  // 60% must be converted
	RetentionPercentage float64   `json:"retentionPercentage"` // 40.0
	ConversionPercentage float64  `json:"conversionPercentage"` // 60.0
	
	// Actual Repatriation
	RepatriatedAmount   float64   `json:"repatriatedAmount"`   // Amount actually repatriated
	ConvertedAmount     float64   `json:"convertedAmount"`     // Amount converted to Birr
	ConvertedAmountBirr float64   `json:"convertedAmountBirr"` // Birr equivalent
	ExchangeRate        float64   `json:"exchangeRate"`        // NBE official rate used
	
	// FCY Account Details
	FCYAccountNumber    string    `json:"fcyAccountNumber"`    // Foreign currency account
	FCYBank             string    `json:"fcyBank"`             // Bank holding FCY account
	FCYBankBIC          string    `json:"fcyBankBic"`          // Bank BIC code
	
	// Compliance Tracking
	Status              string    `json:"status"`              // PENDING, PARTIAL, COMPLIED, NON_COMPLIANT, OVERDUE
	ComplianceDeadline  time.Time `json:"complianceDeadline"`  // 120 days from shipment
	ShipmentDate        time.Time `json:"shipmentDate"`        // Export date (for deadline calculation)
	RepatriationDate    string    `json:"repatriationDate"`    // Date of repatriation
	ComplianceDate      string    `json:"complianceDate"`      // Date compliance achieved
	DaysRemaining       int       `json:"daysRemaining"`       // Days until deadline
	IsOverdue           bool      `json:"isOverdue"`           // Exceeded deadline?
	
	// NBE Verification
	VerifiedBy          string    `json:"verifiedBy"`          // ✅ X.509 cert of NBE officer
	VerifiedByMSP       string    `json:"verifiedByMsp"`       // ✅ MSP ID of NBE
	VerificationDate    string    `json:"verificationDate"`    // Date NBE verified
	VerificationRef     string    `json:"verificationRef"`     // NBE verification reference
	VerificationNotes   string    `json:"verificationNotes"`   // NBE notes
	
	// Non-Compliance Handling
	PenaltyAmount       float64   `json:"penaltyAmount"`       // Penalty for non-compliance
	PenaltyCurrency     string    `json:"penaltyCurrency"`     // ETB
	WaiverRequested     bool      `json:"waiverRequested"`     // Exporter requested waiver
	WaiverApproved      bool      `json:"waiverApproved"`      // NBE approved waiver
	WaiverReason        string    `json:"waiverReason"`        // Justification for waiver
	WaiverDate          string    `json:"waiverDate"`          // Date waiver granted
	
	// SWIFT Evidence
	SWIFTReferences     []string  `json:"swiftReferences"`     // MT103 references proving repatriation
	BankCertificate     string    `json:"bankCertificate"`     // Bank certificate of repatriation
	
	// Audit Trail
	RecordedBy          string    `json:"recordedBy"`          // ✅ X.509 cert of recorder
	RecordedByMSP       string    `json:"recordedByMsp"`       // ✅ MSP ID of recorder
	LastUpdatedBy       string    `json:"lastUpdatedBy"`       // ✅ X.509 cert of updater
	LastUpdatedByMSP    string    `json:"lastUpdatedByMsp"`    // ✅ MSP ID of updater
	Comments            string    `json:"comments"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// ==================== REPATRIATION FUNCTIONS ====================

// InitiateRepatriation - NBE or Bank initiates repatriation tracking after payment
// AUTO-TRIGGERED: After payment settlement, system creates repatriation record
// DEADLINE: 120 days from shipment date
func (c *CoffeeContract) InitiateRepatriation(ctx contractapi.TransactionContextInterface,
	repatriationID, paymentID, contractID, shipmentID, exporterID, exportAmountStr, 
	currency, fcyAccountNumber, fcyBank, fcyBankBIC, shipmentDateStr string) error {

	fmt.Printf("=== InitiateRepatriation called: repatriationID=%s, paymentID=%s ===\n", repatriationID, paymentID)

	// VALIDATION: IDs
	if err := ValidateID(repatriationID, "repatriationID"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if err := ValidateID(paymentID, "paymentID"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}

	// Parse export amount
	exportAmount, err := strconv.ParseFloat(exportAmountStr, 64)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: invalid exportAmount: %w", err)
	}
	if exportAmount <= 0 {
		return fmt.Errorf("InitiateRepatriation: exportAmount must be positive: %.2f", exportAmount)
	}

	// Parse shipment date
	shipmentDate, err := time.Parse("2006-01-02", shipmentDateStr)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: invalid shipmentDate format (use YYYY-MM-DD): %w", err)
	}

	// Calculate compliance deadline (120 days from shipment)
	complianceDeadline := shipmentDate.AddDate(0, 0, 120)
	daysRemaining := int(time.Until(complianceDeadline).Hours() / 24)

	// Calculate required amounts (NBE: 40% retention, 60% conversion)
	retentionPercentage := 40.0
	conversionPercentage := 60.0
	requiredRetention := exportAmount * (retentionPercentage / 100.0)
	requiredConversion := exportAmount * (conversionPercentage / 100.0)

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to get MSP ID: %w", err)
	}

	// Create repatriation record
	repatriation := &ExportProceedsRepatriation{
		RepatriationID:       repatriationID,
		PaymentID:            paymentID,
		ContractID:           contractID,
		ShipmentID:           shipmentID,
		ExporterID:           exporterID,
		ExportAmount:         exportAmount,
		Currency:             currency,
		RequiredRetention:    requiredRetention,
		RequiredConversion:   requiredConversion,
		RetentionPercentage:  retentionPercentage,
		ConversionPercentage: conversionPercentage,
		RepatriatedAmount:    0.0,
		ConvertedAmount:      0.0,
		ConvertedAmountBirr:  0.0,
		FCYAccountNumber:     fcyAccountNumber,
		FCYBank:              fcyBank,
		FCYBankBIC:           fcyBankBIC,
		Status:               "PENDING",
		ComplianceDeadline:   complianceDeadline,
		ShipmentDate:         shipmentDate,
		DaysRemaining:        daysRemaining,
		IsOverdue:            false,
		SWIFTReferences:      []string{},
		RecordedBy:           clientID,
		RecordedByMSP:        mspID,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	repatriationJSON, err := json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to put state: %w", err)
	}

	fmt.Printf("✅ Repatriation initiated: %s (Deadline: %s, Days Remaining: %d)\n", 
		repatriationID, complianceDeadline.Format("2006-01-02"), daysRemaining)

	return nil
}

// RecordRepatriation - Bank records actual repatriation with SWIFT evidence
// STATUS: PENDING → PARTIAL → COMPLIED
func (c *CoffeeContract) RecordRepatriation(ctx contractapi.TransactionContextInterface,
	repatriationID, repatriatedAmountStr, convertedAmountStr, exchangeRateStr,
	swiftReference, bankCertificate string) error {

	fmt.Printf("=== RecordRepatriation called: repatriationID=%s ===\n", repatriationID)

	// Get existing repatriation
	repatriationJSON, err := ctx.GetStub().GetState(repatriationID)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to read repatriation: %w", err)
	}
	if repatriationJSON == nil {
		return fmt.Errorf("RecordRepatriation: repatriation %s does not exist", repatriationID)
	}

	var repatriation ExportProceedsRepatriation
	err = json.Unmarshal(repatriationJSON, &repatriation)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to unmarshal: %w", err)
	}

	// Parse amounts
	repatriatedAmount, err := strconv.ParseFloat(repatriatedAmountStr, 64)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: invalid repatriatedAmount: %w", err)
	}
	convertedAmount, err := strconv.ParseFloat(convertedAmountStr, 64)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: invalid convertedAmount: %w", err)
	}
	exchangeRate, err := strconv.ParseFloat(exchangeRateStr, 64)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: invalid exchangeRate: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to get MSP ID: %w", err)
	}

	// Update repatriation amounts
	repatriation.RepatriatedAmount += repatriatedAmount
	repatriation.ConvertedAmount += convertedAmount
	repatriation.ConvertedAmountBirr = convertedAmount * exchangeRate
	repatriation.ExchangeRate = exchangeRate
	repatriation.RepatriationDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	
	// Add SWIFT reference
	if swiftReference != "" {
		repatriation.SWIFTReferences = append(repatriation.SWIFTReferences, swiftReference)
	}
	if bankCertificate != "" {
		repatriation.BankCertificate = bankCertificate
	}

	// Check compliance status
	retentionMet := repatriation.RepatriatedAmount >= repatriation.RequiredRetention
	conversionMet := repatriation.ConvertedAmount >= repatriation.RequiredConversion

	if retentionMet && conversionMet {
		repatriation.Status = "COMPLIED"
		repatriation.ComplianceDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
		fmt.Printf("✅ COMPLIANCE ACHIEVED: Retention=%.2f/%.2f, Conversion=%.2f/%.2f\n",
			repatriation.RepatriatedAmount, repatriation.RequiredRetention,
			repatriation.ConvertedAmount, repatriation.RequiredConversion)
	} else if repatriation.RepatriatedAmount > 0 || repatriation.ConvertedAmount > 0 {
		repatriation.Status = "PARTIAL"
		fmt.Printf("⚠ PARTIAL COMPLIANCE: Retention=%.2f/%.2f, Conversion=%.2f/%.2f\n",
			repatriation.RepatriatedAmount, repatriation.RequiredRetention,
			repatriation.ConvertedAmount, repatriation.RequiredConversion)
	}

	// Check if overdue
	if time.Now().After(repatriation.ComplianceDeadline) && repatriation.Status != "COMPLIED" {
		repatriation.IsOverdue = true
		repatriation.Status = "OVERDUE"
	}

	// Update days remaining
	repatriation.DaysRemaining = int(time.Until(repatriation.ComplianceDeadline).Hours() / 24)

	// Update audit fields
	repatriation.LastUpdatedBy = clientID
	repatriation.LastUpdatedByMSP = mspID
	repatriation.UpdatedAt = time.Now()

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to update state: %w", err)
	}

	return nil
}

// VerifyRepatriation - NBE verifies repatriation compliance
// FINAL STEP: NBE officer confirms compliance or applies penalties
func (c *CoffeeContract) VerifyRepatriation(ctx contractapi.TransactionContextInterface,
	repatriationID, verificationRef, verificationNotes string) error {

	fmt.Printf("=== VerifyRepatriation called: repatriationID=%s ===\n", repatriationID)

	// Get existing repatriation
	repatriationJSON, err := ctx.GetStub().GetState(repatriationID)
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to read repatriation: %w", err)
	}
	if repatriationJSON == nil {
		return fmt.Errorf("VerifyRepatriation: repatriation %s does not exist", repatriationID)
	}

	var repatriation ExportProceedsRepatriation
	err = json.Unmarshal(repatriationJSON, &repatriation)
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to unmarshal: %w", err)
	}

	// Get NBE officer identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to get MSP ID: %w", err)
	}

	// RBAC: Only NBE can verify
	if mspID != "NBEMSP" {
		return fmt.Errorf("VerifyRepatriation: unauthorized - only NBE can verify repatriation (caller MSP: %s)", mspID)
	}

	// Set verification details
	repatriation.VerifiedBy = clientID
	repatriation.VerifiedByMSP = mspID
	repatriation.VerificationDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	repatriation.VerificationRef = verificationRef
	repatriation.VerificationNotes = verificationNotes

	// Final compliance check
	retentionMet := repatriation.RepatriatedAmount >= repatriation.RequiredRetention
	conversionMet := repatriation.ConvertedAmount >= repatriation.RequiredConversion

	if retentionMet && conversionMet {
		repatriation.Status = "COMPLIED"
		fmt.Printf("✅ NBE VERIFIED: COMPLIED - %s\n", repatriationID)
	} else {
		repatriation.Status = "NON_COMPLIANT"
		fmt.Printf("❌ NBE VERIFIED: NON_COMPLIANT - %s\n", repatriationID)
	}

	repatriation.UpdatedAt = time.Now()

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to update state: %w", err)
	}

	return nil
}

// ApplyNonCompliancePenalty - NBE applies penalty for non-compliance
func (c *CoffeeContract) ApplyNonCompliancePenalty(ctx contractapi.TransactionContextInterface,
	repatriationID, penaltyAmountStr, penaltyCurrency, reason string) error {

	// Get existing repatriation
	repatriationJSON, err := ctx.GetStub().GetState(repatriationID)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to read repatriation: %w", err)
	}
	if repatriationJSON == nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: repatriation %s does not exist", repatriationID)
	}

	var repatriation ExportProceedsRepatriation
	err = json.Unmarshal(repatriationJSON, &repatriation)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to unmarshal: %w", err)
	}

	// RBAC: Only NBE can apply penalties
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to get MSP ID: %w", err)
	}
	if mspID != "NBEMSP" {
		return fmt.Errorf("ApplyNonCompliancePenalty: unauthorized - only NBE can apply penalties")
	}

	// Parse penalty amount
	penaltyAmount, err := strconv.ParseFloat(penaltyAmountStr, 64)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: invalid penaltyAmount: %w", err)
	}

	repatriation.PenaltyAmount = penaltyAmount
	repatriation.PenaltyCurrency = penaltyCurrency
	repatriation.VerificationNotes = reason
	repatriation.Status = "NON_COMPLIANT"
	repatriation.UpdatedAt = time.Now()

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to update state: %w", err)
	}

	log.Printf("❌ Penalty applied: %s - %.2f %s - Reason: %s\n", 
		repatriationID, penaltyAmount, penaltyCurrency, reason)

	return nil
}

// RequestWaiver - Exporter requests waiver for non-compliance
func (c *CoffeeContract) RequestWaiver(ctx contractapi.TransactionContextInterface,
	repatriationID, waiverReason string) error {

	// Get existing repatriation
	repatriationJSON, err := ctx.GetStub().GetState(repatriationID)
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to read repatriation: %w", err)
	}
	if repatriationJSON == nil {
		return fmt.Errorf("RequestWaiver: repatriation %s does not exist", repatriationID)
	}

	var repatriation ExportProceedsRepatriation
	err = json.Unmarshal(repatriationJSON, &repatriation)
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to unmarshal: %w", err)
	}

	repatriation.WaiverRequested = true
	repatriation.WaiverReason = waiverReason
	repatriation.UpdatedAt = time.Now()

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to update state: %w", err)
	}

	return nil
}

// ApproveWaiver - NBE approves or rejects waiver request
func (c *CoffeeContract) ApproveWaiver(ctx contractapi.TransactionContextInterface,
	repatriationID, approved, reason string) error {

	// Get existing repatriation
	repatriationJSON, err := ctx.GetStub().GetState(repatriationID)
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to read repatriation: %w", err)
	}
	if repatriationJSON == nil {
		return fmt.Errorf("ApproveWaiver: repatriation %s does not exist", repatriationID)
	}

	var repatriation ExportProceedsRepatriation
	err = json.Unmarshal(repatriationJSON, &repatriation)
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to unmarshal: %w", err)
	}

	// RBAC: Only NBE can approve waivers
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to get MSP ID: %w", err)
	}
	if mspID != "NBEMSP" {
		return fmt.Errorf("ApproveWaiver: unauthorized - only NBE can approve waivers")
	}

	if approved == "true" {
		repatriation.WaiverApproved = true
		repatriation.Status = "COMPLIED" // Waiver grants compliance
		repatriation.WaiverDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	} else {
		repatriation.WaiverApproved = false
	}

	repatriation.VerificationNotes = reason
	repatriation.UpdatedAt = time.Now()

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to update state: %w", err)
	}

	return nil
}

// ReadRepatriation - Get repatriation details
func (c *CoffeeContract) ReadRepatriation(ctx contractapi.TransactionContextInterface,
	repatriationID string) (*ExportProceedsRepatriation, error) {

	repatriationJSON, err := ctx.GetStub().GetState(repatriationID)
	if err != nil {
		return nil, fmt.Errorf("ReadRepatriation: failed to read: %w", err)
	}
	if repatriationJSON == nil {
		return nil, fmt.Errorf("ReadRepatriation: repatriation %s does not exist", repatriationID)
	}

	var repatriation ExportProceedsRepatriation
	err = json.Unmarshal(repatriationJSON, &repatriation)
	if err != nil {
		return nil, fmt.Errorf("ReadRepatriation: failed to unmarshal: %w", err)
	}

	// Update days remaining dynamically
	repatriation.DaysRemaining = int(time.Until(repatriation.ComplianceDeadline).Hours() / 24)
	if time.Now().After(repatriation.ComplianceDeadline) && repatriation.Status != "COMPLIED" {
		repatriation.IsOverdue = true
	}

	return &repatriation, nil
}

// QueryRepatriationsByExporter - Get all repatriations for an exporter
func (c *CoffeeContract) QueryRepatriationsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*ExportProceedsRepatriation, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryRepatriations(ctx, queryString)
}

// QueryRepatriationsByStatus - Get repatriations by status
func (c *CoffeeContract) QueryRepatriationsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ExportProceedsRepatriation, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryRepatriations(ctx, queryString)
}

// QueryOverdueRepatriations - Get all overdue repatriations
func (c *CoffeeContract) QueryOverdueRepatriations(ctx contractapi.TransactionContextInterface) ([]*ExportProceedsRepatriation, error) {

	queryString := `{"selector":{"isOverdue":true}}`
	return c.queryRepatriations(ctx, queryString)
}

// QueryAllRepatriations - Get all repatriations
func (c *CoffeeContract) QueryAllRepatriations(ctx contractapi.TransactionContextInterface) ([]*ExportProceedsRepatriation, error) {

	queryString := `{"selector":{"repatriationId":{"$exists":true}}}`
	return c.queryRepatriations(ctx, queryString)
}

// Helper function for querying repatriations
func (c *CoffeeContract) queryRepatriations(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*ExportProceedsRepatriation, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query repatriations: %w", err)
	}
	defer resultsIterator.Close()

	var repatriations []*ExportProceedsRepatriation

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var repatriation ExportProceedsRepatriation
		err = json.Unmarshal(queryResponse.Value, &repatriation)
		if err != nil {
			return nil, err
		}

		// Update days remaining dynamically
		repatriation.DaysRemaining = int(time.Until(repatriation.ComplianceDeadline).Hours() / 24)
		if time.Now().After(repatriation.ComplianceDeadline) && repatriation.Status != "COMPLIED" {
			repatriation.IsOverdue = true
		}

		repatriations = append(repatriations, &repatriation)
	}

	return repatriations, nil
}

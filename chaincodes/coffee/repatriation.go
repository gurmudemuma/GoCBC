package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== EXPORT PROCEEDS REPATRIATION STRUCTURE ====================
// NBE Directive: Export proceeds must be repatriated within specific timeframes.
// Retention and conversion percentages are captured from the active ledger policy.
// Compliance deadline: 120 days from shipment date

type ExportProceedsRepatriation struct {
	RepatriationID string  `json:"repatriationId"`
	PaymentID      string  `json:"paymentId"`  // Link to payment settlement
	ContractID     string  `json:"contractId"` // Link to sales contract
	ShipmentID     string  `json:"shipmentId"` // Link to shipment
	ExporterID     string  `json:"exporterId"`
	ExportAmount   float64 `json:"exportAmount"` // Total export value (USD)
	Currency       string  `json:"currency"`     // USD, EUR, etc.

	// Repatriation Requirements (NBE FXD/01/2024)
	RequiredRetention            float64   `json:"requiredRetention"`
	RequiredConversion           float64   `json:"requiredConversion"`
	RetentionPercentage          float64   `json:"retentionPercentage"`
	ConversionPercentage         float64   `json:"conversionPercentage"`
	RetentionPolicyID            string    `json:"retentionPolicyId"`
	RetentionPolicyEffectiveDate time.Time `json:"retentionPolicyEffectiveDate"`

	// Actual Repatriation
	RepatriatedAmount   float64             `json:"repatriatedAmount"`   // Amount actually repatriated
	ConvertedAmount     float64             `json:"convertedAmount"`     // Amount converted to Birr
	ConvertedAmountBirr float64             `json:"convertedAmountBirr"` // Birr equivalent
	ExchangeRate        float64             `json:"exchangeRate"`        // NBE official rate used
	RepatriationEntries []RepatriationEntry `json:"repatriationEntries"`

	// FCY Account Details
	FCYAccountNumber string `json:"fcyAccountNumber"` // Foreign currency account
	FCYBank          string `json:"fcyBank"`          // Bank holding FCY account
	FCYBankBIC       string `json:"fcyBankBic"`       // Bank BIC code

	// Compliance Tracking
	Status             string    `json:"status"`             // PENDING, PARTIAL, READY_FOR_VERIFICATION, COMPLIED, NON_COMPLIANT, OVERDUE
	ComplianceDeadline time.Time `json:"complianceDeadline"` // 120 days from shipment
	ShipmentDate       time.Time `json:"shipmentDate"`       // Export date (for deadline calculation)
	RepatriationDate   string    `json:"repatriationDate"`   // Date of repatriation
	ComplianceDate     string    `json:"complianceDate"`     // Date compliance achieved
	DaysRemaining      int       `json:"daysRemaining"`      // Days until deadline
	IsOverdue          bool      `json:"isOverdue"`          // Exceeded deadline?

	// NBE Verification
	VerifiedBy        string `json:"verifiedBy"`        // ✅ X.509 cert of NBE officer
	VerifiedByMSP     string `json:"verifiedByMsp"`     // ✅ MSP ID of NBE
	VerificationDate  string `json:"verificationDate"`  // Date NBE verified
	VerificationRef   string `json:"verificationRef"`   // NBE verification reference
	VerificationNotes string `json:"verificationNotes"` // NBE notes

	// Non-Compliance Handling
	PenaltyAmount   float64 `json:"penaltyAmount"`   // Penalty for non-compliance
	PenaltyCurrency string  `json:"penaltyCurrency"` // ETB
	WaiverRequested bool    `json:"waiverRequested"` // Exporter requested waiver
	WaiverApproved  bool    `json:"waiverApproved"`  // NBE approved waiver
	WaiverReason    string  `json:"waiverReason"`    // Justification for waiver
	WaiverDate      string  `json:"waiverDate"`      // Date waiver granted

	// SWIFT Evidence
	SWIFTReferences []string `json:"swiftReferences"` // MT103 references proving repatriation
	BankCertificate string   `json:"bankCertificate"` // Bank certificate of repatriation

	// Audit Trail
	RecordedBy       string    `json:"recordedBy"`       // ✅ X.509 cert of recorder
	RecordedByMSP    string    `json:"recordedByMsp"`    // ✅ MSP ID of recorder
	LastUpdatedBy    string    `json:"lastUpdatedBy"`    // ✅ X.509 cert of updater
	LastUpdatedByMSP string    `json:"lastUpdatedByMsp"` // ✅ MSP ID of updater
	Comments         string    `json:"comments"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type RepatriationEntry struct {
	TransactionID       string    `json:"transactionId"`
	RecordedAt          time.Time `json:"recordedAt"`
	RecordedBy          string    `json:"recordedBy"`
	RecordedByMSP       string    `json:"recordedByMsp"`
	RepatriatedAmount   float64   `json:"repatriatedAmount"`
	ConvertedAmount     float64   `json:"convertedAmount"`
	ConvertedAmountBirr float64   `json:"convertedAmountBirr"`
	ExchangeRate        float64   `json:"exchangeRate"`
	ExchangeRateID      string    `json:"exchangeRateId"`
	SWIFTReference      string    `json:"swiftReference"`
	BankCertificate     string    `json:"bankCertificate"`
}

// ==================== REPATRIATION FUNCTIONS ====================

// InitiateRepatriation - NBE or Bank initiates repatriation tracking after payment
// AUTO-TRIGGERED: After payment settlement, system creates repatriation record
// DEADLINE: 120 days from shipment date
func (c *CoffeeContract) InitiateRepatriation(ctx contractapi.TransactionContextInterface,
	repatriationID, paymentID, contractID, shipmentID, exporterID, exportAmountStr,
	currency, fcyAccountNumber, fcyBank, fcyBankBIC, shipmentDateStr string) error {

	fmt.Printf("=== InitiateRepatriation called: repatriationID=%s, paymentID=%s ===\n", repatriationID, paymentID)
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to get MSP ID: %w", err)
	}
	if !isBankMSP(mspID) {
		return fmt.Errorf("InitiateRepatriation: unauthorized - only a bank can initiate repatriation (caller MSP: %s)", mspID)
	}

	// VALIDATION: IDs
	if err := ValidateID(repatriationID, "repatriationID"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if err := ValidateID(paymentID, "paymentID"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if err := ValidateID(contractID, "contractID"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if err := ValidateCurrency(currency); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if existing, err := ctx.GetStub().GetState(repatriationID); err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to check duplicate ID: %w", err)
	} else if existing != nil {
		return fmt.Errorf("InitiateRepatriation: repatriation %s already exists", repatriationID)
	}

	// Parse export amount
	exportAmount, err := strconv.ParseFloat(exportAmountStr, 64)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: invalid exportAmount: %w", err)
	}
	if err := ValidateAmount(exportAmount, "exportAmount"); err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}

	payment, err := c.ReadPayment(ctx, paymentID)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if payment.Status != "SETTLED" || payment.ContractID != contractID || payment.ExporterID != exporterID || !strings.EqualFold(payment.Currency, currency) {
		return fmt.Errorf("InitiateRepatriation: payment must be settled and match contract, exporter, and currency")
	}
	paymentIndexKey, err := ctx.GetStub().CreateCompositeKey("repatriationPayment", []string{paymentID})
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to create payment uniqueness key: %w", err)
	}
	existingPaymentIndex, err := ctx.GetStub().GetState(paymentIndexKey)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to check payment uniqueness: %w", err)
	}
	if existingPaymentIndex != nil {
		return fmt.Errorf("InitiateRepatriation: settled payment %s already has a repatriation record", paymentID)
	}
	legacyPaymentRecords, err := c.QueryRepatriationsByPayment(ctx, paymentID)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to verify existing payment repatriation: %w", err)
	}
	if len(legacyPaymentRecords) > 0 {
		return fmt.Errorf("InitiateRepatriation: settled payment %s already has a repatriation record", paymentID)
	}
	if payment.ShipmentID != "" && payment.ShipmentID != shipmentID {
		return fmt.Errorf("InitiateRepatriation: shipment does not match settled payment")
	}
	if exportAmount > payment.Amount {
		return fmt.Errorf("InitiateRepatriation: export amount %.2f exceeds settled payment amount %.2f", exportAmount, payment.Amount)
	}
	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if shipment.ContractID != contractID || shipment.ExporterID != exporterID {
		return fmt.Errorf("InitiateRepatriation: shipment does not match contract and exporter")
	}
	ledgerShipmentDate, err := parseRepatriationShipmentDate(shipment)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: shipment has no ledger-backed departure or bill-of-lading date: %w", err)
	}

	// Parse shipment date
	shipmentDate, err := time.Parse("2006-01-02", shipmentDateStr)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: invalid shipmentDate format (use YYYY-MM-DD): %w", err)
	}
	if !shipmentDate.Equal(ledgerShipmentDate) {
		return fmt.Errorf("InitiateRepatriation: supplied shipment date does not match the ledger departure or bill-of-lading date %s", ledgerShipmentDate.Format("2006-01-02"))
	}

	// Fabric proposal timestamps are deterministic across endorsing peers.
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: %w", err)
	}
	if shipmentDate.After(now) {
		return fmt.Errorf("InitiateRepatriation: shipment date cannot be in the future")
	}
	// Calculate compliance deadline (120 days from shipment).
	complianceDeadline := shipmentDate.AddDate(0, 0, 120)
	daysRemaining := int(math.Ceil(complianceDeadline.Sub(now).Hours() / 24))

	policy, err := c.GetCurrentRetentionPolicy(ctx, "COFFEE")
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: active COFFEE retention policy is required: %w", err)
	}
	retentionPercentage := policy.RetentionRate
	conversionPercentage := policy.SurrenderRate
	if retentionPercentage < 0 || conversionPercentage < 0 || math.Abs(retentionPercentage+conversionPercentage-100) > 0.0001 {
		return fmt.Errorf("InitiateRepatriation: active COFFEE policy must define valid retention and surrender rates totaling 100%%")
	}
	requiredRetention := exportAmount * (retentionPercentage / 100.0)
	requiredConversion := exportAmount * (conversionPercentage / 100.0)

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to get client identity: %w", err)
	}

	// Create repatriation record
	repatriation := &ExportProceedsRepatriation{
		RepatriationID:               repatriationID,
		PaymentID:                    paymentID,
		ContractID:                   contractID,
		ShipmentID:                   shipmentID,
		ExporterID:                   exporterID,
		ExportAmount:                 exportAmount,
		Currency:                     currency,
		RequiredRetention:            requiredRetention,
		RequiredConversion:           requiredConversion,
		RetentionPercentage:          retentionPercentage,
		ConversionPercentage:         conversionPercentage,
		RetentionPolicyID:            policy.PolicyID,
		RetentionPolicyEffectiveDate: policy.EffectiveDate,
		RepatriatedAmount:            0.0,
		ConvertedAmount:              0.0,
		ConvertedAmountBirr:          0.0,
		FCYAccountNumber:             fcyAccountNumber,
		FCYBank:                      fcyBank,
		FCYBankBIC:                   fcyBankBIC,
		Status:                       "PENDING",
		ComplianceDeadline:           complianceDeadline,
		ShipmentDate:                 shipmentDate,
		DaysRemaining:                daysRemaining,
		IsOverdue:                    false,
		SWIFTReferences:              []string{},
		RepatriationEntries:          []RepatriationEntry{},
		RecordedBy:                   clientID,
		RecordedByMSP:                mspID,
		CreatedAt:                    now,
		UpdatedAt:                    now,
	}

	repatriationJSON, err := json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to put state: %w", err)
	}
	if err := ctx.GetStub().PutState(paymentIndexKey, []byte(repatriationID)); err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to index payment uniqueness: %w", err)
	}
	if err := c.CreateAuditLog(ctx, "INITIATE", "REPATRIATION", repatriationID, "", "PENDING", []FieldChange{
		{FieldName: "paymentId", OldValue: "", NewValue: paymentID, DataType: "string"},
		{FieldName: "retentionPolicyId", OldValue: "", NewValue: policy.PolicyID, DataType: "string"},
		{FieldName: "retentionPercentage", OldValue: "", NewValue: fmt.Sprintf("%.4f", retentionPercentage), DataType: "number"},
		{FieldName: "conversionPercentage", OldValue: "", NewValue: fmt.Sprintf("%.4f", conversionPercentage), DataType: "number"},
	}, "Repatriation initiated from a settled payment and ledger-backed shipment.", ComplianceMetadata{NBECompliance: true}); err != nil {
		return fmt.Errorf("InitiateRepatriation: failed to create audit record: %w", err)
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
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to get MSP ID: %w", err)
	}
	if !isBankMSP(mspID) {
		return fmt.Errorf("RecordRepatriation: unauthorized - only a bank can record repatriation")
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
	if math.IsNaN(repatriatedAmount) || math.IsInf(repatriatedAmount, 0) ||
		math.IsNaN(convertedAmount) || math.IsInf(convertedAmount, 0) ||
		math.IsNaN(exchangeRate) || math.IsInf(exchangeRate, 0) {
		return fmt.Errorf("RecordRepatriation: amounts and exchange rate must be finite numbers")
	}
	if repatriatedAmount < 0 || convertedAmount < 0 || repatriatedAmount+convertedAmount <= 0 {
		return fmt.Errorf("RecordRepatriation: amounts must be non-negative and at least one must be positive")
	}
	if repatriation.RepatriatedAmount+repatriatedAmount > repatriation.RequiredRetention+0.0001 || repatriation.ConvertedAmount+convertedAmount > repatriation.RequiredConversion+0.0001 {
		return fmt.Errorf("RecordRepatriation: recorded amounts exceed the active policy requirements")
	}
	if repatriation.RepatriatedAmount+repatriation.ConvertedAmount+repatriatedAmount+convertedAmount > repatriation.ExportAmount+0.0001 {
		return fmt.Errorf("RecordRepatriation: recorded total exceeds export proceeds")
	}
	rate, err := c.GetCurrentExchangeRate(ctx, repatriation.Currency)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: active exchange rate is required: %w", err)
	}
	if exchangeRate <= 0 || math.Abs(exchangeRate-rate.MidRate) > 0.0001 {
		return fmt.Errorf("RecordRepatriation: submitted exchange rate does not match the active ledger rate")
	}
	if strings.TrimSpace(swiftReference) == "" || strings.TrimSpace(bankCertificate) == "" {
		return fmt.Errorf("RecordRepatriation: SWIFT reference and bank certificate are required evidence")
	}
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to get client identity: %w", err)
	}
	previousStatus := repatriation.Status

	// Update repatriation amounts
	repatriation.RepatriatedAmount += repatriatedAmount
	repatriation.ConvertedAmount += convertedAmount
	repatriation.ConvertedAmountBirr += convertedAmount * rate.MidRate
	repatriation.ExchangeRate = rate.MidRate
	repatriation.RepatriationDate = now.Format(time.RFC3339)

	// Add SWIFT reference
	if swiftReference != "" {
		repatriation.SWIFTReferences = append(repatriation.SWIFTReferences, swiftReference)
	}
	if bankCertificate != "" {
		repatriation.BankCertificate = bankCertificate
	}
	transactionID := ctx.GetStub().GetTxID()
	repatriation.RepatriationEntries = append(repatriation.RepatriationEntries, RepatriationEntry{
		TransactionID:       transactionID,
		RecordedAt:          now,
		RecordedBy:          clientID,
		RecordedByMSP:       mspID,
		RepatriatedAmount:   repatriatedAmount,
		ConvertedAmount:     convertedAmount,
		ConvertedAmountBirr: convertedAmount * rate.MidRate,
		ExchangeRate:        rate.MidRate,
		ExchangeRateID:      rate.RateID,
		SWIFTReference:      strings.TrimSpace(swiftReference),
		BankCertificate:     strings.TrimSpace(bankCertificate),
	})

	// Check compliance status
	retentionMet := repatriation.RepatriatedAmount >= repatriation.RequiredRetention
	conversionMet := repatriation.ConvertedAmount >= repatriation.RequiredConversion

	if retentionMet && conversionMet {
		repatriation.Status = "READY_FOR_VERIFICATION"
		fmt.Printf("✅ READY FOR NBE VERIFICATION: Retention=%.2f/%.2f, Conversion=%.2f/%.2f\n",
			repatriation.RepatriatedAmount, repatriation.RequiredRetention,
			repatriation.ConvertedAmount, repatriation.RequiredConversion)
	} else if repatriation.RepatriatedAmount > 0 || repatriation.ConvertedAmount > 0 {
		repatriation.Status = "PARTIAL"
		fmt.Printf("⚠ PARTIAL COMPLIANCE: Retention=%.2f/%.2f, Conversion=%.2f/%.2f\n",
			repatriation.RepatriatedAmount, repatriation.RequiredRetention,
			repatriation.ConvertedAmount, repatriation.RequiredConversion)
	}

	// Check if overdue
	if now.After(repatriation.ComplianceDeadline) && repatriation.Status != "COMPLIED" {
		repatriation.IsOverdue = true
		repatriation.Status = "OVERDUE"
	}

	// Update days remaining
	repatriation.DaysRemaining = int(math.Ceil(repatriation.ComplianceDeadline.Sub(now).Hours() / 24))

	// Update audit fields
	repatriation.LastUpdatedBy = clientID
	repatriation.LastUpdatedByMSP = mspID
	repatriation.UpdatedAt = now

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to update state: %w", err)
	}
	entryEvent, err := json.Marshal(repatriation.RepatriationEntries[len(repatriation.RepatriationEntries)-1])
	if err != nil {
		return fmt.Errorf("RecordRepatriation: failed to marshal record event: %w", err)
	}
	if err := ctx.GetStub().SetEvent("RepatriationRecorded", entryEvent); err != nil {
		return fmt.Errorf("RecordRepatriation: failed to emit record event: %w", err)
	}
	if err := c.CreateAuditLog(ctx, "RECORD", "REPATRIATION", repatriationID, previousStatus, repatriation.Status, []FieldChange{
		{FieldName: "repatriatedAmount", OldValue: "", NewValue: repatriatedAmountStr, DataType: "number"},
		{FieldName: "convertedAmount", OldValue: "", NewValue: convertedAmountStr, DataType: "number"},
		{FieldName: "exchangeRateId", OldValue: "", NewValue: rate.RateID, DataType: "string"},
		{FieldName: "swiftReference", OldValue: "", NewValue: swiftReference, DataType: "string"},
	}, "Bank recorded repatriation evidence on the ledger.", ComplianceMetadata{NBECompliance: false}); err != nil {
		return fmt.Errorf("RecordRepatriation: failed to create audit record: %w", err)
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
	if strings.TrimSpace(verificationRef) == "" {
		return fmt.Errorf("VerifyRepatriation: verification reference is required")
	}
	if repatriation.Status != "READY_FOR_VERIFICATION" && repatriation.Status != "OVERDUE" {
		return fmt.Errorf("VerifyRepatriation: record is not ready for compliance verification (current status: %s)", repatriation.Status)
	}
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: %w", err)
	}
	previousStatus := repatriation.Status

	// Set verification details
	repatriation.VerifiedBy = clientID
	repatriation.VerifiedByMSP = mspID
	repatriation.VerificationDate = now.Format(time.RFC3339)
	repatriation.VerificationRef = verificationRef
	repatriation.VerificationNotes = verificationNotes

	// Final compliance check
	retentionMet := repatriation.RepatriatedAmount >= repatriation.RequiredRetention
	conversionMet := repatriation.ConvertedAmount >= repatriation.RequiredConversion

	if retentionMet && conversionMet && !now.After(repatriation.ComplianceDeadline) {
		repatriation.Status = "COMPLIED"
		repatriation.IsOverdue = false
		repatriation.ComplianceDate = now.Format(time.RFC3339)
		fmt.Printf("✅ NBE VERIFIED: COMPLIED - %s\n", repatriationID)
	} else {
		repatriation.Status = "NON_COMPLIANT"
		fmt.Printf("❌ NBE VERIFIED: NON_COMPLIANT - %s\n", repatriationID)
	}

	repatriation.UpdatedAt = now

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to update state: %w", err)
	}
	if err := c.CreateAuditLog(ctx, "VERIFY", "REPATRIATION", repatriationID, previousStatus, repatriation.Status, []FieldChange{
		{FieldName: "verificationRef", OldValue: "", NewValue: verificationRef, DataType: "string"},
		{FieldName: "status", OldValue: previousStatus, NewValue: repatriation.Status, DataType: "string"},
	}, verificationNotes, ComplianceMetadata{NBECompliance: repatriation.Status == "COMPLIED"}); err != nil {
		return fmt.Errorf("VerifyRepatriation: failed to create audit record: %w", err)
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
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to get client identity: %w", err)
	}
	if repatriation.Status != "NON_COMPLIANT" && repatriation.Status != "OVERDUE" {
		return fmt.Errorf("ApplyNonCompliancePenalty: penalties require an overdue or non-compliant repatriation (current status: %s)", repatriation.Status)
	}

	// Parse penalty amount
	penaltyAmount, err := strconv.ParseFloat(penaltyAmountStr, 64)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: invalid penaltyAmount: %w", err)
	}
	if math.IsNaN(penaltyAmount) || math.IsInf(penaltyAmount, 0) || penaltyAmount <= 0 || strings.TrimSpace(penaltyCurrency) == "" || strings.TrimSpace(reason) == "" {
		return fmt.Errorf("ApplyNonCompliancePenalty: positive amount, currency, and reason are required")
	}
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: %w", err)
	}
	previousStatus := repatriation.Status

	repatriation.PenaltyAmount = penaltyAmount
	repatriation.PenaltyCurrency = penaltyCurrency
	repatriation.VerificationNotes = reason
	repatriation.LastUpdatedBy = clientID
	repatriation.LastUpdatedByMSP = mspID
	repatriation.Status = "NON_COMPLIANT"
	repatriation.UpdatedAt = now

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to update state: %w", err)
	}
	if err := c.CreateAuditLog(ctx, "APPLY_PENALTY", "REPATRIATION", repatriationID, previousStatus, repatriation.Status, []FieldChange{
		{FieldName: "penaltyAmount", OldValue: "", NewValue: penaltyAmountStr, DataType: "number"},
		{FieldName: "penaltyCurrency", OldValue: "", NewValue: penaltyCurrency, DataType: "string"},
		{FieldName: "reason", OldValue: "", NewValue: reason, DataType: "string"},
	}, reason, ComplianceMetadata{NBECompliance: true}); err != nil {
		return fmt.Errorf("ApplyNonCompliancePenalty: failed to create audit record: %w", err)
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
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to get MSP ID: %w", err)
	}
	if mspID != "ECTAMSP" {
		return fmt.Errorf("RequestWaiver: unauthorized - only the exporter organization can request a waiver")
	}
	if strings.TrimSpace(waiverReason) == "" {
		return fmt.Errorf("RequestWaiver: waiver reason is required")
	}
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("RequestWaiver: %w", err)
	}
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to get client identity: %w", err)
	}

	repatriation.WaiverRequested = true
	repatriation.WaiverReason = waiverReason
	repatriation.LastUpdatedBy = clientID
	repatriation.LastUpdatedByMSP = mspID
	repatriation.UpdatedAt = now

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("RequestWaiver: failed to update state: %w", err)
	}
	if err := c.CreateAuditLog(ctx, "REQUEST_WAIVER", "REPATRIATION", repatriationID, repatriation.Status, repatriation.Status,
		[]FieldChange{{FieldName: "waiverReason", OldValue: "", NewValue: waiverReason, DataType: "string"}},
		"Exporter requested a repatriation compliance waiver.", ComplianceMetadata{NBECompliance: false}); err != nil {
		return fmt.Errorf("RequestWaiver: failed to create audit record: %w", err)
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
	if !repatriation.WaiverRequested {
		return fmt.Errorf("ApproveWaiver: no waiver request is pending")
	}
	if strings.TrimSpace(reason) == "" {
		return fmt.Errorf("ApproveWaiver: NBE decision reason is required")
	}
	if approved != "true" && approved != "false" {
		return fmt.Errorf("ApproveWaiver: approved must be true or false")
	}
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("ApproveWaiver: %w", err)
	}
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to get client identity: %w", err)
	}

	if approved == "true" {
		repatriation.WaiverApproved = true
		repatriation.Status = "WAIVED"
		repatriation.IsOverdue = false
		repatriation.WaiverDate = now.Format(time.RFC3339)
	} else {
		repatriation.WaiverApproved = false
	}

	repatriation.VerificationNotes = reason
	repatriation.LastUpdatedBy = clientID
	repatriation.LastUpdatedByMSP = mspID
	repatriation.UpdatedAt = now

	repatriationJSON, err = json.Marshal(repatriation)
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(repatriationID, repatriationJSON)
	if err != nil {
		return fmt.Errorf("ApproveWaiver: failed to update state: %w", err)
	}
	decision := "REJECT_WAIVER"
	newStatus := repatriation.Status
	if repatriation.WaiverApproved {
		decision = "APPROVE_WAIVER"
	}
	if err := c.CreateAuditLog(ctx, decision, "REPATRIATION", repatriationID, "WAIVER_REQUESTED", newStatus,
		[]FieldChange{{FieldName: "waiverApproved", OldValue: "false", NewValue: strconv.FormatBool(repatriation.WaiverApproved), DataType: "boolean"}},
		reason, ComplianceMetadata{NBECompliance: true}); err != nil {
		return fmt.Errorf("ApproveWaiver: failed to create audit record: %w", err)
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

	// Derive read-time fields from the proposal timestamp so peers agree.
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return nil, err
	}
	updateRepatriationDeadline(&repatriation, now)

	return &repatriation, nil
}

// QueryRepatriationsByExporter - Get all repatriations for an exporter
func (c *CoffeeContract) QueryRepatriationsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*ExportProceedsRepatriation, error) {
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return nil, err
	}
	queryBytes, err := json.Marshal(map[string]interface{}{"selector": map[string]string{"exporterId": exporterID}})
	if err != nil {
		return nil, fmt.Errorf("failed to build exporter repatriation query: %w", err)
	}
	queryString := string(queryBytes)
	return c.queryRepatriations(ctx, queryString)
}

func (c *CoffeeContract) QueryRepatriationsByPayment(ctx contractapi.TransactionContextInterface,
	paymentID string) ([]*ExportProceedsRepatriation, error) {
	if err := ValidateID(paymentID, "paymentID"); err != nil {
		return nil, err
	}
	queryBytes, err := json.Marshal(map[string]interface{}{"selector": map[string]string{"paymentId": paymentID}})
	if err != nil {
		return nil, fmt.Errorf("failed to build payment repatriation query: %w", err)
	}
	return c.queryRepatriations(ctx, string(queryBytes))
}

// QueryRepatriationsByStatus - Get repatriations by status
func (c *CoffeeContract) QueryRepatriationsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ExportProceedsRepatriation, error) {
	status = strings.ToUpper(strings.TrimSpace(status))
	if !isRepatriationStatus(status) {
		return nil, fmt.Errorf("unsupported repatriation status %q", status)
	}
	repatriations, err := c.QueryAllRepatriations(ctx)
	if err != nil {
		return nil, err
	}
	filtered := make([]*ExportProceedsRepatriation, 0)
	for _, repatriation := range repatriations {
		if repatriation.Status == status {
			filtered = append(filtered, repatriation)
		}
	}
	return filtered, nil
}

// QueryOverdueRepatriations - Get all overdue repatriations
func (c *CoffeeContract) QueryOverdueRepatriations(ctx contractapi.TransactionContextInterface) ([]*ExportProceedsRepatriation, error) {
	repatriations, err := c.QueryAllRepatriations(ctx)
	if err != nil {
		return nil, err
	}
	filtered := make([]*ExportProceedsRepatriation, 0)
	for _, repatriation := range repatriations {
		if repatriation.IsOverdue {
			filtered = append(filtered, repatriation)
		}
	}
	return filtered, nil
}

func isRepatriationStatus(status string) bool {
	switch status {
	case "PENDING", "PARTIAL", "READY_FOR_VERIFICATION", "COMPLIED", "WAIVED", "NON_COMPLIANT", "OVERDUE":
		return true
	default:
		return false
	}
}

// QueryAllRepatriations - Get all repatriations
func (c *CoffeeContract) QueryAllRepatriations(ctx contractapi.TransactionContextInterface) ([]*ExportProceedsRepatriation, error) {

	queryString := `{"selector":{"repatriationId":{"$exists":true}}}`
	return c.queryRepatriations(ctx, queryString)
}

// Helper function for querying repatriations
func (c *CoffeeContract) queryRepatriations(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*ExportProceedsRepatriation, error) {
	now, err := repatriationTransactionTime(ctx)
	if err != nil {
		return nil, err
	}

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

		updateRepatriationDeadline(&repatriation, now)

		repatriations = append(repatriations, &repatriation)
	}

	return repatriations, nil
}

func repatriationTransactionTime(ctx contractapi.TransactionContextInterface) (time.Time, error) {
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to read Fabric transaction timestamp: %w", err)
	}
	return time.Unix(timestamp.Seconds, int64(timestamp.Nanos)).UTC(), nil
}

func parseRepatriationShipmentDate(shipment *CoffeeShipment) (time.Time, error) {
	for _, value := range []string{shipment.DepartureFromAddis, shipment.BillOfLadingDate} {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		for _, layout := range []string{time.RFC3339, "2006-01-02"} {
			if parsed, err := time.Parse(layout, value); err == nil {
				return time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC), nil
			}
		}
	}
	return time.Time{}, fmt.Errorf("departureFromAddis and billOfLadingDate are absent or invalid")
}

func updateRepatriationDeadline(repatriation *ExportProceedsRepatriation, now time.Time) {
	remaining := repatriation.ComplianceDeadline.Sub(now)
	repatriation.DaysRemaining = int(math.Ceil(remaining.Hours() / 24))
	repatriation.IsOverdue = remaining < 0 && repatriation.Status != "COMPLIED" && repatriation.Status != "WAIVED"
	if repatriation.IsOverdue && (repatriation.Status == "PENDING" || repatriation.Status == "PARTIAL" || repatriation.Status == "READY_FOR_VERIFICATION") {
		repatriation.Status = "OVERDUE"
	}
}

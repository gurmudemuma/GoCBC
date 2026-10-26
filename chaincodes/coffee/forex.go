package main

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== FOREX ALLOCATION STRUCTURE ====================

type ForexAllocation struct {
	ForexID         string  `json:"forexId"`
	ContractID      string  `json:"contractId"`
	ExporterID      string  `json:"exporterId"`
	LCID            string  `json:"lcId"`
	RequestedBy     string  `json:"requestedBy,omitempty"`
	RequestedByMSP  string  `json:"requestedByMsp,omitempty"`
	AllocatedBy     string  `json:"allocatedBy,omitempty"`
	AllocatedByMSP  string  `json:"allocatedByMsp,omitempty"`
	RequestedAmount float64 `json:"requestedAmount"`
	AllocatedAmount float64 `json:"allocatedAmount"`
	Currency        string  `json:"currency"`
	ExchangeRate    float64 `json:"exchangeRate"`
	OfficialRate    float64 `json:"officialRate"`  // NBE official rate
	MarketRate      float64 `json:"marketRate"`    // Parallel market rate (if tracked)
	RetentionRate   float64 `json:"retentionRate"` // Percentage to be retained (NBE FXD/01/2024: 100% allowed)
	// Retention Policy Compliance (captured from the active NBE ledger policy)
	RetentionPercentage float64 `json:"retentionPercentage"`
	RetentionAmountUSD  float64 `json:"retentionAmountUsd"` // Calculated retention amount
	FCYAccountNumber    string  `json:"fcyAccountNumber"`   // Foreign currency account
	RetentionStatus     string  `json:"retentionStatus"`    // PENDING, COMPLIED, NON_COMPLIANT
	RetentionDate       string  `json:"retentionDate"`      // Date retention was enforced
	// Sanction Screening (OFAC, UN, EU compliance)
	SanctionScreeningStatus string    `json:"sanctionScreeningStatus"` // PENDING, CLEARED, FLAGGED
	ScreenedAgainst         []string  `json:"screenedAgainst"`         // [OFAC, UN, EU]
	ScreeningDate           string    `json:"screeningDate"`           // ISO date
	ScreeningOfficer        string    `json:"screeningOfficer"`        // NBE officer
	ScreeningNotes          string    `json:"screeningNotes"`          // Any flags or notes
	Status                  string    `json:"status"`                  // REQUESTED, APPROVED, ALLOCATED, UTILIZED, EXPIRED
	RequestDate             time.Time `json:"requestDate"`
	ApprovalDate            string    `json:"approvalDate"`
	AllocationDate          string    `json:"allocationDate"`
	UtilizationDate         string    `json:"utilizationDate"`
	ExpiryDate              string    `json:"expiryDate"` // Forex allocation expiry
	UtilizedAmount          float64   `json:"utilizedAmount"`
	UtilizedBy              string    `json:"utilizedBy"`    // ✅ X.509 cert of utilizer
	UtilizedByMSP           string    `json:"utilizedByMsp"` // ✅ MSP of utilizer
	VerifiedBy              string    `json:"verifiedBy"`    // ✅ X.509 cert of NBE verifier
	VerifiedByMSP           string    `json:"verifiedByMsp"` // ✅ MSP of NBE verifier
	NBEOfficer              string    `json:"nbeOfficer"`
	NBEApprovalRef          string    `json:"nbeApprovalRef"` // NBE reference number
	Comments                string    `json:"comments"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

// NBE Exchange Rate structure
type ExchangeRate struct {
	RateID        string    `json:"rateId"`
	Currency      string    `json:"currency"`      // USD, EUR, GBP, etc.
	BuyingRate    float64   `json:"buyingRate"`    // NBE buying rate
	SellingRate   float64   `json:"sellingRate"`   // NBE selling rate
	MidRate       float64   `json:"midRate"`       // Middle rate
	EffectiveDate time.Time `json:"effectiveDate"` // When rate becomes active
	SetBy         string    `json:"setBy"`         // NBE officer who set the rate
	Status        string    `json:"status"`        // ACTIVE, INACTIVE, SUPERSEDED
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// NBE Retention Policy structure
type RetentionPolicy struct {
	PolicyID      string    `json:"policyId"`
	CommodityType string    `json:"commodityType"` // COFFEE, GOLD, etc.
	RetentionRate float64   `json:"retentionRate"` // Percentage (NBE FXD/01/2024: 100% default)
	SurrenderRate float64   `json:"surrenderRate"` // Percentage to convert to Birr
	EffectiveDate time.Time `json:"effectiveDate"`
	ExpiryDate    string    `json:"expiryDate"`
	SetBy         string    `json:"setBy"`
	Justification string    `json:"justification"`
	Status        string    `json:"status"` // ACTIVE, INACTIVE
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ==================== FOREX FUNCTIONS ====================

// RequestForex - Request foreign exchange allocation from NBE
// NOTE: LC ID removed from parameters to prevent SDK-level state queries
// NBE will validate LC during allocation phase
func (c *CoffeeContract) RequestForex(ctx contractapi.TransactionContextInterface,
	forexID, contractID, exporterID, amountStr, currency string) error {
	requesterMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RequestForex: failed to get requester MSP ID: %w", err)
	}
	if requesterMSP != "ECTAMSP" && !isBankMSP(requesterMSP) {
		return fmt.Errorf("RequestForex: unauthorized - only ECTA or bank members can submit forex requests, got: %s", requesterMSP)
	}
	if err := ValidateID(forexID, "forexID"); err != nil {
		return fmt.Errorf("RequestForex: %w", err)
	}
	if err := ValidateID(contractID, "contractID"); err != nil {
		return fmt.Errorf("RequestForex: %w", err)
	}
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return fmt.Errorf("RequestForex: %w", err)
	}
	if err := ValidateCurrency(currency); err != nil {
		return fmt.Errorf("RequestForex: %w", err)
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("RequestForex: invalid amount: %w", err)
	}
	if err := ValidateAmount(amount, "requestedAmount"); err != nil {
		return fmt.Errorf("RequestForex: %w", err)
	}

	// Read the contract and duplicate key as part of the endorsement simulation. A
	// mismatch is a ledger synchronization problem and must fail endorsement; it
	// must not be hidden by accepting an unvalidated write.
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err != nil {
		return fmt.Errorf("RequestForex: failed to read contract: %w", err)
	}
	if contractJSON == nil {
		return fmt.Errorf("RequestForex: contract %s does not exist", contractID)
	}
	var contract SalesContract
	if err := json.Unmarshal(contractJSON, &contract); err != nil {
		return fmt.Errorf("RequestForex: failed to unmarshal contract: %w", err)
	}
	if contract.ContractStatus != "APPROVED" {
		return fmt.Errorf("RequestForex: contract must be APPROVED, current status: %s", contract.ContractStatus)
	}
	if contract.ExporterID != exporterID {
		return fmt.Errorf("RequestForex: exporter %s does not own contract %s", exporterID, contractID)
	}
	if strings.ToUpper(contract.Currency) != currency {
		return fmt.Errorf("RequestForex: currency %s does not match contract currency %s", currency, contract.Currency)
	}
	if amount > contract.TotalValue {
		return fmt.Errorf("RequestForex: requested amount %.2f exceeds contract value %.2f", amount, contract.TotalValue)
	}
	existingForex, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return fmt.Errorf("RequestForex: failed to check duplicate forex ID: %w", err)
	}
	if existingForex != nil {
		return fmt.Errorf("RequestForex: forex request %s already exists", forexID)
	}
	requesterID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RequestForex: failed to get requester certificate identity: %w", err)
	}

	// Use the transaction timestamp so all endorsers produce the same state
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	forex := ForexAllocation{
		ForexID:         forexID,
		ContractID:      contractID,
		ExporterID:      exporterID,
		LCID:            "", // LC will be linked during allocation by NBE
		RequestedBy:     requesterID,
		RequestedByMSP:  requesterMSP,
		RequestedAmount: amount,
		Currency:        currency,
		Status:          "REQUESTED",
		RequestDate:     txTime,
		CreatedAt:       txTime,
		UpdatedAt:       txTime,
		ScreenedAgainst: []string{}, // Initialize as empty array, not null
	}

	forexJSON, err := json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	err = ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
	if err != nil {
		return fmt.Errorf("failed to save forex: %v", err)
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "forexId", OldValue: "", NewValue: forexID, DataType: "string"},
		{FieldName: "contractId", OldValue: "", NewValue: contractID, DataType: "string"},
		{FieldName: "exporterId", OldValue: "", NewValue: exporterID, DataType: "string"},
		{FieldName: "requestedAmount", OldValue: "", NewValue: amountStr, DataType: "number"},
		{FieldName: "currency", OldValue: "", NewValue: currency, DataType: "string"},
		{FieldName: "status", OldValue: "", NewValue: "REQUESTED", DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true, // NBE monitors forex requests
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: "Forex allocation requested by exporter. Pending bank/NBE approval.",
	}

	err = c.CreateAuditLog(ctx, "REQUEST", "FOREX", forexID, "", "REQUESTED", changes,
		"Forex allocation requested by exporter", compliance)
	if err != nil {
		return fmt.Errorf("RequestForex: failed to create audit log: %w", err)
	}

	return nil
}

// ConfirmForex - NBE confirms forex allocation request (two-step workflow: REQUESTED → CONFIRMED → ALLOCATED)
func (c *CoffeeContract) ConfirmForex(ctx contractapi.TransactionContextInterface,
	forexID, officer, comments string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ConfirmForex: failed to get MSP ID: %w", err)
	}

	// Only NBE can confirm forex requests
	if mspID != "NBEMSP" {
		return fmt.Errorf("ConfirmForex: unauthorized: only NBE can confirm forex (caller: %s)", mspID)
	}

	// VALIDATION: IDs
	if err := ValidateID(forexID, "forexID"); err != nil {
		return fmt.Errorf("ConfirmForex: %w", err)
	}
	if err := ValidateNonEmptyString(officer, "officer", MaxStringLen); err != nil {
		return fmt.Errorf("ConfirmForex: %w", err)
	}

	forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return fmt.Errorf("ConfirmForex: failed to read forex %s: %w", forexID, err)
	}
	if forexJSON == nil {
		return fmt.Errorf("ConfirmForex: forex %s does not exist", forexID)
	}

	var forex ForexAllocation
	err = json.Unmarshal(forexJSON, &forex)
	if err != nil {
		return fmt.Errorf("failed to unmarshal forex: %v", err)
	}

	if forex.Status != "REQUESTED" {
		return fmt.Errorf("forex cannot be confirmed, current status: %s (must be REQUESTED)", forex.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Get confirmer identity
	confirmerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ConfirmForex: failed to get confirmer certificate identity: %w", err)
	}

	forex.Status = "CONFIRMED"
	forex.Comments = comments
	forex.VerifiedBy = confirmerID // Record who confirmed
	forex.VerifiedByMSP = mspID    // Record MSP (should be NBEMSP)
	forex.UpdatedAt = txTime

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":   "ForexConfirmed",
		"forexID":     forexID,
		"exporterID":  forex.ExporterID,
		"confirmedBy": officer,
		"timestamp":   txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ForexConfirmed", eventJSON)

	err = ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
	if err != nil {
		return fmt.Errorf("failed to save forex: %v", err)
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "REQUESTED", NewValue: "CONFIRMED", DataType: "string"},
		{FieldName: "verifiedBy", OldValue: "", NewValue: confirmerID, DataType: "string"},
		{FieldName: "verifiedByMsp", OldValue: "", NewValue: mspID, DataType: "string"},
		{FieldName: "comments", OldValue: "", NewValue: comments, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true, // NBE confirmed forex request
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("Forex request confirmed by NBE officer: %s", officer),
	}

	auditErr := c.CreateAuditLog(ctx, "CONFIRM", "FOREX", forexID, "REQUESTED", "CONFIRMED", changes,
		fmt.Sprintf("Forex confirmed by %s (Officer: %s)", mspID, officer), compliance)
	if auditErr != nil {
		return fmt.Errorf("ConfirmForex: failed to create audit log: %w", auditErr)
	}

	return nil
}

// AllocateForex - Bank or NBE allocates foreign exchange with retention policy
// Per NBE FXD/01/2024: Banks can allocate forex without prior NBE approval
// Allocations must match the active retention policy set by NBE.
func (c *CoffeeContract) AllocateForex(ctx contractapi.TransactionContextInterface,
	forexID, lcID, amountStr, exchangeRateStr, retentionRateStr, officer, approvalRef, expiryDate string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("AllocateForex: failed to get MSP ID: %w", err)
	}

	// NBE sets policy and member banks execute allocations. Match explicit MSPs;
	// substring checks can grant authority to unrelated organizations.
	if mspID != "NBEMSP" && !isBankMSP(mspID) {
		return fmt.Errorf("AllocateForex: unauthorized: only NBE or Banks can allocate forex (caller: %s)", mspID)
	}
	allocatorID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("AllocateForex: failed to get allocator certificate identity: %w", err)
	}

	// VALIDATION: IDs
	if err := ValidateID(forexID, "forexID"); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateID(lcID, "lcID"); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateNonEmptyString(strings.TrimSpace(officer), "officer", MaxStringLen); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateNonEmptyString(strings.TrimSpace(approvalRef), "approvalRef", MaxStringLen); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateNonEmptyString(officer, "officer", MaxStringLen); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateNonEmptyString(approvalRef, "approvalRef", MaxStringLen); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("AllocateForex: invalid amount: %w", err)
	}

	// VALIDATION: Amount
	if err := ValidateAmount(amount, "amount"); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}

	exchangeRate, err := strconv.ParseFloat(exchangeRateStr, 64)
	if err != nil {
		return fmt.Errorf("AllocateForex: invalid exchange rate: %w", err)
	}

	// VALIDATION: Exchange rate
	if err := ValidateExchangeRate(exchangeRate); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}

	retentionRate, err := strconv.ParseFloat(retentionRateStr, 64)
	if err != nil {
		return fmt.Errorf("AllocateForex: invalid retention rate: %w", err)
	}

	// VALIDATION: Retention rate
	if err := ValidatePercentage(retentionRate, "retentionRate"); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	policy, err := c.GetCurrentRetentionPolicy(ctx, "COFFEE")
	if err != nil {
		return fmt.Errorf("AllocateForex: no active COFFEE retention policy: %w", err)
	}
	if math.Abs(retentionRate-policy.RetentionRate) > 0.0001 {
		return fmt.Errorf("AllocateForex: submitted retention rate %.4f does not match active NBE policy %.4f", retentionRate, policy.RetentionRate)
	}

	// VALIDATION: Expiry date
	if expiryDate != "" {
		if err := ValidateDate(expiryDate); err != nil {
			return fmt.Errorf("AllocateForex: %w", err)
		}
	}

	forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return fmt.Errorf("AllocateForex: failed to read forex %s: %w", forexID, err)
	}
	if forexJSON == nil {
		return fmt.Errorf("AllocateForex: forex %s does not exist", forexID)
	}

	var forex ForexAllocation
	err = json.Unmarshal(forexJSON, &forex)
	if err != nil {
		return fmt.Errorf("failed to unmarshal forex: %v", err)
	}

	if forex.Status != "REQUESTED" && forex.Status != "APPROVED" && forex.Status != "CONFIRMED" {
		return fmt.Errorf("forex cannot be allocated, current status: %s (must be REQUESTED, CONFIRMED, or APPROVED)", forex.Status)
	}
	if amount > forex.RequestedAmount {
		return fmt.Errorf("AllocateForex: amount %.2f exceeds requested amount %.2f", amount, forex.RequestedAmount)
	}

	lcJSON, err := ctx.GetStub().GetState("LC_" + lcID)
	if err != nil {
		return fmt.Errorf("AllocateForex: failed to read LC %s: %w", lcID, err)
	}
	if lcJSON == nil {
		return fmt.Errorf("AllocateForex: LC %s does not exist", lcID)
	}
	var lc LetterOfCredit
	if err := json.Unmarshal(lcJSON, &lc); err != nil {
		return fmt.Errorf("AllocateForex: failed to unmarshal LC: %w", err)
	}
	if lc.Status != "ISSUED" && lc.Status != "FOREX_REQUESTED" {
		return fmt.Errorf("AllocateForex: LC must be ISSUED or FOREX_REQUESTED, current status: %s", lc.Status)
	}
	if lc.ContractID != forex.ContractID || lc.ExporterID != forex.ExporterID {
		return fmt.Errorf("AllocateForex: LC does not match the forex request contract and exporter")
	}
	if strings.ToUpper(lc.Currency) != strings.ToUpper(forex.Currency) {
		return fmt.Errorf("AllocateForex: LC currency %s does not match forex currency %s", lc.Currency, forex.Currency)
	}
	if amount > lc.Amount {
		return fmt.Errorf("AllocateForex: amount %.2f exceeds LC amount %.2f", amount, lc.Amount)
	}
	if forex.LCID != "" && forex.LCID != lcID {
		return fmt.Errorf("AllocateForex: forex request is already linked to LC %s", forex.LCID)
	}
	officialRate, err := c.GetCurrentExchangeRate(ctx, forex.Currency)
	if err != nil {
		return fmt.Errorf("AllocateForex: no active NBE exchange rate for %s: %w", forex.Currency, err)
	}
	if math.Abs(exchangeRate-officialRate.MidRate) > 0.0001 {
		return fmt.Errorf("AllocateForex: submitted exchange rate %.4f does not match active NBE rate %.4f", exchangeRate, officialRate.MidRate)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	forex.Status = "ALLOCATED"
	forex.LCID = lcID // Link the LC at allocation time
	forex.AllocatedAmount = amount
	forex.ExchangeRate = officialRate.MidRate
	forex.OfficialRate = officialRate.MidRate
	forex.RetentionRate = retentionRate
	forex.NBEOfficer = officer
	forex.NBEApprovalRef = approvalRef
	forex.AllocatedBy = allocatorID
	forex.AllocatedByMSP = mspID
	forex.ExpiryDate = expiryDate
	forex.AllocationDate = txTime.Format(time.RFC3339)
	forex.UpdatedAt = txTime

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":       "ForexAllocated",
		"forexID":         forexID,
		"exporterID":      forex.ExporterID,
		"allocatedAmount": amount,
		"currency":        forex.Currency,
		"timestamp":       txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ForexAllocated", eventJSON)

	err = ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
	if err != nil {
		return fmt.Errorf("failed to save forex: %v", err)
	}

	// Keep LC and forex state consistent in the same Fabric transaction.
	lc.Status = "FOREX_ALLOCATED"
	lc.UpdatedAt = txTime
	updatedLCJSON, err := json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("AllocateForex: failed to marshal updated LC: %w", err)
	}
	if err := ctx.GetStub().PutState("LC_"+lcID, updatedLCJSON); err != nil {
		return fmt.Errorf("AllocateForex: failed to update LC: %w", err)
	}
	lcEvent := map[string]interface{}{
		"eventType": "LCForexAllocated",
		"lcID":      lcID,
		"forexID":   forexID,
		"timestamp": txTime.Format(time.RFC3339),
	}
	lcEventJSON, err := json.Marshal(lcEvent)
	if err != nil {
		return fmt.Errorf("AllocateForex: failed to marshal LC allocation event: %w", err)
	}
	if err := ctx.GetStub().SetEvent("LCForexAllocated", lcEventJSON); err != nil {
		return fmt.Errorf("AllocateForex: failed to emit LC allocation event: %w", err)
	}

	// Note: Exporter will need to create shipment manually
	// ECTA quality inspection will be triggered when shipment is created

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "REQUESTED", NewValue: "ALLOCATED", DataType: "string"},
		{FieldName: "lcId", OldValue: "", NewValue: lcID, DataType: "string"},
		{FieldName: "allocatedAmount", OldValue: "", NewValue: amountStr, DataType: "number"},
		{FieldName: "exchangeRate", OldValue: "", NewValue: fmt.Sprintf("%.4f", officialRate.MidRate), DataType: "number"},
		{FieldName: "retentionRate", OldValue: "", NewValue: retentionRateStr, DataType: "number"},
		{FieldName: "nbeOfficer", OldValue: "", NewValue: officer, DataType: "string"},
		{FieldName: "nbeApprovalRef", OldValue: "", NewValue: approvalRef, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true, // NBE allocated forex
		UCP600Check:    true, // LC verified
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("Forex allocated by %s with %s%% retention rate per NBE policy", mspID, retentionRateStr),
	}

	auditErr := c.CreateAuditLog(ctx, "ALLOCATE", "FOREX", forexID, "REQUESTED", "ALLOCATED", changes,
		fmt.Sprintf("Forex allocated by %s (Officer: %s, Approval: %s)", mspID, officer, approvalRef), compliance)
	if auditErr != nil {
		return fmt.Errorf("AllocateForex: failed to create audit log: %w", auditErr)
	}

	return nil
}

// UtilizeForex - Mark forex as utilized
func (c *CoffeeContract) UtilizeForex(ctx contractapi.TransactionContextInterface,
	forexID, utilizedAmountStr string) error {
	if err := ValidateID(forexID, "forexID"); err != nil {
		return fmt.Errorf("UtilizeForex: %w", err)
	}
	utilizerMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("UtilizeForex: failed to get MSP ID: %w", err)
	}
	if utilizerMSP != "NBEMSP" && !isBankMSP(utilizerMSP) {
		return fmt.Errorf("UtilizeForex: unauthorized - only NBE or bank members can mark forex as utilized, got: %s", utilizerMSP)
	}

	utilizedAmount, err := strconv.ParseFloat(utilizedAmountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return fmt.Errorf("failed to read forex: %v", err)
	}
	if forexJSON == nil {
		return fmt.Errorf("forex %s does not exist", forexID)
	}

	var forex ForexAllocation
	err = json.Unmarshal(forexJSON, &forex)
	if err != nil {
		return fmt.Errorf("failed to unmarshal forex: %v", err)
	}

	if forex.Status != "ALLOCATED" {
		return fmt.Errorf("forex cannot be utilized, current status: %s", forex.Status)
	}

	if utilizedAmount <= 0 || utilizedAmount > forex.AllocatedAmount {
		return fmt.Errorf("UtilizeForex: amount must be positive and cannot exceed allocated amount")
	}

	// ✅ BLOCKCHAIN FEATURE: Capture MSP identity for non-repudiation
	utilizerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		utilizerID = utilizerMSP // Fallback to MSP name if X.509 cert unavailable
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	forex.Status = "UTILIZED"
	forex.UtilizedAmount = utilizedAmount
	forex.UtilizationDate = txTime.Format(time.RFC3339)
	forex.UtilizedBy = utilizerID     // ✅ Record WHO utilized
	forex.UtilizedByMSP = utilizerMSP // ✅ Record organization
	forex.UpdatedAt = txTime

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	if err := ctx.GetStub().PutState("FOREX_"+forexID, forexJSON); err != nil {
		return fmt.Errorf("UtilizeForex: failed to save forex: %w", err)
	}
	changes := []FieldChange{
		{FieldName: "status", OldValue: "ALLOCATED", NewValue: "UTILIZED", DataType: "string"},
		{FieldName: "utilizedAmount", OldValue: "", NewValue: utilizedAmountStr, DataType: "number"},
	}
	if err := c.CreateAuditLog(ctx, "UTILIZE", "FOREX", forexID, "ALLOCATED", "UTILIZED", changes,
		"Forex allocation utilization recorded by an authenticated bank or NBE member.", ComplianceMetadata{NBECompliance: true}); err != nil {
		return fmt.Errorf("UtilizeForex: failed to create audit log: %w", err)
	}
	return nil
}

// RecordForexRetention records the retained foreign-currency amount on the
// ledger. Compliance is evaluated against the currently active NBE policy;
// when no policy exists the record remains PENDING instead of claiming success.
func (c *CoffeeContract) RecordForexRetention(ctx contractapi.TransactionContextInterface,
	forexID, retentionPercentageStr, fcyAccountNumber string) error {
	if err := ValidateID(forexID, "forexID"); err != nil {
		return fmt.Errorf("RecordForexRetention: %w", err)
	}
	account := strings.TrimSpace(fcyAccountNumber)
	if err := ValidateNonEmptyString(account, "fcyAccountNumber", MaxStringLen); err != nil {
		return fmt.Errorf("RecordForexRetention: %w", err)
	}
	actorMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RecordForexRetention: failed to get MSP ID: %w", err)
	}
	if actorMSP != "NBEMSP" && !isBankMSP(actorMSP) {
		return fmt.Errorf("RecordForexRetention: unauthorized - only NBE or bank members can record retention, got: %s", actorMSP)
	}
	actorID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RecordForexRetention: failed to get certificate identity: %w", err)
	}
	percentage, err := strconv.ParseFloat(retentionPercentageStr, 64)
	if err != nil {
		return fmt.Errorf("RecordForexRetention: invalid retention percentage: %w", err)
	}
	if err := ValidatePercentage(percentage, "retentionPercentage"); err != nil {
		return fmt.Errorf("RecordForexRetention: %w", err)
	}
	forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return fmt.Errorf("RecordForexRetention: failed to read forex: %w", err)
	}
	if forexJSON == nil {
		return fmt.Errorf("RecordForexRetention: forex %s does not exist", forexID)
	}
	var forex ForexAllocation
	if err := json.Unmarshal(forexJSON, &forex); err != nil {
		return fmt.Errorf("RecordForexRetention: failed to unmarshal forex: %w", err)
	}
	if forex.Status != "ALLOCATED" && forex.Status != "UTILIZED" {
		return fmt.Errorf("RecordForexRetention: retention can only be recorded for allocated forex, current status: %s", forex.Status)
	}
	if forex.RetentionStatus == "COMPLIED" {
		return fmt.Errorf("RecordForexRetention: compliant retention has already been recorded")
	}
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("RecordForexRetention: failed to get transaction timestamp: %w", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
	forex.RetentionPercentage = percentage
	forex.RetentionAmountUSD = forex.AllocatedAmount * percentage / 100
	forex.FCYAccountNumber = account
	forex.RetentionDate = txTime.Format(time.RFC3339)
	forex.RetentionStatus = "PENDING"
	if policy, policyErr := c.GetCurrentRetentionPolicy(ctx, "COFFEE"); policyErr == nil {
		if math.Abs(policy.RetentionRate-percentage) <= 0.0001 {
			forex.RetentionStatus = "COMPLIED"
		} else {
			forex.RetentionStatus = "NON_COMPLIANT"
		}
	}
	forex.UpdatedAt = txTime
	updatedForex, err := json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("RecordForexRetention: failed to marshal forex: %w", err)
	}
	if err := ctx.GetStub().PutState("FOREX_"+forexID, updatedForex); err != nil {
		return fmt.Errorf("RecordForexRetention: failed to save forex: %w", err)
	}
	changes := []FieldChange{
		{FieldName: "retentionPercentage", OldValue: "", NewValue: retentionPercentageStr, DataType: "number"},
		{FieldName: "retentionAmountUsd", OldValue: "", NewValue: fmt.Sprintf("%.2f", forex.RetentionAmountUSD), DataType: "number"},
		{FieldName: "fcyAccountNumber", OldValue: "", NewValue: account, DataType: "string"},
		{FieldName: "retentionStatus", OldValue: "", NewValue: forex.RetentionStatus, DataType: "string"},
	}
	if err := c.CreateAuditLog(ctx, "RECORD_RETENTION", "FOREX", forexID, "ALLOCATED", forex.RetentionStatus, changes,
		fmt.Sprintf("Retention recorded by %s (%s)", actorID, actorMSP), ComplianceMetadata{NBECompliance: forex.RetentionStatus == "COMPLIED"}); err != nil {
		return fmt.Errorf("RecordForexRetention: failed to create audit log: %w", err)
	}
	return nil
}

// ReadForex - Get forex details
func (c *CoffeeContract) ReadForex(ctx contractapi.TransactionContextInterface,
	forexID string) (*ForexAllocation, error) {

	forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return nil, fmt.Errorf("failed to read forex: %v", err)
	}
	if forexJSON == nil {
		return nil, fmt.Errorf("forex %s does not exist", forexID)
	}

	var forex ForexAllocation
	err = json.Unmarshal(forexJSON, &forex)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal forex: %v", err)
	}

	return &forex, nil
}

// QueryForexByExporter - Get all forex allocations for an exporter
func (c *CoffeeContract) QueryForexByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*ForexAllocation, error) {
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return nil, err
	}
	queryBytes, err := json.Marshal(map[string]interface{}{"selector": map[string]string{"exporterId": exporterID}})
	if err != nil {
		return nil, fmt.Errorf("failed to build exporter forex query: %w", err)
	}
	return c.queryForex(ctx, string(queryBytes))
}

// QueryAllForex - Get all forex allocations (optimized with CouchDB selector)
func (c *CoffeeContract) QueryAllForex(ctx contractapi.TransactionContextInterface) ([]*ForexAllocation, error) {
	// Use CouchDB rich query for better performance
	queryString := `{
		"selector": {
			"$and": [
				{"forexId": {"$exists": true}},
				{"_id": {"$regex": "^FOREX_"}}
			]
		},
		"limit": 1000
	}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		// Fallback to range query
		resultsIterator, err = ctx.GetStub().GetStateByRange("FOREX_", "FOREX_~")
		if err != nil {
			return nil, err
		}
	}
	defer resultsIterator.Close()

	var allocations []*ForexAllocation
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var allocation ForexAllocation
		err = json.Unmarshal(queryResponse.Value, &allocation)
		if err != nil {
			continue // Skip invalid documents
		}

		// Ensure screenedAgainst is never null (backward compatibility fix)
		if allocation.ScreenedAgainst == nil {
			allocation.ScreenedAgainst = []string{}
		}

		allocations = append(allocations, &allocation)
	}

	return allocations, nil
}

// QueryNewForex - Get only new forex allocations (with _v2 suffix) - working records
func (c *CoffeeContract) QueryNewForex(ctx contractapi.TransactionContextInterface) ([]*ForexAllocation, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("FOREX_", "FOREX_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var allocations []*ForexAllocation
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var allocation ForexAllocation
		err = json.Unmarshal(queryResponse.Value, &allocation)
		if err != nil {
			return nil, err
		}

		// Only include records with _v2 suffix (new format with proper schema)
		if strings.Contains(allocation.ForexID, "_v2") {
			// Ensure screenedAgainst is never null
			if allocation.ScreenedAgainst == nil {
				allocation.ScreenedAgainst = []string{}
			}
			allocations = append(allocations, &allocation)
		}
	}

	return allocations, nil
}

// QueryForexByStatus - Get all forex allocations with specific status
func (c *CoffeeContract) QueryForexByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ForexAllocation, error) {
	queryBytes, err := json.Marshal(map[string]interface{}{"selector": map[string]string{"status": status}})
	if err != nil {
		return nil, fmt.Errorf("failed to build forex status query: %w", err)
	}
	return c.queryForex(ctx, string(queryBytes))
}

// ForexExists - Check if forex exists
func (c *CoffeeContract) ForexExists(ctx contractapi.TransactionContextInterface,
	forexID string) (bool, error) {

	forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return false, fmt.Errorf("failed to read forex: %v", err)
	}
	return forexJSON != nil, nil
}

// QueryForexByContract - Get all forex allocations for a specific contract
func (c *CoffeeContract) QueryForexByContract(ctx contractapi.TransactionContextInterface,
	contractID string) ([]*ForexAllocation, error) {
	if err := ValidateID(contractID, "contractID"); err != nil {
		return nil, err
	}
	queryBytes, err := json.Marshal(map[string]interface{}{"selector": map[string]string{"contractId": contractID}})
	if err != nil {
		return nil, fmt.Errorf("failed to build contract forex query: %w", err)
	}
	return c.queryForex(ctx, string(queryBytes))
}

// Helper function for querying forex
func (c *CoffeeContract) queryForex(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*ForexAllocation, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query forex: %v", err)
	}
	defer resultsIterator.Close()

	var forexList []*ForexAllocation
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var forex ForexAllocation
		err = json.Unmarshal(queryResponse.Value, &forex)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal forex: %v", err)
		}

		// Ensure screenedAgainst is never null (backward compatibility fix)
		if forex.ScreenedAgainst == nil {
			forex.ScreenedAgainst = []string{}
		}

		forexList = append(forexList, &forex)
	}

	return forexList, nil
}

// ==================== NBE EXCHANGE RATE MANAGEMENT ====================

// SetExchangeRate - NBE sets official exchange rate
func (c *CoffeeContract) SetExchangeRate(ctx contractapi.TransactionContextInterface,
	rateID, currency, buyingRateStr, sellingRateStr, setBy string) error {
	if err := ValidateID(rateID, "rateID"); err != nil {
		return err
	}
	if err := ValidateCurrency(currency); err != nil {
		return err
	}
	if err := ValidateNonEmptyString(strings.TrimSpace(setBy), "setBy", MaxStringLen); err != nil {
		return err
	}
	if existing, err := ctx.GetStub().GetState("RATE_" + rateID); err != nil {
		return fmt.Errorf("failed to check duplicate rate ID: %w", err)
	} else if existing != nil {
		return fmt.Errorf("exchange rate %s already exists", rateID)
	}

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only NBE can set exchange rates
	if mspID != "NBEMSP" {
		return fmt.Errorf("unauthorized: only NBE can set exchange rates (caller: %s)", mspID)
	}

	buyingRate, err := strconv.ParseFloat(buyingRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid buying rate: %v", err)
	}

	sellingRate, err := strconv.ParseFloat(sellingRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid selling rate: %v", err)
	}

	if math.IsNaN(buyingRate) || math.IsInf(buyingRate, 0) || math.IsNaN(sellingRate) || math.IsInf(sellingRate, 0) {
		return fmt.Errorf("rates must be finite numbers")
	}
	if buyingRate <= 0 || sellingRate <= 0 {
		return fmt.Errorf("rates must be greater than zero")
	}

	if sellingRate < buyingRate {
		return fmt.Errorf("selling rate cannot be less than buying rate")
	}

	midRate := (buyingRate + sellingRate) / 2
	if math.IsNaN(midRate) || math.IsInf(midRate, 0) {
		return fmt.Errorf("calculated mid rate must be finite")
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Mark previous rate as superseded
	queryString := fmt.Sprintf(`{"selector":{"currency":"%s","status":"ACTIVE"}}`, currency)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return fmt.Errorf("failed to query active exchange rates: %w", err)
	}
	defer resultsIterator.Close()
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return fmt.Errorf("failed to read active exchange rate: %w", err)
		}
		var oldRate ExchangeRate
		if err := json.Unmarshal(queryResponse.Value, &oldRate); err != nil {
			return fmt.Errorf("failed to decode active exchange rate: %w", err)
		}
		oldRate.Status = "SUPERSEDED"
		oldRate.UpdatedAt = txTime
		oldRateJSON, err := json.Marshal(oldRate)
		if err != nil {
			return fmt.Errorf("failed to encode superseded exchange rate: %w", err)
		}
		if err := ctx.GetStub().PutState(queryResponse.Key, oldRateJSON); err != nil {
			return fmt.Errorf("failed to supersede exchange rate: %w", err)
		}
	}

	rate := ExchangeRate{
		RateID:        rateID,
		Currency:      currency,
		BuyingRate:    buyingRate,
		SellingRate:   sellingRate,
		MidRate:       midRate,
		EffectiveDate: txTime,
		SetBy:         setBy,
		Status:        "ACTIVE",
		CreatedAt:     txTime,
		UpdatedAt:     txTime,
	}

	rateJSON, err := json.Marshal(rate)
	if err != nil {
		return fmt.Errorf("failed to marshal rate: %v", err)
	}

	err = ctx.GetStub().PutState("RATE_"+rateID, rateJSON)
	if err != nil {
		return fmt.Errorf("failed to save rate: %v", err)
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "buyingRate", OldValue: "", NewValue: buyingRateStr, DataType: "float"},
		{FieldName: "sellingRate", OldValue: "", NewValue: sellingRateStr, DataType: "float"},
		{FieldName: "midRate", OldValue: "", NewValue: fmt.Sprintf("%.4f", midRate), DataType: "float"},
		{FieldName: "currency", OldValue: "", NewValue: currency, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true, // NBE sets official exchange rates
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("Exchange rate set by NBE for %s: buying=%.4f, selling=%.4f", currency, buyingRate, sellingRate),
	}

	auditErr := c.CreateAuditLog(ctx, "SET_RATE", "EXCHANGE_RATE", rateID, "", "ACTIVE", changes,
		fmt.Sprintf("NBE set exchange rate for %s", currency), compliance)
	if auditErr != nil {
		return fmt.Errorf("SetExchangeRate: failed to create audit log: %w", auditErr)
	}

	return nil
}

// GetCurrentExchangeRate - Get current active exchange rate for currency
func (c *CoffeeContract) GetCurrentExchangeRate(ctx contractapi.TransactionContextInterface,
	currency string) (*ExchangeRate, error) {
	if err := ValidateCurrency(currency); err != nil {
		return nil, err
	}

	queryString := fmt.Sprintf(`{"selector":{"currency":"%s","status":"ACTIVE"}}`, currency)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query rates: %v", err)
	}
	defer resultsIterator.Close()

	var current *ExchangeRate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get rate: %w", err)
		}
		var rate ExchangeRate
		if err := json.Unmarshal(queryResponse.Value, &rate); err != nil {
			return nil, fmt.Errorf("failed to unmarshal rate: %w", err)
		}
		if current == nil || rate.EffectiveDate.After(current.EffectiveDate) ||
			(rate.EffectiveDate.Equal(current.EffectiveDate) && rate.RateID > current.RateID) {
			copy := rate
			current = &copy
		}
	}
	if current == nil {
		return nil, fmt.Errorf("no active rate found for currency: %s", currency)
	}
	return current, nil
}

// QueryExchangeRateHistory - Get historical rates for currency
func (c *CoffeeContract) QueryExchangeRateHistory(ctx contractapi.TransactionContextInterface,
	currency string) ([]*ExchangeRate, error) {
	if err := ValidateCurrency(currency); err != nil {
		return nil, err
	}

	queryString := fmt.Sprintf(`{"selector":{"currency":"%s"}}`, currency)
	return c.queryExchangeRates(ctx, queryString)
}

// QueryAllExchangeRates - Get all exchange rates
func (c *CoffeeContract) QueryAllExchangeRates(ctx contractapi.TransactionContextInterface) ([]*ExchangeRate, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("RATE_", "RATE_~")
	if err != nil {
		return nil, fmt.Errorf("failed to get exchange rates: %v", err)
	}
	defer resultsIterator.Close()

	var rates []*ExchangeRate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate rates: %v", err)
		}

		var rate ExchangeRate
		err = json.Unmarshal(queryResponse.Value, &rate)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal rate: %v", err)
		}
		rates = append(rates, &rate)
	}

	return rates, nil
}

// QueryExchangeRate - Get specific exchange rate by currency (returns active rate)
func (c *CoffeeContract) QueryExchangeRate(ctx contractapi.TransactionContextInterface,
	currency string) (*ExchangeRate, error) {
	return c.GetCurrentExchangeRate(ctx, currency)
}

// queryExchangeRates - Helper function for querying exchange rates
func (c *CoffeeContract) queryExchangeRates(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*ExchangeRate, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query rates: %v", err)
	}
	defer resultsIterator.Close()

	var rates []*ExchangeRate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var rate ExchangeRate
		err = json.Unmarshal(queryResponse.Value, &rate)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal rate: %v", err)
		}
		rates = append(rates, &rate)
	}

	return rates, nil
}

// ==================== NBE RETENTION POLICY MANAGEMENT ====================

// SetRetentionPolicy - NBE sets forex retention policy for commodity
func (c *CoffeeContract) SetRetentionPolicy(ctx contractapi.TransactionContextInterface,
	policyID, commodityType, retentionRateStr, setBy, justification string) error {
	commodityType = strings.ToUpper(strings.TrimSpace(commodityType))
	if err := ValidateID(policyID, "policyID"); err != nil {
		return err
	}
	if err := ValidateID(commodityType, "commodityType"); err != nil {
		return err
	}
	if err := ValidateNonEmptyString(strings.TrimSpace(setBy), "setBy", MaxStringLen); err != nil {
		return err
	}
	if existing, err := ctx.GetStub().GetState("POLICY_" + policyID); err != nil {
		return fmt.Errorf("failed to check duplicate policy ID: %w", err)
	} else if existing != nil {
		return fmt.Errorf("retention policy %s already exists", policyID)
	}

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only NBE can set retention policies
	if mspID != "NBEMSP" {
		return fmt.Errorf("unauthorized: only NBE can set retention policies (caller: %s)", mspID)
	}

	retentionRate, err := strconv.ParseFloat(retentionRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid retention rate: %v", err)
	}

	if err := ValidatePercentage(retentionRate, "retention rate"); err != nil {
		return err
	}

	surrenderRate := 100 - retentionRate

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Mark previous policy as inactive
	queryString := fmt.Sprintf(`{"selector":{"commodityType":"%s","status":"ACTIVE"}}`, commodityType)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return fmt.Errorf("failed to query active retention policies: %w", err)
	}
	defer resultsIterator.Close()
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return fmt.Errorf("failed to read active retention policy: %w", err)
		}
		var oldPolicy RetentionPolicy
		if err := json.Unmarshal(queryResponse.Value, &oldPolicy); err != nil {
			return fmt.Errorf("failed to decode active retention policy: %w", err)
		}
		oldPolicy.Status = "INACTIVE"
		oldPolicy.ExpiryDate = txTime.Format(time.RFC3339)
		oldPolicy.UpdatedAt = txTime
		oldPolicyJSON, err := json.Marshal(oldPolicy)
		if err != nil {
			return fmt.Errorf("failed to encode inactive retention policy: %w", err)
		}
		if err := ctx.GetStub().PutState(queryResponse.Key, oldPolicyJSON); err != nil {
			return fmt.Errorf("failed to deactivate retention policy: %w", err)
		}
	}

	policy := RetentionPolicy{
		PolicyID:      policyID,
		CommodityType: commodityType,
		RetentionRate: retentionRate,
		SurrenderRate: surrenderRate,
		EffectiveDate: txTime,
		SetBy:         setBy,
		Justification: justification,
		Status:        "ACTIVE",
		CreatedAt:     txTime,
		UpdatedAt:     txTime,
	}

	policyJSON, err := json.Marshal(policy)
	if err != nil {
		return fmt.Errorf("failed to marshal policy: %v", err)
	}

	err = ctx.GetStub().PutState("POLICY_"+policyID, policyJSON)
	if err != nil {
		return fmt.Errorf("failed to save policy: %v", err)
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "retentionRate", OldValue: "", NewValue: retentionRateStr, DataType: "float"},
		{FieldName: "surrenderRate", OldValue: "", NewValue: fmt.Sprintf("%.2f", surrenderRate), DataType: "float"},
		{FieldName: "commodityType", OldValue: "", NewValue: commodityType, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  true, // NBE mandates forex retention policies
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("Retention policy set by NBE: %s retention, %s surrender. Justification: %s", retentionRateStr+"%", fmt.Sprintf("%.2f", surrenderRate)+"%", justification),
	}

	auditErr := c.CreateAuditLog(ctx, "SET_POLICY", "RETENTION_POLICY", policyID, "", "ACTIVE", changes,
		fmt.Sprintf("NBE set retention policy for %s: %s%% retention", commodityType, retentionRateStr), compliance)
	if auditErr != nil {
		return fmt.Errorf("SetRetentionPolicy: failed to create audit log: %w", auditErr)
	}

	return nil
}

// GetCurrentRetentionPolicy - Get active retention policy for commodity
func (c *CoffeeContract) GetCurrentRetentionPolicy(ctx contractapi.TransactionContextInterface,
	commodityType string) (*RetentionPolicy, error) {
	commodityType = strings.ToUpper(strings.TrimSpace(commodityType))
	if err := ValidateID(commodityType, "commodityType"); err != nil {
		return nil, err
	}

	queryString := fmt.Sprintf(`{"selector":{"commodityType":"%s","status":"ACTIVE"}}`, commodityType)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query policies: %v", err)
	}
	defer resultsIterator.Close()

	var current *RetentionPolicy
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get policy: %w", err)
		}
		var policy RetentionPolicy
		if err := json.Unmarshal(queryResponse.Value, &policy); err != nil {
			return nil, fmt.Errorf("failed to unmarshal policy: %w", err)
		}
		if current == nil || policy.EffectiveDate.After(current.EffectiveDate) ||
			(policy.EffectiveDate.Equal(current.EffectiveDate) && policy.PolicyID > current.PolicyID) {
			copy := policy
			current = &copy
		}
	}
	if current == nil {
		return nil, fmt.Errorf("no active retention policy found for: %s", commodityType)
	}
	return current, nil
}

// ==================== NBE PAYMENT OVERSIGHT ====================

// ApprovePaymentSettlement - NBE approves payment settlement
func (c *CoffeeContract) ApprovePaymentSettlement(ctx contractapi.TransactionContextInterface,
	paymentID, nbeOfficer, approvalRef string) error {

	// ✅ BLOCKCHAIN FEATURE: Capture MSP identity for non-repudiation
	approverMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %w", err)
	}

	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		approverID = approverMSP // Fallback to MSP name
	}

	// ✅ Access control: Only NBE can approve payment settlement
	if approverMSP != "NBEMSP" {
		return fmt.Errorf("only NBE can approve payment settlement (caller: %s)", approverMSP)
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

	if payment.Status != "SWIFT_RECEIVED" {
		return fmt.Errorf("payment cannot be approved for settlement, current status: %s", payment.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	payment.NBEApprovalRef = approvalRef
	payment.ApprovedBy = approverID     // ✅ Record WHO approved (X.509)
	payment.ApprovedByMSP = approverMSP // ✅ Record organization
	payment.VerifiedBy = nbeOfficer
	payment.Comments = "NBE approved for settlement"
	payment.UpdatedAt = txTime

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
}

// VerifyForexUtilization - NBE verifies forex was properly utilized
func (c *CoffeeContract) VerifyForexUtilization(ctx contractapi.TransactionContextInterface,
	forexID, paymentID string) error {

	// ✅ BLOCKCHAIN FEATURE: Capture MSP identity for non-repudiation
	verifierMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %w", err)
	}

	verifierID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		verifierID = verifierMSP // Fallback to MSP name
	}

	// ✅ Access control: Only NBE can verify forex utilization
	if verifierMSP != "NBEMSP" {
		return fmt.Errorf("only NBE can verify forex utilization (caller: %s)", verifierMSP)
	}

	// Read forex allocation
	forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return fmt.Errorf("failed to read forex: %v", err)
	}
	if forexJSON == nil {
		return fmt.Errorf("forex %s does not exist", forexID)
	}

	var forex ForexAllocation
	err = json.Unmarshal(forexJSON, &forex)
	if err != nil {
		return fmt.Errorf("failed to unmarshal forex: %v", err)
	}

	// Read payment
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

	if payment.Status != "SETTLED" {
		return fmt.Errorf("payment not yet settled")
	}

	// Verify amounts match
	if payment.Amount != forex.AllocatedAmount {
		forex.Comments = fmt.Sprintf("DISCREPANCY: Allocated %.2f but received %.2f",
			forex.AllocatedAmount, payment.Amount)
	} else {
		forex.Comments = "Forex utilization verified by NBE"
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	forex.Status = "UTILIZED"
	forex.UtilizedAmount = payment.Amount
	forex.UtilizationDate = txTime.Format(time.RFC3339)
	forex.VerifiedBy = verifierID     // ✅ Record WHO verified (X.509)
	forex.VerifiedByMSP = verifierMSP // ✅ Record organization
	forex.UpdatedAt = txTime

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	return ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
}

package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== FOREX ALLOCATION STRUCTURE ====================

type ForexAllocation struct {
	ForexID         string    `json:"forexId"`
	ContractID      string    `json:"contractId"`
	ExporterID      string    `json:"exporterId"`
	LCID            string    `json:"lcId"`
	RequestedAmount float64   `json:"requestedAmount"`
	AllocatedAmount float64   `json:"allocatedAmount"`
	Currency        string    `json:"currency"`
	ExchangeRate    float64   `json:"exchangeRate"`
	OfficialRate    float64   `json:"officialRate"`  // NBE official rate
	MarketRate      float64   `json:"marketRate"`    // Parallel market rate (if tracked)
	RetentionRate   float64   `json:"retentionRate"` // Percentage to be retained (NBE FXD/01/2024: 100% allowed)
	// Retention Policy Compliance (NBE Directive: 30-40% USD retention)
	RetentionPercentage float64 `json:"retentionPercentage"` // 30-40% as per NBE policy
	RetentionAmountUSD  float64 `json:"retentionAmountUsd"`  // Calculated retention amount
	FCYAccountNumber    string  `json:"fcyAccountNumber"`    // Foreign currency account
	RetentionStatus     string  `json:"retentionStatus"`     // PENDING, COMPLIED, NON_COMPLIANT
	RetentionDate       string  `json:"retentionDate"`       // Date retention was enforced
	// Sanction Screening (OFAC, UN, EU compliance)
	SanctionScreeningStatus string   `json:"sanctionScreeningStatus"` // PENDING, CLEARED, FLAGGED
	ScreenedAgainst         []string `json:"screenedAgainst"`         // [OFAC, UN, EU]
	ScreeningDate           string   `json:"screeningDate"`           // ISO date
	ScreeningOfficer        string   `json:"screeningOfficer"`        // NBE officer
	ScreeningNotes          string   `json:"screeningNotes"`          // Any flags or notes
	Status          string    `json:"status"`        // REQUESTED, APPROVED, ALLOCATED, UTILIZED, EXPIRED
	RequestDate     time.Time `json:"requestDate"`
	ApprovalDate    string    `json:"approvalDate"`
	AllocationDate  string    `json:"allocationDate"`
	UtilizationDate string    `json:"utilizationDate"`
	ExpiryDate      string    `json:"expiryDate"` // Forex allocation expiry
	UtilizedAmount  float64   `json:"utilizedAmount"`
	UtilizedBy      string    `json:"utilizedBy"`      // ✅ X.509 cert of utilizer
	UtilizedByMSP   string    `json:"utilizedByMsp"`   // ✅ MSP of utilizer
	VerifiedBy      string    `json:"verifiedBy"`      // ✅ X.509 cert of NBE verifier
	VerifiedByMSP   string    `json:"verifiedByMsp"`   // ✅ MSP of NBE verifier
	NBEOfficer      string    `json:"nbeOfficer"`
	NBEApprovalRef  string    `json:"nbeApprovalRef"` // NBE reference number
	Comments        string    `json:"comments"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
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

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	if amount <= 0 {
		return fmt.Errorf("amount must be greater than zero")
	}

	// NOTE: ALL state queries removed to prevent "Peer endorsements do not match" errors
	// In a multi-peer network with 6 peers, gossip protocol needs time to propagate
	// Checking if forex exists would query state and cause endorsement mismatches
	// NBE will validate everything (LC, Contract, duplicate forex) during allocation
	// This makes RequestForex a pure write operation with no read dependencies

	// Use the transaction timestamp so all endorsers produce the same state
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	forex := ForexAllocation{
		ForexID:         forexID,
		ContractID:      contractID,
		ExporterID:      exporterID,
		LCID:            "", // LC will be linked during allocation by NBE
		RequestedAmount: amount,
		Currency:        currency,
		Status:          "REQUESTED",
		RequestDate:     txTime,
		CreatedAt:       txTime,
		UpdatedAt:       txTime,
	}

	forexJSON, err := json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	return ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
}

// AllocateForex - NBE allocates foreign exchange with retention policy
// NOTE: LC ID now provided during allocation phase instead of request phase
func (c *CoffeeContract) AllocateForex(ctx contractapi.TransactionContextInterface,
	forexID, lcID, amountStr, exchangeRateStr, retentionRateStr, nbeOfficer, nbeApprovalRef, expiryDate string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("AllocateForex: failed to get MSP ID: %w", err)
	}

	// Only NBE can allocate forex
	if mspID != "NBEMSP" {
		return fmt.Errorf("AllocateForex: unauthorized: only NBE can allocate forex (caller: %s)", mspID)
	}

	// VALIDATION: IDs
	if err := ValidateID(forexID, "forexID"); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateID(lcID, "lcID"); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateNonEmptyString(nbeOfficer, "nbeOfficer", MaxStringLen); err != nil {
		return fmt.Errorf("AllocateForex: %w", err)
	}
	if err := ValidateNonEmptyString(nbeApprovalRef, "nbeApprovalRef", MaxStringLen); err != nil {
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

	if forex.Status != "REQUESTED" && forex.Status != "APPROVED" {
		return fmt.Errorf("forex cannot be allocated, current status: %s", forex.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	forex.Status = "ALLOCATED"
	forex.LCID = lcID // Link the LC at allocation time
	forex.AllocatedAmount = amount
	forex.ExchangeRate = exchangeRate
	forex.OfficialRate = exchangeRate
	forex.RetentionRate = retentionRate
	forex.NBEOfficer = nbeOfficer
	forex.NBEApprovalRef = nbeApprovalRef
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

	// Note: Exporter will need to create shipment manually
	// ECTA quality inspection will be triggered when shipment is created
	return nil
}

// UtilizeForex - Mark forex as utilized
func (c *CoffeeContract) UtilizeForex(ctx contractapi.TransactionContextInterface,
	forexID, utilizedAmountStr string) error {

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

	if utilizedAmount > forex.AllocatedAmount {
		return fmt.Errorf("utilized amount exceeds allocated amount")
	}

	// ✅ BLOCKCHAIN FEATURE: Capture MSP identity for non-repudiation
	utilizerMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %w", err)
	}

	utilizerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		utilizerID = utilizerMSP // Fallback to MSP name if X.509 cert unavailable
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	forex.Status = "UTILIZED"
	forex.UtilizedAmount = utilizedAmount
	forex.UtilizationDate = txTime.Format(time.RFC3339)
	forex.UtilizedBy = utilizerID         // ✅ Record WHO utilized
	forex.UtilizedByMSP = utilizerMSP     // ✅ Record organization
	forex.UpdatedAt = txTime

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	return ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
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

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryForex(ctx, queryString)
}

// QueryAllForex - Get all forex allocations
func (c *CoffeeContract) QueryAllForex(ctx contractapi.TransactionContextInterface) ([]*ForexAllocation, error) {
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
		allocations = append(allocations, &allocation)
	}

	return allocations, nil
}

// QueryForexByStatus - Get all forex allocations with specific status
func (c *CoffeeContract) QueryForexByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ForexAllocation, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryForex(ctx, queryString)
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

	queryString := fmt.Sprintf(`{"selector":{"contractId":"%s"}}`, contractID)
	return c.queryForex(ctx, queryString)
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
		forexList = append(forexList, &forex)
	}

	return forexList, nil
}

// ==================== NBE EXCHANGE RATE MANAGEMENT ====================

// SetExchangeRate - NBE sets official exchange rate
func (c *CoffeeContract) SetExchangeRate(ctx contractapi.TransactionContextInterface,
	rateID, currency, buyingRateStr, sellingRateStr, setBy string) error {

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

	if buyingRate <= 0 || sellingRate <= 0 {
		return fmt.Errorf("rates must be greater than zero")
	}

	if sellingRate < buyingRate {
		return fmt.Errorf("selling rate cannot be less than buying rate")
	}

	midRate := (buyingRate + sellingRate) / 2

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Mark previous rate as superseded
	queryString := fmt.Sprintf(`{"selector":{"currency":"%s","status":"ACTIVE"}}`, currency)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err == nil {
		defer resultsIterator.Close()
		for resultsIterator.HasNext() {
			queryResponse, err := resultsIterator.Next()
			if err == nil {
				var oldRate ExchangeRate
				json.Unmarshal(queryResponse.Value, &oldRate)
				oldRate.Status = "SUPERSEDED"
				oldRate.UpdatedAt = txTime
				oldRateJSON, _ := json.Marshal(oldRate)
				ctx.GetStub().PutState(queryResponse.Key, oldRateJSON)
			}
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

	return ctx.GetStub().PutState("RATE_"+rateID, rateJSON)
}

// GetCurrentExchangeRate - Get current active exchange rate for currency
func (c *CoffeeContract) GetCurrentExchangeRate(ctx contractapi.TransactionContextInterface,
	currency string) (*ExchangeRate, error) {

	queryString := fmt.Sprintf(`{"selector":{"currency":"%s","status":"ACTIVE"}}`, currency)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query rates: %v", err)
	}
	defer resultsIterator.Close()

	if resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get rate: %v", err)
		}

		var rate ExchangeRate
		err = json.Unmarshal(queryResponse.Value, &rate)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal rate: %v", err)
		}
		return &rate, nil
	}

	return nil, fmt.Errorf("no active rate found for currency: %s", currency)
}

// QueryExchangeRateHistory - Get historical rates for currency
func (c *CoffeeContract) QueryExchangeRateHistory(ctx contractapi.TransactionContextInterface,
	currency string) ([]*ExchangeRate, error) {

	queryString := fmt.Sprintf(`{"selector":{"currency":"%s"}}`, currency)
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

	if retentionRate < 0 || retentionRate > 100 {
		return fmt.Errorf("retention rate must be between 0 and 100")
	}

	surrenderRate := 100 - retentionRate

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Mark previous policy as inactive
	queryString := fmt.Sprintf(`{"selector":{"commodityType":"%s","status":"ACTIVE"}}`, commodityType)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err == nil {
		defer resultsIterator.Close()
		for resultsIterator.HasNext() {
			queryResponse, err := resultsIterator.Next()
			if err == nil {
				var oldPolicy RetentionPolicy
				json.Unmarshal(queryResponse.Value, &oldPolicy)
				oldPolicy.Status = "INACTIVE"
				oldPolicy.ExpiryDate = txTime.Format(time.RFC3339)
				oldPolicy.UpdatedAt = txTime
				oldPolicyJSON, _ := json.Marshal(oldPolicy)
				ctx.GetStub().PutState(queryResponse.Key, oldPolicyJSON)
			}
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

	return ctx.GetStub().PutState("POLICY_"+policyID, policyJSON)
}

// GetCurrentRetentionPolicy - Get active retention policy for commodity
func (c *CoffeeContract) GetCurrentRetentionPolicy(ctx contractapi.TransactionContextInterface,
	commodityType string) (*RetentionPolicy, error) {

	queryString := fmt.Sprintf(`{"selector":{"commodityType":"%s","status":"ACTIVE"}}`, commodityType)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query policies: %v", err)
	}
	defer resultsIterator.Close()

	if resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get policy: %v", err)
		}

		var policy RetentionPolicy
		err = json.Unmarshal(queryResponse.Value, &policy)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal policy: %v", err)
		}
		return &policy, nil
	}

	return nil, fmt.Errorf("no active retention policy found for: %s", commodityType)
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	payment.NBEApprovalRef = approvalRef
	payment.ApprovedBy = approverID      // ✅ Record WHO approved (X.509)
	payment.ApprovedByMSP = approverMSP  // ✅ Record organization
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	forex.Status = "UTILIZED"
	forex.UtilizedAmount = payment.Amount
	forex.UtilizationDate = txTime.Format(time.RFC3339)
	forex.VerifiedBy = verifierID      // ✅ Record WHO verified (X.509)
	forex.VerifiedByMSP = verifierMSP  // ✅ Record organization
	forex.UpdatedAt = txTime

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	return ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
}

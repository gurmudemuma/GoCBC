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
	ForexID           string    `json:"forexId"`
	ContractID        string    `json:"contractId"`
	ExporterID        string    `json:"exporterId"`
	LCID              string    `json:"lcId"`
	RequestedAmount   float64   `json:"requestedAmount"`
	AllocatedAmount   float64   `json:"allocatedAmount"`
	Currency          string    `json:"currency"`
	ExchangeRate      float64   `json:"exchangeRate"`
	OfficialRate      float64   `json:"officialRate"`      // NBE official rate
	MarketRate        float64   `json:"marketRate"`        // Parallel market rate (if tracked)
	RetentionRate     float64   `json:"retentionRate"`     // Percentage to be retained (e.g., 40%)
	Status            string    `json:"status"`            // REQUESTED, APPROVED, ALLOCATED, UTILIZED, EXPIRED
	RequestDate       time.Time `json:"requestDate"`
	ApprovalDate      string    `json:"approvalDate"`
	AllocationDate    string    `json:"allocationDate"`
	UtilizationDate   string    `json:"utilizationDate"`
	ExpiryDate        string    `json:"expiryDate"`        // Forex allocation expiry
	UtilizedAmount    float64   `json:"utilizedAmount"`
	NBEOfficer        string    `json:"nbeOfficer"`
	NBEApprovalRef    string    `json:"nbeApprovalRef"`    // NBE reference number
	Comments          string    `json:"comments"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// NBE Exchange Rate structure
type ExchangeRate struct {
	RateID          string    `json:"rateId"`
	Currency        string    `json:"currency"`        // USD, EUR, GBP, etc.
	BuyingRate      float64   `json:"buyingRate"`      // NBE buying rate
	SellingRate     float64   `json:"sellingRate"`     // NBE selling rate
	MidRate         float64   `json:"midRate"`         // Middle rate
	EffectiveDate   time.Time `json:"effectiveDate"`   // When rate becomes active
	SetBy           string    `json:"setBy"`           // NBE officer who set the rate
	Status          string    `json:"status"`          // ACTIVE, INACTIVE, SUPERSEDED
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// NBE Retention Policy structure
type RetentionPolicy struct {
	PolicyID        string    `json:"policyId"`
	CommodityType   string    `json:"commodityType"`   // COFFEE, GOLD, etc.
	RetentionRate   float64   `json:"retentionRate"`   // Percentage (e.g., 40%)
	SurrenderRate   float64   `json:"surrenderRate"`   // Percentage to convert to Birr
	EffectiveDate   time.Time `json:"effectiveDate"`
	ExpiryDate      string    `json:"expiryDate"`
	SetBy           string    `json:"setBy"`
	Justification   string    `json:"justification"`
	Status          string    `json:"status"`          // ACTIVE, INACTIVE
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// ==================== FOREX FUNCTIONS ====================

// RequestForex - Request foreign exchange allocation from NBE
func (c *CoffeeContract) RequestForex(ctx contractapi.TransactionContextInterface,
	forexID, contractID, exporterID, lcID, amountStr, currency string) error {

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	if amount <= 0 {
		return fmt.Errorf("amount must be greater than zero")
	}

	// Verify LC exists and is issued
	lcExists, err := c.LCExists(ctx, lcID)
	if err != nil {
		return fmt.Errorf("failed to check LC: %v", err)
	}
	if !lcExists {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	// Check if forex already exists
	existingForex, err := ctx.GetStub().GetState("FOREX_" + forexID)
	if err != nil {
		return fmt.Errorf("failed to read forex: %v", err)
	}
	if existingForex != nil {
		return fmt.Errorf("forex %s already exists", forexID)
	}

	forex := ForexAllocation{
		ForexID:         forexID,
		ContractID:      contractID,
		ExporterID:      exporterID,
		LCID:            lcID,
		RequestedAmount: amount,
		Currency:        currency,
		Status:          "REQUESTED",
		RequestDate:     time.Now(),
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	forexJSON, err := json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	return ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
}

// AllocateForex - NBE allocates foreign exchange with retention policy
func (c *CoffeeContract) AllocateForex(ctx contractapi.TransactionContextInterface,
	forexID, amountStr, exchangeRateStr, retentionRateStr, nbeOfficer, nbeApprovalRef, expiryDate string) error {

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	exchangeRate, err := strconv.ParseFloat(exchangeRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid exchange rate: %v", err)
	}

	retentionRate, err := strconv.ParseFloat(retentionRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid retention rate: %v", err)
	}

	if retentionRate < 0 || retentionRate > 100 {
		return fmt.Errorf("retention rate must be between 0 and 100")
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

	if forex.Status != "REQUESTED" && forex.Status != "APPROVED" {
		return fmt.Errorf("forex cannot be allocated, current status: %s", forex.Status)
	}

	forex.Status = "ALLOCATED"
	forex.AllocatedAmount = amount
	forex.ExchangeRate = exchangeRate
	forex.OfficialRate = exchangeRate
	forex.RetentionRate = retentionRate
	forex.NBEOfficer = nbeOfficer
	forex.NBEApprovalRef = nbeApprovalRef
	forex.ExpiryDate = expiryDate
	forex.AllocationDate = time.Now().Format(time.RFC3339)
	forex.UpdatedAt = time.Now()

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	return ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
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

	forex.Status = "UTILIZED"
	forex.UtilizedAmount = utilizedAmount
	forex.UtilizationDate = time.Now().Format(time.RFC3339)
	forex.UpdatedAt = time.Now()

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
				oldRate.UpdatedAt = time.Now()
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
		EffectiveDate: time.Now(),
		SetBy:         setBy,
		Status:        "ACTIVE",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
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

	retentionRate, err := strconv.ParseFloat(retentionRateStr, 64)
	if err != nil {
		return fmt.Errorf("invalid retention rate: %v", err)
	}

	if retentionRate < 0 || retentionRate > 100 {
		return fmt.Errorf("retention rate must be between 0 and 100")
	}

	surrenderRate := 100 - retentionRate

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
				oldPolicy.ExpiryDate = time.Now().Format(time.RFC3339)
				oldPolicy.UpdatedAt = time.Now()
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
		EffectiveDate: time.Now(),
		SetBy:         setBy,
		Justification: justification,
		Status:        "ACTIVE",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
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

	payment.NBEApprovalRef = approvalRef
	payment.VerifiedBy = nbeOfficer
	payment.Comments = "NBE approved for settlement"
	payment.UpdatedAt = time.Now()

	paymentJSON, err = json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment: %v", err)
	}

	return ctx.GetStub().PutState("PAYMENT_"+paymentID, paymentJSON)
}

// VerifyForexUtilization - NBE verifies forex was properly utilized
func (c *CoffeeContract) VerifyForexUtilization(ctx contractapi.TransactionContextInterface,
	forexID, paymentID string) error {

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

	forex.Status = "UTILIZED"
	forex.UtilizedAmount = payment.Amount
	forex.UtilizationDate = time.Now().Format(time.RFC3339)
	forex.UpdatedAt = time.Now()

	forexJSON, err = json.Marshal(forex)
	if err != nil {
		return fmt.Errorf("failed to marshal forex: %v", err)
	}

	return ctx.GetStub().PutState("FOREX_"+forexID, forexJSON)
}

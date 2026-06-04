package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== ECX LOT STRUCTURE ====================

type ECXLot struct {
	LotID             string    `json:"lotId"`
	ExporterID        string    `json:"exporterId"`
	CoffeeType        string    `json:"coffeeType"`
	Origin            string    `json:"origin"`
	Quantity          float64   `json:"quantity"`
	QualityGrade      string    `json:"qualityGrade"` // Grade 1-9
	QualityScore      float64   `json:"qualityScore"`
	WarehouseLocation string    `json:"warehouseLocation"`
	PricePerKg        float64   `json:"pricePerKg"`
	Status            string    `json:"status"` // REGISTERED, TRADING, SOLD, SHIPPED
	RegistrationDate  time.Time `json:"registrationDate"`
	SoldDate          string    `json:"soldDate"`
	BuyerID           string    `json:"buyerId"`
	ContractID        string    `json:"contractId"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// ==================== ECX FUNCTIONS ====================

// RegisterLot - Register coffee lot on ECX
func (c *CoffeeContract) RegisterLot(ctx contractapi.TransactionContextInterface,
	lotID, exporterID, coffeeType, origin, quantityStr, qualityGrade, qualityScoreStr,
	warehouseLocation, pricePerKgStr string) error {

	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity: %v", err)
	}

	qualityScore, err := strconv.ParseFloat(qualityScoreStr, 64)
	if err != nil {
		return fmt.Errorf("invalid quality score: %v", err)
	}

	pricePerKg, err := strconv.ParseFloat(pricePerKgStr, 64)
	if err != nil {
		return fmt.Errorf("invalid price: %v", err)
	}

	// Verify exporter exists
	exporterExists, err := c.ExporterExists(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("failed to check exporter: %v", err)
	}
	if !exporterExists {
		return fmt.Errorf("exporter %s does not exist", exporterID)
	}

	// Check if lot already exists
	existingLot, err := ctx.GetStub().GetState("LOT_" + lotID)
	if err != nil {
		return fmt.Errorf("failed to read lot: %v", err)
	}
	if existingLot != nil {
		return fmt.Errorf("lot %s already exists", lotID)
	}

	lot := ECXLot{
		LotID:             lotID,
		ExporterID:        exporterID,
		CoffeeType:        coffeeType,
		Origin:            origin,
		Quantity:          quantity,
		QualityGrade:      qualityGrade,
		QualityScore:      qualityScore,
		WarehouseLocation: warehouseLocation,
		PricePerKg:        pricePerKg,
		Status:            "REGISTERED",
		RegistrationDate:  time.Now(),
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	lotJSON, err := json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}

	return ctx.GetStub().PutState("LOT_"+lotID, lotJSON)
}

// UpdateLotPrice - Update lot price per kg
func (c *CoffeeContract) UpdateLotPrice(ctx contractapi.TransactionContextInterface,
	lotID, pricePerKgStr string) error {

	pricePerKg, err := strconv.ParseFloat(pricePerKgStr, 64)
	if err != nil {
		return fmt.Errorf("invalid price: %v", err)
	}

	if pricePerKg <= 0 {
		return fmt.Errorf("price must be greater than zero")
	}

	lotJSON, err := ctx.GetStub().GetState("LOT_" + lotID)
	if err != nil {
		return fmt.Errorf("failed to read lot: %v", err)
	}
	if lotJSON == nil {
		return fmt.Errorf("lot %s does not exist", lotID)
	}

	var lot ECXLot
	err = json.Unmarshal(lotJSON, &lot)
	if err != nil {
		return fmt.Errorf("failed to unmarshal lot: %v", err)
	}

	if lot.Status == "SOLD" || lot.Status == "SHIPPED" {
		return fmt.Errorf("cannot update price for lot with status: %s", lot.Status)
	}

	lot.PricePerKg = pricePerKg
	lot.UpdatedAt = time.Now()

	lotJSON, err = json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}

	return ctx.GetStub().PutState("LOT_"+lotID, lotJSON)
}

// UpdateLotStatus - Update lot status
func (c *CoffeeContract) UpdateLotStatus(ctx contractapi.TransactionContextInterface,
	lotID, newStatus, buyerID, contractID string) error {

	validStatuses := map[string]bool{
		"REGISTERED": true, "TRADING": true, "SOLD": true, "SHIPPED": true,
	}
	if !validStatuses[newStatus] {
		return fmt.Errorf("invalid status: %s", newStatus)
	}

	lotJSON, err := ctx.GetStub().GetState("LOT_" + lotID)
	if err != nil {
		return fmt.Errorf("failed to read lot: %v", err)
	}
	if lotJSON == nil {
		return fmt.Errorf("lot %s does not exist", lotID)
	}

	var lot ECXLot
	err = json.Unmarshal(lotJSON, &lot)
	if err != nil {
		return fmt.Errorf("failed to unmarshal lot: %v", err)
	}

	lot.Status = newStatus
	if newStatus == "SOLD" {
		lot.SoldDate = time.Now().Format(time.RFC3339)
		lot.BuyerID = buyerID
		lot.ContractID = contractID
	}
	lot.UpdatedAt = time.Now()

	lotJSON, err = json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}

	return ctx.GetStub().PutState("LOT_"+lotID, lotJSON)
}

// ReadLot - Get lot details
func (c *CoffeeContract) ReadLot(ctx contractapi.TransactionContextInterface,
	lotID string) (*ECXLot, error) {

	lotJSON, err := ctx.GetStub().GetState("LOT_" + lotID)
	if err != nil {
		return nil, fmt.Errorf("failed to read lot: %v", err)
	}
	if lotJSON == nil {
		return nil, fmt.Errorf("lot %s does not exist", lotID)
	}

	var lot ECXLot
	err = json.Unmarshal(lotJSON, &lot)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal lot: %v", err)
	}

	return &lot, nil
}

// QueryLotsByExporter - Get all lots for an exporter
func (c *CoffeeContract) QueryLotsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*ECXLot, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryLots(ctx, queryString)
}

// QueryLotsByStatus - Get all lots with specific status
func (c *CoffeeContract) QueryLotsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ECXLot, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryLots(ctx, queryString)
}

// Helper function for querying lots
func (c *CoffeeContract) queryLots(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*ECXLot, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query lots: %v", err)
	}
	defer resultsIterator.Close()

	var lots []*ECXLot
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var lot ECXLot
		err = json.Unmarshal(queryResponse.Value, &lot)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal lot: %v", err)
		}
		lots = append(lots, &lot)
	}

	return lots, nil
}

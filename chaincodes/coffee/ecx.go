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
	LotID                string    `json:"lotId"`
	ECXLotNumber         string    `json:"ecxLotNumber"` // Warehouse receipt number
	ExporterID           string    `json:"exporterId"`
	ExporterName         string    `json:"exporterName"`
	WarehouseID          string    `json:"warehouseId"`
	Origin               string    `json:"origin"`
	SubRegion            string    `json:"subRegion"`
	Quantity             float64   `json:"quantity"`         // kg
	Bags                 int       `json:"bags"`             // number of 60-kg bags
	ProcessingMethod     string    `json:"processingMethod"` // Washed / Natural / Honey
	HarvestSeason        string    `json:"harvestSeason"`
	Grade                string    `json:"grade"`           // Grade 1–5 or UG
	QualityScore         float64   `json:"qualityScore"`    // SCA cupping score
	MoistureContent      float64   `json:"moistureContent"` // % — max 12% for export
	DefectCount          int       `json:"defectCount"`     // per 300g
	GradingOfficer       string    `json:"gradingOfficer"`
	GradingRemarks       string    `json:"gradingRemarks"`
	PricePerKg           float64   `json:"pricePerKg"` // USD
	ContractID           string    `json:"contractId"` // Linked sales contract
	Status               string    `json:"status"`     // WAREHOUSED | GRADED | ASSIGNED | RELEASED | REJECTED
	WarehouseReceiptDate string    `json:"warehouseReceiptDate"`
	GradingDate          string    `json:"gradingDate"`
	AssignmentDate       string    `json:"assignmentDate"`
	ReleaseDate          string    `json:"releaseDate"`
	ReleaseNote          string    `json:"releaseNote"`
	RejectionReason      string    `json:"rejectionReason"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

// ==================== ECX CHAINCODE FUNCTIONS ====================

// RegisterECXLot — Step 1: Issue warehouse receipt when exporter delivers coffee
func (c *CoffeeContract) RegisterECXLot(ctx contractapi.TransactionContextInterface,
	lotID, ecxLotNumber, exporterID, exporterName, warehouseID,
	origin, subRegion, quantityStr, bagsStr,
	processingMethod, harvestSeason, receiptDate string) error {

	// Check duplicate
	existing, err := ctx.GetStub().GetState("ECXLOT_" + lotID)
	if err != nil {
		return fmt.Errorf("failed to check lot: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("ECX lot %s already exists", lotID)
	}

	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity: %v", err)
	}
	bags, _ := strconv.Atoi(bagsStr)
	if bags == 0 {
		bags = int(quantity/60) + 1
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	lot := ECXLot{
		LotID:                lotID,
		ECXLotNumber:         ecxLotNumber,
		ExporterID:           exporterID,
		ExporterName:         exporterName,
		WarehouseID:          warehouseID,
		Origin:               origin,
		SubRegion:            subRegion,
		Quantity:             quantity,
		Bags:                 bags,
		ProcessingMethod:     processingMethod,
		HarvestSeason:        harvestSeason,
		Status:               "WAREHOUSED",
		WarehouseReceiptDate: receiptDate,
		CreatedAt:            txTime,
		UpdatedAt:            txTime,
	}

	lotJSON, err := json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}
	return ctx.GetStub().PutState("ECXLOT_"+lotID, lotJSON)
}

// GradeECXLot — Step 2: ECX grader records inspection result
func (c *CoffeeContract) GradeECXLot(ctx contractapi.TransactionContextInterface,
	lotID, grade, qualityScoreStr, moistureStr, defectCountStr,
	gradingOfficer, remarks, gradingDate string) error {

	lotJSON, err := ctx.GetStub().GetState("ECXLOT_" + lotID)
	if err != nil || lotJSON == nil {
		return fmt.Errorf("ECX lot %s not found", lotID)
	}

	var lot ECXLot
	if err = json.Unmarshal(lotJSON, &lot); err != nil {
		return fmt.Errorf("failed to unmarshal lot: %v", err)
	}
	if lot.Status != "WAREHOUSED" {
		return fmt.Errorf("lot must be in WAREHOUSED status to grade, current: %s", lot.Status)
	}

	moisture, err := strconv.ParseFloat(moistureStr, 64)
	if err != nil {
		return fmt.Errorf("invalid moisture: %v", err)
	}
	if moisture > 12.0 {
		// Mark as rejected — not export eligible
		lot.Status = "REJECTED"
		lot.RejectionReason = fmt.Sprintf("Moisture content %.1f%% exceeds 12%% export limit", moisture)
		lot.MoistureContent = moisture
		lot.GradingOfficer = gradingOfficer
		lot.GradingDate = gradingDate
	} else {
		qualityScore, _ := strconv.ParseFloat(qualityScoreStr, 64)
		defectCount, _ := strconv.Atoi(defectCountStr)
		lot.Grade = grade
		lot.QualityScore = qualityScore
		lot.MoistureContent = moisture
		lot.DefectCount = defectCount
		lot.GradingOfficer = gradingOfficer
		lot.GradingRemarks = remarks
		lot.GradingDate = gradingDate
		lot.Status = "GRADED"
	}

	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	lot.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	updated, err := json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}
	return ctx.GetStub().PutState("ECXLOT_"+lotID, updated)
}

// AssignECXLot — Step 3: Link graded lot to a sales contract
func (c *CoffeeContract) AssignECXLot(ctx contractapi.TransactionContextInterface,
	lotID, contractID, pricePerKgStr, assignmentDate string) error {

	lotJSON, err := ctx.GetStub().GetState("ECXLOT_" + lotID)
	if err != nil || lotJSON == nil {
		return fmt.Errorf("ECX lot %s not found", lotID)
	}

	var lot ECXLot
	if err = json.Unmarshal(lotJSON, &lot); err != nil {
		return fmt.Errorf("failed to unmarshal lot: %v", err)
	}
	if lot.Status != "GRADED" {
		return fmt.Errorf("lot must be GRADED before assignment, current: %s", lot.Status)
	}

	pricePerKg, err := strconv.ParseFloat(pricePerKgStr, 64)
	if err != nil {
		return fmt.Errorf("invalid price: %v", err)
	}
	if pricePerKg < 5.0 {
		return fmt.Errorf("price $%.2f/kg is below NBE minimum of $5.00/kg", pricePerKg)
	}

	// Verify contract exists
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err != nil || contractJSON == nil {
		return fmt.Errorf("sales contract %s not found on blockchain", contractID)
	}

	lot.ContractID = contractID
	lot.PricePerKg = pricePerKg
	lot.AssignmentDate = assignmentDate
	lot.Status = "ASSIGNED"

	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	lot.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	updated, err := json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}
	return ctx.GetStub().PutState("ECXLOT_"+lotID, updated)
}

// ReleaseECXLot — Step 4: Release lot to exporter for shipping
func (c *CoffeeContract) ReleaseECXLot(ctx contractapi.TransactionContextInterface,
	lotID, releaseDate, note string) error {

	lotJSON, err := ctx.GetStub().GetState("ECXLOT_" + lotID)
	if err != nil || lotJSON == nil {
		return fmt.Errorf("ECX lot %s not found", lotID)
	}

	var lot ECXLot
	if err = json.Unmarshal(lotJSON, &lot); err != nil {
		return fmt.Errorf("failed to unmarshal lot: %v", err)
	}
	if lot.Status != "ASSIGNED" {
		return fmt.Errorf("lot must be ASSIGNED before release, current: %s", lot.Status)
	}

	lot.Status = "RELEASED"
	lot.ReleaseDate = releaseDate
	lot.ReleaseNote = note

	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	lot.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	updated, err := json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}
	return ctx.GetStub().PutState("ECXLOT_"+lotID, updated)
}

// ReadECXLot — Get a single lot
func (c *CoffeeContract) ReadECXLot(ctx contractapi.TransactionContextInterface, lotID string) (*ECXLot, error) {
	lotJSON, err := ctx.GetStub().GetState("ECXLOT_" + lotID)
	if err != nil || lotJSON == nil {
		return nil, fmt.Errorf("ECX lot %s not found", lotID)
	}
	var lot ECXLot
	if err = json.Unmarshal(lotJSON, &lot); err != nil {
		return nil, err
	}
	return &lot, nil
}

// QueryAllECXLots — Get all lots
func (c *CoffeeContract) QueryAllECXLots(ctx contractapi.TransactionContextInterface) ([]*ECXLot, error) {
	iter, err := ctx.GetStub().GetStateByRange("ECXLOT_", "ECXLOT_~")
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	var lots []*ECXLot
	for iter.HasNext() {
		resp, err := iter.Next()
		if err != nil {
			return nil, err
		}
		var lot ECXLot
		if err = json.Unmarshal(resp.Value, &lot); err != nil {
			continue
		}
		lots = append(lots, &lot)
	}
	return lots, nil
}

// QueryECXLotsByExporter — Get lots for a specific exporter
func (c *CoffeeContract) QueryECXLotsByExporter(ctx contractapi.TransactionContextInterface, exporterID string) ([]*ECXLot, error) {
	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	iter, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	var lots []*ECXLot
	for iter.HasNext() {
		resp, err := iter.Next()
		if err != nil {
			continue
		}
		var lot ECXLot
		if err = json.Unmarshal(resp.Value, &lot); err != nil {
			continue
		}
		lots = append(lots, &lot)
	}
	return lots, nil
}

// ==================== AUTOMATED ECX LOT RELEASE ====================

// ReleaseECXLotForShipment - Auto-release ECX lot when customs cleared
// This function should be called automatically when a shipment's customs clearance is approved
func (c *CoffeeContract) ReleaseECXLotForShipment(ctx contractapi.TransactionContextInterface,
	shipmentID, ecxLotNumber, releasedBy string) error {

	// Verify shipment exists and is customs cleared
	shipmentJSON, err := ctx.GetStub().GetState("SHIPMENT_" + shipmentID)
	if err != nil {
		return fmt.Errorf("failed to check shipment: %v", err)
	}
	if shipmentJSON == nil {
		return fmt.Errorf("shipment %s does not exist", shipmentID)
	}

	var shipment CoffeeShipment
	err = json.Unmarshal(shipmentJSON, &shipment)
	if err != nil {
		return fmt.Errorf("failed to unmarshal shipment: %v", err)
	}

	// Only release if customs cleared
	if shipment.Status != "CUSTOMS_CLEARED" {
		return fmt.Errorf("cannot release lot: shipment must be customs cleared (current status: %s)", shipment.Status)
	}

	// Find ECX lot by lot number
	queryString := fmt.Sprintf(`{"selector":{"ecxLotNumber":"%s"}}`, ecxLotNumber)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return fmt.Errorf("failed to query ECX lot: %v", err)
	}
	defer resultsIterator.Close()

	if !resultsIterator.HasNext() {
		return fmt.Errorf("ECX lot %s not found", ecxLotNumber)
	}

	queryResponse, err := resultsIterator.Next()
	if err != nil {
		return fmt.Errorf("failed to get ECX lot: %v", err)
	}

	var lot ECXLot
	err = json.Unmarshal(queryResponse.Value, &lot)
	if err != nil {
		return fmt.Errorf("failed to unmarshal ECX lot: %v", err)
	}

	// Check lot status
	if lot.Status == "RELEASED" {
		return fmt.Errorf("ECX lot %s already released", ecxLotNumber)
	}

	if lot.Status != "ASSIGNED" {
		return fmt.Errorf("ECX lot must be ASSIGNED before release (current status: %s)", lot.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Release lot
	lot.Status = "RELEASED"
	lot.ReleaseDate = txTime.Format(time.RFC3339)
	lot.ReleaseNote = fmt.Sprintf("Auto-released for shipment %s after customs clearance by %s", shipmentID, releasedBy)
	lot.UpdatedAt = txTime

	lotJSON, err := json.Marshal(lot)
	if err != nil {
		return fmt.Errorf("failed to marshal lot: %v", err)
	}

	err = ctx.GetStub().PutState("ECXLOT_"+lot.LotID, lotJSON)
	if err != nil {
		return fmt.Errorf("failed to update lot: %v", err)
	}

	fmt.Printf("✅ ECX lot %s auto-released for shipment %s\n", ecxLotNumber, shipmentID)
	return nil
}

// QueryECXLotsByStatus - Get lots by status (WAREHOUSED, GRADED, ASSIGNED, RELEASED)
func (c *CoffeeContract) QueryECXLotsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ECXLot, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query ECX lots: %v", err)
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

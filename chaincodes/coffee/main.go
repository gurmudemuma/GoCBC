package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type CoffeeContract struct {
	contractapi.Contract
}

// Basic CoffeeShipment structure that works
type CoffeeShipment struct {
	ShipmentID       string    `json:"shipmentId"`
	ContractID       string    `json:"contractId"`          // Link to sales contract
	ExporterID       string    `json:"exporterId"`
	BuyerID          string    `json:"buyerId"`
	Origin           string    `json:"origin"`
	Quantity         float64   `json:"quantity"`
	Grade            string    `json:"grade"`
	ICONumber        string    `json:"icoNumber"`
	ECXLotNumber     string    `json:"ecxLotNumber"`
	Status           string    `json:"status"`
	Channel          string    `json:"channel"`
	ForexRate        float64   `json:"forexRate"`
	ValueUSD         float64   `json:"valueUsd"`
	EUDRCompliant    bool      `json:"eudrCompliant"`
	BillOfLadingNo   string    `json:"billOfLadingNo"`      // B/L number
	BillOfLadingDate string    `json:"billOfLadingDate"`    // B/L issue date
	VesselName       string    `json:"vesselName"`          // Vessel/truck name
	DeparturePort    string    `json:"departurePort"`       // Port of departure
	DestinationPort  string    `json:"destinationPort"`     // Port of destination
	EstimatedArrival string    `json:"estimatedArrival"`    // ETA
	ActualArrival    string    `json:"actualArrival"`       // Actual arrival date
	TrackingNumber   string    `json:"trackingNumber"`      // GPS/Container tracking
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// 2026 Compliance Extensions
type Exporter struct {
	ExporterID                   string    `json:"exporterId"`
	CompanyName                  string    `json:"companyName"`
	ECTALicenseNumber            string    `json:"ectaLicenseNumber"`
	LicenseStatus                string    `json:"licenseStatus"`
	ExporterType                 string    `json:"exporterType"`                 // Added: private, company, individual
	CapitalRequirement           float64   `json:"capitalRequirement"`
	LaboratoryCertified          bool      `json:"laboratoryCertified"`
	LaboratoryCertificateNumber  string    `json:"laboratoryCertificateNumber"`  // Added: ECTA lab certificate
	ProfessionalTaster           string    `json:"professionalTaster"`
	TasterCertificate            string    `json:"tasterCertificate"`
	LicenseExpiryDate            string    `json:"licenseExpiryDate"` // Using string to avoid schema issues
	CreatedAt                    time.Time `json:"createdAt"`
	UpdatedAt                    time.Time `json:"updatedAt"`
}

type SalesContract struct {
	ContractID            string    `json:"contractId"`
	NBEReferenceNumber    string    `json:"nbeReferenceNumber"`
	ExporterID            string    `json:"exporterId"`
	BuyerID               string    `json:"buyerId"`
	BuyerCountry          string    `json:"buyerCountry"`
	BuyerBank             string    `json:"buyerBank"`             // Issuing bank (buyer's bank)
	ExporterBank          string    `json:"exporterBank"`          // Advising/Beneficiary bank (exporter's bank)
	CoffeeType            string    `json:"coffeeType"`
	Quantity              float64   `json:"quantity"`
	PricePerKg            float64   `json:"pricePerKg"`
	TotalValue            float64   `json:"totalValue"`
	Currency              string    `json:"currency"`
	MinimumPriceCompliant bool      `json:"minimumPriceCompliant"`
	EUDRRequired          bool      `json:"eudrRequired"`
	ContractStatus        string    `json:"contractStatus"`
	RegistrationDate      time.Time `json:"registrationDate"`
	ApprovalDate          string    `json:"approvalDate"` // Using string to avoid schema issues
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}
func (c *CoffeeContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// ==================== EXPORTER MANAGEMENT ====================

func (c *CoffeeContract) RegisterExporter(ctx contractapi.TransactionContextInterface,
	exporterID, companyName, ectaLicenseNumber, exporterType, capitalRequirementStr, 
	professionalTaster, tasterCertificate, laboratoryCertificateNumber, licenseExpiryDate string) error {
	
	// Convert parameters
	capitalRequirement, err := strconv.ParseFloat(capitalRequirementStr, 64)
	if err != nil {
		return fmt.Errorf("invalid capital requirement: %v", err)
	}
	
	// Validate exporter type
	validTypes := map[string]bool{
		"private":    true,
		"company":    true,
		"individual": true,
	}
	if exporterType != "" && !validTypes[exporterType] {
		return fmt.Errorf("invalid exporter type: %s. Must be private, company, or individual", exporterType)
	}
	
	// Check if exporter already exists
	exists, err := c.ExporterExists(ctx, exporterID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("exporter %s already exists", exporterID)
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	exporter := Exporter{
		ExporterID:                  exporterID,
		CompanyName:                 companyName,
		ECTALicenseNumber:           ectaLicenseNumber,
		LicenseStatus:               "ACTIVE",
		ExporterType:                exporterType,
		CapitalRequirement:          capitalRequirement,
		LaboratoryCertified:         false,
		LaboratoryCertificateNumber: laboratoryCertificateNumber,
		ProfessionalTaster:          professionalTaster,
		TasterCertificate:           tasterCertificate,
		LicenseExpiryDate:           licenseExpiryDate,
		CreatedAt:                   timestamp,
		UpdatedAt:                   timestamp,
	}
	
	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
}

func (c *CoffeeContract) ReadExporter(ctx contractapi.TransactionContextInterface, exporterID string) (*Exporter, error) {
	exporterJSON, err := ctx.GetStub().GetState("EXPORTER_" + exporterID)
	if err != nil {
		return nil, fmt.Errorf("failed to read exporter: %v", err)
	}
	if exporterJSON == nil {
		return nil, fmt.Errorf("exporter %s does not exist", exporterID)
	}
	
	var exporter Exporter
	err = json.Unmarshal(exporterJSON, &exporter)
	if err != nil {
		return nil, err
	}
	
	return &exporter, nil
}

func (c *CoffeeContract) ExporterExists(ctx contractapi.TransactionContextInterface, exporterID string) (bool, error) {
	exporterJSON, err := ctx.GetStub().GetState("EXPORTER_" + exporterID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	
	return exporterJSON != nil, nil
}
// ==================== SALES CONTRACT MANAGEMENT ====================

func (c *CoffeeContract) RegisterSalesContract(ctx contractapi.TransactionContextInterface,
	contractID, exporterID, buyerID, buyerCountry, coffeeType, quantityStr, 
	pricePerKgStr, currency, eudrRequiredStr, buyerBank, exporterBank string) error {
	
	log.Printf("=== RegisterSalesContract called: contractID=%s, exporterID=%s ===", contractID, exporterID)
	
	// Convert parameters
	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity: %v", err)
	}
	
	pricePerKg, err := strconv.ParseFloat(pricePerKgStr, 64)
	if err != nil {
		return fmt.Errorf("invalid price per kg: %v", err)
	}
	
	eudrRequired, err := strconv.ParseBool(eudrRequiredStr)
	if err != nil {
		return fmt.Errorf("invalid EUDR required flag: %v", err)
	}
	
	// Check if contract already exists
	exists, err := c.SalesContractExists(ctx, contractID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("sales contract %s already exists", contractID)
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	// Generate NBE reference number
	nbeReferenceNumber := fmt.Sprintf("NBE-%s-%d", contractID, timestamp.Unix())
	
	totalValue := quantity * pricePerKg
	minimumPriceCompliant := pricePerKg >= 5.0 // Simplified minimum price check
	
	contract := SalesContract{
		ContractID:            contractID,
		NBEReferenceNumber:    nbeReferenceNumber,
		ExporterID:            exporterID,
		BuyerID:               buyerID,
		BuyerCountry:          buyerCountry,
		BuyerBank:             buyerBank,
		ExporterBank:          exporterBank,
		CoffeeType:            coffeeType,
		Quantity:              quantity,
		PricePerKg:            pricePerKg,
		TotalValue:            totalValue,
		Currency:              currency,
		MinimumPriceCompliant: minimumPriceCompliant,
		EUDRRequired:          eudrRequired,
		ContractStatus:        "REGISTERED",
		RegistrationDate:      timestamp,
		ApprovalDate:          "",
		CreatedAt:             timestamp,
		UpdatedAt:             timestamp,
	}
	
	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return err
	}
	
	key := "CONTRACT_" + contractID
	log.Printf("Storing contract with key: %s", key)
	err = ctx.GetStub().PutState(key, contractJSON)
	if err != nil {
		log.Printf("ERROR: PutState failed for key %s: %v", key, err)
		return err
	}
	
	log.Printf("=== RegisterSalesContract completed successfully: %s ===", key)
	return nil
}

func (c *CoffeeContract) ReadSalesContract(ctx contractapi.TransactionContextInterface, contractID string) (*SalesContract, error) {
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to read sales contract: %v", err)
	}
	if contractJSON == nil {
		return nil, fmt.Errorf("sales contract %s does not exist", contractID)
	}
	
	var contract SalesContract
	err = json.Unmarshal(contractJSON, &contract)
	if err != nil {
		return nil, err
	}
	
	return &contract, nil
}

func (c *CoffeeContract) SalesContractExists(ctx contractapi.TransactionContextInterface, contractID string) (bool, error) {
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	
	return contractJSON != nil, nil
}

func (c *CoffeeContract) ApproveSalesContract(ctx contractapi.TransactionContextInterface, contractID string) error {
	contract, err := c.ReadSalesContract(ctx, contractID)
	if err != nil {
		return err
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	contract.ContractStatus = "APPROVED"
	contract.ApprovalDate = timestamp.Format(time.RFC3339)
	contract.UpdatedAt = timestamp
	
	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().PutState("CONTRACT_"+contractID, contractJSON)
}

func (c *CoffeeContract) UpdateExporterLaboratory(ctx contractapi.TransactionContextInterface, exporterID string, certifiedStr string) error {
	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return err
	}
	
	certified, err := strconv.ParseBool(certifiedStr)
	if err != nil {
		return fmt.Errorf("invalid certified flag: %v", err)
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	exporter.LaboratoryCertified = certified
	exporter.UpdatedAt = timestamp
	
	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
}

func (c *CoffeeContract) UpdateExporterStatus(ctx contractapi.TransactionContextInterface, exporterID string, status string) error {
	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return err
	}
	
	// Validate status
	validStatuses := map[string]bool{
		"ACTIVE":    true,
		"SUSPENDED": true,
		"EXPIRED":   true,
		"REVOKED":   true,
	}
	
	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %s. Must be ACTIVE, SUSPENDED, EXPIRED, or REVOKED", status)
	}
	
	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	exporter.LicenseStatus = status
	exporter.UpdatedAt = timestamp
	
	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
}

// SuspendExporter - ECTA suspends exporter license
func (c *CoffeeContract) SuspendExporter(ctx contractapi.TransactionContextInterface, 
	exporterID, reason string) error {
	
	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return err
	}
	
	if exporter.LicenseStatus == "REVOKED" {
		return fmt.Errorf("cannot suspend revoked license")
	}
	
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	exporter.LicenseStatus = "SUSPENDED"
	exporter.UpdatedAt = timestamp
	
	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
}

// RevokeExporterLicense - ECTA permanently revokes exporter license
func (c *CoffeeContract) RevokeExporterLicense(ctx contractapi.TransactionContextInterface, 
	exporterID, reason string) error {
	
	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return err
	}
	
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	
	exporter.LicenseStatus = "REVOKED"
	exporter.UpdatedAt = timestamp
	
	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
}

// ==================== SHIPMENT MANAGEMENT ====================

func (c *CoffeeContract) CreateShipment(ctx contractapi.TransactionContextInterface, 
	shipmentID, contractID, exporterID, buyerID, origin, quantityStr, grade, icoNumber, 
	ecxLotNumber, channel, forexRateStr, valueUSDStr, eudrCompliantStr string) error {
	
	fmt.Printf("=== CreateShipment called: shipmentID=%s, contractID=%s ===\n", shipmentID, contractID)

	// Fetch contract data for auto-mapping
	fmt.Printf("CreateShipment: Fetching contract %s for data mapping...\n", contractID)
	contractJSON, err := ctx.GetStub().GetState("CONTRACT_" + contractID)
	if err != nil {
		return fmt.Errorf("failed to read contract: %v", err)
	}
	if contractJSON == nil {
		return fmt.Errorf("contract %s does not exist", contractID)
	}

	var contract SalesContract
	err = json.Unmarshal(contractJSON, &contract)
	if err != nil {
		return fmt.Errorf("failed to unmarshal contract: %v", err)
	}
	fmt.Printf("CreateShipment: Contract data loaded for mapping\n")

	// AUTO-MAP: Exporter ID from contract if not provided
	mappedExporterID := exporterID
	if mappedExporterID == "" || mappedExporterID == "AUTO" {
		mappedExporterID = contract.ExporterID
		fmt.Printf("CreateShipment: Auto-mapped exporterID: %s\n", mappedExporterID)
	}

	// AUTO-MAP: Buyer ID from contract if not provided
	mappedBuyerID := buyerID
	if mappedBuyerID == "" || mappedBuyerID == "AUTO" {
		mappedBuyerID = contract.BuyerID
		fmt.Printf("CreateShipment: Auto-mapped buyerID: %s\n", mappedBuyerID)
	}

	// AUTO-MAP: Quantity from contract if not provided or zero
	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil || quantity == 0 || quantity == 1 {
		quantity = contract.Quantity
		fmt.Printf("CreateShipment: Auto-mapped quantity: %f kg\n", quantity)
	}

	// Try to find forex allocation for this contract to get exchange rate
	forexRate, err := strconv.ParseFloat(forexRateStr, 64)
	if err != nil || forexRate == 0 || forexRate == 1 {
		// Search for forex allocation linked to this contract
		fmt.Printf("CreateShipment: Searching for forex allocation...\n")
		forexIterator, err := ctx.GetStub().GetStateByRange("FOREX_", "FOREX_~")
		if err == nil {
			defer forexIterator.Close()
			for forexIterator.HasNext() {
				response, err := forexIterator.Next()
				if err == nil {
					var forex ForexAllocation
					if json.Unmarshal(response.Value, &forex) == nil {
						if forex.ContractID == contractID && forex.Status == "ALLOCATED" {
							forexRate = forex.ExchangeRate
							fmt.Printf("CreateShipment: Auto-mapped forexRate from allocation: %f\n", forexRate)
							break
						}
					}
				}
			}
		}
		if forexRate == 0 || forexRate == 1 {
			forexRate = 120.0 // Default fallback
			fmt.Printf("CreateShipment: Using default forexRate: %f\n", forexRate)
		}
	}

	// AUTO-MAP: Value USD from contract if not provided
	valueUSD, err := strconv.ParseFloat(valueUSDStr, 64)
	if err != nil || valueUSD == 0 || valueUSD == 1 {
		valueUSD = contract.TotalValue
		fmt.Printf("CreateShipment: Auto-mapped valueUSD: %f\n", valueUSD)
	}
	
	// AUTO-MAP: EUDR compliance from contract if not provided
	eudrCompliant := false
	if eudrCompliantStr == "" || eudrCompliantStr == "AUTO" {
		eudrCompliant = contract.EUDRRequired
		fmt.Printf("CreateShipment: Auto-mapped eudrCompliant: %v\n", eudrCompliant)
	} else {
		eudrCompliant, err = strconv.ParseBool(eudrCompliantStr)
		if err != nil {
			return fmt.Errorf("invalid EUDR compliant flag: %v", err)
		}
	}
	
	exists, err := c.ShipmentExists(ctx, shipmentID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("shipment %s already exists", shipmentID)
	}

	// Use transaction timestamp for deterministic behavior
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	shipment := CoffeeShipment{
		ShipmentID:    shipmentID,
		ContractID:    contractID,
		ExporterID:    mappedExporterID,
		BuyerID:       mappedBuyerID,
		Origin:        origin,
		Quantity:      quantity,
		Grade:         grade,
		ICONumber:     icoNumber,
		ECXLotNumber:  ecxLotNumber,
		Status:        "CREATED",
		Channel:       channel,
		ForexRate:     forexRate,
		ValueUSD:      valueUSD,
		EUDRCompliant: eudrCompliant,
		CreatedAt:     timestamp,
		UpdatedAt:     timestamp,
	}

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(shipmentID, shipmentJSON)
	if err != nil {
		return err
	}

	fmt.Printf("CreateShipment: Shipment created with auto-mapped data, requesting quality inspection...\n")

	// AUTO-TRIGGER: Request ECTA quality inspection
	// AUTO-MAPS: Shipment ID, Contract ID, Exporter ID
	inspectionID := "INSPECTION_" + shipmentID
	
	inspection := QualityInspection{
		InspectionID:   inspectionID,
		ShipmentID:     shipmentID,
		ContractID:     contractID,       // AUTO-MAPPED from shipment
		ExporterID:     mappedExporterID, // AUTO-MAPPED from contract/shipment
		Status:         "PENDING",
		CreatedAt:      timestamp,
		UpdatedAt:      timestamp,
	}

	inspectionJSON, err := json.Marshal(inspection)
	if err != nil {
		fmt.Printf("CreateShipment WARNING: failed to marshal inspection: %v\n", err)
		// Don't fail shipment creation if inspection creation fails
	} else {
		err = ctx.GetStub().PutState(inspectionID, inspectionJSON)
		if err != nil {
			fmt.Printf("CreateShipment WARNING: failed to save inspection: %v\n", err)
		} else {
			fmt.Printf("CreateShipment: Inspection %s auto-created with mapped data\n", inspectionID)
		}
	}

	fmt.Printf("=== CreateShipment completed successfully with data auto-mapping ===\n")
	return nil
}

func (c *CoffeeContract) ReadShipment(ctx contractapi.TransactionContextInterface, shipmentID string) (*CoffeeShipment, error) {
	shipmentJSON, err := ctx.GetStub().GetState(shipmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read shipment: %v", err)
	}
	if shipmentJSON == nil {
		return nil, fmt.Errorf("shipment %s does not exist", shipmentID)
	}

	var shipment CoffeeShipment
	err = json.Unmarshal(shipmentJSON, &shipment)
	if err != nil {
		return nil, err
	}

	return &shipment, nil
}

func (c *CoffeeContract) UpdateShipmentStatus(ctx contractapi.TransactionContextInterface, 
	shipmentID, newStatus string) error {
	
	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return err
	}

	// Use transaction timestamp for deterministic behavior
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	shipment.Status = newStatus
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(shipmentID, shipmentJSON)
}

// RecordBillOfLading - Shipping company records Bill of Lading details
func (c *CoffeeContract) RecordBillOfLading(ctx contractapi.TransactionContextInterface,
	shipmentID, billOfLadingNo, vesselName, departurePort, destinationPort, 
	estimatedArrival, trackingNumber string) error {
	
	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return err
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	shipment.BillOfLadingNo = billOfLadingNo
	shipment.BillOfLadingDate = timestamp.Format(time.RFC3339)
	shipment.VesselName = vesselName
	shipment.DeparturePort = departurePort
	shipment.DestinationPort = destinationPort
	shipment.EstimatedArrival = estimatedArrival
	shipment.TrackingNumber = trackingNumber
	shipment.Status = "LOADED"
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(shipmentID, shipmentJSON)
}

// UpdateShipmentLocation - Update shipment GPS location/status
func (c *CoffeeContract) UpdateShipmentLocation(ctx contractapi.TransactionContextInterface,
	shipmentID, location, status string) error {
	
	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return err
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	shipment.Status = status
	shipment.UpdatedAt = timestamp

	// If arrived, record actual arrival
	if status == "ARRIVED" || status == "DELIVERED" {
		shipment.ActualArrival = timestamp.Format(time.RFC3339)
	}

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(shipmentID, shipmentJSON)
}

func (c *CoffeeContract) ShipmentExists(ctx contractapi.TransactionContextInterface, shipmentID string) (bool, error) {
	shipmentJSON, err := ctx.GetStub().GetState(shipmentID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return shipmentJSON != nil, nil
}
func (c *CoffeeContract) GetShipmentHistory(ctx contractapi.TransactionContextInterface, shipmentID string) ([]map[string]interface{}, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(shipmentID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var history []map[string]interface{}
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var shipment CoffeeShipment
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &shipment)
			if err != nil {
				return nil, err
			}
		}

		record := map[string]interface{}{
			"txId":      response.TxId,
			"timestamp": response.Timestamp,
			"isDelete":  response.IsDelete,
			"value":     shipment,
		}
		history = append(history, record)
	}

	return history, nil
}

func (c *CoffeeContract) QueryAllAssets(ctx contractapi.TransactionContextInterface) ([]*CoffeeShipment, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*CoffeeShipment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Skip non-shipment records (those with prefixes)
		if len(queryResponse.Key) > 0 && 
		   (queryResponse.Key[:9] == "EXPORTER_" || 
		    queryResponse.Key[:9] == "CONTRACT_") {
			continue
		}

		var asset CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			continue // Skip if not a shipment record
		}
		assets = append(assets, &asset)
	}

	return assets, nil
}

// ==================== 2026 COMPLIANCE QUERIES ====================

func (c *CoffeeContract) QueryAllExporters(ctx contractapi.TransactionContextInterface) ([]*Exporter, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("EXPORTER_", "EXPORTER_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var exporters []*Exporter
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var exporter Exporter
		err = json.Unmarshal(queryResponse.Value, &exporter)
		if err != nil {
			return nil, err
		}
		exporters = append(exporters, &exporter)
	}

	return exporters, nil
}

func (c *CoffeeContract) QueryAllContracts(ctx contractapi.TransactionContextInterface) ([]*SalesContract, error) {
	log.Println("=== QueryAllContracts called ===")
	resultsIterator, err := ctx.GetStub().GetStateByRange("CONTRACT_", "CONTRACT_~")
	if err != nil {
		log.Printf("ERROR: GetStateByRange failed: %v", err)
		return nil, err
	}
	defer resultsIterator.Close()

	var contracts []*SalesContract
	count := 0
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			log.Printf("ERROR: Iterator.Next() failed: %v", err)
			return nil, err
		}
		
		count++
		log.Printf("Found contract key: %s", queryResponse.Key)

		var contract SalesContract
		err = json.Unmarshal(queryResponse.Value, &contract)
		if err != nil {
			log.Printf("ERROR: Failed to unmarshal contract %s: %v", queryResponse.Key, err)
			return nil, err
		}
		contracts = append(contracts, &contract)
	}

	log.Printf("=== QueryAllContracts completed: Found %d contracts ===", count)
	return contracts, nil
}

// ==================== ADVANCED 2026 FEATURES ====================

func (c *CoffeeContract) QueryShipmentsByExporter(ctx contractapi.TransactionContextInterface, exporterID string) ([]*CoffeeShipment, error) {
	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var shipments []*CoffeeShipment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var shipment CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &shipment)
		if err != nil {
			return nil, err
		}
		shipments = append(shipments, &shipment)
	}

	return shipments, nil
}

// QueryContractsByExporter - Get all sales contracts for a specific exporter
func (c *CoffeeContract) QueryContractsByExporter(ctx contractapi.TransactionContextInterface, exporterID string) ([]*SalesContract, error) {
	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query contracts by exporter: %v", err)
	}
	defer resultsIterator.Close()

	var contracts []*SalesContract
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var contract SalesContract
		err = json.Unmarshal(queryResponse.Value, &contract)
		if err != nil {
			return nil, err
		}
		contracts = append(contracts, &contract)
	}

	return contracts, nil
}

func (c *CoffeeContract) QueryEUDRCompliantShipments(ctx contractapi.TransactionContextInterface) ([]*CoffeeShipment, error) {
	queryString := `{"selector":{"eudrCompliant":true}}`
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var shipments []*CoffeeShipment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var shipment CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &shipment)
		if err != nil {
			return nil, err
		}
		shipments = append(shipments, &shipment)
	}

	return shipments, nil
}

// QueryShipmentsByContract - Get all shipments for a specific contract
func (c *CoffeeContract) QueryShipmentsByContract(ctx contractapi.TransactionContextInterface, contractID string) ([]*CoffeeShipment, error) {
	queryString := fmt.Sprintf(`{"selector":{"contractId":"%s"}}`, contractID)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query shipments by contract: %v", err)
	}
	defer resultsIterator.Close()

	var shipments []*CoffeeShipment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var shipment CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &shipment)
		if err != nil {
			return nil, err
		}
		shipments = append(shipments, &shipment)
	}

	return shipments, nil
}

func (c *CoffeeContract) GetCompleteTraceability(ctx contractapi.TransactionContextInterface, shipmentID string) (map[string]interface{}, error) {
	// Get shipment details
	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return nil, err
	}

	// Get exporter details
	exporter, err := c.ReadExporter(ctx, shipment.ExporterID)
	if err != nil {
		// If exporter not found, create empty record
		exporter = &Exporter{ExporterID: shipment.ExporterID}
	}

	// Try to find associated sales contract
	var contract *SalesContract
	contracts, err := c.QueryAllContracts(ctx)
	if err == nil {
		for _, c := range contracts {
			if c.ExporterID == shipment.ExporterID && c.BuyerID == shipment.BuyerID {
				contract = c
				break
			}
		}
	}

	// Build complete traceability record
	traceability := map[string]interface{}{
		"shipment": shipment,
		"exporter": exporter,
		"contract": contract,
		"traceabilityComplete": true,
		"eudrCompliant": shipment.EUDRCompliant,
		"generatedAt": time.Now().Format(time.RFC3339),
	}

	return traceability, nil
}

func main() {
	// Chaincode as a Service (CaaS) configuration
	ccid := os.Getenv("CORE_CHAINCODE_ID_NAME")
	address := os.Getenv("CHAINCODE_SERVER_ADDRESS")
	
	log.Printf("Starting Coffee Chaincode - CCID: %s, Address: %s", ccid, address)
	
	chaincode, err := contractapi.NewChaincode(&CoffeeContract{})
	if err != nil {
		log.Panicf("Error creating coffee chaincode: %v", err)
	}

	// Create chaincode server for external mode (CaaS)
	server := &shim.ChaincodeServer{
		CCID:     ccid,
		Address:  address,
		CC:       chaincode,
		TLSProps: shim.TLSProperties{Disabled: true}, // TLS disabled as per connection.json
	}

	log.Printf("Starting chaincode server on %s", address)
	if err := server.Start(); err != nil {
		log.Panicf("Error starting coffee chaincode server: %v", err)
	}
}
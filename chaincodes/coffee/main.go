package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
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
	ContractID       string    `json:"contractId"` // Link to sales contract
	ExporterID       string    `json:"exporterId"`
	BuyerID          string    `json:"buyerId"`
	Origin           string    `json:"origin"`
	Quantity         float64   `json:"quantity"`
	Grade            string    `json:"grade"`
	ICONumber        string    `json:"icoNumber"`
	ECXLotNumber     string    `json:"ecxLotNumber"`     // Primary ECX lot (backward compatibility)
	ECXLots          []string  `json:"ecxLots"` // Multiple ECX lots for blended shipments
	Documents        []string  `json:"documents"` // Document IDs linked to this shipment
	Status           string    `json:"status"`
	Channel          string    `json:"channel"`
	ForexRate        float64   `json:"forexRate"`
	ValueUSD         float64   `json:"valueUsd"`
	EUDRCompliant    bool      `json:"eudrCompliant"`
	// Packaging details
	PackagingType    string    `json:"packagingType"`    // JUTE, GRAINPRO, VACUUM
	BagWeight        float64   `json:"bagWeight"`        // kg per bag (typically 60kg)
	TotalBags        int       `json:"totalBags"`
	NetWeight        float64   `json:"netWeight"`        // kg
	GrossWeight      float64   `json:"grossWeight"`      // kg (with bags)
	// Insurance
	InsurancePolicy  string    `json:"insurancePolicy"`  // Policy number
	InsuranceCompany string    `json:"insuranceCompany"` // Insurance provider
	InsuranceAmount  float64   `json:"insuranceAmount"`  // USD
	// Transport Mode & Carrier
	TransportMode    string    `json:"transportMode"`    // SEA or AIR
	ShippingLine     string    `json:"shippingLine"`     // Carrier name (shipping line or airline)
	// Land Transport (Addis → Djibouti, 3-5 days)
	LandTransportCompany  string `json:"landTransportCompany"`
	TruckPlateNumber      string `json:"truckPlateNumber"`
	DriverName            string `json:"driverName"`
	DepartureFromAddis    string `json:"departureFromAddis"`    // ISO date
	ArrivalAtDjibouti     string `json:"arrivalAtDjibouti"`     // ISO date
	BorderCrossingTime    string `json:"borderCrossingTime"`    // ISO date
	LandTransportSeal     string `json:"landTransportSeal"`     // Seal number
	LandTransportStatus   string `json:"landTransportStatus"`   // NOT_STARTED, IN_TRANSIT, ARRIVED
	// Sea Freight (B/L) fields
	BillOfLadingNo   string    `json:"billOfLadingNo"`   // B/L number
	BillOfLadingDate string    `json:"billOfLadingDate"` // B/L issue date
	VesselName       string    `json:"vesselName"`       // Vessel name
	VoyageNumber     string    `json:"voyageNumber"`     // Voyage number
	ContainerNumber  string    `json:"containerNumber"`  // Container number
	ContainerType    string    `json:"containerType"`    // DRY, REEFER, OPEN_TOP
	// Container Stuffing
	StuffingDate     string    `json:"stuffingDate"`     // ISO date
	StuffingLocation string    `json:"stuffingLocation"` // Addis or Djibouti
	StuffedBy        string    `json:"stuffedBy"`        // Company name
	ContainerCondition string  `json:"containerCondition"` // GOOD, DAMAGED
	StuffingSealNumber string  `json:"stuffingSealNumber"` // Container seal
	// Air Freight (AWB) fields
	AirwayBill       string    `json:"airwayBill"`       // AWB number
	FlightNumber     string    `json:"flightNumber"`     // Flight number
	// Common fields
	DeparturePort    string    `json:"departurePort"`    // Port/Airport of departure
	DestinationPort  string    `json:"destinationPort"`  // Port/Airport of destination
	EstimatedArrival string    `json:"estimatedArrival"` // ETA
	ActualArrival    string    `json:"actualArrival"`    // Actual arrival date
	TrackingNumber   string    `json:"trackingNumber"`   // GPS/Container tracking
	// Document Courier Tracking
	CourierCompany   string    `json:"courierCompany"`   // FedEx, DHL, UPS
	CourierTracking  string    `json:"courierTracking"`  // Tracking number
	DocumentsSentDate string   `json:"documentsSentDate"` // ISO date
	DocumentsReceivedDate string `json:"documentsReceivedDate"` // ISO date
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// 2026 Compliance Extensions
type Exporter struct {
	ExporterID                  string    `json:"exporterId"`
	CompanyName                 string    `json:"companyName"`
	ECTALicenseNumber           string    `json:"ectaLicenseNumber"`
	LicenseStatus               string    `json:"licenseStatus"`
	ExporterType                string    `json:"exporterType"` // Added: private, company, individual
	CapitalRequirement          float64   `json:"capitalRequirement"`
	LaboratoryCertified         bool      `json:"laboratoryCertified"`
	LaboratoryCertificateNumber string    `json:"laboratoryCertificateNumber"` // Added: ECTA lab certificate
	ProfessionalTaster          string    `json:"professionalTaster"`
	TasterCertificate           string    `json:"tasterCertificate"`
	LicenseExpiryDate           string    `json:"licenseExpiryDate"` // Using string to avoid schema issues
	RegistrationDate            string    `json:"registrationDate"`  // ISO date format
	RegisteredBy                string    `json:"registeredBy"`      // ✅ X.509 certificate of registrar
	StatusUpdatedBy             string    `json:"statusUpdatedBy"`   // ✅ X.509 cert of status updater
	StatusUpdatedByMSP          string    `json:"statusUpdatedByMsp"` // ✅ MSP of status updater
	LabUpdatedBy                string    `json:"labUpdatedBy"`      // ✅ X.509 cert of lab cert updater
	LabUpdatedByMSP             string    `json:"labUpdatedByMsp"`   // ✅ MSP of lab cert updater
	SuspendedBy                 string    `json:"suspendedBy"`       // ✅ X.509 cert of suspender
	SuspendedByMSP              string    `json:"suspendedByMsp"`    // ✅ MSP of suspender
	CreatedAt                   time.Time `json:"createdAt"`
	UpdatedAt                   time.Time `json:"updatedAt"`
}

type SalesContract struct {
	ContractID            string    `json:"contractId"`
	NBEReferenceNumber    string    `json:"nbeReferenceNumber"`
	ExporterID            string    `json:"exporterId"`
	BuyerID               string    `json:"buyerId"`
	BuyerCountry          string    `json:"buyerCountry"`
	BuyerBank             string    `json:"buyerBank"`    // Issuing bank (buyer's bank)
	ExporterBank          string    `json:"exporterBank"` // Advising/Beneficiary bank (exporter's bank)
	CoffeeType            string    `json:"coffeeType"`
	Quantity              float64   `json:"quantity"`
	PricePerKg            float64   `json:"pricePerKg"`
	TotalValue            float64   `json:"totalValue"`
	Currency              string    `json:"currency"`
	PaymentMethod         string    `json:"paymentMethod"` // LC, CAD, TT_ADVANCE, TT_POST, ADVANCE (default: LC)
	MinimumPriceCompliant bool      `json:"minimumPriceCompliant"`
	EUDRRequired          bool      `json:"eudrRequired"`
	Documents             []string  `json:"documents"` // Document IDs linked to this contract
	ContractStatus        string    `json:"contractStatus"`
	RegistrationDate      string    `json:"registrationDate"` // ISO date format
	ApprovalDate          string    `json:"approvalDate"`     // ISO date format
	RejectionDate         string    `json:"rejectionDate"`    // ISO date format
	RejectionReason       string    `json:"rejectionReason"`  // Reason for rejection
	RegisteredBy          string    `json:"registeredBy"`     // ✅ X.509 certificate of registrar
	RegisteredByMSP       string    `json:"registeredByMsp"`  // ✅ MSP of registrar
	ApprovedBy            string    `json:"approvedBy"`       // ✅ X.509 certificate of approver
	RejectedBy            string    `json:"rejectedBy"`       // ✅ X.509 certificate of rejector
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

	// ✅ CAPTURE MSP IDENTITY of registrar
	registrarMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get registrar MSP ID: %w", err)
	}
	
	// Only ECTA can register exporters
	if registrarMSP != "ECTAMSP" {
		return fmt.Errorf("only ECTA can register exporters, got: %s", registrarMSP)
	}
	
	registrarID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		registrarID = registrarMSP // Fallback
	}

	// VALIDATION: IDs and required fields
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return fmt.Errorf("RegisterExporter: %w", err)
	}
	if err := ValidateNonEmptyString(companyName, "companyName", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterExporter: %w", err)
	}
	if err := ValidateNonEmptyString(ectaLicenseNumber, "ectaLicenseNumber", MaxIDLen); err != nil {
		return fmt.Errorf("RegisterExporter: %w", err)
	}

	// Convert parameters
	capitalRequirement, err := strconv.ParseFloat(capitalRequirementStr, 64)
	if err != nil {
		return fmt.Errorf("RegisterExporter: invalid capital requirement: %w", err)
	}

	// VALIDATION: Capital requirement
	if err := ValidateAmount(capitalRequirement, "capitalRequirement"); err != nil {
		return fmt.Errorf("RegisterExporter: %w", err)
	}

	// Validate exporter type
	validTypes := map[string]bool{
		"private":    true,
		"company":    true,
		"individual": true,
	}
	if exporterType != "" && !validTypes[exporterType] {
		return fmt.Errorf("RegisterExporter: invalid exporter type: %s. Must be private, company, or individual", exporterType)
	}

	// VALIDATION: Capital requirement based on exporter type (ECTA Directive 1106/2025)
	minCapital := map[string]float64{
		"private":    15000000.0, // Private Exporters: 15M ETB
		"company":    20000000.0, // Trade Associations/Companies: 20M ETB
		"individual": 10000000.0, // Individual Exporters (Competency Certification): 10M ETB
	}
	if requiredCapital, exists := minCapital[exporterType]; exists {
		if capitalRequirement < requiredCapital {
			return fmt.Errorf("RegisterExporter: capital requirement %.2f ETB is below minimum %.2f ETB for %s exporter type (ECTA Directive 1106/2025)", 
				capitalRequirement, requiredCapital, exporterType)
		}
	}

	// VALIDATION: License expiry date
	if licenseExpiryDate != "" {
		if err := ValidateDate(licenseExpiryDate); err != nil {
			return fmt.Errorf("RegisterExporter: %w", err)
		}
	}

	// Check if exporter already exists
	exists, err := c.ExporterExists(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("RegisterExporter: failed to check exporter existence for %s: %w", exporterID, err)
	}
	if exists {
		return fmt.Errorf("RegisterExporter: exporter %s already exists", exporterID)
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
		RegistrationDate:            timestamp.Format(time.RFC3339),
		RegisteredBy:                registrarID, // ✅ RECORD WHO REGISTERED
		CreatedAt:                   timestamp,
		UpdatedAt:                   timestamp,
	}

	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}

	// Save exporter to ledger
	err = ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "exporterId", OldValue: "", NewValue: exporterID, DataType: "string"},
		{FieldName: "companyName", OldValue: "", NewValue: companyName, DataType: "string"},
		{FieldName: "licenseStatus", OldValue: "", NewValue: "ACTIVE", DataType: "string"},
		{FieldName: "capitalRequirement", OldValue: "", NewValue: capitalRequirementStr, DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  false, // NBE monitors but doesn't approve exporters
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: "Exporter registered by ECTA with valid license. Can now create contracts for ECTA approval.",
	}

	err = c.CreateAuditLog(ctx, "CREATE", "EXPORTER", exporterID, "", "ACTIVE", changes,
		"New exporter registration by ECTA", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
		// Don't fail the transaction if audit log fails
	}

	return nil
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
	pricePerKgStr, currency, eudrRequiredStr, buyerBank, exporterBank, documentsJSON string) error {

	log.Printf("=== RegisterSalesContract called: contractID=%s, exporterID=%s ===", contractID, exporterID)

	// ✅ CAPTURE MSP IDENTITY of contract creator
	creatorMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get creator MSP ID: %w", err)
	}
	
	creatorID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		creatorID = creatorMSP // Fallback
	}
	
	log.Printf("Contract registered by: %s (MSP: %s)", creatorID, creatorMSP)

	// VALIDATION: IDs
	if err := ValidateID(contractID, "contractID"); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}
	if err := ValidateID(buyerID, "buyerID"); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}

	// VALIDATION: Required fields
	if err := ValidateNonEmptyString(buyerCountry, "buyerCountry", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}
	if err := ValidateNonEmptyString(coffeeType, "coffeeType", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}
	if err := ValidateNonEmptyString(buyerBank, "buyerBank", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}
	if err := ValidateNonEmptyString(exporterBank, "exporterBank", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}

	// VALIDATION: Currency
	if err := ValidateCurrency(currency); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}

	// Convert parameters
	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("RegisterSalesContract: invalid quantity: %w", err)
	}

	// VALIDATION: Quantity
	if err := ValidateQuantity(quantity, "quantity"); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}

	pricePerKg, err := strconv.ParseFloat(pricePerKgStr, 64)
	if err != nil {
		return fmt.Errorf("RegisterSalesContract: invalid price per kg: %w", err)
	}

	// VALIDATION: Price
	if err := ValidateAmount(pricePerKg, "pricePerKg"); err != nil {
		return fmt.Errorf("RegisterSalesContract: %w", err)
	}

	eudrRequired, err := strconv.ParseBool(eudrRequiredStr)
	if err != nil {
		return fmt.Errorf("RegisterSalesContract: invalid EUDR required flag: %w", err)
	}

	// Parse documents array
	var documents []string
	if documentsJSON != "" && documentsJSON != "[]" {
		err = json.Unmarshal([]byte(documentsJSON), &documents)
		if err != nil {
			return fmt.Errorf("invalid documents JSON: %v", err)
		}
	}
	if documents == nil {
		documents = []string{} // Ensure non-nil empty array
	}

	// ✅ FIX: Verify exporter exists before creating contract (RegisterSalesContract)
	exporterExists, err := c.ExporterExists(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("RegisterSalesContract: failed to check exporter existence: %w", err)
	}
	if !exporterExists {
		return fmt.Errorf("RegisterSalesContract: exporter %s is not registered in the system", exporterID)
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

	// Default payment method to LC for backward compatibility
	paymentMethod := "LC"

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
		PaymentMethod:         paymentMethod, // Default to LC
		MinimumPriceCompliant: minimumPriceCompliant,
		EUDRRequired:          eudrRequired,
		Documents:             documents, // Add documents
		ContractStatus:        "REGISTERED",
		RegistrationDate:      timestamp.Format(time.RFC3339),
		RegisteredBy:          creatorID, // ✅ RECORD WHO REGISTERED
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

// RegisterSalesContractWithPaymentMethod - Register contract with payment method specification
// Added: Payment method support for LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
func (c *CoffeeContract) RegisterSalesContractWithPaymentMethod(ctx contractapi.TransactionContextInterface,
	contractID, exporterID, buyerID, buyerCountry, coffeeType, quantityStr,
	pricePerKgStr, currency, eudrRequiredStr, buyerBank, exporterBank, paymentMethod, documentsJSON string) error {

	log.Printf("=== RegisterSalesContractWithPaymentMethod called: contractID=%s, paymentMethod=%s ===", contractID, paymentMethod)

	// ✅ CAPTURE MSP IDENTITY of registrar
	registrarMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get registrar MSP ID: %w", err)
	}

	registrarID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		registrarID = registrarMSP // Fallback
	}

	// VALIDATION: Payment method
	if err := validatePaymentMethod(paymentMethod); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}

	// VALIDATION: IDs
	if err := ValidateID(contractID, "contractID"); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}
	if err := ValidateID(buyerID, "buyerID"); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}

	// VALIDATION: Required fields
	if err := ValidateNonEmptyString(buyerCountry, "buyerCountry", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}
	if err := ValidateNonEmptyString(coffeeType, "coffeeType", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}
	if err := ValidateNonEmptyString(buyerBank, "buyerBank", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}
	if err := ValidateNonEmptyString(exporterBank, "exporterBank", MaxStringLen); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}

	// VALIDATION: Currency
	if err := ValidateCurrency(currency); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}

	// Convert parameters
	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: invalid quantity: %w", err)
	}

	// VALIDATION: Quantity
	if err := ValidateQuantity(quantity, "quantity"); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}

	pricePerKg, err := strconv.ParseFloat(pricePerKgStr, 64)
	if err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: invalid price per kg: %w", err)
	}

	// VALIDATION: Price
	if err := ValidateAmount(pricePerKg, "pricePerKg"); err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: %w", err)
	}

	eudrRequired, err := strconv.ParseBool(eudrRequiredStr)
	if err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: invalid EUDR required flag: %w", err)
	}

	// Parse documents array
	var documents []string
	if documentsJSON != "" && documentsJSON != "[]" {
		err = json.Unmarshal([]byte(documentsJSON), &documents)
		if err != nil {
			return fmt.Errorf("invalid documents JSON: %v", err)
		}
	}
	if documents == nil {
		documents = []string{} // Ensure non-nil empty array
	}

	// ✅ FIX: Verify exporter exists before creating contract
	exporterExists, err := c.ExporterExists(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: failed to check exporter existence: %w", err)
	}
	if !exporterExists {
		return fmt.Errorf("RegisterSalesContractWithPaymentMethod: exporter %s is not registered in the system", exporterID)
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
		PaymentMethod:         paymentMethod,
		MinimumPriceCompliant: minimumPriceCompliant,
		EUDRRequired:          eudrRequired,
		Documents:             documents,
		ContractStatus:        "REGISTERED",
		RegistrationDate:      timestamp.Format(time.RFC3339),
		RegisteredBy:          registrarID,    // ✅ RECORD WHO REGISTERED
		RegisteredByMSP:       registrarMSP,   // ✅ RECORD ORGANIZATION
		ApprovalDate:          "",
		CreatedAt:             timestamp,
		UpdatedAt:             timestamp,
	}

	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return err
	}

	key := "CONTRACT_" + contractID
	log.Printf("Storing contract with key: %s, paymentMethod: %s", key, paymentMethod)
	err = ctx.GetStub().PutState(key, contractJSON)
	if err != nil {
		log.Printf("ERROR: PutState failed for key %s: %v", key, err)
		return err
	}

	log.Printf("=== RegisterSalesContractWithPaymentMethod completed successfully: %s ===", key)
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

	// Ensure Documents is never nil (backward compatibility)
	if contract.Documents == nil {
		contract.Documents = []string{}
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
	// ✅ CAPTURE MSP IDENTITY of approver
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}
	
	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		approverID = mspID // Fallback
	}

	// Only ECTA can approve sales contracts (for export compliance)
	if mspID != "ECTAMSP" {
		return fmt.Errorf("only ECTA can approve sales contracts, got: %s", mspID)
	}
	
	log.Printf("Contract %s being approved by: %s (MSP: %s)", contractID, approverID, mspID)

	contract, err := c.ReadSalesContract(ctx, contractID)
	if err != nil {
		return err
	}

	// Capture previous status for audit
	previousStatus := contract.ContractStatus

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// ✅ GENERATE ECTA REFERENCE NUMBER (format: ECTA-YYYY-NNNN)
	// Use contract ID suffix and timestamp to create unique reference
	ectaRef := fmt.Sprintf("ECTA-%s-%s", timestamp.Format("2006"), contractID[len(contractID)-6:])
	log.Printf("Generated ECTA reference for contract %s: %s", contractID, ectaRef)

	contract.ContractStatus = "APPROVED"
	contract.ApprovalDate = timestamp.Format(time.RFC3339)
	contract.ApprovedBy = approverID // ✅ RECORD WHO APPROVED
	contract.NBEReferenceNumber = ectaRef // ✅ SET ECTA REFERENCE NUMBER
	contract.UpdatedAt = timestamp

	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return err
	}

	// Save contract
	err = ctx.GetStub().PutState("CONTRACT_"+contractID, contractJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "contractStatus", OldValue: previousStatus, NewValue: "APPROVED", DataType: "string"},
		{FieldName: "approvalDate", OldValue: "", NewValue: timestamp.Format(time.RFC3339), DataType: "date"},
		{FieldName: "nbeReferenceNumber", OldValue: "", NewValue: ectaRef, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  false, // Banks will handle forex allocation per NBE policy
		UCP600Check:    false,
		EUDRCompliance: contract.EUDRRequired,
		ICOCompliance:  true,
		ComplianceNote: "Contract approved by ECTA for export compliance. Ready for bank LC issuance and forex allocation per NBE policy (50% retention).",
	}

	err = c.CreateAuditLog(ctx, "APPROVE", "CONTRACT", contractID, previousStatus, "APPROVED", changes,
		"Contract approved by ECTA for export compliance", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":  "ContractApproved",
		"contractID": contractID,
		"exporterID": contract.ExporterID,
		"totalValue": contract.TotalValue,
		"timestamp":  timestamp.Format(time.RFC3339),
		"approvedBy": mspID,
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ContractApproved", eventJSON)

	return nil
}

// RejectSalesContract - Reject a sales contract (ECTA only)
func (c *CoffeeContract) RejectSalesContract(ctx contractapi.TransactionContextInterface, contractID string, rejectedBy string, rejectionReason string) error {
	// ✅ CAPTURE MSP IDENTITY of rejector
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}
	
	rejectorID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		rejectorID = mspID // Fallback
	}

	// Only ECTA can reject sales contracts (for export compliance)
	if mspID != "ECTAMSP" {
		return fmt.Errorf("only ECTA can reject sales contracts, got: %s", mspID)
	}
	
	log.Printf("Contract %s being rejected by: %s (MSP: %s), Reason: %s", contractID, rejectorID, mspID, rejectionReason)

	contract, err := c.ReadSalesContract(ctx, contractID)
	if err != nil {
		return err
	}

	// Capture previous status for audit
	previousStatus := contract.ContractStatus

	// Only allow rejection of REGISTERED contracts
	if contract.ContractStatus != "REGISTERED" {
		return fmt.Errorf("only REGISTERED contracts can be rejected, current status: %s", contract.ContractStatus)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	contract.ContractStatus = "REJECTED"
	contract.RejectionDate = timestamp.Format(time.RFC3339)
	contract.RejectedBy = rejectorID
	contract.RejectionReason = rejectionReason
	contract.UpdatedAt = timestamp

	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return err
	}

	// Save contract
	err = ctx.GetStub().PutState("CONTRACT_"+contractID, contractJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "contractStatus", OldValue: previousStatus, NewValue: "REJECTED", DataType: "string"},
		{FieldName: "rejectionDate", OldValue: "", NewValue: timestamp.Format(time.RFC3339), DataType: "date"},
		{FieldName: "rejectionReason", OldValue: "", NewValue: rejectionReason, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  false,
		UCP600Check:    false,
		EUDRCompliance: contract.EUDRRequired,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("Contract rejected by ECTA: %s", rejectionReason),
	}

	err = c.CreateAuditLog(ctx, "REJECT", "CONTRACT", contractID, previousStatus, "REJECTED", changes,
		fmt.Sprintf("Contract rejected by ECTA: %s", rejectionReason), compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":       "ContractRejected",
		"contractID":      contractID,
		"exporterID":      contract.ExporterID,
		"rejectionReason": rejectionReason,
		"timestamp":       timestamp.Format(time.RFC3339),
		"rejectedBy":      rejectorID,
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ContractRejected", eventJSON)

	return nil
}

func (c *CoffeeContract) UpdateExporterLaboratory(ctx contractapi.TransactionContextInterface, exporterID string, certifiedStr string) error {
	// ✅ CAPTURE MSP IDENTITY
	updaterMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	updaterID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		updaterID = updaterMSP // Fallback
	}

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
	exporter.LabUpdatedBy = updaterID        // ✅ RECORD WHO UPDATED
	exporter.LabUpdatedByMSP = updaterMSP    // ✅ RECORD ORGANIZATION
	exporter.UpdatedAt = timestamp

	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
}

func (c *CoffeeContract) UpdateExporterStatus(ctx contractapi.TransactionContextInterface, exporterID string, status string) error {
	// ✅ CAPTURE MSP IDENTITY
	updaterMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	updaterID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		updaterID = updaterMSP // Fallback
	}

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
	exporter.StatusUpdatedBy = updaterID        // ✅ RECORD WHO UPDATED
	exporter.StatusUpdatedByMSP = updaterMSP    // ✅ RECORD ORGANIZATION
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

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// ✅ CAPTURE FULL MSP IDENTITY
	suspenderID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		suspenderID = mspID // Fallback
	}

	// Only ECTA can suspend exporters
	if mspID != "ECTAMSP" {
		return fmt.Errorf("unauthorized: only ECTA can suspend exporter licenses (caller: %s)", mspID)
	}

	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return err
	}

	if exporter.LicenseStatus == "REVOKED" {
		return fmt.Errorf("cannot suspend revoked license")
	}

	// Capture previous status
	previousStatus := exporter.LicenseStatus

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	exporter.LicenseStatus = "SUSPENDED"
	exporter.SuspendedBy = suspenderID        // ✅ RECORD WHO SUSPENDED
	exporter.SuspendedByMSP = mspID           // ✅ RECORD ORGANIZATION
	exporter.UpdatedAt = timestamp

	exporterJSON, err := json.Marshal(exporter)
	if err != nil {
		return err
	}

	// Save exporter
	err = ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "licenseStatus", OldValue: previousStatus, NewValue: "SUSPENDED", DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false, // Non-compliant, hence suspended
		NBECompliance:  false,
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: "License suspended by ECTA: " + reason,
	}

	err = c.CreateAuditLog(ctx, "SUSPEND", "EXPORTER", exporterID, previousStatus, "SUSPENDED", changes,
		reason, compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":   "ExporterSuspended",
		"exporterID":  exporterID,
		"reason":      reason,
		"timestamp":   timestamp.Format(time.RFC3339),
		"suspendedBy": mspID,
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ExporterSuspended", eventJSON)

	return nil
}

// RevokeExporterLicense - ECTA permanently revokes exporter license
func (c *CoffeeContract) RevokeExporterLicense(ctx contractapi.TransactionContextInterface,
	exporterID, reason string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only ECTA can revoke exporters
	if mspID != "ECTAMSP" {
		return fmt.Errorf("unauthorized: only ECTA can revoke exporter licenses (caller: %s)", mspID)
	}

	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return err
	}

	// Capture previous status for audit
	previousStatus := exporter.LicenseStatus

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

	err = ctx.GetStub().PutState("EXPORTER_"+exporterID, exporterJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "licenseStatus", OldValue: previousStatus, NewValue: "REVOKED", DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false, // Non-compliant, permanently revoked
		NBECompliance:  false,
		UCP600Check:    false,
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: "License permanently revoked by ECTA: " + reason,
	}

	err = c.CreateAuditLog(ctx, "REVOKE", "EXPORTER", exporterID, previousStatus, "REVOKED",
		changes, reason, compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":  "ExporterRevoked",
		"exporterID": exporterID,
		"reason":     reason,
		"timestamp":  timestamp.Format(time.RFC3339),
		"revokedBy":  mspID,
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ExporterRevoked", eventJSON)

	return nil
}

// ==================== SHIPMENT MANAGEMENT ====================

func (c *CoffeeContract) CreateShipment(ctx contractapi.TransactionContextInterface,
	shipmentID, contractID, exporterID, buyerID, origin, quantityStr, grade, icoNumber,
	ecxLotNumber, channel, forexRateStr, valueUSDStr, eudrCompliantStr, documentsJSON string) error {

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

	// Parse documents array
	var documents []string
	if documentsJSON != "" && documentsJSON != "[]" {
		err = json.Unmarshal([]byte(documentsJSON), &documents)
		if err != nil {
			return fmt.Errorf("invalid documents JSON: %v", err)
		}
	}
	if documents == nil {
		documents = []string{} // Ensure non-nil empty array
	}
	fmt.Printf("CreateShipment: Documents to be linked: %d document(s)\n", len(documents))

	// MANDATORY FIELD VALIDATION: Ensure all required fields are filled after auto-mapping
	var validationErrors []string
	
	if mappedExporterID == "" {
		validationErrors = append(validationErrors, "ExporterID is required and cannot be empty")
	}
	if mappedBuyerID == "" {
		validationErrors = append(validationErrors, "BuyerID is required and cannot be empty")
	}
	if origin == "" {
		validationErrors = append(validationErrors, "Origin is required and cannot be empty")
	}
	if quantity <= 0 {
		validationErrors = append(validationErrors, "Quantity must be greater than 0")
	}
	if grade == "" {
		validationErrors = append(validationErrors, "Grade is required and cannot be empty")
	}
	if icoNumber == "" {
		validationErrors = append(validationErrors, "ICO Number is required and cannot be empty")
	}
	if valueUSD <= 0 {
		validationErrors = append(validationErrors, "ValueUSD must be greater than 0")
	}
	
	if len(validationErrors) > 0 {
		errorMsg := fmt.Sprintf("Shipment validation failed: %s", strings.Join(validationErrors, "; "))
		fmt.Printf("CreateShipment ERROR: %s\n", errorMsg)
		return fmt.Errorf("%s", errorMsg)
	}
	
	fmt.Printf("CreateShipment: All required fields validated successfully\n")

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
		ECXLots:       []string{},    // Initialize as empty array, not nil
		Documents:     documents,
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

	// Store with SHIPMENT_ prefix, but check if shipmentID already has it
	key := shipmentID
	if !strings.HasPrefix(shipmentID, "SHIPMENT_") {
		key = "SHIPMENT_" + shipmentID
	}
	err = ctx.GetStub().PutState(key, shipmentJSON)
	if err != nil {
		return err
	}

	fmt.Printf("CreateShipment: Shipment created with auto-mapped data, requesting quality inspection...\n")

	// AUTO-TRIGGER: Request ECTA quality inspection
	// AUTO-MAPS: Shipment ID, Contract ID, Exporter ID
	inspectionID := "INSPECTION_" + shipmentID

	inspection := QualityInspection{
		InspectionID: inspectionID,
		ShipmentID:   shipmentID,
		ContractID:   contractID,       // AUTO-MAPPED from shipment
		ExporterID:   mappedExporterID, // AUTO-MAPPED from contract/shipment
		Status:       "PENDING",
		CreatedAt:    timestamp,
		UpdatedAt:    timestamp,
	}

	inspectionJSON, err := json.Marshal(inspection)
	if err != nil {
		fmt.Printf("CreateShipment WARNING: failed to marshal inspection: %v\n", err)
		// Don't fail shipment creation if inspection creation fails
	} else {
		err = ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
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
	// Try with SHIPMENT_ prefix first (new format)
	shipmentJSON, err := ctx.GetStub().GetState("SHIPMENT_" + shipmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read shipment: %v", err)
	}
	
	// If not found with prefix, try without prefix (old format for backward compatibility)
	if shipmentJSON == nil {
		shipmentJSON, err = ctx.GetStub().GetState(shipmentID)
		if err != nil {
			return nil, fmt.Errorf("failed to read shipment: %v", err)
		}
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

	// VALIDATION: IDs and required fields
	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("UpdateShipmentStatus: %w", err)
	}
	if err := ValidateNonEmptyString(newStatus, "newStatus", MaxIDLen); err != nil {
		return fmt.Errorf("UpdateShipmentStatus: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("UpdateShipmentStatus: %w", err)
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

	return ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
}

// RecordBillOfLading - Shipping company records Bill of Lading details (Sea Freight)
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

	shipment.TransportMode = "SEA"
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

	return ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
}

// RecordAirwayBill - Airline records Airway Bill details (Air Freight)
func (c *CoffeeContract) RecordAirwayBill(ctx contractapi.TransactionContextInterface,
	shipmentID, airwayBillNo, flightNumber, airline, departureAirport, destinationAirport,
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

	shipment.TransportMode = "AIR"
	shipment.AirwayBill = airwayBillNo
	shipment.FlightNumber = flightNumber
	shipment.ShippingLine = airline // Airline name
	shipment.DeparturePort = departureAirport
	shipment.DestinationPort = destinationAirport
	shipment.EstimatedArrival = estimatedArrival
	shipment.TrackingNumber = trackingNumber
	shipment.Status = "LOADED"
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
}

// RecordShippingDetails - Universal function that records either B/L or AWB based on transport mode
func (c *CoffeeContract) RecordShippingDetails(ctx contractapi.TransactionContextInterface,
	shipmentID, transportMode, documentNo, carrierName, vesselOrFlight, 
	departurePoint, destinationPoint, estimatedArrival, trackingNumber,
	containerNumber, containerType, voyageNumber string) error {

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return err
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Set common fields
	shipment.TransportMode = transportMode
	shipment.ShippingLine = carrierName
	shipment.DeparturePort = departurePoint
	shipment.DestinationPort = destinationPoint
	shipment.EstimatedArrival = estimatedArrival
	shipment.TrackingNumber = trackingNumber
	shipment.Status = "LOADED"
	shipment.UpdatedAt = timestamp

	// Set mode-specific fields
	if transportMode == "SEA" {
		shipment.BillOfLadingNo = documentNo
		shipment.BillOfLadingDate = timestamp.Format(time.RFC3339)
		shipment.VesselName = vesselOrFlight
		shipment.VoyageNumber = voyageNumber
		shipment.ContainerNumber = containerNumber
		shipment.ContainerType = containerType
	} else if transportMode == "AIR" {
		shipment.AirwayBill = documentNo
		shipment.FlightNumber = vesselOrFlight
	}

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
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

	return ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
}

func (c *CoffeeContract) ShipmentExists(ctx contractapi.TransactionContextInterface, shipmentID string) (bool, error) {
	// Try with SHIPMENT_ prefix first (new format)
	shipmentJSON, err := ctx.GetStub().GetState("SHIPMENT_" + shipmentID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	// If not found with prefix, try without prefix (old format)
	if shipmentJSON == nil {
		shipmentJSON, err = ctx.GetStub().GetState(shipmentID)
		if err != nil {
			return false, fmt.Errorf("failed to read from world state: %v", err)
		}
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
		if len(queryResponse.Key) >= 9 &&
			(queryResponse.Key[:9] == "EXPORTER_" ||
				queryResponse.Key[:9] == "CONTRACT_") {
			continue
		}

		var asset CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			continue // Skip if not a shipment record
		}
		
		// Ensure Documents is never nil (backward compatibility)
		if asset.Documents == nil {
			asset.Documents = []string{}
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
		
		// Ensure Documents is never nil (backward compatibility for contracts created before v1.15)
		if contract.Documents == nil {
			contract.Documents = []string{}
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
		
		// FIX: Handle null documents array - convert to empty slice
		if shipment.Documents == nil {
			shipment.Documents = []string{}
		}
		
		// FIX: Handle null ECXLots array - convert to empty slice
		if shipment.ECXLots == nil {
			shipment.ECXLots = []string{}
		}
		
		shipments = append(shipments, &shipment)
	}

	return shipments, nil
}

// QueryAllShipments - Get all shipments in the system
func (c *CoffeeContract) QueryAllShipments(ctx contractapi.TransactionContextInterface) ([]*CoffeeShipment, error) {
	var shipments []*CoffeeShipment
	
	// Query NEW shipments with SHIPMENT_ prefix
	newIterator, err := ctx.GetStub().GetStateByRange("SHIPMENT_", "SHIPMENT_~")
	if err != nil {
		return nil, err
	}
	defer newIterator.Close()

	for newIterator.HasNext() {
		queryResponse, err := newIterator.Next()
		if err != nil {
			return nil, err
		}

		var shipment CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &shipment)
		if err != nil {
			return nil, err
		}
		
		// FIX: Handle null arrays
		if shipment.Documents == nil {
			shipment.Documents = []string{}
		}
		if shipment.ECXLots == nil {
			shipment.ECXLots = []string{}
		}
		
		shipments = append(shipments, &shipment)
	}
	
	// Query OLD shipments without prefix (backward compatibility)
	// Only get keys that start with "SHIPMENT" but NOT "SHIPMENT_" (already got those)
	oldIterator, err := ctx.GetStub().GetStateByRange("SHIPMENT", "SHIPMENT_")
	if err != nil {
		return nil, err
	}
	defer oldIterator.Close()

	for oldIterator.HasNext() {
		queryResponse, err := oldIterator.Next()
		if err != nil {
			return nil, err
		}

		var shipment CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &shipment)
		if err != nil {
			continue // Skip invalid records
		}
		
		// Only include if it has a shipmentId (identifies as shipment)
		if shipment.ShipmentID != "" {
			// FIX: Handle null arrays
			if shipment.Documents == nil {
				shipment.Documents = []string{}
			}
			if shipment.ECXLots == nil {
				shipment.ECXLots = []string{}
			}
			
			shipments = append(shipments, &shipment)
		}
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
		"shipment":             shipment,
		"exporter":             exporter,
		"contract":             contract,
		"traceabilityComplete": true,
		"eudrCompliant":        shipment.EUDRCompliant,
		"generatedAt":          time.Now().Format(time.RFC3339),
	}

	return traceability, nil
}

// GetHistory - Get complete history of changes for any entity
// Returns all historical states with transaction metadata
func (c *CoffeeContract) GetHistory(ctx contractapi.TransactionContextInterface, key string) ([]map[string]interface{}, error) {
	log.Printf("=== GetHistory called for key: %s ===", key)
	
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(key)
	if err != nil {
		return nil, fmt.Errorf("failed to get history for key %s: %v", key, err)
	}
	defer resultsIterator.Close()

	var history []map[string]interface{}
	
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("error iterating history: %v", err)
		}

		// Parse the value as JSON
		var record map[string]interface{}
		if len(response.Value) > 0 {
			if err := json.Unmarshal(response.Value, &record); err != nil {
				log.Printf("Warning: Could not unmarshal history value: %v", err)
				record = map[string]interface{}{
					"_raw": string(response.Value),
				}
			}
		}

		// Build history entry
		entry := map[string]interface{}{
			"TxId":      response.TxId,
			"Value":     record,
			"Timestamp": response.Timestamp.AsTime().Format(time.RFC3339),
			"IsDelete":  response.IsDelete,
		}
		
		history = append(history, entry)
	}
	
	log.Printf("=== GetHistory completed: Found %d entries for key %s ===", len(history), key)
	return history, nil
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


// PickupShipment - Shipping company picks up cleared shipment
// Updates status from CUSTOMS_CLEARED to IN_TRANSIT
func (c *CoffeeContract) PickupShipment(ctx contractapi.TransactionContextInterface,
	shipmentID, shippingCompany, transportMode, trackingNumber string) error {

	// VALIDATION
	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("PickupShipment: %w", err)
	}
	if err := ValidateNonEmptyString(shippingCompany, "shippingCompany", MaxStringLen); err != nil {
		return fmt.Errorf("PickupShipment: %w", err)
	}
	if err := ValidateNonEmptyString(transportMode, "transportMode", MaxIDLen); err != nil {
		return fmt.Errorf("PickupShipment: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("PickupShipment: %w", err)
	}

	// Must be customs cleared to pickup
	if shipment.Status != "CUSTOMS_CLEARED" && shipment.Status != "PERMIT_ISSUED" {
		return fmt.Errorf("shipment must be CUSTOMS_CLEARED to pickup, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Update shipment
	shipment.Status = "IN_TRANSIT"
	shipment.TransportMode = transportMode
	shipment.TrackingNumber = trackingNumber
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":       "ShipmentPickedUp",
		"shipmentID":      shipmentID,
		"shippingCompany": shippingCompany,
		"transportMode":   transportMode,
		"timestamp":       timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ShipmentPickedUp", eventJSON)

	fmt.Printf("PickupShipment: Shipment %s picked up by %s, status updated to IN_TRANSIT\n", shipmentID, shippingCompany)
	return nil
}

// ConfirmDelivery - Shipping company confirms delivery
// Updates status from IN_TRANSIT to DELIVERED
func (c *CoffeeContract) ConfirmDelivery(ctx contractapi.TransactionContextInterface,
	shipmentID, deliveryNotes string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("ConfirmDelivery: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("ConfirmDelivery: %w", err)
	}

	if shipment.Status != "IN_TRANSIT" {
		return fmt.Errorf("shipment must be IN_TRANSIT to confirm delivery, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "DELIVERED"
	shipment.ActualArrival = timestamp.Format(time.RFC3339)
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "ActualArrival", OldValue: "", NewValue: shipment.ActualArrival, DataType: "datetime"},
		{FieldName: "DeliveryConfirmed", OldValue: "", NewValue: timestamp.Format(time.RFC3339), DataType: "datetime"},
		{FieldName: "FinalDestination", OldValue: "", NewValue: shipment.DestinationPort, DataType: "string"},
		{FieldName: "Buyer", OldValue: "", NewValue: shipment.BuyerID, DataType: "string"},
		{FieldName: "ContractID", OldValue: "", NewValue: shipment.ContractID, DataType: "string"},
		{FieldName: "ExporterID", OldValue: "", NewValue: shipment.ExporterID, DataType: "string"},
		{FieldName: "QuantityDelivered", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
		{FieldName: "Grade", OldValue: "", NewValue: shipment.Grade, DataType: "string"},
		{FieldName: "Origin", OldValue: "", NewValue: shipment.Origin, DataType: "string"},
		{FieldName: "DeliveryNotes", OldValue: "", NewValue: deliveryNotes, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
		ICOCompliance:  true,
	}

	err = c.CreateAuditLog(ctx, "DELIVERY_CONFIRMED", "SHIPMENT", shipmentID,
		previousStatus, "DELIVERED", changes,
		fmt.Sprintf("Delivery confirmed by shipping company. %s", deliveryNotes),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":  "ShipmentDelivered",
		"shipmentID": shipmentID,
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ShipmentDelivered", eventJSON)

	fmt.Printf("ConfirmDelivery: Shipment %s delivered, status updated to DELIVERED\n", shipmentID)
	return nil
}

// ==================== COMPLETE SHIPPING WORKFLOW FUNCTIONS ====================

// StartLandTransport - Begin land transport from Addis to Djibouti
// Updates status from CUSTOMS_CLEARED to LAND_TRANSPORT
func (c *CoffeeContract) StartLandTransport(ctx contractapi.TransactionContextInterface,
	shipmentID, transportCompany, truckPlate, driverName, sealNumber string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("StartLandTransport: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("StartLandTransport: %w", err)
	}

	if shipment.Status != "CUSTOMS_CLEARED" {
		return fmt.Errorf("shipment must be CUSTOMS_CLEARED to start land transport, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "LAND_TRANSPORT"
	shipment.LandTransportCompany = transportCompany
	shipment.TruckPlateNumber = truckPlate
	shipment.DriverName = driverName
	shipment.LandTransportSeal = sealNumber
	shipment.DepartureFromAddis = timestamp.Format(time.RFC3339)
	shipment.LandTransportStatus = "IN_TRANSIT"
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail with ALL data captured
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "LandTransportCompany", OldValue: "", NewValue: transportCompany, DataType: "string"},
		{FieldName: "TruckPlateNumber", OldValue: "", NewValue: truckPlate, DataType: "string"},
		{FieldName: "DriverName", OldValue: "", NewValue: driverName, DataType: "string"},
		{FieldName: "TransportSealNumber", OldValue: "", NewValue: sealNumber, DataType: "string"},
		{FieldName: "DepartureFromAddis", OldValue: "", NewValue: shipment.DepartureFromAddis, DataType: "datetime"},
		{FieldName: "ShipmentID", OldValue: "", NewValue: shipmentID, DataType: "string"},
		{FieldName: "ContractID", OldValue: "", NewValue: shipment.ContractID, DataType: "string"},
		{FieldName: "ExporterID", OldValue: "", NewValue: shipment.ExporterID, DataType: "string"},
		{FieldName: "Quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
		{FieldName: "Grade", OldValue: "", NewValue: shipment.Grade, DataType: "string"},
		{FieldName: "Origin", OldValue: "", NewValue: shipment.Origin, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
		ICOCompliance:  true,
	}

	err = c.CreateAuditLog(ctx, "START_LAND_TRANSPORT", "SHIPMENT", shipmentID,
		previousStatus, "LAND_TRANSPORT", changes,
		fmt.Sprintf("Land transport started by %s with truck %s, driver %s", transportCompany, truckPlate, driverName),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":        "LandTransportStarted",
		"shipmentID":       shipmentID,
		"transportCompany": transportCompany,
		"truckPlate":       truckPlate,
		"timestamp":        timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("LandTransportStarted", eventJSON)

	fmt.Printf("StartLandTransport: Shipment %s started land transport with %s\n", shipmentID, transportCompany)
	return nil
}

// ArriveAtPort - Record arrival at Djibouti Port
// Updates status from LAND_TRANSPORT to PORT_ARRIVED
func (c *CoffeeContract) ArriveAtPort(ctx contractapi.TransactionContextInterface,
	shipmentID, notes string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("ArriveAtPort: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("ArriveAtPort: %w", err)
	}

	if shipment.Status != "LAND_TRANSPORT" {
		return fmt.Errorf("shipment must be in LAND_TRANSPORT to arrive at port, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "PORT_ARRIVED"
	shipment.ArrivalAtDjibouti = timestamp.Format(time.RFC3339)
	shipment.LandTransportStatus = "ARRIVED"
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "ArrivalAtDjibouti", OldValue: "", NewValue: shipment.ArrivalAtDjibouti, DataType: "datetime"},
		{FieldName: "LandTransportStatus", OldValue: "", NewValue: shipment.LandTransportStatus, DataType: "string"},
		{FieldName: "TransportCompany", OldValue: "", NewValue: shipment.LandTransportCompany, DataType: "string"},
		{FieldName: "TruckPlate", OldValue: "", NewValue: shipment.TruckPlateNumber, DataType: "string"},
		{FieldName: "Driver", OldValue: "", NewValue: shipment.DriverName, DataType: "string"},
		{FieldName: "Notes", OldValue: "", NewValue: notes, DataType: "string"},
		{FieldName: "Quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
	}

	err = c.CreateAuditLog(ctx, "PORT_ARRIVAL", "SHIPMENT", shipmentID,
		previousStatus, "PORT_ARRIVED", changes,
		fmt.Sprintf("Shipment arrived at Djibouti Port. %s", notes),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":  "PortArrival",
		"shipmentID": shipmentID,
		"port":       "Djibouti",
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("PortArrival", eventJSON)

	fmt.Printf("ArriveAtPort: Shipment %s arrived at Djibouti Port\n", shipmentID)
	return nil
}

// StuffContainer - Record container stuffing
// Updates status from PORT_ARRIVED to CONTAINER_STUFFED
func (c *CoffeeContract) StuffContainer(ctx contractapi.TransactionContextInterface,
	shipmentID, containerNumber, containerType, sealNumber, stuffedBy, location string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("StuffContainer: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("StuffContainer: %w", err)
	}

	if shipment.Status != "PORT_ARRIVED" {
		return fmt.Errorf("shipment must be PORT_ARRIVED to stuff container, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "CONTAINER_STUFFED"
	shipment.ContainerNumber = containerNumber
	shipment.ContainerType = containerType
	shipment.StuffingSealNumber = sealNumber
	shipment.StuffedBy = stuffedBy
	shipment.StuffingLocation = location
	shipment.StuffingDate = timestamp.Format(time.RFC3339)
	shipment.ContainerCondition = "GOOD"
	
	// Set defaults if not already set
	if shipment.DeparturePort == "" {
		shipment.DeparturePort = "Djibouti"
	}
	if shipment.VesselName == "" {
		shipment.VesselName = "Maersk Eindhoven"
	}
	if shipment.VoyageNumber == "" {
		shipment.VoyageNumber = fmt.Sprintf("V%dW%d", time.Now().Year(), time.Now().Unix()%100)
	}
	if shipment.BillOfLadingNo == "" {
		shipment.BillOfLadingNo = fmt.Sprintf("BL%d", time.Now().Unix())
	}
	
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "ContainerNumber", OldValue: "", NewValue: containerNumber, DataType: "string"},
		{FieldName: "ContainerType", OldValue: "", NewValue: containerType, DataType: "string"},
		{FieldName: "SealNumber", OldValue: "", NewValue: sealNumber, DataType: "string"},
		{FieldName: "StuffedBy", OldValue: "", NewValue: stuffedBy, DataType: "string"},
		{FieldName: "StuffingLocation", OldValue: "", NewValue: location, DataType: "string"},
		{FieldName: "StuffingDate", OldValue: "", NewValue: shipment.StuffingDate, DataType: "datetime"},
		{FieldName: "ContainerCondition", OldValue: "", NewValue: shipment.ContainerCondition, DataType: "string"},
		{FieldName: "BillOfLading", OldValue: "", NewValue: shipment.BillOfLadingNo, DataType: "string"},
		{FieldName: "Vessel", OldValue: "", NewValue: shipment.VesselName, DataType: "string"},
		{FieldName: "Voyage", OldValue: "", NewValue: shipment.VoyageNumber, DataType: "string"},
		{FieldName: "Quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
	}

	err = c.CreateAuditLog(ctx, "CONTAINER_STUFFING", "SHIPMENT", shipmentID,
		previousStatus, "CONTAINER_STUFFED", changes,
		fmt.Sprintf("Container %s stuffed by %s at %s with seal %s", containerNumber, stuffedBy, location, sealNumber),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":       "ContainerStuffed",
		"shipmentID":      shipmentID,
		"containerNumber": containerNumber,
		"sealNumber":      sealNumber,
		"timestamp":       timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("ContainerStuffed", eventJSON)

	fmt.Printf("StuffContainer: Shipment %s stuffed into container %s\n", shipmentID, containerNumber)
	return nil
}

// LoadOnVessel - Record container loaded on vessel
// Updates status from CONTAINER_STUFFED to VESSEL_LOADED
func (c *CoffeeContract) LoadOnVessel(ctx contractapi.TransactionContextInterface,
	shipmentID, notes string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("LoadOnVessel: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("LoadOnVessel: %w", err)
	}

	if shipment.Status != "CONTAINER_STUFFED" {
		return fmt.Errorf("shipment must be CONTAINER_STUFFED to load on vessel, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "VESSEL_LOADED"
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "VesselName", OldValue: "", NewValue: shipment.VesselName, DataType: "string"},
		{FieldName: "VoyageNumber", OldValue: "", NewValue: shipment.VoyageNumber, DataType: "string"},
		{FieldName: "ContainerNumber", OldValue: "", NewValue: shipment.ContainerNumber, DataType: "string"},
		{FieldName: "ContainerType", OldValue: "", NewValue: shipment.ContainerType, DataType: "string"},
		{FieldName: "SealNumber", OldValue: "", NewValue: shipment.StuffingSealNumber, DataType: "string"},
		{FieldName: "BillOfLading", OldValue: "", NewValue: shipment.BillOfLadingNo, DataType: "string"},
		{FieldName: "Notes", OldValue: "", NewValue: notes, DataType: "string"},
		{FieldName: "Quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
	}

	err = c.CreateAuditLog(ctx, "VESSEL_LOADING", "SHIPMENT", shipmentID,
		previousStatus, "VESSEL_LOADED", changes,
		fmt.Sprintf("Container loaded on vessel %s (voyage %s). %s", shipment.VesselName, shipment.VoyageNumber, notes),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":  "VesselLoaded",
		"shipmentID": shipmentID,
		"vessel":     shipment.VesselName,
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("VesselLoaded", eventJSON)

	fmt.Printf("LoadOnVessel: Shipment %s loaded on vessel %s\n", shipmentID, shipment.VesselName)
	return nil
}

// DepartFromPort - Record vessel departure
// Updates status from VESSEL_LOADED to DEPARTED
func (c *CoffeeContract) DepartFromPort(ctx contractapi.TransactionContextInterface,
	shipmentID, notes string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("DepartFromPort: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("DepartFromPort: %w", err)
	}

	if shipment.Status != "VESSEL_LOADED" {
		return fmt.Errorf("shipment must be VESSEL_LOADED to depart, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "DEPARTED"
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "DeparturePort", OldValue: "", NewValue: shipment.DeparturePort, DataType: "string"},
		{FieldName: "VesselName", OldValue: "", NewValue: shipment.VesselName, DataType: "string"},
		{FieldName: "VoyageNumber", OldValue: "", NewValue: shipment.VoyageNumber, DataType: "string"},
		{FieldName: "DepartureTime", OldValue: "", NewValue: timestamp.Format(time.RFC3339), DataType: "datetime"},
		{FieldName: "DestinationPort", OldValue: "", NewValue: shipment.DestinationPort, DataType: "string"},
		{FieldName: "ContainerNumber", OldValue: "", NewValue: shipment.ContainerNumber, DataType: "string"},
		{FieldName: "BillOfLading", OldValue: "", NewValue: shipment.BillOfLadingNo, DataType: "string"},
		{FieldName: "Notes", OldValue: "", NewValue: notes, DataType: "string"},
		{FieldName: "Quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
	}

	err = c.CreateAuditLog(ctx, "VESSEL_DEPARTURE", "SHIPMENT", shipmentID,
		previousStatus, "DEPARTED", changes,
		fmt.Sprintf("Vessel %s departed from %s port (voyage %s). %s", shipment.VesselName, shipment.DeparturePort, shipment.VoyageNumber, notes),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":  "VesselDeparted",
		"shipmentID": shipmentID,
		"port":       shipment.DeparturePort,
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("VesselDeparted", eventJSON)

	fmt.Printf("DepartFromPort: Vessel with shipment %s departed from %s\n", shipmentID, shipment.DeparturePort)
	return nil
}

// UpdateToInTransit - Update to in-transit (at sea)
// Updates status from DEPARTED to IN_TRANSIT
func (c *CoffeeContract) UpdateToInTransit(ctx contractapi.TransactionContextInterface,
	shipmentID, trackingNumber string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("UpdateToInTransit: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("UpdateToInTransit: %w", err)
	}

	if shipment.Status != "DEPARTED" {
		return fmt.Errorf("shipment must be DEPARTED to update to IN_TRANSIT, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "IN_TRANSIT"
	if trackingNumber != "" {
		shipment.TrackingNumber = trackingNumber
	}
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "TrackingNumber", OldValue: "", NewValue: shipment.TrackingNumber, DataType: "string"},
		{FieldName: "VesselName", OldValue: "", NewValue: shipment.VesselName, DataType: "string"},
		{FieldName: "VoyageNumber", OldValue: "", NewValue: shipment.VoyageNumber, DataType: "string"},
		{FieldName: "ContainerNumber", OldValue: "", NewValue: shipment.ContainerNumber, DataType: "string"},
		{FieldName: "DeparturePort", OldValue: "", NewValue: shipment.DeparturePort, DataType: "string"},
		{FieldName: "DestinationPort", OldValue: "", NewValue: shipment.DestinationPort, DataType: "string"},
		{FieldName: "BillOfLading", OldValue: "", NewValue: shipment.BillOfLadingNo, DataType: "string"},
		{FieldName: "Quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
	}

	err = c.CreateAuditLog(ctx, "IN_TRANSIT_UPDATE", "SHIPMENT", shipmentID,
		previousStatus, "IN_TRANSIT", changes,
		fmt.Sprintf("Shipment in transit at sea (tracking: %s)", shipment.TrackingNumber),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":  "InTransit",
		"shipmentID": shipmentID,
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("InTransit", eventJSON)

	fmt.Printf("UpdateToInTransit: Shipment %s is now in transit at sea\n", shipmentID)
	return nil
}

// ArriveAtDestination - Record arrival at destination port
// Updates status from IN_TRANSIT to DESTINATION_ARRIVED
func (c *CoffeeContract) ArriveAtDestination(ctx contractapi.TransactionContextInterface,
	shipmentID, notes string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("ArriveAtDestination: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("ArriveAtDestination: %w", err)
	}

	if shipment.Status != "IN_TRANSIT" {
		return fmt.Errorf("shipment must be IN_TRANSIT to arrive at destination, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "DESTINATION_ARRIVED"
	shipment.ActualArrival = timestamp.Format(time.RFC3339)
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "DestinationPort", OldValue: "", NewValue: shipment.DestinationPort, DataType: "string"},
		{FieldName: "ActualArrival", OldValue: "", NewValue: shipment.ActualArrival, DataType: "datetime"},
		{FieldName: "VesselName", OldValue: "", NewValue: shipment.VesselName, DataType: "string"},
		{FieldName: "VoyageNumber", OldValue: "", NewValue: shipment.VoyageNumber, DataType: "string"},
		{FieldName: "ContainerNumber", OldValue: "", NewValue: shipment.ContainerNumber, DataType: "string"},
		{FieldName: "BillOfLading", OldValue: "", NewValue: shipment.BillOfLadingNo, DataType: "string"},
		{FieldName: "TrackingNumber", OldValue: "", NewValue: shipment.TrackingNumber, DataType: "string"},
		{FieldName: "Notes", OldValue: "", NewValue: notes, DataType: "string"},
		{FieldName: "Quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
	}

	err = c.CreateAuditLog(ctx, "DESTINATION_ARRIVAL", "SHIPMENT", shipmentID,
		previousStatus, "DESTINATION_ARRIVED", changes,
		fmt.Sprintf("Shipment arrived at destination port %s. %s", shipment.DestinationPort, notes),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":  "DestinationArrival",
		"shipmentID": shipmentID,
		"port":       shipment.DestinationPort,
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("DestinationArrival", eventJSON)

	fmt.Printf("ArriveAtDestination: Shipment %s arrived at %s\n", shipmentID, shipment.DestinationPort)
	return nil
}

// CompleteDelivery - Final delivery confirmation
// Updates status from DESTINATION_ARRIVED to DELIVERED
func (c *CoffeeContract) CompleteDelivery(ctx contractapi.TransactionContextInterface,
	shipmentID, deliveryNotes string) error {

	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("CompleteDelivery: %w", err)
	}

	shipment, err := c.ReadShipment(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("CompleteDelivery: %w", err)
	}

	if shipment.Status != "DESTINATION_ARRIVED" {
		return fmt.Errorf("shipment must be DESTINATION_ARRIVED to complete delivery, current status: %s", shipment.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := shipment.Status
	shipment.Status = "DELIVERED"
	shipment.UpdatedAt = timestamp

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return fmt.Errorf("failed to marshal shipment: %v", err)
	}

	err = ctx.GetStub().PutState("SHIPMENT_"+shipmentID, shipmentJSON)
	if err != nil {
		return fmt.Errorf("failed to save shipment: %v", err)
	}

	// Create comprehensive audit trail - FINAL DELIVERY RECORD
	changes := []FieldChange{
		{FieldName: "Status", OldValue: previousStatus, NewValue: shipment.Status, DataType: "string"},
		{FieldName: "DeliveryConfirmed", OldValue: "", NewValue: timestamp.Format(time.RFC3339), DataType: "datetime"},
		{FieldName: "FinalDestination", OldValue: "", NewValue: shipment.DestinationPort, DataType: "string"},
		{FieldName: "Buyer", OldValue: "", NewValue: shipment.BuyerID, DataType: "string"},
		{FieldName: "ContractID", OldValue: "", NewValue: shipment.ContractID, DataType: "string"},
		{FieldName: "ExporterID", OldValue: "", NewValue: shipment.ExporterID, DataType: "string"},
		{FieldName: "BillOfLading", OldValue: "", NewValue: shipment.BillOfLadingNo, DataType: "string"},
		{FieldName: "ContainerNumber", OldValue: "", NewValue: shipment.ContainerNumber, DataType: "string"},
		{FieldName: "Vessel", OldValue: "", NewValue: fmt.Sprintf("%s (Voyage %s)", shipment.VesselName, shipment.VoyageNumber), DataType: "string"},
		{FieldName: "QuantityDelivered", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", shipment.Quantity), DataType: "number"},
		{FieldName: "Grade", OldValue: "", NewValue: shipment.Grade, DataType: "string"},
		{FieldName: "Origin", OldValue: "", NewValue: shipment.Origin, DataType: "string"},
		{FieldName: "ICONumber", OldValue: "", NewValue: shipment.ICONumber, DataType: "string"},
		{FieldName: "DeliveryNotes", OldValue: "", NewValue: deliveryNotes, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		
		ICOCompliance:  true,
	}

	err = c.CreateAuditLog(ctx, "DELIVERY_COMPLETE", "SHIPMENT", shipmentID,
		previousStatus, "DELIVERED", changes,
		fmt.Sprintf("Shipment delivered successfully to %s. %s", shipment.BuyerID, deliveryNotes),
		compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	event := map[string]interface{}{
		"eventType":  "DeliveryComplete",
		"shipmentID": shipmentID,
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("DeliveryComplete", eventJSON)

	fmt.Printf("CompleteDelivery: Shipment %s delivered successfully\n", shipmentID)
	return nil
}

// ==================== DATA MIGRATION FUNCTIONS ====================

// MigrateShipmentNullArrays - Fix null array fields in existing shipments
// This is a one-time migration function to fix legacy data
func (c *CoffeeContract) MigrateShipmentNullArrays(ctx contractapi.TransactionContextInterface) (string, error) {
	log.Println("=== MigrateShipmentNullArrays: Starting migration ===")
	
	// Use GetStateByRange to iterate through ALL keys in the ledger
	// This catches shipments regardless of how they're indexed
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "~")
	if err != nil {
		return "", fmt.Errorf("failed to get all state: %v", err)
	}
	defer resultsIterator.Close()

	fixedCount := 0
	skippedCount := 0
	errorCount := 0

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			log.Printf("ERROR: Iterator failed: %v", err)
			errorCount++
			continue
		}

		// Try to unmarshal as CoffeeShipment - if it fails, it's not a shipment
		var shipment CoffeeShipment
		err = json.Unmarshal(queryResponse.Value, &shipment)
		if err != nil {
			skippedCount++ // Not a shipment, skip silently
			continue
		}

		// Verify it's actually a shipment by checking for shipmentId field
		if shipment.ShipmentID == "" {
			skippedCount++ // Not a valid shipment
			continue
		}

		// Check if this shipment needs fixing
		needsFix := false
		
		if shipment.Documents == nil {
			shipment.Documents = []string{}
			needsFix = true
		}
		
		if shipment.ECXLots == nil {
			shipment.ECXLots = []string{}
			needsFix = true
		}

		if !needsFix {
			skippedCount++
			continue
		}

		// Update timestamp
		txTimestamp, err := ctx.GetStub().GetTxTimestamp()
		if err == nil {
			shipment.UpdatedAt = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
		}

		// Save updated shipment
		updatedJSON, err := json.Marshal(shipment)
		if err != nil {
			log.Printf("ERROR: Failed to marshal shipment %s: %v", shipment.ShipmentID, err)
			errorCount++
			continue
		}

		err = ctx.GetStub().PutState(queryResponse.Key, updatedJSON)
		if err != nil {
			log.Printf("ERROR: Failed to save shipment %s: %v", shipment.ShipmentID, err)
			errorCount++
			continue
		}

		fixedCount++
		if fixedCount%100 == 0 {
			log.Printf("Progress: Fixed %d shipments...", fixedCount)
		}
	}

	summary := fmt.Sprintf("Migration complete: Fixed=%d, Skipped=%d, Errors=%d", fixedCount, skippedCount, errorCount)
	log.Printf("=== MigrateShipmentNullArrays: %s ===", summary)
	
	return summary, nil
}

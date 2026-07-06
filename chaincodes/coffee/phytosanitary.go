package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== PHYTOSANITARY CERTIFICATE STRUCTURE ====================

type PhytosanitaryCertificate struct {
	CertificateID     string    `json:"certificateId"`
	ShipmentID        string    `json:"shipmentId"`
	ExporterID        string    `json:"exporterId"`
	InspectorName     string    `json:"inspectorName"`
	InspectionDate    time.Time `json:"inspectionDate"`
	BotanicalName     string    `json:"botanicalName"` // Coffea arabica
	CommonName        string    `json:"commonName"`    // Coffee
	TreatmentApplied  string    `json:"treatmentApplied"`
	TreatmentDate     string    `json:"treatmentDate"`
	TreatmentDuration string    `json:"treatmentDuration"`
	PlaceOfOrigin     string    `json:"placeOfOrigin"`     // Growing region
	PointOfEntry      string    `json:"pointOfEntry"`      // Destination port
	Quantity          float64   `json:"quantity"`          // kg
	PackagingType     string    `json:"packagingType"`     // Jute bags, containers
	NumberOfPackages  int       `json:"numberOfPackages"`  // e.g., 280 bags
	DistinguishMarks  string    `json:"distinguishMarks"`  // Package markings
	MeansOfConveyance string    `json:"meansOfConveyance"` // Container ship
	CertificateNumber string    `json:"certificateNumber"` // PHYTO-ET-YYYYMMDD-XXXXX
	ValidUntil        string    `json:"validUntil"`
	Status            string    `json:"status"`           // ISSUED, EXPIRED, REVOKED
	IssuedBy          string    `json:"issuedBy"`         // EAA officer
	InspectionResult  string    `json:"inspectionResult"` // PASSED, FAILED
	PestsFreeFrom     []string  `json:"pestsFreeFrom"`    // List of pests checked
	AdditionalInfo    string    `json:"additionalInfo"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// ==================== PHYTOSANITARY CERTIFICATE FUNCTIONS ====================

// IssuePhytosanitaryCertificate - Ministry of Agriculture/EAA issues certificate
func (c *CoffeeContract) IssuePhytosanitaryCertificate(ctx contractapi.TransactionContextInterface,
	certificateID, shipmentID, exporterID, inspectorName, botanicalName,
	treatmentApplied, placeOfOrigin, pointOfEntry, quantityStr,
	packagingType, numberOfPackagesStr, distinguishMarks, meansOfConveyance,
	issuedBy string) error {

	// Parse numeric values
	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity: %v", err)
	}

	numberOfPackages, err := strconv.Atoi(numberOfPackagesStr)
	if err != nil {
		return fmt.Errorf("invalid number of packages: %v", err)
	}

	// Verify shipment exists
	shipmentExists, err := c.ShipmentExists(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("failed to check shipment: %v", err)
	}
	if !shipmentExists {
		return fmt.Errorf("shipment %s does not exist", shipmentID)
	}

	// Check if certificate already exists
	existingCert, err := ctx.GetStub().GetState("PHYTO_" + certificateID)
	if err != nil {
		return fmt.Errorf("failed to read certificate: %v", err)
	}
	if existingCert != nil {
		return fmt.Errorf("phytosanitary certificate %s already exists", certificateID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Generate certificate number
	certificateNumber := fmt.Sprintf("PHYTO-ET-%s-%05d",
		txTime.Format("20060102"),
		txTime.Unix()%100000)

	// Set validity (typically 14 days)
	validUntil := txTime.AddDate(0, 0, 14).Format(time.RFC3339)

	// Default botanical name if not provided
	if botanicalName == "" || botanicalName == "AUTO" {
		botanicalName = "Coffea arabica"
	}

	certificate := PhytosanitaryCertificate{
		CertificateID:     certificateID,
		ShipmentID:        shipmentID,
		ExporterID:        exporterID,
		InspectorName:     inspectorName,
		InspectionDate:    txTime,
		BotanicalName:     botanicalName,
		CommonName:        "Coffee",
		TreatmentApplied:  treatmentApplied,
		TreatmentDate:     txTime.Format(time.RFC3339),
		PlaceOfOrigin:     placeOfOrigin,
		PointOfEntry:      pointOfEntry,
		Quantity:          quantity,
		PackagingType:     packagingType,
		NumberOfPackages:  numberOfPackages,
		DistinguishMarks:  distinguishMarks,
		MeansOfConveyance: meansOfConveyance,
		CertificateNumber: certificateNumber,
		ValidUntil:        validUntil,
		Status:            "ISSUED",
		IssuedBy:          issuedBy,
		InspectionResult:  "PASSED",
		PestsFreeFrom:     []string{"Coffee Berry Borer", "Coffee Leaf Rust", "Nematodes"},
		CreatedAt:         txTime,
		UpdatedAt:         txTime,
	}

	certificateJSON, err := json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	err = ctx.GetStub().PutState("PHYTO_"+certificateID, certificateJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "certificateId", OldValue: "", NewValue: certificateID, DataType: "string"},
		{FieldName: "shipmentId", OldValue: "", NewValue: shipmentID, DataType: "string"},
		{FieldName: "certificateNumber", OldValue: "", NewValue: certificateNumber, DataType: "string"},
		{FieldName: "status", OldValue: "", NewValue: "ISSUED", DataType: "string"},
		{FieldName: "quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", quantity), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  false,
		UCP600Check:    false,
		EUDRCompliance: true, // Plant health is part of EUDR due diligence
		ICOCompliance:  true,
		ComplianceNote: fmt.Sprintf("Phytosanitary certificate issued per IPPC standards: %s", certificateNumber),
	}

	err = c.CreateAuditLog(ctx, "ISSUE", "PHYTOSANITARY_CERTIFICATE", certificateID, "", "ISSUED",
		changes, fmt.Sprintf("Phytosanitary certificate issued by %s", issuedBy), compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	log.Printf("✅ Phytosanitary certificate issued: %s for shipment %s", certificateNumber, shipmentID)
	return nil
}

// ReadPhytosanitaryCertificate - Get certificate details
func (c *CoffeeContract) ReadPhytosanitaryCertificate(ctx contractapi.TransactionContextInterface,
	certificateID string) (*PhytosanitaryCertificate, error) {

	certificateJSON, err := ctx.GetStub().GetState("PHYTO_" + certificateID)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate: %v", err)
	}
	if certificateJSON == nil {
		return nil, fmt.Errorf("phytosanitary certificate %s does not exist", certificateID)
	}

	var certificate PhytosanitaryCertificate
	err = json.Unmarshal(certificateJSON, &certificate)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal certificate: %v", err)
	}

	return &certificate, nil
}

// RevokeCertificate - Revoke certificate (if issued in error or shipment cancelled)
func (c *CoffeeContract) RevokePhytosanitaryCertificate(ctx contractapi.TransactionContextInterface,
	certificateID, revokedBy, reason string) error {

	certificateJSON, err := ctx.GetStub().GetState("PHYTO_" + certificateID)
	if err != nil {
		return fmt.Errorf("failed to read certificate: %v", err)
	}
	if certificateJSON == nil {
		return fmt.Errorf("phytosanitary certificate %s does not exist", certificateID)
	}

	var certificate PhytosanitaryCertificate
	err = json.Unmarshal(certificateJSON, &certificate)
	if err != nil {
		return fmt.Errorf("failed to unmarshal certificate: %v", err)
	}

	if certificate.Status == "REVOKED" {
		return fmt.Errorf("certificate already revoked")
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := certificate.Status
	certificate.Status = "REVOKED"
	certificate.AdditionalInfo = fmt.Sprintf("Revoked by %s: %s", revokedBy, reason)
	certificate.UpdatedAt = txTime

	certificateJSON, err = json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	err = ctx.GetStub().PutState("PHYTO_"+certificateID, certificateJSON)
	if err != nil {
		return err
	}

	// Audit trail
	changes := []FieldChange{
		{FieldName: "status", OldValue: previousStatus, NewValue: "REVOKED", DataType: "string"},
		{FieldName: "revocationReason", OldValue: "", NewValue: reason, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		ComplianceNote: fmt.Sprintf("Certificate revoked: %s", reason),
	}

	c.CreateAuditLog(ctx, "REVOKE", "PHYTOSANITARY_CERTIFICATE", certificateID,
		previousStatus, "REVOKED", changes, reason, compliance)

	return nil
}

// QueryCertificatesByShipment - Get all certificates for a shipment
func (c *CoffeeContract) QueryPhytosanitaryCertificatesByShipment(ctx contractapi.TransactionContextInterface,
	shipmentID string) ([]*PhytosanitaryCertificate, error) {

	queryString := fmt.Sprintf(`{"selector":{"shipmentId":"%s"}}`, shipmentID)
	return c.queryPhytosanitaryCertificates(ctx, queryString)
}

// QueryCertificatesByExporter - Get all certificates for an exporter
func (c *CoffeeContract) QueryPhytosanitaryCertificatesByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*PhytosanitaryCertificate, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryPhytosanitaryCertificates(ctx, queryString)
}

// QueryAllPhytosanitaryCertificates - Get all certificates
func (c *CoffeeContract) QueryAllPhytosanitaryCertificates(ctx contractapi.TransactionContextInterface) ([]*PhytosanitaryCertificate, error) {

	resultsIterator, err := ctx.GetStub().GetStateByRange("PHYTO_", "PHYTO_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var certificates []*PhytosanitaryCertificate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var certificate PhytosanitaryCertificate
		err = json.Unmarshal(queryResponse.Value, &certificate)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal certificate: %v", err)
		}
		certificates = append(certificates, &certificate)
	}

	return certificates, nil
}

// Helper function for querying certificates
func (c *CoffeeContract) queryPhytosanitaryCertificates(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*PhytosanitaryCertificate, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query certificates: %v", err)
	}
	defer resultsIterator.Close()

	var certificates []*PhytosanitaryCertificate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var certificate PhytosanitaryCertificate
		err = json.Unmarshal(queryResponse.Value, &certificate)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal certificate: %v", err)
		}
		certificates = append(certificates, &certificate)
	}

	return certificates, nil
}

// PhytosanitaryCertificateExists - Check if certificate exists
func (c *CoffeeContract) PhytosanitaryCertificateExists(ctx contractapi.TransactionContextInterface,
	certificateID string) (bool, error) {

	certificateJSON, err := ctx.GetStub().GetState("PHYTO_" + certificateID)
	if err != nil {
		return false, fmt.Errorf("failed to read certificate: %v", err)
	}
	return certificateJSON != nil, nil
}

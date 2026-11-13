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
	Status            string    `json:"status"`           // PENDING, INSPECTED, ISSUED, EXPIRED, REVOKED
	IssuedBy          string    `json:"issuedBy"`         // EAA officer
	InspectionResult  string    `json:"inspectionResult"` // PASSED, FAILED
	PestsDetected     bool      `json:"pestsDetected"`    // Set by InspectPhytosanitaryCertificate
	DiseaseDetected   bool      `json:"diseaseDetected"`  // Set by InspectPhytosanitaryCertificate
	InspectionNotes   string    `json:"inspectionNotes"`  // Set by InspectPhytosanitaryCertificate
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
	issuedBy, certificateNumber string) error {

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
		// BRIDGE to the request -> inspect -> issue chain: a certificate
		// created by RequestPhytosanitaryCertificate and inspected by
		// InspectPhytosanitaryCertificate arrives here in INSPECTED.
		// Issue it in place (issuance fields only; the request and
		// inspection data recorded earlier are left intact) instead of
		// failing. Any other pre-existing status is still an error.
		var existing PhytosanitaryCertificate
		if err := json.Unmarshal(existingCert, &existing); err != nil {
			return fmt.Errorf("failed to unmarshal existing certificate: %v", err)
		}
		if existing.Status != "INSPECTED" {
			return fmt.Errorf("phytosanitary certificate %s already exists (status %s)", certificateID, existing.Status)
		}
		if existing.InspectionResult == "FAILED" {
			return fmt.Errorf("phytosanitary certificate %s failed inspection (pests or disease detected) and cannot be issued", certificateID)
		}
		issueTxTimestamp, err := ctx.GetStub().GetTxTimestamp()
		if err != nil {
			return fmt.Errorf("failed to get tx timestamp: %v", err)
		}
		issueTxTime := time.Unix(issueTxTimestamp.Seconds, int64(issueTxTimestamp.Nanos)).UTC()
		existing.Status = "ISSUED"
		// F15b (leg2): honour a supplied certificate number; generate
		// one only when none was supplied. The old code always
		// generated PHYTO-ET-... and silently ignored the number the
		// caller supplied.
		if certificateNumber == "" {
			certificateNumber = fmt.Sprintf("PHYTO-ET-%s-%05d",
				issueTxTime.Format("20060102"),
				issueTxTime.Unix()%100000)
		}
		existing.CertificateNumber = certificateNumber
		existing.ValidUntil = issueTxTime.AddDate(0, 0, 14).Format(time.RFC3339)
		existing.IssuedBy = issuedBy
		existing.UpdatedAt = issueTxTime
		existingJSON, err := json.Marshal(existing)
		if err != nil {
			return fmt.Errorf("failed to marshal certificate: %v", err)
		}
		if err := ctx.GetStub().PutState("PHYTO_"+certificateID, existingJSON); err != nil {
			return err
		}
		changes := []FieldChange{
			{FieldName: "certificateNumber", OldValue: "", NewValue: existing.CertificateNumber, DataType: "string"},
			{FieldName: "status", OldValue: "INSPECTED", NewValue: "ISSUED", DataType: "string"},
			{FieldName: "validUntil", OldValue: "", NewValue: existing.ValidUntil, DataType: "date"},
		}
		compliance := ComplianceMetadata{
			ECTACompliance: true,
			EUDRCompliance: true,
			ICOCompliance:  true,
			ComplianceNote: fmt.Sprintf("Phytosanitary certificate issued after inspection per IPPC standards: %s", existing.CertificateNumber),
		}
		if err := c.CreateAuditLog(ctx, "ISSUE", "PHYTOSANITARY_CERTIFICATE", certificateID, "INSPECTED", "ISSUED",
			changes, fmt.Sprintf("Phytosanitary certificate issued by %s", issuedBy), compliance); err != nil {
			return fmt.Errorf("IssuePhytosanitaryCertificate: failed to create audit log: %w", err)
		}
		log.Printf("✅ Phytosanitary certificate issued (after inspection): %s for shipment %s", existing.CertificateNumber, existing.ShipmentID)
		return nil
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Generate certificate number only when none was supplied (F15b —
	// see the bridge branch above).
	if certificateNumber == "" {
		certificateNumber = fmt.Sprintf("PHYTO-ET-%s-%05d",
			txTime.Format("20060102"),
			txTime.Unix()%100000)
	}

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
		return fmt.Errorf("IssuePhytosanitaryCertificate: failed to create audit log: %w", err)
	}

	log.Printf("✅ Phytosanitary certificate issued: %s for shipment %s", certificateNumber, shipmentID)
	return nil
}

// RequestPhytosanitaryCertificate - Exporter requests a phytosanitary certificate.
// First step of the request -> inspect -> issue chain: creates the
// certificate in PENDING. InspectPhytosanitaryCertificate moves it to
// INSPECTED, and IssuePhytosanitaryCertificate issues an INSPECTED
// certificate in place (see its bridge branch).
// Called by POST /phytosanitary/request with
// (certificateID, shipmentID, exporterID, plantDescription, quantity,
// treatmentApplied, placeOfOrigin, pointOfEntry, packagingType,
// numberOfPackages, distinguishingMarks, meansOfConveyance,
// validityPeriod) — leg2 #10: the seven trailing fields are the
// certificate data the form collects; pass "" for any that is unknown.
// The struct already carries them and Issue already passes them;
// Request is what never set them.
func (c *CoffeeContract) RequestPhytosanitaryCertificate(ctx contractapi.TransactionContextInterface,
	certificateID, shipmentID, exporterID, plantDescription, quantityStr, treatmentApplied,
	placeOfOrigin, pointOfEntry, packagingType, numberOfPackagesStr, distinguishingMarks,
	meansOfConveyance, validityPeriod string) error {

	// The trailing certificate fields are optional: an empty
	// numberOfPackages parses to 0, the rest stay "".
	numberOfPackages := 0
	if numberOfPackagesStr != "" {
		n, err := strconv.Atoi(numberOfPackagesStr)
		if err != nil {
			return fmt.Errorf("RequestPhytosanitaryCertificate: invalid numberOfPackages: %w", err)
		}
		numberOfPackages = n
	}

	if err := ValidateID(certificateID, "certificateID"); err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: %w", err)
	}
	if err := ValidateID(shipmentID, "shipmentID"); err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: %w", err)
	}
	if err := ValidateID(exporterID, "exporterID"); err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: %w", err)
	}
	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: invalid quantity: %w", err)
	}
	if err := ValidateQuantity(quantity, "quantity"); err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: %w", err)
	}
	// F15a (leg2): plantDescription is required — the API and the
	// form require it, so a direct Fabric caller must not be able to
	// create a certificate with the silent default either.
	if err := ValidateNonEmptyString(plantDescription, "plantDescription", MaxStringLen); err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: %w", err)
	}
	if treatmentApplied == "" {
		treatmentApplied = "Fumigation"
	}

	shipmentExists, err := c.ShipmentExists(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: failed to check shipment: %w", err)
	}
	if !shipmentExists {
		return fmt.Errorf("RequestPhytosanitaryCertificate: shipment %s does not exist", shipmentID)
	}

	existingCert, err := ctx.GetStub().GetState("PHYTO_" + certificateID)
	if err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: failed to read certificate: %w", err)
	}
	if existingCert != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: phytosanitary certificate %s already exists", certificateID)
	}

	txTime, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: failed to read Fabric transaction timestamp: %w", err)
	}

	certificate := PhytosanitaryCertificate{
		CertificateID:    certificateID,
		ShipmentID:       shipmentID,
		ExporterID:       exporterID,
		BotanicalName:    plantDescription,
		CommonName:       "Coffee",
		TreatmentApplied: treatmentApplied,
		PlaceOfOrigin:    placeOfOrigin,
		PointOfEntry:     pointOfEntry,
		Quantity:         quantity,
		PackagingType:    packagingType,
		NumberOfPackages: numberOfPackages,
		DistinguishMarks: distinguishingMarks,
		MeansOfConveyance: meansOfConveyance,
		ValidUntil:       validityPeriod,
		Status:           "PENDING",
		CreatedAt:        txTime,
		UpdatedAt:        txTime,
	}

	certificateJSON, err := json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: failed to marshal certificate: %w", err)
	}
	if err := ctx.GetStub().PutState("PHYTO_"+certificateID, certificateJSON); err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: failed to save certificate: %w", err)
	}

	changes := []FieldChange{
		{FieldName: "certificateId", OldValue: "", NewValue: certificateID, DataType: "string"},
		{FieldName: "shipmentId", OldValue: "", NewValue: shipmentID, DataType: "string"},
		{FieldName: "status", OldValue: "", NewValue: "PENDING", DataType: "string"},
		{FieldName: "quantity", OldValue: "", NewValue: fmt.Sprintf("%.2f kg", quantity), DataType: "number"},
	}
	compliance := ComplianceMetadata{
		ECTACompliance: true,
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: "Phytosanitary certificate requested per IPPC standards.",
	}
	if err := c.CreateAuditLog(ctx, "REQUEST", "PHYTOSANITARY_CERTIFICATE", certificateID, "", "PENDING",
		changes, fmt.Sprintf("Phytosanitary certificate requested by %s", exporterID), compliance); err != nil {
		return fmt.Errorf("RequestPhytosanitaryCertificate: failed to create audit log: %w", err)
	}

	log.Printf("✅ Phytosanitary certificate requested: %s for shipment %s", certificateID, shipmentID)
	return nil
}

// InspectPhytosanitaryCertificate - ECTA inspects a requested certificate.
// PENDING -> INSPECTED. The inspection result is FAILED when pests or
// disease are detected, PASSED otherwise; a FAILED certificate stays
// INSPECTED (it can still be revoked, but Issue only accepts INSPECTED
// certificates whose inspection passed — see IssuePhytosanitaryCertificate).
// Called by POST /phytosanitary/:certificateID/inspect with
// (certificateID, inspectorName, inspectionDate, pestsDetected,
// diseaseDetected, inspectionNotes). pestsDetected/diseaseDetected arrive
// as "true"/"false" strings.
func (c *CoffeeContract) InspectPhytosanitaryCertificate(ctx contractapi.TransactionContextInterface,
	certificateID, inspectorName, inspectionDate, pestsDetected, diseaseDetected, inspectionNotes string) error {

	if err := ValidateID(certificateID, "certificateID"); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: %w", err)
	}
	if err := ValidateNonEmptyString(inspectorName, "inspectorName", MaxStringLen); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: %w", err)
	}
	if err := ValidateDate(inspectionDate); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: %w", err)
	}
	if err := ValidateBoolean(pestsDetected, "pestsDetected"); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: %w", err)
	}
	if err := ValidateBoolean(diseaseDetected, "diseaseDetected"); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: %w", err)
	}

	certificateJSON, err := ctx.GetStub().GetState("PHYTO_" + certificateID)
	if err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: failed to read certificate: %w", err)
	}
	if certificateJSON == nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: phytosanitary certificate %s does not exist", certificateID)
	}

	var certificate PhytosanitaryCertificate
	if err := json.Unmarshal(certificateJSON, &certificate); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: failed to unmarshal certificate: %w", err)
	}

	if certificate.Status != "PENDING" {
		return fmt.Errorf("InspectPhytosanitaryCertificate: only PENDING certificates can be inspected, current status: %s", certificate.Status)
	}

	inspectionTime, err := time.Parse(time.RFC3339, inspectionDate)
	if err != nil {
		inspectionTime, err = time.Parse("2006-01-02", inspectionDate)
		if err != nil {
			return fmt.Errorf("InspectPhytosanitaryCertificate: invalid inspectionDate: %w", err)
		}
	}
	pests, err := strconv.ParseBool(pestsDetected)
	if err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: invalid pestsDetected: %w", err)
	}
	disease, err := strconv.ParseBool(diseaseDetected)
	if err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: invalid diseaseDetected: %w", err)
	}

	txTime, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: failed to read Fabric transaction timestamp: %w", err)
	}

	certificate.Status = "INSPECTED"
	certificate.InspectorName = inspectorName
	certificate.InspectionDate = inspectionTime
	certificate.PestsDetected = pests
	certificate.DiseaseDetected = disease
	certificate.InspectionNotes = inspectionNotes
	if pests || disease {
		certificate.InspectionResult = "FAILED"
	} else {
		certificate.InspectionResult = "PASSED"
	}
	certificate.UpdatedAt = txTime

	certificateJSON, err = json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: failed to marshal certificate: %w", err)
	}
	if err := ctx.GetStub().PutState("PHYTO_"+certificateID, certificateJSON); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: failed to save certificate: %w", err)
	}

	changes := []FieldChange{
		{FieldName: "status", OldValue: "PENDING", NewValue: "INSPECTED", DataType: "string"},
		{FieldName: "inspectorName", OldValue: "", NewValue: inspectorName, DataType: "string"},
		{FieldName: "inspectionDate", OldValue: "", NewValue: inspectionDate, DataType: "date"},
		{FieldName: "inspectionResult", OldValue: "", NewValue: certificate.InspectionResult, DataType: "string"},
	}
	compliance := ComplianceMetadata{
		ECTACompliance: true,
		EUDRCompliance: true,
		ICOCompliance:  true,
		ComplianceNote: fmt.Sprintf("Phytosanitary inspection by %s: %s", inspectorName, certificate.InspectionResult),
	}
	if err := c.CreateAuditLog(ctx, "INSPECT", "PHYTOSANITARY_CERTIFICATE", certificateID, "PENDING", "INSPECTED",
		changes, fmt.Sprintf("Phytosanitary inspection completed by %s: %s", inspectorName, certificate.InspectionResult), compliance); err != nil {
		return fmt.Errorf("InspectPhytosanitaryCertificate: failed to create audit log: %w", err)
	}

	log.Printf("✅ Phytosanitary certificate inspected: %s — %s", certificateID, certificate.InspectionResult)
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

	// RequestPhytosanitaryCertificate never sets PestsFreeFrom, so a
	// requested/inspected certificate stores it as null; the response
	// schema requires an array, so the read 500'd on every fresh cert.
	if certificate.PestsFreeFrom == nil {
		certificate.PestsFreeFrom = []string{}
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
		if certificate.PestsFreeFrom == nil {
			certificate.PestsFreeFrom = []string{}
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
		if certificate.PestsFreeFrom == nil {
			certificate.PestsFreeFrom = []string{}
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

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== INSURANCE CERTIFICATE STRUCTURE ====================

type InsuranceCertificate struct {
	InsuranceID       string    `json:"insuranceId"`
	ShipmentID        string    `json:"shipmentId"`
	ContractID        string    `json:"contractId"`
	PolicyNumber      string    `json:"policyNumber"`
	InsuranceCompany  string    `json:"insuranceCompany"`
	InsuredValue      float64   `json:"insuredValue"`    // Invoice value + 10%
	Currency          string    `json:"currency"`        // USD, EUR
	CoverageType      string    `json:"coverageType"`    // ICC(A), ICC(B), ICC(C)
	CoverageDetails   string    `json:"coverageDetails"` // All Risks, Named Perils, etc.
	ValidFrom         string    `json:"validFrom"`
	ValidUntil        string    `json:"validUntil"`
	VesselName        string    `json:"vesselName"`
	VoyageNumber      string    `json:"voyageNumber"`
	ContainerNumber   string    `json:"containerNumber"`
	PortOfLoading     string    `json:"portOfLoading"`
	PortOfDischarge   string    `json:"portOfDischarge"`
	GoodsDescription  string    `json:"goodsDescription"`  // Coffee Arabica Grade 1
	Quantity          float64   `json:"quantity"`          // kg
	Incoterm          string    `json:"incoterm"`          // CIF (insurance required)
	ClaimsPayable     string    `json:"claimsPayable"`     // Location for claims
	CertificateNumber string    `json:"certificateNumber"` // Format: INS-YYYY-XXXXX
	CertificateHash   string    `json:"certificateHash"`   // PDF hash
	Status            string    `json:"status"`            // ISSUED, EXPIRED, CLAIMED
	IssuedBy          string    `json:"issuedBy"`          // Insurance agent/company
	IssuedAt          time.Time `json:"issuedAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// ==================== INSURANCE CERTIFICATE FUNCTIONS ====================

// IssueInsuranceCertificate - Insurance company/agent issues certificate
func (c *CoffeeContract) IssueInsuranceCertificate(ctx contractapi.TransactionContextInterface,
	insuranceID, shipmentID, contractID, policyNumber, insuranceCompany,
	insuredValueStr, currency, coverageType, vesselName, voyageNumber,
	containerNumber, portOfLoading, portOfDischarge, goodsDescription,
	quantityStr, incoterm, claimsPayable, issuedBy string) error {

	// Parse numeric values
	insuredValue, err := strconv.ParseFloat(insuredValueStr, 64)
	if err != nil {
		return fmt.Errorf("invalid insured value: %v", err)
	}

	quantity, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity: %v", err)
	}

	// Verify shipment exists
	shipmentExists, err := c.ShipmentExists(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("failed to check shipment: %v", err)
	}
	if !shipmentExists {
		return fmt.Errorf("shipment %s does not exist", shipmentID)
	}

	// Verify incoterm requires insurance (CIF)
	if incoterm != "CIF" && incoterm != "" {
		log.Printf("WARNING: Insurance issued for non-CIF incoterm: %s", incoterm)
	}

	// Check if certificate already exists
	existingCert, err := ctx.GetStub().GetState("INS_" + insuranceID)
	if err != nil {
		return fmt.Errorf("failed to read insurance certificate: %v", err)
	}
	if existingCert != nil {
		return fmt.Errorf("insurance certificate %s already exists", insuranceID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Generate certificate number
	certificateNumber := fmt.Sprintf("INS-%s-%05d",
		txTime.Format("2006"),
		txTime.Unix()%100000)

	// Set validity (from loading to 30 days after discharge)
	validFrom := txTime.Format(time.RFC3339)
	validUntil := txTime.AddDate(0, 0, 60).Format(time.RFC3339) // 60 days coverage

	// Default coverage details based on type
	coverageDetails := getCoverageDetails(coverageType)

	certificate := InsuranceCertificate{
		InsuranceID:       insuranceID,
		ShipmentID:        shipmentID,
		ContractID:        contractID,
		PolicyNumber:      policyNumber,
		InsuranceCompany:  insuranceCompany,
		InsuredValue:      insuredValue,
		Currency:          currency,
		CoverageType:      coverageType,
		CoverageDetails:   coverageDetails,
		ValidFrom:         validFrom,
		ValidUntil:        validUntil,
		VesselName:        vesselName,
		VoyageNumber:      voyageNumber,
		ContainerNumber:   containerNumber,
		PortOfLoading:     portOfLoading,
		PortOfDischarge:   portOfDischarge,
		GoodsDescription:  goodsDescription,
		Quantity:          quantity,
		Incoterm:          incoterm,
		ClaimsPayable:     claimsPayable,
		CertificateNumber: certificateNumber,
		Status:            "ISSUED",
		IssuedBy:          issuedBy,
		IssuedAt:          txTime,
		UpdatedAt:         txTime,
	}

	certificateJSON, err := json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	err = ctx.GetStub().PutState("INS_"+insuranceID, certificateJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "insuranceId", OldValue: "", NewValue: insuranceID, DataType: "string"},
		{FieldName: "certificateNumber", OldValue: "", NewValue: certificateNumber, DataType: "string"},
		{FieldName: "insuredValue", OldValue: "", NewValue: fmt.Sprintf("%.2f %s", insuredValue, currency), DataType: "number"},
		{FieldName: "coverageType", OldValue: "", NewValue: coverageType, DataType: "string"},
		{FieldName: "status", OldValue: "", NewValue: "ISSUED", DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: false,
		NBECompliance:  false,
		UCP600Check:    true, // Insurance required for CIF/CIP incoterms under UCP 600
		EUDRCompliance: false,
		ICOCompliance:  false,
		ComplianceNote: fmt.Sprintf("Marine cargo insurance issued: %s, Coverage: %s", certificateNumber, coverageType),
	}

	err = c.CreateAuditLog(ctx, "ISSUE", "INSURANCE_CERTIFICATE", insuranceID, "", "ISSUED",
		changes, fmt.Sprintf("Insurance certificate issued by %s", insuranceCompany), compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	log.Printf("✅ Insurance certificate issued: %s for shipment %s", certificateNumber, shipmentID)
	return nil
}

// Helper function to get coverage details based on type
func getCoverageDetails(coverageType string) string {
	switch coverageType {
	case "ICC(A)":
		return "All Risks - Comprehensive coverage including theft, contamination, breakage"
	case "ICC(B)":
		return "Named Perils - Fire, explosion, vessel stranding, collision, discharge at distress port"
	case "ICC(C)":
		return "Minimum Coverage - Fire, explosion, vessel stranding, overturning/derailment"
	default:
		return "Standard marine cargo insurance"
	}
}

// ReadInsuranceCertificate - Get certificate details
func (c *CoffeeContract) ReadInsuranceCertificate(ctx contractapi.TransactionContextInterface,
	insuranceID string) (*InsuranceCertificate, error) {

	certificateJSON, err := ctx.GetStub().GetState("INS_" + insuranceID)
	if err != nil {
		return nil, fmt.Errorf("failed to read insurance certificate: %v", err)
	}
	if certificateJSON == nil {
		return nil, fmt.Errorf("insurance certificate %s does not exist", insuranceID)
	}

	var certificate InsuranceCertificate
	err = json.Unmarshal(certificateJSON, &certificate)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal certificate: %v", err)
	}

	return &certificate, nil
}

// RecordInsuranceClaim - Record claim filed against insurance
func (c *CoffeeContract) RecordInsuranceClaim(ctx contractapi.TransactionContextInterface,
	insuranceID, claimReason, claimAmount string) error {

	certificateJSON, err := ctx.GetStub().GetState("INS_" + insuranceID)
	if err != nil {
		return fmt.Errorf("failed to read insurance certificate: %v", err)
	}
	if certificateJSON == nil {
		return fmt.Errorf("insurance certificate %s does not exist", insuranceID)
	}

	var certificate InsuranceCertificate
	err = json.Unmarshal(certificateJSON, &certificate)
	if err != nil {
		return fmt.Errorf("failed to unmarshal certificate: %v", err)
	}

	if certificate.Status == "CLAIMED" {
		return fmt.Errorf("claim already recorded for this certificate")
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	previousStatus := certificate.Status
	certificate.Status = "CLAIMED"
	certificate.UpdatedAt = txTime

	certificateJSON, err = json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	err = ctx.GetStub().PutState("INS_"+insuranceID, certificateJSON)
	if err != nil {
		return err
	}

	// Audit trail
	changes := []FieldChange{
		{FieldName: "status", OldValue: previousStatus, NewValue: "CLAIMED", DataType: "string"},
		{FieldName: "claimReason", OldValue: "", NewValue: claimReason, DataType: "string"},
		{FieldName: "claimAmount", OldValue: "", NewValue: claimAmount, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ComplianceNote: fmt.Sprintf("Insurance claim filed: %s", claimReason),
	}

	c.CreateAuditLog(ctx, "CLAIM", "INSURANCE_CERTIFICATE", insuranceID,
		previousStatus, "CLAIMED", changes, claimReason, compliance)

	return nil
}

// QueryInsuranceCertificatesByShipment - Get all certificates for a shipment
func (c *CoffeeContract) QueryInsuranceCertificatesByShipment(ctx contractapi.TransactionContextInterface,
	shipmentID string) ([]*InsuranceCertificate, error) {

	queryString := fmt.Sprintf(`{"selector":{"shipmentId":"%s"}}`, shipmentID)
	return c.queryInsuranceCertificates(ctx, queryString)
}

// QueryInsuranceCertificatesByContract - Get all certificates for a contract
func (c *CoffeeContract) QueryInsuranceCertificatesByContract(ctx contractapi.TransactionContextInterface,
	contractID string) ([]*InsuranceCertificate, error) {

	queryString := fmt.Sprintf(`{"selector":{"contractId":"%s"}}`, contractID)
	return c.queryInsuranceCertificates(ctx, queryString)
}

// QueryAllInsuranceCertificates - Get all certificates
func (c *CoffeeContract) QueryAllInsuranceCertificates(ctx contractapi.TransactionContextInterface) ([]*InsuranceCertificate, error) {

	resultsIterator, err := ctx.GetStub().GetStateByRange("INS_", "INS_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var certificates []*InsuranceCertificate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var certificate InsuranceCertificate
		err = json.Unmarshal(queryResponse.Value, &certificate)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal certificate: %v", err)
		}
		certificates = append(certificates, &certificate)
	}

	return certificates, nil
}

// Helper function for querying certificates
func (c *CoffeeContract) queryInsuranceCertificates(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*InsuranceCertificate, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query insurance certificates: %v", err)
	}
	defer resultsIterator.Close()

	var certificates []*InsuranceCertificate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var certificate InsuranceCertificate
		err = json.Unmarshal(queryResponse.Value, &certificate)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal certificate: %v", err)
		}
		certificates = append(certificates, &certificate)
	}

	return certificates, nil
}

// InsuranceCertificateExists - Check if certificate exists
func (c *CoffeeContract) InsuranceCertificateExists(ctx contractapi.TransactionContextInterface,
	insuranceID string) (bool, error) {

	certificateJSON, err := ctx.GetStub().GetState("INS_" + insuranceID)
	if err != nil {
		return false, fmt.Errorf("failed to read insurance certificate: %v", err)
	}
	return certificateJSON != nil, nil
}

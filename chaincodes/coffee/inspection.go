package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== PRE-SHIPMENT INSPECTION STRUCTURE ====================
// International Trade Requirement: Independent quality inspection before shipment
// Common Inspectors: SGS, Intertek, Bureau Veritas, Control Union
// Purpose: Verify quality, quantity, packaging match contract specifications

type PreShipmentInspection struct {
	InspectionID        string    `json:"inspectionId"`
	ContractID          string    `json:"contractId"`
	ShipmentID          string    `json:"shipmentId"`          // Shipment being inspected
	ExporterID          string    `json:"exporterId"`
	InspectionAgency    string    `json:"inspectionAgency"`    // SGS, Intertek, Bureau Veritas
	InspectorName       string    `json:"inspectorName"`       // Inspector's name
	InspectorLicense    string    `json:"inspectorLicense"`    // Inspector license number
	
	// Inspection Request
	RequestedBy         string    `json:"requestedBy"`         // Usually exporter
	RequestDate         time.Time `json:"requestDate"`
	InspectionDate      string    `json:"inspectionDate"`      // Scheduled/actual date
	InspectionLocation  string    `json:"inspectionLocation"`  // Warehouse, port, etc.
	
	// Contract Specifications (what to verify against)
	ContractQuantity    float64   `json:"contractQuantity"`    // KG from contract
	ContractGrade       string    `json:"contractGrade"`       // Grade from contract
	ContractType        string    `json:"contractType"`        // Arabica, Robusta, etc.
	PackagingType       string    `json:"packagingType"`       // Jute bags, containers, etc.
	
	// Inspection Results - Quantity
	InspectedQuantity   float64   `json:"inspectedQuantity"`   // Actual KG inspected
	QuantityVariance    float64   `json:"quantityVariance"`    // Difference (+/-)
	QuantityAcceptable  bool      `json:"quantityAcceptable"`  // Within tolerance?
	
	// Inspection Results - Quality
	ActualGrade         string    `json:"actualGrade"`         // Grade determined by inspector
	CuppingScore        float64   `json:"cuppingScore"`        // 0-100 SCA scale
	DefectsCount        int       `json:"defectsCount"`        // Primary + secondary defects
	MoistureContent     float64   `json:"moistureContent"`     // Percentage (target: 11-12%)
	BeanSize            string    `json:"beanSize"`            // Screen size (15+, 16+, etc.)
	QualityAcceptable   bool      `json:"qualityAcceptable"`   // Meets contract specs?
	
	// Inspection Results - Packaging
	BagsInspected       int       `json:"bagsInspected"`       // Number of bags/containers
	PackagingCondition  string    `json:"packagingCondition"`  // NEW, GOOD, ACCEPTABLE, POOR
	PackagingAcceptable bool      `json:"packagingAcceptable"` // Meets export standards?
	
	// Inspection Results - Overall
	Status              string    `json:"status"`              // REQUESTED, SCHEDULED, IN_PROGRESS, COMPLETED, APPROVED, REJECTED
	OverallResult       string    `json:"overallResult"`       // PASS, FAIL, CONDITIONAL_PASS
	InspectionNotes     string    `json:"inspectionNotes"`     // Detailed findings
	Recommendations     string    `json:"recommendations"`     // Inspector recommendations
	
	// Certificate Details
	CertificateNumber   string    `json:"certificateNumber"`   // Inspection certificate number
	CertificateIssued   string    `json:"certificateIssued"`   // ISO date when certificate issued
	CertificateExpiry   string    `json:"certificateExpiry"`   // Certificate validity period
	CertificateURL      string    `json:"certificateUrl"`      // Link to digital certificate
	
	// Sample Testing
	SamplesTaken        int       `json:"samplesTaken"`        // Number of samples
	SampleIDs           []string  `json:"sampleIds"`           // Sample identification numbers
	LabTestRequired     bool      `json:"labTestRequired"`     // Need detailed lab analysis?
	LabTestCompleted    bool      `json:"labTestCompleted"`
	LabTestResults      string    `json:"labTestResults"`      // Lab analysis summary
	
	// Compliance Issues (if any)
	IssuesFound         []string  `json:"issuesFound"`         // List of issues/discrepancies
	CorrectiveActions   []string  `json:"correctiveActions"`   // Actions required
	ReInspectionRequired bool     `json:"reInspectionRequired"` // Need another inspection?
	
	// Approval Flow
	ApprovedBy          string    `json:"approvedBy"`          // ✅ X.509 cert (exporter/buyer)
	ApprovedByMSP       string    `json:"approvedByMsp"`       // ✅ MSP ID
	ApprovalDate        string    `json:"approvalDate"`        // Date approved for shipment
	RejectedBy          string    `json:"rejectedBy"`          // ✅ X.509 cert (if rejected)
	RejectedByMSP       string    `json:"rejectedByMsp"`       // ✅ MSP ID
	RejectionReason     string    `json:"rejectionReason"`
	
	// Audit Trail
	RecordedBy          string    `json:"recordedBy"`          // ✅ X.509 cert of inspector
	RecordedByMSP       string    `json:"recordedByMsp"`       // ✅ MSP ID
	LastUpdatedBy       string    `json:"lastUpdatedBy"`       // ✅ X.509 cert
	LastUpdatedByMSP    string    `json:"lastUpdatedByMsp"`    // ✅ MSP ID
	Comments            string    `json:"comments"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// ==================== INSPECTION FUNCTIONS ====================

// RequestPreShipmentInspection - Exporter requests inspection before shipment
// TRIGGER: After lot allocation, before shipment documentation
func (c *CoffeeContract) RequestPreShipmentInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, contractID, shipmentID, exporterID, inspectionAgency,
	inspectionLocation, contractQuantityStr, contractGrade, contractType, packagingType string) error {

	fmt.Printf("=== RequestPreShipmentInspection called: inspectionID=%s ===\n", inspectionID)

	// VALIDATION: IDs
	if err := ValidateID(inspectionID, "inspectionID"); err != nil {
		return fmt.Errorf("RequestPreShipmentInspection: %w", err)
	}

	// Parse quantity
	contractQuantity, err := strconv.ParseFloat(contractQuantityStr, 64)
	if err != nil {
		return fmt.Errorf("RequestPreShipmentInspection: invalid contractQuantity: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RequestPreShipmentInspection: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RequestPreShipmentInspection: failed to get MSP ID: %w", err)
	}

	// Create inspection request
	inspection := &PreShipmentInspection{
		InspectionID:         inspectionID,
		ContractID:           contractID,
		ShipmentID:           shipmentID,
		ExporterID:           exporterID,
		InspectionAgency:     inspectionAgency,
		RequestedBy:          clientID,
		RequestDate:          time.Now(),
		InspectionLocation:   inspectionLocation,
		ContractQuantity:     contractQuantity,
		ContractGrade:        contractGrade,
		ContractType:         contractType,
		PackagingType:        packagingType,
		Status:               "REQUESTED",
		IssuesFound:          []string{},
		CorrectiveActions:    []string{},
		SampleIDs:            []string{},
		RecordedBy:           clientID,
		RecordedByMSP:        mspID,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	inspectionJSON, err := json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("RequestPreShipmentInspection: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("RequestPreShipmentInspection: failed to put state: %w", err)
	}

	fmt.Printf("✅ Pre-shipment inspection requested: %s (Agency: %s)\n", inspectionID, inspectionAgency)

	return nil
}

// ScheduleInspection - Inspection agency schedules inspection date
func (c *CoffeeContract) ScheduleInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, inspectorName, inspectorLicense, inspectionDate string) error {

	// Get existing inspection
	inspectionJSON, err := ctx.GetStub().GetState(inspectionID)
	if err != nil {
		return fmt.Errorf("ScheduleInspection: failed to read inspection: %w", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("ScheduleInspection: inspection %s does not exist", inspectionID)
	}

	var inspection PreShipmentInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("ScheduleInspection: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ScheduleInspection: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ScheduleInspection: failed to get MSP ID: %w", err)
	}

	// Update inspection
	inspection.InspectorName = inspectorName
	inspection.InspectorLicense = inspectorLicense
	inspection.InspectionDate = inspectionDate
	inspection.Status = "SCHEDULED"
	inspection.LastUpdatedBy = clientID
	inspection.LastUpdatedByMSP = mspID
	inspection.UpdatedAt = time.Now()

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("ScheduleInspection: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("ScheduleInspection: failed to update state: %w", err)
	}

	log.Printf("✅ Inspection scheduled: %s on %s by %s\n", inspectionID, inspectionDate, inspectorName)

	return nil
}

// RecordInspectionResults - Inspector records inspection findings
// COMPREHENSIVE: Quality, quantity, packaging verification
func (c *CoffeeContract) RecordInspectionResults(ctx contractapi.TransactionContextInterface,
	inspectionID, inspectedQuantityStr, actualGrade, cuppingScoreStr, defectsCountStr,
	moistureContentStr, beanSize, bagsInspectedStr, packagingCondition,
	overallResult, inspectionNotes string) error {

	fmt.Printf("=== RecordInspectionResults called: inspectionID=%s ===\n", inspectionID)

	// Get existing inspection
	inspectionJSON, err := ctx.GetStub().GetState(inspectionID)
	if err != nil {
		return fmt.Errorf("RecordInspectionResults: failed to read inspection: %w", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("RecordInspectionResults: inspection %s does not exist", inspectionID)
	}

	var inspection PreShipmentInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("RecordInspectionResults: failed to unmarshal: %w", err)
	}

	// Parse numeric values
	inspectedQuantity, _ := strconv.ParseFloat(inspectedQuantityStr, 64)
	cuppingScore, _ := strconv.ParseFloat(cuppingScoreStr, 64)
	defectsCount, _ := strconv.Atoi(defectsCountStr)
	moistureContent, _ := strconv.ParseFloat(moistureContentStr, 64)
	bagsInspected, _ := strconv.Atoi(bagsInspectedStr)

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RecordInspectionResults: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RecordInspectionResults: failed to get MSP ID: %w", err)
	}

	// Update inspection results
	inspection.InspectedQuantity = inspectedQuantity
	inspection.ActualGrade = actualGrade
	inspection.CuppingScore = cuppingScore
	inspection.DefectsCount = defectsCount
	inspection.MoistureContent = moistureContent
	inspection.BeanSize = beanSize
	inspection.BagsInspected = bagsInspected
	inspection.PackagingCondition = packagingCondition
	inspection.OverallResult = overallResult
	inspection.InspectionNotes = inspectionNotes

	// Calculate quantity variance
	inspection.QuantityVariance = inspectedQuantity - inspection.ContractQuantity
	inspection.QuantityAcceptable = (inspection.QuantityVariance >= -5.0) // 5kg tolerance

	// Quality checks
	inspection.QualityAcceptable = (actualGrade == inspection.ContractGrade) && (cuppingScore >= 80.0)

	// Packaging checks
	inspection.PackagingAcceptable = (packagingCondition == "NEW" || packagingCondition == "GOOD" || packagingCondition == "ACCEPTABLE")

	// Determine status
	if overallResult == "PASS" {
		inspection.Status = "COMPLETED"
	} else if overallResult == "CONDITIONAL_PASS" {
		inspection.Status = "COMPLETED"
		inspection.ReInspectionRequired = false
	} else {
		inspection.Status = "COMPLETED"
		inspection.ReInspectionRequired = true
	}

	inspection.LastUpdatedBy = clientID
	inspection.LastUpdatedByMSP = mspID
	inspection.UpdatedAt = time.Now()

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("RecordInspectionResults: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("RecordInspectionResults: failed to update state: %w", err)
	}

	fmt.Printf("✅ Inspection results recorded: %s - Result: %s\n", inspectionID, overallResult)

	return nil
}

// IssueCertificate - Inspector issues inspection certificate
func (c *CoffeeContract) IssueCertificate(ctx contractapi.TransactionContextInterface,
	inspectionID, certificateNumber, certificateURL string) error {

	// Get existing inspection
	inspectionJSON, err := ctx.GetStub().GetState(inspectionID)
	if err != nil {
		return fmt.Errorf("IssueCertificate: failed to read inspection: %w", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("IssueCertificate: inspection %s does not exist", inspectionID)
	}

	var inspection PreShipmentInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("IssueCertificate: failed to unmarshal: %w", err)
	}

	// Set certificate details
	inspection.CertificateNumber = certificateNumber
	inspection.CertificateIssued = time.Now().Format("2006-01-02T15:04:05Z07:00")
	inspection.CertificateExpiry = time.Now().AddDate(0, 0, 90).Format("2006-01-02") // 90 days validity
	inspection.CertificateURL = certificateURL
	inspection.UpdatedAt = time.Now()

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("IssueCertificate: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("IssueCertificate: failed to update state: %w", err)
	}

	log.Printf("✅ Certificate issued: %s - Certificate Number: %s\n", inspectionID, certificateNumber)

	return nil
}

// ApproveInspection - Exporter/Buyer approves inspection for shipment
// AUTHORIZATION: Required before shipment can proceed
func (c *CoffeeContract) ApproveInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, comments string) error {

	// Get existing inspection
	inspectionJSON, err := ctx.GetStub().GetState(inspectionID)
	if err != nil {
		return fmt.Errorf("ApproveInspection: failed to read inspection: %w", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("ApproveInspection: inspection %s does not exist", inspectionID)
	}

	var inspection PreShipmentInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("ApproveInspection: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ApproveInspection: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ApproveInspection: failed to get MSP ID: %w", err)
	}

	// Set approval
	inspection.Status = "APPROVED"
	inspection.ApprovedBy = clientID
	inspection.ApprovedByMSP = mspID
	inspection.ApprovalDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	inspection.Comments = comments
	inspection.UpdatedAt = time.Now()

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("ApproveInspection: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("ApproveInspection: failed to update state: %w", err)
	}

	fmt.Printf("✅ Inspection approved: %s - Shipment can proceed\n", inspectionID)

	return nil
}

// RejectInspection - Buyer/Exporter rejects inspection results
func (c *CoffeeContract) RejectInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, rejectionReason string) error {

	// Get existing inspection
	inspectionJSON, err := ctx.GetStub().GetState(inspectionID)
	if err != nil {
		return fmt.Errorf("RejectInspection: failed to read inspection: %w", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("RejectInspection: inspection %s does not exist", inspectionID)
	}

	var inspection PreShipmentInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("RejectInspection: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RejectInspection: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RejectInspection: failed to get MSP ID: %w", err)
	}

	// Set rejection
	inspection.Status = "REJECTED"
	inspection.RejectedBy = clientID
	inspection.RejectedByMSP = mspID
	inspection.RejectionReason = rejectionReason
	inspection.ReInspectionRequired = true
	inspection.UpdatedAt = time.Now()

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("RejectInspection: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("RejectInspection: failed to update state: %w", err)
	}

	log.Printf("❌ Inspection rejected: %s - Reason: %s\n", inspectionID, rejectionReason)

	return nil
}

// ReadInspection - Get inspection details
func (c *CoffeeContract) ReadInspection(ctx contractapi.TransactionContextInterface,
	inspectionID string) (*PreShipmentInspection, error) {

	inspectionJSON, err := ctx.GetStub().GetState(inspectionID)
	if err != nil {
		return nil, fmt.Errorf("ReadInspection: failed to read: %w", err)
	}
	if inspectionJSON == nil {
		return nil, fmt.Errorf("ReadInspection: inspection %s does not exist", inspectionID)
	}

	var inspection PreShipmentInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return nil, fmt.Errorf("ReadInspection: failed to unmarshal: %w", err)
	}

	return &inspection, nil
}

// QueryInspectionsByShipment - Get inspections for a shipment
func (c *CoffeeContract) QueryInspectionsByShipment(ctx contractapi.TransactionContextInterface,
	shipmentID string) ([]*PreShipmentInspection, error) {

	queryString := fmt.Sprintf(`{"selector":{"shipmentId":"%s"}}`, shipmentID)
	return c.queryInspections(ctx, queryString)
}

// QueryInspectionsByStatus - Get inspections by status
func (c *CoffeeContract) QueryInspectionsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*PreShipmentInspection, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryInspections(ctx, queryString)
}

// QueryAllInspections - Get all inspections
func (c *CoffeeContract) QueryAllInspections(ctx contractapi.TransactionContextInterface) ([]*PreShipmentInspection, error) {

	queryString := `{"selector":{"inspectionId":{"$exists":true}}}`
	return c.queryInspections(ctx, queryString)
}

// Helper function for querying inspections
func (c *CoffeeContract) queryInspections(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*PreShipmentInspection, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query inspections: %w", err)
	}
	defer resultsIterator.Close()

	var inspections []*PreShipmentInspection

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var inspection PreShipmentInspection
		err = json.Unmarshal(queryResponse.Value, &inspection)
		if err != nil {
			return nil, err
		}

		inspections = append(inspections, &inspection)
	}

	return inspections, nil
}

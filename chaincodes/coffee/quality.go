package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== QUALITY INSPECTION STRUCTURE ====================

type QualityInspection struct {
	InspectionID       string    `json:"inspectionId"`
	ShipmentID         string    `json:"shipmentId"`
	ContractID         string    `json:"contractId"`
	ExporterID         string    `json:"exporterId"`
	InspectorID        string    `json:"inspectorId"`
	InspectorName      string    `json:"inspectorName"`
	InspectionDate     time.Time `json:"inspectionDate"`
	
	// Physical Inspection
	SampleSize         float64   `json:"sampleSize"`         // kg
	MoistureContent    float64   `json:"moistureContent"`    // percentage
	DefectCount        int       `json:"defectCount"`        // per 300g sample
	BeanSize           string    `json:"beanSize"`           // Screen size (14, 15, 16, 17, 18)
	Color              string    `json:"color"`              // Green, Bluish, Brownish
	Odor               string    `json:"odor"`               // Clean, Fermented, Musty, etc.
	
	// Cupping Test (SCA 100-point scale)
	Fragrance          float64   `json:"fragrance"`          // /10
	Flavor             float64   `json:"flavor"`             // /10
	Aftertaste         float64   `json:"aftertaste"`         // /10
	Acidity            float64   `json:"acidity"`            // /10
	Body               float64   `json:"body"`               // /10
	Balance            float64   `json:"balance"`            // /10
	Uniformity         float64   `json:"uniformity"`         // /10
	CleanCup           float64   `json:"cleanCup"`           // /10
	Sweetness          float64   `json:"sweetness"`          // /10
	Overall            float64   `json:"overall"`            // /10
	TotalScore         float64   `json:"totalScore"`         // Sum of above
	
	// Grading Results
	QualityGrade       string    `json:"qualityGrade"`       // Grade 1-9
	CuppingGrade       string    `json:"cuppingGrade"`       // Q-Grade (80+), Premium (85+), Specialty (90+)
	Classification     string    `json:"classification"`     // WASHED, NATURAL, HONEY
	
	// Compliance
	EUDRCompliant      bool      `json:"eudrCompliant"`
	PesticideTest      string    `json:"pesticideTest"`      // PASSED, FAILED, NOT_TESTED
	HeavyMetalTest     string    `json:"heavyMetalTest"`     // PASSED, FAILED, NOT_TESTED
	MycotoxinTest      string    `json:"mycotoxinTest"`      // PASSED, FAILED, NOT_TESTED
	
	// Result
	Status             string    `json:"status"`             // PENDING, INSPECTED, APPROVED, REJECTED, REWORK
	ExportPermitNo     string    `json:"exportPermitNo"`
	CertificateNo      string    `json:"certificateNo"`
	Remarks            string    `json:"remarks"`
	RejectionReason    string    `json:"rejectionReason"`
	
	ApprovedBy         string    `json:"approvedBy"`
	ApprovedDate       string    `json:"approvedDate"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// ==================== QUALITY INSPECTION FUNCTIONS ====================

// RequestInspection - Exporter requests quality inspection for shipment
func (c *CoffeeContract) RequestInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, shipmentID, contractID, exporterID string) error {

	// Verify shipment exists
	shipmentExists, err := c.ShipmentExists(ctx, shipmentID)
	if err != nil {
		return fmt.Errorf("failed to check shipment: %v", err)
	}
	if !shipmentExists {
		return fmt.Errorf("shipment %s does not exist", shipmentID)
	}

	// Check if inspection already exists
	existingInspection, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return fmt.Errorf("failed to read inspection: %v", err)
	}
	if existingInspection != nil {
		return fmt.Errorf("inspection %s already exists", inspectionID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	inspection := QualityInspection{
		InspectionID:   inspectionID,
		ShipmentID:     shipmentID,
		ContractID:     contractID,
		ExporterID:     exporterID,
		Status:         "PENDING",
		CreatedAt:      txTime,
		UpdatedAt:      txTime,
	}

	inspectionJSON, err := json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("failed to marshal inspection: %v", err)
	}

	return ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
}

// PerformInspection - ECTA inspector records inspection results
// AUTO-MAPS: Shipment and contract data for context
func (c *CoffeeContract) PerformInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, inspectorID, inspectorName,
	sampleSizeStr, moistureContentStr, defectCountStr, beanSize, color, odor,
	fragranceStr, flavorStr, aftertasteStr, acidityStr, bodyStr, balanceStr,
	uniformityStr, cleanCupStr, sweetnessStr, overallStr,
	classification, pesticideTest, heavyMetalTest, mycotoxinTest, remarks string) error {

	inspectionJSON, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return fmt.Errorf("failed to read inspection: %v", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("inspection %s does not exist", inspectionID)
	}

	var inspection QualityInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal inspection: %v", err)
	}

	if inspection.Status != "PENDING" {
		return fmt.Errorf("inspection already completed, current status: %s", inspection.Status)
	}

	// AUTO-MAP: Fetch shipment data for EUDR compliance
	if inspection.ShipmentID != "" {
		shipmentJSON, err := ctx.GetStub().GetState(inspection.ShipmentID)
		if err == nil && shipmentJSON != nil {
			var shipment CoffeeShipment
			if json.Unmarshal(shipmentJSON, &shipment) == nil {
				inspection.EUDRCompliant = shipment.EUDRCompliant
				fmt.Printf("PerformInspection: Auto-mapped EUDR compliance from shipment: %v\n", shipment.EUDRCompliant)
			}
		}
	}

	// Parse physical inspection parameters
	sampleSize, _ := strconv.ParseFloat(sampleSizeStr, 64)
	moistureContent, _ := strconv.ParseFloat(moistureContentStr, 64)
	defectCount, _ := strconv.Atoi(defectCountStr)

	// Parse cupping scores
	fragrance, _ := strconv.ParseFloat(fragranceStr, 64)
	flavor, _ := strconv.ParseFloat(flavorStr, 64)
	aftertaste, _ := strconv.ParseFloat(aftertasteStr, 64)
	acidity, _ := strconv.ParseFloat(acidityStr, 64)
	body, _ := strconv.ParseFloat(bodyStr, 64)
	balance, _ := strconv.ParseFloat(balanceStr, 64)
	uniformity, _ := strconv.ParseFloat(uniformityStr, 64)
	cleanCup, _ := strconv.ParseFloat(cleanCupStr, 64)
	sweetness, _ := strconv.ParseFloat(sweetnessStr, 64)
	overall, _ := strconv.ParseFloat(overallStr, 64)

	// Calculate total score
	totalScore := fragrance + flavor + aftertaste + acidity + body + balance + uniformity + cleanCup + sweetness + overall

	// Determine quality grade based on defects and cupping score
	qualityGrade := c.determineQualityGrade(defectCount, totalScore, moistureContent)
	cuppingGrade := c.determineCuppingGrade(totalScore)

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Update inspection
	inspection.InspectorID = inspectorID
	inspection.InspectorName = inspectorName
	inspection.InspectionDate = txTime
	inspection.SampleSize = sampleSize
	inspection.MoistureContent = moistureContent
	inspection.DefectCount = defectCount
	inspection.BeanSize = beanSize
	inspection.Color = color
	inspection.Odor = odor
	inspection.Fragrance = fragrance
	inspection.Flavor = flavor
	inspection.Aftertaste = aftertaste
	inspection.Acidity = acidity
	inspection.Body = body
	inspection.Balance = balance
	inspection.Uniformity = uniformity
	inspection.CleanCup = cleanCup
	inspection.Sweetness = sweetness
	inspection.Overall = overall
	inspection.TotalScore = totalScore
	inspection.QualityGrade = qualityGrade
	inspection.CuppingGrade = cuppingGrade
	inspection.Classification = classification
	inspection.PesticideTest = pesticideTest
	inspection.HeavyMetalTest = heavyMetalTest
	inspection.MycotoxinTest = mycotoxinTest
	inspection.Remarks = remarks
	inspection.Status = "INSPECTED"
	inspection.UpdatedAt = txTime

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("failed to marshal inspection: %v", err)
	}

	err = ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "PENDING", NewValue: "INSPECTED", DataType: "string"},
		{FieldName: "qualityGrade", OldValue: "", NewValue: qualityGrade, DataType: "string"},
		{FieldName: "cuppingGrade", OldValue: "", NewValue: cuppingGrade, DataType: "string"},
		{FieldName: "totalScore", OldValue: "", NewValue: fmt.Sprintf("%.2f", totalScore), DataType: "number"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    false,
		EUDRCompliance: inspection.EUDRCompliant,
		ICOCompliance:  true, // ICO quality standards applied
		ComplianceNote: fmt.Sprintf("Quality inspection performed, grade: %s, cupping score: %.2f", qualityGrade, totalScore),
	}

	err = c.CreateAuditLog(ctx, "INSPECT", "INSPECTION", inspectionID, "PENDING", "INSPECTED",
		changes, "Quality inspection performed by ECTA", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	return nil
}

// ApproveInspection - ECTA officer approves inspection (quality only, permit issued separately)
func (c *CoffeeContract) ApproveInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, approvedBy, certificateNo string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only ECTA can approve inspections
	if mspID != "ECTAMSP" {
		return fmt.Errorf("unauthorized: only ECTA can approve inspections (caller: %s)", mspID)
	}

	inspectionJSON, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return fmt.Errorf("failed to read inspection: %v", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("inspection %s does not exist", inspectionID)
	}

	var inspection QualityInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal inspection: %v", err)
	}

	if inspection.Status != "INSPECTED" {
		return fmt.Errorf("inspection must be completed before approval, current status: %s", inspection.Status)
	}

	// Validate quality grade (only Grade 1-5 can be approved for export)
	if inspection.QualityGrade == "Grade 6" || inspection.QualityGrade == "Grade 7" || 
	   inspection.QualityGrade == "Grade 8" || inspection.QualityGrade == "Grade 9" {
		return fmt.Errorf("coffee grade %s does not meet export quality standards", inspection.QualityGrade)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	inspection.Status = "APPROVED"
	inspection.ApprovedBy = approvedBy
	inspection.ApprovedDate = txTime.Format(time.RFC3339)
	inspection.CertificateNo = certificateNo
	inspection.UpdatedAt = txTime

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("failed to marshal inspection: %v", err)
	}

	err = ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "status", OldValue: "INSPECTED", NewValue: "APPROVED", DataType: "string"},
		{FieldName: "approvedBy", OldValue: "", NewValue: approvedBy, DataType: "string"},
		{FieldName: "certificateNo", OldValue: "", NewValue: certificateNo, DataType: "string"},
		{FieldName: "approvedDate", OldValue: "", NewValue: txTime.Format(time.RFC3339), DataType: "date"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true, // ECTA quality standards met
		NBECompliance:  true,
		UCP600Check:    false,
		EUDRCompliance: inspection.EUDRCompliant,
		ICOCompliance:  true,
		ComplianceNote: fmt.Sprintf("Quality approved: %s, Grade: %s, ready for export permit", inspection.CuppingGrade, inspection.QualityGrade),
	}

	err = c.CreateAuditLog(ctx, "APPROVE", "INSPECTION", inspectionID, "INSPECTED", "APPROVED",
		changes, "Quality inspection approved by ECTA", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	// Update shipment status to QUALITY_APPROVED (awaiting export permit)
	err = c.UpdateShipmentStatus(ctx, inspection.ShipmentID, "QUALITY_APPROVED")
	if err != nil {
		return fmt.Errorf("failed to update shipment status: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":     "InspectionApproved",
		"inspectionID":  inspectionID,
		"shipmentID":    inspection.ShipmentID,
		"qualityGrade":  inspection.QualityGrade,
		"cuppingGrade":  inspection.CuppingGrade,
		"timestamp":     txTime.Format(time.RFC3339),
		"approvedBy":    mspID,
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("InspectionApproved", eventJSON)

	return nil
}

// IssueExportPermit - ECTA issues export permit after quality approval (legally required)
func (c *CoffeeContract) IssueExportPermit(ctx contractapi.TransactionContextInterface,
	inspectionID, exportPermitNo, issuedBy string) error {

	inspectionJSON, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return fmt.Errorf("failed to read inspection: %v", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("inspection %s does not exist", inspectionID)
	}

	var inspection QualityInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal inspection: %v", err)
	}

	if inspection.Status != "APPROVED" {
		return fmt.Errorf("export permit can only be issued after quality approval, current status: %s", inspection.Status)
	}

	if inspection.ExportPermitNo != "" {
		return fmt.Errorf("export permit already issued: %s", inspection.ExportPermitNo)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	inspection.ExportPermitNo = exportPermitNo
	inspection.UpdatedAt = txTime

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("failed to marshal inspection: %v", err)
	}

	err = ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
	if err != nil {
		return err
	}

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	changes := []FieldChange{
		{FieldName: "exportPermitNo", OldValue: "", NewValue: exportPermitNo, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true, // ECTA export permit issued
		NBECompliance:  true,
		UCP600Check:    false,
		EUDRCompliance: inspection.EUDRCompliant,
		ICOCompliance:  true,
		ComplianceNote: fmt.Sprintf("ECTA export permit issued: %s, Grade: %s", exportPermitNo, inspection.QualityGrade),
	}

	err = c.CreateAuditLog(ctx, "ISSUE", "INSPECTION", inspectionID, "APPROVED", "PERMIT_ISSUED",
		changes, "ECTA export permit issued, ready for customs clearance", compliance)
	if err != nil {
		log.Printf("WARNING: Failed to create audit log: %v", err)
	}

	// Update shipment status to PERMIT_ISSUED (ready for customs)
	err = c.UpdateShipmentStatus(ctx, inspection.ShipmentID, "PERMIT_ISSUED")
	if err != nil {
		return fmt.Errorf("failed to update shipment status: %v", err)
	}

	return nil
}

// RejectInspection - ECTA officer rejects inspection
func (c *CoffeeContract) RejectInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, rejectedBy, rejectionReason string) error {

	inspectionJSON, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return fmt.Errorf("failed to read inspection: %v", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("inspection %s does not exist", inspectionID)
	}

	var inspection QualityInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal inspection: %v", err)
	}

	if inspection.Status != "INSPECTED" {
		return fmt.Errorf("inspection must be completed before rejection, current status: %s", inspection.Status)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	inspection.Status = "REJECTED"
	inspection.ApprovedBy = rejectedBy
	inspection.ApprovedDate = txTime.Format(time.RFC3339)
	inspection.RejectionReason = rejectionReason
	inspection.UpdatedAt = txTime

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("failed to marshal inspection: %v", err)
	}

	// Update shipment status to QUALITY_REJECTED
	err = c.UpdateShipmentStatus(ctx, inspection.ShipmentID, "QUALITY_REJECTED")
	if err != nil {
		return fmt.Errorf("failed to update shipment status: %v", err)
	}

	return ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
}

// ReadInspection - Get inspection details
func (c *CoffeeContract) ReadInspection(ctx contractapi.TransactionContextInterface,
	inspectionID string) (*QualityInspection, error) {

	inspectionJSON, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to read inspection: %v", err)
	}
	if inspectionJSON == nil {
		return nil, fmt.Errorf("inspection %s does not exist", inspectionID)
	}

	var inspection QualityInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal inspection: %v", err)
	}

	return &inspection, nil
}

// QueryInspectionsByExporter - Get all inspections for an exporter
func (c *CoffeeContract) QueryInspectionsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*QualityInspection, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryInspections(ctx, queryString)
}

// QueryInspectionsByStatus - Get all inspections with specific status
func (c *CoffeeContract) QueryInspectionsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*QualityInspection, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryInspections(ctx, queryString)
}

// QueryAllInspections - Get all inspections
func (c *CoffeeContract) QueryAllInspections(ctx contractapi.TransactionContextInterface) ([]*QualityInspection, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("INSPECTION_", "INSPECTION_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var inspections []*QualityInspection
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var inspection QualityInspection
		err = json.Unmarshal(queryResponse.Value, &inspection)
		if err != nil {
			return nil, err
		}
		inspections = append(inspections, &inspection)
	}

	return inspections, nil
}

// Helper function for querying inspections
func (c *CoffeeContract) queryInspections(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*QualityInspection, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query inspections: %v", err)
	}
	defer resultsIterator.Close()

	var inspections []*QualityInspection
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var inspection QualityInspection
		err = json.Unmarshal(queryResponse.Value, &inspection)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal inspection: %v", err)
		}
		inspections = append(inspections, &inspection)
	}

	return inspections, nil
}

// ==================== QUALITY GRADING LOGIC ====================

// Determine quality grade based on Ethiopian coffee grading standards
func (c *CoffeeContract) determineQualityGrade(defectCount int, cuppingScore, moistureContent float64) string {
	// Ethiopian grading standards:
	// Grade 1: 0-3 defects, >80 cupping score, <12% moisture
	// Grade 2: 4-12 defects, >80 cupping score, <12% moisture
	// Grade 3: 13-25 defects, 75-80 cupping score, <12% moisture
	// Grade 4: 26-45 defects, 70-75 cupping score, <13% moisture
	// Grade 5: 46-100 defects, 60-70 cupping score, <13% moisture
	// Grade 6-9: Higher defects or lower scores (not suitable for export)

	if moistureContent > 13 {
		return "Grade 9" // Excessive moisture
	}

	if defectCount <= 3 && cuppingScore >= 80 && moistureContent <= 12 {
		return "Grade 1"
	} else if defectCount <= 12 && cuppingScore >= 80 && moistureContent <= 12 {
		return "Grade 2"
	} else if defectCount <= 25 && cuppingScore >= 75 && moistureContent <= 12 {
		return "Grade 3"
	} else if defectCount <= 45 && cuppingScore >= 70 && moistureContent <= 13 {
		return "Grade 4"
	} else if defectCount <= 100 && cuppingScore >= 60 && moistureContent <= 13 {
		return "Grade 5"
	} else if defectCount <= 150 {
		return "Grade 6"
	} else if defectCount <= 200 {
		return "Grade 7"
	} else if defectCount <= 300 {
		return "Grade 8"
	}

	return "Grade 9"
}

// Determine cupping grade based on SCA standards
func (c *CoffeeContract) determineCuppingGrade(totalScore float64) string {
	if totalScore >= 90 {
		return "Specialty (90+)"
	} else if totalScore >= 85 {
		return "Premium (85-89)"
	} else if totalScore >= 80 {
		return "Q-Grade (80-84)"
	} else if totalScore >= 75 {
		return "Exchange Grade (75-79)"
	}
	return "Below Standard (<75)"
}

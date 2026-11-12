package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== QUALITY INSPECTION STRUCTURE ====================

type QualityInspection struct {
	InspectionID   string    `json:"inspectionId"`
	ShipmentID     string    `json:"shipmentId"`
	ContractID     string    `json:"contractId"`
	ExporterID     string    `json:"exporterId"`
	InspectorID    string    `json:"inspectorId"`
	InspectorName  string    `json:"inspectorName"`
	InspectionDate time.Time `json:"inspectionDate"`
	ScheduledDate  string    `json:"scheduledDate"`

	// Physical Inspection
	SampleSize      float64 `json:"sampleSize"`      // kg
	MoistureContent float64 `json:"moistureContent"` // percentage
	DefectCount     int     `json:"defectCount"`     // per 300g sample
	BeanSize        string  `json:"beanSize"`        // Screen size (14, 15, 16, 17, 18)
	Color           string  `json:"color"`           // Green, Bluish, Brownish
	Odor            string  `json:"odor"`            // Clean, Fermented, Musty, etc.

	// Cupping Test (SCA 100-point scale)
	Fragrance  float64 `json:"fragrance"`  // /10
	Flavor     float64 `json:"flavor"`     // /10
	Aftertaste float64 `json:"aftertaste"` // /10
	Acidity    float64 `json:"acidity"`    // /10
	Body       float64 `json:"body"`       // /10
	Balance    float64 `json:"balance"`    // /10
	Uniformity float64 `json:"uniformity"` // /10
	CleanCup   float64 `json:"cleanCup"`   // /10
	Sweetness  float64 `json:"sweetness"`  // /10
	Overall    float64 `json:"overall"`    // /10
	TotalScore float64 `json:"totalScore"` // Sum of above

	// Grading Results
	QualityGrade   string `json:"qualityGrade"`   // Grade 1-9
	CuppingGrade   string `json:"cuppingGrade"`   // Q-Grade (80+), Premium (85+), Specialty (90+)
	Classification string `json:"classification"` // WASHED, NATURAL, HONEY

	// Laboratory Test Results (ECTA certified labs)
	LaboratoryTestResults LaboratoryTestResults `json:"laboratoryTestResults"`
	LabCertificateNumber  string                `json:"labCertificateNumber"` // Lab certificate no
	LabTestDate           string                `json:"labTestDate"`          // ISO date

	// Phytosanitary Certificate (Plant health certificate)
	PhytosanitaryCertificate    string `json:"phytosanitaryCertificate"`    // Certificate number
	PhytosanitaryIssueDate      string `json:"phytosanitaryIssueDate"`      // ISO date
	PhytosanitaryExpiryDate     string `json:"phytosanitaryExpiryDate"`     // ISO date
	PhytosanitaryTreatment      string `json:"phytosanitaryTreatment"`      // Treatment applied (if any)
	PhytosanitaryDeclaration    string `json:"phytosanitaryDeclaration"`    // Free from pests/diseases
	PhytosanitaryIssuingOfficer string `json:"phytosanitaryIssuingOfficer"` // ECTA officer name

	// Compliance
	EUDRCompliant  bool   `json:"eudrCompliant"`
	PesticideTest  string `json:"pesticideTest"`  // PASSED, FAILED, NOT_TESTED
	HeavyMetalTest string `json:"heavyMetalTest"` // PASSED, FAILED, NOT_TESTED
	MycotoxinTest  string `json:"mycotoxinTest"`  // PASSED, FAILED, NOT_TESTED

	// Result
	Status          string `json:"status"` // PENDING, INSPECTED, APPROVED, REJECTED, REWORK
	ExportPermitNo  string `json:"exportPermitNo"`
	CertificateNo   string `json:"certificateNo"`
	Remarks         string `json:"remarks"`
	RejectionReason string `json:"rejectionReason"`

	ApprovedBy    string `json:"approvedBy"`
	ApprovedByMSP string `json:"approvedByMsp"` // MSP ID of approver
	ApprovedDate  string `json:"approvedDate"`
	// ✅ MSP Identity Fields for Rejection
	RejectedBy    string    `json:"rejectedBy"`    // X.509 certificate of rejecter
	RejectedByMSP string    `json:"rejectedByMsp"` // MSP ID of rejecter
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// Laboratory Test Results structure
type LaboratoryTestResults struct {
	MoistureContent   float64 `json:"moistureContent"`   // % (max 12.5% for green coffee)
	DefectCount       int     `json:"defectCount"`       // per 300g sample
	ScreenSize        string  `json:"screenSize"`        // 14, 15, 16, 17, 18
	Density           float64 `json:"density"`           // g/ml
	WaterActivity     float64 `json:"waterActivity"`     // aw (max 0.70 for storage stability)
	Ochratoxin        float64 `json:"ochratoxin"`        // ppb (max 5 ppb EU limit)
	Aflatoxin         float64 `json:"aflatoxin"`         // ppb (max 10 ppb)
	PesticideResidues string  `json:"pesticideResidues"` // BELOW_MRL, ABOVE_MRL, NOT_DETECTED
	HeavyMetals       string  `json:"heavyMetals"`       // PASS, FAIL (Pb, Cd, As, Hg)
	TestCompliant     bool    `json:"testCompliant"`     // Overall lab compliance
}

// ==================== QUALITY INSPECTION FUNCTIONS ====================

// RequestInspection - Exporter requests quality inspection for shipment
func (c *CoffeeContract) RequestInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, shipmentID, contractID, exporterID, scheduledDate string) error {

	// VALIDATION: IDs
	if err := ValidateID(inspectionID, "inspectionID"); err != nil {
		return fmt.Errorf("RequestInspection: %w", err)
	}
	if contractID != "" {
		if err := ValidateID(contractID, "contractID"); err != nil {
			return fmt.Errorf("RequestInspection: %w", err)
		}
	}
	if exporterID != "" {
		if err := ValidateID(exporterID, "exporterID"); err != nil {
			return fmt.Errorf("RequestInspection: %w", err)
		}
	}

	// Shipment is optional for compatibility with earlier workflow steps.
	// If it exists, keep the relationship; otherwise create the inspection record anyway.
	if shipmentID != "" {
		shipmentExists, err := c.ShipmentExists(ctx, shipmentID)
		if err != nil {
			return fmt.Errorf("failed to check shipment: %v", err)
		}
		if !shipmentExists {
			fmt.Printf("RequestInspection: shipment %s not found, creating inspection without shipment linkage\n", shipmentID)
		}
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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	inspection := QualityInspection{
		InspectionID:  inspectionID,
		ShipmentID:    shipmentID,
		ContractID:    contractID,
		ExporterID:    exporterID,
		Status:        "PENDING",
		ScheduledDate: scheduledDate,
		CreatedAt:     txTime,
		UpdatedAt:     txTime,
	}

	inspectionJSON, err := json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("failed to marshal inspection: %v", err)
	}

	err = ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
	if err != nil {
		return err
	}

	// Update shipment status when the shipment exists.
	if shipmentID != "" {
		err = c.UpdateShipmentStatus(ctx, shipmentID, "INSPECTION_PENDING")
		if err != nil {
			// Log but don't fail — inspection record is already saved
			fmt.Printf("WARNING: failed to update shipment status: %v\n", err)
		}
	}

	return nil
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
		return fmt.Errorf("PerformInspection: inspection %s already completed, current status: %s", inspectionID, inspection.Status)
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

	// VALIDATION: IDs
	if err := ValidateID(inspectorID, "inspectorID"); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	if err := ValidateNonEmptyString(inspectorName, "inspectorName", MaxStringLen); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}

	// Parse physical inspection parameters
	sampleSize, err := strconv.ParseFloat(sampleSizeStr, 64)
	if err != nil {
		return fmt.Errorf("PerformInspection: invalid sample size: %w", err)
	}
	if err := ValidateQuantity(sampleSize, "sampleSize"); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}

	moistureContent, err := strconv.ParseFloat(moistureContentStr, 64)
	if err != nil {
		return fmt.Errorf("PerformInspection: invalid moisture content: %w", err)
	}
	if err := ValidateMoistureContent(moistureContent); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}

	defectCount, err := strconv.Atoi(defectCountStr)
	if err != nil {
		return fmt.Errorf("PerformInspection: invalid defect count: %w", err)
	}
	if err := ValidateDefectCount(defectCount); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}

	// Parse cupping scores
	fragrance, _ := strconv.ParseFloat(fragranceStr, 64)
	if err := ValidateCuppingScore(fragrance); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	flavor, _ := strconv.ParseFloat(flavorStr, 64)
	if err := ValidateCuppingScore(flavor); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	aftertaste, _ := strconv.ParseFloat(aftertasteStr, 64)
	if err := ValidateCuppingScore(aftertaste); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	acidity, _ := strconv.ParseFloat(acidityStr, 64)
	if err := ValidateCuppingScore(acidity); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	body, _ := strconv.ParseFloat(bodyStr, 64)
	if err := ValidateCuppingScore(body); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	balance, _ := strconv.ParseFloat(balanceStr, 64)
	if err := ValidateCuppingScore(balance); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	uniformity, _ := strconv.ParseFloat(uniformityStr, 64)
	if err := ValidateCuppingScore(uniformity); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	cleanCup, _ := strconv.ParseFloat(cleanCupStr, 64)
	if err := ValidateCuppingScore(cleanCup); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	sweetness, _ := strconv.ParseFloat(sweetnessStr, 64)
	if err := ValidateCuppingScore(sweetness); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}
	overall, _ := strconv.ParseFloat(overallStr, 64)
	if err := ValidateCuppingScore(overall); err != nil {
		return fmt.Errorf("PerformInspection: %w", err)
	}

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
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

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
		return fmt.Errorf("PerformInspection: failed to create audit log: %w", err)
	}

	return nil
}

// ApproveQualityInspection - ECTA approves a performed quality inspection
// (TEST-STATUS-MATRIX §17 #6: the API quality approve was PG-only because no
// chaincode function existed for this entity. Mirrors ApproveInspection on
// the PreShipmentInspection entity, but operates on the QualityInspection
// entity, keyed INSPECTION_ + inspectionID — NOT on PreShipmentInspection,
// which lives under PREINSPECTION_ (inspection.go) — and guarded
// INSPECTED -> APPROVED.)
func (c *CoffeeContract) ApproveQualityInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, approvedBy string) error {
	ledgerNow, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("ApproveQualityInspection: failed to read Fabric transaction timestamp: %w", err)
	}

	inspectionJSON, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return fmt.Errorf("ApproveQualityInspection: failed to read inspection: %w", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("ApproveQualityInspection: inspection %s does not exist", inspectionID)
	}

	var inspection QualityInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("ApproveQualityInspection: failed to unmarshal: %w", err)
	}

	// GUARD: only an INSPECTED inspection can be approved.
	if inspection.Status != "INSPECTED" {
		return fmt.Errorf("ApproveQualityInspection: inspection must be INSPECTED to approve, current status: %s", inspection.Status)
	}

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ApproveQualityInspection: failed to get MSP ID: %w", err)
	}

	inspection.Status = "APPROVED"
	inspection.ApprovedBy = approvedBy
	inspection.ApprovedByMSP = mspID
	inspection.ApprovedDate = ledgerNow.Format("2006-01-02T15:04:05Z07:00")
	inspection.UpdatedAt = ledgerNow

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("ApproveQualityInspection: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("ApproveQualityInspection: failed to update state: %w", err)
	}

	// ✅ M1(a): an APPROVED inspection moves the linked shipment out of
	// INSPECTION_PENDING (set by RequestInspection, quality.go:172) into
	// INSPECTION_COMPLETE — the post-inspection state the
	// IssueCBEExportPermit cascade advances to PERMIT_ISSUED
	// (permit.go). The move happens here, at approval, not in
	// PerformInspection: only APPROVED means the shipment passed
	// quality. A performed-but-unapproved inspection, and a rejected
	// one (RejectQualityInspection), must not unlock a permit, so the
	// shipment stays INSPECTION_PENDING in those cases (fail-closed).
	// Best-effort like the RequestInspection and permit cascades: the
	// approval itself is already committed, so a failed shipment move
	// is logged, not fatal.
	if inspection.ShipmentID != "" {
		if err := c.UpdateShipmentStatus(ctx, inspection.ShipmentID, "INSPECTION_COMPLETE"); err != nil {
			fmt.Printf("ApproveQualityInspection: WARNING: failed to update shipment %s to INSPECTION_COMPLETE: %v\n", inspection.ShipmentID, err)
		} else {
			fmt.Printf("ApproveQualityInspection: Shipment %s status updated to INSPECTION_COMPLETE\n", inspection.ShipmentID)
		}
	}

	changes := []FieldChange{
		{FieldName: "status", OldValue: "INSPECTED", NewValue: "APPROVED", DataType: "string"},
		{FieldName: "approvedBy", OldValue: "", NewValue: approvedBy, DataType: "string"},
	}
	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    false,
		EUDRCompliance: inspection.EUDRCompliant,
		ICOCompliance:  true,
		ComplianceNote: "Quality inspection approved by ECTA",
	}
	err = c.CreateAuditLog(ctx, "APPROVE", "INSPECTION", inspectionID, "INSPECTED", "APPROVED",
		changes, "Quality inspection approved by ECTA", compliance)
	if err != nil {
		return fmt.Errorf("ApproveQualityInspection: failed to create audit log: %w", err)
	}

	return nil
}

// RejectQualityInspection - ECTA rejects a performed quality inspection
func (c *CoffeeContract) RejectQualityInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, reason string) error {
	ledgerNow, err := ledgerTransactionTime(ctx)
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to read Fabric transaction timestamp: %w", err)
	}

	inspectionJSON, err := ctx.GetStub().GetState("INSPECTION_" + inspectionID)
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to read inspection: %w", err)
	}
	if inspectionJSON == nil {
		return fmt.Errorf("RejectQualityInspection: inspection %s does not exist", inspectionID)
	}

	var inspection QualityInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to unmarshal: %w", err)
	}

	// GUARD: only an INSPECTED inspection can be rejected.
	if inspection.Status != "INSPECTED" {
		return fmt.Errorf("RejectQualityInspection: inspection must be INSPECTED to reject, current status: %s", inspection.Status)
	}

	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to get MSP ID: %w", err)
	}

	inspection.Status = "REJECTED"
	inspection.RejectionReason = reason
	inspection.RejectedBy = clientID
	inspection.RejectedByMSP = mspID
	inspection.UpdatedAt = ledgerNow

	inspectionJSON, err = json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState("INSPECTION_"+inspectionID, inspectionJSON)
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to update state: %w", err)
	}

	changes := []FieldChange{
		{FieldName: "status", OldValue: "INSPECTED", NewValue: "REJECTED", DataType: "string"},
		{FieldName: "rejectionReason", OldValue: "", NewValue: reason, DataType: "string"},
	}
	compliance := ComplianceMetadata{
		ECTACompliance: true,
		NBECompliance:  true,
		UCP600Check:    false,
		EUDRCompliance: inspection.EUDRCompliant,
		ICOCompliance:  true,
		ComplianceNote: "Quality inspection rejected by ECTA",
	}
	err = c.CreateAuditLog(ctx, "REJECT", "INSPECTION", inspectionID, "INSPECTED", "REJECTED",
		changes, "Quality inspection rejected by ECTA", compliance)
	if err != nil {
		return fmt.Errorf("RejectQualityInspection: failed to create audit log: %w", err)
	}

	return nil
}

// ==================== QUALITY GRADING LOGIC ====================

// Determine quality grade based on Ethiopian coffee grading standards
func (c *CoffeeContract) determineQualityGrade(defectCount int, cuppingScore, moistureContent float64) string {
	// Ethiopian grading standards (leg2 audit #19 — ONE moisture rule
	// everywhere: moisture must be <= 12% for export. The old rule let
	// 12–13% through as Grade 4/5 here while ECX grading rejected the
	// same lot at > 12%, so a 12.5% lot was rejected at the warehouse
	// but could pass quality inspection as Grade 4/5):
	// Grade 1: 0-3 defects, >80 cupping score, <12% moisture
	// Grade 2: 4-12 defects, >80 cupping score, <12% moisture
	// Grade 3: 13-25 defects, 75-80 cupping score, <12% moisture
	// Grade 4: 26-45 defects, 70-75 cupping score, <12% moisture
	// Grade 5: 46-100 defects, 60-70 cupping score, <12% moisture
	// Grade 6-9: Higher defects or lower scores (not suitable for export)

	if moistureContent > 12 {
		return "Grade 9" // Excessive moisture
	}

	if defectCount <= 3 && cuppingScore >= 80 && moistureContent <= 12 {
		return "Grade 1"
	} else if defectCount <= 12 && cuppingScore >= 80 && moistureContent <= 12 {
		return "Grade 2"
	} else if defectCount <= 25 && cuppingScore >= 75 && moistureContent <= 12 {
		return "Grade 3"
	} else if defectCount <= 45 && cuppingScore >= 70 && moistureContent <= 12 {
		return "Grade 4"
	} else if defectCount <= 100 && cuppingScore >= 60 && moistureContent <= 12 {
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

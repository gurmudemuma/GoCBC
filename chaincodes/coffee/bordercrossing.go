package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== BORDER CROSSING STRUCTURE ====================
// Ethiopian coffee exports primarily through: Djibouti (Port), Kenya (Transit), Sudan (Land)
// Required: Exit permits, customs clearance, cross-border tracking
// Purpose: Regulatory compliance, anti-smuggling, transit monitoring

type BorderCrossing struct {
	CrossingID          string    `json:"crossingId"`
	ShipmentID          string    `json:"shipmentId"`
	ContractID          string    `json:"contractId"`
	ExporterID          string    `json:"exporterId"`
	
	// Border Post Details
	BorderPost          string    `json:"borderPost"`          // GALAFI, MOYALE, METEMA, etc.
	BorderCountry       string    `json:"borderCountry"`       // Djibouti, Kenya, Sudan
	CrossingType        string    `json:"crossingType"`        // SEA_PORT, LAND, AIR
	TransitCountry      string    `json:"transitCountry"`      // If transit through another country
	FinalDestination    string    `json:"finalDestination"`    // Ultimate destination country
	
	// Exit Documentation
	ExitPermitNumber    string    `json:"exitPermitNumber"`    // Ethiopian customs exit permit
	ExitPermitIssued    string    `json:"exitPermitIssued"`    // ISO date
	ExitPermitExpiry    string    `json:"exitPermitExpiry"`    // Validity period
	CustomsDeclaration  string    `json:"customsDeclaration"`  // SAD (Single Administrative Document) number
	
	// Vehicle/Transport Details
	TransportMode       string    `json:"transportMode"`       // TRUCK, CONTAINER, RAIL
	VehicleNumber       string    `json:"vehicleNumber"`       // Truck plate or container number
	DriverName          string    `json:"driverName"`
	DriverLicense       string    `json:"driverLicense"`
	SealNumber          string    `json:"sealNumber"`          // Customs seal on container/truck
	
	// Cargo Details
	CargoWeight         float64   `json:"cargoWeight"`         // Total weight in KG
	NumberOfBags        int       `json:"numberOfBags"`        // Number of coffee bags
	ContainerNumbers    []string  `json:"containerNumbers"`    // If containerized
	
	// Crossing Timeline
	Status              string    `json:"status"`              // PENDING, CLEARED_EXIT, IN_TRANSIT, CROSSED, ARRIVED
	DepartureDate       string    `json:"departureDate"`       // Left Ethiopian territory
	CrossingDate        string    `json:"crossingDate"`        // Crossed border
	ArrivalDate         string    `json:"arrivalDate"`         // Arrived at destination (port/warehouse)
	TransitDuration     int       `json:"transitDuration"`     // Days in transit
	
	// Ethiopian Customs Clearance
	EthiopianCustomsOfficer string `json:"ethiopianCustomsOfficer"` // Officer who cleared
	EthiopianClearanceDate  string `json:"ethiopianClearanceDate"`  // Date cleared
	EthiopianClearanceRef   string `json:"ethiopianClearanceRef"`   // Clearance reference number
	
	// Border Country Clearance (if applicable)
	BorderCustomsOfficer string    `json:"borderCustomsOfficer"`    // Foreign customs officer
	BorderClearanceDate  string    `json:"borderClearanceDate"`     // Date cleared at border
	BorderClearanceRef   string    `json:"borderClearanceRef"`      // Border clearance reference
	BorderStampURL       string    `json:"borderStampUrl"`          // Scanned border stamp
	
	// Transit Monitoring
	LastKnownLocation   string    `json:"lastKnownLocation"`   // GPS or checkpoint
	LastLocationUpdate  string    `json:"lastLocationUpdate"`  // Timestamp
	TrackingNumber      string    `json:"trackingNumber"`      // If GPS tracked
	CheckpointsPassed   []string  `json:"checkpointsPassed"`   // List of checkpoints
	
	// Issues & Delays
	DelayReported       bool      `json:"delayReported"`
	DelayReason         string    `json:"delayReason"`         // Breakdown, inspection, etc.
	DelayDuration       int       `json:"delayDuration"`       // Hours delayed
	IssuesEncountered   []string  `json:"issuesEncountered"`   // List of problems
	
	// Verification & Compliance
	VerifiedBy          string    `json:"verifiedBy"`          // ✅ X.509 cert of verifier
	VerifiedByMSP       string    `json:"verifiedByMsp"`       // ✅ MSP ID
	VerificationDate    string    `json:"verificationDate"`
	ComplianceStatus    string    `json:"complianceStatus"`    // COMPLIANT, NON_COMPLIANT, UNDER_REVIEW
	ComplianceNotes     string    `json:"complianceNotes"`
	
	// Audit Trail
	RecordedBy          string    `json:"recordedBy"`          // ✅ X.509 cert
	RecordedByMSP       string    `json:"recordedByMsp"`       // ✅ MSP ID
	LastUpdatedBy       string    `json:"lastUpdatedBy"`       // ✅ X.509 cert
	LastUpdatedByMSP    string    `json:"lastUpdatedByMsp"`    // ✅ MSP ID
	Comments            string    `json:"comments"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// ==================== BORDER CROSSING FUNCTIONS ====================

// InitiateBorderCrossing - Customs initiates border crossing record
// TRIGGER: After export customs clearance, before physical departure
func (c *CoffeeContract) InitiateBorderCrossing(ctx contractapi.TransactionContextInterface,
	crossingID, shipmentID, contractID, exporterID, borderPost, borderCountry,
	crossingType, transitCountry, finalDestination, exitPermitNumber,
	customsDeclaration, transportMode, vehicleNumber, driverName, sealNumber,
	cargoWeightStr, numberOfBagsStr string) error {

	fmt.Printf("=== InitiateBorderCrossing called: crossingID=%s, borderPost=%s ===\n", crossingID, borderPost)

	// VALIDATION: IDs
	if err := ValidateID(crossingID, "crossingID"); err != nil {
		return fmt.Errorf("InitiateBorderCrossing: %w", err)
	}

	// Parse numeric values
	cargoWeight, err := parseFloat(cargoWeightStr)
	if err != nil {
		return fmt.Errorf("InitiateBorderCrossing: invalid cargoWeight: %w", err)
	}
	numberOfBags, err := parseInt(numberOfBagsStr)
	if err != nil {
		return fmt.Errorf("InitiateBorderCrossing: invalid numberOfBags: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("InitiateBorderCrossing: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("InitiateBorderCrossing: failed to get MSP ID: %w", err)
	}

	// Create border crossing record
	crossing := &BorderCrossing{
		CrossingID:          crossingID,
		ShipmentID:          shipmentID,
		ContractID:          contractID,
		ExporterID:          exporterID,
		BorderPost:          borderPost,
		BorderCountry:       borderCountry,
		CrossingType:        crossingType,
		TransitCountry:      transitCountry,
		FinalDestination:    finalDestination,
		ExitPermitNumber:    exitPermitNumber,
		ExitPermitIssued:    time.Now().Format("2006-01-02"),
		CustomsDeclaration:  customsDeclaration,
		TransportMode:       transportMode,
		VehicleNumber:       vehicleNumber,
		DriverName:          driverName,
		SealNumber:          sealNumber,
		CargoWeight:         cargoWeight,
		NumberOfBags:        numberOfBags,
		Status:              "PENDING",
		ContainerNumbers:    []string{},
		CheckpointsPassed:   []string{},
		IssuesEncountered:   []string{},
		RecordedBy:          clientID,
		RecordedByMSP:       mspID,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	crossingJSON, err := json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("InitiateBorderCrossing: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("InitiateBorderCrossing: failed to put state: %w", err)
	}

	fmt.Printf("✅ Border crossing initiated: %s → %s (%s)\n", crossingID, borderPost, borderCountry)

	return nil
}

// ClearForExit - Ethiopian customs clears cargo for exit
// AUTHORIZATION: Required before departure
func (c *CoffeeContract) ClearForExit(ctx contractapi.TransactionContextInterface,
	crossingID, customsOfficer, clearanceRef string) error {

	fmt.Printf("=== ClearForExit called: crossingID=%s ===\n", crossingID)

	// Get existing crossing
	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return fmt.Errorf("ClearForExit: failed to read crossing: %w", err)
	}
	if crossingJSON == nil {
		return fmt.Errorf("ClearForExit: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return fmt.Errorf("ClearForExit: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("ClearForExit: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("ClearForExit: failed to get MSP ID: %w", err)
	}

	// RBAC: Only Ethiopian Customs can clear for exit
	if mspID != "CustomsMSP" {
		return fmt.Errorf("ClearForExit: unauthorized - only Ethiopian Customs can clear for exit (caller MSP: %s)", mspID)
	}

	// Update clearance details
	crossing.EthiopianCustomsOfficer = customsOfficer
	crossing.EthiopianClearanceDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	crossing.EthiopianClearanceRef = clearanceRef
	crossing.Status = "CLEARED_EXIT"
	crossing.LastUpdatedBy = clientID
	crossing.LastUpdatedByMSP = mspID
	crossing.UpdatedAt = time.Now()

	crossingJSON, err = json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("ClearForExit: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("ClearForExit: failed to update state: %w", err)
	}

	fmt.Printf("✅ Cleared for exit: %s by %s (Ref: %s)\n", crossingID, customsOfficer, clearanceRef)

	return nil
}

// RecordDeparture - Record cargo departure from Ethiopian territory
func (c *CoffeeContract) RecordDeparture(ctx contractapi.TransactionContextInterface,
	crossingID, departureDate string) error {

	// Get existing crossing
	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return fmt.Errorf("RecordDeparture: failed to read crossing: %w", err)
	}
	if crossingJSON == nil {
		return fmt.Errorf("RecordDeparture: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return fmt.Errorf("RecordDeparture: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RecordDeparture: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RecordDeparture: failed to get MSP ID: %w", err)
	}

	// Update departure
	crossing.DepartureDate = departureDate
	crossing.Status = "IN_TRANSIT"
	crossing.LastKnownLocation = crossing.BorderPost
	crossing.LastLocationUpdate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	crossing.LastUpdatedBy = clientID
	crossing.LastUpdatedByMSP = mspID
	crossing.UpdatedAt = time.Now()

	crossingJSON, err = json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("RecordDeparture: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("RecordDeparture: failed to update state: %w", err)
	}

	log.Printf("✅ Departure recorded: %s on %s\n", crossingID, departureDate)

	return nil
}

// RecordBorderCrossing - Record actual crossing at border post
// MILESTONE: Cargo has crossed into destination/transit country
func (c *CoffeeContract) RecordBorderCrossing(ctx contractapi.TransactionContextInterface,
	crossingID, crossingDate, borderCustomsOfficer, borderClearanceRef, borderStampURL string) error {

	fmt.Printf("=== RecordBorderCrossing called: crossingID=%s ===\n", crossingID)

	// Get existing crossing
	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return fmt.Errorf("RecordBorderCrossing: failed to read crossing: %w", err)
	}
	if crossingJSON == nil {
		return fmt.Errorf("RecordBorderCrossing: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return fmt.Errorf("RecordBorderCrossing: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RecordBorderCrossing: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RecordBorderCrossing: failed to get MSP ID: %w", err)
	}

	// Update border crossing details
	crossing.CrossingDate = crossingDate
	crossing.BorderCustomsOfficer = borderCustomsOfficer
	crossing.BorderClearanceDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	crossing.BorderClearanceRef = borderClearanceRef
	crossing.BorderStampURL = borderStampURL
	crossing.Status = "CROSSED"

	// Calculate transit duration if departure date exists
	if crossing.DepartureDate != "" {
		departureTime, err := time.Parse("2006-01-02", crossing.DepartureDate)
		if err == nil {
			crossingTime, err := time.Parse("2006-01-02", crossingDate)
			if err == nil {
				crossing.TransitDuration = int(crossingTime.Sub(departureTime).Hours() / 24)
			}
		}
	}

	crossing.LastKnownLocation = crossing.BorderPost + " - CROSSED"
	crossing.LastLocationUpdate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	crossing.LastUpdatedBy = clientID
	crossing.LastUpdatedByMSP = mspID
	crossing.UpdatedAt = time.Now()

	crossingJSON, err = json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("RecordBorderCrossing: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("RecordBorderCrossing: failed to update state: %w", err)
	}

	fmt.Printf("✅ Border crossed: %s on %s (Transit: %d days)\n", crossingID, crossingDate, crossing.TransitDuration)

	return nil
}

// UpdateLocation - Update current location during transit
func (c *CoffeeContract) UpdateLocation(ctx contractapi.TransactionContextInterface,
	crossingID, location, checkpoint string) error {

	// Get existing crossing
	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return fmt.Errorf("UpdateLocation: failed to read crossing: %w", err)
	}
	if crossingJSON == nil {
		return fmt.Errorf("UpdateLocation: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return fmt.Errorf("UpdateLocation: failed to unmarshal: %w", err)
	}

	// Update location
	crossing.LastKnownLocation = location
	crossing.LastLocationUpdate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	
	if checkpoint != "" {
		crossing.CheckpointsPassed = append(crossing.CheckpointsPassed, checkpoint)
	}
	
	crossing.UpdatedAt = time.Now()

	crossingJSON, err = json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("UpdateLocation: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("UpdateLocation: failed to update state: %w", err)
	}

	log.Printf("📍 Location updated: %s at %s\n", crossingID, location)

	return nil
}

// ReportDelay - Report delay or issue during transit
func (c *CoffeeContract) ReportDelay(ctx contractapi.TransactionContextInterface,
	crossingID, delayReason string, delayDurationStr string) error {

	// Get existing crossing
	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return fmt.Errorf("ReportDelay: failed to read crossing: %w", err)
	}
	if crossingJSON == nil {
		return fmt.Errorf("ReportDelay: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return fmt.Errorf("ReportDelay: failed to unmarshal: %w", err)
	}

	// Parse delay duration
	delayDuration, err := parseInt(delayDurationStr)
	if err != nil {
		delayDuration = 0
	}

	// Record delay
	crossing.DelayReported = true
	crossing.DelayReason = delayReason
	crossing.DelayDuration += delayDuration
	crossing.IssuesEncountered = append(crossing.IssuesEncountered, delayReason)
	crossing.UpdatedAt = time.Now()

	crossingJSON, err = json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("ReportDelay: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("ReportDelay: failed to update state: %w", err)
	}

	log.Printf("⚠ Delay reported: %s - %s (%d hours)\n", crossingID, delayReason, delayDuration)

	return nil
}

// RecordArrival - Record arrival at final destination (port/warehouse)
func (c *CoffeeContract) RecordArrival(ctx contractapi.TransactionContextInterface,
	crossingID, arrivalDate, arrivalLocation string) error {

	// Get existing crossing
	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return fmt.Errorf("RecordArrival: failed to read crossing: %w", err)
	}
	if crossingJSON == nil {
		return fmt.Errorf("RecordArrival: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return fmt.Errorf("RecordArrival: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("RecordArrival: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("RecordArrival: failed to get MSP ID: %w", err)
	}

	// Update arrival
	crossing.ArrivalDate = arrivalDate
	crossing.Status = "ARRIVED"
	crossing.LastKnownLocation = arrivalLocation
	crossing.LastLocationUpdate = time.Now().Format("2006-01-02T15:04:05Z07:00")

	// Calculate total transit duration
	if crossing.DepartureDate != "" {
		departureTime, err := time.Parse("2006-01-02", crossing.DepartureDate)
		if err == nil {
			arrivalTime, err := time.Parse("2006-01-02", arrivalDate)
			if err == nil {
				crossing.TransitDuration = int(arrivalTime.Sub(departureTime).Hours() / 24)
			}
		}
	}

	crossing.LastUpdatedBy = clientID
	crossing.LastUpdatedByMSP = mspID
	crossing.UpdatedAt = time.Now()

	crossingJSON, err = json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("RecordArrival: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("RecordArrival: failed to update state: %w", err)
	}

	fmt.Printf("✅ Arrival recorded: %s at %s (Total transit: %d days)\n", 
		crossingID, arrivalLocation, crossing.TransitDuration)

	return nil
}

// VerifyCompliance - Verify border crossing compliance
func (c *CoffeeContract) VerifyCompliance(ctx contractapi.TransactionContextInterface,
	crossingID, complianceStatus, complianceNotes string) error {

	// Get existing crossing
	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return fmt.Errorf("VerifyCompliance: failed to read crossing: %w", err)
	}
	if crossingJSON == nil {
		return fmt.Errorf("VerifyCompliance: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return fmt.Errorf("VerifyCompliance: failed to unmarshal: %w", err)
	}

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("VerifyCompliance: failed to get client identity: %w", err)
	}
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("VerifyCompliance: failed to get MSP ID: %w", err)
	}

	// Set verification
	crossing.VerifiedBy = clientID
	crossing.VerifiedByMSP = mspID
	crossing.VerificationDate = time.Now().Format("2006-01-02T15:04:05Z07:00")
	crossing.ComplianceStatus = complianceStatus
	crossing.ComplianceNotes = complianceNotes
	crossing.UpdatedAt = time.Now()

	crossingJSON, err = json.Marshal(crossing)
	if err != nil {
		return fmt.Errorf("VerifyCompliance: failed to marshal: %w", err)
	}

	err = ctx.GetStub().PutState(crossingID, crossingJSON)
	if err != nil {
		return fmt.Errorf("VerifyCompliance: failed to update state: %w", err)
	}

	return nil
}

// ReadBorderCrossing - Get border crossing details
func (c *CoffeeContract) ReadBorderCrossing(ctx contractapi.TransactionContextInterface,
	crossingID string) (*BorderCrossing, error) {

	crossingJSON, err := ctx.GetStub().GetState(crossingID)
	if err != nil {
		return nil, fmt.Errorf("ReadBorderCrossing: failed to read: %w", err)
	}
	if crossingJSON == nil {
		return nil, fmt.Errorf("ReadBorderCrossing: crossing %s does not exist", crossingID)
	}

	var crossing BorderCrossing
	err = json.Unmarshal(crossingJSON, &crossing)
	if err != nil {
		return nil, fmt.Errorf("ReadBorderCrossing: failed to unmarshal: %w", err)
	}

	return &crossing, nil
}

// QueryBorderCrossingsByShipment - Get crossings for a shipment
func (c *CoffeeContract) QueryBorderCrossingsByShipment(ctx contractapi.TransactionContextInterface,
	shipmentID string) ([]*BorderCrossing, error) {

	queryString := fmt.Sprintf(`{"selector":{"shipmentId":"%s"}}`, shipmentID)
	return c.queryBorderCrossings(ctx, queryString)
}

// QueryBorderCrossingsByStatus - Get crossings by status
func (c *CoffeeContract) QueryBorderCrossingsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*BorderCrossing, error) {

	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryBorderCrossings(ctx, queryString)
}

// QueryAllBorderCrossings - Get all border crossings
func (c *CoffeeContract) QueryAllBorderCrossings(ctx contractapi.TransactionContextInterface) ([]*BorderCrossing, error) {

	queryString := `{"selector":{"crossingId":{"$exists":true}}}`
	return c.queryBorderCrossings(ctx, queryString)
}

// Helper function for querying border crossings
func (c *CoffeeContract) queryBorderCrossings(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*BorderCrossing, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query border crossings: %w", err)
	}
	defer resultsIterator.Close()

	var crossings []*BorderCrossing

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var crossing BorderCrossing
		err = json.Unmarshal(queryResponse.Value, &crossing)
		if err != nil {
			return nil, err
		}

		crossings = append(crossings, &crossing)
	}

	return crossings, nil
}

// Helper functions
func parseFloat(s string) (float64, error) {
	if s == "" {
		return 0, nil
	}
	var result float64
	_, err := fmt.Sscanf(s, "%f", &result)
	return result, err
}

func parseInt(s string) (int, error) {
	if s == "" {
		return 0, nil
	}
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	return result, err
}

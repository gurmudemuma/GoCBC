package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== EXPORT PERMIT STRUCTURE ====================

type ExportPermit struct {
	PermitID          string    `json:"permitId"`
	PermitNumber      string    `json:"permitNumber"` // System-generated sequential number
	ContractID        string    `json:"contractId"`
	ExporterID        string    `json:"exporterId"`
	LCID              string    `json:"lcId"`          // For L/C-based permits
	PaymentMethod     string    `json:"paymentMethod"` // LC, CAD, ADVANCE, CONSIGNMENT
	Amount            float64   `json:"amount"`
	Currency          string    `json:"currency"`
	Description       string    `json:"description"` // Goods description
	Destination       string    `json:"destination"`
	CommercialInvoice string    `json:"commercialInvoice"` // Invoice number
	Status            string    `json:"status"`            // ISSUED, UTILIZED, EXPIRED, CANCELLED, SETTLED
	Outstanding       bool      `json:"outstanding"`       // Awaiting repatriation
	ApprovalLevel     string    `json:"approvalLevel"`     // STANDARD, BRANCH_MANAGER, NBE
	ApprovedBy        string    `json:"approvedBy"`
	IssueDate         time.Time `json:"issueDate"`
	ExpiryDate        string    `json:"expiryDate"` // End of current month
	UtilizationDate   string    `json:"utilizationDate"`
	UtilizedBy        string    `json:"utilizedBy"`        // ✅ X.509 cert of utilizer
	UtilizedByMSP     string    `json:"utilizedByMsp"`     // ✅ MSP of utilizer
	SettlementDate    string    `json:"settlementDate"`    // When proceeds repatriated
	SettledBy         string    `json:"settledBy"`         // ✅ X.509 cert of settler
	SettledByMSP      string    `json:"settledByMsp"`      // ✅ MSP of settler
	RepatriatedAmount float64   `json:"repatriatedAmount"`
	BankBranch        string    `json:"bankBranch"` // Issuing branch
	Remarks           string    `json:"remarks"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// ==================== PERMIT FUNCTIONS ====================

// IssueCBEExportPermit - Bank issues export permit with CBE limits (payment authorization)
func (c *CoffeeContract) IssueCBEExportPermit(ctx contractapi.TransactionContextInterface,
	permitID, permitNumber, contractID, exporterID, lcID, paymentMethod, amountStr,
	currency, description, destination, commercialInvoice, bankBranch, approvedBy string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only Banks can issue export permits
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can issue export permits (caller: %s)", mspID)
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	if amount <= 0 {
		return fmt.Errorf("amount must be greater than zero")
	}

	// Validate payment method
	validMethods := map[string]bool{
		"LC":          true,
		"CAD":         true, // Cash Against Documents (Documentary Collection)
		"ADVANCE":     true,
		"CONSIGNMENT": true,
	}
	if !validMethods[paymentMethod] {
		return fmt.Errorf("invalid payment method: %s. Must be LC, CAD, ADVANCE, or CONSIGNMENT", paymentMethod)
	}

	// Verify exporter exists and is active
	exporter, err := c.ReadExporter(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("exporter not found: %v", err)
	}
	if exporter.LicenseStatus != "ACTIVE" {
		return fmt.Errorf("exporter license is %s, cannot issue permit", exporter.LicenseStatus)
	}

	// Check if exporter is in delinquent list (placeholder - would integrate with NBE system)
	// TODO: Implement NBE delinquency check

	// CBE LIMIT ENFORCEMENT (Section 3.4.1)
	var approvalLevel string
	if paymentMethod == "CAD" {
		// Documentary Collection has specific limits
		outstanding, err := c.GetOutstandingPermitAmount(ctx, exporterID)
		if err != nil {
			return fmt.Errorf("failed to check outstanding permits: %v", err)
		}

		totalExposure := outstanding + amount

		if amount <= 100000 {
			approvalLevel = "STANDARD"
		} else if amount <= 500000 {
			approvalLevel = "BRANCH_MANAGER"
			// Verify approver is branch manager
			approverAttr, _, _ := ctx.GetClientIdentity().GetAttributeValue("role")
			if approverAttr != "BRANCH_MANAGER" && approverAttr != "MANAGER" {
				return fmt.Errorf("amount USD %.2f requires BRANCH_MANAGER approval", amount)
			}
		} else {
			approvalLevel = "NBE"
			// Verify NBE approval exists
			approverAttr, _, _ := ctx.GetClientIdentity().GetAttributeValue("role")
			if approverAttr != "NBE_OFFICER" {
				return fmt.Errorf("amount USD %.2f requires NBE approval", amount)
			}
		}

		// Check if total exposure exceeds limits
		if totalExposure > 500000 && approvalLevel != "NBE" {
			return fmt.Errorf("total outstanding + new permit (USD %.2f) exceeds limit, requires NBE approval", totalExposure)
		}
	} else {
		// For L/C, ADVANCE, CONSIGNMENT - standard approval
		approvalLevel = "STANDARD"
	}

	// Verify contract exists and is approved
	if contractID != "" {
		contract, err := c.ReadSalesContract(ctx, contractID)
		if err != nil {
			return fmt.Errorf("contract not found: %v", err)
		}
		if contract.ContractStatus != "APPROVED" {
			return fmt.Errorf("contract must be approved before permit issuance, current status: %s", contract.ContractStatus)
		}
	}

	// For L/C-based permits, verify L/C exists and is issued
	if paymentMethod == "LC" && lcID != "" {
		lc, err := c.ReadLC(ctx, lcID)
		if err != nil {
			return fmt.Errorf("L/C not found: %v", err)
		}
		if lc.Status != "ISSUED" && lc.Status != "APPROVED" {
			return fmt.Errorf("L/C must be issued before permit, current status: %s", lc.Status)
		}
	}

	// Check if permit already exists
	existingPermit, err := ctx.GetStub().GetState("PERMIT_" + permitID)
	if err != nil {
		return fmt.Errorf("failed to read permit: %v", err)
	}
	if existingPermit != nil {
		return fmt.Errorf("permit %s already exists", permitID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Calculate expiry date (end of current month as per CBE directive)
	currentYear, currentMonth, _ := txTime.Date()
	expiryDate := time.Date(currentYear, currentMonth+1, 0, 23, 59, 59, 0, txTime.Location())

	permit := ExportPermit{
		PermitID:          permitID,
		PermitNumber:      permitNumber,
		ContractID:        contractID,
		ExporterID:        exporterID,
		LCID:              lcID,
		PaymentMethod:     paymentMethod,
		Amount:            amount,
		Currency:          currency,
		Description:       description,
		Destination:       destination,
		CommercialInvoice: commercialInvoice,
		Status:            "ISSUED",
		Outstanding:       true, // Awaiting repatriation
		ApprovalLevel:     approvalLevel,
		ApprovedBy:        approvedBy,
		IssueDate:         txTime,
		ExpiryDate:        expiryDate.Format(time.RFC3339),
		BankBranch:        bankBranch,
		CreatedAt:         txTime,
		UpdatedAt:         txTime,
	}

	permitJSON, err := json.Marshal(permit)
	if err != nil {
		return fmt.Errorf("failed to marshal permit: %v", err)
	}

	// Emit event for permit issuance
	event := map[string]interface{}{
		"eventType":     "PermitIssued",
		"permitID":      permitID,
		"permitNumber":  permitNumber,
		"exporterID":    exporterID,
		"amount":        amount,
		"currency":      currency,
		"paymentMethod": paymentMethod,
		"approvalLevel": approvalLevel,
		"timestamp":     txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("PermitIssued", eventJSON)

	if err := ctx.GetStub().PutState("PERMIT_"+permitID, permitJSON); err != nil {
		return err
	}

	// CASCADE (status-transition audit §17 #4, M1): the export permit has no
	// ShipmentID field — it links to shipments through ContractID — so
	// set every shipment under this contract that is waiting for a
	// permit to PERMIT_ISSUED. Eligible states: CREATED (permit issued
	// before any inspection, the documented flow) and INSPECTION_COMPLETE
	// (set by ApproveQualityInspection, quality.go — the literal order
	// shipment → inspection → permit). INSPECTION_PENDING is deliberately
	// NOT eligible: a permit must not issue while inspection is still
	// pending. Every other shipment state is excluded — PERMIT_ISSUED
	// (already issued), FREIGHT_BOOKED, CUSTOMS_DECLARED, CUSTOMS_CLEARED,
	// CUSTOMS_REJECTED, LAND_TRANSPORT, PORT_ARRIVED, CONTAINER_STUFFED,
	// VESSEL_LOADED, DEPARTED, IN_TRANSIT, DESTINATION_ARRIVED, DELIVERED,
	// LOADED, CANCELLED, ARRIVED (full set: validShipmentStatuses,
	// main.go) — moving one of those to PERMIT_ISSUED would regress it.
	// Best-effort: the permit is already issued, and in the documented
	// flow the permit is usually issued before any shipment exists, so
	// finding no shipments is the normal case.
	if contractID != "" {
		shipments, qErr := c.QueryShipmentsByContract(ctx, contractID)
		if qErr != nil {
			fmt.Printf("IssueCBEExportPermit: WARNING: could not list shipments for contract %s: %v\n", contractID, qErr)
		} else {
			for _, shipment := range shipments {
				if shipment.Status != "CREATED" && shipment.Status != "INSPECTION_COMPLETE" {
					continue
				}
				if err := c.UpdateShipmentStatus(ctx, shipment.ShipmentID, "PERMIT_ISSUED"); err != nil {
					fmt.Printf("IssueCBEExportPermit: WARNING: failed to update shipment %s to PERMIT_ISSUED: %v\n", shipment.ShipmentID, err)
				} else {
					fmt.Printf("IssueCBEExportPermit: Shipment %s status updated to PERMIT_ISSUED\n", shipment.ShipmentID)
				}
			}
		}
	}

	return nil
}

// UtilizeExportPermit - Mark permit as utilized (shipment made)
func (c *CoffeeContract) UtilizeExportPermit(ctx contractapi.TransactionContextInterface,
	permitID string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// ✅ Capture full MSP identity for non-repudiation
	utilizerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		utilizerID = mspID // Fallback to MSP name
	}

	// Banks and Customs can mark permit as utilized
	if mspID != "BanksMSP" && mspID != "CustomsMSP" {
		return fmt.Errorf("unauthorized: only Banks or Customs can utilize permits")
	}

	permitJSON, err := ctx.GetStub().GetState("PERMIT_" + permitID)
	if err != nil {
		return fmt.Errorf("failed to read permit: %v", err)
	}
	if permitJSON == nil {
		return fmt.Errorf("permit %s does not exist", permitID)
	}

	var permit ExportPermit
	err = json.Unmarshal(permitJSON, &permit)
	if err != nil {
		return fmt.Errorf("failed to unmarshal permit: %v", err)
	}

	if permit.Status != "ISSUED" {
		return fmt.Errorf("permit cannot be utilized, current status: %s", permit.Status)
	}

	// Check if permit is expired
	expiryDate, err := time.Parse(time.RFC3339, permit.ExpiryDate)
	if err == nil {
		txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
		currentTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()
		if currentTime.After(expiryDate) {
			return fmt.Errorf("permit has expired on %s", permit.ExpiryDate)
		}
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	permit.Status = "UTILIZED"
	permit.UtilizationDate = txTime.Format(time.RFC3339)
	permit.UtilizedBy = utilizerID      // ✅ Record WHO utilized
	permit.UtilizedByMSP = mspID        // ✅ Record organization
	permit.UpdatedAt = txTime

	permitJSON, err = json.Marshal(permit)
	if err != nil {
		return fmt.Errorf("failed to marshal permit: %v", err)
	}

	return ctx.GetStub().PutState("PERMIT_"+permitID, permitJSON)
}

// SettleExportPermit - Mark permit as settled (proceeds repatriated)
func (c *CoffeeContract) SettleExportPermit(ctx contractapi.TransactionContextInterface,
	permitID, repatriatedAmountStr string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// ✅ Capture full MSP identity for non-repudiation
	settlerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		settlerID = mspID // Fallback to MSP name
	}

	// Only Banks can settle permits
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can settle permits")
	}

	repatriatedAmount, err := strconv.ParseFloat(repatriatedAmountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid repatriated amount: %v", err)
	}

	permitJSON, err := ctx.GetStub().GetState("PERMIT_" + permitID)
	if err != nil {
		return fmt.Errorf("failed to read permit: %v", err)
	}
	if permitJSON == nil {
		return fmt.Errorf("permit %s does not exist", permitID)
	}

	var permit ExportPermit
	err = json.Unmarshal(permitJSON, &permit)
	if err != nil {
		return fmt.Errorf("failed to unmarshal permit: %v", err)
	}

	if permit.Status != "UTILIZED" {
		return fmt.Errorf("permit must be utilized before settlement, current status: %s", permit.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	permit.Status = "SETTLED"
	permit.Outstanding = false
	permit.RepatriatedAmount = repatriatedAmount
	permit.SettlementDate = txTime.Format(time.RFC3339)
	permit.SettledBy = settlerID        // ✅ Record WHO settled
	permit.SettledByMSP = mspID         // ✅ Record organization
	permit.UpdatedAt = txTime

	// Add remarks if amount mismatch
	if repatriatedAmount != permit.Amount {
		permit.Remarks = fmt.Sprintf("Amount mismatch: Permit USD %.2f, Repatriated USD %.2f",
			permit.Amount, repatriatedAmount)
	}

	permitJSON, err = json.Marshal(permit)
	if err != nil {
		return fmt.Errorf("failed to marshal permit: %v", err)
	}

	// Emit settlement event
	event := map[string]interface{}{
		"eventType":         "PermitSettled",
		"permitID":          permitID,
		"exporterID":        permit.ExporterID,
		"repatriatedAmount": repatriatedAmount,
		"timestamp":         txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("PermitSettled", eventJSON)

	return ctx.GetStub().PutState("PERMIT_"+permitID, permitJSON)
}

// GetOutstandingPermitAmount - Calculate total outstanding permit amount for exporter
func (c *CoffeeContract) GetOutstandingPermitAmount(ctx contractapi.TransactionContextInterface,
	exporterID string) (float64, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s","outstanding":true}}`, exporterID)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return 0, fmt.Errorf("failed to query permits: %v", err)
	}
	defer resultsIterator.Close()

	var totalOutstanding float64
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return 0, fmt.Errorf("failed to iterate: %v", err)
		}

		var permit ExportPermit
		err = json.Unmarshal(queryResponse.Value, &permit)
		if err != nil {
			continue
		}

		// Only count CAD permits for limit calculation
		if permit.PaymentMethod == "CAD" {
			totalOutstanding += permit.Amount
		}
	}

	return totalOutstanding, nil
}

// ReadExportPermit - Get permit details
func (c *CoffeeContract) ReadExportPermit(ctx contractapi.TransactionContextInterface,
	permitID string) (*ExportPermit, error) {

	permitJSON, err := ctx.GetStub().GetState("PERMIT_" + permitID)
	if err != nil {
		return nil, fmt.Errorf("failed to read permit: %v", err)
	}
	if permitJSON == nil {
		return nil, fmt.Errorf("permit %s does not exist", permitID)
	}

	var permit ExportPermit
	err = json.Unmarshal(permitJSON, &permit)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal permit: %v", err)
	}

	return &permit, nil
}

// QueryPermitsByExporter - Get all permits for an exporter
func (c *CoffeeContract) QueryPermitsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*ExportPermit, error) {

	return c.queryPermits(ctx, fmt.Sprintf(`{"exporterId":"%s"}`, exporterID))
}

// QueryOutstandingPermits - Get all outstanding permits (awaiting repatriation)
func (c *CoffeeContract) QueryOutstandingPermits(ctx contractapi.TransactionContextInterface) ([]*ExportPermit, error) {

	return c.queryPermits(ctx, `{"outstanding":true}`)
}

// QueryPermitsByStatus - Get permits by status
func (c *CoffeeContract) QueryPermitsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*ExportPermit, error) {

	return c.queryPermits(ctx, fmt.Sprintf(`{"status":"%s"}`, status))
}

// QueryAllPermits - Get all export permits
func (c *CoffeeContract) QueryAllPermits(ctx contractapi.TransactionContextInterface) ([]*ExportPermit, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("PERMIT_", "PERMIT_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var permits []*ExportPermit
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var permit ExportPermit
		err = json.Unmarshal(queryResponse.Value, &permit)
		if err != nil {
			continue // Skip invalid documents: one bad row must not fail the list
		}
		permits = append(permits, &permit)
	}

	return permits, nil
}

// QueryPermitsByContract - Get all export permits for a specific contract
func (c *CoffeeContract) QueryPermitsByContract(ctx contractapi.TransactionContextInterface,
	contractID string) ([]*ExportPermit, error) {

	return c.queryPermits(ctx, fmt.Sprintf(`{"contractId":"%s"}`, contractID))
}

// Helper function for querying permits.
//
// Every rich query is scoped to PERMIT_ keys: a bare {"exporterId": ...}
// selector also matches contracts, LCs, forex records and payments of the
// same exporter, and unmarshalling one of those as ExportPermit fails the
// whole query — e.g. a REQUESTED LC legitimately carries issueDate:"",
// which time.Time cannot parse ("failed to unmarshal permit: parsing time
// \"\" ..."). The _id scope follows the pattern already used by QueryAllLCs
// (banking.go) and the forex queries. A row that still fails to unmarshal
// is skipped, as in QueryAllLCs, so one bad row can never fail the list.
func (c *CoffeeContract) queryPermits(ctx contractapi.TransactionContextInterface,
	conditions string) ([]*ExportPermit, error) {

	queryString := fmt.Sprintf(`{"selector":{"$and":[{"_id":{"$regex":"^PERMIT_"}},%s]}}`, conditions)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query permits: %v", err)
	}
	defer resultsIterator.Close()

	var permits []*ExportPermit
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var permit ExportPermit
		err = json.Unmarshal(queryResponse.Value, &permit)
		if err != nil {
			continue // Skip invalid documents
		}
		permits = append(permits, &permit)
	}

	return permits, nil
}

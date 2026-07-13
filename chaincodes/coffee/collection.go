package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== DOCUMENTARY COLLECTION STRUCTURE ====================

type DocumentaryCollection struct {
	CollectionID      string    `json:"collectionId"`
	ContractID        string    `json:"contractId"`
	ExporterID        string    `json:"exporterId"`
	PermitID          string    `json:"permitId"`
	DrawerName        string    `json:"drawerName"`     // Exporter name
	DraweeName        string    `json:"draweeName"`     // Importer name
	DraweeAddress     string    `json:"draweeAddress"`  // Importer address
	PaymentTerm       string    `json:"paymentTerm"`    // SIGHT, ACCEPTANCE
	AcceptanceDays    int       `json:"acceptanceDays"` // Days for acceptance (e.g., 60, 90)
	Amount            float64   `json:"amount"`
	Currency          string    `json:"currency"`
	CollectingBank    string    `json:"collectingBank"`    // Foreign bank
	CollectingBankBIC string    `json:"collectingBankBic"` // SWIFT BIC
	RemittingBank     string    `json:"remittingBank"`     // Ethiopian bank (CBE branch)
	RemittingBankBIC  string    `json:"remittingBankBic"`  // CBE BIC
	Documents         []string  `json:"documents"`         // B/L, Invoice, Packing List, etc.
	Instructions      string    `json:"instructions"`      // Collection instructions
	Status            string    `json:"status"`            // SENT, PRESENTED, ACCEPTED, PAID, UNPAID, RETURNED
	SentDate          time.Time `json:"sentDate"`
	SentBy            string    `json:"sentBy"`            // ✅ X.509 cert of sender
	SentByMSP         string    `json:"sentByMsp"`         // ✅ MSP of sender
	PresentationDate  string    `json:"presentationDate"`  // When docs presented to drawee
	PresentedBy       string    `json:"presentedBy"`       // ✅ X.509 cert of presenter
	PresentedByMSP    string    `json:"presentedByMsp"`    // ✅ MSP of presenter
	AcceptanceDate    string    `json:"acceptanceDate"`    // When drawee accepts
	AcceptedBy        string    `json:"acceptedBy"`        // ✅ X.509 cert of acceptor
	AcceptedByMSP     string    `json:"acceptedByMsp"`     // ✅ MSP of acceptor
	DueDate           string    `json:"dueDate"`           // Payment due date
	PaymentDate       string    `json:"paymentDate"`       // Actual payment date
	SettledBy         string    `json:"settledBy"`         // ✅ X.509 cert of settler
	SettledByMSP      string    `json:"settledByMsp"`      // ✅ MSP of settler
	ReturnedDate      string    `json:"returnedDate"`      // If documents returned
	ReturnedBy        string    `json:"returnedBy"`        // ✅ X.509 cert of returner
	ReturnedByMSP     string    `json:"returnedByMsp"`     // ✅ MSP of returner
	ReturnReason      string    `json:"returnReason"`
	ChargesAccount    string    `json:"chargesAccount"` // OUR, DRAWER, DRAWEE
	Charges           float64   `json:"charges"`
	ProtestRequired   bool      `json:"protestRequired"` // If non-payment requires protest
	Remarks           string    `json:"remarks"`
	FollowUpDays      int       `json:"followUpDays"`   // Days since sent without payment
	RemindersCount    int       `json:"remindersCount"` // Number of reminders sent
	LastReminderDate  string    `json:"lastReminderDate"`
	LastReminderBy    string    `json:"lastReminderBy"`    // ✅ X.509 cert of reminder sender
	LastReminderByMSP string    `json:"lastReminderByMsp"` // ✅ MSP of reminder sender
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// ==================== DOCUMENTARY COLLECTION FUNCTIONS ====================

// SendDocumentaryCollection - Bank sends collection documents to foreign bank
func (c *CoffeeContract) SendDocumentaryCollection(ctx contractapi.TransactionContextInterface,
	collectionID, contractID, exporterID, permitID, drawerName, draweeName, draweeAddress,
	paymentTerm, acceptanceDaysStr, amountStr, currency, collectingBank, collectingBankBIC,
	remittingBank, remittingBankBIC, instructions, chargesAccount string, documents []string) error {

	// Get MSP ID for access control
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// ✅ Capture full MSP identity for non-repudiation
	senderID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		senderID = mspID // Fallback to MSP name
	}

	// Only Banks can send documentary collections
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can send documentary collections (caller: %s)", mspID)
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return fmt.Errorf("invalid amount: %v", err)
	}

	acceptanceDays, err := strconv.Atoi(acceptanceDaysStr)
	if err != nil {
		acceptanceDays = 0 // For SIGHT payment
	}

	// Validate payment term
	if paymentTerm != "SIGHT" && paymentTerm != "ACCEPTANCE" {
		return fmt.Errorf("payment term must be SIGHT or ACCEPTANCE")
	}

	// For ACCEPTANCE, validate days
	if paymentTerm == "ACCEPTANCE" && acceptanceDays <= 0 {
		return fmt.Errorf("acceptance days must be specified for ACCEPTANCE payment term")
	}

	// Verify permit exists and is issued
	permit, err := c.ReadExportPermit(ctx, permitID)
	if err != nil {
		return fmt.Errorf("permit not found: %v", err)
	}
	if permit.Status != "ISSUED" {
		return fmt.Errorf("permit must be in ISSUED status, current: %s", permit.Status)
	}
	if permit.PaymentMethod != "CAD" {
		return fmt.Errorf("permit payment method must be CAD (Cash Against Documents)")
	}

	// Verify exporter exists
	_, err = c.ReadExporter(ctx, exporterID)
	if err != nil {
		return fmt.Errorf("exporter not found: %v", err)
	}

	// Check if collection already exists
	existingCollection, err := ctx.GetStub().GetState("COLLECTION_" + collectionID)
	if err != nil {
		return fmt.Errorf("failed to read collection: %v", err)
	}
	if existingCollection != nil {
		return fmt.Errorf("collection %s already exists", collectionID)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Calculate due date for acceptance
	var dueDate string
	if paymentTerm == "ACCEPTANCE" {
		dueDateCalc := txTime.AddDate(0, 0, acceptanceDays)
		dueDate = dueDateCalc.Format(time.RFC3339)
	}

	collection := DocumentaryCollection{
		CollectionID:      collectionID,
		ContractID:        contractID,
		ExporterID:        exporterID,
		PermitID:          permitID,
		DrawerName:        drawerName,
		DraweeName:        draweeName,
		DraweeAddress:     draweeAddress,
		PaymentTerm:       paymentTerm,
		AcceptanceDays:    acceptanceDays,
		Amount:            amount,
		Currency:          currency,
		CollectingBank:    collectingBank,
		CollectingBankBIC: collectingBankBIC,
		RemittingBank:     remittingBank,
		RemittingBankBIC:  remittingBankBIC,
		Documents:         documents,
		Instructions:      instructions,
		Status:            "SENT",
		SentDate:          txTime,
		SentBy:            senderID,         // ✅ Record WHO sent collection
		SentByMSP:         mspID,            // ✅ Record organization
		DueDate:           dueDate,
		ChargesAccount:    chargesAccount,
		FollowUpDays:      0,
		RemindersCount:    0,
		CreatedAt:         txTime,
		UpdatedAt:         txTime,
	}

	collectionJSON, err := json.Marshal(collection)
	if err != nil {
		return fmt.Errorf("failed to marshal collection: %v", err)
	}

	// Emit event
	event := map[string]interface{}{
		"eventType":      "CollectionSent",
		"collectionID":   collectionID,
		"exporterID":     exporterID,
		"amount":         amount,
		"currency":       currency,
		"paymentTerm":    paymentTerm,
		"collectingBank": collectingBank,
		"timestamp":      txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("CollectionSent", eventJSON)

	return ctx.GetStub().PutState("COLLECTION_"+collectionID, collectionJSON)
}

// PresentDocumentaryCollection - Collecting bank presents documents to drawee
func (c *CoffeeContract) PresentDocumentaryCollection(ctx contractapi.TransactionContextInterface,
	collectionID string) error {

	// ✅ CAPTURE MSP IDENTITY
	presenterMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	presenterID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		presenterID = presenterMSP // Fallback
	}

	collectionJSON, err := ctx.GetStub().GetState("COLLECTION_" + collectionID)
	if err != nil {
		return fmt.Errorf("failed to read collection: %v", err)
	}
	if collectionJSON == nil {
		return fmt.Errorf("collection %s does not exist", collectionID)
	}

	var collection DocumentaryCollection
	err = json.Unmarshal(collectionJSON, &collection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal collection: %v", err)
	}

	if collection.Status != "SENT" {
		return fmt.Errorf("collection must be in SENT status, current: %s", collection.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	collection.Status = "PRESENTED"
	collection.PresentationDate = txTime.Format(time.RFC3339)
	collection.PresentedBy = presenterID        // ✅ RECORD WHO PRESENTED
	collection.PresentedByMSP = presenterMSP    // ✅ RECORD ORGANIZATION
	collection.UpdatedAt = txTime

	collectionJSON, err = json.Marshal(collection)
	if err != nil {
		return fmt.Errorf("failed to marshal collection: %v", err)
	}

	return ctx.GetStub().PutState("COLLECTION_"+collectionID, collectionJSON)
}

// AcceptDocumentaryCollection - Drawee accepts documents (for ACCEPTANCE term)
func (c *CoffeeContract) AcceptDocumentaryCollection(ctx contractapi.TransactionContextInterface,
	collectionID string) error {

	// ✅ CAPTURE MSP IDENTITY
	acceptorMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	acceptorID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		acceptorID = acceptorMSP // Fallback
	}

	collectionJSON, err := ctx.GetStub().GetState("COLLECTION_" + collectionID)
	if err != nil {
		return fmt.Errorf("failed to read collection: %v", err)
	}
	if collectionJSON == nil {
		return fmt.Errorf("collection %s does not exist", collectionID)
	}

	var collection DocumentaryCollection
	err = json.Unmarshal(collectionJSON, &collection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal collection: %v", err)
	}

	if collection.PaymentTerm != "ACCEPTANCE" {
		return fmt.Errorf("only ACCEPTANCE collections can be accepted")
	}

	if collection.Status != "PRESENTED" {
		return fmt.Errorf("collection must be presented before acceptance, current: %s", collection.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	collection.Status = "ACCEPTED"
	collection.AcceptanceDate = txTime.Format(time.RFC3339)
	collection.AcceptedBy = acceptorID        // ✅ RECORD WHO ACCEPTED
	collection.AcceptedByMSP = acceptorMSP    // ✅ RECORD ORGANIZATION
	collection.UpdatedAt = txTime

	collectionJSON, err = json.Marshal(collection)
	if err != nil {
		return fmt.Errorf("failed to marshal collection: %v", err)
	}

	return ctx.GetStub().PutState("COLLECTION_"+collectionID, collectionJSON)
}

// SettleDocumentaryCollection - Record payment received
func (c *CoffeeContract) SettleDocumentaryCollection(ctx contractapi.TransactionContextInterface,
	collectionID, chargesStr string) error {

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

	// Only Banks can settle collections
	if mspID != "BanksMSP" {
		return fmt.Errorf("unauthorized: only Banks can settle collections (caller: %s)", mspID)
	}

	charges, _ := strconv.ParseFloat(chargesStr, 64)

	collectionJSON, err := ctx.GetStub().GetState("COLLECTION_" + collectionID)
	if err != nil {
		return fmt.Errorf("failed to read collection: %v", err)
	}
	if collectionJSON == nil {
		return fmt.Errorf("collection %s does not exist", collectionID)
	}

	var collection DocumentaryCollection
	err = json.Unmarshal(collectionJSON, &collection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal collection: %v", err)
	}

	validStatuses := map[string]bool{
		"PRESENTED": true,
		"ACCEPTED":  true,
	}
	if !validStatuses[collection.Status] {
		return fmt.Errorf("collection cannot be settled from status: %s", collection.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	collection.Status = "PAID"
	collection.PaymentDate = txTime.Format(time.RFC3339)
	collection.SettledBy = settlerID    // ✅ Record WHO settled
	collection.SettledByMSP = mspID     // ✅ Record organization
	collection.Charges = charges
	collection.UpdatedAt = txTime

	collectionJSON, err = json.Marshal(collection)
	if err != nil {
		return fmt.Errorf("failed to marshal collection: %v", err)
	}

	// Also settle the related export permit
	err = c.SettleExportPermit(ctx, collection.PermitID, fmt.Sprintf("%.2f", collection.Amount))
	if err != nil {
		// Log error but don't fail settlement
		fmt.Printf("Warning: failed to settle permit %s: %v\n", collection.PermitID, err)
	}

	// Emit settlement event
	event := map[string]interface{}{
		"eventType":    "CollectionPaid",
		"collectionID": collectionID,
		"exporterID":   collection.ExporterID,
		"amount":       collection.Amount,
		"currency":     collection.Currency,
		"timestamp":    txTime.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("CollectionPaid", eventJSON)

	return ctx.GetStub().PutState("COLLECTION_"+collectionID, collectionJSON)
}

// ReturnDocumentaryCollection - Mark collection as returned (unpaid)
func (c *CoffeeContract) ReturnDocumentaryCollection(ctx contractapi.TransactionContextInterface,
	collectionID, returnReason string) error {

	// ✅ CAPTURE MSP IDENTITY
	returnerMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	returnerID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		returnerID = returnerMSP // Fallback
	}

	collectionJSON, err := ctx.GetStub().GetState("COLLECTION_" + collectionID)
	if err != nil {
		return fmt.Errorf("failed to read collection: %v", err)
	}
	if collectionJSON == nil {
		return fmt.Errorf("collection %s does not exist", collectionID)
	}

	var collection DocumentaryCollection
	err = json.Unmarshal(collectionJSON, &collection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal collection: %v", err)
	}

	if collection.Status == "PAID" {
		return fmt.Errorf("cannot return paid collection")
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	collection.Status = "RETURNED"
	collection.ReturnedDate = txTime.Format(time.RFC3339)
	collection.ReturnedBy = returnerID        // ✅ RECORD WHO RETURNED
	collection.ReturnedByMSP = returnerMSP    // ✅ RECORD ORGANIZATION
	collection.ReturnReason = returnReason
	collection.UpdatedAt = txTime

	collectionJSON, err = json.Marshal(collection)
	if err != nil {
		return fmt.Errorf("failed to marshal collection: %v", err)
	}

	return ctx.GetStub().PutState("COLLECTION_"+collectionID, collectionJSON)
}

// SendCollectionReminder - Record reminder sent to collecting bank
func (c *CoffeeContract) SendCollectionReminder(ctx contractapi.TransactionContextInterface,
	collectionID string) error {

	// ✅ CAPTURE MSP IDENTITY
	reminderMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	reminderID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		reminderID = reminderMSP // Fallback
	}

	collectionJSON, err := ctx.GetStub().GetState("COLLECTION_" + collectionID)
	if err != nil {
		return fmt.Errorf("failed to read collection: %v", err)
	}
	if collectionJSON == nil {
		return fmt.Errorf("collection %s does not exist", collectionID)
	}

	var collection DocumentaryCollection
	err = json.Unmarshal(collectionJSON, &collection)
	if err != nil {
		return fmt.Errorf("failed to unmarshal collection: %v", err)
	}

	if collection.Status == "PAID" || collection.Status == "RETURNED" {
		return fmt.Errorf("cannot send reminder for collection in status: %s", collection.Status)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Calculate days since sent
	followUpDays := int(txTime.Sub(collection.SentDate).Hours() / 24)

	collection.RemindersCount++
	collection.FollowUpDays = followUpDays
	collection.LastReminderDate = txTime.Format(time.RFC3339)
	collection.LastReminderBy = reminderID        // ✅ RECORD WHO SENT REMINDER
	collection.LastReminderByMSP = reminderMSP    // ✅ RECORD ORGANIZATION
	collection.UpdatedAt = txTime

	collectionJSON, err = json.Marshal(collection)
	if err != nil {
		return fmt.Errorf("failed to marshal collection: %v", err)
	}

	return ctx.GetStub().PutState("COLLECTION_"+collectionID, collectionJSON)
}

// ReadDocumentaryCollection - Get collection details
func (c *CoffeeContract) ReadDocumentaryCollection(ctx contractapi.TransactionContextInterface,
	collectionID string) (*DocumentaryCollection, error) {

	collectionJSON, err := ctx.GetStub().GetState("COLLECTION_" + collectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to read collection: %v", err)
	}
	if collectionJSON == nil {
		return nil, fmt.Errorf("collection %s does not exist", collectionID)
	}

	var collection DocumentaryCollection
	err = json.Unmarshal(collectionJSON, &collection)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal collection: %v", err)
	}

	return &collection, nil
}

// QueryCollectionsByExporter - Get all collections for exporter
func (c *CoffeeContract) QueryCollectionsByExporter(ctx contractapi.TransactionContextInterface,
	exporterID string) ([]*DocumentaryCollection, error) {

	queryString := fmt.Sprintf(`{"selector":{"exporterId":"%s"}}`, exporterID)
	return c.queryCollections(ctx, queryString)
}

// QueryOutstandingCollections - Get unpaid collections (for follow-up)
func (c *CoffeeContract) QueryOutstandingCollections(ctx contractapi.TransactionContextInterface) ([]*DocumentaryCollection, error) {

	queryString := `{"selector":{"status":{"$in":["SENT","PRESENTED","ACCEPTED"]}}}`
	return c.queryCollections(ctx, queryString)
}

// QueryAllCollections - Get all documentary collections
func (c *CoffeeContract) QueryAllCollections(ctx contractapi.TransactionContextInterface) ([]*DocumentaryCollection, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("COLLECTION_", "COLLECTION_~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var collections []*DocumentaryCollection
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var collection DocumentaryCollection
		err = json.Unmarshal(queryResponse.Value, &collection)
		if err != nil {
			return nil, err
		}
		collections = append(collections, &collection)
	}

	return collections, nil
}

// Helper function
func (c *CoffeeContract) queryCollections(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*DocumentaryCollection, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query collections: %v", err)
	}
	defer resultsIterator.Close()

	var collections []*DocumentaryCollection
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var collection DocumentaryCollection
		err = json.Unmarshal(queryResponse.Value, &collection)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal collection: %v", err)
		}
		collections = append(collections, &collection)
	}

	return collections, nil
}

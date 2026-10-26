package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== DOCUMENT HASH STRUCTURE ====================

// DocumentHash - Off-chain document reference stored on blockchain
// Best practice: Store only hash on-chain, actual document off-chain (IPFS/storage)
type DocumentHash struct {
	DocumentID           string    `json:"documentId"`
	EntityID             string    `json:"entityId"`   // LC ID, Payment ID, Shipment ID, etc.
	EntityType           string    `json:"entityType"` // 'LC', 'PAYMENT', 'SHIPMENT', etc.
	Hash                 string    `json:"hash"`       // SHA-256 hash of document
	IPFSCID              string    `json:"ipfsCid"`    // IPFS Content ID (if using IPFS)
	Filename             string    `json:"filename"`
	Category             string    `json:"category"` // 'BILL_OF_LADING', 'INVOICE', 'CERTIFICATE', etc.
	UploadedBy           string    `json:"uploadedBy"`
	UploadedAt           time.Time `json:"uploadedAt"`
	Verified             bool      `json:"verified"`
	VerifiedBy           string    `json:"verifiedBy"`
	VerifiedAt           string    `json:"verifiedAt"`
	VerifiedByMSP        string    `json:"verifiedByMsp"`
	VerificationDecision string    `json:"verificationDecision"`
	VerificationComments string    `json:"verificationComments"`
}

// ==================== DOCUMENT FUNCTIONS ====================

// RegisterDocumentHash - Register document hash on blockchain
// Actual document stored off-chain (IPFS or local storage)
func (c *CoffeeContract) RegisterDocumentHash(ctx contractapi.TransactionContextInterface,
	documentID, entityID, entityType, hash, ipfsCID, filename, category string) error {
	if len(hash) != 64 {
		return fmt.Errorf("document hash must be a 32-byte SHA-256 hex digest")
	}
	if _, err := hex.DecodeString(hash); err != nil {
		return fmt.Errorf("document hash must be hexadecimal: %w", err)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	documentHash := DocumentHash{
		DocumentID: documentID,
		EntityID:   entityID,
		EntityType: entityType,
		Hash:       hash,
		IPFSCID:    ipfsCID,
		Filename:   filename,
		Category:   category,
		UploadedBy: clientID,
		UploadedAt: txTime,
		Verified:   false,
	}

	documentJSON, err := json.Marshal(documentHash)
	if err != nil {
		return fmt.Errorf("failed to marshal document hash: %v", err)
	}

	err = ctx.GetStub().PutState("DOCHASH_"+documentID, documentJSON)
	if err != nil {
		return fmt.Errorf("failed to save document hash: %v", err)
	}

	fmt.Printf("Document hash registered: %s for entity %s (%s)\n", documentID, entityID, entityType)

	// ✅ CREATE CRYPTOGRAPHIC AUDIT TRAIL
	uploaderMSP, _ := ctx.GetClientIdentity().GetMSPID()

	changes := []FieldChange{
		{FieldName: "hash", OldValue: "", NewValue: hash, DataType: "string"},
		{FieldName: "ipfsCID", OldValue: "", NewValue: ipfsCID, DataType: "string"},
		{FieldName: "filename", OldValue: "", NewValue: filename, DataType: "string"},
		{FieldName: "category", OldValue: "", NewValue: category, DataType: "string"},
	}

	compliance := ComplianceMetadata{
		ECTACompliance: true, // ECTA requires document verification
		NBECompliance:  false,
		UCP600Check:    false,
		EUDRCompliance: true, // EUDR requires due diligence documents
		ICOCompliance:  true, // ICO traceability requirements
		ComplianceNote: fmt.Sprintf("Document registered by %s for %s", uploaderMSP, entityType),
	}

	auditErr := c.CreateAuditLog(ctx, "REGISTER", "DOCUMENT", documentID, "", "REGISTERED", changes,
		fmt.Sprintf("Document %s registered for entity %s by %s", filename, entityID, uploaderMSP), compliance)
	if auditErr != nil {
		return fmt.Errorf("RegisterDocumentHash: failed to create audit log: %w", auditErr)
	}

	return nil
}

// ReadDocumentHash - Read document hash from blockchain
func (c *CoffeeContract) ReadDocumentHash(ctx contractapi.TransactionContextInterface,
	documentID string) (*DocumentHash, error) {

	documentJSON, err := ctx.GetStub().GetState("DOCHASH_" + documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read document hash: %v", err)
	}
	if documentJSON == nil {
		return nil, fmt.Errorf("document hash %s not found", documentID)
	}

	var documentHash DocumentHash
	err = json.Unmarshal(documentJSON, &documentHash)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal document hash: %v", err)
	}

	return &documentHash, nil
}

// VerifyDocumentHash compares the latest ledger-anchored file hash with the
// verifier's current file hash before recording the verifier's decision.
func (c *CoffeeContract) VerifyDocumentHash(ctx contractapi.TransactionContextInterface,
	documentID, observedHash, decision, verifierComments string) error {

	documentHash, err := c.ReadDocumentHash(ctx, documentID)
	if err != nil {
		return err
	}

	if len(observedHash) != 64 {
		return fmt.Errorf("observed document hash must be a 32-byte SHA-256 hex digest")
	}
	if _, err := hex.DecodeString(observedHash); err != nil {
		return fmt.Errorf("observed document hash must be hexadecimal: %w", err)
	}

	// A document may have been signed, producing a newer ledger-bound revision.
	expectedHash := documentHash.Hash
	docSignaturesJSON, err := ctx.GetStub().GetState("DOCSIGS_" + documentID)
	if err != nil {
		return fmt.Errorf("failed to read document signature history: %w", err)
	}
	if len(docSignaturesJSON) > 0 {
		var signedDocument DocumentWithSignatures
		if err := json.Unmarshal(docSignaturesJSON, &signedDocument); err != nil {
			return fmt.Errorf("failed to decode document signature history: %w", err)
		}
		if count := len(signedDocument.Signatures); count > 0 && signedDocument.Signatures[count-1].DocumentHash != "" {
			expectedHash = signedDocument.Signatures[count-1].DocumentHash
		}
	}
	if !strings.EqualFold(expectedHash, observedHash) {
		return fmt.Errorf("document hash mismatch: current file does not match the latest ledger-anchored hash")
	}

	decision = strings.ToUpper(strings.TrimSpace(decision))
	if decision != "VERIFIED" && decision != "REJECTED" {
		return fmt.Errorf("decision must be VERIFIED or REJECTED")
	}

	verifierMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get verifier MSP: %w", err)
	}
	switch verifierMSP {
	case "ECTAMSP", "ECXMSP", "BanksMSP", "NBEMSP", "CustomsMSP", "ShippingMSP":
	default:
		return fmt.Errorf("MSP %s is not authorized to verify consortium documents", verifierMSP)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC()

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	previousStatus := "UNVERIFIED"
	if documentHash.Verified {
		previousStatus = "VERIFIED"
	}
	documentHash.Verified = decision == "VERIFIED"
	documentHash.VerifiedBy = clientID
	documentHash.VerifiedAt = txTime.Format(time.RFC3339)
	documentHash.VerifiedByMSP = verifierMSP
	documentHash.VerificationDecision = decision
	documentHash.VerificationComments = verifierComments

	documentJSON, err := json.Marshal(documentHash)
	if err != nil {
		return fmt.Errorf("failed to marshal document hash: %v", err)
	}

	err = ctx.GetStub().PutState("DOCHASH_"+documentID, documentJSON)
	if err != nil {
		return fmt.Errorf("failed to save verified document hash: %v", err)
	}

	changes := []FieldChange{
		{FieldName: "hash", OldValue: expectedHash, NewValue: observedHash, DataType: "sha256"},
		{FieldName: "verificationDecision", OldValue: previousStatus, NewValue: decision, DataType: "string"},
	}
	compliance := ComplianceMetadata{ECTACompliance: true, EUDRCompliance: true, ComplianceNote: fmt.Sprintf("Document %s decision by %s", decision, verifierMSP)}
	if err := c.CreateAuditLog(ctx, decision, "DOCUMENT", documentID, previousStatus, decision, changes, verifierComments, compliance); err != nil {
		return fmt.Errorf("failed to write document verification audit record: %w", err)
	}
	event, _ := json.Marshal(map[string]interface{}{
		"documentId":   documentID,
		"documentHash": observedHash,
		"decision":     decision,
		"verifierMsp":  verifierMSP,
		"verifiedBy":   clientID,
		"verifiedAt":   documentHash.VerifiedAt,
	})
	if err := ctx.GetStub().SetEvent("DocumentHashVerified", event); err != nil {
		return fmt.Errorf("failed to emit document verification event: %w", err)
	}
	fmt.Printf("Document %s: %s by %s (%s)\n", decision, documentID, clientID, verifierMSP)
	return nil
}

// QueryDocumentsByEntity - Get all documents for an entity (LC, Payment, Shipment)
func (c *CoffeeContract) QueryDocumentsByEntity(ctx contractapi.TransactionContextInterface,
	entityID string) ([]*DocumentHash, error) {

	queryString := fmt.Sprintf(`{"selector":{"entityId":"%s"}}`, entityID)
	return c.queryDocuments(ctx, queryString)
}

// QueryDocumentsByCategory - Get documents by category
func (c *CoffeeContract) QueryDocumentsByCategory(ctx contractapi.TransactionContextInterface,
	category string) ([]*DocumentHash, error) {

	queryString := fmt.Sprintf(`{"selector":{"category":"%s"}}`, category)
	return c.queryDocuments(ctx, queryString)
}

// Helper function to query documents
func (c *CoffeeContract) queryDocuments(ctx contractapi.TransactionContextInterface,
	queryString string) ([]*DocumentHash, error) {

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	var documents []*DocumentHash
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate results: %v", err)
		}

		var doc DocumentHash
		err = json.Unmarshal(queryResponse.Value, &doc)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal document: %v", err)
		}
		documents = append(documents, &doc)
	}

	return documents, nil
}

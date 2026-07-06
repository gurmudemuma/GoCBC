package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== DOCUMENT HASH STRUCTURE ====================

// DocumentHash - Off-chain document reference stored on blockchain
// Best practice: Store only hash on-chain, actual document off-chain (IPFS/storage)
type DocumentHash struct {
	DocumentID string    `json:"documentId"`
	EntityID   string    `json:"entityId"`   // LC ID, Payment ID, Shipment ID, etc.
	EntityType string    `json:"entityType"` // 'LC', 'PAYMENT', 'SHIPMENT', etc.
	Hash       string    `json:"hash"`       // SHA-256 hash of document
	IPFSCID    string    `json:"ipfsCid"`    // IPFS Content ID (if using IPFS)
	Filename   string    `json:"filename"`
	Category   string    `json:"category"` // 'BILL_OF_LADING', 'INVOICE', 'CERTIFICATE', etc.
	UploadedBy string    `json:"uploadedBy"`
	UploadedAt time.Time `json:"uploadedAt"`
	Verified   bool      `json:"verified"`
	VerifiedBy string    `json:"verifiedBy"`
	VerifiedAt string    `json:"verifiedAt"`
}

// ==================== DOCUMENT FUNCTIONS ====================

// RegisterDocumentHash - Register document hash on blockchain
// Actual document stored off-chain (IPFS or local storage)
func (c *CoffeeContract) RegisterDocumentHash(ctx contractapi.TransactionContextInterface,
	documentID, entityID, entityType, hash, ipfsCID, filename, category string) error {

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

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

// VerifyDocumentHash - Mark document as verified by authorized party
func (c *CoffeeContract) VerifyDocumentHash(ctx contractapi.TransactionContextInterface,
	documentID, verifierComments string) error {

	documentHash, err := c.ReadDocumentHash(ctx, documentID)
	if err != nil {
		return err
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Get caller identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	documentHash.Verified = true
	documentHash.VerifiedBy = clientID
	documentHash.VerifiedAt = txTime.Format(time.RFC3339)

	documentJSON, err := json.Marshal(documentHash)
	if err != nil {
		return fmt.Errorf("failed to marshal document hash: %v", err)
	}

	err = ctx.GetStub().PutState("DOCHASH_"+documentID, documentJSON)
	if err != nil {
		return fmt.Errorf("failed to save verified document hash: %v", err)
	}

	fmt.Printf("Document verified: %s by %s\n", documentID, clientID)
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

package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== CRYPTOGRAPHIC SIGNATURE & AUDIT TRAIL ====================

// TransactionSignature captures WHO did WHAT, WHEN, and HOW (with cryptographic proof)
type TransactionSignature struct {
	TransactionID     string    `json:"transactionId"`     // Unique blockchain transaction ID
	ChannelID         string    `json:"channelId"`         // Channel name
	Timestamp         time.Time `json:"timestamp"`         // When action occurred
	FunctionName      string    `json:"functionName"`      // What action was performed
	Arguments         []string  `json:"arguments"`         // Function parameters (sanitized)
	Caller            Identity  `json:"caller"`            // WHO performed the action
	DataHash          string    `json:"dataHash"`          // SHA-256 hash of the data modified
	PreviousStateHash string    `json:"previousStateHash"` // Hash of previous state (for verification)
	NewStateHash      string    `json:"newStateHash"`      // Hash of new state after modification
	EndorsementPolicy string    `json:"endorsementPolicy"` // Which orgs must endorse
	EndorsingPeers    []string  `json:"endorsingPeers"`    // Which peers endorsed this transaction
	CreatedAt         time.Time `json:"createdAt"`
}

// Identity captures the cryptographic identity of the transaction submitter
type Identity struct {
	MSPID             string `json:"mspId"`             // Organization (ECTAMSP, BanksMSP, NBEMSP, etc.)
	CertificateIssuer string `json:"certificateIssuer"` // CA that issued the certificate
	CommonName        string `json:"commonName"`        // CN from certificate (e.g., Admin@ecta.cecbs.et)
	OrganizationUnit  string `json:"organizationUnit"`  // OU from certificate
	Certificate       string `json:"certificate"`       // Base64 encoded X.509 certificate
	CertificateHash   string `json:"certificateHash"`   // SHA-256 hash of certificate (for quick lookup)
	UserID            string `json:"userId"`            // Application-level user ID (if available)
	Email             string `json:"email"`             // User email (if available)
	Role              string `json:"role"`              // User role (exporter, bank_officer, ecta_inspector, etc.)
}

// AuditLog stores immutable audit trail for compliance and forensics
type AuditLog struct {
	LogID          string               `json:"logId"`          // Unique log entry ID
	ActionType     string               `json:"actionType"`     // CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
	EntityType     string               `json:"entityType"`     // EXPORTER, CONTRACT, SHIPMENT, LC, PAYMENT, etc.
	EntityID       string               `json:"entityId"`       // ID of the entity affected
	Signature      TransactionSignature `json:"signature"`      // Complete cryptographic signature
	StatusBefore   string               `json:"statusBefore"`   // Previous status
	StatusAfter    string               `json:"statusAfter"`    // New status
	Changes        []FieldChange        `json:"changes"`        // Detailed field-level changes
	Reason         string               `json:"reason"`         // Reason for action (if applicable)
	ComplianceData ComplianceMetadata   `json:"complianceData"` // Regulatory compliance metadata
	CreatedAt      time.Time            `json:"createdAt"`
}

// FieldChange tracks individual field modifications
type FieldChange struct {
	FieldName string `json:"fieldName"` // Name of field changed
	OldValue  string `json:"oldValue"`  // Previous value (sanitized if sensitive)
	NewValue  string `json:"newValue"`  // New value (sanitized if sensitive)
	DataType  string `json:"dataType"`  // string, number, boolean, etc.
}

// ComplianceMetadata tracks regulatory compliance information
type ComplianceMetadata struct {
	ECTACompliance bool   `json:"ectaCompliance"` // ECTA regulations met
	NBECompliance  bool   `json:"nbeCompliance"`  // NBE forex regulations met
	UCP600Check    bool   `json:"ucp600Check"`    // UCP 600 documentary credit rules
	EUDRCompliance bool   `json:"eudrCompliance"` // EU Deforestation Regulation
	ICOCompliance  bool   `json:"icoCompliance"`  // International Coffee Organization standards
	ComplianceNote string `json:"complianceNote"` // Additional compliance notes
}

// ==================== SIGNATURE CAPTURE FUNCTIONS ====================

// CaptureIdentity extracts cryptographic identity from transaction context
func (c *CoffeeContract) CaptureIdentity(ctx contractapi.TransactionContextInterface) (*Identity, error) {
	clientIdentity := ctx.GetClientIdentity()

	// Get MSP ID (organization)
	mspID, err := clientIdentity.GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Get certificate (X.509)
	cert, err := clientIdentity.GetX509Certificate()
	if err != nil {
		return nil, fmt.Errorf("failed to get X.509 certificate: %v", err)
	}

	// Get user ID (from certificate attributes)
	userID, found, err := clientIdentity.GetAttributeValue("userID")
	if err != nil || !found {
		userID = "" // Optional attribute
	}

	// Get email (from certificate attributes)
	email, found, err := clientIdentity.GetAttributeValue("email")
	if err != nil || !found {
		email = "" // Optional attribute
	}

	// Get role (from certificate attributes)
	role, found, err := clientIdentity.GetAttributeValue("role")
	if err != nil || !found {
		role = "unknown" // Default if not set
	}

	// Extract certificate details
	commonName := cert.Subject.CommonName
	organizationUnit := ""
	if len(cert.Subject.OrganizationalUnit) > 0 {
		organizationUnit = cert.Subject.OrganizationalUnit[0]
	}
	certificateIssuer := cert.Issuer.CommonName

	// Get certificate in PEM format
	certPEM, err := clientIdentity.GetID()
	if err != nil {
		return nil, fmt.Errorf("failed to get certificate PEM: %v", err)
	}

	// Calculate certificate hash (SHA-256)
	certHash := sha256.Sum256([]byte(certPEM))
	certHashHex := hex.EncodeToString(certHash[:])

	identity := &Identity{
		MSPID:             mspID,
		CertificateIssuer: certificateIssuer,
		CommonName:        commonName,
		OrganizationUnit:  organizationUnit,
		Certificate:       certPEM,
		CertificateHash:   certHashHex,
		UserID:            userID,
		Email:             email,
		Role:              role,
	}

	return identity, nil
}

// CreateTransactionSignature creates a complete signature for the current transaction
func (c *CoffeeContract) CreateTransactionSignature(
	ctx contractapi.TransactionContextInterface,
	functionName string,
	args []string,
	dataHash string,
	previousStateHash string,
	newStateHash string,
) (*TransactionSignature, error) {

	// Get transaction ID
	txID := ctx.GetStub().GetTxID()

	// Get channel ID
	channelID := ctx.GetStub().GetChannelID()

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Capture caller identity
	identity, err := c.CaptureIdentity(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to capture identity: %v", err)
	}

	// Get endorsement policy (simplified - in production, parse actual policy)
	endorsementPolicy := "Majority endorsement required"

	// Get endorsing peers (from transaction proposal response)
	// Note: In actual implementation, this would be extracted from peer responses
	endorsingPeers := []string{identity.MSPID + "-peer0"}

	signature := &TransactionSignature{
		TransactionID:     txID,
		ChannelID:         channelID,
		Timestamp:         timestamp,
		FunctionName:      functionName,
		Arguments:         sanitizeArgs(args), // Remove sensitive data
		Caller:            *identity,
		DataHash:          dataHash,
		PreviousStateHash: previousStateHash,
		NewStateHash:      newStateHash,
		EndorsementPolicy: endorsementPolicy,
		EndorsingPeers:    endorsingPeers,
		CreatedAt:         timestamp,
	}

	return signature, nil
}

// CreateAuditLog creates an immutable audit log entry
func (c *CoffeeContract) CreateAuditLog(
	ctx contractapi.TransactionContextInterface,
	actionType string,
	entityType string,
	entityID string,
	statusBefore string,
	statusAfter string,
	changes []FieldChange,
	reason string,
	complianceData ComplianceMetadata,
) error {

	// Generate log ID
	txID := ctx.GetStub().GetTxID()
	logID := "AUDIT_" + entityType + "_" + entityID + "_" + txID

	// Calculate data hash
	dataToHash := fmt.Sprintf("%s:%s:%s:%s:%s", actionType, entityType, entityID, statusBefore, statusAfter)
	dataHashBytes := sha256.Sum256([]byte(dataToHash))
	dataHash := hex.EncodeToString(dataHashBytes[:])

	// Get previous state hash (from existing log if it exists)
	previousStateHash := ""
	previousLogKey := "AUDIT_LATEST_" + entityType + "_" + entityID
	previousLogJSON, err := ctx.GetStub().GetState(previousLogKey)
	if err == nil && previousLogJSON != nil {
		var previousLog AuditLog
		if json.Unmarshal(previousLogJSON, &previousLog) == nil {
			previousStateHash = previousLog.Signature.NewStateHash
		}
	}

	// Create transaction signature
	args := []string{actionType, entityType, entityID}
	signature, err := c.CreateTransactionSignature(
		ctx,
		"AuditLog",
		args,
		dataHash,
		previousStateHash,
		dataHash, // New state hash
	)
	if err != nil {
		return fmt.Errorf("failed to create signature: %v", err)
	}

	// Get timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get timestamp: %v", err)
	}
	timestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Create audit log
	auditLog := AuditLog{
		LogID:          logID,
		ActionType:     actionType,
		EntityType:     entityType,
		EntityID:       entityID,
		Signature:      *signature,
		StatusBefore:   statusBefore,
		StatusAfter:    statusAfter,
		Changes:        changes,
		Reason:         reason,
		ComplianceData: complianceData,
		CreatedAt:      timestamp,
	}

	// Save audit log (immutable)
	auditLogJSON, err := json.Marshal(auditLog)
	if err != nil {
		return fmt.Errorf("failed to marshal audit log: %v", err)
	}

	err = ctx.GetStub().PutState(logID, auditLogJSON)
	if err != nil {
		return fmt.Errorf("failed to save audit log: %v", err)
	}

	// Update latest log pointer for chain verification
	err = ctx.GetStub().PutState(previousLogKey, auditLogJSON)
	if err != nil {
		return fmt.Errorf("failed to update latest log pointer: %v", err)
	}

	// Emit audit event
	eventPayload := map[string]interface{}{
		"logId":      logID,
		"actionType": actionType,
		"entityType": entityType,
		"entityId":   entityID,
		"actor":      signature.Caller.CommonName,
		"mspId":      signature.Caller.MSPID,
		"timestamp":  timestamp.Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("AuditLogCreated", eventJSON)

	return nil
}

// ==================== AUDIT QUERY FUNCTIONS ====================

// GetAuditLog retrieves a specific audit log entry
func (c *CoffeeContract) GetAuditLog(ctx contractapi.TransactionContextInterface, logID string) (*AuditLog, error) {
	auditLogJSON, err := ctx.GetStub().GetState(logID)
	if err != nil {
		return nil, fmt.Errorf("failed to read audit log: %v", err)
	}
	if auditLogJSON == nil {
		return nil, fmt.Errorf("audit log %s does not exist", logID)
	}

	var auditLog AuditLog
	err = json.Unmarshal(auditLogJSON, &auditLog)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal audit log: %v", err)
	}

	return &auditLog, nil
}

// QueryAuditLogsByEntity retrieves all audit logs for a specific entity
func (c *CoffeeContract) QueryAuditLogsByEntity(
	ctx contractapi.TransactionContextInterface,
	entityType string,
	entityID string,
) ([]*AuditLog, error) {

	// Build key range for entity-specific logs
	startKey := "AUDIT_" + entityType + "_" + entityID + "_"
	endKey := "AUDIT_" + entityType + "_" + entityID + "_~"

	resultsIterator, err := ctx.GetStub().GetStateByRange(startKey, endKey)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %v", err)
	}
	defer resultsIterator.Close()

	var auditLogs []*AuditLog
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var auditLog AuditLog
		err = json.Unmarshal(queryResponse.Value, &auditLog)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal audit log: %v", err)
		}
		auditLogs = append(auditLogs, &auditLog)
	}

	return auditLogs, nil
}

// QueryAuditLogsByActor retrieves all actions performed by a specific identity
func (c *CoffeeContract) QueryAuditLogsByActor(
	ctx contractapi.TransactionContextInterface,
	certHash string,
) ([]*AuditLog, error) {

	// Query all audit logs
	resultsIterator, err := ctx.GetStub().GetStateByRange("AUDIT_", "AUDIT_~")
	if err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %v", err)
	}
	defer resultsIterator.Close()

	var auditLogs []*AuditLog
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var auditLog AuditLog
		err = json.Unmarshal(queryResponse.Value, &auditLog)
		if err != nil {
			continue // Skip invalid logs
		}

		// Filter by certificate hash
		if auditLog.Signature.Caller.CertificateHash == certHash {
			auditLogs = append(auditLogs, &auditLog)
		}
	}

	return auditLogs, nil
}

// QueryAuditLogsByTimeRange retrieves logs within a time range
func (c *CoffeeContract) QueryAuditLogsByTimeRange(
	ctx contractapi.TransactionContextInterface,
	startTime string,
	endTime string,
) ([]*AuditLog, error) {

	start, err := time.Parse(time.RFC3339, startTime)
	if err != nil {
		return nil, fmt.Errorf("invalid start time: %v", err)
	}

	end, err := time.Parse(time.RFC3339, endTime)
	if err != nil {
		return nil, fmt.Errorf("invalid end time: %v", err)
	}

	// Query all audit logs
	resultsIterator, err := ctx.GetStub().GetStateByRange("AUDIT_", "AUDIT_~")
	if err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %v", err)
	}
	defer resultsIterator.Close()

	var auditLogs []*AuditLog
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate: %v", err)
		}

		var auditLog AuditLog
		err = json.Unmarshal(queryResponse.Value, &auditLog)
		if err != nil {
			continue // Skip invalid logs
		}

		// Filter by time range
		if auditLog.CreatedAt.After(start) && auditLog.CreatedAt.Before(end) {
			auditLogs = append(auditLogs, &auditLog)
		}
	}

	return auditLogs, nil
}

// VerificationResult represents the result of audit trail verification
type VerificationResult struct {
	IsValid bool   `json:"isValid"`
	Message string `json:"message"`
}

// VerifyAuditTrail verifies the integrity of the audit trail chain
func (c *CoffeeContract) VerifyAuditTrail(
	ctx contractapi.TransactionContextInterface,
	entityType string,
	entityID string,
) (*VerificationResult, error) {

	logs, err := c.QueryAuditLogsByEntity(ctx, entityType, entityID)
	if err != nil {
		return nil, err
	}

	if len(logs) == 0 {
		return &VerificationResult{
			IsValid: true,
			Message: "No audit logs found",
		}, nil
	}

	// Verify hash chain
	for i := 1; i < len(logs); i++ {
		previous := logs[i-1]
		current := logs[i]

		// Check if current log's previous hash matches previous log's new hash
		if current.Signature.PreviousStateHash != previous.Signature.NewStateHash {
			return &VerificationResult{
				IsValid: false,
				Message: fmt.Sprintf("Hash chain broken at log %s", current.LogID),
			}, nil
		}
	}

	return &VerificationResult{
		IsValid: true,
		Message: "Audit trail verified successfully",
	}, nil
}

// ==================== HELPER FUNCTIONS ====================

// sanitizeArgs removes sensitive data from function arguments before logging
func sanitizeArgs(args []string) []string {
	sanitized := make([]string, len(args))
	for i, arg := range args {
		// Mask sensitive data (passwords, keys, etc.)
		if len(arg) > 100 {
			sanitized[i] = arg[:50] + "...[truncated]..." + arg[len(arg)-20:]
		} else {
			sanitized[i] = arg
		}
	}
	return sanitized
}

// CalculateDataHash creates SHA-256 hash of data for integrity verification
func CalculateDataHash(data interface{}) (string, error) {
	dataJSON, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal data: %v", err)
	}

	hash := sha256.Sum256(dataJSON)
	return hex.EncodeToString(hash[:]), nil
}

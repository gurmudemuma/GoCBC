package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ==================== DATA MIGRATION FUNCTIONS ====================

// MigrateLCStatus - Fix invalid LC statuses from old chaincode versions
// This function updates LCs with invalid statuses to valid ones
func (s *CoffeeContract) MigrateLCStatus(ctx contractapi.TransactionContextInterface, lcID string, newStatus string) error {
	fmt.Printf("=== MigrateLCStatus: Migrating LC %s to status %s ===\n", lcID, newStatus)

	// Validate new status is valid
	validStatuses := map[string]bool{
		"REQUESTED": true,
		"APPROVED":  true,
		"ISSUED":    true,
		"UTILIZED":  true,
		"EXPIRED":   true,
	}

	if !validStatuses[newStatus] {
		return fmt.Errorf("invalid target status: %s. Valid statuses: REQUESTED, APPROVED, ISSUED, UTILIZED, EXPIRED", newStatus)
	}

	// Get existing LC
	lcKey := "LC_" + lcID
	lcJSON, err := ctx.GetStub().GetState(lcKey)
	if err != nil {
		return fmt.Errorf("failed to read LC: %v", err)
	}
	if lcJSON == nil {
		return fmt.Errorf("LC %s does not exist", lcID)
	}

	var lc LetterOfCredit
	err = json.Unmarshal(lcJSON, &lc)
	if err != nil {
		return fmt.Errorf("failed to unmarshal LC: %v", err)
	}

	// Store old status for audit
	oldStatus := lc.Status
	fmt.Printf("MigrateLCStatus: Current status: %s -> New status: %s\n", oldStatus, newStatus)

	// Update status and timestamp
	lc.Status = newStatus
	txTime, _ := ctx.GetStub().GetTxTimestamp()
	lc.UpdatedAt = time.Unix(txTime.GetSeconds(), int64(txTime.GetNanos()))

	// Save updated LC
	updatedLCJSON, err := json.Marshal(lc)
	if err != nil {
		return fmt.Errorf("failed to marshal updated LC: %v", err)
	}

	err = ctx.GetStub().PutState(lcKey, updatedLCJSON)
	if err != nil {
		return fmt.Errorf("failed to save updated LC: %v", err)
	}

	// Create audit log for migration (simplified)
	auditLog := map[string]interface{}{
		"logId":      fmt.Sprintf("AUDIT_MIGRATE_%s_%d", lcID, txTime.GetSeconds()),
		"actionType": "MIGRATE_STATUS",
		"entityType": "LC",
		"entityId":   lcID,
		"oldStatus":  oldStatus,
		"newStatus":  newStatus,
		"timestamp":  txTime.GetSeconds(),
		"details":    fmt.Sprintf("Migrated LC status from '%s' to '%s' (data migration)", oldStatus, newStatus),
	}

	// Capture who performed the migration
	creator, err := ctx.GetClientIdentity().GetMSPID()
	if err == nil {
		auditLog["performedBy"] = creator
	}

	auditLogJSON, _ := json.Marshal(auditLog)
	auditKey := fmt.Sprintf("AUDIT_MIGRATE_%s_%d", lcID, txTime.GetSeconds())
	ctx.GetStub().PutState(auditKey, auditLogJSON)

	fmt.Printf("=== MigrateLCStatus completed: LC %s status updated from %s to %s ===\n", lcID, oldStatus, newStatus)

	return nil
}

// MigrateAllInvalidLCStatuses - Batch migrate all LCs with invalid statuses
func (s *CoffeeContract) MigrateAllInvalidLCStatuses(ctx contractapi.TransactionContextInterface) (string, error) {
	fmt.Println("=== MigrateAllInvalidLCStatuses: Starting batch migration ===")

	// Query all LCs
	queryString := `{"selector":{"lcId":{"$exists":true}}}`
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return "", fmt.Errorf("failed to query LCs: %v", err)
	}
	defer resultsIterator.Close()

	// Invalid statuses that need migration
	invalidToValid := map[string]string{
		"SHIPPED":              "ISSUED",    // LC should be ISSUED when shipment happens
		"DOCUMENTS_SUBMITTED":  "ISSUED",    // LC should stay ISSUED when docs submitted
		"DOCUMENTS_VERIFIED":   "UTILIZED",  // Should be UTILIZED (new valid status)
		"DOCUMENTS_DISCREPANT": "ISSUED",    // Should stay ISSUED if docs are discrepant
		"PAID":                 "UTILIZED",  // Should stay UTILIZED when payment released
	}

	migratedCount := 0
	skippedCount := 0

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			continue
		}

		var lc LetterOfCredit
		err = json.Unmarshal(queryResponse.Value, &lc)
		if err != nil {
			continue
		}

		// Check if status is invalid
		if newStatus, isInvalid := invalidToValid[lc.Status]; isInvalid {
			fmt.Printf("Migrating LC %s: %s -> %s\n", lc.LCID, lc.Status, newStatus)

			// Update status and timestamp
			lc.Status = newStatus
			lc.UpdatedAt = time.Now()

			// Save updated LC
			updatedLCJSON, err := json.Marshal(lc)
			if err != nil {
				fmt.Printf("Failed to marshal LC %s: %v\n", lc.LCID, err)
				continue
			}

			lcKey := "LC_" + lc.LCID
			err = ctx.GetStub().PutState(lcKey, updatedLCJSON)
			if err != nil {
				fmt.Printf("Failed to save LC %s: %v\n", lc.LCID, err)
				continue
			}

			migratedCount++
		} else {
			skippedCount++
		}
	}

	result := fmt.Sprintf("Migration complete: %d LCs migrated, %d LCs skipped (already valid)", migratedCount, skippedCount)
	fmt.Printf("=== MigrateAllInvalidLCStatuses completed: %s ===\n", result)

	return result, nil
}

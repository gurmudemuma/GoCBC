package main

import (
	"fmt"
	"regexp"
	"time"
)

// Validation constants
const (
	MaxAmount     = 1000000000 // 1 billion USD
	MaxQuantity   = 1000000    // 1 million kg
	MaxStringLen  = 500        // Max chars for text fields
	MaxIDLen      = 100        // Max chars for IDs
	MinPercentage = 0
	MaxPercentage = 100
)

// ValidateAmount checks if amount is within valid range
func ValidateAmount(amount float64, fieldName string) error {
	if amount <= 0 {
		return fmt.Errorf("%s must be positive (got: %.2f)", fieldName, amount)
	}
	if amount > MaxAmount {
		return fmt.Errorf("%s exceeds maximum limit of $%.0f (got: %.2f)", fieldName, MaxAmount, amount)
	}
	return nil
}

// ValidateQuantity checks if quantity is within valid range
func ValidateQuantity(quantity float64, fieldName string) error {
	if quantity <= 0 {
		return fmt.Errorf("%s must be positive (got: %.2f)", fieldName, quantity)
	}
	if quantity > MaxQuantity {
		return fmt.Errorf("%s exceeds maximum limit of %.0f kg (got: %.2f)", fieldName, MaxQuantity, quantity)
	}
	return nil
}

// ValidatePercentage checks if percentage is 0-100
func ValidatePercentage(rate float64, fieldName string) error {
	if rate < MinPercentage || rate > MaxPercentage {
		return fmt.Errorf("%s must be between %.0f and %.0f (got: %.2f)", fieldName, MinPercentage, MaxPercentage, rate)
	}
	return nil
}

// ValidateID checks if ID is non-empty and within length limit
func ValidateID(id, fieldName string) error {
	if id == "" {
		return fmt.Errorf("%s cannot be empty", fieldName)
	}
	if len(id) > MaxIDLen {
		return fmt.Errorf("%s exceeds maximum length of %d characters (got: %d)", fieldName, MaxIDLen, len(id))
	}
	// Alphanumeric + underscore + hyphen only
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_-]+$`, id)
	if !matched {
		return fmt.Errorf("%s must contain only alphanumeric characters, underscores, and hyphens", fieldName)
	}
	return nil
}

// ValidateString checks if string is within length limit
func ValidateString(str, fieldName string, maxLen int) error {
	if len(str) > maxLen {
		return fmt.Errorf("%s exceeds maximum length of %d characters (got: %d)", fieldName, maxLen, len(str))
	}
	return nil
}

// ValidateNonEmptyString checks if string is non-empty and within length limit
func ValidateNonEmptyString(str, fieldName string, maxLen int) error {
	if str == "" {
		return fmt.Errorf("%s cannot be empty", fieldName)
	}
	return ValidateString(str, fieldName, maxLen)
}

// ValidateCurrency checks if currency code is valid (ISO 4217)
func ValidateCurrency(currency string) error {
	validCurrencies := map[string]bool{
		"USD": true, "EUR": true, "GBP": true, "ETB": true,
		"JPY": true, "CNY": true, "SAR": true, "AED": true,
	}
	if !validCurrencies[currency] {
		return fmt.Errorf("invalid currency code: %s (supported: USD, EUR, GBP, ETB, JPY, CNY, SAR, AED)", currency)
	}
	return nil
}

// ValidateDate checks if date string is valid ISO 8601 format and not in the past
func ValidateDate(dateStr, fieldName string, allowPast bool) error {
	if dateStr == "" {
		return fmt.Errorf("%s cannot be empty", fieldName)
	}

	// Try parsing as RFC3339 (ISO 8601)
	parsedDate, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		// Try YYYY-MM-DD format
		parsedDate, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			return fmt.Errorf("%s must be in ISO 8601 format (YYYY-MM-DD or RFC3339): %v", fieldName, err)
		}
	}

	if !allowPast && parsedDate.Before(time.Now()) {
		return fmt.Errorf("%s cannot be in the past (got: %s)", fieldName, dateStr)
	}

	return nil
}

// ValidateExchangeRate checks if exchange rate is reasonable
func ValidateExchangeRate(rate float64, fieldName string) error {
	if rate <= 0 {
		return fmt.Errorf("%s must be positive (got: %.2f)", fieldName, rate)
	}
	if rate > 10000 {
		return fmt.Errorf("%s seems unreasonable (got: %.2f, max: 10000)", fieldName, rate)
	}
	return nil
}

// ValidateBICCode checks if SWIFT BIC code format is valid
func ValidateBICCode(bic, fieldName string) error {
	if bic == "" {
		return nil // Optional field
	}
	// BIC code is 8 or 11 characters: AAAABBCCXXX
	matched, _ := regexp.MatchString(`^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$`, bic)
	if !matched {
		return fmt.Errorf("%s must be valid SWIFT BIC code (8 or 11 characters)", fieldName)
	}
	return nil
}

// ValidateCuppingScore checks if cupping score is within SCA range
func ValidateCuppingScore(score float64, fieldName string) error {
	if score < 0 || score > 10 {
		return fmt.Errorf("%s must be between 0 and 10 (got: %.2f)", fieldName, score)
	}
	return nil
}

// ValidateMoistureContent checks if moisture content is reasonable
func ValidateMoistureContent(moisture float64) error {
	if moisture < 0 || moisture > 20 {
		return fmt.Errorf("moisture content must be between 0%% and 20%% (got: %.2f%%)", moisture)
	}
	return nil
}

// ValidateDefectCount checks if defect count is reasonable
func ValidateDefectCount(count int) error {
	if count < 0 {
		return fmt.Errorf("defect count cannot be negative (got: %d)", count)
	}
	if count > 1000 {
		return fmt.Errorf("defect count seems unreasonable (got: %d, max: 1000)", count)
	}
	return nil
}

// ValidatePaymentMethod checks if payment method is valid
func ValidatePaymentMethod(method string) error {
	validMethods := map[string]bool{
		"LC": true, "CAD": true, "TT_ADVANCE": true,
		"TT_POST": true, "ADVANCE": true,
	}
	if !validMethods[method] {
		return fmt.Errorf("invalid payment method: %s (valid: LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)", method)
	}
	return nil
}

// ValidateStatus checks if status is valid for entity type
func ValidateStatus(status, entityType string) error {
	validStatuses := map[string]map[string]bool{
		"exporter": {
			"ACTIVE": true, "SUSPENDED": true, "EXPIRED": true, "REVOKED": true,
		},
		"contract": {
			"DRAFT": true, "REGISTERED": true, "APPROVED": true,
			"ACTIVE": true, "COMPLETED": true,
		},
		"lc": {
			"REQUESTED": true, "APPROVED": true, "ISSUED": true,
			"UTILIZED": true, "EXPIRED": true,
		},
		"inspection": {
			"PENDING": true, "INSPECTED": true, "APPROVED": true, "REJECTED": true,
		},
		"customs": {
			"SUBMITTED": true, "UNDER_INSPECTION": true, "UNDER_REVIEW": true,
			"CLEARED": true, "HELD": true, "REJECTED": true,
		},
		"payment": {
			"PENDING": true, "DOCUMENTS_SUBMITTED": true, "VERIFIED": true,
			"SWIFT_INITIATED": true, "SWIFT_RECEIVED": true, "SETTLED": true,
		},
	}

	entityStatuses, exists := validStatuses[entityType]
	if !exists {
		return fmt.Errorf("unknown entity type: %s", entityType)
	}

	if !entityStatuses[status] {
		return fmt.Errorf("invalid status '%s' for %s", status, entityType)
	}

	return nil
}

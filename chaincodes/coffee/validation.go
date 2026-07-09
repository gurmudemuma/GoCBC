package main

import (
	"fmt"
	"regexp"
	"strconv"
	"time"
)

// Validation constants
const (
	MaxAmount      = 1000000000  // 1 billion USD
	MaxQuantity    = 1000000     // 1 million kg
	MaxStringLen   = 500         // Max chars for text fields
	MaxIDLen       = 100         // Max chars for IDs
	MinPercentage  = 0
	MaxPercentage  = 100
	MaxBICLen      = 11          // SWIFT BIC code length
	MinBICLen      = 8           // SWIFT BIC code minimum length
)

// ValidateAmount checks if amount is within valid range
func ValidateAmount(amount float64, fieldName string) error {
	if amount <= 0 {
		return fmt.Errorf("%s must be positive, got: %.2f", fieldName, amount)
	}
	if amount > MaxAmount {
		return fmt.Errorf("%s exceeds maximum limit of $%.0f, got: %.2f", fieldName, MaxAmount, amount)
	}
	return nil
}

// ValidateQuantity checks if quantity is within valid range
func ValidateQuantity(quantity float64, fieldName string) error {
	if quantity <= 0 {
		return fmt.Errorf("%s must be positive, got: %.2f", fieldName, quantity)
	}
	if quantity > MaxQuantity {
		return fmt.Errorf("%s exceeds maximum limit of %.0f kg, got: %.2f", fieldName, MaxQuantity, quantity)
	}
	return nil
}

// ValidatePercentage checks if percentage is 0-100
func ValidatePercentage(rate float64, fieldName string) error {
	if rate < MinPercentage || rate > MaxPercentage {
		return fmt.Errorf("%s must be between %.0f and %.0f, got: %.2f", fieldName, MinPercentage, MaxPercentage, rate)
	}
	return nil
}

// ValidateID checks if ID is non-empty and within length limit
func ValidateID(id, fieldName string) error {
	if id == "" {
		return fmt.Errorf("%s cannot be empty", fieldName)
	}
	if len(id) > MaxIDLen {
		return fmt.Errorf("%s exceeds maximum length of %d characters (got %d)", fieldName, MaxIDLen, len(id))
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
		return fmt.Errorf("%s exceeds maximum length of %d characters (got %d)", fieldName, maxLen, len(str))
	}
	return nil
}

// ValidateRequiredString checks if string is non-empty and within length limit
func ValidateRequiredString(str, fieldName string, maxLen int) error {
	if str == "" {
		return fmt.Errorf("%s is required", fieldName)
	}
	return ValidateString(str, fieldName, maxLen)
}

// ValidateBIC validates SWIFT BIC code format (8 or 11 characters: AAAABBCCXXX)
func ValidateBIC(bic, fieldName string) error {
	if bic == "" {
		return nil // Optional field in some contexts
	}
	if len(bic) != MinBICLen && len(bic) != MaxBICLen {
		return fmt.Errorf("%s must be %d or %d characters long, got %d", fieldName, MinBICLen, MaxBICLen, len(bic))
	}
	matched, _ := regexp.MatchString(`^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$`, bic)
	if !matched {
		return fmt.Errorf("%s must be valid SWIFT BIC format (e.g., CBEBIETAAAA)", fieldName)
	}
	return nil
}

// ValidateEmail validates basic email format
func ValidateEmail(email, fieldName string) error {
	if email == "" {
		return nil // Optional field in some contexts
	}
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, email)
	if !matched {
		return fmt.Errorf("%s must be valid email format", fieldName)
	}
	return nil
}

// ValidatePhone validates basic phone format (allows international formats)
func ValidatePhone(phone, fieldName string) error {
	if phone == "" {
		return nil // Optional field in some contexts
	}
	// Allow digits, spaces, dashes, parentheses, and + for international prefix
	matched, _ := regexp.MatchString(`^[\d\s\-()+-]+$`, phone)
	if !matched {
		return fmt.Errorf("%s must contain only digits, spaces, dashes, parentheses, or + prefix", fieldName)
	}
	if len(phone) < 7 || len(phone) > 20 {
		return fmt.Errorf("%s must be between 7 and 20 characters long", fieldName)
	}
	return nil
}

// ValidateCurrency validates ISO 4217 currency code (3 letters)
func ValidateCurrency(currency string) error {
	if currency == "" {
		return fmt.Errorf("currency is required")
	}
	if len(currency) != 3 {
		return fmt.Errorf("currency must be 3-letter ISO code (e.g., USD, EUR), got: %s", currency)
	}
	matched, _ := regexp.MatchString(`^[A-Z]{3}$`, currency)
	if !matched {
		return fmt.Errorf("currency must be uppercase 3-letter code, got: %s", currency)
	}
	return nil
}

// ValidateCountryCode validates ISO 3166-1 alpha-2 country code (2 letters)
func ValidateCountryCode(code string) error {
	if code == "" {
		return fmt.Errorf("country code is required")
	}
	if len(code) != 2 {
		return fmt.Errorf("country code must be 2-letter ISO code (e.g., US, DE), got: %s", code)
	}
	matched, _ := regexp.MatchString(`^[A-Z]{2}$`, code)
	if !matched {
		return fmt.Errorf("country code must be uppercase 2-letter code, got: %s", code)
	}
	return nil
}

// ValidateDate validates date format (RFC3339 or basic ISO date)
func ValidateDate(dateStr string) error {
	if dateStr == "" {
		return fmt.Errorf("date is required")
	}
	
	// Try RFC3339 first
	_, err := time.Parse(time.RFC3339, dateStr)
	if err == nil {
		return nil
	}
	
	// Try basic date formats
	formats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
	}
	
	for _, format := range formats {
		_, err := time.Parse(format, dateStr)
		if err == nil {
			return nil
		}
	}
	
	return fmt.Errorf("date must be valid date format (YYYY-MM-DD or RFC3339), got: %s", dateStr)
}

// ValidateNonEmptyString validates non-empty string with max length
func ValidateNonEmptyString(str, fieldName string, maxLen int) error {
	if str == "" {
		return fmt.Errorf("%s is required", fieldName)
	}
	if len(str) > maxLen {
		return fmt.Errorf("%s exceeds maximum length of %d characters (got %d)", fieldName, maxLen, len(str))
	}
	return nil
}

// ValidateFutureDate validates that a date is in the future
func ValidateFutureDate(dateStr string) error {
	if err := ValidateDate(dateStr); err != nil {
		return err
	}
	
	date, _ := time.Parse(time.RFC3339, dateStr)
	if date.Before(time.Now()) {
		return fmt.Errorf("date must be in the future, got: %s", dateStr)
	}
	return nil
}

// ValidateEnum validates that a value is one of allowed values
func ValidateEnum(value string, allowedValues []string, fieldName string) error {
	if value == "" {
		return fmt.Errorf("%s is required", fieldName)
	}
	for _, allowed := range allowedValues {
		if value == allowed {
			return nil
		}
	}
	return fmt.Errorf("%s must be one of [%v], got: %s", fieldName, allowedValues, value)
}

// ValidateBoolean validates boolean string values
func ValidateBoolean(value, fieldName string) error {
	if value != "true" && value != "false" {
		return fmt.Errorf("%s must be 'true' or 'false', got: %s", fieldName, value)
	}
	return nil
}

// ParseAndValidateFloat parses string to float and validates
func ParseAndValidateFloat(str, fieldName string) (float64, error) {
	if str == "" {
		return 0, fmt.Errorf("%s is required", fieldName)
	}
	value, err := strconv.ParseFloat(str, 64)
	if err != nil {
		return 0, fmt.Errorf("%s must be a valid number: %w", fieldName, err)
	}
	return value, nil
}

// ParseAndValidateInt parses string to int and validates
func ParseAndValidateInt(str, fieldName string) (int, error) {
	if str == "" {
		return 0, fmt.Errorf("%s is required", fieldName)
	}
	value, err := strconv.Atoi(str)
	if err != nil {
		return 0, fmt.Errorf("%s must be a valid integer: %w", fieldName, err)
	}
	return value, nil
}

// ValidateTransportMode validates transport mode (AIR or SEA)
func ValidateTransportMode(mode string) error {
	return ValidateEnum(mode, []string{"AIR", "SEA"}, "transportMode")
}

// ValidateBICCode validates SWIFT BIC code (alias for ValidateBIC)
func ValidateBICCode(bic string) error {
	return ValidateBIC(bic, "BIC")
}

// ValidateExchangeRate validates exchange rate is positive
func ValidateExchangeRate(rate float64) error {
	if rate <= 0 {
		return fmt.Errorf("exchange rate must be positive, got: %.4f", rate)
	}
	if rate > 10000 {
		return fmt.Errorf("exchange rate exceeds maximum limit of 10000, got: %.4f", rate)
	}
	return nil
}

// ValidateMoistureContent validates coffee moisture content (8-13%)
func ValidateMoistureContent(moisture float64) error {
	if moisture < 8.0 || moisture > 13.0 {
		return fmt.Errorf("moisture content must be between 8%% and 13%%, got: %.2f%%", moisture)
	}
	return nil
}

// ValidateDefectCount validates defect count (0-100)
func ValidateDefectCount(defects int) error {
	if defects < 0 || defects > 100 {
		return fmt.Errorf("defect count must be between 0 and 100, got: %d", defects)
	}
	return nil
}

// ValidateCuppingScore validates cupping score (0-100)
func ValidateCuppingScore(score float64) error {
	if score < 0 || score > 100 {
		return fmt.Errorf("cupping score must be between 0 and 100, got: %.2f", score)
	}
	return nil
}

// ValidatePaymentMethod validates payment method
func ValidatePaymentMethod(method string) error {
	allowedMethods := []string{"LC", "CAD", "TT_ADVANCE", "TT_POST", "ADVANCE", "CONSIGNMENT"}
	return ValidateEnum(method, allowedMethods, "paymentMethod")
}

// ValidateStatus validates common status values
func ValidateStatus(status string, allowedStatuses []string, fieldName string) error {
	return ValidateEnum(status, allowedStatuses, fieldName)
}

// ValidationError wraps validation errors with context
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error [%s]: %s", e.Field, e.Message)
}

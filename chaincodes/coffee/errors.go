package main

import "fmt"

// ErrorType represents the category of error
type ErrorType string

const (
	ErrorTypeValidation   ErrorType = "VALIDATION"
	ErrorTypePermission   ErrorType = "PERMISSION"
	ErrorTypeNotFound     ErrorType = "NOT_FOUND"
	ErrorTypeStateError   ErrorType = "STATE_ERROR"
	ErrorTypeConflict     ErrorType = "CONFLICT"
	ErrorTypeInvalidState ErrorType = "INVALID_STATE"
)

// ChainCodeError represents a structured chaincode error with context
type ChainCodeError struct {
	Function  string
	ErrorType ErrorType
	EntityID  string
	Message   string
	Cause     error
}

// Error implements the error interface
func (e *ChainCodeError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %s (entity: %s, cause: %v)",
			e.ErrorType, e.Function, e.Message, e.EntityID, e.Cause)
	}
	return fmt.Sprintf("[%s] %s: %s (entity: %s)",
		e.ErrorType, e.Function, e.Message, e.EntityID)
}

// Unwrap returns the underlying cause error
func (e *ChainCodeError) Unwrap() error {
	return e.Cause
}

// NewValidationError creates a validation error
func NewValidationError(function, entityID, message string, cause error) *ChainCodeError {
	return &ChainCodeError{
		Function:  function,
		ErrorType: ErrorTypeValidation,
		EntityID:  entityID,
		Message:   message,
		Cause:     cause,
	}
}

// NewNotFoundError creates a not found error
func NewNotFoundError(function, entityID, entityType string) *ChainCodeError {
	return &ChainCodeError{
		Function:  function,
		ErrorType: ErrorTypeNotFound,
		EntityID:  entityID,
		Message:   fmt.Sprintf("%s does not exist", entityType),
		Cause:     nil,
	}
}

// NewPermissionError creates a permission error
func NewPermissionError(function, entityID, requiredOrg string) *ChainCodeError {
	return &ChainCodeError{
		Function:  function,
		ErrorType: ErrorTypePermission,
		EntityID:  entityID,
		Message:   fmt.Sprintf("operation requires %s organization", requiredOrg),
		Cause:     nil,
	}
}

// NewStateError creates a state error
func NewStateError(function, entityID, message string, cause error) *ChainCodeError {
	return &ChainCodeError{
		Function:  function,
		ErrorType: ErrorTypeStateError,
		EntityID:  entityID,
		Message:   message,
		Cause:     cause,
	}
}

// NewConflictError creates a conflict error
func NewConflictError(function, entityID, message string) *ChainCodeError {
	return &ChainCodeError{
		Function:  function,
		ErrorType: ErrorTypeConflict,
		EntityID:  entityID,
		Message:   message,
		Cause:     nil,
	}
}

// NewInvalidStateError creates an invalid state transition error
func NewInvalidStateError(function, entityID, currentState, attemptedState string) *ChainCodeError {
	return &ChainCodeError{
		Function:  function,
		ErrorType: ErrorTypeInvalidState,
		EntityID:  entityID,
		Message:   fmt.Sprintf("cannot transition from %s to %s", currentState, attemptedState),
		Cause:     nil,
	}
}

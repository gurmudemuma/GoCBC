// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Response Builder - Standardized API response format

/**
 * Standardized success response
 */
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standardized error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any,
  statusCode: number = 500
) {
  return {
    statusCode,
    body: {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validation error response
 */
export function validationErrorResponse(errors: any[]) {
  return errorResponse(
    'VALIDATION_ERROR',
    'Input validation failed',
    errors,
    400
  );
}

/**
 * Not found error response
 */
export function notFoundResponse(entityType: string, entityId: string) {
  return errorResponse(
    'NOT_FOUND',
    `${entityType} not found`,
    { entityType, entityId },
    404
  );
}

/**
 * Unauthorized error response
 */
export function unauthorizedResponse(message: string = 'Unauthorized access') {
  return errorResponse('UNAUTHORIZED', message, undefined, 403);
}

/**
 * Conflict error response
 */
export function conflictResponse(message: string, details?: any) {
  return errorResponse('CONFLICT', message, details, 409);
}

/**
 * Format timestamp consistently
 */
export function formatTimestamp(date?: Date): string {
  return (date || new Date()).toISOString();
}

/**
 * Send success response with Express
 */
export function sendSuccess(res: any, data: any, message?: string, statusCode: number = 200) {
  res.status(statusCode).json(successResponse(data, message));
}

/**
 * Send error response with Express
 */
export function sendError(res: any, code: string, message: string, details?: any, statusCode: number = 500) {
  const response = errorResponse(code, message, details, statusCode);
  res.status(response.statusCode).json(response.body);
}

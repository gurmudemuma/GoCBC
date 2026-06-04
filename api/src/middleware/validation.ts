// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Request Validation Middleware

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', {
      errors: errors.array(),
      url: req.url,
      method: req.method,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

export default validateRequest;
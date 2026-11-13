// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Error Handler Middleware

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: APIError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Multer upload rejections are client errors, not server errors: a
  // disallowed file type or an oversized file previously surfaced as
  // HTTP 500 INTERNAL_ERROR (the fileFilter Error carries no statusCode),
  // which told the uploader the server broke instead of the file being
  // wrong. Map them to honest 400/413 responses.
  let statusCode = error.statusCode || 500;
  let errorCode = error.code || 'INTERNAL_ERROR';
  if (error.name === 'MulterError' || (error as any).code?.startsWith?.('LIMIT_')) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
    } else {
      statusCode = 400;
      errorCode = 'INVALID_UPLOAD';
    }
  } else if (/Only (PDF|JPG|PNG|DOC|DOCX|XLS|XLSX)/.test(error.message || '')) {
    statusCode = 400;
    errorCode = 'INVALID_FILE_TYPE';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
    },
    timestamp: new Date().toISOString(),
  });
};

export default errorHandler;
// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Audit Middleware - Automatically logs all state-changing operations

import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { logger } from '../utils/logger';

const auditService = AuditService.getInstance();

/**
 * Extract entity information from request
 */
function extractEntityInfo(req: Request): { entityType: string; entityId: string } | null {
  // Extract from URL path
  const path = req.path;
  
  // Contracts
  if (path.includes('/contracts/') && req.params.contractID) {
    return { entityType: 'CONTRACT', entityId: req.params.contractID };
  }
  if (path.includes('/contracts') && req.body?.contractID) {
    return { entityType: 'CONTRACT', entityId: req.body.contractID };
  }
  
  // LCs
  if (path.includes('/banking/lc/') && req.params.lcNumber) {
    return { entityType: 'LC', entityId: req.params.lcNumber };
  }
  if (path.includes('/banking/lc') && req.body?.lcNumber) {
    return { entityType: 'LC', entityId: req.body.lcNumber };
  }
  
  // Forex
  if (path.includes('/forex/') && req.params.forexId) {
    return { entityType: 'FOREX', entityId: req.params.forexId };
  }
  if (path.includes('/forex') && req.body?.forexAllocationId) {
    return { entityType: 'FOREX', entityId: req.body.forexAllocationId };
  }
  
  // Shipments
  if (path.includes('/shipments/') && req.params.shipmentId) {
    return { entityType: 'SHIPMENT', entityId: req.params.shipmentId };
  }
  if (path.includes('/shipments') && req.body?.shipmentId) {
    return { entityType: 'SHIPMENT', entityId: req.body.shipmentId };
  }
  
  // Exporters
  if (path.includes('/exporters/') && req.params.exporterId) {
    return { entityType: 'EXPORTER', entityId: req.params.exporterId };
  }
  if (path.includes('/exporters') && req.body?.exporterId) {
    return { entityType: 'EXPORTER', entityId: req.body.exporterId };
  }
  
  // Quality/Inspections
  if (path.includes('/quality/') && req.params.inspectionId) {
    return { entityType: 'QUALITY', entityId: req.params.inspectionId };
  }
  
  // Permits
  if (path.includes('/permits/') && req.params.permitId) {
    return { entityType: 'PERMIT', entityId: req.params.permitId };
  }
  
  // Payments
  if (path.includes('/payments/') && req.params.paymentId) {
    return { entityType: 'PAYMENT', entityId: req.params.paymentId };
  }
  
  return null;
}

/**
 * Determine action type from HTTP method and path
 */
function determineAction(method: string, path: string, body?: any): string {
  // Explicit actions in path
  if (path.includes('/approve')) return 'APPROVE';
  if (path.includes('/reject')) return 'REJECT';
  if (path.includes('/suspend')) return 'SUSPEND';
  if (path.includes('/activate')) return 'ACTIVATE';
  if (path.includes('/cancel')) return 'CANCEL';
  if (path.includes('/complete')) return 'COMPLETE';
  if (path.includes('/download')) return 'DOWNLOAD';
  if (path.includes('/upload')) return 'UPLOAD';
  
  // HTTP method based
  switch (method.toUpperCase()) {
    case 'POST':
      if (path.includes('/request')) return 'REQUEST';
      if (path.includes('/register')) return 'REGISTER';
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      if (path.includes('/download')) return 'DOWNLOAD';
      return 'VIEW';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Audit middleware - logs state-changing operations
 * Place this AFTER authentication middleware
 */
export const auditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  
  // Only audit authenticated requests
  if (!user) {
    return next();
  }
  
  // Only audit state-changing operations (not GET unless it's download)
  const method = req.method.toUpperCase();
  const shouldAudit = method !== 'GET' || req.path.includes('/download');
  
  if (!shouldAudit) {
    return next();
  }
  
  // Extract entity info
  const entityInfo = extractEntityInfo(req);
  
  if (!entityInfo) {
    // Can't determine entity, skip audit
    return next();
  }
  
  // Capture original response methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  // Track if we've already logged
  let logged = false;
  
  const logAudit = async (responseData: any) => {
    if (logged) return;
    logged = true;
    
    // Only log successful operations (2xx responses)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const action = determineAction(method, req.path, req.body);
        
        await auditService.log({
          entityType: entityInfo.entityType,
          entityId: entityInfo.entityId,
          action,
          performedBy: user.username || user.sub || 'SYSTEM',
          organization: user.org || 'UNKNOWN',
          performedByOrg: user.org || 'UNKNOWN',
          oldValue: req.body?.oldStatus || req.body?.currentStatus || 'N/A',
          newValue: req.body?.newStatus || req.body?.status || responseData?.data?.status || 'N/A',
          reason: req.body?.reason || req.body?.comments || req.body?.notes || '',
          metadata: {
            method,
            path: req.path,
            userId: user.sub || user.username,
            role: user.role,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString(),
            requestBody: method !== 'GET' ? req.body : undefined,
          },
          ipAddress: req.ip || (req as any).connection?.remoteAddress || 'unknown',
        });
      } catch (error) {
        logger.error('Audit logging failed (non-fatal):', error);
      }
    }
  };
  
  // Override res.json to capture response
  res.json = function (body: any) {
    logAudit(body).finally(() => originalJson(body));
    return this;
  };
  
  // Override res.send to capture response
  res.send = function (body: any) {
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      logAudit(parsed).finally(() => originalSend(body));
    } catch {
      originalSend(body);
    }
    return this;
  };
  
  next();
};

/**
 * Selective audit middleware - only for specific routes
 * Use this for fine-grained control
 */
export const auditAction = (entityType: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return next();
    }
    
    // Store audit info for later
    (req as any).auditInfo = {
      entityType,
      action,
      entityId: req.params.id || req.params.contractID || req.params.exporterId || req.body?.id,
    };
    
    next();
  };
};

export default auditMiddleware;

// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Unified Audit Middleware - Consolidated from auditCapture + auditMiddleware

import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { logger } from '../utils/logger';

const auditService = AuditService.getInstance();

/**
 * Extract entity information from request (path, params, body)
 */
function extractEntityInfo(req: Request): { entityType: string; entityId: string } | null {
  const path = req.path;
  const { params, body } = req;

  // Try path-based extraction first (more reliable)
  // Contracts
  if (path.includes('/contracts')) {
    const id = params.contractId || params.contractID || body.contractID || body.contractId;
    if (id) return { entityType: 'CONTRACT', entityId: id };
  }

  // LCs
  if (path.includes('/lc') || path.includes('/banking')) {
    const id = params.lcId || params.lcID || params.lcNumber || body.lcID || body.lcId;
    if (id) return { entityType: 'LC', entityId: id };
  }

  // Forex
  if (path.includes('/forex')) {
    const id = params.forexId || body.forexId || body.forexAllocationId;
    if (id) return { entityType: 'FOREX', entityId: id };
  }

  // Shipments
  if (path.includes('/shipments')) {
    const id = params.shipmentId || params.shipmentID || body.shipmentID || body.shipmentId;
    if (id) return { entityType: 'SHIPMENT', entityId: id };
  }

  // Exporters / Applications
  if (path.includes('/exporters') || path.includes('/applications')) {
    const id = params.exporterId || params.applicationId || body.exporterID || body.exporterId || body.applicationId;
    if (id) return { entityType: 'EXPORTER', entityId: id };
  }

  // Quality
  if (path.includes('/quality')) {
    const id = params.inspectionId || body.inspectionID;
    if (id) return { entityType: 'QUALITY', entityId: id };
  }

  // Customs
  if (path.includes('/customs')) {
    const id = params.declarationId || body.declarationID;
    if (id) return { entityType: 'CUSTOMS', entityId: id };
  }

  // Payments
  if (path.includes('/payments')) {
    const id = params.paymentId || body.paymentID;
    if (id) return { entityType: 'PAYMENT', entityId: id };
  }

  // Documents
  if (path.includes('/documents')) {
    const id = params.documentId || body.documentId;
    if (id) return { entityType: 'DOCUMENT', entityId: id };
  }

  return null;
}

/**
 * Determine action from HTTP method and path
 */
function determineAction(method: string, path: string): string {
  // Explicit actions in path
  if (path.includes('/approve')) return 'APPROVE';
  if (path.includes('/reject')) return 'REJECT';
  if (path.includes('/suspend')) return 'SUSPEND';
  if (path.includes('/activate')) return 'ACTIVATE';
  if (path.includes('/cancel')) return 'CANCEL';
  if (path.includes('/complete')) return 'COMPLETE';
  if (path.includes('/issue')) return 'ISSUE';
  if (path.includes('/allocate')) return 'ALLOCATE';
  if (path.includes('/request')) return 'REQUEST';
  if (path.includes('/register')) return 'REGISTER';
  if (path.includes('/examine')) return 'EXAMINE';
  if (path.includes('/release')) return 'RELEASE';
  if (path.includes('/settle')) return 'SETTLE';

  // HTTP method based
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'ACTION';
  }
}

/**
 * Unified Audit Middleware
 * Place AFTER authentication middleware in the chain
 * 
 * Features:
 * - Auto-detects entity from path/params/body
 * - Logs only successful operations (2xx status)
 * - Non-blocking (async logging)
 * - Handles all state-changing operations
 */
export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const method = req.method.toUpperCase();
  
  // Only audit state-changing operations
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // Skip health checks and docs
  if (req.path.includes('/health') || req.path.includes('/api-docs') || req.path.includes('/monitoring')) {
    return next();
  }

  // Skip if this IS the audit log endpoint (prevent recursion)
  if (req.path.includes('/audit/log')) {
    return next();
  }

  // Extract entity info
  const entityInfo = extractEntityInfo(req);

  // If we can't determine entity, skip (not all endpoints need audit)
  if (!entityInfo) {
    return next();
  }

  // Capture response
  const originalJson = res.json.bind(res);
  let auditLogged = false;

  res.json = function (body: any) {
    // Log audit asynchronously after response is sent
    if (!auditLogged) {
      auditLogged = true;
      
      const user = (req as any).user;
      const isSuccess = body?.success !== false && res.statusCode >= 200 && res.statusCode < 400;

      // Only log if user authenticated and operation succeeded
      if (user && isSuccess) {
        setImmediate(async () => {
          try {
            const action = determineAction(method, req.path);

            await auditService.log({
              entityType: entityInfo.entityType,
              entityId: entityInfo.entityId,
              action,
              performedBy: user.username || user.sub || user.userId || 'UNKNOWN',
              organization: user.org || user.organization || 'SYSTEM',
              performedByOrg: user.org || user.organization || 'SYSTEM',
              oldValue: req.body?.oldStatus || req.body?.currentStatus || '',
              newValue: req.body?.newStatus || req.body?.status || body?.data?.status || '',
              reason: req.body?.reason || req.body?.comments || req.body?.notes || `${action} performed`,
              metadata: {
                method,
                path: req.path,
                userId: user.sub || user.userId || user.username,
                role: user.role,
                statusCode: res.statusCode,
                userAgent: req.get('user-agent'),
              },
              ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
            });

            logger.debug(`📝 Audit: ${action} ${entityInfo.entityType}/${entityInfo.entityId} by ${user.username || user.sub}`);
          } catch (error: any) {
            logger.error(`❌ Audit logging failed: ${error.message}`);
            // Don't throw - audit failures should not break the application
          }
        });
      }
    }

    return originalJson(body);
  };

  next();
};

/**
 * Manual audit logging helper for use in routes
 * Use this when you need explicit control over audit logging
 */
export async function logManualAudit(params: {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  organization: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  metadata?: any;
  ipAddress?: string;
}) {
  try {
    await auditService.log({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      performedBy: params.performedBy,
      organization: params.organization,
      performedByOrg: params.organization,
      oldValue: params.oldValue || '',
      newValue: params.newValue || '',
      reason: params.reason || `${params.action} performed`,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
    });

    logger.info(`📝 Manual audit: ${params.action} on ${params.entityType}/${params.entityId}`);
  } catch (error: any) {
    logger.error(`❌ Manual audit failed: ${error.message}`);
  }
}

// Export default for backwards compatibility
export default auditMiddleware;

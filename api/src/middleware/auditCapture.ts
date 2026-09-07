// Middleware to automatically capture all user actions for audit trail
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { logger } from '../utils/logger';

const auditService = AuditService.getInstance();

// Actions that should be audited
const AUDITABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const AUDITABLE_PATHS = [
  '/contracts',
  '/banking',
  '/shipments',
  '/exporters',
  '/forex',
  '/payments',
  '/swift',
  '/customs',
  '/documents',
  '/users',
  '/quality',
  '/permits',
  '/lc',
  '/audit',
  '/traceability'
];

// Extract entity info from path
function extractEntityInfo(path: string, method: string, body: any): {
  entityType: string;
  entityId: string;
  action: string;
} {
  const segments = path.split('/').filter(s => s && s !== 'api' && s !== 'v1');
  
  let entityType = segments[0]?.toUpperCase() || 'UNKNOWN';
  let entityId = body?.id || body?.contractId || body?.exporterId || body?.shipmentId || segments[1] || 'NEW';
  
  // Map HTTP methods to audit actions
  let action = 'UPDATE';
  switch (method) {
    case 'POST':
      action = path.includes('/approve') ? 'APPROVE' : 
               path.includes('/reject') ? 'REJECT' :
               path.includes('/submit') ? 'SUBMIT' : 'CREATE';
      break;
    case 'PUT':
    case 'PATCH':
      action = 'UPDATE';
      break;
    case 'DELETE':
      action = 'DELETE';
      break;
  }

  // Clean up entity type
  entityType = entityType.replace(/S$/, ''); // Remove trailing S
  
  return { entityType, entityId, action };
}

/**
 * Middleware that automatically captures all user actions
 * Logs to both blockchain and PostgreSQL audit trail
 */
export const auditCaptureMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip if not an auditable method
  if (!AUDITABLE_METHODS.includes(req.method)) {
    return next();
  }

  // Skip if not an auditable path
  const isAuditable = AUDITABLE_PATHS.some(path => req.path.includes(path));
  if (!isAuditable) {
    return next();
  }

  // Skip health checks and other system endpoints
  if (req.path.includes('/health') || req.path.includes('/api-docs')) {
    return next();
  }

  // Extract user info
  const user = (req as any).user;
  if (!user) {
    return next(); // No user context, skip audit
  }

  const performedBy = user.username || user.sub || 'UNKNOWN';
  const organization = user.organization || user.org || 'SYSTEM';
  const performedByOrg = user.org || organization;
  const ipAddress = req.ip || req.socket.remoteAddress;

  // Extract entity info from request
  const { entityType, entityId, action } = extractEntityInfo(
    req.path,
    req.method,
    req.body
  );

  // Capture response to get old/new values
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    // Only log successful operations
    if (body?.success || res.statusCode < 400) {
      // Log audit entry asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await auditService.log({
            entityType,
            entityId,
            action,
            performedBy,
            organization,
            performedByOrg,
            oldValue: req.body?.oldStatus || req.body?.currentStatus,
            newValue: req.body?.newStatus || req.body?.status || body?.data?.status,
            reason: req.body?.reason || req.body?.comments || `${action} via API`,
            metadata: {
              method: req.method,
              path: req.path,
              userAgent: req.get('user-agent'),
              requestBody: req.body,
              responseStatus: res.statusCode
            },
            ipAddress
          });
          
          logger.info(`📝 Audit logged: ${action} on ${entityType}/${entityId} by ${performedBy}`);
        } catch (error) {
          logger.error('Failed to log audit entry:', error);
        }
      });
    }
    
    return originalJson(body);
  };

  next();
};

/**
 * Helper function to manually log audit entries from routes
 */
export async function logAudit(
  entityType: string,
  entityId: string,
  action: string,
  user: any,
  details?: {
    oldValue?: string;
    newValue?: string;
    reason?: string;
    metadata?: any;
  }
) {
  const performedBy = user.username || user.sub || 'UNKNOWN';
  const organization = user.organization || user.org || 'SYSTEM';
  const performedByOrg = user.org || organization;

  await auditService.log({
    entityType,
    entityId,
    action,
    performedBy,
    organization,
    performedByOrg,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
    reason: details?.reason,
    metadata: details?.metadata
  });

  logger.info(`📝 Manual audit: ${action} on ${entityType}/${entityId} by ${performedBy}`);
}

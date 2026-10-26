// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Notifications API Routes - Multi-channel Notification Management

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { body, param, query as queryParam, validationResult } from 'express-validator';
import notificationService from '../services/notificationService';
import { DatabaseService } from '../services/databaseService';
import smsService from '../services/smsService';
import webhookService from '../services/webhookService';
import { logger } from '../utils/logger';

const router = express.Router();
const db = DatabaseService.getInstance();

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * GET /api/v1/notifications/preferences
 * Get current user's notification preferences
 */
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.exporterId || user.username || user.sub;

    const prefs = await notificationService['getUserPreferences'](userId);

    res.json({
      success: true,
      data: prefs,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences',
  authMiddleware,
  [
    body('email_enabled').optional().isBoolean(),
    body('sms_enabled').optional().isBoolean(),
    body('webhook_enabled').optional().isBoolean(),
    body('phone').optional().isMobilePhone('any'),
    body('events').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const userId = user.exporterId || user.username || user.sub;
      const preferences = req.body;

      const success = await notificationService.updatePreferences(userId, preferences);

      if (success) {
        res.json({
          success: true,
          message: 'Preferences updated successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'UPDATE_FAILED', message: 'Failed to update preferences' },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/notifications/send
 * Send notification to user (manual trigger)
 */
router.post('/send',
  authMiddleware,
  requireRole(['ADMIN', 'NBE', 'NBE_ADMIN', 'NBE OFFICER']),
  [
    body('recipient').isObject(),
    body('recipient.userId').isString().trim().notEmpty(),
    body('subject').notEmpty(),
    body('message').notEmpty(),
    body('channels').optional().isArray(),
    body('channels.*').optional().isIn(['email', 'sms', 'webhook']),
    body('priority').optional().isIn(['high', 'normal', 'low']),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { recipient, subject, message, channels, priority, metadata } = req.body;
      const target = await db.get(
        `SELECT id, username, exporter_id, email, phone
         FROM users
         WHERE CAST(id AS TEXT) = $1 OR username = $1 OR exporter_id = $1
         ORDER BY CASE WHEN exporter_id = $1 THEN 0 WHEN username = $1 THEN 1 ELSE 2 END
         LIMIT 1`,
        [recipient.userId]
      );
      if (!target) {
        return res.status(404).json({
          success: false,
          error: { code: 'RECIPIENT_NOT_FOUND', message: 'Notification recipient was not found' },
          timestamp: new Date().toISOString()
        });
      }

      const results = await notificationService.send(
        {
          userId: String(target.exporter_id || target.username || target.id),
          email: target.email || undefined,
          phone: target.phone || undefined,
        },
        subject,
        message,
        { channels, priority, metadata }
      );

      if (!Object.values(results).some(Boolean)) {
        return res.status(502).json({
          success: false,
          error: { code: 'DELIVERY_FAILED', message: 'No notification channel delivered the message' },
          data: results,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SEND_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/notifications/compliance/repatriation
 * Deliver an overdue repatriation notice to the exporter contact on file.
 */
router.post('/compliance/repatriation',
  authMiddleware,
  requireRole(['NBE', 'NBE_ADMIN', 'NBE OFFICER']),
  [
    body('exporterId').isString().trim().notEmpty(),
    body('repatriationId').isString().trim().notEmpty(),
    body('deadline').optional().isISO8601(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exporterId, repatriationId, deadline } = req.body;
      const exporter = await db.get(
        `SELECT u.username, u.exporter_id, u.email, u.phone, u.full_name,
                ea.email AS contact_email, ea.phone AS contact_phone, ea.company_name
         FROM users u
         LEFT JOIN exporter_applications ea ON ea.exporter_id = u.exporter_id
         WHERE (u.exporter_id = $1 OR u.username = $1)
           AND UPPER(u.role) = 'EXPORTER'
         LIMIT 1`,
        [exporterId]
      );

      const email = exporter?.contact_email || exporter?.email;
      if (!exporter || !email) {
        return res.status(404).json({
          success: false,
          error: { code: 'EXPORTER_CONTACT_NOT_FOUND', message: 'No exporter email is registered for this exporter' },
          timestamp: new Date().toISOString()
        });
      }

      const subject = 'Overdue export proceeds repatriation';
      const message = [
        `Repatriation ${repatriationId} is overdue.`,
        deadline ? `Compliance deadline: ${new Date(deadline).toLocaleDateString('en-ET')}.` : '',
        'Please contact your bank and NBE with the required settlement evidence.',
      ].filter(Boolean).join('\n\n');
      const results = await notificationService.send(
        {
          userId: String(exporter.exporter_id || exporter.username),
          email,
          phone: exporter.contact_phone || exporter.phone || undefined,
          name: exporter.company_name || exporter.full_name || undefined,
        },
        subject,
        message,
        { channels: ['email'], priority: 'high', metadata: { repatriationId, noticeType: 'OVERDUE_REPATRIATION' } }
      );

      if (!results.email) {
        return res.status(502).json({
          success: false,
          error: { code: 'DELIVERY_FAILED', message: 'Email delivery did not complete; check exporter preferences and email service configuration' },
          data: results,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({ success: true, data: results, timestamp: new Date().toISOString() });
    } catch (error: any) {
      logger.error('Error sending repatriation compliance notice:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SEND_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/notifications/sms/test
 * Test SMS functionality
 */
router.post('/sms/test',
  authMiddleware,
  [
    body('phone').isMobilePhone('any'),
    body('message').notEmpty(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { phone, message } = req.body;

      const success = await smsService.send({
        to: phone,
        message,
        priority: 'normal'
      });

      res.json({
        success,
        message: success ? 'SMS sent successfully' : 'SMS delivery failed',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error sending test SMS:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SMS_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/notifications/webhooks/register
 * Register a new webhook endpoint
 */
router.post('/webhooks/register',
  authMiddleware,
  [
    body('name').notEmpty(),
    body('url').isURL(),
    body('secret').isLength({ min: 16 }),
    body('events').isArray(),
    body('retryAttempts').optional().isInt({ min: 0, max: 10 }),
    body('timeout').optional().isInt({ min: 1000, max: 60000 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const organization = user.org || user.organization || 'UNKNOWN';
      const { name, url, secret, events, retryAttempts, timeout } = req.body;

      const webhookId = await webhookService.register({
        name,
        organization,
        url,
        secret,
        events,
        active: true,
        retryAttempts: retryAttempts || 3,
        timeout: timeout || 10000
      } as any);

      res.json({
        success: true,
        data: { webhookId },
        message: 'Webhook registered successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error registering webhook:', error);
      res.status(500).json({
        success: false,
        error: { code: 'WEBHOOK_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/notifications/webhooks/test
 * Test webhook delivery
 */
router.post('/webhooks/test',
  authMiddleware,
  [
    body('event').notEmpty(),
    body('data').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { event, data } = req.body;

      await webhookService.trigger(event, data || {
        test: true,
        message: 'Test webhook delivery',
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Webhook triggered successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error testing webhook:', error);
      res.status(500).json({
        success: false,
        error: { code: 'WEBHOOK_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v1/notifications/alerts
 * Get system alerts
 */
router.get('/alerts',
  authMiddleware,
  requireRole(['ADMIN', 'ECTA_ADMIN']),
  [
    queryParam('severity').optional().isIn(['critical', 'warning', 'info']),
    queryParam('resolved').optional().isBoolean(),
    queryParam('limit').optional().isInt({ min: 1, max: 100 }),
    queryParam('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  async (req, res) => {
  try {
    const severity = typeof req.query.severity === 'string' ? req.query.severity : undefined;
    const resolved = req.query.resolved === undefined ? false : req.query.resolved === 'true';
    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    const clauses = ['resolved = $1'];
    const values: Array<string | boolean | number> = [resolved];

    if (severity) {
      values.push(severity);
      clauses.push(`severity = $${values.length}`);
    }

    values.push(limit);
    const limitParameter = values.length;
    values.push(offset);
    const offsetParameter = values.length;
    const alerts = await db.all(
      `SELECT id, alert_type AS "alertType", severity, title, message, metadata,
              resolved, resolved_at AS "resolvedAt", resolved_by AS "resolvedBy",
              created_at AS "createdAt"
       FROM system_alerts
       WHERE ${clauses.join(' AND ')}
       ORDER BY created_at DESC, id DESC
       LIMIT $${limitParameter} OFFSET $${offsetParameter}`,
      values
    );

    res.json({
      success: true,
      data: alerts,
      filters: { severity: severity || null, resolved, limit, offset },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
  }
);

/**
 * POST /api/v1/notifications/alerts
 * Create system alert
 */
router.post('/alerts',
  authMiddleware,
  requireRole(['ADMIN', 'ECTA_ADMIN']),
  [
    body('alertType').notEmpty(),
    body('severity').isIn(['critical', 'warning', 'info']),
    body('title').notEmpty(),
    body('message').notEmpty(),
    body('metadata').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { alertType, severity, title, message, metadata } = req.body;

      await notificationService.createSystemAlert(
        alertType,
        severity,
        title,
        message,
        metadata
      );

      res.json({
        success: true,
        message: 'Alert created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error creating alert:', error);
      res.status(500).json({
        success: false,
        error: { code: 'ALERT_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * PUT /api/v1/notifications/alerts/:id/resolve
 * Resolve system alert
 */
router.put('/alerts/:id/resolve',
  authMiddleware,
  requireRole(['ADMIN', 'ECTA_ADMIN']),
  [param('id').isInt()],
  validateRequest,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const alertId = parseInt(req.params.id);
      const resolvedBy = user.username || user.sub;

      const resolved = await notificationService.resolveSystemAlert(alertId, resolvedBy);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: { code: 'ALERT_NOT_FOUND', message: 'System alert was not found or is already resolved' },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Alert resolved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        error: { code: 'RESOLVE_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;

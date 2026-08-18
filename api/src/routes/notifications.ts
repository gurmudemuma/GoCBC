// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Notifications API Routes - Multi-channel Notification Management

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import notificationService from '../services/notificationService';
import smsService from '../services/smsService';
import webhookService from '../services/webhookService';
import { logger } from '../utils/logger';

const router = express.Router();

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
  [
    body('recipient').notEmpty(),
    body('subject').notEmpty(),
    body('message').notEmpty(),
    body('channels').optional().isArray(),
    body('priority').optional().isIn(['high', 'normal', 'low']),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { recipient, subject, message, channels, priority, metadata } = req.body;

      const results = await notificationService.send(
        recipient,
        subject,
        message,
        { channels, priority, metadata }
      );

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
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const { severity, resolved = 'false' } = req.query;
    
    // This would query the system_alerts table
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: [],
      filters: { severity, resolved },
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
});

/**
 * POST /api/v1/notifications/alerts
 * Create system alert
 */
router.post('/alerts',
  authMiddleware,
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
  [param('id').isInt()],
  validateRequest,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const alertId = parseInt(req.params.id);
      const resolvedBy = user.username || user.sub;

      await notificationService.resolveSystemAlert(alertId, resolvedBy);

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

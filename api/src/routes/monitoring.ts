/**
 * System Monitoring Dashboard Routes
 * 
 * Provides real-time system health metrics, blockchain sync status,
 * and operational analytics for administrators.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const db = DatabaseService.getInstance();

/**
 * @swagger
 * /api/v1/monitoring/health:
 *   get:
 *     summary: Quick system health check
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health metrics
 */
router.get('/health',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const health = await db.get(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
          (SELECT COUNT(*) FROM exporter_applications WHERE status = 'pending') as pending_applications,
          (SELECT COUNT(*) FROM contracts WHERE blockchain_synced = false OR blockchain_synced IS NULL) as contracts_pending_sync,
          (SELECT COUNT(*) FROM shipments WHERE blockchain_synced = false OR blockchain_synced IS NULL) as shipments_pending_sync,
          (SELECT COUNT(*) FROM contracts WHERE blockchain_tx_id LIKE 'FAILED:%') + 
          (SELECT COUNT(*) FROM shipments WHERE blockchain_tx_id LIKE 'FAILED:%') as blockchain_failures,
          (SELECT COUNT(*) FROM audit_trail WHERE created_at > NOW() - INTERVAL '24 hours') as audit_entries_24h,
          (SELECT COUNT(*) FROM contracts WHERE created_at > NOW() - INTERVAL '24 hours') as contracts_24h,
          (SELECT COUNT(*) FROM shipments WHERE created_at > NOW() - INTERVAL '24 hours') as shipments_24h
      `);

      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get health metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'HEALTH_CHECK_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/monitoring/blockchain-sync:
 *   get:
 *     summary: Blockchain sync status
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blockchain sync metrics
 */
router.get('/blockchain-sync',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      // Pending syncs
      const pending = await db.all(`
        SELECT 
          'contracts' as entity_type,
          COUNT(*) as pending_count,
          MIN(created_at) as oldest_pending,
          MAX(created_at) as newest_pending
        FROM contracts 
        WHERE blockchain_synced = false OR blockchain_synced IS NULL
        UNION ALL
        SELECT 
          'shipments' as entity_type,
          COUNT(*) as pending_count,
          MIN(created_at) as oldest_pending,
          MAX(created_at) as newest_pending
        FROM shipments 
        WHERE blockchain_synced = false OR blockchain_synced IS NULL
      `);

      // Failed syncs
      const failed = await db.all(`
        SELECT 
          'contracts' as entity_type,
          COUNT(*) as failed_count
        FROM contracts 
        WHERE blockchain_tx_id LIKE 'FAILED:%'
        UNION ALL
        SELECT 
          'shipments' as entity_type,
          COUNT(*) as failed_count
        FROM shipments 
        WHERE blockchain_tx_id LIKE 'FAILED:%'
      `);

      // Success rate (last 24h)
      const successRate = await db.all(`
        SELECT 
          'contracts' as entity_type,
          COUNT(*) as total,
          SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) as synced,
          ROUND(100.0 * SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
        FROM contracts 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 
          'shipments' as entity_type,
          COUNT(*) as total,
          SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) as synced,
          ROUND(100.0 * SUM(CASE WHEN blockchain_synced = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
        FROM shipments 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      res.json({
        success: true,
        data: {
          pending,
          failed,
          successRate,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get blockchain sync metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SYNC_METRICS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/monitoring/applications:
 *   get:
 *     summary: Exporter application pipeline status
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application status metrics
 */
router.get('/applications',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const pipeline = await db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          MIN(submitted_at) as oldest,
          MAX(submitted_at) as newest,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(approved_at, rejected_at, NOW()) - submitted_at)) / 86400), 2) as avg_days_to_decision
        FROM exporter_applications
        GROUP BY status
        ORDER BY 
          CASE status 
            WHEN 'pending' THEN 1 
            WHEN 'approved' THEN 2 
            WHEN 'rejected' THEN 3 
          END
      `);

      const pendingOverdue = await db.all(`
        SELECT 
          application_id,
          company_name,
          email,
          submitted_at,
          EXTRACT(EPOCH FROM (NOW() - submitted_at)) / 3600 as hours_pending
        FROM exporter_applications
        WHERE status = 'pending' 
          AND submitted_at < NOW() - INTERVAL '48 hours'
        ORDER BY submitted_at ASC
      `);

      res.json({
        success: true,
        data: {
          pipeline,
          pendingOverdue,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get application metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'APPLICATION_METRICS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/monitoring/activity:
 *   get:
 *     summary: System activity metrics (last 7 days)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily activity metrics
 */
router.get('/activity',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const dailyActivity = await db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(CASE WHEN entity_type = 'CONTRACT' THEN 1 END) as contracts,
          COUNT(CASE WHEN entity_type = 'SHIPMENT' THEN 1 END) as shipments,
          COUNT(CASE WHEN entity_type = 'EXPORTER_APPLICATION' THEN 1 END) as applications,
          COUNT(*) as total
        FROM audit_trail
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      res.json({
        success: true,
        data: dailyActivity,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get activity metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'ACTIVITY_METRICS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/monitoring/contracts:
 *   get:
 *     summary: Contract status distribution
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contract metrics
 */
router.get('/contracts',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN', 'BANK', 'ECTA'),
  async (req: Request, res: Response) => {
    try {
      const statusDistribution = await db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(quantity_kg), 0) as total_kg,
          COALESCE(SUM(quantity_kg * price_per_kg), 0) as total_value_usd,
          COUNT(CASE WHEN blockchain_synced = true THEN 1 END) as synced_to_blockchain
        FROM contracts
        GROUP BY status
        ORDER BY count DESC
      `);

      const awaitingShipment = await db.all(`
        SELECT 
          c.contract_id,
          c.exporter_id,
          c.buyer_name,
          c.quantity_kg,
          c.contract_date,
          c.delivery_date,
          COUNT(s.id) as shipment_count,
          COALESCE(SUM(s.weight_kg), 0) as shipped_kg,
          c.quantity_kg - COALESCE(SUM(s.weight_kg), 0) as remaining_kg
        FROM contracts c
        LEFT JOIN shipments s ON c.contract_id = s.contract_id
        WHERE c.status = 'approved'
        GROUP BY c.id, c.contract_id, c.exporter_id, c.buyer_name, c.quantity_kg, c.contract_date, c.delivery_date
        HAVING c.quantity_kg > COALESCE(SUM(s.weight_kg), 0)
        ORDER BY c.delivery_date ASC
        LIMIT 20
      `);

      res.json({
        success: true,
        data: {
          statusDistribution,
          awaitingShipment,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get contract metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CONTRACT_METRICS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/monitoring/shipments:
 *   get:
 *     summary: Shipment status distribution
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipment metrics
 */
router.get('/shipments',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN', 'BANK', 'ECTA'),
  async (req: Request, res: Response) => {
    try {
      const statusDistribution = await db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(weight_kg), 0) as total_kg,
          COUNT(CASE WHEN blockchain_synced = true THEN 1 END) as synced_to_blockchain
        FROM shipments
        GROUP BY status
        ORDER BY count DESC
      `);

      res.json({
        success: true,
        data: statusDistribution,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get shipment metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SHIPMENT_METRICS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/monitoring/alerts:
 *   get:
 *     summary: System alerts and warnings
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System alerts
 */
router.get('/alerts',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const alerts = await db.all(`
        SELECT 
          'CRITICAL' as severity,
          'Blockchain sync failures detected' as alert,
          (SELECT COUNT(*) FROM contracts WHERE blockchain_tx_id LIKE 'FAILED:%') +
          (SELECT COUNT(*) FROM shipments WHERE blockchain_tx_id LIKE 'FAILED:%') as affected_records
        WHERE (SELECT COUNT(*) FROM contracts WHERE blockchain_tx_id LIKE 'FAILED:%') +
              (SELECT COUNT(*) FROM shipments WHERE blockchain_tx_id LIKE 'FAILED:%') > 0
        UNION ALL
        SELECT 
          'WARNING' as severity,
          'Applications pending over 48 hours' as alert,
          COUNT(*) as affected_records
        FROM exporter_applications
        WHERE status = 'pending' AND submitted_at < NOW() - INTERVAL '48 hours'
        HAVING COUNT(*) > 0
        UNION ALL
        SELECT 
          'WARNING' as severity,
          'Contracts past delivery date' as alert,
          COUNT(*) as affected_records
        FROM contracts
        WHERE status IN ('approved', 'pending') AND delivery_date < CURRENT_DATE
        HAVING COUNT(*) > 0
      `);

      res.json({
        success: true,
        data: alerts || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get alerts:', error);
      res.status(500).json({
        success: false,
        error: { code: 'ALERTS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/monitoring/exports:
 *   get:
 *     summary: Export metrics and business intelligence
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Export volume and statistics
 */
router.get('/exports',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN', 'ECTA'),
  async (req: Request, res: Response) => {
    try {
      const monthlyVolumes = await db.all(`
        SELECT 
          TO_CHAR(shipping_date, 'YYYY-MM') as month,
          COUNT(*) as shipment_count,
          COALESCE(SUM(weight_kg), 0) as total_kg,
          COUNT(DISTINCT exporter_id) as unique_exporters,
          COUNT(DISTINCT destination_country) as unique_destinations
        FROM shipments
        WHERE shipping_date IS NOT NULL
        GROUP BY TO_CHAR(shipping_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `);

      const topExporters = await db.all(`
        SELECT 
          s.exporter_id,
          u.full_name as exporter_name,
          COUNT(DISTINCT s.shipment_id) as shipment_count,
          COUNT(DISTINCT s.contract_id) as contract_count,
          COALESCE(SUM(s.weight_kg), 0) as total_kg,
          COALESCE(ROUND(SUM(c.quantity_kg * c.price_per_kg), 2), 0) as total_value_usd
        FROM shipments s
        JOIN contracts c ON s.contract_id = c.contract_id
        LEFT JOIN users u ON s.exporter_id = u.username
        WHERE s.created_at > NOW() - INTERVAL '90 days'
        GROUP BY s.exporter_id, u.full_name
        ORDER BY total_kg DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          monthlyVolumes,
          topExporters,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get export metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_METRICS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

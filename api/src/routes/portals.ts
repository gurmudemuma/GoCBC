// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Unified Portal Dashboards - Single endpoint per portal

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const db = DatabaseService.getInstance();

/**
 * GET /api/v1/portals/:portal/dashboard
 * Unified dashboard endpoint for all portals
 */
router.get('/:portal/dashboard', 
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { portal } = req.params;
      const user = (req as any).user;
      
      logger.info(`[PORTALS] Loading dashboard for: ${portal}, user: ${user.username}`);
      
      // Route to specific portal dashboard
      switch (portal.toLowerCase()) {
        case 'ecta':
          return await getECTADashboard(req, res);
        case 'banks':
          return await getBanksDashboard(req, res);
        case 'nbe':
          return await getNBEDashboard(req, res);
        case 'customs':
          return await getCustomsDashboard(req, res);
        case 'shipping':
          return await getShippingDashboard(req, res);
        case 'exporters':
          return await getExporterDashboard(req, res);
        case 'ecx':
          return await getECXDashboard(req, res);
        default:
          return res.status(404).json({
            success: false,
            error: { 
              code: 'PORTAL_NOT_FOUND', 
              message: `Portal '${portal}' not found. Available portals: ecta, banks, nbe, customs, shipping, exporters, ecx` 
            },
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      logger.error('[PORTALS] Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to load dashboard' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * ECTA Portal Dashboard
 * Shows pending applications, contracts, inspections, and recent activities
 */
async function getECTADashboard(req: Request, res: Response) {
  try {
    const [
      pendingApplications,
      pendingContracts,
      pendingInspections,
      recentActivities,
      statistics
    ] = await Promise.all([
      // Pending exporter applications
      db.all(
        `SELECT * FROM exporter_applications 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['PENDING']
      ),
      
      // Contracts awaiting approval
      db.all(
        `SELECT * FROM contracts 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['PENDING']
      ),
      
      // Quality inspections pending
      db.all(
        `SELECT * FROM quality_inspections 
         WHERE status IN ($1, $2) 
         ORDER BY created_at DESC LIMIT 10`,
        ['PENDING', 'INSPECTED']
      ),
      
      // Recent activities (last 24 hours)
      db.all(
        `SELECT * FROM audit_trail 
         WHERE performed_by_org = $1 
         AND created_at > datetime('now', '-24 hours')
         ORDER BY created_at DESC LIMIT 20`,
        ['ECTAMSP']
      ),
      
      // Statistics
      db.get(`
        SELECT 
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
          COUNT(*) as total_count
        FROM contracts
        WHERE created_at > datetime('now', '-30 days')
      `)
    ]);

    return res.json({
      success: true,
      data: {
        portal: 'ECTA',
        pendingTasks: {
          applications: pendingApplications.length,
          contracts: pendingContracts.length,
          inspections: pendingInspections.length,
          total: pendingApplications.length + pendingContracts.length + pendingInspections.length
        },
        pendingApplications,
        pendingContracts,
        pendingInspections,
        recentActivities,
        statistics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[PORTALS] ECTA dashboard error:', error);
    throw error;
  }
}

/**
 * Banks Portal Dashboard
 * Shows LC requests, forex allocations, payments to process, retention amounts
 */
async function getBanksDashboard(req: Request, res: Response) {
  try {
    const [
      pendingLCs,
      forexRequests,
      paymentsToProcess,
      retentionAmounts
    ] = await Promise.all([
      db.all(
        `SELECT * FROM letters_of_credit 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['PENDING']
      ),
      
      db.all(
        `SELECT * FROM forex_allocations 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['REQUESTED']
      ),
      
      db.all(
        `SELECT * FROM payments 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['RECEIVED']
      ),
      
      db.get(`
        SELECT 
          SUM(retention_amount) as total_retention,
          SUM(release_amount) as total_release,
          COUNT(*) as payment_count,
          SUM(amount_usd) as total_amount
        FROM payments
        WHERE status IN ('RECEIVED', 'RETENTION_CONVERTED')
      `)
    ]);

    return res.json({
      success: true,
      data: {
        portal: 'BANKS',
        pendingTasks: {
          lcRequests: pendingLCs.length,
          forexAllocations: forexRequests.length,
          paymentsToProcess: paymentsToProcess.length,
          total: pendingLCs.length + forexRequests.length + paymentsToProcess.length
        },
        pendingLCs,
        forexRequests,
        paymentsToProcess,
        retentionAmounts: {
          totalRetention: retentionAmounts?.total_retention || 0,
          totalRelease: retentionAmounts?.total_release || 0,
          totalAmount: retentionAmounts?.total_amount || 0,
          paymentCount: retentionAmounts?.payment_count || 0,
          retentionRate: 40 // NBE policy
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[PORTALS] Banks dashboard error:', error);
    throw error;
  }
}

/**
 * NBE Portal Dashboard
 * Shows forex requests, retention conversions, exchange rates, compliance metrics
 */
async function getNBEDashboard(req: Request, res: Response) {
  try {
    const [
      pendingForexRequests,
      retentionConversions,
      forexStatistics,
      recentAllocations
    ] = await Promise.all([
      db.all(
        `SELECT * FROM forex_allocations 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['REQUESTED']
      ),
      
      db.all(
        `SELECT * FROM payments 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['RECEIVED']
      ),
      
      db.get(`
        SELECT 
          COUNT(*) as total_allocations,
          SUM(allocated_amount) as total_allocated,
          SUM(retention_amount) as total_retention,
          AVG(retention_rate) as avg_retention_rate
        FROM forex_allocations
        WHERE created_at > datetime('now', '-30 days')
      `),
      
      db.all(
        `SELECT * FROM forex_allocations 
         WHERE status = 'ALLOCATED' 
         ORDER BY allocated_at DESC LIMIT 10`
      )
    ]);

    return res.json({
      success: true,
      data: {
        portal: 'NBE',
        pendingTasks: {
          forexRequests: pendingForexRequests.length,
          retentionConversions: retentionConversions.length,
          total: pendingForexRequests.length + retentionConversions.length
        },
        pendingForexRequests,
        retentionConversions,
        forexStatistics: {
          totalAllocations: forexStatistics?.total_allocations || 0,
          totalAllocated: forexStatistics?.total_allocated || 0,
          totalRetention: forexStatistics?.total_retention || 0,
          avgRetentionRate: forexStatistics?.avg_retention_rate || 40,
          policyRate: 40
        },
        recentAllocations,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[PORTALS] NBE dashboard error:', error);
    throw error;
  }
}

/**
 * Customs Portal Dashboard
 * Shows declarations pending review, inspections, clearances, revenue
 */
async function getCustomsDashboard(req: Request, res: Response) {
  try {
    const [
      pendingDeclarations,
      scheduledInspections,
      todayClearances,
      statistics
    ] = await Promise.all([
      db.all(
        `SELECT * FROM customs_declarations 
         WHERE status IN ($1, $2) 
         ORDER BY created_at DESC LIMIT 10`,
        ['SUBMITTED', 'UNDER_REVIEW']
      ),
      
      db.all(
        `SELECT * FROM customs_declarations 
         WHERE status = $1 
         ORDER BY created_at DESC LIMIT 10`,
        ['UNDER_REVIEW']
      ),
      
      db.all(
        `SELECT * FROM customs_declarations 
         WHERE status = 'CLEARED' 
         AND DATE(clearance_date) = DATE('now')
         ORDER BY clearance_date DESC`
      ),
      
      db.get(`
        SELECT 
          COUNT(*) as total_declarations,
          COUNT(CASE WHEN status = 'CLEARED' THEN 1 END) as cleared_count,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
          SUM(CASE WHEN status = 'CLEARED' THEN duties + taxes ELSE 0 END) as revenue_collected
        FROM customs_declarations
        WHERE created_at > datetime('now', '-30 days')
      `)
    ]);

    return res.json({
      success: true,
      data: {
        portal: 'CUSTOMS',
        pendingTasks: {
          pendingReview: pendingDeclarations.length,
          scheduledInspections: scheduledInspections.length,
          total: pendingDeclarations.length + scheduledInspections.length
        },
        pendingDeclarations,
        scheduledInspections,
        todayClearances,
        statistics: {
          totalDeclarations: statistics?.total_declarations || 0,
          clearedCount: statistics?.cleared_count || 0,
          rejectedCount: statistics?.rejected_count || 0,
          revenueCollected: statistics?.revenue_collected || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[PORTALS] Customs dashboard error:', error);
    throw error;
  }
}

/**
 * Shipping Portal Dashboard
 * Shows shipments ready for pickup, freight bookings, in-transit, deliveries
 */
async function getShippingDashboard(req: Request, res: Response) {
  try {
    const [
      readyForPickup,
      freightBookings,
      inTransit,
      recentDeliveries,
      statistics
    ] = await Promise.all([
      db.all(
        `SELECT * FROM shipments 
         WHERE status = 'CUSTOMS_CLEARED' 
         ORDER BY updated_at DESC LIMIT 10`
      ),
      
      db.all(
        `SELECT * FROM shipments 
         WHERE status = 'FREIGHT_BOOKED' 
         ORDER BY updated_at DESC LIMIT 10`
      ),
      
      db.all(
        `SELECT * FROM shipments 
         WHERE status IN ('IN_TRANSIT', 'LAND_TRANSPORT') 
         ORDER BY updated_at DESC LIMIT 10`
      ),
      
      db.all(
        `SELECT * FROM shipments 
         WHERE status = 'DELIVERED' 
         AND DATE(delivery_date) = DATE('now')
         ORDER BY delivery_date DESC`
      ),
      
      db.get(`
        SELECT 
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN status = 'CUSTOMS_CLEARED' THEN 1 END) as ready_for_pickup,
          COUNT(CASE WHEN status IN ('IN_TRANSIT', 'LAND_TRANSPORT') THEN 1 END) as in_transit,
          COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered
        FROM shipments
        WHERE created_at > datetime('now', '-30 days')
      `)
    ]);

    return res.json({
      success: true,
      data: {
        portal: 'SHIPPING',
        pendingTasks: {
          readyForPickup: readyForPickup.length,
          freightBookings: freightBookings.length,
          inTransit: inTransit.length,
          total: readyForPickup.length + freightBookings.length + inTransit.length
        },
        readyForPickup,
        freightBookings,
        inTransit,
        recentDeliveries,
        statistics: {
          totalShipments: statistics?.total_shipments || 0,
          readyForPickup: statistics?.ready_for_pickup || 0,
          inTransit: statistics?.in_transit || 0,
          delivered: statistics?.delivered || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[PORTALS] Shipping dashboard error:', error);
    throw error;
  }
}

/**
 * Exporter Portal Dashboard
 * Shows contracts, shipments, payments (with 40% retention breakdown)
 */
async function getExporterDashboard(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const exporterId = user.exporterId || user.username;
    
    const [
      contracts,
      shipments,
      payments,
      pendingTasks
    ] = await Promise.all([
      db.all(
        `SELECT * FROM contracts 
         WHERE exporter_id = $1 
         ORDER BY created_at DESC LIMIT 10`,
        [exporterId]
      ),
      
      db.all(
        `SELECT * FROM shipments 
         WHERE exporter_id = $1 
         ORDER BY created_at DESC LIMIT 10`,
        [exporterId]
      ),
      
      db.all(
        `SELECT 
           payment_id, contract_id, amount_usd, retention_amount, 
           release_amount, retention_rate, status, created_at
         FROM payments 
         WHERE exporter_id = $1 
         ORDER BY created_at DESC LIMIT 10`,
        [exporterId]
      ),
      
      db.all(
        `SELECT 'contract' as type, contract_id as id, status, created_at
         FROM contracts 
         WHERE exporter_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW')
         UNION ALL
         SELECT 'shipment' as type, shipment_id as id, status, created_at
         FROM shipments
         WHERE exporter_id = $1 AND status IN ('CREATED', 'QUALITY_CONTROL')
         ORDER BY created_at DESC`,
        [exporterId]
      )
    ]);

    // Calculate payment statistics with 40% retention breakdown
    const paymentStats = {
      totalReceived: payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount_usd) || 0), 0),
      totalRetained: payments.reduce((sum: number, p: any) => sum + (parseFloat(p.retention_amount) || 0), 0),
      totalReleased: payments.reduce((sum: number, p: any) => sum + (parseFloat(p.release_amount) || 0), 0),
      retentionRate: 40, // NBE policy
      paymentsCount: payments.length
    };

    return res.json({
      success: true,
      data: {
        portal: 'EXPORTER',
        exporterId,
        pendingTasks: {
          items: pendingTasks,
          total: pendingTasks.length
        },
        contracts: {
          items: contracts,
          total: contracts.length,
          pending: contracts.filter((c: any) => c.status === 'PENDING').length,
          approved: contracts.filter((c: any) => c.status === 'APPROVED').length
        },
        shipments: {
          items: shipments,
          total: shipments.length,
          inProgress: shipments.filter((s: any) => !['DELIVERED', 'COMPLETED'].includes(s.status)).length
        },
        payments: {
          items: payments,
          statistics: paymentStats
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[PORTALS] Exporter dashboard error:', error);
    throw error;
  }
}

/**
 * ECX Portal Dashboard
 * Shows lots available, releases pending, quality certificates, trading metrics
 */
async function getECXDashboard(req: Request, res: Response) {
  try {
    const [
      availableLots,
      pendingReleases,
      qualityCertificates,
      tradingMetrics
    ] = await Promise.all([
      db.all(
        `SELECT * FROM ecx_lots 
         WHERE status = 'AVAILABLE' 
         ORDER BY created_at DESC LIMIT 10`
      ),
      
      db.all(
        `SELECT * FROM ecx_lots 
         WHERE status = 'PENDING_RELEASE' 
         ORDER BY created_at DESC LIMIT 10`
      ),
      
      db.all(
        `SELECT * FROM quality_inspections 
         WHERE status = 'APPROVED' 
         AND certification_number IS NOT NULL
         ORDER BY created_at DESC LIMIT 10`
      ),
      
      db.get(`
        SELECT 
          COUNT(*) as total_lots,
          COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available_lots,
          COUNT(CASE WHEN status = 'RELEASED' THEN 1 END) as released_lots,
          SUM(quantity_kg) as total_quantity
        FROM ecx_lots
        WHERE created_at > datetime('now', '-30 days')
      `)
    ]);

    return res.json({
      success: true,
      data: {
        portal: 'ECX',
        pendingTasks: {
          pendingReleases: pendingReleases.length,
          total: pendingReleases.length
        },
        availableLots,
        pendingReleases,
        qualityCertificates,
        tradingMetrics: {
          totalLots: tradingMetrics?.total_lots || 0,
          availableLots: tradingMetrics?.available_lots || 0,
          releasedLots: tradingMetrics?.released_lots || 0,
          totalQuantity: tradingMetrics?.total_quantity || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[PORTALS] ECX dashboard error:', error);
    throw error;
  }
}

export default router;

// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Statistics API Routes - Dual Source (CouchDB + PostgreSQL)

import express, { Request, Response } from 'express';
import { DualSourceDataService } from '../services/dualSourceDataService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const dualSourceService = DualSourceDataService.getInstance();

/**
 * @swagger
 * /api/v1/stats/bank-portal:
 *   get:
 *     summary: Get Bank Portal statistics from BOTH CouchDB and PostgreSQL
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Statistics from both data sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     lc:
 *                       type: object
 *                       properties:
 *                         couchdbCount:
 *                           type: number
 *                         postgresCount:
 *                           type: number
 *                         totalCount:
 *                           type: number
 *                         source:
 *                           type: string
 *                     documentaryCollection:
 *                       type: object
 *                     advancePayment:
 *                       type: object
 *                     consignment:
 *                       type: object
 */
router.get('/bank-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[STATS] Fetching bank portal stats from BOTH CouchDB and PostgreSQL');

    const stats = await dualSourceService.getBankPortalStats();

    res.json({
      success: true,
      data: {
        lc: {
          couchdbCount: stats.lc.couchdbCount,
          postgresCount: stats.lc.postgresCount,
          totalCount: stats.lc.totalCount,
          source: stats.lc.source
        },
        documentaryCollection: {
          couchdbCount: stats.documentaryCollection.couchdbCount,
          postgresCount: stats.documentaryCollection.postgresCount,
          totalCount: stats.documentaryCollection.totalCount,
          source: stats.documentaryCollection.source
        },
        advancePayment: {
          couchdbCount: stats.advancePayment.couchdbCount,
          postgresCount: stats.advancePayment.postgresCount,
          totalCount: stats.advancePayment.totalCount,
          source: stats.advancePayment.source
        },
        consignment: {
          couchdbCount: stats.consignment.couchdbCount,
          postgresCount: stats.consignment.postgresCount,
          totalCount: stats.consignment.totalCount,
          source: stats.consignment.source
        },
        summary: {
          totalLCs: stats.lc.totalCount,
          totalCADs: stats.documentaryCollection.totalCount,
          totalAdvancePayments: stats.advancePayment.totalCount,
          totalConsignments: stats.consignment.totalCount,
          grandTotal: stats.lc.totalCount + stats.documentaryCollection.totalCount + 
                     stats.advancePayment.totalCount + stats.consignment.totalCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching bank portal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/lc:
 *   get:
 *     summary: Get Letters of Credit from BOTH sources with detailed data
 *     tags: [Statistics]
 */
router.get('/lc', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getLettersOfCredit();

    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching LCs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LCs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/advance-payments:
 *   get:
 *     summary: Get Advance Payments from BOTH sources
 *     tags: [Statistics]
 */
router.get('/advance-payments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getAdvancePayments();

    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching advance payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch advance payments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/consignments:
 *   get:
 *     summary: Get Consignment Payments from BOTH sources
 *     tags: [Statistics]
 */
router.get('/consignments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getConsignmentPayments();

    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching consignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consignments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/documentary-collections:
 *   get:
 *     summary: Get Documentary Collections (CAD) from BOTH sources
 *     tags: [Statistics]
 */
router.get('/documentary-collections', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getDocumentaryCollections();

    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching documentary collections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentary collections',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/exporter-portal:
 *   get:
 *     summary: Get Exporter Portal statistics
 *     tags: [Statistics]
 */
router.get('/exporter-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await dualSourceService.getExporterPortalStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching exporter portal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/nbe-portal:
 *   get:
 *     summary: Get NBE Portal statistics
 *     tags: [Statistics]
 */
router.get('/nbe-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await dualSourceService.getNBEPortalStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching NBE portal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/customs-portal:
 *   get:
 *     summary: Get Customs Portal statistics
 *     tags: [Statistics]
 */
router.get('/customs-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await dualSourceService.getCustomsPortalStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching customs portal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/ecx-portal:
 *   get:
 *     summary: Get ECX Portal statistics
 *     tags: [Statistics]
 */
router.get('/ecx-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await dualSourceService.getECXPortalStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching ECX portal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/ecta-portal:
 *   get:
 *     summary: Get ECTA Portal statistics
 *     tags: [Statistics]
 */
router.get('/ecta-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await dualSourceService.getECTAPortalStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching ECTA portal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/shipping-portal:
 *   get:
 *     summary: Get Shipping Portal statistics
 *     tags: [Statistics]
 */
router.get('/shipping-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await dualSourceService.getShippingPortalStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching shipping portal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/contracts:
 *   get:
 *     summary: Get Contracts from BOTH sources
 *     tags: [Statistics]
 */
router.get('/contracts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getContracts();
    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contracts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/shipments:
 *   get:
 *     summary: Get Shipments from BOTH sources
 *     tags: [Statistics]
 */
router.get('/shipments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getShipments();
    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/forex:
 *   get:
 *     summary: Get Forex Allocations from BOTH sources
 *     tags: [Statistics]
 */
router.get('/forex', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getForexAllocations();
    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching forex:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forex allocations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/customs:
 *   get:
 *     summary: Get Customs Declarations from BOTH sources
 *     tags: [Statistics]
 */
router.get('/customs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getCustomsDeclarations();
    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching customs declarations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customs declarations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/ecx-lots:
 *   get:
 *     summary: Get ECX Lots from BOTH sources
 *     tags: [Statistics]
 */
router.get('/ecx-lots', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getECXLots();
    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching ECX lots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ECX lots',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/stats/exporters:
 *   get:
 *     summary: Get Exporters from BOTH sources
 *     tags: [Statistics]
 */
router.get('/exporters', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dualSourceService.getExporters();
    res.json({
      success: true,
      data: result.mergedData,
      meta: {
        couchdbCount: result.couchdbCount,
        postgresCount: result.postgresCount,
        totalCount: result.totalCount,
        source: result.source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[STATS] Error fetching exporters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exporters',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

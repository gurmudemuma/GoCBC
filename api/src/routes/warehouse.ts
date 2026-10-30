// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Warehouse Management Routes - ECX warehouse inventory and receipts

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const dbService = DatabaseService.getInstance();

/**
 * GET /api/v1/warehouse/inventory
 * Get warehouse inventory status
 */
router.get('/inventory', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[WAREHOUSE] Fetching warehouse inventory...');

    // Get contracts with quality inspection completed
    const inventory = await dbService.all(`
      SELECT 
        c.contract_id,
        c.exporter_id,
        c.buyer_id,
        c.quantity,
        c.coffee_type,
        c.status as contract_status,
        qi.inspection_id,
        qi.status as inspection_status,
        qi.inspection_date,
        COALESCE(c.quantity, 0) as available_quantity,
        'ADDIS_ABABA' as warehouse_location,
        CASE 
          WHEN qi.status = 'APPROVED' THEN 'AVAILABLE'
          WHEN qi.status = 'IN_PROGRESS' THEN 'PENDING_QC'
          ELSE 'UNAVAILABLE'
        END as inventory_status
      FROM contracts c
      LEFT JOIN quality_inspections qi ON c.contract_id = qi.contract_id
      WHERE c.status IN ('APPROVED', 'QUALITY_CHECKED')
      ORDER BY c.created_at DESC
    `);

    const normalizedInventory = inventory.map((item: any) => ({
      inventoryId: `INV-${item.contract_id}`,
      contractId: item.contract_id,
      exporterId: item.exporter_id,
      buyerId: item.buyer_id,
      coffeeType: item.coffee_type,
      coffeeGrade: 'GRADE_1',
      quantity: item.quantity || 0,
      availableQuantity: item.available_quantity || 0,
      warehouseLocation: item.warehouse_location,
      inventoryStatus: item.inventory_status,
      inspectionId: item.inspection_id,
      inspectionStage: 'COMPLETE',
      inspectionStatus: item.inspection_status,
      inspectionDate: item.inspection_date,
      lastUpdated: new Date().toISOString()
    }));

    logger.info(`[WAREHOUSE] ✅ Retrieved ${normalizedInventory.length} inventory items`);

    res.json({
      success: true,
      data: normalizedInventory,
      count: normalizedInventory.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[WAREHOUSE] Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch warehouse inventory'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/warehouse/receipts
 * Get warehouse receipts
 */
router.get('/receipts', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[WAREHOUSE] Fetching warehouse receipts...');

    // Get quality inspections as warehouse receipts
    const receipts = await dbService.all(`
      SELECT 
        qi.inspection_id,
        qi.contract_id,
        qi.status,
        qi.quantity,
        qi.coffee_type,
        qi.inspection_date,
        qi.created_at,
        c.exporter_id,
        c.buyer_id
      FROM quality_inspections qi
      JOIN contracts c ON qi.contract_id = c.contract_id
      WHERE qi.status = 'APPROVED'
      ORDER BY qi.created_at DESC
    `);

    const normalizedReceipts = receipts.map((receipt: any) => ({
      receiptId: `WR-${receipt.inspection_id}`,
      inspectionId: receipt.inspection_id,
      contractId: receipt.contract_id,
      exporterId: receipt.exporter_id,
      buyerId: receipt.buyer_id,
      coffeeType: receipt.coffee_type,
      grade: 'GRADE_1',
      quantity: receipt.quantity || 0,
      warehouseLocation: 'ADDIS_ABABA',
      receiptStatus: 'ISSUED',
      inspector: receipt.inspector,
      inspectionDate: receipt.inspection_date,
      issuedDate: receipt.created_at,
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days validity
      lastUpdated: new Date().toISOString()
    }));

    logger.info(`[WAREHOUSE] ✅ Retrieved ${normalizedReceipts.length} warehouse receipts`);

    res.json({
      success: true,
      data: normalizedReceipts,
      count: normalizedReceipts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[WAREHOUSE] Error fetching receipts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch warehouse receipts'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

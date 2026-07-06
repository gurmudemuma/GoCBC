import express from 'express';
import FabricService from '../services/fabricService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const fabricService = FabricService.getInstance();

// ==================== CUSTOMS DECLARATION ROUTES ====================

// Submit customs declaration
router.post('/declaration/submit', async (req, res) => {
  try {
    const { 
      declarationID,
      shipmentID,
      exporterID,
      declarationType,
      hsCode,
      quantity,
      value,
      currency,
      destination,
      portOfExit,
      eudrCompliant,
      additionalNotes
    } = req.body;
    
    logger.info(`[CUSTOMS] Submitting customs declaration: ${declarationID}`);
    
    // Connect as ECTA organization (Customs peer having connectivity issues)
    await fabricService.connectAsOrg('ECTAMSP');
    
    // AUTO-MAPPING: Fetch shipment data to auto-populate fields
    let autoMappedData: any = {};
    try {
      const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
      if (shipmentResult.success && shipmentResult.data) {
        const shipment = shipmentResult.data;
        autoMappedData.quantity = shipment.Quantity || shipment.quantity || '0';
        autoMappedData.exporterID = shipment.ExporterID || shipment.exporterID || exporterID;
        autoMappedData.eudrCompliant = shipment.EUDRCompliant || shipment.eudrCompliant || false;
        autoMappedData.valueUSD = shipment.ValueUSD || shipment.valueUSD || '0';
        logger.info(`[CUSTOMS] Auto-mapped from shipment: quantity=${autoMappedData.quantity}, eudrCompliant=${autoMappedData.eudrCompliant}`);
      }
    } catch (error) {
      logger.warn('[CUSTOMS] Could not fetch shipment for auto-mapping:', error);
    }

    // AUTO-MAPPING: Fetch contract data for destination and currency
    try {
      const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
      if (shipmentResult.success && shipmentResult.data) {
        const contractID = shipmentResult.data.ContractID || shipmentResult.data.contractID;
        if (contractID) {
          const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID]);
          if (contractResult.success && contractResult.data) {
            const contract = contractResult.data;
            autoMappedData.destination = contract.BuyerCountry || contract.buyerCountry || '';
            autoMappedData.currency = contract.Currency || contract.currency || 'USD';
            autoMappedData.incoterm = contract.Incoterm || contract.incoterm || '';
            logger.info(`[CUSTOMS] Auto-mapped from contract: destination=${autoMappedData.destination}, currency=${autoMappedData.currency}`);
          }
        }
      }
    } catch (error) {
      logger.warn('[CUSTOMS] Could not fetch contract for auto-mapping:', error);
    }

    // Use provided values or auto-mapped values with smart defaults
    const finalQuantity = quantity || autoMappedData.quantity || '0';
    const finalValue = value || autoMappedData.valueUSD || '0';
    const finalCurrency = currency || autoMappedData.currency || 'USD';
    const finalDestination = destination || autoMappedData.destination || '';
    const finalExporterID = exporterID || autoMappedData.exporterID || '';
    const finalEudrCompliant = eudrCompliant !== undefined ? eudrCompliant : (autoMappedData.eudrCompliant || false);
    
    const result = await fabricService.submitCustomsDeclaration(
      declarationID,
      shipmentID,
      finalExporterID,
      declarationType || 'STANDARD',
      hsCode || '090111', // Coffee, not roasted, not decaffeinated
      finalQuantity.toString(),
      finalValue.toString(),
      finalCurrency,
      finalDestination,
      portOfExit || 'Djibouti Port',
      finalEudrCompliant ? 'true' : 'false'
    );
    
    if (result.success) {
      logger.info(`✅ [CUSTOMS] Declaration ${declarationID} submitted successfully with auto-mapped data`);
      
      // Update shipment status to CUSTOMS_DECLARED
      try {
        await fabricService.updateShipmentStatus(shipmentID, 'CUSTOMS_DECLARED');
        logger.info(`✅ [CUSTOMS] Shipment ${shipmentID} status updated to CUSTOMS_DECLARED`);
      } catch (statusError) {
        logger.warn(`Could not update shipment status: ${statusError}`);
      }
      
      res.json({ 
        success: true, 
        message: 'Customs declaration submitted successfully', 
        data: result.data,
        autoMapped: {
          quantity: finalQuantity,
          value: finalValue,
          currency: finalCurrency,
          destination: finalDestination,
          exporterID: finalExporterID,
          eudrCompliant: finalEudrCompliant,
        },
        txId: result.txId
      });
    } else {
      logger.error(`❌ [CUSTOMS] Failed to submit declaration: ${result.error}`);
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error submitting declaration:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Review declaration (schedule inspection)
router.post('/declaration/:declarationId/review', async (req, res) => {
  try {
    const { declarationId } = req.params;
    const { inspectorNotes, inspectionType, scheduledDate } = req.body;
    
    logger.info(`[CUSTOMS] Reviewing declaration: ${declarationId}`);
    
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.reviewCustomsDeclaration(
      declarationId,
      'Officer Alemayehu T.',
      inspectionType || 'STANDARD',
      inspectorNotes || 'Physical inspection scheduled'
    );
    
    if (result.success) {
      logger.info(`✅ [CUSTOMS] Declaration ${declarationId} under review`);
      res.json({ 
        success: true, 
        message: 'Inspection scheduled successfully', 
        status: 'UNDER_INSPECTION',
        data: result.data,
        txId: result.txId
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error reviewing declaration:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Complete physical inspection
router.post('/declaration/:declarationId/complete-inspection', async (req, res) => {
  try {
    const { declarationId } = req.params;
    const { inspectionResult, inspectorComments, completedDate } = req.body;
    
    logger.info(`[CUSTOMS] Completing inspection for: ${declarationId}`);
    
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.completeCustomsInspection(
      declarationId,
      inspectionResult || 'PASSED',
      inspectorComments || 'All requirements met'
    );
    
    if (result.success) {
      logger.info(`✅ [CUSTOMS] Inspection completed for ${declarationId}`);
      res.json({ 
        success: true, 
        message: 'Inspection completed successfully', 
        status: 'UNDER_REVIEW',
        data: result.data,
        txId: result.txId
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error completing inspection:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Clear declaration
router.post('/declaration/:declarationId/clear', async (req, res) => {
  try {
    const { declarationId } = req.params;
    const { clearanceNumber, dutiesAmount } = req.body;
    
    logger.info(`[CUSTOMS] Clearing declaration: ${declarationId}`);
    
    await fabricService.connectAsOrg('CustomsMSP');
    
    const clearanceNum = clearanceNumber || `CLR-${Date.now()}`;
    const duties = dutiesAmount || '0';
    
    const result = await fabricService.clearCustomsDeclaration(
      declarationId,
      'Officer Alemayehu T.',
      clearanceNum,
      duties
    );
    
    if (result.success) {
      logger.info(`✅ [CUSTOMS] Declaration ${declarationId} cleared`);
      
      // Extract shipmentID from declarationID (format: CD-SHIPMENTID)
      const shipmentID = declarationId.replace('CD-', '');
      
      // Update shipment status to CUSTOMS_CLEARED
      try {
        await fabricService.updateShipmentStatus(shipmentID, 'CUSTOMS_CLEARED');
        logger.info(`✅ [CUSTOMS] Shipment ${shipmentID} status updated to CUSTOMS_CLEARED`);
      } catch (statusError) {
        logger.warn(`Could not update shipment status: ${statusError}`);
      }
      
      res.json({ 
        success: true, 
        message: 'Declaration cleared successfully', 
        clearanceNumber: clearanceNum,
        data: result.data,
        txId: result.txId
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error clearing declaration:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Reject declaration
router.post('/declaration/:declarationId/reject', async (req, res) => {
  try {
    const { declarationId } = req.params;
    const { reason, rejectedBy } = req.body;
    
    logger.info(`[CUSTOMS] Rejecting declaration: ${declarationId}`);
    
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.rejectCustomsDeclaration(
      declarationId,
      rejectedBy || 'Officer Alemayehu T.',
      reason || 'Documentation incomplete'
    );
    
    if (result.success) {
      logger.info(`✅ [CUSTOMS] Declaration ${declarationId} rejected`);
      res.json({ 
        success: true, 
        message: 'Declaration rejected', 
        data: result.data,
        txId: result.txId
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error rejecting declaration:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get declaration details
router.get('/declaration/:declarationId', async (req, res) => {
  try {
    const { declarationId } = req.params;
    
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.getCustomsDeclaration(declarationId);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error reading declaration:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Query declarations by exporter
router.get('/declaration/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.getCustomsDeclarationsByExporter(exporterId);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error querying declarations by exporter:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Query declarations by status
router.get('/declaration/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.getCustomsDeclarationsByStatus(status);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error querying declarations by status:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Query all customs declarations
router.get('/declarations', authMiddleware, async (req, res) => {
  try {
    logger.info('[CUSTOMS] Querying all declarations from blockchain...');
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.queryChaincode('QueryAllCustomsDeclarations', []);
    
    logger.info(`[CUSTOMS] Query result: success=${result.success}, dataLength=${result.data ? result.data.length : 0}`);
    
    if (result.success) {
      const declarations = result.data || [];
      logger.info(`[CUSTOMS] Returning ${declarations.length} declarations`);
      res.json({ success: true, data: declarations });
    } else {
      logger.error(`[CUSTOMS] Query failed:`, result.error);
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error querying all declarations:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;

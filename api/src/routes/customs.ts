import express from 'express';
import FabricService from '../services/fabricService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import DatabaseService from '../services/databaseService';
import RiskService from '../services/riskService';
import { dedupeById, isValidDeclaration } from '../utils/dataFilters';
import { statusManager } from '../utils/statusManager';

const router = express.Router();
const fabricService = FabricService.getInstance();

// ✅ FIX: Field normalization helpers for consistent API responses
function normalizeShipment(shipment: any) {
  return {
    shipmentId: shipment.shipmentId || shipment.ShipmentID || shipment.shipmentID || '',
    contractId: shipment.contractId || shipment.ContractID || shipment.contractID || '',
    exporterId: shipment.exporterId || shipment.ExporterID || shipment.exporterID || '',
    quantity: shipment.quantity || shipment.Quantity || 0,
    valueUSD: shipment.valueUSD || shipment.ValueUSD || shipment.value || 0,
    eudrCompliant: shipment.eudrCompliant || shipment.EUDRCompliant || false,
    status: shipment.status || shipment.Status || '',
    origin: shipment.origin || shipment.Origin || '',
    destination: shipment.destination || shipment.Destination || '',
  };
}

function normalizeDeclaration(declaration: any) {
  return {
    declarationId: declaration.declarationId || declaration.DeclarationID || '',
    shipmentId: declaration.shipmentId || declaration.ShipmentID || declaration.shipmentID || '',
    exporterId: declaration.exporterId || declaration.ExporterID || declaration.exporterID || '',
    hsCode: declaration.hsCode || declaration.HSCode || declaration.hs_code || '',
    quantity: Number(declaration.quantity ?? declaration.Quantity ?? 0),
    value: Number(declaration.value ?? declaration.Value ?? 0),
    currency: declaration.currency || declaration.Currency || 'USD',
    destination: declaration.destination || declaration.Destination || '',
    portOfExit: declaration.portOfExit || declaration.PortOfExit || '',
    eudrCompliant: declaration.eudrCompliant ?? declaration.EUDRCompliant ?? false,
    status: declaration.status || declaration.Status || '',
    declarationType: declaration.declarationType || declaration.DeclarationType || 'STANDARD',
    customsOfficer: declaration.customsOfficer || declaration.CustomsOfficer || '',
    clearanceNumber: declaration.clearanceNumber || declaration.ClearanceNumber || '',
    createdAt: declaration.createdAt || declaration.created_at || null,
    updatedAt: declaration.updatedAt || declaration.updated_at || null,
  };
}

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
    
    const declarationResult = await fabricService.getCustomsDeclaration(declarationId);
    const currentStatus = declarationResult.success ? (declarationResult.data?.status || declarationResult.data?.Status || '') : '';
    if (!declarationResult.success) {
      return res.status(404).json({ success: false, error: declarationResult.error });
    }
    
    // Validate status transition
    const isValid = statusManager.validateTransition('CUSTOMS', currentStatus, 'CLEARED');
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: `Declaration cannot be cleared: Invalid status transition from ${currentStatus} to CLEARED`,
          currentStatus,
          allowedStatuses: statusManager.getNextStatuses('CUSTOMS', currentStatus),
        }
      });
    }

    // ✅ DOCUMENT VERIFICATION: Check required export documents before clearance
    try {
      const { DatabaseService } = await import('../services/databaseService');
      const shipmentID = declarationId.replace('CD-', '');
      
      const db = DatabaseService.getInstance();
      const documents = await db.all(
        `SELECT document_type, verification_status FROM documents 
         WHERE (entity_type = 'customs' AND entity_id = ?) 
         OR (entity_type = 'shipment' AND entity_id = ?)
         AND status = 'active'`,
        [declarationId, shipmentID]
      );
      
      // Required documents for customs clearance
      const requiredDocs = ['EXPORT_PERMIT', 'PHYTOSANITARY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN'];
      const docTypes = documents.map((d: any) => d.document_type);
      const missing = requiredDocs.filter(type => !docTypes.includes(type));
      
      if (missing.length > 0) {
        logger.warn(`Customs clearance ${declarationId} blocked: Missing ${missing.length} required documents`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_EXPORT_DOCUMENTS',
            message: 'Cannot clear customs: Required export documents are missing',
            missing: missing,
            hint: 'Upload all required export documents before customs clearance'
          }
        });
      }
      
      // Check if all required documents are verified
      const unverifiedRequired = documents.filter((d: any) => 
        requiredDocs.includes(d.document_type) && d.verification_status !== 'verified'
      );
      
      if (unverifiedRequired.length > 0) {
        logger.warn(`Customs clearance ${declarationId} blocked: ${unverifiedRequired.length} unverified documents`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNVERIFIED_EXPORT_DOCUMENTS',
            message: 'Cannot clear customs: All export documents must be verified',
            unverified: unverifiedRequired.map((d: any) => d.document_type)
          }
        });
      }
      
      logger.info(`✅ Customs ${declarationId}: All required export documents verified`);
    } catch (docCheckError) {
      logger.warn(`Non-fatal: Document check failed for customs ${declarationId}:`, docCheckError);
      // Continue with clearance - document check is best-effort
    }

    const clearanceNum = clearanceNumber || `CLR-${Date.now()}`;
    const duties = dutiesAmount || '0';
    
    const result = await fabricService.clearCustomsDeclaration(
      declarationId,
      'Officer Alemayehu T.',
      clearanceNum,
      duties
    );
    
    if (result.success) {
      // Extract shipmentID from declarationID (format: CD-SHIPMENTID)
      const shipmentID = declarationId.replace('CD-', '');
      
      // Update status with cascading effects to shipment
      await statusManager.updateEntityStatus('CUSTOMS', declarationId, currentStatus, 'CLEARED');
      if (shipmentID) {
        await statusManager.updateEntityStatus('SHIPMENT', shipmentID, 'CUSTOMS_DECLARED', 'CUSTOMS_CLEARED');
      }
      
      logger.info(`✅ [CUSTOMS] Declaration ${declarationId} cleared (${currentStatus} → CLEARED)`);
      
      // ✅ AUTO-TRIGGER: Initiate next workflow steps
      const nextSteps: Array<{action: string, description: string, priority: string}> = [];
      
      // 1. Check if shipment needs freight booking
      try {
        const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
        if (shipmentResult.success && shipmentResult.data) {
          const shipment = shipmentResult.data;
          const contractID = shipment.ContractID || shipment.contractID;
          
          // Get contract to determine payment method
          if (contractID) {
            const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID]);
            if (contractResult.success && contractResult.data) {
              const contract = contractResult.data;
              const paymentMethod = contract.PaymentMethod || contract.paymentMethod;
              
              // Determine next steps based on payment method
              if (paymentMethod === 'LC' || paymentMethod === 'DOCUMENTARY_COLLECTION') {
                nextSteps.push({
                  action: 'PREPARE_SHIPPING_DOCUMENTS',
                  description: 'Prepare documents for bank submission (Bill of Lading, Invoice, Packing List)',
                  priority: 'HIGH'
                });
              }
              
              nextSteps.push({
                action: 'BOOK_FREIGHT',
                description: `Book ${contract.Incoterm || contract.incoterm || 'FOB'} freight for shipment`,
                priority: 'HIGH'
              });
              
              logger.info(`[CUSTOMS] Next steps for ${shipmentID}: ${JSON.stringify(nextSteps)}`);
            }
          }
        }
      } catch (nextStepError) {
        logger.warn(`[CUSTOMS] Could not determine next steps: ${nextStepError}`);
      }
      
      res.json({ 
        success: true, 
        message: 'Declaration cleared successfully', 
        clearanceNumber: clearanceNum,
        shipmentID: shipmentID,
        nextSteps: nextSteps.length > 0 ? nextSteps : undefined,
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

// Get customs workflow definition for UI consumption
router.get('/workflow', authMiddleware, async (_req, res) => {
  try {
    const workflowSteps = [
      {
        step: 1,
        title: 'Export declaration',
        description: 'The exporter or licensed customs clearing agent submits an electronic declaration including HS code, quantity, destination, value, exporter identity, and supporting export documentation.',
      },
      {
        step: 2,
        title: 'Supporting documents',
        description: 'Customs verifies documents such as commercial invoice, packing list, coffee quality certificate, phytosanitary certificate, certificate of origin (when required), export permit, banking documents, and transport information.',
      },
      {
        step: 3,
        title: 'Risk management',
        description: 'Customs determines whether documents are sufficient, whether a physical inspection is required, or whether additional verification is needed.',
      },
      {
        step: 4,
        title: 'Physical inspection (if selected)',
        description: 'When required, officers verify container number, seal integrity, bag count, product match, weight, packaging, and cargo condition.',
      },
      {
        step: 5,
        title: 'Customs release',
        description: 'If everything matches, Customs authorizes export and the shipment is allowed to proceed toward Djibouti for transport.',
      },
    ];
    res.json({ success: true, data: workflowSteps });
  } catch (error: any) {
    logger.error('[CUSTOMS] Error fetching workflow:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to load customs workflow' } });
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
      let declarations = result.data || [];
      
      // Normalize customs declarations for table display
      const normalizedDeclarations = declarations.map((d: any) => ({
        declarationId: d?.declarationId || d?.DeclarationID || d?.id || '',
        shipmentId: d?.shipmentId || d?.ShipmentID || d?.shipmentID || '',
        exporterId: d?.exporterId || d?.ExporterID || d?.exporterID || '',
        declarationType: d?.declarationType || d?.DeclarationType || 'STANDARD',
        hsCode: d?.hsCode || d?.HSCode || d?.hs_code || '',
        quantity: Number(d?.quantity ?? d?.Quantity ?? 0),
        value: Number(d?.value ?? d?.Value ?? 0),
        currency: d?.currency || d?.Currency || 'USD',
        destination: d?.destination || d?.Destination || '',
        portOfExit: d?.portOfExit || d?.PortOfExit || '',
        eudrCompliant: d?.eudrCompliant ?? d?.EUDRCompliant ?? false,
        status: d?.status || d?.Status || 'SUBMITTED',
        customsOfficer: d?.customsOfficer || d?.CustomsOfficer || '',
        clearanceNumber: d?.clearanceNumber || d?.ClearanceNumber || '',
        createdAt: d?.createdAt || d?.created_at || null,
        updatedAt: d?.updatedAt || d?.updated_at || null,
        notes: d?.additionalNotes || d?.notes || '',
      }));

      const validDeclarations = dedupeById(normalizedDeclarations.filter((d: any) => {
        const isValid = isValidDeclaration(d);
        if (!isValid && normalizedDeclarations.length <= 5) {
          // Log first few invalid declarations for debugging
          logger.warn(`[CUSTOMS] Invalid declaration: ${JSON.stringify({
            declarationId: d.declarationId,
            shipmentId: d.shipmentId,
            hsCode: d.hsCode,
            quantity: d.quantity,
            quantityType: typeof d.quantity,
            value: d.value,
            valueType: typeof d.value
          })}`);
        }
        return isValid;
      }), (declaration: any) => declaration.declarationId);
      logger.info(`[CUSTOMS] Filtered ${declarations.length} to ${validDeclarations.length} valid declarations`);
      res.json({ success: true, data: validDeclarations });
    } else {
      logger.error(`[CUSTOMS] Query failed:`, result.error);
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error querying all declarations:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Migration endpoint - Fix null riskFactors in existing declarations
router.post('/migrate', authMiddleware, async (req, res) => {
  try {
    logger.info('[CUSTOMS] Running migration to fix null riskFactors...');
    await fabricService.connectAsOrg('CustomsMSP');
    
    const result = await fabricService.invokeChaincode('MigrateCustomsDeclarations', []);
    
    if (result.success) {
      logger.info(`✅ [CUSTOMS] Migration complete: ${result.data}`);
      res.json({ 
        success: true, 
        message: 'Migration completed successfully',
        data: result.data,
        txId: result.txId
      });
    } else {
      logger.error(`❌ [CUSTOMS] Migration failed:`, result.error);
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error running migration:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Permit-ready summary: shipments with approved inspections and issued permits
router.get('/permit-ready', authMiddleware, async (req, res) => {
  try {
    // Prefer quality inspections endpoint on-chain
    const inspectionsResult = await fabricService.getAllInspections();
    if (!inspectionsResult.success) {
      return res.status(500).json({ success: false, error: inspectionsResult.error });
    }

    const inspections = inspectionsResult.data || [];
    
    // Get all existing declarations to filter out shipments that already have declarations
    const declarationsResult = await fabricService.queryChaincode('QueryAllCustomsDeclarations', []);
    const existingDeclarations = declarationsResult.success && declarationsResult.data ? declarationsResult.data : [];
    const shipmentIdsWithDeclarations = new Set(
      existingDeclarations.map((d: any) => d.ShipmentID || d.shipmentId || d.shipmentID || '')
    );
    
    logger.info(`[CUSTOMS] Found ${existingDeclarations.length} existing declarations, ${shipmentIdsWithDeclarations.size} unique shipments`);
    
    const ready = inspections
      .filter((insp: any) => {
        const status = insp.status || insp.Status || '';
        const permit = insp.exportPermitNo || insp.ExportPermitNo || insp.exportPermit || '';
        const shipmentId = insp.shipmentId || insp.ShipmentID || insp.ShipmentId || '';
        
        // Check if approved with permit AND no declaration exists yet
        const hasPermit = (status === 'APPROVED' || status === 'QUALITY_APPROVED') && permit && permit.trim() !== '';
        const noDeclaration = !shipmentIdsWithDeclarations.has(shipmentId);
        
        if (hasPermit && !noDeclaration) {
          logger.debug(`[CUSTOMS] Filtering out shipment ${shipmentId} - declaration already exists`);
        }
        
        return hasPermit && noDeclaration;
      })
      .map((insp: any) => ({
        inspectionId: insp.inspectionId || insp.InspectionID || insp.InspectionId || '',
        shipmentId: insp.shipmentId || insp.ShipmentID || insp.ShipmentId || '',
        exporterId: insp.exporterId || insp.ExporterID || insp.ExporterId || '',
        qualityGrade: insp.qualityGrade || insp.QualityGrade || insp.quality || '',
        totalScore: insp.totalScore != null ? Number(insp.totalScore) : undefined,
        classification: insp.classification || insp.Classification || '',
        certificateNo: insp.certificateNo || insp.CertificateNo || insp.certificate || '',
        exportPermitNo: insp.exportPermitNo || insp.ExportPermitNo || insp.exportPermit || '',
        status: insp.status || insp.Status || '',
      }));

    logger.info(`[CUSTOMS] Permit-ready shipments: ${ready.length} (after filtering out ${inspections.length - ready.length} with existing declarations)`);

    res.json({ success: true, data: ready });
  } catch (error: any) {
    logger.error('[CUSTOMS] Error fetching permit-ready summary:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Start a declaration (create draft locally and record an audit). Does NOT submit on-chain.
router.post('/declaration/:shipmentId/start', authMiddleware, async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const { shipmentId } = req.params;
    const { exporterId, hsCode, quantity, value, currency, destination, portOfExit } = req.body;

    const declarationId = `CD-${shipmentId}`;

    await db.run(
      `INSERT OR IGNORE INTO declarations (declaration_id, shipment_id, exporter_id, status, hs_code, quantity, value, currency, destination, port_of_exit, created_at)
       VALUES (?, ?, ?, 'DECLARATION_STARTED', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [declarationId, shipmentId, exporterId || null, hsCode || null, quantity || null, value || null, currency || null, destination || null, portOfExit || null]
    );

    // Record audit
    await db.run(
      `INSERT INTO declaration_audit (declaration_id, action, performed_by, details, timestamp)
       VALUES (?, 'START_DECLARATION', ?, ?, CURRENT_TIMESTAMP)`,
      [declarationId, (req as any).user?.username || null, JSON.stringify({ shipmentId, exporterId })]
    );

    // Attempt to record lightweight create event on-chain (non-blocking)
    try {
      await fabricService.connectAsOrg((req as any).user?.org || 'CustomsMSP');
      if (fabricService.isConnected()) {
        // Submit a minimal on-chain event if the chaincode exposes SubmitCustomsDeclaration or CreateDeclaration
        const ccResult = await fabricService.invokeChaincode('CreateDeclaration', [declarationId, shipmentId, exporterId || '', 'DECLARATION_STARTED']);
        if (!ccResult.success) {
          // Try SubmitCustomsDeclaration wrapper with minimal payload
          await fabricService.invokeChaincode('SubmitCustomsDeclaration', [declarationId, shipmentId, exporterId || '', 'STANDARD', hsCode || '090111', (quantity||'0').toString(), (value||'0').toString(), currency||'USD', destination||'', portOfExit||'']);
        }
      }
    } catch (chainErr) {
      logger.warn('[CUSTOMS] Non-fatal: on-chain createDeclaration failed:', chainErr);
    }

    logger.info(`[CUSTOMS] Declaration started for shipment ${shipmentId} by ${(req as any).user?.username || 'unknown'}`);
    res.json({ success: true, declarationId, shipmentId });
  } catch (error: any) {
    logger.error('[CUSTOMS] Error starting declaration:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ✅ NEW: Auto-create customs declaration when ECTA export permit is issued
// This endpoint should be called after ECTA issues an export permit
router.post('/declaration/auto-create-from-permit', authMiddleware, async (req, res) => {
  try {
    const { inspectionId, shipmentId, exporterId, exportPermitNo } = req.body;
    
    if (!inspectionId || !shipmentId) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'inspectionId and shipmentId are required' } 
      });
    }

    logger.info(`[CUSTOMS] Auto-creating customs declaration for shipment ${shipmentId} with ECTA permit ${exportPermitNo}`);

    // Connect and fetch inspection details
    await fabricService.connectAsOrg('ECTAMSP');
    const inspectionResult = await fabricService.queryChaincode('ReadInspection', [inspectionId]);
    
    if (!inspectionResult.success || !inspectionResult.data) {
      return res.status(404).json({ 
        success: false, 
        error: { message: `Inspection ${inspectionId} not found` } 
      });
    }

    const inspection = inspectionResult.data;

    // Verify export permit is issued (handle both capitalization styles)
    const inspStatus = inspection.Status || inspection.status;
    const inspPermitNo = inspection.ExportPermitNo || inspection.exportPermitNo;
    
    if (inspStatus !== 'APPROVED' || !inspPermitNo) {
      return res.status(400).json({
        success: false,
        error: { message: `Inspection ${inspectionId} does not have a valid export permit. Status: ${inspStatus}, Permit: ${inspPermitNo}` }
      });
    }

    // Fetch shipment details for auto-mapping
    const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
    let shipmentData: any = {};
    if (shipmentResult.success && shipmentResult.data) {
      shipmentData = shipmentResult.data;
    }

    // Fetch contract details if available
    let contractData: any = {};
    if (shipmentData.ContractID || shipmentData.contractID) {
      const contractId = shipmentData.ContractID || shipmentData.contractID;
      const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
      if (contractResult.success && contractResult.data) {
        contractData = contractResult.data;
      }
    }

    // Auto-map declaration data from inspection, shipment, and contract
    const declarationId = `CD-${shipmentId}`;
    const quantity = shipmentData.Quantity || shipmentData.quantity || inspection.SampleSize || '0';
    const value = shipmentData.ValueUSD || shipmentData.valueUSD || '0';
    const currency = contractData.Currency || contractData.currency || 'USD';
    const destination = contractData.BuyerCountry || contractData.buyerCountry || '';
    const portOfExit = 'Djibouti Port'; // Default
    const hsCode = '090111'; // Coffee, not roasted, not decaffeinated
    const eudrCompliant = shipmentData.EUDRCompliant || shipmentData.eudrCompliant || false;

    // Check if declaration already exists
    const existingDecl = await fabricService.queryChaincode('GetCustomsDeclaration', [declarationId]);
    if (existingDecl.success && existingDecl.data) {
      logger.warn(`[CUSTOMS] Declaration ${declarationId} already exists, skipping auto-creation`);
      return res.json({
        success: true,
        message: 'Declaration already exists',
        declarationId,
        existingDeclaration: true
      });
    }

    // Submit customs declaration on blockchain
    await fabricService.connectAsOrg('CustomsMSP');
    const result = await fabricService.submitCustomsDeclaration(
      declarationId,
      shipmentId,
      exporterId || inspection.ExporterID || inspection.exporterId,
      'STANDARD',
      hsCode,
      quantity.toString(),
      value.toString(),
      currency,
      destination,
      portOfExit,
      eudrCompliant ? 'true' : 'false'
    );

    if (result.success) {
      logger.info(`✅ [CUSTOMS] Auto-created declaration ${declarationId} from ECTA permit ${exportPermitNo}`);
      
      // Update shipment status to CUSTOMS_DECLARED
      try {
        await fabricService.updateShipmentStatus(shipmentId, 'CUSTOMS_DECLARED');
        logger.info(`✅ [CUSTOMS] Shipment ${shipmentId} status updated to CUSTOMS_DECLARED`);
      } catch (statusError) {
        logger.warn(`Could not update shipment status: ${statusError}`);
      }

      res.json({
        success: true,
        message: 'Customs declaration auto-created from ECTA export permit',
        declarationId,
        shipmentId,
        exportPermitNo: inspection.ExportPermitNo || inspection.exportPermitNo,
        autoMapped: {
          quantity,
          value,
          currency,
          destination,
          exporterId: exporterId || inspection.ExporterID || inspection.exporterId,
          eudrCompliant,
          hsCode,
          portOfExit
        },
        txId: result.txId
      });
    } else {
      // Check if error is "already exists" - this is OK, return existing declaration
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error || '');
      if (errorMsg.includes('already exists')) {
        logger.info(`⚠️ [CUSTOMS] Declaration ${declarationId} already exists - returning existing`);
        return res.json({
          success: true,
          message: 'Customs declaration already exists',
          declarationId,
          shipmentId,
          existingDeclaration: true,
          autoMapped: {
            quantity,
            value,
            currency,
            destination,
            exporterId: exporterId || inspection.ExporterID || inspection.exporterId,
            eudrCompliant,
            hsCode,
            portOfExit
          }
        });
      }
      
      logger.error(`❌ [CUSTOMS] Failed to auto-create declaration: ${result.error}`);
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    logger.error(`[CUSTOMS] Error auto-creating declaration from permit:`, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// New route: Risk assessment for a declaration (compute and persist)
router.post('/declaration/:declarationId/risk-assess', authMiddleware, async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const { declarationId } = req.params;
    // Accept either a full inspection/permit object or specific fields
    const { shipmentId, totalValue, value, hsCode, exportPermitNo, certificateNo, assessedBy } = req.body;

    // Use configured rules from RiskService
    const rules = RiskService.getRules();
    const computeRisk = (payload: any) => {
      const valueNumber = Number(payload.totalValue || payload.value || 0) || 0;
      const hs = (payload.hsCode || payload.hs || '').toString();
      let risk: 'LOW' | 'MEDIUM' | 'HIGH' = (rules.defaultRiskLevel || 'LOW') as any;
      let reason = '';

      const highValueThreshold = Number(rules.highValueThreshold || 50000);
      const hasPermitOrCertificate = Boolean(payload.exportPermitNo || payload.certificateNo);
      if (valueNumber >= highValueThreshold) {
        if (hasPermitOrCertificate) {
          risk = 'MEDIUM';
          reason = `High declared value (${valueNumber}) with export permit/certificate present`;
        } else {
          risk = 'HIGH';
          reason = `High declared value (${valueNumber})`;
        }
      }

      if (!hasPermitOrCertificate) {
        risk = 'HIGH';
        reason = reason ? reason + ' & missing permit/certificate' : 'Missing export permit/certificate';
      }

      if (!reason && hs) {
        const prefixes = rules.hsPrefixesMedium || ['07','08','09'];
        for (const p of prefixes) {
          if (hs.startsWith(p)) {
            risk = 'MEDIUM';
            reason = 'HS code flagged for documentary/physical checks';
            break;
          }
        }
      }

      if (!reason) reason = 'Standard checks passed';
      return { risk, reason };
    };

    const assessment = computeRisk({ totalValue, value, hsCode, exportPermitNo, certificateNo });

    // Compute rule hash/version to record with assessment
    const ruleHash = require('crypto').createHash('sha256').update(JSON.stringify(rules)).digest('hex');

    await db.run(
      `INSERT INTO declaration_risk (declaration_id, shipment_id, risk_level, reason, assessed_by, assessed_at, rule_hash)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [declarationId, shipmentId || null, assessment.risk, assessment.reason, assessedBy || null, ruleHash]
    );

    logger.info(`[CUSTOMS] Risk assessment saved for ${declarationId}: ${assessment.risk}`);

    res.json({ success: true, declarationId, risk: assessment.risk, reason: assessment.reason });
  } catch (error: any) {
    logger.error('[CUSTOMS] Error computing/persisting risk:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Override risk decision and record user choice (proceed despite risk)
router.post('/declaration/:declarationId/override-risk', authMiddleware, async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const { declarationId } = req.params;
    const { shipmentId, riskLevel, overrideReason, overriddenBy } = req.body;

    if (!riskLevel || !['LOW','MEDIUM','HIGH'].includes(riskLevel)) {
      return res.status(400).json({ success: false, error: 'Invalid riskLevel' });
    }

    const reason = overrideReason || 'User override: proceed despite risk';

    await db.run(
      `INSERT INTO declaration_risk (declaration_id, shipment_id, risk_level, reason, assessed_by, assessed_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [declarationId, shipmentId || null, riskLevel, reason, overriddenBy || null]
    );

    logger.info(`[CUSTOMS] Risk override recorded for ${declarationId} by ${overriddenBy || 'unknown'}`);
    res.json({ success: true, declarationId, riskLevel, reason });
  } catch (error: any) {
    logger.error('[CUSTOMS] Error recording risk override:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Expose current risk rules (GET) and allow updating them (PUT) - restricted via authMiddleware
router.get('/risk-rules', authMiddleware, async (_req, res) => {
  try {
    const rules = RiskService.getRules();
    res.json({ success: true, data: rules });
  } catch (error: any) {
    logger.error('[CUSTOMS] Error fetching risk rules:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/risk-rules', authMiddleware, async (req, res) => {
  try {
    const updates = req.body || {};
    RiskService.setRules(updates);
    res.json({ success: true, data: RiskService.getRules() });
  } catch (error: any) {
    logger.error('[CUSTOMS] Error updating risk rules:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;

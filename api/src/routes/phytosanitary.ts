// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Phytosanitary Certificate API Routes

import { Router } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

const router = Router();
const fabricService = FabricService.getInstance();

// ==================== PHYTOSANITARY CERTIFICATE ROUTES ====================

/**
 * @route POST /api/v1/phytosanitary/issue
 * @desc Issue phytosanitary certificate (Ministry of Agriculture/EAA)
 * @access Ministry of Agriculture role
 */
router.post('/issue', async (req, res) => {
  try {
    const {
      certificateID,
      shipmentID,
      exporterID,
      inspectorName,
      botanicalName,
      treatmentApplied,
      placeOfOrigin,
      pointOfEntry,
      quantity,
      packagingType,
      numberOfPackages,
      distinguishMarks,
      meansOfConveyance,
      issuedBy,
    } = req.body;

    // Validation
    if (!certificateID || !shipmentID || !exporterID) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: certificateID, shipmentID, exporterID' }
      });
    }

    logger.info(`[PHYTOSANITARY] Issuing certificate: ${certificateID} for shipment ${shipmentID}`);

    // Connect to fabric with Ministry of Agriculture MSP (or ECTA for now)
    await fabricService.connect('ECTAMSP'); // Ministry could be separate MSP

    // AUTO-MAPPING: Fetch shipment data to auto-populate fields
    let autoMappedData: any = {};
    try {
      const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
      if (shipmentResult.success && shipmentResult.data) {
        const shipment = shipmentResult.data;
        autoMappedData.quantity = shipment.Quantity || shipment.quantity || '0';
        autoMappedData.placeOfOrigin = shipment.Origin || shipment.origin || '';
        autoMappedData.distinguishMarks = `LOT-${shipment.ECXLotNumber || shipment.ecxLotNumber || 'UNKNOWN'}`;
        autoMappedData.numberOfPackages = Math.ceil(parseFloat(autoMappedData.quantity) / 60).toString(); // 60kg per bag
        logger.info(`[PHYTOSANITARY] Auto-mapped from shipment: quantity=${autoMappedData.quantity}, origin=${autoMappedData.placeOfOrigin}`);
      }
    } catch (error) {
      logger.warn('[PHYTOSANITARY] Could not fetch shipment for auto-mapping:', error);
    }

    // AUTO-MAPPING: Fetch contract data for destination
    try {
      const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
      if (shipmentResult.success && shipmentResult.data) {
        const contractID = shipmentResult.data.ContractID || shipmentResult.data.contractID;
        if (contractID) {
          const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID]);
          if (contractResult.success && contractResult.data) {
            const contract = contractResult.data;
            autoMappedData.pointOfEntry = contract.BuyerCountry || contract.buyerCountry || '';
            logger.info(`[PHYTOSANITARY] Auto-mapped destination from contract: ${autoMappedData.pointOfEntry}`);
          }
        }
      }
    } catch (error) {
      logger.warn('[PHYTOSANITARY] Could not fetch contract for auto-mapping:', error);
    }

    // Use provided values or auto-mapped values with smart defaults
    const finalQuantity = quantity || autoMappedData.quantity || '0';
    const finalPlaceOfOrigin = placeOfOrigin || autoMappedData.placeOfOrigin || '';
    const finalPointOfEntry = pointOfEntry || autoMappedData.pointOfEntry || '';
    const finalDistinguishMarks = distinguishMarks || autoMappedData.distinguishMarks || '';
    const finalNumberOfPackages = numberOfPackages || autoMappedData.numberOfPackages || '0';

    const result = await fabricService.invokeChaincode('IssuePhytosanitaryCertificate', [
      certificateID,
      shipmentID,
      exporterID,
      inspectorName || 'EAA Inspector',
      botanicalName || 'Coffea arabica',
      treatmentApplied || 'Heat treatment at 56°C for 30 minutes',
      finalPlaceOfOrigin,
      finalPointOfEntry,
      finalQuantity.toString(),
      packagingType || 'Jute bags',
      finalNumberOfPackages.toString(),
      finalDistinguishMarks,
      meansOfConveyance || 'Container ship',
      issuedBy || 'EAA',
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to issue phytosanitary certificate' }
      });
    }

    logger.info(`✅ Phytosanitary certificate issued: ${certificateID} with auto-mapped data`);

    res.json({
      success: true,
      data: {
        certificateId: certificateID,
        message: 'Phytosanitary certificate issued successfully',
        autoMapped: {
          quantity: finalQuantity,
          placeOfOrigin: finalPlaceOfOrigin,
          pointOfEntry: finalPointOfEntry,
          numberOfPackages: finalNumberOfPackages,
          distinguishMarks: finalDistinguishMarks,
        },
        txId: result.txId,
      }
    });

  } catch (error: any) {
    logger.error('[PHYTOSANITARY] Error issuing certificate:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/phytosanitary/:certificateId
 * @desc Get phytosanitary certificate details
 * @access Authorized users
 */
router.get('/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;

    logger.info(`[PHYTOSANITARY] Reading certificate: ${certificateId}`);

    await fabricService.connect();

    const result = await fabricService.queryChaincode('ReadPhytosanitaryCertificate', [certificateId]);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: { message: 'Phytosanitary certificate not found' }
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error: any) {
    logger.error('[PHYTOSANITARY] Error reading certificate:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/phytosanitary/shipment/:shipmentId
 * @desc Get all phytosanitary certificates for a shipment
 * @access Authorized users
 */
router.get('/shipment/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;

    logger.info(`[PHYTOSANITARY] Querying certificates for shipment: ${shipmentId}`);

    await fabricService.connect();

    const result = await fabricService.queryChaincode('QueryPhytosanitaryCertificatesByShipment', [shipmentId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to query certificates' }
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error: any) {
    logger.error('[PHYTOSANITARY] Error querying certificates:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/phytosanitary/exporter/:exporterId
 * @desc Get all phytosanitary certificates for an exporter
 * @access Exporter or admin
 */
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;

    logger.info(`[PHYTOSANITARY] Querying certificates for exporter: ${exporterId}`);

    await fabricService.connect();

    const result = await fabricService.queryChaincode('QueryPhytosanitaryCertificatesByExporter', [exporterId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to query certificates' }
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error: any) {
    logger.error('[PHYTOSANITARY] Error querying certificates:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/phytosanitary
 * @desc Get all phytosanitary certificates
 * @access Admin
 */
router.get('/', async (req, res) => {
  try {
    logger.info('[PHYTOSANITARY] Querying all certificates');

    await fabricService.connect();

    const result = await fabricService.queryChaincode('QueryAllPhytosanitaryCertificates', []);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to query certificates' }
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error: any) {
    logger.error('[PHYTOSANITARY] Error querying certificates:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route POST /api/v1/phytosanitary/:certificateId/revoke
 * @desc Revoke phytosanitary certificate
 * @access Ministry of Agriculture role
 */
router.post('/:certificateId/revoke', async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { revokedBy, reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Revocation reason is required' }
      });
    }

    logger.info(`[PHYTOSANITARY] Revoking certificate: ${certificateId}`);

    await fabricService.connect('ECTAMSP');

    const result = await fabricService.invokeChaincode('RevokePhytosanitaryCertificate', [
      certificateId,
      revokedBy || 'EAA',
      reason,
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to revoke certificate' }
      });
    }

    logger.info(`✅ Phytosanitary certificate revoked: ${certificateId}`);

    res.json({
      success: true,
      data: {
        certificateId,
        message: 'Phytosanitary certificate revoked successfully',
        txId: result.txId,
      }
    });

  } catch (error: any) {
    logger.error('[PHYTOSANITARY] Error revoking certificate:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

export default router;

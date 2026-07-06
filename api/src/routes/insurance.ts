// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Insurance Certificate API Routes

import { Router } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

const router = Router();
const fabricService = FabricService.getInstance();

// ==================== INSURANCE CERTIFICATE ROUTES ====================

/**
 * @route POST /api/v1/insurance/issue
 * @desc Issue insurance certificate (for CIF shipments)
 * @access Exporter or Insurance Agent
 */
router.post('/issue', async (req, res) => {
  try {
    const {
      insuranceID,
      shipmentID,
      contractID,
      policyNumber,
      insuranceCompany,
      insuredValue,
      currency,
      coverageType,
      vesselName,
      voyageNumber,
      containerNumber,
      portOfLoading,
      portOfDischarge,
      goodsDescription,
      quantity,
      incoterm,
      claimsPayable,
      issuedBy,
    } = req.body;

    // Validation
    if (!insuranceID || !shipmentID || !contractID) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: insuranceID, shipmentID, contractID' }
      });
    }

    logger.info(`[INSURANCE] Issuing certificate: ${insuranceID} for shipment ${shipmentID}`);

    await fabricService.connect();

    // AUTO-MAPPING: Fetch shipment data to auto-populate fields
    let autoMappedData: any = {};
    try {
      const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
      if (shipmentResult.success && shipmentResult.data) {
        const shipment = shipmentResult.data;
        autoMappedData.quantity = shipment.Quantity || shipment.quantity || '0';
        autoMappedData.vesselName = shipment.VesselName || shipment.vesselName || '';
        autoMappedData.containerNumber = shipment.ContainerNumber || shipment.containerNumber || '';
        logger.info(`[INSURANCE] Auto-mapped from shipment: quantity=${autoMappedData.quantity}, vessel=${autoMappedData.vesselName}`);
      }
    } catch (error) {
      logger.warn('[INSURANCE] Could not fetch shipment for auto-mapping:', error);
    }

    // AUTO-MAPPING: Fetch contract data to auto-populate fields
    try {
      const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID]);
      if (contractResult.success && contractResult.data) {
        const contract = contractResult.data;
        autoMappedData.currency = contract.Currency || contract.currency || 'USD';
        autoMappedData.incoterm = contract.Incoterm || contract.incoterm || 'CIF';
        autoMappedData.portOfDischarge = contract.BuyerCountry || contract.buyerCountry || '';
        autoMappedData.goodsDescription = `${contract.CoffeeType || contract.coffeeType || 'Coffee'} - ${autoMappedData.quantity || quantity || 0} kg`;
        
        // Calculate insured value (invoice value + 10%)
        const pricePerKg = parseFloat(contract.PricePerKg || contract.pricePerKg || '0');
        const qty = parseFloat(autoMappedData.quantity || quantity || '0');
        autoMappedData.calculatedInsuredValue = (pricePerKg * qty * 1.1).toFixed(2); // +10% insurance standard
        
        logger.info(`[INSURANCE] Auto-mapped from contract: currency=${autoMappedData.currency}, incoterm=${autoMappedData.incoterm}, insuredValue=${autoMappedData.calculatedInsuredValue}`);
      }
    } catch (error) {
      logger.warn('[INSURANCE] Could not fetch contract for auto-mapping:', error);
    }

    // Use provided values or auto-mapped values with smart defaults
    const finalInsuredValue = insuredValue || autoMappedData.calculatedInsuredValue || '0';
    const finalQuantity = quantity || autoMappedData.quantity || '0';
    const finalCurrency = currency || autoMappedData.currency || 'USD';
    const finalIncoterm = incoterm || autoMappedData.incoterm || 'CIF';
    const finalGoodsDescription = goodsDescription || autoMappedData.goodsDescription || 'Ethiopian Arabica Coffee';
    const finalVesselName = vesselName || autoMappedData.vesselName || '';
    const finalContainerNumber = containerNumber || autoMappedData.containerNumber || '';
    const finalPortOfDischarge = portOfDischarge || autoMappedData.portOfDischarge || '';

    const result = await fabricService.invokeChaincode('IssueInsuranceCertificate', [
      insuranceID,
      shipmentID,
      contractID,
      policyNumber || '',
      insuranceCompany || 'Ethiopian Insurance Corporation',
      finalInsuredValue.toString(),
      finalCurrency,
      coverageType || 'ICC(A)',
      finalVesselName,
      voyageNumber || '',
      finalContainerNumber,
      portOfLoading || 'Djibouti Port',
      finalPortOfDischarge,
      finalGoodsDescription,
      finalQuantity.toString(),
      finalIncoterm,
      claimsPayable || 'Addis Ababa, Ethiopia',
      issuedBy || 'Insurance Agent',
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to issue insurance certificate' }
      });
    }

    logger.info(`✅ Insurance certificate issued: ${insuranceID} with auto-mapped data`);

    res.json({
      success: true,
      data: {
        insuranceId: insuranceID,
        message: 'Insurance certificate issued successfully',
        autoMapped: {
          insuredValue: finalInsuredValue,
          quantity: finalQuantity,
          currency: finalCurrency,
          incoterm: finalIncoterm,
          vesselName: finalVesselName,
          goodsDescription: finalGoodsDescription,
        },
        txId: result.txId,
      }
    });

  } catch (error: any) {
    logger.error('[INSURANCE] Error issuing certificate:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/insurance/:insuranceId
 * @desc Get insurance certificate details
 * @access Authorized users
 */
router.get('/:insuranceId', async (req, res) => {
  try {
    const { insuranceId } = req.params;

    logger.info(`[INSURANCE] Reading certificate: ${insuranceId}`);

    await fabricService.connect();

    const result = await fabricService.queryChaincode('ReadInsuranceCertificate', [insuranceId]);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: { message: 'Insurance certificate not found' }
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error: any) {
    logger.error('[INSURANCE] Error reading certificate:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/insurance/shipment/:shipmentId
 * @desc Get all insurance certificates for a shipment
 * @access Authorized users
 */
router.get('/shipment/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;

    logger.info(`[INSURANCE] Querying certificates for shipment: ${shipmentId}`);

    await fabricService.connect();

    const result = await fabricService.queryChaincode('QueryInsuranceCertificatesByShipment', [shipmentId]);

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
    logger.error('[INSURANCE] Error querying certificates:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/insurance/contract/:contractId
 * @desc Get all insurance certificates for a contract
 * @access Authorized users
 */
router.get('/contract/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;

    logger.info(`[INSURANCE] Querying certificates for contract: ${contractId}`);

    await fabricService.connect();

    const result = await fabricService.queryChaincode('QueryInsuranceCertificatesByContract', [contractId]);

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
    logger.error('[INSURANCE] Error querying certificates:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route GET /api/v1/insurance
 * @desc Get all insurance certificates
 * @access Admin
 */
router.get('/', async (req, res) => {
  try {
    logger.info('[INSURANCE] Querying all certificates');

    await fabricService.connect();

    const result = await fabricService.queryChaincode('QueryAllInsuranceCertificates', []);

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
    logger.error('[INSURANCE] Error querying certificates:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

/**
 * @route POST /api/v1/insurance/:insuranceId/claim
 * @desc Record insurance claim
 * @access Exporter
 */
router.post('/:insuranceId/claim', async (req, res) => {
  try {
    const { insuranceId } = req.params;
    const { claimReason, claimAmount } = req.body;

    if (!claimReason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Claim reason is required' }
      });
    }

    logger.info(`[INSURANCE] Recording claim for certificate: ${insuranceId}`);

    await fabricService.connect();

    const result = await fabricService.invokeChaincode('RecordInsuranceClaim', [
      insuranceId,
      claimReason,
      claimAmount?.toString() || '0',
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to record claim' }
      });
    }

    logger.info(`✅ Insurance claim recorded for: ${insuranceId}`);

    res.json({
      success: true,
      data: {
        insuranceId,
        message: 'Insurance claim recorded successfully',
        txId: result.txId,
      }
    });

  } catch (error: any) {
    logger.error('[INSURANCE] Error recording claim:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
});

export default router;

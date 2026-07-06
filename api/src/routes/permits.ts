import express from 'express';
import { FabricService } from '../services/fabricService';

const router = express.Router();
const fabricService = FabricService.getInstance();

// Issue export permit
router.post('/issue', async (req, res) => {
  try {
    const {
      permitId,
      permitNumber,
      contractId,
      exporterId,
      lcId,
      paymentMethod,
      amount,
      currency,
      description,
      destination,
      commercialInvoice,
      bankBranch,
      approvedBy
    } = req.body;

    // Export permits are issued by Banks (Commercial Bank of Ethiopia)
    await fabricService.connectAsOrg('BanksMSP');

    const result = await fabricService.invokeChaincode(
      'IssueCBEExportPermit',
      [
        permitId,
        permitNumber,
        contractId,
        exporterId,
        lcId,
        paymentMethod,
        amount.toString(),
        currency,
        description,
        destination,
        commercialInvoice,
        bankBranch,
        approvedBy
      ]
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Export permit issued successfully',
        data: result.data,
        txId: result.txId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: { message: result.error || 'Failed to issue permit' }
      });
    }
  } catch (error: any) {
    console.error('Issue permit error:', error);
    res.status(500).json({ 
      success: false,
      error: { message: error.message }
    });
  }
});

// Utilize export permit
router.post('/utilize', async (req, res) => {
  try {
    const { permitId } = req.body;

    const result = await fabricService.invokeChaincode('UtilizeExportPermit', [permitId]);

    if (result.success) {
      res.json({ success: true, message: 'Export permit utilized successfully' });
    } else {
      res.status(400).json({ success: false, error: { message: result.error } });
    }
  } catch (error: any) {
    console.error('Utilize permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settle export permit
router.post('/settle', async (req, res) => {
  try {
    const { permitId, repatriatedAmount } = req.body;

    const result = await fabricService.invokeChaincode(
      'SettleExportPermit',
      [permitId, repatriatedAmount.toString()]
    );

    if (result.success) {
      res.json({ success: true, message: 'Export permit settled successfully' });
    } else {
      res.status(400).json({ success: false, error: { message: result.error } });
    }
  } catch (error: any) {
    console.error('Settle permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get permit by ID
router.get('/:permitId', async (req, res) => {
  try {
    const { permitId } = req.params;
    const result = await fabricService.queryChaincode('ReadExportPermit', [permitId]);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Read permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query permits by exporter
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    const result = await fabricService.queryChaincode('QueryPermitsByExporter', [exporterId]);
    
    if (result.success) {
      res.json(result.data || []);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Query permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query outstanding permits
router.get('/outstanding/all', async (req, res) => {
  try {
    const result = await fabricService.queryChaincode('QueryOutstandingPermits', []);
    
    if (result.success) {
      res.json(result.data || []);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Query outstanding permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query all permits
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.queryChaincode('QueryAllPermits', []);
    
    if (result.success) {
      res.json(result.data || []);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Query all permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { fabricService } from '../services/fabricService';

const router = express.Router();

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

    await fabricService.submitTransaction(
      'IssueCBEExportPermit',
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
    );

    res.json({ success: true, message: 'Export permit issued successfully' });
  } catch (error: any) {
    console.error('Issue permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Utilize export permit
router.post('/utilize', async (req, res) => {
  try {
    const { permitId } = req.body;

    await fabricService.submitTransaction('UtilizeExportPermit', permitId);

    res.json({ success: true, message: 'Export permit utilized successfully' });
  } catch (error: any) {
    console.error('Utilize permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settle export permit
router.post('/settle', async (req, res) => {
  try {
    const { permitId, repatriatedAmount } = req.body;

    await fabricService.submitTransaction(
      'SettleExportPermit',
      permitId,
      repatriatedAmount.toString()
    );

    res.json({ success: true, message: 'Export permit settled successfully' });
  } catch (error: any) {
    console.error('Settle permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get permit by ID
router.get('/:permitId', async (req, res) => {
  try {
    const { permitId } = req.params;
    const result = await fabricService.evaluateTransaction('ReadExportPermit', permitId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Read permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query permits by exporter
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    const result = await fabricService.evaluateTransaction('QueryPermitsByExporter', exporterId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query outstanding permits
router.get('/outstanding/all', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryOutstandingPermits');
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query outstanding permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query all permits
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryAllPermits');
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query all permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

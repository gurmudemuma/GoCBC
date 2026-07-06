import express from 'express';
import { FabricService } from '../services/fabricService';

const router = express.Router();
const fabricService = FabricService.getInstance();

// Record advance payment
router.post('/record', async (req, res) => {
  try {
    const {
      paymentId,
      contractId,
      exporterId,
      amount,
      currency,
      creditAdviceNumber,
      receivingBank,
      receivingBankBIC,
      payingBank,
      payingBankBIC,
      swiftReference,
      beneficiaryName,
      beneficiaryAccount
    } = req.body;

    await fabricService.submitTransaction(
      'RecordAdvancePayment',
      paymentId,
      contractId,
      exporterId,
      amount.toString(),
      currency,
      creditAdviceNumber,
      receivingBank,
      receivingBankBIC,
      payingBank,
      payingBankBIC,
      swiftReference,
      beneficiaryName,
      beneficiaryAccount
    );

    res.json({ success: true, message: 'Advance payment recorded successfully' });
  } catch (error: any) {
    console.error('Record advance payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Issue permit for advance
router.post('/issue-permit', async (req, res) => {
  try {
    const { paymentId, permitId, permitNumber } = req.body;

    await fabricService.submitTransaction(
      'IssuePermitForAdvance',
      paymentId,
      permitId,
      permitNumber
    );

    res.json({ success: true, message: 'Permit issued for advance payment successfully' });
  } catch (error: any) {
    console.error('Issue permit for advance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Link shipment to advance
router.post('/link-shipment', async (req, res) => {
  try {
    const { paymentId, shipmentId } = req.body;

    await fabricService.submitTransaction('LinkShipmentToAdvance', paymentId, shipmentId);

    res.json({ success: true, message: 'Shipment linked to advance payment successfully' });
  } catch (error: any) {
    console.error('Link shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settle advance payment
router.post('/settle', async (req, res) => {
  try {
    const { paymentId } = req.body;

    await fabricService.submitTransaction('SettleAdvancePayment', paymentId);

    res.json({ success: true, message: 'Advance payment settled successfully' });
  } catch (error: any) {
    console.error('Settle advance payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get advance payment by ID
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await fabricService.evaluateTransaction('ReadAdvancePayment', paymentId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Read advance payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query advance payments by exporter
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    const result = await fabricService.evaluateTransaction('QueryAdvancePaymentsByExporter', exporterId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query advance payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query all advance payments
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryAllAdvancePayments');
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query all advance payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

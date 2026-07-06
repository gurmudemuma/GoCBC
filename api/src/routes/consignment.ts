import express from 'express';
import { FabricService } from '../services/fabricService';

const router = express.Router();
const fabricService = FabricService.getInstance();

// Issue consignment permit
router.post('/issue-permit', async (req, res) => {
  try {
    const {
      consignmentId,
      permitId,
      permitNumber,
      exporterId,
      commodityType,
      description,
      destination,
      buyerName,
      buyerAddress,
      permitAmount,
      currency,
      bankBranch
    } = req.body;

    await fabricService.submitTransaction(
      'IssueConsignmentPermit',
      consignmentId,
      permitId,
      permitNumber,
      exporterId,
      commodityType,
      description,
      destination,
      buyerName,
      buyerAddress,
      permitAmount.toString(),
      currency,
      bankBranch
    );

    res.json({ success: true, message: 'Consignment permit issued successfully' });
  } catch (error: any) {
    console.error('Issue consignment permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record consignment shipment
router.post('/record-shipment', async (req, res) => {
  try {
    const { consignmentId, shippedValue } = req.body;

    await fabricService.submitTransaction(
      'RecordConsignmentShipment',
      consignmentId,
      shippedValue.toString()
    );

    res.json({ success: true, message: 'Consignment shipment recorded successfully' });
  } catch (error: any) {
    console.error('Record consignment shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record partial payment
router.post('/partial-payment', async (req, res) => {
  try {
    const { consignmentId, amount, swiftReference, receivedBy } = req.body;

    await fabricService.submitTransaction(
      'RecordPartialPayment',
      consignmentId,
      amount.toString(),
      swiftReference,
      receivedBy
    );

    res.json({ success: true, message: 'Partial payment recorded successfully' });
  } catch (error: any) {
    console.error('Record partial payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get consignment by ID
router.get('/:consignmentId', async (req, res) => {
  try {
    const { consignmentId } = req.params;
    const result = await fabricService.evaluateTransaction('ReadConsignmentPayment', consignmentId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Read consignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query consignments by exporter
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    const result = await fabricService.evaluateTransaction('QueryConsignmentsByExporter', exporterId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query consignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query outstanding consignments
router.get('/outstanding/all', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryOutstandingConsignments');
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query outstanding consignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query all consignments
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryAllConsignments');
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query all consignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

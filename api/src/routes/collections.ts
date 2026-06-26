import express from 'express';
import { fabricService } from '../services/fabricService';

const router = express.Router();

// Send documentary collection
router.post('/send', async (req, res) => {
  try {
    const {
      collectionId,
      contractId,
      exporterId,
      permitId,
      drawerName,
      draweeName,
      draweeAddress,
      paymentTerm,
      acceptanceDays,
      amount,
      currency,
      collectingBank,
      collectingBankBIC,
      remittingBank,
      remittingBankBIC,
      instructions,
      chargesAccount,
      documents
    } = req.body;

    await fabricService.submitTransaction(
      'SendDocumentaryCollection',
      collectionId,
      contractId,
      exporterId,
      permitId,
      drawerName,
      draweeName,
      draweeAddress,
      paymentTerm,
      acceptanceDays?.toString() || '0',
      amount.toString(),
      currency,
      collectingBank,
      collectingBankBIC,
      remittingBank,
      remittingBankBIC,
      instructions,
      chargesAccount,
      JSON.stringify(documents)
    );

    res.json({ success: true, message: 'Documentary collection sent successfully' });
  } catch (error: any) {
    console.error('Send collection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Present documentary collection
router.post('/present', async (req, res) => {
  try {
    const { collectionId } = req.body;

    await fabricService.submitTransaction('PresentDocumentaryCollection', collectionId);

    res.json({ success: true, message: 'Documentary collection presented successfully' });
  } catch (error: any) {
    console.error('Present collection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept documentary collection
router.post('/accept', async (req, res) => {
  try {
    const { collectionId } = req.body;

    await fabricService.submitTransaction('AcceptDocumentaryCollection', collectionId);

    res.json({ success: true, message: 'Documentary collection accepted successfully' });
  } catch (error: any) {
    console.error('Accept collection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settle documentary collection
router.post('/settle', async (req, res) => {
  try {
    const { collectionId, charges } = req.body;

    await fabricService.submitTransaction(
      'SettleDocumentaryCollection',
      collectionId,
      charges?.toString() || '0'
    );

    res.json({ success: true, message: 'Documentary collection settled successfully' });
  } catch (error: any) {
    console.error('Settle collection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Return documentary collection
router.post('/return', async (req, res) => {
  try {
    const { collectionId, returnReason } = req.body;

    await fabricService.submitTransaction(
      'ReturnDocumentaryCollection',
      collectionId,
      returnReason
    );

    res.json({ success: true, message: 'Documentary collection returned successfully' });
  } catch (error: any) {
    console.error('Return collection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send reminder
router.post('/reminder', async (req, res) => {
  try {
    const { collectionId } = req.body;

    await fabricService.submitTransaction('SendCollectionReminder', collectionId);

    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error: any) {
    console.error('Send reminder error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get collection by ID
router.get('/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const result = await fabricService.evaluateTransaction('ReadDocumentaryCollection', collectionId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Read collection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query collections by exporter
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    const result = await fabricService.evaluateTransaction('QueryCollectionsByExporter', exporterId);
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query collections error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query outstanding collections
router.get('/outstanding/all', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryOutstandingCollections');
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query outstanding collections error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query all collections
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryAllCollections');
    res.json(JSON.parse(result));
  } catch (error: any) {
    console.error('Query all collections error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

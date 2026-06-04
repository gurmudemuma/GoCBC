import express from 'express';
import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

const router = express.Router();

// Helper function to connect to Fabric network
async function connectToNetwork(orgName: string) {
  const ccpPath = path.resolve(__dirname, '..', '..', '..', 'blockchain', 'organizations', 
    'peerOrganizations', `${orgName.toLowerCase()}.et`, `connection-${orgName.toLowerCase()}.json`);
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  const walletPath = path.join(process.cwd(), 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const identity = await wallet.get('admin');
  if (!identity) {
    throw new Error('Admin identity not found in wallet');
  }

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: 'admin',
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork('coffeechannel');
  const contract = network.getContract('coffee');

  return { gateway, contract };
}

// ==================== LETTER OF CREDIT ROUTES ====================

// Request LC
router.post('/lc/request', async (req, res) => {
  try {
    const { lcId, contractId, exporterId, bankName, amount, currency, expiryDate } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction(
      'RequestLC',
      lcId,
      contractId,
      exporterId,
      bankName,
      amount.toString(),
      currency,
      expiryDate
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'LC requested successfully', lcId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve LC
router.post('/lc/approve', async (req, res) => {
  try {
    const { lcId, issuingBank, beneficiaryBank, beneficiary } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction(
      'ApproveLC',
      lcId,
      issuingBank,
      beneficiaryBank,
      beneficiary
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'LC approved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Issue LC
router.post('/lc/issue', async (req, res) => {
  try {
    const { lcId, terms } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction('IssueLC', lcId, terms);
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'LC issued successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get LC details
router.get('/lc/:lcId', async (req, res) => {
  try {
    const { lcId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    const result = await contract.evaluateTransaction('ReadLC', lcId);
    const lc = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, lc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update LC status
router.put('/lc/:lcId/status', async (req, res) => {
  try {
    const { lcId } = req.params;
    const { status } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction('UpdateLCStatus', lcId, status);
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'LC status updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query LCs by exporter
router.get('/lc/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    const result = await contract.evaluateTransaction('QueryLCsByExporter', exporterId);
    const lcs = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, lcs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query LCs by status
router.get('/lc/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    const result = await contract.evaluateTransaction('QueryLCsByStatus', status);
    const lcs = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, lcs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAYMENT & SWIFT ROUTES ====================

// Initiate payment
router.post('/payment/initiate', async (req, res) => {
  try {
    const { 
      paymentId, contractId, exporterId, lcId, amount, currency, 
      receivingBank, receivingBankBIC, beneficiaryName, beneficiaryAccount, paymentMethod 
    } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction(
      'InitiatePayment',
      paymentId,
      contractId,
      exporterId,
      lcId,
      amount.toString(),
      currency,
      receivingBank,
      receivingBankBIC,
      beneficiaryName,
      beneficiaryAccount,
      paymentMethod
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Payment initiated successfully', paymentId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit payment documents
router.post('/payment/:paymentId/documents', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { documents } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction(
      'SubmitPaymentDocuments',
      paymentId,
      JSON.stringify(documents)
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Documents submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify payment documents
router.post('/payment/:paymentId/verify', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verifiedBy, comments } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction(
      'VerifyPaymentDocuments',
      paymentId,
      verifiedBy,
      comments
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Documents verified successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initiate SWIFT transfer
router.post('/payment/:paymentId/swift/initiate', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { 
      swiftReference, senderBIC, messageType, valueDate, 
      intermediary1, intermediary2, charges, remittanceInfo 
    } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction(
      'InitiateSWIFTTransfer',
      paymentId,
      swiftReference,
      senderBIC,
      messageType,
      valueDate,
      intermediary1 || '',
      intermediary2 || '',
      charges,
      remittanceInfo
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'SWIFT transfer initiated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm SWIFT receipt
router.post('/payment/:paymentId/swift/confirm', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { receivedBy } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction('ConfirmSWIFTReceipt', paymentId, receivedBy);
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'SWIFT receipt confirmed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Settle payment
router.post('/payment/:paymentId/settle', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { exchangeRate, retentionRate, payingBank, payingBankBIC, swiftReference, nbeApprovalRef } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    await contract.submitTransaction(
      'SettlePayment',
      paymentId,
      exchangeRate.toString(),
      retentionRate.toString(),
      payingBank,
      payingBankBIC,
      swiftReference,
      nbeApprovalRef
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Payment settled successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get payment details
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    const result = await contract.evaluateTransaction('ReadPayment', paymentId);
    const payment = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, payment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query payments by exporter
router.get('/payment/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    const result = await contract.evaluateTransaction('QueryPaymentsByExporter', exporterId);
    const payments = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query payments by SWIFT reference
router.get('/payment/swift/:swiftReference', async (req, res) => {
  try {
    const { swiftReference } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Banks');
    
    const result = await contract.evaluateTransaction('QueryPaymentsBySWIFTReference', swiftReference);
    const payments = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

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

// ==================== FOREX ALLOCATION ROUTES ====================

// Request forex allocation
router.post('/request', async (req, res) => {
  try {
    const { forexId, contractId, exporterId, lcId, amount, currency } = req.body;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    await contract.submitTransaction(
      'RequestForex',
      forexId,
      contractId,
      exporterId,
      lcId,
      amount.toString(),
      currency
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Forex requested successfully', forexId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Allocate forex
router.post('/allocate', async (req, res) => {
  try {
    const { forexId, amount, exchangeRate, retentionRate, nbeOfficer, nbeApprovalRef, expiryDate } = req.body;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    await contract.submitTransaction(
      'AllocateForex',
      forexId,
      amount.toString(),
      exchangeRate.toString(),
      retentionRate.toString(),
      nbeOfficer,
      nbeApprovalRef,
      expiryDate
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Forex allocated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Utilize forex
router.post('/utilize', async (req, res) => {
  try {
    const { forexId, utilizedAmount } = req.body;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    await contract.submitTransaction('UtilizeForex', forexId, utilizedAmount.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Forex utilized successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all forex allocations
router.get('/', async (req, res) => {
  try {
    const { gateway, contract } = await connectToNetwork('NBE');
    
    const result = await contract.evaluateTransaction('QueryAllForex');
    const forexList = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({
      success: true,
      data: forexList,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'QUERY_FAILED', 
        message: error.message 
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Get forex details
router.get('/:forexId', async (req, res) => {
  try {
    const { forexId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('NBE');

    
    const result = await contract.evaluateTransaction('ReadForex', forexId);
    const forex = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, forex });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query forex by exporter
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    const result = await contract.evaluateTransaction('QueryForexByExporter', exporterId);
    const forexList = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, forexList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query forex by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    const result = await contract.evaluateTransaction('QueryForexByStatus', status);
    const forexList = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, forexList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify forex utilization
router.post('/verify', async (req, res) => {
  try {
    const { forexId, paymentId } = req.body;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    await contract.submitTransaction('VerifyForexUtilization', forexId, paymentId);
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Forex utilization verified successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXCHANGE RATE ROUTES ====================

// Set exchange rate
router.post('/rate/set', async (req, res) => {
  try {
    const { rateId, currency, buyingRate, sellingRate, setBy } = req.body;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    await contract.submitTransaction(
      'SetExchangeRate',
      rateId,
      currency,
      buyingRate.toString(),
      sellingRate.toString(),
      setBy
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Exchange rate set successfully', rateId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current exchange rate
router.get('/rate/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    const result = await contract.evaluateTransaction('GetCurrentExchangeRate', currency);
    const rate = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, rate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get exchange rate history
router.get('/rate/:currency/history', async (req, res) => {
  try {
    const { currency } = req.params;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    const result = await contract.evaluateTransaction('QueryExchangeRateHistory', currency);
    const rates = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, rates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RETENTION POLICY ROUTES ====================

// Set retention policy
router.post('/retention/set', async (req, res) => {
  try {
    const { policyId, commodityType, retentionRate, setBy, justification } = req.body;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    await contract.submitTransaction(
      'SetRetentionPolicy',
      policyId,
      commodityType,
      retentionRate.toString(),
      setBy,
      justification
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Retention policy set successfully', policyId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current retention policy
router.get('/retention/:commodityType', async (req, res) => {
  try {
    const { commodityType } = req.params;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    const result = await contract.evaluateTransaction('GetCurrentRetentionPolicy', commodityType);
    const policy = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAYMENT OVERSIGHT ROUTES ====================

// Approve payment settlement
router.post('/payment/approve', async (req, res) => {
  try {
    const { paymentId, nbeOfficer, approvalRef } = req.body;
    
    const { gateway, contract } = await connectToNetwork('NBE');
    
    await contract.submitTransaction('ApprovePaymentSettlement', paymentId, nbeOfficer, approvalRef);
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Payment approved for settlement' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

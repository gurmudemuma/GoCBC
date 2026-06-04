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

// ==================== CUSTOMS DECLARATION ROUTES ====================

// Submit customs declaration
router.post('/declaration/submit', async (req, res) => {
  try {
    const { 
      declarationId, contractId, exporterId, lcId, forexId, quantity, totalValue, 
      currency, destination, portOfExit, documents 
    } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Customs');
    
    await contract.submitTransaction(
      'SubmitDeclaration',
      declarationId,
      contractId,
      exporterId,
      lcId,
      forexId,
      quantity.toString(),
      totalValue.toString(),
      currency,
      destination,
      portOfExit,
      JSON.stringify(documents || [])
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Declaration submitted successfully', declarationId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Review declaration
router.post('/declaration/:declarationId/review', async (req, res) => {
  try {
    const { declarationId } = req.params;
    const { customsOfficer, inspectionNotes } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Customs');
    
    await contract.submitTransaction(
      'ReviewDeclaration',
      declarationId,
      customsOfficer,
      inspectionNotes
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Declaration reviewed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear declaration
router.post('/declaration/:declarationId/clear', async (req, res) => {
  try {
    const { declarationId } = req.params;
    const { clearanceNumber, dutiesAmount } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Customs');
    
    await contract.submitTransaction(
      'ClearDeclaration',
      declarationId,
      clearanceNumber,
      dutiesAmount.toString()
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Declaration cleared successfully', clearanceNumber });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject declaration
router.post('/declaration/:declarationId/reject', async (req, res) => {
  try {
    const { declarationId } = req.params;
    const { reason } = req.body;
    
    const { gateway, contract } = await connectToNetwork('Customs');
    
    await contract.submitTransaction('RejectDeclaration', declarationId, reason);
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Declaration rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get declaration details
router.get('/declaration/:declarationId', async (req, res) => {
  try {
    const { declarationId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Customs');
    
    const result = await contract.evaluateTransaction('ReadDeclaration', declarationId);
    const declaration = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query declarations by exporter
router.get('/declaration/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Customs');
    
    const result = await contract.evaluateTransaction('QueryDeclarationsByExporter', exporterId);
    const declarations = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, declarations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query declarations by status
router.get('/declaration/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    const { gateway, contract } = await connectToNetwork('Customs');
    
    const result = await contract.evaluateTransaction('QueryDeclarationsByStatus', status);
    const declarations = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, declarations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

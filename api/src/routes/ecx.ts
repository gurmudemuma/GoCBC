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

// ==================== ECX LOT MANAGEMENT ROUTES ====================

// Register coffee lot
router.post('/lot/register', async (req, res) => {
  try {
    const { 
      lotId, exporterId, coffeeType, origin, quantity, qualityGrade, qualityScore, 
      warehouseLocation, pricePerKg 
    } = req.body;
    
    const { gateway, contract } = await connectToNetwork('ECX');
    
    await contract.submitTransaction(
      'RegisterLot',
      lotId,
      exporterId,
      coffeeType,
      origin,
      quantity.toString(),
      qualityGrade,
      qualityScore.toString(),
      warehouseLocation,
      pricePerKg.toString()
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Lot registered successfully', lotId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lot price
router.put('/lot/:lotId/price', async (req, res) => {
  try {
    const { lotId } = req.params;
    const { pricePerKg } = req.body;
    
    const { gateway, contract } = await connectToNetwork('ECX');
    
    await contract.submitTransaction('UpdateLotPrice', lotId, pricePerKg.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Lot price updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lot status
router.put('/lot/:lotId/status', async (req, res) => {
  try {
    const { lotId } = req.params;
    const { status, buyerId, contractId } = req.body;
    
    const { gateway, contract } = await connectToNetwork('ECX');
    
    await contract.submitTransaction(
      'UpdateLotStatus',
      lotId,
      status,
      buyerId || '',
      contractId || ''
    );
    
    await gateway.disconnect();
    
    res.json({ success: true, message: 'Lot status updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get lot details
router.get('/lot/:lotId', async (req, res) => {
  try {
    const { lotId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('ECX');
    
    const result = await contract.evaluateTransaction('ReadLot', lotId);
    const lot = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, lot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query lots by exporter
router.get('/lot/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    
    const { gateway, contract } = await connectToNetwork('ECX');
    
    const result = await contract.evaluateTransaction('QueryLotsByExporter', exporterId);
    const lots = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, lots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Query lots by status
router.get('/lot/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    const { gateway, contract } = await connectToNetwork('ECX');
    
    const result = await contract.evaluateTransaction('QueryLotsByStatus', status);
    const lots = JSON.parse(result.toString());
    
    await gateway.disconnect();
    
    res.json({ success: true, lots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

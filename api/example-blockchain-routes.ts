/**
 * GoCBC Blockchain Integration Examples
 * 
 * This file contains example route handlers showing how to integrate
 * blockchain operations into your Express.js API endpoints.
 * 
 * Copy these patterns into your actual route files.
 */

import { Router, Request, Response } from 'express';
import { FabricService } from './src/services/fabricService';
import { DatabaseService } from './src/services/databaseService';

const router = Router();

// ============================================================
// EXAMPLE 1: Register Sales Contract (ECTA Portal)
// ============================================================

interface RegisterContractRequest {
  contractId: string;
  exporterId: string;
  buyer: string;
  quantity: number;
  grade: string;
  pricePerKg: number;
  currency: string;
  paymentMethod: string;
  deliveryDate: string;
}

router.post('/api/contracts', async (req: Request, res: Response) => {
  try {
    const fabricService = FabricService.getInstance();
    const db = DatabaseService.getInstance();
    
    const contractData: RegisterContractRequest = req.body;
    
    // Validate input
    if (!contractData.contractId || !contractData.exporterId) {
      return res.status(400).json({ 
        error: 'Contract ID and Exporter ID are required' 
      });
    }
    
    // Connect to blockchain as ECTA
    await fabricService.connect('ECTAMSP');
    
    // Invoke blockchain
    console.log(`Registering contract ${contractData.contractId} on blockchain...`);
    const blockchainResult = await fabricService.invokeChaincode('RegisterSalesContract', [
      contractData.contractId,
      contractData.exporterId,
      contractData.buyer,
      contractData.quantity.toString(),
      contractData.grade,
      contractData.pricePerKg.toString(),
      contractData.currency,
      contractData.paymentMethod,
      contractData.deliveryDate
    ]);
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        error: 'Blockchain registration failed', 
        details: blockchainResult.error 
      });
    }
    
    // Store in PostgreSQL
    await db.query(
      `INSERT INTO contracts 
       (id, exporter_id, buyer, quantity, grade, price_per_kg, currency, 
        payment_method, delivery_date, blockchain_tx_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        contractData.contractId,
        contractData.exporterId,
        contractData.buyer,
        contractData.quantity,
        contractData.grade,
        contractData.pricePerKg,
        contractData.currency,
        contractData.paymentMethod,
        contractData.deliveryDate,
        blockchainResult.txId,
        'registered'
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Contract registered successfully',
      contractId: contractData.contractId,
      blockchain: {
        txId: blockchainResult.txId,
        blockNumber: blockchainResult.ledgerDetails?.blockNumber,
        endorsers: blockchainResult.ledgerDetails?.endorsers?.map(e => e.mspId)
      }
    });
    
  } catch (error: any) {
    console.error('Error registering contract:', error);
    res.status(500).json({ 
      error: 'Failed to register contract', 
      message: error.message 
    });
  }
});

// ============================================================
// EXAMPLE 2: Issue Letter of Credit (Banks Portal)
// ============================================================

interface IssueLCRequest {
  lcNumber: string;
  contractId: string;
  applicant: string;
  beneficiary: string;
  amount: number;
  currency: string;
  issuingBank: string;
  advisingBank?: string;
  expiryDate: string;
  paymentTerms?: string;
  requiredDocuments?: string[];
}

router.post('/api/lc/issue', async (req: Request, res: Response) => {
  try {
    const fabricService = FabricService.getInstance();
    const db = DatabaseService.getInstance();
    
    const lcData: IssueLCRequest = req.body;
    
    // Connect to blockchain as Banks
    await fabricService.connect('BanksMSP');
    
    // Check if contract exists
    const contractCheck = await fabricService.queryChaincode('ReadSalesContract', [lcData.contractId]);
    if (!contractCheck.success) {
      return res.status(404).json({ 
        error: 'Contract not found on blockchain' 
      });
    }
    
    // Issue L/C on blockchain
    console.log(`Issuing L/C ${lcData.lcNumber} on blockchain...`);
    const blockchainResult = await fabricService.invokeChaincode('IssueLC', [
      lcData.lcNumber,
      lcData.contractId,
      lcData.applicant,
      lcData.beneficiary,
      lcData.amount.toString(),
      lcData.currency,
      lcData.issuingBank,
      lcData.advisingBank || '',
      lcData.expiryDate,
      lcData.paymentTerms || 'At Sight',
      JSON.stringify(lcData.requiredDocuments || [])
    ]);
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        error: 'L/C issuance failed on blockchain', 
        details: blockchainResult.error 
      });
    }
    
    // Store in PostgreSQL
    await db.query(
      `INSERT INTO letter_of_credits 
       (lc_number, contract_id, applicant, beneficiary, amount, currency,
        issuing_bank, advising_bank, expiry_date, blockchain_tx_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        lcData.lcNumber,
        lcData.contractId,
        lcData.applicant,
        lcData.beneficiary,
        lcData.amount,
        lcData.currency,
        lcData.issuingBank,
        lcData.advisingBank,
        lcData.expiryDate,
        blockchainResult.txId,
        'issued'
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'L/C issued successfully',
      lcNumber: lcData.lcNumber,
      blockchain: {
        txId: blockchainResult.txId,
        blockNumber: blockchainResult.ledgerDetails?.blockNumber,
        validationStatus: blockchainResult.ledgerDetails?.validationStatus
      }
    });
    
  } catch (error: any) {
    console.error('Error issuing L/C:', error);
    res.status(500).json({ 
      error: 'Failed to issue L/C', 
      message: error.message 
    });
  }
});

// ============================================================
// EXAMPLE 3: Query Shipments (Any Portal)
// ============================================================

router.get('/api/shipments/exporter/:exporterId', async (req: Request, res: Response) => {
  try {
    const fabricService = FabricService.getInstance();
    const { exporterId } = req.params;
    
    // Connect with current user's MSP (or default to ECTA)
    const userOrg = (req as any).user?.organization || 'ECTA';
    const orgMspMap: Record<string, string> = {
      'ECTA': 'ECTAMSP',
      'ECX': 'ECXMSP',
      'NBE': 'NBEMSP',
      'Banks': 'BanksMSP',
      'Customs': 'CustomsMSP',
      'Shipping': 'ShippingMSP'
    };
    
    await fabricService.connect(orgMspMap[userOrg] || 'ECTAMSP');
    
    // Query blockchain
    console.log(`Querying shipments for exporter ${exporterId}...`);
    const result = await fabricService.queryChaincode('QueryShipmentsByExporter', [exporterId]);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Blockchain query failed', 
        details: result.error 
      });
    }
    
    const shipments = result.data ? JSON.parse(result.data) : [];
    
    res.json({
      success: true,
      count: shipments.length,
      exporterId,
      shipments,
      queriedBy: userOrg
    });
    
  } catch (error: any) {
    console.error('Error querying shipments:', error);
    res.status(500).json({ 
      error: 'Failed to query shipments', 
      message: error.message 
    });
  }
});

// ============================================================
// EXAMPLE 4: Create SWIFT MT103 Payment Message (Banks Portal)
// ============================================================

interface CreateMT103Request {
  messageId: string;
  paymentId: string;
  senderBIC: string;
  receiverBIC: string;
  amount: number;
  currency: string;
  orderingCustomer: string;
  beneficiaryCustomer: string;
  remittanceInfo: string;
  valueDate: string;
  reference: string;
  intermediaryBank?: string;
  instructionsToBank?: string;
}

router.post('/api/swift/mt103', async (req: Request, res: Response) => {
  try {
    const fabricService = FabricService.getInstance();
    const db = DatabaseService.getInstance();
    
    const swiftData: CreateMT103Request = req.body;
    
    // Connect as Banks
    await fabricService.connect('BanksMSP');
    
    // Create MT103 on blockchain
    console.log(`Creating SWIFT MT103 message ${swiftData.messageId}...`);
    const blockchainResult = await fabricService.invokeChaincode('CreateMT103_Payment', [
      swiftData.messageId,
      swiftData.paymentId,
      swiftData.senderBIC,
      swiftData.receiverBIC,
      swiftData.amount.toString(),
      swiftData.currency,
      swiftData.orderingCustomer,
      swiftData.beneficiaryCustomer,
      swiftData.remittanceInfo,
      swiftData.valueDate,
      swiftData.reference,
      swiftData.intermediaryBank || '',
      swiftData.instructionsToBank || ''
    ]);
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        error: 'SWIFT message creation failed', 
        details: blockchainResult.error 
      });
    }
    
    // Store in PostgreSQL
    await db.query(
      `INSERT INTO swift_messages 
       (message_id, payment_id, message_type, sender_bic, receiver_bic, 
        amount, currency, value_date, blockchain_tx_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        swiftData.messageId,
        swiftData.paymentId,
        'MT103',
        swiftData.senderBIC,
        swiftData.receiverBIC,
        swiftData.amount,
        swiftData.currency,
        swiftData.valueDate,
        blockchainResult.txId,
        'created'
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'SWIFT MT103 message created successfully',
      messageId: swiftData.messageId,
      blockchain: {
        txId: blockchainResult.txId,
        timestamp: blockchainResult.ledgerDetails?.timestamp
      }
    });
    
  } catch (error: any) {
    console.error('Error creating SWIFT message:', error);
    res.status(500).json({ 
      error: 'Failed to create SWIFT message', 
      message: error.message 
    });
  }
});

// ============================================================
// EXAMPLE 5: Track Shipment Updates (Shipping Portal)
// ============================================================

router.post('/api/shipments/:shipmentId/location', async (req: Request, res: Response) => {
  try {
    const fabricService = FabricService.getInstance();
    const { shipmentId } = req.params;
    const { location, latitude, longitude, timestamp } = req.body;
    
    // Connect as Shipping
    await fabricService.connect('ShippingMSP');
    
    // Update location on blockchain
    console.log(`Updating location for shipment ${shipmentId}...`);
    const blockchainResult = await fabricService.invokeChaincode('UpdateShipmentLocation', [
      shipmentId,
      location,
      latitude.toString(),
      longitude.toString(),
      timestamp || new Date().toISOString()
    ]);
    
    if (!blockchainResult.success) {
      return res.status(500).json({ 
        error: 'Location update failed', 
        details: blockchainResult.error 
      });
    }
    
    res.json({
      success: true,
      message: 'Shipment location updated successfully',
      shipmentId,
      location,
      blockchain: {
        txId: blockchainResult.txId
      }
    });
    
  } catch (error: any) {
    console.error('Error updating shipment location:', error);
    res.status(500).json({ 
      error: 'Failed to update shipment location', 
      message: error.message 
    });
  }
});

// ============================================================
// EXAMPLE 6: Get Complete Traceability (Any Portal)
// ============================================================

router.get('/api/traceability/:contractId', async (req: Request, res: Response) => {
  try {
    const fabricService = FabricService.getInstance();
    const { contractId } = req.params;
    
    // Connect with default org
    await fabricService.connect('ECTAMSP');
    
    // Get complete traceability from blockchain
    console.log(`Fetching traceability for contract ${contractId}...`);
    const result = await fabricService.queryChaincode('GetCompleteTraceability', [contractId]);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Traceability query failed', 
        details: result.error 
      });
    }
    
    const traceability = result.data ? JSON.parse(result.data) : null;
    
    res.json({
      success: true,
      contractId,
      traceability
    });
    
  } catch (error: any) {
    console.error('Error fetching traceability:', error);
    res.status(500).json({ 
      error: 'Failed to fetch traceability', 
      message: error.message 
    });
  }
});

// ============================================================
// EXAMPLE 7: Query with Pagination (Large datasets)
// ============================================================

router.get('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const fabricService = FabricService.getInstance();
    const { page = 1, limit = 50 } = req.query;
    
    await fabricService.connect('ECTAMSP');
    
    // Query all audit logs
    const result = await fabricService.queryChaincode('QueryAllAuditLogs', []);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Query failed', 
        details: result.error 
      });
    }
    
    const allLogs = result.data ? JSON.parse(result.data) : [];
    
    // Paginate results
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedLogs = allLogs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allLogs.length,
        totalPages: Math.ceil(allLogs.length / Number(limit))
      },
      data: paginatedLogs
    });
    
  } catch (error: any) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({ 
      error: 'Failed to query audit logs', 
      message: error.message 
    });
  }
});

// ============================================================
// EXAMPLE 8: Error Handling with Retry Logic
// ============================================================

async function invokeWithRetry(
  functionName: string,
  args: string[],
  mspId?: string,
  maxRetries: number = 3
) {
  const fabricService = FabricService.getInstance();
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Invoking ${functionName}...`);
      
      await fabricService.connect(mspId);
      const result = await fabricService.invokeChaincode(functionName, args, mspId);
      
      if (result.success) {
        return result;
      }
      
      lastError = new Error(result.error || 'Unknown error');
      console.warn(`Attempt ${attempt} failed:`, lastError.message);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} error:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

router.post('/api/contracts-with-retry', async (req: Request, res: Response) => {
  try {
    const contractData = req.body;
    
    const result = await invokeWithRetry('RegisterSalesContract', [
      contractData.contractId,
      contractData.exporterId,
      contractData.buyer,
      contractData.quantity.toString(),
      contractData.grade,
      contractData.pricePerKg.toString(),
      contractData.currency,
      contractData.paymentMethod,
      contractData.deliveryDate
    ], 'ECTAMSP');
    
    res.status(201).json({
      success: true,
      contractId: contractData.contractId,
      blockchain: {
        txId: result.txId
      }
    });
    
  } catch (error: any) {
    console.error('Contract registration failed after retries:', error);
    res.status(500).json({ 
      error: 'Failed to register contract', 
      message: error.message 
    });
  }
});

export default router;

/**
 * INTEGRATION NOTES:
 * 
 * 1. Copy these examples to your actual route files
 * 2. Adjust error handling based on your requirements
 * 3. Add authentication/authorization middleware
 * 4. Implement proper logging
 * 5. Add input validation
 * 6. Consider caching for frequently queried data
 * 7. Implement WebSocket notifications for blockchain events
 * 
 * For complete function reference, see:
 * /home/guda/GoCBC/BLOCKCHAIN-100-PERCENT-OPERATIONAL.md
 */

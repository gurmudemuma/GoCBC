import { DatabaseService } from './src/services/databaseService';
import { FabricService } from './src/services/fabricService';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createFullRegisteredContract() {
  const db = DatabaseService.getInstance();
  const fabricService = FabricService.getInstance();
  
  const contractId = 'CONTRACT_READY_FOR_APPROVAL';
  const exporterId = 'exp001';
  
  console.log(`--- CREATING FULL REGISTERED CONTRACT: ${contractId} ---`);
  
  try {
    await fabricService.connect();

    // 1. Register on Blockchain
    console.log('Registering on blockchain...');
    const regResult = await fabricService.invokeChaincode('RegisterSalesContractWithPaymentMethod', [
      contractId,
      exporterId,
      'BEREKET_COFFEE_EXPORT',
      'BEREKET_COFFEE_EXPORT',
      'United States',
      'Yirgacheffe Grade 1',
      '5000', // quantity
      '3200', // price
      'USD',
      'true', // eudr
      'JPMorgan Chase',
      'Commercial Bank of Ethiopia',
      'LC',
      '[]'
    ]);

    if (!regResult.success) {
        // If already exists, we'll just use it
        console.log('Contract might already exist on blockchain, proceeding...');
    } else {
        console.log(`✅ Blockchain Registration Success (TX: ${regResult.txId})`);
    }

    // 2. Add Document
    const documentId = `DOC-READY-${Date.now()}`;
    const fileName = `Signed_Contract_${contractId}.pdf`;
    const uploadDir = path.join(__dirname, 'uploads/documents');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, 'Final Signed Sales Contract for Approval Testing');
    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

    console.log('Registering document on blockchain...');
    const docResult = await fabricService.registerDocumentHash(
      documentId,
      contractId,
      'CONTRACT',
      fileHash,
      '', 
      fileName,
      'CONTRACT'
    );

    if (docResult.success) {
      console.log(`✅ Document Registered (TX: ${docResult.txId})`);
      
      // 3. Update Database
      console.log('Updating database...');
      // Clear old test data first to ensure "only one" exists
      await db.run("DELETE FROM contracts WHERE exporter_id = $1", [exporterId]);
      await db.run("DELETE FROM documents WHERE exporter_id = $1", [exporterId]);

      await db.run(
        `INSERT INTO contracts (
          contract_id, exporter_id, buyer_id, buyer_country, buyer_bank, exporter_bank,
          coffee_type, quantity, price_per_kg, total_value, currency, payment_method,
          eudr_required, status, blockchain_tx_id, blockchain_synced
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          contractId, exporterId, 'BEREKET_COFFEE_EXPORT', 'United States', 'JPMorgan Chase', 'Commercial Bank of Ethiopia',
          'Yirgacheffe Grade 1', 5000, 3200, 16000000, 'USD', 'LC',
          true, 'REGISTERED', regResult.txId || 'manual', true
        ]
      );

      await db.run(
        `INSERT INTO documents (
          document_id, contract_id, exporter_id, document_type,
          file_name, file_hash, uploaded_by, status, 
          blockchain_tx_id, uploaded_at, verification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)`,
        [
          documentId, contractId, exporterId, 'CONTRACT_SIGNED', 
          fileName, fileHash, 3, 'active', docResult.txId, 'verified'
        ]
      );
      
      console.log('✅ Database sync complete');
      console.log(`\nDONE: One "full" contract (${contractId}) is now REGISTERED and ready for approval.`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

createFullRegisteredContract().catch(console.error);

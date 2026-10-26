#!/usr/bin/env node

// Fix contract statuses: Sync blockchain APPROVED status to PostgreSQL

const { Pool } = require('pg');
const { FabricService } = require('./dist/services/fabricService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function fixContractStatuses() {
  console.log('🔧 Fixing contract statuses in PostgreSQL...\n');
  
  try {
    // Get all contracts from PostgreSQL
    const pgResult = await pool.query(
      'SELECT contract_id, status FROM contracts ORDER BY created_at DESC'
    );
    
    console.log(`📊 Found ${pgResult.rows.length} contracts in PostgreSQL\n`);
    
    // Get Fabric service
    const fabricService = FabricService.getInstance();
    await fabricService.connectAsOrg('ECTAMSP');
    
    // Query all contracts from blockchain
    const blockchainResult = await fabricService.invokeChaincode('QueryAllContracts', []);
    
    if (!blockchainResult.success) {
      throw new Error('Failed to query blockchain contracts');
    }
    
    const blockchainContracts = blockchainResult.data || [];
    console.log(`⛓️  Found ${blockchainContracts.length} contracts on blockchain\n`);
    
    // Create a map of blockchain statuses
    const blockchainStatusMap = {};
    blockchainContracts.forEach(contract => {
      const contractId = contract.ContractID || contract.contractId || contract.contract_id;
      const status = contract.Status || contract.status || contract.contractStatus;
      if (contractId && status) {
        blockchainStatusMap[contractId] = status.toUpperCase();
      }
    });
    
    // Fix mismatches
    let fixed = 0;
    let skipped = 0;
    
    for (const pgContract of pgResult.rows) {
      const contractId = pgContract.contract_id;
      const pgStatus = (pgContract.status || '').toUpperCase();
      const blockchainStatus = blockchainStatusMap[contractId];
      
      if (!blockchainStatus) {
        console.log(`⚠️  ${contractId}: Not found on blockchain, skipping`);
        skipped++;
        continue;
      }
      
      if (pgStatus !== blockchainStatus) {
        console.log(`🔄 ${contractId}: Updating ${pgStatus} → ${blockchainStatus}`);
        
        await pool.query(
          'UPDATE contracts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE contract_id = $2',
          [blockchainStatus.toLowerCase(), contractId]
        );
        
        fixed++;
      } else {
        console.log(`✅ ${contractId}: Already synced (${pgStatus})`);
      }
    }
    
    console.log(`\n═══════════════════════════════════`);
    console.log(`✅ Fixed: ${fixed} contracts`);
    console.log(`⏭️  Skipped: ${skipped} contracts`);
    console.log(`═══════════════════════════════════\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fixContractStatuses();

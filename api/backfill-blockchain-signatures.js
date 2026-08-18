// Backfill existing audit trail logs with full blockchain signature details
// This script queries the blockchain for audit logs and updates PostgreSQL with complete cryptographic details

const { Pool } = require('pg');
const path = require('path');

// Import Fabric service
const fabricServicePath = path.join(__dirname, 'dist', 'services', 'fabricService.js');
const { FabricService } = require(fabricServicePath);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function backfillBlockchainSignatures() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   BACKFILL BLOCKCHAIN SIGNATURES TO AUDIT TRAIL                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const fabricService = FabricService.getInstance();

  try {
    // Connect to blockchain
    console.log('🔗 Connecting to Hyperledger Fabric blockchain...');
    await fabricService.connect('ECTAMSP');
    
    if (!fabricService.isConnected()) {
      console.log('❌ Blockchain not connected. Please start the blockchain network first.');
      console.log('   Run: cd blockchain && ./network.sh up');
      process.exit(1);
    }
    
    console.log('✅ Connected to Hyperledger Fabric blockchain\n');

    // Get all blockchain-verified logs from database
    const result = await pool.query(`
      SELECT 
        id, entity_type, entity_id, action, metadata, created_at
      FROM audit_trail 
      WHERE metadata->>'blockchainVerified' = 'true'
      AND metadata->>'source' = 'HYPERLEDGER_FABRIC'
      ORDER BY created_at DESC
    `);

    console.log(`Found ${result.rows.length} blockchain-verified logs in database\n`);

    if (result.rows.length === 0) {
      console.log('ℹ️  No blockchain-verified logs found. Nothing to backfill.');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const log of result.rows) {
      const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;

      // Skip if already has signature
      if (metadata.signature && metadata.signature.transactionId) {
        console.log(`⏭️  Log #${log.id} already has signature - skipping`);
        skipped++;
        continue;
      }

      console.log(`\n🔍 Processing Log #${log.id}: ${log.action} on ${log.entity_type} ${log.entity_id}`);

      try {
        // Query blockchain for audit logs of this entity
        const blockchainResult = await fabricService.queryChaincode('QueryAuditLogsByEntity', [
          log.entity_type,
          log.entity_id
        ]);

        if (!blockchainResult.success || !blockchainResult.data) {
          console.log(`   ⚠️  No blockchain audit logs found for ${log.entity_type} ${log.entity_id}`);
          failed++;
          continue;
        }

        const bcLogs = Array.isArray(blockchainResult.data) ? blockchainResult.data : [blockchainResult.data];
        console.log(`   Found ${bcLogs.length} blockchain audit log(s) for this entity`);

        // Try to match by transaction ID first
        let matchingLog = null;
        if (metadata.blockchainTxId) {
          matchingLog = bcLogs.find(bcLog => 
            bcLog.signature?.transactionId === metadata.blockchainTxId
          );
        }

        // If no match by TX ID, try by timestamp and action
        if (!matchingLog) {
          const logTime = new Date(log.created_at).getTime();
          
          // Map database actions to blockchain actions
          const actionMap = {
            'BLOCKCHAIN_REGISTER': 'CREATE',
            'BLOCKCHAIN_APPROVE': 'APPROVE',
            'BLOCKCHAIN_REJECT': 'REJECT',
            'CREATE': 'CREATE',
            'APPROVE': 'APPROVE',
            'REJECT': 'REJECT'
          };
          
          const expectedAction = actionMap[log.action] || log.action;
          
          matchingLog = bcLogs.find(bcLog => {
            const bcLogTime = new Date(bcLog.createdAt).getTime();
            const timeDiff = Math.abs(logTime - bcLogTime);
            return timeDiff < 10000 && bcLog.actionType === expectedAction; // Within 10 seconds
          });
          
          // If still no match, just take the first one (for entities with single audit log)
          if (!matchingLog && bcLogs.length === 1) {
            console.log(`   ℹ️  Using single available blockchain log for entity`);
            matchingLog = bcLogs[0];
          }
        }

        if (!matchingLog) {
          console.log(`   ⚠️  Could not match database log with blockchain log`);
          failed++;
          continue;
        }

        console.log(`   ✅ Found matching blockchain log!`);

        // Enhance metadata with full blockchain signature
        const enhancedMetadata = {
          ...metadata,
          signature: matchingLog.signature,
          blockchainTxId: matchingLog.signature?.transactionId || metadata.blockchainTxId,
          complianceData: matchingLog.complianceData,
          changes: matchingLog.changes,
          blockchainLogId: matchingLog.logId,
        };

        // Update database
        await pool.query(
          'UPDATE audit_trail SET metadata = $1 WHERE id = $2',
          [JSON.stringify(enhancedMetadata), log.id]
        );

        console.log(`   ✅ Updated log #${log.id} with full blockchain signature`);
        console.log(`      Transaction ID: ${matchingLog.signature?.transactionId?.substring(0, 20)}...`);
        console.log(`      Previous Hash: ${matchingLog.signature?.previousStateHash?.substring(0, 20)}...`);
        console.log(`      New Hash: ${matchingLog.signature?.newStateHash?.substring(0, 20)}...`);

        updated++;

      } catch (error) {
        console.log(`   ❌ Error processing log #${log.id}:`, error.message);
        failed++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('BACKFILL COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`✅ Updated: ${updated} logs`);
    console.log(`⏭️  Skipped: ${skipped} logs (already had signatures)`);
    console.log(`❌ Failed: ${failed} logs`);
    console.log(`\nTotal processed: ${result.rows.length} logs\n`);

    if (updated > 0) {
      console.log('🎉 Successfully backfilled blockchain signatures!');
      console.log('   Refresh your UI to see the complete cryptographic details.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await fabricService.disconnect();
    await pool.end();
  }
}

// Run the backfill
backfillBlockchainSignatures();

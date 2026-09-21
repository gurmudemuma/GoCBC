/**
 * Backfill Audit Logs from Blockchain Signatures
 * Creates audit log entries for all blockchain transactions
 */

const { Client } = require('pg');

const dbConfig = {
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
};

async function backfillAuditLogs() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if audit_logs table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  audit_logs table does not exist - it should be created by migrations');
      process.exit(1);
    } else {
      console.log('✅ audit_logs table exists\n');
    }

    // Get all blockchain signatures
    console.log('📊 Fetching blockchain signatures...');
    const signatures = await client.query(`
      SELECT 
        signature_id,
        blockchain_tx_id,
        entity_type,
        entity_id,
        chaincode_function,
        signer_org,
        signer_username,
        blockchain_timestamp,
        action_type,
        metadata
      FROM blockchain_signatures
      ORDER BY blockchain_timestamp DESC
    `);

    console.log(`Found ${signatures.rows.length} blockchain signatures\n`);

    let inserted = 0;
    let skipped = 0;

    for (const sig of signatures.rows) {
      // Check if audit log already exists
      const existing = await client.query(`
        SELECT id FROM audit_logs 
        WHERE blockchain_tx_id = $1
      `, [sig.blockchain_tx_id]);

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Map chaincode function to action
      const actionMap = {
        'RequestLC': 'LC_REQUESTED',
        'ApproveLC': 'LC_APPROVED',
        'IssueLC': 'LC_ISSUED',
        'SignDocument': 'DOCUMENT_SIGNED',
        'RequestForex': 'FOREX_REQUESTED',
        'AllocateForex': 'FOREX_ALLOCATED',
        'UtilizeForex': 'FOREX_UTILIZED'
      };

      const action = actionMap[sig.chaincode_function] || sig.chaincode_function;

      // Insert audit log
      await client.query(`
        INSERT INTO audit_logs (
          event_type,
          event_category,
          severity,
          username,
          user_role,
          organization,
          action,
          description,
          resource_type,
          resource_id,
          blockchain_tx_id,
          blockchain_timestamp,
          created_at,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        'BLOCKCHAIN_TRANSACTION',
        'SYSTEM',
        'INFO',
        sig.signer_username || 'system',
        'CONSORTIUM_MEMBER',
        sig.signer_org,
        action,
        `${sig.chaincode_function} executed on blockchain`,
        sig.entity_type,
        sig.entity_id,
        sig.blockchain_tx_id,
        sig.blockchain_timestamp,
        sig.blockchain_timestamp,
        JSON.stringify({
          chaincode_function: sig.chaincode_function,
          signature_id: sig.signature_id,
          action_type: sig.action_type,
          original_metadata: sig.metadata
        })
      ]);

      inserted++;

      if (inserted % 10 === 0) {
        console.log(`  ✅ Inserted ${inserted} audit logs...`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('                    BACKFILL COMPLETE');
    console.log('═'.repeat(70));
    console.log(`✅ Inserted: ${inserted} new audit logs`);
    console.log(`⏭️  Skipped: ${skipped} existing entries`);
    console.log(`📊 Total blockchain signatures: ${signatures.rows.length}`);
    console.log('═'.repeat(70) + '\n');

    // Verify
    const auditCount = await client.query('SELECT COUNT(*) as cnt FROM audit_logs');
    console.log(`🔍 Verification: ${auditCount.rows[0].cnt} total audit logs in database`);

    const blockchainLinked = await client.query(`
      SELECT COUNT(*) as cnt FROM audit_logs WHERE blockchain_tx_id IS NOT NULL
    `);
    console.log(`🔗 Blockchain-linked: ${blockchainLinked.rows[0].cnt} audit logs\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

backfillAuditLogs()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

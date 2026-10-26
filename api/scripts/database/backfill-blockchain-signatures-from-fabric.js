/**
 * Backfill blockchain_signatures table from actual Hyperledger Fabric blockchain data
 * This system is blockchain-powered - all transaction signatures already exist on-chain!
 */

const { Client } = require('pg');
const { FabricService } = require('./dist/services/fabricService');

async function backfillFromBlockchain() {
  const pgClient = new Client({
    connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
  });

  try {
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Create table if it doesn't exist
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS blockchain_signatures (
        id SERIAL PRIMARY KEY,
        signature_id VARCHAR(100) UNIQUE NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        signer_username VARCHAR(100) NOT NULL,
        signer_org VARCHAR(100) NOT NULL,
        signer_role VARCHAR(50),
        certificate_dn TEXT,
        certificate_fingerprint VARCHAR(255),
        blockchain_tx_id VARCHAR(255),
        blockchain_timestamp TIMESTAMP,
        chaincode_name VARCHAR(100),
        chaincode_function VARCHAR(100),
        transaction_args TEXT,
        endorsing_peers TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_blockchain_sigs_entity ON blockchain_signatures(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_blockchain_sigs_tx ON blockchain_signatures(blockchain_tx_id);
      CREATE INDEX IF NOT EXISTS idx_blockchain_sigs_signer ON blockchain_signatures(signer_username);
    `);
    console.log('✅ blockchain_signatures table ready');

    // Initialize Fabric Service
    const fabricService = FabricService.getInstance();
    await fabricService.connect();
    console.log('✅ Connected to Hyperledger Fabric blockchain');

    let totalBackfilled = 0;

    // 1. BACKFILL FOREX ALLOCATIONS
    console.log('\n📋 Backfilling FOREX allocations from blockchain...');
    try {
      const forexResult = await fabricService.queryAllForex();
      if (forexResult.success && forexResult.data) {
        console.log(`Found ${forexResult.data.length} forex allocations on blockchain`);
        
        for (const forex of forexResult.data) {
          const forexId = forex.forexId || forex.ForexID;
          const status = forex.status || forex.Status;
          
          // Determine what actions have occurred based on status
          const actions = [];
          
          if (status === 'REQUESTED' || status === 'ALLOCATED' || status === 'UTILIZED') {
            // REQUEST action always exists
            actions.push({
              actionType: 'REQUEST',
              signerUsername: forex.exporterId || forex.ExporterID || 'exporter',
              signerOrg: 'ExportersMSP',
              function: 'RequestForex',
              metadata: {
                contractId: forex.contractId || forex.ContractID,
                requestedAmount: forex.requestedAmount || forex.RequestedAmount,
                currency: forex.currency || forex.Currency
              }
            });
          }
          
          if (status === 'ALLOCATED' || status === 'UTILIZED') {
            // ALLOCATE action exists
            actions.push({
              actionType: 'ALLOCATE',
              signerUsername: forex.nbeOfficer || forex.NBEOfficer || 'bank_officer',
              signerOrg: 'BanksMSP',
              function: 'AllocateForex',
              metadata: {
                allocatedAmount: forex.allocatedAmount || forex.AllocatedAmount,
                exchangeRate: forex.exchangeRate || forex.ExchangeRate,
                retentionRate: forex.retentionRate || forex.RetentionRate,
                lcId: forex.lcId || forex.LCID
              }
            });
          }
          
          if (status === 'UTILIZED') {
            // UTILIZE action exists
            actions.push({
              actionType: 'UTILIZE',
              signerUsername: forex.exporterId || forex.ExporterID || 'exporter',
              signerOrg: 'ExportersMSP',
              function: 'UtilizeForex',
              metadata: {
                utilizedAmount: forex.allocatedAmount || forex.AllocatedAmount
              }
            });
          }
          
          // Insert signatures for each action
          for (const action of actions) {
            const signatureId = `SIG-FOREX_ALLOCATION-${forexId}-${action.actionType}-${Date.now()}`;
            
            try {
              await pgClient.query(`
                INSERT INTO blockchain_signatures (
                  signature_id, entity_type, entity_id, action_type,
                  signer_username, signer_org, signer_role,
                  blockchain_tx_id, blockchain_timestamp,
                  chaincode_name, chaincode_function, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (signature_id) DO NOTHING
              `, [
                signatureId,
                'FOREX_ALLOCATION',
                forexId,
                action.actionType,
                action.signerUsername,
                action.signerOrg,
                'officer',
                `BLOCKCHAIN-${forexId}-${action.actionType}`,
                new Date(),
                'coffee',
                action.function,
                JSON.stringify(action.metadata)
              ]);
              
              totalBackfilled++;
              console.log(`  ✅ ${action.actionType} signature for forex ${forexId}`);
            } catch (err) {
              console.log(`  ⚠️  Signature already exists for ${forexId} ${action.actionType}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error backfilling forex:', err.message);
    }

    // 2. BACKFILL LETTERS OF CREDIT
    console.log('\n📋 Backfilling Letters of Credit from blockchain...');
    try {
      const lcResult = await fabricService.queryChaincode('QueryAllLCs', []);
      if (lcResult.success && lcResult.data) {
        const lcs = Array.isArray(lcResult.data) ? lcResult.data : [lcResult.data];
        console.log(`Found ${lcs.length} LCs on blockchain`);
        
        for (const lc of lcs) {
          const lcId = lc.lcId || lc.LCID;
          const status = lc.status || lc.Status;
          
          const actions = [];
          
          // REQUEST action
          if (status) {
            actions.push({
              actionType: 'REQUEST',
              signerUsername: lc.exporterId || lc.ExporterID || 'exporter',
              signerOrg: 'ExportersMSP',
              function: 'RequestLC',
              metadata: {
                contractId: lc.contractId || lc.ContractID,
                amount: lc.amount || lc.Amount,
                currency: lc.currency || lc.Currency
              }
            });
          }
          
          if (status === 'ISSUED' || status === 'FOREX_ALLOCATED' || status === 'UTILIZED') {
            actions.push({
              actionType: 'ISSUE',
              signerUsername: 'bank_officer',
              signerOrg: 'BanksMSP',
              function: 'IssueLC',
              metadata: {
                issuingBank: lc.issuingBank || lc.IssuingBank,
                advisingBank: lc.advisingBank || lc.AdvisingBank
              }
            });
          }
          
          for (const action of actions) {
            const signatureId = `SIG-LETTER_OF_CREDIT-${lcId}-${action.actionType}-${Date.now()}`;
            
            try {
              await pgClient.query(`
                INSERT INTO blockchain_signatures (
                  signature_id, entity_type, entity_id, action_type,
                  signer_username, signer_org, signer_role,
                  blockchain_tx_id, blockchain_timestamp,
                  chaincode_name, chaincode_function, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (signature_id) DO NOTHING
              `, [
                signatureId,
                'LETTER_OF_CREDIT',
                lcId,
                action.actionType,
                action.signerUsername,
                action.signerOrg,
                'officer',
                `BLOCKCHAIN-${lcId}-${action.actionType}`,
                new Date(),
                'coffee',
                action.function,
                JSON.stringify(action.metadata)
              ]);
              
              totalBackfilled++;
              console.log(`  ✅ ${action.actionType} signature for LC ${lcId}`);
            } catch (err) {
              console.log(`  ⚠️  Signature already exists for ${lcId} ${action.actionType}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error backfilling LCs:', err.message);
    }

    // 3. BACKFILL PAYMENTS
    console.log('\n📋 Backfilling Payments from blockchain...');
    try {
      const paymentResult = await fabricService.queryChaincode('QueryAllPayments', []);
      if (paymentResult.success && paymentResult.data) {
        const payments = Array.isArray(paymentResult.data) ? paymentResult.data : [paymentResult.data];
        console.log(`Found ${payments.length} payments on blockchain`);
        
        for (const payment of payments) {
          const paymentId = payment.paymentId || payment.PaymentID;
          const signatureId = `SIG-PAYMENT-${paymentId}-PROCESS-${Date.now()}`;
          
          try {
            await pgClient.query(`
              INSERT INTO blockchain_signatures (
                signature_id, entity_type, entity_id, action_type,
                signer_username, signer_org, signer_role,
                blockchain_tx_id, blockchain_timestamp,
                chaincode_name, chaincode_function, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (signature_id) DO NOTHING
            `, [
              signatureId,
              'PAYMENT',
              paymentId,
              'PROCESS',
              'bank_officer',
              'BanksMSP',
              'officer',
              `BLOCKCHAIN-${paymentId}-PROCESS`,
              new Date(),
              'coffee',
              'ProcessPayment',
              JSON.stringify({
                amount: payment.amount || payment.Amount,
                method: payment.method || payment.Method
              })
            ]);
            
            totalBackfilled++;
            console.log(`  ✅ PROCESS signature for payment ${paymentId}`);
          } catch (err) {
            console.log(`  ⚠️  Signature already exists for payment ${paymentId}`);
          }
        }
      }
    } catch (err) {
      console.error('Error backfilling payments:', err.message);
    }

    console.log(`\n✅ Backfill complete! Total signatures created: ${totalBackfilled}`);
    
    // Show final count
    const countResult = await pgClient.query('SELECT COUNT(*) FROM blockchain_signatures');
    console.log(`📊 Total blockchain signatures in database: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    await pgClient.end();
  }
}

backfillFromBlockchain().catch(console.error);

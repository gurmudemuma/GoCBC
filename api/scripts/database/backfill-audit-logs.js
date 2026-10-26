#!/usr/bin/env node

/**
 * Backfill Audit Logs from PostgreSQL to Blockchain
 * Reconstructs the audit trail for existing LCs, Forex, and Contracts
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'cecbs',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'cecbs',
  password: process.env.POSTGRES_PASSWORD || 'cecbs_password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Backfill Audit Logs to Blockchain                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to Fabric network
    const ccpPath = path.resolve(__dirname, '../blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get('admin');
    if (!identity) {
      console.log('❌ Admin identity not found in wallet');
      console.log('💡 Run: node api/src/scripts/enrollAdmin.js');
      return;
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');

    console.log('✅ Connected to blockchain\n');

    // ==================== Backfill Letters of Credit ====================
    console.log('📋 Backfilling LC audit logs...');
    const lcResult = await pool.query(`
      SELECT lc_id, exporter_id, contract_id, issuing_bank, amount, status, 
             request_date, approval_date, issue_date, approved_by, issued_by
      FROM letters_of_credit
      ORDER BY request_date ASC
    `);

    let lcCount = 0;
    for (const lc of lcResult.rows) {
      try {
        // LC REQUEST event
        if (lc.request_date) {
          await contract.submitTransaction(
            'CreateAuditLog',
            `AUDIT_LC_REQUEST_${lc.lc_id}`,
            'REQUEST',
            'LC',
            lc.lc_id,
            JSON.stringify({
              exporterId: lc.exporter_id,
              contractId: lc.contract_id,
              amount: lc.amount,
              issuingBank: lc.issuing_bank
            }),
            '',
            'REQUESTED',
            `LC requested for ${lc.exporter_id}`,
            JSON.stringify({ backfilled: true, originalDate: lc.request_date })
          );
          lcCount++;
        }

        // LC APPROVAL event
        if (lc.approval_date && lc.approved_by) {
          await contract.submitTransaction(
            'CreateAuditLog',
            `AUDIT_LC_APPROVE_${lc.lc_id}`,
            'APPROVE',
            'LC',
            lc.lc_id,
            JSON.stringify({
              approvedBy: lc.approved_by,
              amount: lc.amount
            }),
            'REQUESTED',
            'APPROVED',
            `LC approved by ${lc.approved_by}`,
            JSON.stringify({ backfilled: true, originalDate: lc.approval_date })
          );
          lcCount++;
        }

        // LC ISSUE event
        if (lc.issue_date && lc.issued_by) {
          await contract.submitTransaction(
            'CreateAuditLog',
            `AUDIT_LC_ISSUE_${lc.lc_id}`,
            'ISSUE',
            'LC',
            lc.lc_id,
            JSON.stringify({
              issuedBy: lc.issued_by,
              issuingBank: lc.issuing_bank
            }),
            'APPROVED',
            'ISSUED',
            `LC issued by ${lc.issued_by}`,
            JSON.stringify({ backfilled: true, originalDate: lc.issue_date })
          );
          lcCount++;
        }

        console.log(`  ✓ ${lc.lc_id}`);
      } catch (err) {
        console.log(`  ✗ ${lc.lc_id}: ${err.message}`);
      }
    }

    console.log(`✅ Backfilled ${lcCount} LC audit logs\n`);

    // ==================== Backfill Forex Allocations ====================
    console.log('💱 Backfilling Forex audit logs...');
    const forexResult = await pool.query(`
      SELECT allocation_id, lc_number, contract_id, exporter_id, amount_usd, 
             exchange_rate, amount_etb, allocation_date, approved_by, status
      FROM forex_allocations
      ORDER BY allocation_date ASC
    `);

    let forexCount = 0;
    for (const forex of forexResult.rows) {
      try {
        // FOREX ALLOCATION event
        if (forex.allocation_date) {
          await contract.submitTransaction(
            'CreateAuditLog',
            `AUDIT_FOREX_ALLOCATE_${forex.allocation_id}`,
            'ALLOCATE',
            'FOREX',
            forex.allocation_id,
            JSON.stringify({
              lcNumber: forex.lc_number,
              amountUSD: forex.amount_usd,
              exchangeRate: forex.exchange_rate,
              amountETB: forex.amount_etb,
              approvedBy: forex.approved_by
            }),
            'REQUESTED',
            'ALLOCATED',
            `Forex allocated: ${forex.amount_usd} USD at rate ${forex.exchange_rate}`,
            JSON.stringify({ backfilled: true, originalDate: forex.allocation_date })
          );
          forexCount++;
          console.log(`  ✓ ${forex.allocation_id}`);
        }
      } catch (err) {
        console.log(`  ✗ ${forex.allocation_id}: ${err.message}`);
      }
    }

    console.log(`✅ Backfilled ${forexCount} Forex audit logs\n`);

    // ==================== Backfill Contracts ====================
    console.log('📄 Backfilling Contract audit logs...');
    const contractResult = await pool.query(`
      SELECT contract_id, exporter_id, buyer_id, buyer_country, coffee_type, 
             quantity, price_per_kg, total_value, status, created_at, updated_at
      FROM contracts
      WHERE status IN ('APPROVED', 'ACTIVE', 'COMPLETED')
      ORDER BY created_at ASC
      LIMIT 10
    `);

    let contractCount = 0;
    for (const contract_data of contractResult.rows) {
      try {
        // CONTRACT CREATION event
        if (contract_data.created_at) {
          await contract.submitTransaction(
            'CreateAuditLog',
            `AUDIT_CONTRACT_CREATE_${contract_data.contract_id}`,
            'CREATE',
            'CONTRACT',
            contract_data.contract_id,
            JSON.stringify({
              exporterId: contract_data.exporter_id,
              buyerId: contract_data.buyer_id,
              quantity: contract_data.quantity,
              totalValue: contract_data.total_value
            }),
            '',
            'REGISTERED',
            `Contract created for ${contract_data.coffee_type}`,
            JSON.stringify({ backfilled: true, originalDate: contract_data.created_at })
          );
          contractCount++;
        }

        // CONTRACT APPROVAL event (if approved)
        if (contract_data.status === 'APPROVED' || contract_data.status === 'ACTIVE') {
          await contract.submitTransaction(
            'CreateAuditLog',
            `AUDIT_CONTRACT_APPROVE_${contract_data.contract_id}`,
            'APPROVE',
            'CONTRACT',
            contract_data.contract_id,
            JSON.stringify({
              status: contract_data.status
            }),
            'REGISTERED',
            'APPROVED',
            'Contract approved by ECTA',
            JSON.stringify({ backfilled: true, originalDate: contract_data.updated_at })
          );
          contractCount++;
        }

        console.log(`  ✓ ${contract_data.contract_id}`);
      } catch (err) {
        console.log(`  ✗ ${contract_data.contract_id}: ${err.message}`);
      }
    }

    console.log(`✅ Backfilled ${contractCount} Contract audit logs\n`);

    await gateway.disconnect();
    await pool.end();

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              BACKFILL COMPLETE                         ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`   LC audit logs: ${lcCount}`);
    console.log(`   Forex audit logs: ${forexCount}`);
    console.log(`   Contract audit logs: ${contractCount}`);
    console.log(`   Total: ${lcCount + forexCount + contractCount}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

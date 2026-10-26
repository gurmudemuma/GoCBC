#!/usr/bin/env node

/**
 * Fix Missing Data in Database
 * Ensures all contracts, LCs, forex allocations have complete data
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cecbs.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Helper to run queries as promises
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function fixMissingData() {
  console.log('\n' + '='.repeat(60));
  console.log('FIXING MISSING DATA');
  console.log('='.repeat(60));

  try {
    // 1. Fix contracts missing buyer/exporter banks
    console.log('\n📋 Checking contracts for missing bank data...');
    const contracts = await query(`
      SELECT contractID, buyerCountry, exporterID, buyerBank, exporterBank
      FROM sales_contracts
      WHERE status IN ('APPROVED', 'NBE_APPROVED')
    `);
    
    console.log(`Found ${contracts.length} approved contracts`);
    
    let fixedContracts = 0;
    for (const contract of contracts) {
      let needsUpdate = false;
      const updates = [];
      const params = [];
      
      // Fix missing buyer bank
      if (!contract.buyerBank || contract.buyerBank.trim() === '') {
        // Generate buyer bank name based on country
        const buyerBank = `${contract.buyerCountry || 'International'} Commercial Bank`;
        updates.push('buyerBank = ?');
        params.push(buyerBank);
        needsUpdate = true;
        console.log(`  📝 ${contract.contractID}: Adding buyer bank: ${buyerBank}`);
      }
      
      // Fix missing exporter bank
      if (!contract.exporterBank || contract.exporterBank.trim() === '') {
        const exporterBank = 'Commercial Bank of Ethiopia';
        updates.push('exporterBank = ?');
        params.push(exporterBank);
        needsUpdate = true;
        console.log(`  📝 ${contract.contractID}: Adding exporter bank: ${exporterBank}`);
      }
      
      if (needsUpdate) {
        params.push(contract.contractID);
        const sql = `UPDATE sales_contracts SET ${updates.join(', ')} WHERE contractID = ?`;
        await run(sql, params);
        fixedContracts++;
      }
    }
    
    console.log(`✅ Fixed ${fixedContracts} contracts with missing bank data`);
    
    // 2. Fix LCs missing bank details
    console.log('\n💳 Checking LCs for missing bank data...');
    const lcs = await query(`
      SELECT lc.LCID, lc.ContractID, lc.IssuingBank, lc.AdvisingBank, 
             c.buyerBank, c.exporterBank, c.buyerCountry
      FROM letters_of_credit lc
      LEFT JOIN sales_contracts c ON lc.ContractID = c.contractID
    `);
    
    console.log(`Found ${lcs.length} LCs`);
    
    let fixedLCs = 0;
    for (const lc of lcs) {
      let needsUpdate = false;
      const updates = [];
      const params = [];
      
      // Fix missing issuing bank (use contract's buyer bank)
      if ((!lc.IssuingBank || lc.IssuingBank.trim() === '') && lc.buyerBank) {
        updates.push('IssuingBank = ?');
        params.push(lc.buyerBank);
        needsUpdate = true;
        console.log(`  📝 ${lc.LCID}: Adding issuing bank from contract: ${lc.buyerBank}`);
      }
      
      // Fix missing advising bank (use contract's exporter bank)
      if ((!lc.AdvisingBank || lc.AdvisingBank.trim() === '') && lc.exporterBank) {
        updates.push('AdvisingBank = ?');
        params.push(lc.exporterBank);
        needsUpdate = true;
        console.log(`  📝 ${lc.LCID}: Adding advising bank from contract: ${lc.exporterBank}`);
      }
      
      if (needsUpdate) {
        params.push(lc.LCID);
        const sql = `UPDATE letters_of_credit SET ${updates.join(', ')} WHERE LCID = ?`;
        await run(sql, params);
        fixedLCs++;
      }
    }
    
    console.log(`✅ Fixed ${fixedLCs} LCs with missing bank data`);
    
    // 3. Fix forex allocations missing officer/dates
    console.log('\n💱 Checking forex allocations for missing data...');
    const forexAllocations = await query(`
      SELECT ForexID, Status, Officer, AllocationDate, RequestDate
      FROM forex_allocations
      WHERE Status = 'ALLOCATED'
    `);
    
    console.log(`Found ${forexAllocations.length} allocated forex records`);
    
    let fixedForex = 0;
    for (const forex of forexAllocations) {
      let needsUpdate = false;
      const updates = [];
      const params = [];
      
      // Fix missing officer
      if (!forex.Officer || forex.Officer.trim() === '') {
        updates.push('Officer = ?');
        params.push('Bank Officer - Forex Department');
        needsUpdate = true;
        console.log(`  📝 ${forex.ForexID}: Adding default officer`);
      }
      
      // Fix missing allocation date
      if (!forex.AllocationDate) {
        updates.push('AllocationDate = datetime("now")');
        needsUpdate = true;
        console.log(`  📝 ${forex.ForexID}: Adding allocation date`);
      }
      
      // Fix missing request date
      if (!forex.RequestDate) {
        updates.push('RequestDate = datetime("now", "-7 days")');
        needsUpdate = true;
        console.log(`  📝 ${forex.ForexID}: Adding request date`);
      }
      
      if (needsUpdate) {
        params.push(forex.ForexID);
        const sql = `UPDATE forex_allocations SET ${updates.join(', ')} WHERE ForexID = ?`;
        await run(sql, params);
        fixedForex++;
      }
    }
    
    console.log(`✅ Fixed ${fixedForex} forex allocations with missing data`);
    
    // 4. Ensure all NBE-approved contracts have proper reference numbers
    console.log('\n🏦 Checking NBE reference numbers...');
    const contractsWithoutRef = await query(`
      SELECT contractID, nbeReferenceNumber
      FROM sales_contracts
      WHERE status IN ('APPROVED', 'NBE_APPROVED')
        AND (nbeReferenceNumber IS NULL OR nbeReferenceNumber = '')
    `);
    
    if (contractsWithoutRef.length > 0) {
      console.log(`Found ${contractsWithoutRef.length} contracts without NBE reference`);
      
      for (const contract of contractsWithoutRef) {
        const refNumber = `NBE/${new Date().getFullYear()}/${contract.contractID.replace('CONTRACT', '')}`;
        await run(
          'UPDATE sales_contracts SET nbeReferenceNumber = ? WHERE contractID = ?',
          [refNumber, contract.contractID]
        );
        console.log(`  📝 ${contract.contractID}: Added NBE reference: ${refNumber}`);
      }
      
      console.log(`✅ Fixed ${contractsWithoutRef.length} contracts with missing NBE references`);
    } else {
      console.log('✅ All NBE-approved contracts have reference numbers');
    }
    
    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('DATA FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Contracts fixed: ${fixedContracts}`);
    console.log(`✅ LCs fixed: ${fixedLCs}`);
    console.log(`✅ Forex allocations fixed: ${fixedForex}`);
    console.log(`✅ NBE references added: ${contractsWithoutRef.length}`);
    console.log('='.repeat(60));
    
    // Verify the fixes
    console.log('\n📊 Verification:');
    const verifyContracts = await query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN buyerBank IS NULL OR buyerBank = '' THEN 1 ELSE 0 END) as missing_buyer_bank,
             SUM(CASE WHEN exporterBank IS NULL OR exporterBank = '' THEN 1 ELSE 0 END) as missing_exporter_bank
      FROM sales_contracts
      WHERE status IN ('APPROVED', 'NBE_APPROVED')
    `);
    
    console.log(`  Contracts: ${verifyContracts[0].total} total`);
    console.log(`    Missing buyer bank: ${verifyContracts[0].missing_buyer_bank}`);
    console.log(`    Missing exporter bank: ${verifyContracts[0].missing_exporter_bank}`);
    
    const verifyLCs = await query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN IssuingBank IS NULL OR IssuingBank = '' THEN 1 ELSE 0 END) as missing_issuing,
             SUM(CASE WHEN AdvisingBank IS NULL OR AdvisingBank = '' THEN 1 ELSE 0 END) as missing_advising
      FROM letters_of_credit
    `);
    
    console.log(`  LCs: ${verifyLCs[0].total} total`);
    console.log(`    Missing issuing bank: ${verifyLCs[0].missing_issuing}`);
    console.log(`    Missing advising bank: ${verifyLCs[0].missing_advising}`);
    
  } catch (error) {
    console.error('❌ Error fixing data:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the fix
fixMissingData()
  .then(() => {
    console.log('\n✅ Data fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Data fix failed:', error);
    process.exit(1);
  });
